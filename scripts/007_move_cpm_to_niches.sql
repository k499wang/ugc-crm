-- Move CPM from payment_tiers to niches table
-- CPM (Cost Per Mille) should be at the niche level, not tier level
-- A niche like "Beauty" or "Tech" has a specific CPM rate
-- Tiers are just view count milestones

-- Add CPM to niches table
alter table public.niches add column if not exists cpm decimal(10, 2);

-- Remove CPM from payment_tiers table
alter table public.payment_tiers drop column if exists cpm;

-- Add comment explaining the CPM field
comment on column public.niches.cpm is 'Cost per 1000 views for this niche. Used to calculate payment amounts based on view counts.';
