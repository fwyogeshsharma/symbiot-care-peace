# Email Reports Setup Guide

This guide explains how to set up the automated daily email reports feature using Resend.

## Overview

The SymBIoT platform can automatically send daily health summary reports via email to users who have subscribed. The system:
- Sends reports at user-configured times (respecting their timezone)
- Includes comprehensive health metrics, alerts, ILQ scores, and medication adherence
- Runs automatically via a cron job every 5 minutes
- Uses Resend for reliable email delivery

## Prerequisites

1. **Resend Account**: Sign up at [resend.com](https://resend.com)
2. **Verified Domain** (for production): Verify your sending domain in Resend
3. **Supabase Project**: Your SymBIoT Supabase project

## Step 1: Get Your Resend API Key

1. Log in to your Resend account
2. Navigate to **API Keys** in the dashboard
3. Click **Create API Key**
4. Give it a name (e.g., "SymBIoT Production")
5. Copy the API key (starts with `re_`)

## Step 2: Configure Supabase Edge Function Environment Variables

### Option A: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **Edge Functions** → **Settings**
3. Add the following secrets:
   - Key: `RESEND_API_KEY`
   - Value: Your Resend API key (e.g., `re_xxxxxxxxxxxxxxxx`)

### Option B: Using Supabase CLI

```bash
# Set the Resend API key
supabase secrets set RESEND_API_KEY=re_your_api_key_here
```

## Step 3: Configure the Cron Job

The cron job is already set up in the migration file `20251217100000_setup_scheduled_reports_cron.sql`, but you need to configure the database settings.

Run these SQL commands in your Supabase SQL Editor:

```sql
-- Set your Supabase URL
ALTER DATABASE postgres SET app.supabase_url = 'https://your-project.supabase.co';

-- Set your service role key (found in Project Settings → API)
ALTER DATABASE postgres SET app.supabase_service_role_key = 'your-service-role-key';
```

**To get your service role key:**
1. Go to **Project Settings** → **API**
2. Copy the `service_role` key (keep this secret!)

## Step 4: Verify Domain (Production Only)

For production use, you should verify your domain:

1. In Resend dashboard, go to **Domains**
2. Click **Add Domain**
3. Enter your domain (e.g., `symbiot.com`)
4. Add the DNS records shown to your domain provider
5. Wait for verification (usually takes a few minutes)

Once verified, update the `fromEmail` in `supabase/functions/send-scheduled-report/index.ts`:

```typescript
const fromEmail = "SymBIoT Health <reports@symbiot.com>";  // Your verified domain
```

For development/testing, you can use Resend's test domain:
```typescript
const fromEmail = "SymBIoT Health <onboarding@resend.dev>";  // Already configured
```

## Step 5: Deploy the Edge Function

If you've made any changes to the edge function, deploy it:

```bash
# Deploy all functions
supabase functions deploy

# Or deploy just the report function
supabase functions deploy send-scheduled-report
```

## Step 6: Test the Setup

### Test via Supabase Dashboard

1. Create a test subscription in your database:
   ```sql
   INSERT INTO report_subscriptions (user_id, elderly_person_id, report_type, schedule_time, is_active, timezone)
   VALUES (
     'your-user-id',
     'elderly-person-id',
     'daily_summary',
     '14:00:00',  -- 2 PM local time
     true,
     'America/New_York'
   );
   ```

2. Manually trigger the function:
   ```bash
   curl -X POST 'https://your-project.supabase.co/functions/v1/send-scheduled-report' \
     -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
     -H 'Content-Type: application/json' \
     -d '{"test": true, "subscriptionId": "your-subscription-id"}'
   ```

### Test via the UI

1. Log in to the SymBIoT app
2. Go to **Reports** page
3. Select a person
4. Scroll to "Daily Report Email" section
5. Subscribe to daily reports
6. Manually trigger a test (if you add a test button)

## Monitoring

### Check Cron Job Status

```sql
-- View scheduled jobs
SELECT * FROM cron.job;

-- View job run history
SELECT * FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;
```

### Check Email Send Logs

View logs in Supabase:
1. Go to **Edge Functions** → **send-scheduled-report**
2. Click **Logs** tab
3. Filter by date/time to see execution logs

View email status in Resend:
1. Log in to Resend dashboard
2. Go to **Emails** to see all sent emails
3. Check delivery status, opens, clicks, etc.

## Troubleshooting

### Emails Not Being Sent

1. **Check Cron Job is Running**:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'send-scheduled-reports';
   ```
   - Should show `active = true`

2. **Check Database Settings**:
   ```sql
   SELECT current_setting('app.supabase_url', true) as url,
          current_setting('app.supabase_service_role_key', true) as key;
   ```
   - Both should return values

3. **Check Edge Function Logs**:
   - Look for errors in the Supabase Edge Functions logs
   - Check for API key errors, network issues, etc.

4. **Check Resend API Key**:
   ```bash
   # Test your API key
   curl https://api.resend.com/emails \
     -H "Authorization: Bearer YOUR_RESEND_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "from": "onboarding@resend.dev",
       "to": "your-email@example.com",
       "subject": "Test",
       "html": "<p>Test email</p>"
     }'
   ```

### Timezone Issues

The system handles timezones automatically, but verify:
- User's timezone is stored correctly in `report_subscriptions.timezone`
- Cron job is running every 5 minutes
- Time conversion logic in the edge function is working

### Email in Spam

If emails go to spam:
1. Verify your domain in Resend (if not already done)
2. Set up SPF, DKIM, and DMARC records
3. Add a proper Reply-To address
4. Include an unsubscribe link

## Cost Estimate

**Resend Pricing** (as of 2024):
- Free tier: 100 emails/day, 3,000 emails/month
- Pro plan: $20/month for 50,000 emails/month

For 100 users with daily reports:
- 100 emails/day = 3,000 emails/month
- Free tier is sufficient!

**Supabase Costs**:
- Edge function executions: Free tier includes 500K invocations/month
- Database operations: Minimal impact

## Security Best Practices

1. **Never commit API keys** to git
2. **Use environment variables** for all secrets
3. **Rotate keys regularly** (every 6-12 months)
4. **Monitor usage** for unusual patterns
5. **Use verified domains** in production
6. **Implement rate limiting** if needed

## Multi-Language Support

The email template currently supports English. To add multi-language support:

1. Pass user's preferred language in the subscription
2. Update `generateReportHTML()` to use translation strings
3. Load translations from the same i18n files used in the frontend

Example:
```typescript
function generateReportHTML(data: ReportData, language: string = 'en'): string {
  const translations = {
    en: { title: 'Daily Health Report', ... },
    es: { title: 'Informe Diario de Salud', ... },
    fr: { title: 'Rapport de Santé Quotidien', ... },
    // etc.
  };

  const t = translations[language] || translations.en;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${t.title}</title>
      </head>
      ...
  `;
}
```

## Next Steps

1. ✅ Set up Resend account and get API key
2. ✅ Configure Supabase environment variables
3. ✅ Configure cron job database settings
4. ✅ Test email sending
5. ⬜ Verify domain for production
6. ⬜ Customize email template (optional)
7. ⬜ Add multi-language support (optional)
8. ⬜ Monitor and optimize

## Support

For issues:
- **Resend**: Check [Resend docs](https://resend.com/docs) or contact support
- **Supabase**: Check [Supabase docs](https://supabase.com/docs) or community
- **SymBIoT**: Review logs and raise issues in the project repository

---

**Last Updated**: December 2024
