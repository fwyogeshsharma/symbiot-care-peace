# UTC Time Storage for Report Subscriptions

## Overview

The report subscription system now stores all schedule times in UTC format in the database. This ensures consistent triggering across all timezones and simplifies the backend logic.

## How It Works

### Frontend (User Interface)
1. **User Input**: Users see and select times in their local timezone
2. **Conversion to UTC**: When saving, the frontend converts the local time to UTC using JavaScript's timezone APIs
3. **Display**: When loading existing subscriptions, UTC times are converted back to local timezone for display

### Backend (Database & Triggers)
1. **Storage**: The `schedule_time` column in `report_subscriptions` table stores times in UTC format (HH:MM:SS)
2. **Triggers**: The cron job and edge function work directly with UTC times, eliminating the need for timezone conversions
3. **Comparison**: Schedule times are compared directly with current UTC time

## Implementation Details

### Database Changes

**Migration File**: `supabase/migrations/20251218120000_convert_schedule_time_to_utc.sql`

Key changes:
- Added comments to `schedule_time` and `timezone` columns clarifying their purpose
- Created `convert_schedule_time_to_utc()` function for data migration
- Migrated all existing subscriptions from local time to UTC
- Created `get_subscriptions_due_now()` helper function for efficient UTC-based queries

### Frontend Changes

**File**: `src/components/reports/ReportSubscriptionManager.tsx`

New helper functions:
- `convertLocalTimeToUTC(localTime, timezone)`: Converts user's local time to UTC for storage
- `convertUTCToLocalTime(utcTime, timezone)`: Converts stored UTC time to local time for display

Changes:
- Schedule times are converted to UTC before saving to database
- Stored UTC times are converted to local timezone when displaying to users
- UI still shows "Times are shown in your local timezone (stored as UTC)" message

### Backend Changes

**File**: `supabase/functions/send-scheduled-report/index.ts`

Simplifications:
- Removed `getUTCTimeFromLocal()` function (no longer needed)
- Time comparison now works directly with UTC values
- Clearer logging indicating times are in UTC

## Benefits

1. **Consistency**: All times stored in a standard format (UTC)
2. **Simplicity**: Backend logic is much simpler without timezone conversions
3. **Reliability**: Eliminates timezone-related bugs and DST issues
4. **Performance**: Direct UTC comparisons are faster than timezone conversions
5. **Maintainability**: Easier to understand and debug

## Testing

### 1. Apply Database Migration

```bash
# Push the migration to your Supabase project
supabase db push
```

### 2. Test Frontend Time Conversion

1. Open the Reports page
2. Select a person
3. Set a schedule time (e.g., 9:00 AM in your local timezone)
4. Save the subscription
5. Check the database to verify it's stored in UTC:

```sql
SELECT id, schedule_time, timezone, is_active
FROM report_subscriptions
ORDER BY created_at DESC
LIMIT 5;
```

**Expected Result**:
- If you're in EST (UTC-5) and set 9:00 AM, it should be stored as 14:00:00
- If you're in PST (UTC-8) and set 9:00 AM, it should be stored as 17:00:00

### 3. Test Edge Function

Test the edge function directly:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/send-scheduled-report \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"test": true, "userId": "your-user-id"}'
```

**Expected Result**:
- Function should log times in UTC format
- Report should be sent regardless of scheduled time (test mode)

### 4. Test Cron Trigger

Wait for the cron job to run (every 5 minutes) or trigger it manually:

```sql
SELECT public.trigger_scheduled_reports();
```

Check the Supabase logs to verify:
- Subscriptions are being checked
- UTC time comparisons are working
- Reports are sent at the correct times

### 5. Verify Time Display

1. Reload the Reports page
2. Check that the displayed time matches what you originally set (in your local timezone)
3. Try changing timezones on your device and verify the display updates accordingly

## Troubleshooting

### Issue: Times not matching after migration

**Solution**: The migration should have converted all existing times. If you see discrepancies:

```sql
-- Check current times
SELECT id, schedule_time, timezone FROM report_subscriptions;

-- Manually reconvert if needed (replace 'subscription-id' with actual ID)
UPDATE report_subscriptions
SET schedule_time = public.convert_schedule_time_to_utc(schedule_time, timezone)
WHERE id = 'subscription-id';
```

### Issue: Reports not being sent at expected time

**Debugging**:

1. Check current UTC time:
```sql
SELECT NOW() AT TIME ZONE 'UTC';
```

2. Check subscription schedule time:
```sql
SELECT id, schedule_time, timezone FROM report_subscriptions WHERE is_active = true;
```

3. Verify the cron job is running:
```sql
SELECT * FROM cron.job WHERE jobname = 'send-scheduled-reports';
```

4. Check edge function logs in Supabase Dashboard > Edge Functions > send-scheduled-report > Logs

### Issue: Frontend showing wrong time

**Debugging**:

1. Check browser console for errors
2. Verify user's timezone: `Intl.DateTimeFormat().resolvedOptions().timeZone`
3. Check if `subscription.schedule_time` is in correct format (HH:MM:SS)

## Migration Notes

- **Backward Compatibility**: None - this is a breaking change if you have existing subscriptions
- **Data Safety**: The migration preserves all existing subscription data, just converts times to UTC
- **Rollback**: To rollback, you would need to reconvert UTC times back to local times using the timezone field

## Example Scenarios

### Scenario 1: User in New York (EST, UTC-5)
- User sets: 9:00 AM local time
- Stored in DB: 14:00:00 UTC
- Cron checks at: 14:00-14:30 UTC
- Report sent at: ~9:00 AM EST

### Scenario 2: User in Tokyo (JST, UTC+9)
- User sets: 9:00 AM local time
- Stored in DB: 00:00:00 UTC (previous day)
- Cron checks at: 23:30-00:30 UTC
- Report sent at: ~9:00 AM JST

### Scenario 3: User in London (GMT, UTC+0)
- User sets: 9:00 AM local time
- Stored in DB: 09:00:00 UTC
- Cron checks at: 08:30-09:30 UTC
- Report sent at: ~9:00 AM GMT

## Future Enhancements

1. **Timezone DST Handling**: Consider storing both UTC and local times to handle DST transitions
2. **User Preferences**: Allow users to opt for specific timezone handling
3. **Multiple Times**: Support multiple daily report times
4. **Timezone Dropdown**: Add explicit timezone selector instead of relying on browser detection
