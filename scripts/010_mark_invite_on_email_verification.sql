-- Mark invite as accepted when creator verifies their email
-- This allows invite links to be reused if user doesn't verify email

-- Function to mark invite as accepted when email is verified
create or replace function public.mark_creator_invite_accepted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  creator_id_value uuid;
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
        and user_id = new.id
        and invite_accepted_at is null; -- Only if not already accepted
    end if;
  end if;

  return new;
end;
$$;

-- Create trigger on auth.users to detect email verification
drop trigger if exists on_user_email_verified on auth.users;

create trigger on_user_email_verified
  after update on auth.users
  for each row
  when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function public.mark_creator_invite_accepted();

-- Add comment explaining the behavior
comment on function public.mark_creator_invite_accepted() is 'Automatically marks creator invite as accepted when user verifies their email. This allows invite links to be reused if email verification is not completed.';
