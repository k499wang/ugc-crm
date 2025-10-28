-- Create niches table
create table if not exists public.niches (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(company_id, name)
);

-- Enable RLS on niches
alter table public.niches enable row level security;

-- Niches policies
create policy "Company admins can view their niches"
  on public.niches for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.company_id = niches.company_id
      and profiles.role = 'company_admin'
    )
  );

create policy "Company admins can insert niches"
  on public.niches for insert
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.company_id = niches.company_id
      and profiles.role = 'company_admin'
    )
  );

create policy "Company admins can update niches"
  on public.niches for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.company_id = niches.company_id
      and profiles.role = 'company_admin'
    )
  );

create policy "Company admins can delete niches"
  on public.niches for delete
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.company_id = niches.company_id
      and profiles.role = 'company_admin'
    )
  );

-- Add niche_id to creators table
alter table public.creators add column if not exists niche_id uuid references public.niches(id) on delete set null;

-- Add niche_id to payment_tiers table
alter table public.payment_tiers add column if not exists niche_id uuid references public.niches(id) on delete set null;

-- Create indexes
create index if not exists idx_niches_company_id on public.niches(company_id);
create index if not exists idx_creators_niche_id on public.creators(niche_id);
create index if not exists idx_payment_tiers_niche_id on public.payment_tiers(niche_id);

-- Drop the old trigger that creates tier payments for all company tiers
drop trigger if exists trigger_create_video_tier_payments on public.videos;

-- Update the function to only create tier payments for the creator's niche tiers
create or replace function create_video_tier_payments()
returns trigger as $$
declare
  creator_niche_id uuid;
begin
  -- Get the creator's niche_id
  select niche_id into creator_niche_id
  from public.creators
  where id = new.creator_id;

  -- Insert tier payments for the creator's niche (if assigned)
  -- If creator has no niche, use company-level tiers (where niche_id is null)
  if creator_niche_id is not null then
    insert into public.video_tier_payments (video_id, tier_id, reached, paid)
    select new.id, pt.id, false, false
    from public.payment_tiers pt
    where pt.company_id = new.company_id
      and pt.niche_id = creator_niche_id;
  else
    insert into public.video_tier_payments (video_id, tier_id, reached, paid)
    select new.id, pt.id, false, false
    from public.payment_tiers pt
    where pt.company_id = new.company_id
      and pt.niche_id is null;
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- Recreate the trigger
create trigger trigger_create_video_tier_payments
  after insert on public.videos
  for each row
  execute function create_video_tier_payments();

-- Update the unique constraint on payment_tiers to include niche_id
alter table public.payment_tiers drop constraint if exists payment_tiers_company_tier_order_unique;

-- Create a unique constraint that considers both niche-specific and company-level tiers
-- For niche-specific tiers: unique per (company_id, niche_id, tier_order)
-- For company-level tiers: unique per (company_id, tier_order) where niche_id is null
create unique index if not exists payment_tiers_niche_tier_order_unique
  on public.payment_tiers(company_id, niche_id, tier_order)
  where niche_id is not null;

create unique index if not exists payment_tiers_company_tier_order_unique
  on public.payment_tiers(company_id, tier_order)
  where niche_id is null;
