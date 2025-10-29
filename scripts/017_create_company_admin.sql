-- Manual script to create or update a user to be a company_admin
-- Instructions:
-- 1. Replace the values in the variables below
-- 2. Run this script in your Supabase SQL editor
-- 3. The script will create the company if it doesn't exist and update the user's profile

DO $$
DECLARE
  -- ========================================
  -- CONFIGURE THESE VALUES
  -- ========================================

  -- The UUID of the existing auth user you want to make a company_admin
  -- Get this from Authentication > Users in Supabase Dashboard
  target_user_id uuid := 'REPLACE-WITH-USER-UUID';

  -- The email of the user (for reference/verification)
  target_user_email text := 'admin@example.com';

  -- Company details
  target_company_name text := 'My Company Name';

  -- Optional: If you want to use an existing company, set this UUID
  -- Leave as NULL to create a new company
  existing_company_id uuid := NULL;

  -- ========================================
  -- END CONFIGURATION
  -- ========================================

  final_company_id uuid;
  user_exists boolean;
BEGIN
  -- Check if the user exists in auth.users
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE id = target_user_id
  ) INTO user_exists;

  IF NOT user_exists THEN
    RAISE EXCEPTION 'User with ID % does not exist in auth.users. Please create the user first or check the UUID.', target_user_id;
  END IF;

  -- Create or use existing company
  IF existing_company_id IS NOT NULL THEN
    -- Use existing company
    final_company_id := existing_company_id;
    RAISE NOTICE 'Using existing company: %', existing_company_id;
  ELSE
    -- Create new company
    INSERT INTO public.companies (name)
    VALUES (target_company_name)
    RETURNING id INTO final_company_id;
    RAISE NOTICE 'Created new company: % with ID: %', target_company_name, final_company_id;
  END IF;

  -- Update or insert the profile
  INSERT INTO public.profiles (id, email, role, company_id)
  VALUES (
    target_user_id,
    target_user_email,
    'company_admin',
    final_company_id
  )
  ON CONFLICT (id) DO UPDATE SET
    role = 'company_admin',
    company_id = final_company_id,
    updated_at = now();

  RAISE NOTICE 'Successfully set user % as company_admin for company %', target_user_id, final_company_id;
  RAISE NOTICE 'User email: %', target_user_email;
  RAISE NOTICE 'Company: %', target_company_name;

END $$;
