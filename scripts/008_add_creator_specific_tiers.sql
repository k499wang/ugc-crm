-- Add creator_id to payment_tiers to support creator-specific tiers
-- Priority: creator-specific > niche-specific > company-wide

-- Add creator_id to payment_tiers table
alter table public.payment_tiers add column if not exists creator_id uuid references public.creators(id) on delete cascade;

-- Create index for creator-specific tiers
create index if not exists idx_payment_tiers_creator_id on public.payment_tiers(creator_id);

-- Update unique constraints to support creator-specific tiers
-- Drop existing constraints
drop index if exists payment_tiers_niche_tier_order_unique;
drop index if exists payment_tiers_company_tier_order_unique;

-- Create new unique constraints:
-- 1. For creator-specific tiers: unique per (company_id, creator_id, tier_order)
-- 2. For niche-specific tiers: unique per (company_id, niche_id, tier_order)
-- 3. For company-level tiers: unique per (company_id, tier_order) where both niche_id and creator_id are null

create unique index payment_tiers_creator_tier_order_unique
  on public.payment_tiers(company_id, creator_id, tier_order)
  where creator_id is not null;

create unique index payment_tiers_niche_tier_order_unique
  on public.payment_tiers(company_id, niche_id, tier_order)
  where niche_id is not null and creator_id is null;

create unique index payment_tiers_company_tier_order_unique
  on public.payment_tiers(company_id, tier_order)
  where niche_id is null and creator_id is null;

-- Update the function to check for creator-specific tiers first
create or replace function create_video_tier_payments()
returns trigger as $$
declare
  creator_niche_id uuid;
  tier_count integer;
begin
  -- Get the creator's niche_id
  select niche_id into creator_niche_id
  from public.creators
  where id = new.creator_id;

  -- Check for creator-specific tiers first
  select count(*) into tier_count
  from public.payment_tiers
  where company_id = new.company_id
    and creator_id = new.creator_id;

  if tier_count > 0 then
    -- Use creator-specific tiers and set reached based on initial views
    insert into public.video_tier_payments (video_id, tier_id, reached, paid)
    select new.id, pt.id, (new.views >= pt.view_count_threshold), false
    from public.payment_tiers pt
    where pt.company_id = new.company_id
      and pt.creator_id = new.creator_id;
  elsif creator_niche_id is not null then
    -- Fall back to niche-specific tiers
    select count(*) into tier_count
    from public.payment_tiers
    where company_id = new.company_id
      and niche_id = creator_niche_id
      and creator_id is null;

    if tier_count > 0 then
      insert into public.video_tier_payments (video_id, tier_id, reached, paid)
      select new.id, pt.id, (new.views >= pt.view_count_threshold), false
      from public.payment_tiers pt
      where pt.company_id = new.company_id
        and pt.niche_id = creator_niche_id
        and pt.creator_id is null;
    else
      -- Fall back to company-wide tiers
      insert into public.video_tier_payments (video_id, tier_id, reached, paid)
      select new.id, pt.id, (new.views >= pt.view_count_threshold), false
      from public.payment_tiers pt
      where pt.company_id = new.company_id
        and pt.niche_id is null
        and pt.creator_id is null;
    end if;
  else
    -- Use company-wide tiers (no niche assigned)
    insert into public.video_tier_payments (video_id, tier_id, reached, paid)
    select new.id, pt.id, (new.views >= pt.view_count_threshold), false
    from public.payment_tiers pt
    where pt.company_id = new.company_id
      and pt.niche_id is null
      and pt.creator_id is null;
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- Add comment explaining the tier priority
comment on column public.payment_tiers.creator_id is 'Optional creator-specific tier assignment. Priority: creator-specific > niche-specific > company-wide';
