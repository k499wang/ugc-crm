-- Remove tier_order column and replace with view_count_threshold-based constraints
-- This eliminates the duplicate key errors and simplifies tier management

-- Step 1: Drop all tier_order-based unique indexes
drop index if exists payment_tiers_creator_tier_order_unique;
drop index if exists payment_tiers_niche_tier_order_unique;
drop index if exists payment_tiers_company_tier_order_unique;
drop index if exists idx_payment_tiers_company_tier_order;

-- Step 2: Drop the tier_order column
alter table public.payment_tiers drop column if exists tier_order;

-- Step 2.5: Clean up duplicate thresholds before creating unique constraints
-- Keep the oldest tier (by created_at) for each duplicate set

-- Delete duplicate creator-specific tiers
DELETE FROM public.payment_tiers pt1
WHERE creator_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.payment_tiers pt2
    WHERE pt2.company_id = pt1.company_id
      AND pt2.creator_id = pt1.creator_id
      AND pt2.view_count_threshold = pt1.view_count_threshold
      AND pt2.created_at < pt1.created_at
  );

-- Delete duplicate niche-specific tiers
DELETE FROM public.payment_tiers pt1
WHERE niche_id IS NOT NULL
  AND creator_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.payment_tiers pt2
    WHERE pt2.company_id = pt1.company_id
      AND pt2.niche_id = pt1.niche_id
      AND pt2.view_count_threshold = pt1.view_count_threshold
      AND pt2.creator_id IS NULL
      AND pt2.created_at < pt1.created_at
  );

-- Delete duplicate company-wide tiers
DELETE FROM public.payment_tiers pt1
WHERE niche_id IS NULL
  AND creator_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.payment_tiers pt2
    WHERE pt2.company_id = pt1.company_id
      AND pt2.view_count_threshold = pt1.view_count_threshold
      AND pt2.niche_id IS NULL
      AND pt2.creator_id IS NULL
      AND pt2.created_at < pt1.created_at
  );

-- Step 3: Add unique constraints based on view_count_threshold instead
-- These ensure each creator/niche/company can't have duplicate thresholds

-- Drop existing threshold-based indexes if they exist (in case this is a re-run)
drop index if exists payment_tiers_creator_threshold_unique;
drop index if exists payment_tiers_niche_threshold_unique;
drop index if exists payment_tiers_company_threshold_unique;

-- For creator-specific tiers: unique per (company_id, creator_id, view_count_threshold)
create unique index payment_tiers_creator_threshold_unique
  on public.payment_tiers(company_id, creator_id, view_count_threshold)
  where creator_id is not null;

-- For niche-specific tiers: unique per (company_id, niche_id, view_count_threshold)
create unique index payment_tiers_niche_threshold_unique
  on public.payment_tiers(company_id, niche_id, view_count_threshold)
  where niche_id is not null and creator_id is null;

-- For company-level tiers: unique per (company_id, view_count_threshold)
create unique index payment_tiers_company_threshold_unique
  on public.payment_tiers(company_id, view_count_threshold)
  where niche_id is null and creator_id is null;

-- Step 4: Update the regenerate function to match on view_count_threshold instead of tier_order
create or replace function regenerate_video_tier_payments_batch(p_video_ids uuid[])
returns void as $$
begin
  -- Early exit if no videos to process
  if p_video_ids is null or array_length(p_video_ids, 1) = 0 then
    return;
  end if;

  -- Store existing payment data to preserve history (one temp table for all videos)
  create temp table if not exists temp_payment_history (
    video_id uuid,
    tier_id uuid,
    paid boolean,
    paid_at timestamp with time zone,
    payment_amount decimal(10, 2)
  ) on commit drop;

  truncate table temp_payment_history;

  -- Collect all existing payment data for videos being processed
  -- Match on tier_id to preserve history even when thresholds change
  insert into temp_payment_history (video_id, tier_id, paid, paid_at, payment_amount)
  select vtp.video_id, vtp.tier_id, vtp.paid, vtp.paid_at, vtp.payment_amount
  from public.video_tier_payments vtp
  where vtp.video_id = any(p_video_ids);

  -- Delete existing tier payments for all videos at once
  delete from public.video_tier_payments
  where video_id = any(p_video_ids);

  -- Determine the correct tier for each video based on priority
  -- Priority: creator-specific > niche-specific > company-wide
  with video_info as (
    select
      v.id as video_id,
      v.creator_id,
      v.company_id,
      v.views,
      c.niche_id as creator_niche_id
    from public.videos v
    join public.creators c on c.id = v.creator_id
    where v.id = any(p_video_ids)
  ),
  -- Check which tier types exist for each video
  tier_availability as (
    select
      vi.video_id,
      vi.creator_id,
      vi.company_id,
      vi.creator_niche_id,
      vi.views,
      exists (
        select 1 from public.payment_tiers pt
        where pt.company_id = vi.company_id
          and pt.creator_id = vi.creator_id
      ) as has_creator_tiers,
      exists (
        select 1 from public.payment_tiers pt
        where pt.company_id = vi.company_id
          and pt.niche_id = vi.creator_niche_id
          and pt.creator_id is null
      ) as has_niche_tiers
    from video_info vi
  ),
  -- Determine which tier type each video should use
  video_tier_type as (
    select
      ta.video_id,
      ta.creator_id,
      ta.company_id,
      ta.creator_niche_id,
      ta.views,
      case
        when ta.has_creator_tiers then 'creator'
        when ta.creator_niche_id is not null then 'niche'
        else 'company'
      end as tier_type
    from tier_availability ta
  ),
  -- Get the appropriate tiers for each video
  video_tiers as (
    select
      vtt.video_id,
      pt.id as tier_id,
      pt.view_count_threshold,
      vtt.views
    from video_tier_type vtt
    join public.payment_tiers pt on pt.company_id = vtt.company_id
    where (
      -- Creator-specific tiers
      (vtt.tier_type = 'creator' and pt.creator_id = vtt.creator_id)
      or
      -- Niche-specific tiers
      (vtt.tier_type = 'niche' and pt.niche_id = vtt.creator_niche_id and pt.creator_id is null)
      or
      -- Company-wide tiers
      (vtt.tier_type = 'company' and pt.niche_id is null and pt.creator_id is null)
    )
  )
  -- Insert all new tier payments at once with preserved history
  -- Match on tier_id to preserve history even when thresholds change
  insert into public.video_tier_payments (video_id, tier_id, reached, paid, paid_at, payment_amount)
  select
    vt.video_id,
    vt.tier_id,
    false, -- Will be updated in next step
    coalesce(tph.paid, false) as paid,
    tph.paid_at,
    tph.payment_amount
  from video_tiers vt
  left join temp_payment_history tph on tph.video_id = vt.video_id
    and tph.tier_id = vt.tier_id;

  -- Update reached status based on current views
  update public.video_tier_payments vtp
  set reached = (v.views >= pt.view_count_threshold)
  from public.videos v, public.payment_tiers pt
  where vtp.video_id = any(p_video_ids)
    and v.id = vtp.video_id
    and vtp.tier_id = pt.id;

end;
$$ language plpgsql security definer;

-- Update function comment
comment on function regenerate_video_tier_payments_batch(uuid[]) is 'Batch regenerates video tier payments for multiple videos efficiently using set-based operations. Preserves payment history by matching tier_id. This is the primary function used by triggers.';
