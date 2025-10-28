-- Drop the old payment_tier enum and related constraints
alter table public.videos drop constraint if exists videos_payment_tier_check;
alter table public.payment_tiers drop constraint if exists payment_tiers_tier_check;
drop type if exists payment_tier cascade;

-- Update payment_tiers table to support unlimited tiers with view thresholds
alter table public.payment_tiers drop column if exists tier;
alter table public.payment_tiers add column if not exists tier_name text not null default 'Tier 1';
alter table public.payment_tiers add column if not exists view_count_threshold integer not null default 0;
alter table public.payment_tiers add column if not exists tier_order integer not null default 1;

-- Remove old unique constraint and add new one
alter table public.payment_tiers drop constraint if exists payment_tiers_company_id_tier_key;
alter table public.payment_tiers add constraint payment_tiers_company_tier_order_unique unique(company_id, tier_order);

-- Add invite_token to creators table
alter table public.creators add column if not exists invite_token text unique;
alter table public.creators add column if not exists invite_accepted_at timestamp with time zone;

-- Create video_tier_payments table to track which tiers have been reached and paid
create table if not exists public.video_tier_payments (
  id uuid primary key default uuid_generate_v4(),
  video_id uuid not null references public.videos(id) on delete cascade,
  tier_id uuid not null references public.payment_tiers(id) on delete cascade,
  reached boolean default false,
  paid boolean default false,
  paid_at timestamp with time zone,
  payment_amount decimal(10, 2),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(video_id, tier_id)
);

-- Remove payment_tier column from videos table (we'll track this in video_tier_payments)
alter table public.videos drop column if exists payment_tier;

-- Enable RLS on video_tier_payments
alter table public.video_tier_payments enable row level security;

-- Video tier payments policies
create policy "Company admins can view their video tier payments"
  on public.video_tier_payments for select
  using (
    exists (
      select 1 from public.videos
      join public.profiles on profiles.company_id = videos.company_id
      where videos.id = video_tier_payments.video_id
      and profiles.id = auth.uid()
      and profiles.role = 'company_admin'
    )
  );

create policy "Creators can view their own video tier payments"
  on public.video_tier_payments for select
  using (
    exists (
      select 1 from public.videos
      join public.creators on creators.id = videos.creator_id
      where videos.id = video_tier_payments.video_id
      and creators.user_id = auth.uid()
    )
  );

create policy "Company admins can insert video tier payments"
  on public.video_tier_payments for insert
  with check (
    exists (
      select 1 from public.videos
      join public.profiles on profiles.company_id = videos.company_id
      where videos.id = video_tier_payments.video_id
      and profiles.id = auth.uid()
      and profiles.role = 'company_admin'
    )
  );

create policy "Company admins can update video tier payments"
  on public.video_tier_payments for update
  using (
    exists (
      select 1 from public.videos
      join public.profiles on profiles.company_id = videos.company_id
      where videos.id = video_tier_payments.video_id
      and profiles.id = auth.uid()
      and profiles.role = 'company_admin'
    )
  );

-- Create indexes
create index if not exists idx_video_tier_payments_video_id on public.video_tier_payments(video_id);
create index if not exists idx_video_tier_payments_tier_id on public.video_tier_payments(tier_id);
create index if not exists idx_creators_invite_token on public.creators(invite_token);
create index if not exists idx_payment_tiers_company_tier_order on public.payment_tiers(company_id, tier_order);

-- Function to automatically create video_tier_payments when a video is created
create or replace function create_video_tier_payments()
returns trigger as $$
begin
  insert into public.video_tier_payments (video_id, tier_id, reached, paid)
  select new.id, pt.id, false, false
  from public.payment_tiers pt
  where pt.company_id = new.company_id;
  
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger to auto-create tier payments for new videos
drop trigger if exists trigger_create_video_tier_payments on public.videos;
create trigger trigger_create_video_tier_payments
  after insert on public.videos
  for each row
  execute function create_video_tier_payments();

-- Function to update tier reached status based on view count
create or replace function update_tier_reached_status()
returns trigger as $$
begin
  update public.video_tier_payments vtp
  set reached = (new.views >= pt.view_count_threshold),
      updated_at = now()
  from public.payment_tiers pt
  where vtp.video_id = new.id
    and vtp.tier_id = pt.id;
  
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger to auto-update tier reached status when views change
drop trigger if exists trigger_update_tier_reached_status on public.videos;
create trigger trigger_update_tier_reached_status
  after update of views on public.videos
  for each row
  when (old.views is distinct from new.views)
  execute function update_tier_reached_status();
