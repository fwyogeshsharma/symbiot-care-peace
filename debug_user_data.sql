-- Debug script to check user's elderly person associations
-- Replace 'd9ed08fa-a544-4087-afef-89a389338ddd' with the actual user_id

-- 1. Check elderly_persons table (where user is caregiver)
SELECT 'elderly_persons (as caregiver)' as source, id, full_name, caregiver_id
FROM elderly_persons
WHERE caregiver_id = 'd9ed08fa-a544-4087-afef-89a389338ddd';

-- 2. Check user_elderly_access table
SELECT 'user_elderly_access' as source, elderly_person_id, user_id, access_level
FROM user_elderly_access
WHERE user_id = 'd9ed08fa-a544-4087-afef-89a389338ddd';

-- 3. Check all elderly persons (to see what exists)
SELECT 'all_elderly_persons' as source, id, full_name, caregiver_id
FROM elderly_persons;

-- 4. Check if there's device_data for any elderly person
SELECT 'device_data_check' as source, elderly_person_id, COUNT(*) as count
FROM device_data
GROUP BY elderly_person_id;

-- 5. Check profiles to verify user exists
SELECT 'user_profile' as source, id, email, full_name
FROM profiles
WHERE id = 'd9ed08fa-a544-4087-afef-89a389338ddd';
