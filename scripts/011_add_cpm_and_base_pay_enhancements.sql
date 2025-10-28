-- Enhanced CPM and Base Pay System
-- This migration adds comprehensive payment calculation support with 3-level hierarchy:
-- 1. Creator-level: base_pay and cpm per creator
-- 2. Niche-level: base_pay and cpm per niche
-- 3. Company-level: base_pay and cpm company-wide
-- Priority: Creator > Niche > Company
--
-- Payment Structure:
-- - Base Pay: One-time payment per video (not per tier)
-- - CPM Payment: Calculated from total views (not per tier)
-- - Tier Payments: Milestone bonuses when view thresholds are reached
-- Total Video Payment = Base Pay + CPM Payment + Sum(All Tier Payments)

-- Add company-wide base pay and CPM
alter table public.companies add column if not exists base_pay decimal(10, 2);
alter table public.companies add column if not exists default_cpm decimal(10, 2);
comment on column public.companies.base_pay is 'Company-wide default base payment per video. Used if creator and niche base_pay not set.';
comment on column public.companies.default_cpm is 'Company-wide default CPM (cost per 1000 views). Used if creator and niche CPM not set.';

-- Add base pay to niches (niches already have cpm from previous migration)
alter table public.niches add column if not exists base_pay decimal(10, 2);
comment on column public.niches.base_pay is 'Niche-level base payment per video. Overrides company base_pay, overridden by creator base_pay.';
comment on column public.niches.cpm is 'Niche-level CPM. Overrides company CPM, overridden by creator CPM.';

-- Add base pay and CPM to creators (creator-specific overrides everything)
alter table public.creators add column if not exists base_pay decimal(10, 2);
alter table public.creators add column if not exists cpm decimal(10, 2);
comment on column public.creators.base_pay is 'Creator-specific base payment per video. Overrides niche and company base_pay.';
comment on column public.creators.cpm is 'Creator-specific CPM. Overrides niche and company CPM.';

-- Add base+CPM payment tracking to videos table
alter table public.videos add column if not exists base_cpm_paid boolean default false;
alter table public.videos add column if not exists base_cpm_paid_at timestamp with time zone;
alter table public.videos add column if not exists base_payment_amount decimal(10, 2);
alter table public.videos add column if not exists cpm_payment_amount decimal(10, 2);

comment on column public.videos.base_cpm_paid is 'Whether base pay + CPM has been paid for this video';
comment on column public.videos.base_cpm_paid_at is 'When base pay + CPM was paid';
comment on column public.videos.base_payment_amount is 'Base payment amount that was paid';
comment on column public.videos.cpm_payment_amount is 'CPM payment amount that was paid (based on floor(views/1000))';

-- Note:
-- - video_tier_payments.payment_amount stores only the tier milestone bonus
-- - Base pay and CPM are tracked separately in the videos table
-- - CPM is calculated as: floor(views / 1000) × CPM rate (paid in 1000-view increments only)
