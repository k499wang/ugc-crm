-- Optimized tier payment regeneration system
-- Uses set-based operations for better performance

-- Function to regenerate video tier payments for multiple videos at once
-- This is the core batch operation that should be used by triggers
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
        when ta.creator_niche_id is not null and ta.has_niche_tiers then 'niche'
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

-- Single video convenience wrapper (for backwards compatibility)
create or replace function regenerate_video_tier_payments(p_video_id uuid)
returns void as $$
begin
  perform regenerate_video_tier_payments_batch(array[p_video_id]);
end;
$$ language plpgsql security definer;

-- Trigger function: When creator's niche changes, regenerate tier payments for all their videos
create or replace function handle_creator_niche_change()
returns trigger as $$
declare
  video_ids uuid[];
begin
  -- Only regenerate if niche_id actually changed
  if old.niche_id is distinct from new.niche_id then
    -- Only regenerate if creator doesn't have creator-specific tiers
    if not exists (
      select 1 from public.payment_tiers pt
      where pt.creator_id = new.id
      limit 1
    ) then
      -- Collect all video IDs for this creator
      select array_agg(v.id)
      into video_ids      
      from public.videos v
      where v.creator_id = new.id;

      -- Regenerate in one batch operation
      if video_ids is not null and array_length(video_ids, 1) > 0 then
        perform regenerate_video_tier_payments_batch(video_ids);
      end if;
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- Create trigger for creator niche changes
drop trigger if exists trigger_creator_niche_change on public.creators;
create trigger trigger_creator_niche_change
  after update of niche_id on public.creators
  for each row
  execute function handle_creator_niche_change();

-- Trigger function: When payment tiers are modified, regenerate tier payments for affected videos
create or replace function handle_payment_tier_change()
returns trigger as $$
declare
  video_ids uuid[];
begin
  if (TG_OP = 'DELETE') then
    -- When a tier is deleted, regenerate for videos that were using it
    if old.creator_id is not null then
      -- Creator-specific tier deleted - get all videos for this creator
      select array_agg(v.id)
      into video_ids
      from public.videos v
      where v.creator_id = old.creator_id;
      
    elsif old.niche_id is not null then
      -- Niche-specific tier deleted
      -- Get videos from creators in this niche who DON'T have creator-specific tiers
      select array_agg(v.id)
      into video_ids
      from public.videos v
      join public.creators c on c.id = v.creator_id
      where c.niche_id = old.niche_id
        and not exists (
          select 1 from public.payment_tiers pt
          where pt.creator_id = c.id
          limit 1
        );
        
    else
      -- Company-wide tier deleted
      -- Get videos from creators with no niche and no creator-specific tiers
      select array_agg(v.id)
      into video_ids
      from public.videos v
      join public.creators c on c.id = v.creator_id
      where v.company_id = old.company_id
        and c.niche_id is null
        and not exists (
          select 1 from public.payment_tiers pt
          where pt.creator_id = c.id
          limit 1
        );
    end if;

    -- Process all videos in one batch
    if video_ids is not null and array_length(video_ids, 1) > 0 then
      perform regenerate_video_tier_payments_batch(video_ids);
    end if;

    return old;
    
  else
    -- INSERT or UPDATE
    if new.creator_id is not null then
      -- Creator-specific tier added/updated
      select array_agg(v.id)
      into video_ids
      from public.videos v
      where v.creator_id = new.creator_id;
      
    elsif new.niche_id is not null then
      -- Niche-specific tier added/updated
      select array_agg(v.id)
      into video_ids
      from public.videos v
      join public.creators c on c.id = v.creator_id
      where c.niche_id = new.niche_id
        and not exists (
          select 1 from public.payment_tiers pt
          where pt.creator_id = c.id
          limit 1
        );
        
    else
      -- Company-wide tier added/updated
      select array_agg(v.id)
      into video_ids
      from public.videos v
      join public.creators c on c.id = v.creator_id
      where v.company_id = new.company_id
        and c.niche_id is null
        and not exists (
          select 1 from public.payment_tiers pt
          where pt.creator_id = c.id
          limit 1
        );
    end if;

    -- Process all videos in one batch
    if video_ids is not null and array_length(video_ids, 1) > 0 then
      perform regenerate_video_tier_payments_batch(video_ids);
    end if;

    return new;
  end if;
end;
$$ language plpgsql security definer;

-- Create trigger for payment tier changes
drop trigger if exists trigger_payment_tier_change on public.payment_tiers;
create trigger trigger_payment_tier_change
  after insert or update or delete on public.payment_tiers
  for each row
  execute function handle_payment_tier_change();

-- Recommended indexes for optimal performance
-- (Run these if they don't already exist)

-- Core indexes for the tier selection logic
create index if not exists idx_payment_tiers_creator on public.payment_tiers(creator_id) where creator_id is not null;
create index if not exists idx_payment_tiers_niche on public.payment_tiers(niche_id, company_id) where niche_id is not null and creator_id is null;
create index if not exists idx_payment_tiers_company on public.payment_tiers(company_id) where niche_id is null and creator_id is null;

-- Indexes for video lookups
create index if not exists idx_videos_creator on public.videos(creator_id);
create index if not exists idx_videos_company on public.videos(company_id);

-- Index for creator lookups
create index if not exists idx_creators_niche on public.creators(niche_id) where niche_id is not null;

-- Index for video tier payments
create index if not exists idx_video_tier_payments_video on public.video_tier_payments(video_id);
create index if not exists idx_video_tier_payments_tier on public.video_tier_payments(tier_id);

-- Comments explaining the optimized behavior
comment on function regenerate_video_tier_payments_batch(uuid[]) is 'Batch regenerates video tier payments for multiple videos efficiently using set-based operations. Preserves payment history by matching tier_id. This is the primary function used by triggers.';
comment on function regenerate_video_tier_payments(uuid) is 'Single-video wrapper for regenerate_video_tier_payments_batch. Use batch function directly when processing multiple videos.';
comment on function handle_creator_niche_change() is 'Automatically regenerates tier payments for all videos when a creator changes niches. Uses batch processing for efficiency.';
comment on function handle_payment_tier_change() is 'Automatically regenerates tier payments for affected videos when payment tiers are added, updated, or deleted. Uses batch processing for efficiency.';