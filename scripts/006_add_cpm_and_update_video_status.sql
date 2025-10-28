-- Add CPM field to payment_tiers
alter table public.payment_tiers add column if not exists cpm decimal(10, 2);

-- Add comment to explain CPM
comment on column public.payment_tiers.cpm is 'Cost per thousand views - alternative payment model';

-- Update video_status enum to remove 'paid' since we track payments via tiers
-- First, update any 'paid' videos to 'approved' status
update public.videos set status = 'approved' where status = 'paid';

-- Drop the old enum and create new one without 'paid'
alter table public.videos alter column status type text;
drop type if exists video_status cascade;
create type video_status as enum ('pending', 'approved', 'rejected');
alter table public.videos alter column status type video_status using status::video_status;

-- Remove payment-related columns from videos table since we track via tiers
alter table public.videos drop column if exists payment_amount;
alter table public.videos drop column if exists paid_at;

-- Add indexes for better performance
create index if not exists idx_video_tier_payments_paid on public.video_tier_payments(paid);
create index if not exists idx_video_tier_payments_reached on public.video_tier_payments(reached);
