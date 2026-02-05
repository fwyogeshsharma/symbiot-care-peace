# NVIDIA Chatbot Setup Guide

## Overview
Your SymBIoT chatbot now uses NVIDIA's Llama 4 Maverick model via a Supabase Edge Function. This setup is more secure and avoids CORS issues.

## Architecture
```
Browser → Supabase Edge Function → NVIDIA API
```

## Setup Steps

### 1. Deploy the Edge Function

Open your terminal and run:

```bash
# Login to Supabase (if not already logged in)
npx supabase login

# Link your project
npx supabase link --project-ref wiyfcvypeifbdaqnfgrr

# Deploy the nvidia-chat function
npx supabase functions deploy nvidia-chat
```

### 2. Set the NVIDIA API Key Secret

You need to set your NVIDIA API key as a secret in Supabase:

```bash
npx supabase secrets set NVIDIA_API_KEY=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
```

**Alternative: Set via Supabase Dashboard**

1. Go to https://supabase.com/dashboard/project/wiyfcvypeifbdaqnfgrr/functions
2. Click on "Edge Functions"
3. Click on "Manage secrets"
4. Add a new secret:
   - Key: `NVIDIA_API_KEY`
   - Value: `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`

### 3. Restart Your Development Server

```bash
# Stop your current dev server (Ctrl+C)
# Then restart it
npm run dev
# or
bun dev
```

### 4. Test the Chatbot

1. Open your application in the browser
2. Make sure you're logged in
3. Click the floating chat button (bottom-right corner)
4. Send a test message like "What features does SymBIoT have?"

## How It Works

1. **Frontend** (`src/services/nvidiaService.ts`):
   - Gets the user's authentication token from Supabase
   - Sends messages to the Supabase Edge Function

2. **Edge Function** (`supabase/functions/nvidia-chat/index.ts`):
   - Verifies the user is authenticated
   - Forwards the request to NVIDIA API with the API key
   - Returns the AI response to the frontend

3. **Benefits**:
   - ✅ API key is hidden from the browser (more secure)
   - ✅ No CORS issues
   - ✅ Can add rate limiting later if needed
   - ✅ All API calls are authenticated

## Troubleshooting

### Error: "You must be logged in to use the chatbot"
- Make sure you're logged into the application
- Check that your Supabase authentication is working

### Error: "NVIDIA API key not configured"
- Make sure you've set the `NVIDIA_API_KEY` secret in Supabase
- Redeploy the function after setting the secret

### Error: "Failed to fetch" or "Network error"
- Make sure the Edge Function is deployed: `npx supabase functions list`
- Check the Edge Function logs: `npx supabase functions logs nvidia-chat`
- Verify your Supabase URL is correct in `.env`

### Check Edge Function Logs

To see what's happening in the Edge Function:

```bash
npx supabase functions logs nvidia-chat --follow
```

## Environment Variables

Your `.env` file no longer needs `VITE_NVIDIA_API_KEY` since the API key is now stored securely in Supabase secrets. However, it doesn't hurt to keep it there.

Required environment variables in `.env`:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Your Supabase anon key

## Security Notes

- ✅ The NVIDIA API key is now stored server-side (Supabase secrets)
- ✅ Only authenticated users can use the chatbot
- ✅ The API key is never exposed to the browser
- ✅ CORS issues are eliminated

## Cost Considerations

The NVIDIA API may have rate limits or costs associated with it. Monitor your usage in the NVIDIA dashboard.

## Support

If you encounter any issues:
1. Check the Edge Function logs
2. Verify the API key is correct
3. Ensure the Edge Function is deployed
4. Test the NVIDIA API directly to ensure it's working
