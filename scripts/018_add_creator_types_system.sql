-- Create creator_types table
create table if not exists public.creator_types (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(company_id, name)
);

-- Enable RLS on creator_types
alter table public.creator_types enable row level security;

-- Creator types policies
create policy "Company admins can view their creator types"
  on public.creator_types for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.company_id = creator_types.company_id
      and profiles.role = 'company_admin'
    )
  );

create policy "Company admins can insert creator types"
  on public.creator_types for insert
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.company_id = creator_types.company_id
      and profiles.role = 'company_admin'
    )
  );

create policy "Company admins can update creator types"
  on public.creator_types for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.company_id = creator_types.company_id
      and profiles.role = 'company_admin'
    )
  );

create policy "Company admins can delete creator types"
  on public.creator_types for delete
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.company_id = creator_types.company_id
      and profiles.role = 'company_admin'
    )
  );

-- Add creator_type_id to creators table
alter table public.creators add column if not exists creator_type_id uuid references public.creator_types(id) on delete set null;

-- Create indexes
create index if not exists idx_creator_types_company_id on public.creator_types(company_id);
create index if not exists idx_creators_creator_type_id on public.creators(creator_type_id);
