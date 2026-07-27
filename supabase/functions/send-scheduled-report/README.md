# Send Scheduled Report Edge Function

This Supabase Edge Function sends automated daily health report emails to subscribed users using Resend.

## Overview

- **Trigger**: Called by pg_cron every 5 minutes
- **Purpose**: Send daily health summary emails at user-configured times
- **Email Service**: Resend
- **Report Type**: End of Day Summary with ILQ scores, vital signs, alerts, and medication adherence

## Environment Variables

Required secrets (configure in Supabase Dashboard → Edge Functions → Settings):

| Variable | Description | Example |
|----------|-------------|---------|
| `RESEND_API_KEY` | Your Resend API key | `re_xxxxx...` |
| `SUPABASE_URL` | Auto-provided by Supabase | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-provided by Supabase | `eyJxxx...` |

## How It Works

### 1. Cron Job Trigger
```sql
-- Runs every 5 minutes
SELECT cron.schedule(
  'send-scheduled-reports',
  '*/5 * * * *',
  'SELECT public.trigger_scheduled_reports();'
);
```

### 2. Function Execution Flow

```
1. Fetch active subscriptions from report_subscriptions table
2. For each subscription:
   a. Convert user's local schedule time to UTC
   b. Check if current time matches schedule (±30 min window)
   c. If match (or test mode):
      - Fetch today's device data (heart rate, steps, etc.)
      - Fetch today's alerts
      - Fetch latest ILQ score
      - Fetch medication adherence logs
      - Generate HTML email
      - Send via Resend
3. Return summary of processed reports
```

### 3. Data Collection

For each report, the function collects:

- **Device Data** (`device_data` table)
  - Heart rate, blood pressure, oxygen saturation
  - Steps, activity levels
  - Blood glucose, temperature
  - Environmental data (temp, humidity, air quality)

- **Alerts** (`alerts` table)
  - Active alerts needing attention
  - Resolved alerts from today
  - Alert severity and descriptions

- **ILQ Score** (`ilq_scores` table)
  - Latest Independent Living Quality score
  - Trending direction (improving/declining)

- **Medication Logs** (`medication_adherence_logs` table)
  - Doses taken vs scheduled
  - Adherence percentage

## Email Template

The HTML email template includes:

1. **Header**
   - SymBIoT branding
   - Date of report

2. **Person Info**
   - Elderly person's name
   - Report type (End of Day Summary)

3. **ILQ Score** (if available)
   - Large score display
   - Color-coded: Green (≥85), Yellow (70-84), Red (<70)
   - Status text (Excellent/Good/Fair/Needs Attention)

4. **Key Metrics Grid**
   - Steps taken today
   - Average heart rate
   - Medication adherence %
   - Active alerts count

5. **Recent Alerts** (if any)
   - Up to 5 most recent alerts
   - Color-coded by severity
   - Title, description, timestamp

6. **Footer**
   - Unsubscribe information
   - SymBIoT branding

## API Endpoints

### POST /send-scheduled-report

**Authentication**: Service role key required

**Request Body** (optional):
```json
{
  "test": true,                    // Skip time check, send immediately
  "subscriptionId": "uuid",        // Test specific subscription
  "userId": "uuid"                 // Test all subscriptions for user
}
```

**Response**:
```json
{
  "success": true,
  "processed": 2,
  "results": [
    {
      "subscriptionId": "uuid",
      "success": true,
      "email": "user@example.com",
      "emailId": "resend-email-id"
    }
  ],
  "timestamp": "2024-12-17T10:00:00.000Z"
}
```

## Timezone Handling

The function handles timezones automatically:

1. User sets schedule in their local time (e.g., "9:00 AM EST")
2. Timezone stored in `report_subscriptions.timezone`
3. Function converts local time → UTC for comparison
4. Cron runs every 5 minutes, catching schedules within ±30 min window

**Example**:
```typescript
// User in New York schedules 9:00 AM EST
// EST is UTC-5, so 9:00 AM EST = 14:00 UTC
// Function sends when current UTC time is between 13:30-14:30
```

## Testing

### Test via cURL

```bash
# Test all active subscriptions (respects time)
curl -X POST 'https://your-project.supabase.co/functions/v1/send-scheduled-report' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json'

# Test mode (ignores time check)
curl -X POST 'https://your-project.supabase.co/functions/v1/send-scheduled-report' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"test": true}'

# Test specific subscription
curl -X POST 'https://your-project.supabase.co/functions/v1/send-scheduled-report' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"test": true, "subscriptionId": "uuid-here"}'

# Test all subscriptions for a user
curl -X POST 'https://your-project.supabase.co/functions/v1/send-scheduled-report' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"test": true, "userId": "uuid-here"}'
```

### Test from Supabase Dashboard

1. Go to **Edge Functions** → **send-scheduled-report**
2. Click **Invoke Function**
3. Add test payload:
   ```json
   {"test": true, "userId": "your-user-id"}
   ```
4. Click **Run**
5. Check logs and email inbox

## Monitoring

### View Logs

```bash
# Via Supabase CLI
supabase functions logs send-scheduled-report

# Or in dashboard
Edge Functions → send-scheduled-report → Logs
```

### Check Cron Job Status

```sql
-- View job configuration
SELECT * FROM cron.job WHERE jobname = 'send-scheduled-reports';

-- View execution history
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'send-scheduled-reports')
ORDER BY start_time DESC
LIMIT 20;
```

### Monitor Email Delivery

1. **Resend Dashboard**
   - View all sent emails
   - Check delivery status
   - See bounce/spam rates

2. **Database Queries**
   ```sql
   -- Active subscriptions
   SELECT
     rs.*,
     p.email,
     ep.full_name as person_name
   FROM report_subscriptions rs
   JOIN profiles p ON rs.user_id = p.id
   JOIN elderly_persons ep ON rs.elderly_person_id = ep.id
   WHERE rs.is_active = true;
   ```

## Error Handling

The function handles various error scenarios:

1. **Missing Email**: Logs error, skips subscription
2. **No Data Available**: Sends report with "N/A" values
3. **Resend API Error**: Logs error, continues with other subscriptions
4. **Database Error**: Logs error, continues processing
5. **Timezone Conversion Error**: Falls back to UTC

All errors are logged to Supabase Edge Function logs.

## Performance

- **Execution Time**: ~2-5 seconds per subscription
- **Memory**: Minimal (streaming HTML generation)
- **Rate Limits**:
  - Resend: 10 emails/second (free tier)
  - Supabase: 500K function invocations/month (free tier)

## Customization

### Modify Email Template

Edit the `generateReportHTML()` function to:
- Add/remove sections
- Change styling
- Include additional metrics
- Add company branding

### Add Multi-Language Support

```typescript
function generateReportHTML(data: ReportData, language: string = 'en'): string {
  const translations = {
    en: { /* English translations */ },
    es: { /* Spanish translations */ },
    fr: { /* French translations */ },
  };

  const t = translations[language] || translations.en;

  return `
    <h1>${t.title}</h1>
    <!-- Use translations throughout -->
  `;
}
```

### Change Send Frequency

Edit the cron schedule in the migration file:

```sql
-- Every 15 minutes instead of 5
SELECT cron.schedule(
  'send-scheduled-reports',
  '*/15 * * * *',  -- Changed from */5
  'SELECT public.trigger_scheduled_reports();'
);
```

## Security

- ✅ Uses service role key for database access
- ✅ CORS headers configured
- ✅ JWT verification disabled (called by trusted cron)
- ✅ API keys stored as Supabase secrets (not in code)
- ✅ No user input directly in SQL queries
- ✅ Email addresses validated via database constraints

## Dependencies

- **Deno Standard Library** (`std@0.190.0`)
- **Supabase JS Client** (`@supabase/supabase-js@2`)
- **Resend SDK** (`resend@2.0.0`)

All dependencies loaded from CDN (Deno's esm.sh).

## Troubleshooting

### Emails Not Sending

1. Check API key: `supabase secrets list`
2. Check cron job: `SELECT * FROM cron.job;`
3. Check logs: View in Supabase dashboard
4. Test manually: Use cURL command above

### Wrong Send Times

1. Verify timezone: `SELECT timezone FROM report_subscriptions;`
2. Check schedule: `SELECT schedule_time FROM report_subscriptions;`
3. Test time conversion: Add console.logs to function

### Missing Data in Emails

1. Check data exists: Query `device_data`, `alerts`, etc.
2. Verify elderly_person_id is correct
3. Check date range calculations in function

## Future Enhancements

- [ ] Add PDF attachment option
- [ ] Include charts/graphs
- [ ] Support weekly/monthly summaries
- [ ] Add comparison to previous periods
- [ ] Implement A/B testing for templates
- [ ] Add email open/click tracking
- [ ] Support multiple languages
- [ ] Add custom report preferences

## Related Files

- Migration: `supabase/migrations/20251217100000_setup_scheduled_reports_cron.sql`
- Frontend: `src/components/reports/ReportSubscriptionManager.tsx`
- Database Schema: `report_subscriptions` table
- Documentation: `docs/EMAIL_REPORTS_SETUP.md`

## Support

For issues or questions:
1. Check Supabase logs
2. Check Resend dashboard
3. Review this documentation
4. Check main setup guide in `/docs`
