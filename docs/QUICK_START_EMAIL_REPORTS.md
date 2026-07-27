# Quick Start: Email Reports

Get daily health report emails working in 5 minutes!

## 1. Sign Up for Resend (2 minutes)

1. Go to [resend.com](https://resend.com)
2. Create a free account
3. Navigate to **API Keys**
4. Create a new API key
5. Copy the key (starts with `re_`)

## 2. Add API Key to Supabase (1 minute)

**Via Dashboard:**
1. Open your Supabase project
2. Go to **Edge Functions** → **Settings**
3. Click **Add new secret**
4. Name: `RESEND_API_KEY`
5. Value: Paste your Resend API key
6. Save

**Or via CLI:**
```bash
supabase secrets set RESEND_API_KEY=re_your_key_here
```

## 3. Configure Cron Job (2 minutes)

In your Supabase SQL Editor, run:

```sql
-- Set your Supabase URL (find in Project Settings → API)
ALTER DATABASE postgres SET app.supabase_url = 'https://your-project.supabase.co';

-- Set your service role key (find in Project Settings → API → service_role)
ALTER DATABASE postgres SET app.supabase_service_role_key = 'your-service-role-key';
```

## 4. Test It! (1 minute)

**Option A: Use the UI**
1. Open the SymBIoT app
2. Go to Reports page
3. Select a person
4. Scroll to "Daily Report Email"
5. Subscribe with your email
6. Wait for the scheduled time or...

**Option B: Manual Test**
```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/send-scheduled-report' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"test": true, "userId": "your-user-id"}'
```

## Done! 🎉

You should receive a beautifully formatted daily health report email!

## What You Get

The email includes:
- ✅ ILQ (Independent Living Quality) Score
- ✅ Daily activity summary (steps, heart rate)
- ✅ Medication adherence
- ✅ Active alerts
- ✅ Recent alert details
- ✅ Beautiful, mobile-responsive design

## Need More Details?

See the full [Email Reports Setup Guide](./EMAIL_REPORTS_SETUP.md) for:
- Production setup with verified domains
- Monitoring and troubleshooting
- Multi-language support
- Customizing the email template
- Security best practices

## Quick Troubleshooting

**No emails arriving?**
1. Check spam folder
2. Verify API key in Supabase secrets
3. Check cron job: `SELECT * FROM cron.job;`
4. View logs in Supabase Edge Functions

**Emails not at the right time?**
- Verify timezone in subscription settings
- Cron runs every 5 minutes, so reports are sent within 5 minutes of scheduled time

**Need help?**
Check the detailed guide or logs in:
- Supabase: Edge Functions → send-scheduled-report → Logs
- Resend: Dashboard → Emails
