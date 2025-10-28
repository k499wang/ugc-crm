-- Updated function to handle new user creation with company
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
begin
  -- Get role and company name from metadata
  user_role := coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'creator');
  company_name_value := new.raw_user_meta_data ->> 'company_name';

  -- If company_admin, create a company first
  if user_role = 'company_admin' and company_name_value is not null then
    insert into public.companies (name)
    values (company_name_value)
    returning id into new_company_id;
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

  return new;
end;
$$;

-- Trigger remains the same
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
