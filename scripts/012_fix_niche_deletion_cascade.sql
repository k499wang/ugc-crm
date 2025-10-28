-- Fix niche deletion to CASCADE delete payment_tiers instead of SET NULL
-- This prevents unique constraint violations when deleting niches

-- Drop the existing foreign key constraint
alter table public.payment_tiers
  drop constraint if exists payment_tiers_niche_id_fkey;

-- Re-add the constraint with ON DELETE CASCADE instead of SET NULL
alter table public.payment_tiers
  add constraint payment_tiers_niche_id_fkey
  foreign key (niche_id)
  references public.niches(id)
  on delete cascade;

-- Note: creators.niche_id keeps ON DELETE SET NULL which is correct
-- When a niche is deleted:
-- 1. Niche-specific payment_tiers are deleted (CASCADE)
-- 2. Creators in that niche have their niche_id set to null (SET NULL)
-- 3. This triggers the handle_creator_niche_change function which regenerates tier payments
--    for those creators using company-level tiers instead

comment on constraint payment_tiers_niche_id_fkey on public.payment_tiers is
  'Cascade delete niche-specific tiers when niche is deleted to prevent unique constraint violations';
