-- Fix profile creation to properly set company_id for creators
-- Fix email verification trigger to properly mark invite as accepted

-- Update the handle_new_user function to set company_id for creators from metadata
-- and link creator record when account is created
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_company_id uuid;
  user_role user_role;
  company_name_value text;
  metadata_company_id uuid;
  metadata_creator_id uuid;
begin
  -- Get role and company info from metadata
  user_role := coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'creator');
  company_name_value := new.raw_user_meta_data ->> 'company_name';
  metadata_company_id := (new.raw_user_meta_data ->> 'company_id')::uuid;
  metadata_creator_id := (new.raw_user_meta_data ->> 'creator_id')::uuid;

  -- If company_admin, create a company first
  if user_role = 'company_admin' and company_name_value is not null then
    insert into public.companies (name)
    values (company_name_value)
    returning id into new_company_id;
  elsif user_role = 'creator' and metadata_company_id is not null then
    -- For creators, use the company_id from metadata (from invite)
    new_company_id := metadata_company_id;
  end if;

  -- Create profile with company_id if applicable
  insert into public.profiles (id, email, full_name, role, company_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', null),
    user_role,
    new_company_id
  )
  on conflict (id) do nothing;

  -- If this is a creator signup (has creator_id in metadata), link the creator to this auth user
  if user_role = 'creator' and metadata_creator_id is not null then
    update public.creators
    set user_id = new.id
    where id = metadata_creator_id
      and user_id is null; -- Only if not already linked

    raise notice 'Linked creator % to auth user %', metadata_creator_id, new.id;
  end if;

  return new;
end;
$$;

-- Update the mark_creator_invite_accepted function to be more robust
create or replace function public.mark_creator_invite_accepted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  creator_id_value uuid;
  updated_rows int;
begin
  -- Only proceed if email was just confirmed
  if old.email_confirmed_at is null and new.email_confirmed_at is not null then
    -- Get creator_id from user metadata
    creator_id_value := (new.raw_user_meta_data ->> 'creator_id')::uuid;

    -- If this user is associated with a creator, mark invite as accepted
    if creator_id_value is not null then
      update public.creators
      set invite_accepted_at = new.email_confirmed_at
      where id = creator_id_value
        and user_id = new.id  -- Verify this is the linked account
        and invite_accepted_at is null; -- Only if not already accepted

      get diagnostics updated_rows = row_count;

      if updated_rows > 0 then
        raise notice 'Updated invite_accepted_at for creator % (user %)', creator_id_value, new.id;
      else
        raise notice 'Creator % already has invite accepted, not found, or user_id mismatch', creator_id_value;
      end if;
    else
      raise notice 'No creator_id found in metadata for user %', new.id;
    end if;
  end if;

  return new;
end;
$$;

-- Recreate the trigger to ensure it's properly set up
drop trigger if exists on_user_email_verified on auth.users;

create trigger on_user_email_verified
  after update on auth.users
  for each row
  when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function public.mark_creator_invite_accepted();

comment on function public.handle_new_user() is 'Creates profile for new users. For company_admin, creates a new company. For creators, uses company_id from invite metadata and links creator.user_id immediately.';
comment on function public.mark_creator_invite_accepted() is 'Automatically marks creator invite as accepted when user verifies their email. This allows invite links to be reused if email verification is not completed.';
