-- Make creator email optional
-- This allows creating creators without email addresses
-- When no email is provided, no invite token is generated

-- Make email nullable
alter table public.creators alter column email drop not null;

-- Add comment to explain the logic
comment on column public.creators.email is 'Creator email address. Optional. If provided, an invite token can be generated for creator signup.';
comment on column public.creators.invite_token is 'Unique token for creator signup. Only generated when email is provided.';
