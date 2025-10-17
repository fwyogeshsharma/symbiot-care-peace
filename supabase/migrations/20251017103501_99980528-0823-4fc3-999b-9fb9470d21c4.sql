
-- Drop the old check constraint
ALTER TABLE device_data DROP CONSTRAINT IF EXISTS device_data_data_type_check;

-- Add new check constraint that includes movement sensor data types
ALTER TABLE device_data 
ADD CONSTRAINT device_data_data_type_check 
CHECK (data_type IN (
  'heart_rate', 
  'blood_pressure', 
  'blood_sugar', 
  'oxygen_level', 
  'temperature', 
  'steps',
  'door_status',
  'room_presence',
  'seat_occupied',
  'bed_occupied'
));

-- Now insert fake movement data for user yogesh.sharma@faberwork.com
INSERT INTO device_data (elderly_person_id, device_id, data_type, value, recorded_at) VALUES
-- Morning routine (6:00 AM - 9:00 AM)
('c7b04375-03f9-42d0-bc82-380bba7dbcd6', '431e9c19-2d69-43bd-bf39-63ad066d9c24', 'door_status', '{"status": "opened"}', NOW() - INTERVAL '18 hours 45 minutes'),
('c7b04375-03f9-42d0-bc82-380bba7dbcd6', 'c94ed95a-bcdf-4738-8b04-be5b8897e724', 'door_status', '{"status": "opened"}', NOW() - INTERVAL '18 hours 40 minutes'),
('c7b04375-03f9-42d0-bc82-380bba7dbcd6', 'c94ed95a-bcdf-4738-8b04-be5b8897e724', 'door_status', '{"status": "closed"}', NOW() - INTERVAL '18 hours 25 minutes'),
('c7b04375-03f9-42d0-bc82-380bba7dbcd6', '5f16aafd-2e92-4e6f-9359-66699ad79f49', 'door_status', '{"status": "opened"}', NOW() - INTERVAL '18 hours 20 minutes'),
('c7b04375-03f9-42d0-bc82-380bba7dbcd6', '5f16aafd-2e92-4e6f-9359-66699ad79f49', 'door_status', '{"status": "closed"}', NOW() - INTERVAL '17 hours 50 minutes'),

-- Mid-morning (9:00 AM - 12:00 PM)
('c7b04375-03f9-42d0-bc82-380bba7dbcd6', '431e9c19-2d69-43bd-bf39-63ad066d9c24', 'door_status', '{"status": "opened"}', NOW() - INTERVAL '16 hours'),
('c7b04375-03f9-42d0-bc82-380bba7dbcd6', 'c94ed95a-bcdf-4738-8b04-be5b8897e724', 'door_status', '{"status": "opened"}', NOW() - INTERVAL '15 hours 30 minutes'),
('c7b04375-03f9-42d0-bc82-380bba7dbcd6', 'c94ed95a-bcdf-4738-8b04-be5b8897e724', 'door_status', '{"status": "closed"}', NOW() - INTERVAL '15 hours 20 minutes'),
('c7b04375-03f9-42d0-bc82-380bba7dbcd6', '5f16aafd-2e92-4e6f-9359-66699ad79f49', 'door_status', '{"status": "opened"}', NOW() - INTERVAL '15 hours'),
('c7b04375-03f9-42d0-bc82-380bba7dbcd6', '5f16aafd-2e92-4e6f-9359-66699ad79f49', 'door_status', '{"status": "closed"}', NOW() - INTERVAL '14 hours 40 minutes'),

-- Lunch time (12:00 PM - 2:00 PM)
('c7b04375-03f9-42d0-bc82-380bba7dbcd6', '5f16aafd-2e92-4e6f-9359-66699ad79f49', 'door_status', '{"status": "opened"}', NOW() - INTERVAL '13 hours'),
('c7b04375-03f9-42d0-bc82-380bba7dbcd6', '5f16aafd-2e92-4e6f-9359-66699ad79f49', 'door_status', '{"status": "closed"}', NOW() - INTERVAL '12 hours 30 minutes'),
('c7b04375-03f9-42d0-bc82-380bba7dbcd6', '431e9c19-2d69-43bd-bf39-63ad066d9c24', 'door_status', '{"status": "opened"}', NOW() - INTERVAL '12 hours 20 minutes'),
('c7b04375-03f9-42d0-bc82-380bba7dbcd6', '431e9c19-2d69-43bd-bf39-63ad066d9c24', 'door_status', '{"status": "closed"}', NOW() - INTERVAL '11 hours'),

-- Afternoon (2:00 PM - 5:00 PM)
('c7b04375-03f9-42d0-bc82-380bba7dbcd6', 'c94ed95a-bcdf-4738-8b04-be5b8897e724', 'door_status', '{"status": "opened"}', NOW() - INTERVAL '10 hours'),
('c7b04375-03f9-42d0-bc82-380bba7dbcd6', 'c94ed95a-bcdf-4738-8b04-be5b8897e724', 'door_status', '{"status": "closed"}', NOW() - INTERVAL '9 hours 50 minutes'),
('c7b04375-03f9-42d0-bc82-380bba7dbcd6', '5f16aafd-2e92-4e6f-9359-66699ad79f49', 'door_status', '{"status": "opened"}', NOW() - INTERVAL '9 hours 30 minutes'),
('c7b04375-03f9-42d0-bc82-380bba7dbcd6', '5f16aafd-2e92-4e6f-9359-66699ad79f49', 'door_status', '{"status": "closed"}', NOW() - INTERVAL '9 hours'),

-- Evening (5:00 PM - 8:00 PM)
('c7b04375-03f9-42d0-bc82-380bba7dbcd6', '5f16aafd-2e92-4e6f-9359-66699ad79f49', 'door_status', '{"status": "opened"}', NOW() - INTERVAL '7 hours'),
('c7b04375-03f9-42d0-bc82-380bba7dbcd6', '5f16aafd-2e92-4e6f-9359-66699ad79f49', 'door_status', '{"status": "closed"}', NOW() - INTERVAL '6 hours 30 minutes'),
('c7b04375-03f9-42d0-bc82-380bba7dbcd6', '431e9c19-2d69-43bd-bf39-63ad066d9c24', 'door_status', '{"status": "opened"}', NOW() - INTERVAL '6 hours'),
('c7b04375-03f9-42d0-bc82-380bba7dbcd6', 'c94ed95a-bcdf-4738-8b04-be5b8897e724', 'door_status', '{"status": "opened"}', NOW() - INTERVAL '5 hours 30 minutes'),
('c7b04375-03f9-42d0-bc82-380bba7dbcd6', 'c94ed95a-bcdf-4738-8b04-be5b8897e724', 'door_status', '{"status": "closed"}', NOW() - INTERVAL '5 hours 20 minutes'),

-- Night routine (8:00 PM - 10:00 PM)
('c7b04375-03f9-42d0-bc82-380bba7dbcd6', '5f16aafd-2e92-4e6f-9359-66699ad79f49', 'door_status', '{"status": "opened"}', NOW() - INTERVAL '4 hours'),
('c7b04375-03f9-42d0-bc82-380bba7dbcd6', '5f16aafd-2e92-4e6f-9359-66699ad79f49', 'door_status', '{"status": "closed"}', NOW() - INTERVAL '3 hours 45 minutes'),
('c7b04375-03f9-42d0-bc82-380bba7dbcd6', 'c94ed95a-bcdf-4738-8b04-be5b8897e724', 'door_status', '{"status": "opened"}', NOW() - INTERVAL '3 hours 30 minutes'),
('c7b04375-03f9-42d0-bc82-380bba7dbcd6', 'c94ed95a-bcdf-4738-8b04-be5b8897e724', 'door_status', '{"status": "closed"}', NOW() - INTERVAL '3 hours 15 minutes'),
('c7b04375-03f9-42d0-bc82-380bba7dbcd6', '431e9c19-2d69-43bd-bf39-63ad066d9c24', 'door_status', '{"status": "opened"}', NOW() - INTERVAL '3 hours'),
('c7b04375-03f9-42d0-bc82-380bba7dbcd6', '431e9c19-2d69-43bd-bf39-63ad066d9c24', 'door_status', '{"status": "closed"}', NOW() - INTERVAL '2 hours 30 minutes'),

-- Late evening (10:00 PM - 12:00 AM)
('c7b04375-03f9-42d0-bc82-380bba7dbcd6', 'c94ed95a-bcdf-4738-8b04-be5b8897e724', 'door_status', '{"status": "opened"}', NOW() - INTERVAL '2 hours'),
('c7b04375-03f9-42d0-bc82-380bba7dbcd6', 'c94ed95a-bcdf-4738-8b04-be5b8897e724', 'door_status', '{"status": "closed"}', NOW() - INTERVAL '1 hour 55 minutes'),
('c7b04375-03f9-42d0-bc82-380bba7dbcd6', '431e9c19-2d69-43bd-bf39-63ad066d9c24', 'door_status', '{"status": "opened"}', NOW() - INTERVAL '1 hour 50 minutes'),
('c7b04375-03f9-42d0-bc82-380bba7dbcd6', '431e9c19-2d69-43bd-bf39-63ad066d9c24', 'door_status', '{"status": "closed"}', NOW() - INTERVAL '1 hour 30 minutes');
