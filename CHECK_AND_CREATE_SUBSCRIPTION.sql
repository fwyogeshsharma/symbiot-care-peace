-- ============================================
-- CHECK WHAT DATA EXISTS AND CREATE TEST SUBSCRIPTION
-- ============================================

-- Step 1: Check if ANY subscriptions exist (active or not)
SELECT 'STEP 1: All Subscriptions (active or inactive)' as debug_step;
SELECT
  id,
  user_id,
  elderly_person_id,
  schedule_time,
  is_active,
  created_at
FROM report_subscriptions;

-- If empty, you need to create one through the frontend OR manually

-- Step 2: Check if users exist in profiles table
SELECT 'STEP 2: Available Users in Profiles' as debug_step;
SELECT
  id,
  email,
  full_name,
  created_at
FROM profiles
LIMIT 10;

-- Step 3: Check if elderly persons exist
SELECT 'STEP 3: Available Elderly Persons' as debug_step;
SELECT
  id,
  full_name,
  created_at
FROM elderly_persons
LIMIT 10;

-- Step 4: Check current user (if running from authenticated context)
SELECT 'STEP 4: Current User Info' as debug_step;
SELECT
  auth.uid() as current_user_id,
  p.email,
  p.full_name
FROM profiles p
WHERE p.id = auth.uid();

-- ============================================
-- CREATE A TEST SUBSCRIPTION MANUALLY
-- ============================================
-- Only run this if you have users and elderly persons!
-- Replace the UUIDs with actual IDs from Steps 2 and 3

/*
-- Example: Create a test subscription
INSERT INTO report_subscriptions (
  id,
  user_id,
  elderly_person_id,
  report_type,
  schedule_time,
  timezone,
  is_active,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'YOUR-USER-ID-FROM-STEP-2',          -- Replace with actual user_id
  'YOUR-ELDERLY-PERSON-ID-FROM-STEP-3', -- Replace with actual elderly_person_id
  'daily_summary',
  (NOW() AT TIME ZONE 'UTC' + INTERVAL '2 minutes')::TIME, -- 2 minutes from now
  'Asia/Calcutta',
  true,
  NOW(),
  NOW()
);
*/

-- Step 5: Verify the subscription was created
SELECT 'STEP 5: Verify Subscription Created' as debug_step;
SELECT
  rs.id,
  rs.schedule_time,
  rs.is_active,
  p.email as user_email,
  ep.full_name as person_name
FROM report_subscriptions rs
LEFT JOIN profiles p ON p.id = rs.user_id
LEFT JOIN elderly_persons ep ON ep.id = rs.elderly_person_id
WHERE rs.is_active = true;

-- ============================================
-- ALTERNATIVE: Use Frontend to Create Subscription
-- ============================================
-- 1. Open your app at http://localhost:5173 (or your frontend URL)
-- 2. Navigate to Reports page
-- 3. Select a person from the dropdown
-- 4. Click "Subscribe to Daily Report" button
-- 5. Set a time
-- 6. Save
-- 7. Come back and run this query again to see the subscription
