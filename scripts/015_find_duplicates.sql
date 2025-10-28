-- Find duplicate tiers that will violate the unique constraints

-- 1. Find duplicate creator-specific tiers
SELECT
  company_id,
  creator_id,
  view_count_threshold,
  COUNT(*) as duplicate_count,
  STRING_AGG(id::text, ', ') as tier_ids
FROM public.payment_tiers
WHERE creator_id IS NOT NULL
GROUP BY company_id, creator_id, view_count_threshold
HAVING COUNT(*) > 1;

-- 2. Find duplicate niche-specific tiers
SELECT
  company_id,
  niche_id,
  view_count_threshold,
  COUNT(*) as duplicate_count,
  STRING_AGG(id::text, ', ') as tier_ids
FROM public.payment_tiers
WHERE niche_id IS NOT NULL AND creator_id IS NULL
GROUP BY company_id, niche_id, view_count_threshold
HAVING COUNT(*) > 1;

-- 3. Find duplicate company-wide tiers
SELECT
  company_id,
  view_count_threshold,
  COUNT(*) as duplicate_count,
  STRING_AGG(id::text, ', ') as tier_ids
FROM public.payment_tiers
WHERE niche_id IS NULL AND creator_id IS NULL
GROUP BY company_id, view_count_threshold
HAVING COUNT(*) > 1;

-- 4. Show all details of duplicate niche tiers (the problematic ones)
SELECT
  pt.*,
  n.name as niche_name
FROM public.payment_tiers pt
LEFT JOIN public.niches n ON n.id = pt.niche_id
WHERE pt.niche_id IS NOT NULL
  AND pt.creator_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.payment_tiers pt2
    WHERE pt2.company_id = pt.company_id
      AND pt2.niche_id = pt.niche_id
      AND pt2.view_count_threshold = pt.view_count_threshold
      AND pt2.creator_id IS NULL
      AND pt2.id != pt.id
  )
ORDER BY pt.company_id, pt.niche_id, pt.view_count_threshold, pt.created_at;
