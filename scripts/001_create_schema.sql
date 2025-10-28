-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create enum for user roles
create type user_role as enum ('company_admin', 'creator');

-- Create enum for payment tiers
create type payment_tier as enum ('tier_1', 'tier_2', 'tier_3');

-- Create enum for video status
create type video_status as enum ('pending', 'approved', 'rejected', 'paid');

-- Profiles table (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role user_role not null default 'creator',
  company_id uuid,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Companies table
create table if not exists public.companies (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Payment tiers configuration table
create table if not exists public.payment_tiers (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  tier payment_tier not null,
  amount decimal(10, 2) not null,
  description text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(company_id, tier)
);

-- Creators table
create table if not exists public.creators (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text not null,
  phone text,
  instagram_handle text,
  tiktok_handle text,
  notes text,
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Videos table
create table if not exists public.videos (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  creator_id uuid not null references public.creators(id) on delete cascade,
  title text not null,
  description text,
  video_url text,
  thumbnail_url text,
  platform text,
  views integer default 0,
  likes integer default 0,
  comments integer default 0,
  status video_status default 'pending',
  payment_tier payment_tier,
  payment_amount decimal(10, 2),
  paid_at timestamp with time zone,
  submitted_at timestamp with time zone default now(),
  approved_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.payment_tiers enable row level security;
alter table public.creators enable row level security;
alter table public.videos enable row level security;

-- Profiles policies
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Companies policies
create policy "Company admins can view their company"
  on public.companies for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.company_id = companies.id
      and profiles.role = 'company_admin'
    )
  );

create policy "Company admins can update their company"
  on public.companies for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.company_id = companies.id
      and profiles.role = 'company_admin'
    )
  );

-- Payment tiers policies
create policy "Company admins can view their payment tiers"
  on public.payment_tiers for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.company_id = payment_tiers.company_id
      and profiles.role = 'company_admin'
    )
  );

create policy "Company admins can insert payment tiers"
  on public.payment_tiers for insert
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.company_id = payment_tiers.company_id
      and profiles.role = 'company_admin'
    )
  );

create policy "Company admins can update payment tiers"
  on public.payment_tiers for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.company_id = payment_tiers.company_id
      and profiles.role = 'company_admin'
    )
  );

create policy "Company admins can delete payment tiers"
  on public.payment_tiers for delete
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.company_id = payment_tiers.company_id
      and profiles.role = 'company_admin'
    )
  );

-- Creators policies
create policy "Company admins can view their creators"
  on public.creators for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.company_id = creators.company_id
      and profiles.role = 'company_admin'
    )
  );

create policy "Creators can view their own profile"
  on public.creators for select
  using (auth.uid() = user_id);

create policy "Company admins can insert creators"
  on public.creators for insert
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.company_id = creators.company_id
      and profiles.role = 'company_admin'
    )
  );

create policy "Company admins can update creators"
  on public.creators for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.company_id = creators.company_id
      and profiles.role = 'company_admin'
    )
  );

create policy "Company admins can delete creators"
  on public.creators for delete
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.company_id = creators.company_id
      and profiles.role = 'company_admin'
    )
  );

-- Videos policies
create policy "Company admins can view their videos"
  on public.videos for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.company_id = videos.company_id
      and profiles.role = 'company_admin'
    )
  );

create policy "Creators can view their own videos"
  on public.videos for select
  using (
    exists (
      select 1 from public.creators
      where creators.id = videos.creator_id
      and creators.user_id = auth.uid()
    )
  );

create policy "Creators can insert their own videos"
  on public.videos for insert
  with check (
    exists (
      select 1 from public.creators
      where creators.id = videos.creator_id
      and creators.user_id = auth.uid()
    )
  );

create policy "Company admins can update videos"
  on public.videos for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.company_id = videos.company_id
      and profiles.role = 'company_admin'
    )
  );

create policy "Company admins can delete videos"
  on public.videos for delete
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.company_id = videos.company_id
      and profiles.role = 'company_admin'
    )
  );

-- Create indexes for better performance
create index if not exists idx_profiles_company_id on public.profiles(company_id);
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_creators_company_id on public.creators(company_id);
create index if not exists idx_creators_user_id on public.creators(user_id);
create index if not exists idx_videos_company_id on public.videos(company_id);
create index if not exists idx_videos_creator_id on public.videos(creator_id);
create index if not exists idx_videos_status on public.videos(status);
create index if not exists idx_payment_tiers_company_id on public.payment_tiers(company_id);
