# Firebase Push Notifications Setup Guide

This guide will help you set up Firebase Cloud Messaging (FCM) for push notifications that work **even when the app is completely closed**.

## ⚠️ Important: Using FCM API v1

**Firebase has deprecated the Legacy Cloud Messaging API (June 2024)**. This implementation uses the new **FCM HTTP v1 API** which requires:
- Service Account credentials (JSON file) instead of Server Key
- OAuth 2.0 authentication
- Updated API endpoints and payload structure

If you previously used the Legacy API, you must migrate to v1 API to continue receiving push notifications.

## 🔥 Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** or select existing project
3. Enter project name: `symbiot-care` (or your choice)
4. Disable Google Analytics (optional)
5. Click **"Create project"**

## 📱 Step 2: Add Android App to Firebase

1. In Firebase Console, click the **Android icon** (⚙️ Settings → Project settings)
2. Click **"Add app"** → Select Android
3. Enter package name: `com.symbiot.care`
   - **IMPORTANT**: This must match your app's package name in `capacitor.config.ts`
4. Enter app nickname: `SymBIoT Care` (optional)
5. Click **"Register app"**

## 📥 Step 3: Download google-services.json

1. Click **"Download google-services.json"**
2. **Replace** the dummy file at: `android/app/google-services.json`
3. The file should look like this:

```json
{
  "project_info": {
    "project_number": "YOUR_PROJECT_NUMBER",
    "project_id": "your-project-id",
    "storage_bucket": "your-project-id.appspot.com"
  },
  "client": [
    {
      "client_info": {
        "mobilesdk_app_id": "1:YOUR_PROJECT_NUMBER:android:YOUR_APP_ID",
        "android_client_info": {
          "package_name": "com.symbiot.care"
        }
      },
      "oauth_client": [...],
      "api_key": [
        {
          "current_key": "YOUR_ACTUAL_API_KEY"
        }
      ],
      "services": {...}
    }
  ]
}
```

## 🔑 Step 4: Get Firebase Service Account Credentials

**IMPORTANT**: Firebase has deprecated the Legacy API. We now use FCM API v1.

1. In Firebase Console, go to **Project Settings** (⚙️ icon)
2. Go to **"Service accounts"** tab
3. Click **"Generate new private key"** button
4. Click **"Generate key"** in the confirmation dialog
5. A JSON file will download (e.g., `your-project-firebase-adminsdk-xxxxx.json`)
6. **Keep this file secure** - it contains sensitive credentials

The downloaded JSON file will contain:
- `project_id`: Your Firebase project ID
- `private_key`: RSA private key for authentication
- `client_email`: Service account email

7. **Enable FCM API v1** (if not already enabled):
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Select your Firebase project
   - Go to **APIs & Services** → **Library**
   - Search for "Firebase Cloud Messaging API"
   - Click on it and click **"Enable"**

## 🗄️ Step 5: Setup Database

Run these SQL commands in your Supabase SQL Editor:

```sql
-- 1. Create FCM tokens table
-- File: supabase/migrations/create_fcm_tokens_table.sql
```

Copy the entire content from `supabase/migrations/create_fcm_tokens_table.sql` and run it.

## ⚡ Step 6: Deploy Supabase Edge Function

1. Install Supabase CLI (if not installed):
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link your project:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```

4. Set Firebase Service Account as secret:

   **Option A: Using CLI (Recommended)**
   ```bash
   supabase secrets set FIREBASE_SERVICE_ACCOUNT="$(cat path/to/your-service-account.json | tr -d '\n')"
   ```

   **Option B: Using Supabase Dashboard**
   - Go to **Project Settings** → **Edge Functions** → **Secrets**
   - Click **Add new secret**
   - Name: `FIREBASE_SERVICE_ACCOUNT`
   - Value: Paste the entire JSON content from your service account file
   - Click **Save**

5. Deploy the Edge Function:
   ```bash
   supabase functions deploy send-push-notification
   ```

## 🔗 Step 7: Create Database Webhook

1. Go to your Supabase Dashboard
2. Navigate to **Database → Webhooks**
3. Click **"Create a new hook"**
4. Configure:
   - **Name**: `alert-push-notifications`
   - **Table**: `alerts`
   - **Events**: Check `INSERT`
   - **Type**: Select `Supabase Edge Functions`
   - **Edge Function**: `send-push-notification`
   - **HTTP Request Body**:
     ```json
     {
       "alert": {
         "id": "{{record.id}}",
         "elderly_person_id": "{{record.elderly_person_id}}",
         "alert_type": "{{record.alert_type}}",
         "severity": "{{record.severity}}",
         "title": "{{record.title}}",
         "description": "{{record.description}}",
         "status": "{{record.status}}",
         "created_at": "{{record.created_at}}"
       }
     }
     ```
5. Click **"Create hook"**

## 📲 Step 8: Rebuild & Deploy App

1. Rebuild the app:
   ```bash
   npm run cap:build
   ```

2. Build Android APK:
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

3. Install on device:
   ```bash
   adb install -r app/build/outputs/apk/release/app-release.apk
   ```

## ✅ Step 9: Test Push Notifications

1. **Launch the app** on your Android device
2. **Log in** to the app
3. Check logcat to verify FCM token registration:
   ```bash
   adb logcat | grep -i "FCM"
   ```
   You should see: `FCM token received: ...` and `FCM token stored successfully`

4. **Insert a test alert** in Supabase SQL Editor:
   ```sql
   -- Get an elderly person ID first
   SELECT id, full_name FROM elderly_persons LIMIT 1;

   -- Insert test panic SOS alert (replace the ID)
   INSERT INTO alerts (
     elderly_person_id,
     alert_type,
     severity,
     title,
     description,
     status
   ) VALUES (
     'YOUR_ELDERLY_PERSON_ID',
     'panic_sos',
     'critical',
     'Test Emergency',
     'This is a test notification',
     'active'
   );
   ```

5. **Check your device** - You should receive a push notification!

## 🔍 Troubleshooting

### No notification received?

1. **Check device logs**:
   ```bash
   adb logcat | grep -E "FCM|Capacitor|Push"
   ```

2. **Verify FCM token is stored**:
   ```sql
   SELECT * FROM fcm_tokens WHERE user_id = 'YOUR_USER_ID';
   ```

3. **Check Edge Function logs** in Supabase Dashboard → Edge Functions → send-push-notification

4. **Verify Firebase Server Key** is set correctly:
   ```bash
   supabase secrets list
   ```

### App crashes?

1. Check that `google-services.json` is properly configured
2. Verify package name matches in `capacitor.config.ts` and Firebase
3. Check Android logs:
   ```bash
   adb logcat *:E
   ```

## 📊 How It Works

1. **User logs in** → App requests FCM token from Firebase
2. **FCM token received** → Stored in `fcm_tokens` table
3. **Alert created in database** → Webhook triggers Edge Function
4. **Edge Function runs** → Fetches FCM tokens for relevant users
5. **FCM API called** → Sends push notification to devices
6. **Notification received** → Appears in Android system tray
7. **User taps notification** → Opens app to alert details

## 🎯 Push Notification Features

✅ **Works when app is closed**
✅ **Works when app is in background**
✅ **System tray notifications**
✅ **Sound & vibration alerts**
✅ **Multiple devices per user**
✅ **Targeted notifications** (only relevant users)
✅ **Real-time** (instant delivery)

## 🔐 Security Notes

- Firebase Server Key is stored as Supabase secret (encrypted)
- FCM tokens are user-specific (Row Level Security enabled)
- Only authorized users receive notifications for their patients
- Tokens automatically expire and refresh

## 📝 Environment Variables Needed

Set these in Supabase Dashboard → Settings → Edge Functions → Secrets:

```bash
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}
```

**Note**: The `FIREBASE_SERVICE_ACCOUNT` should contain the entire JSON content from your Firebase service account file (can be on one line or formatted).

Your Supabase URL and Service Role Key are automatically available in Edge Functions.

## ✨ Done!

Your push notifications are now fully configured! When any alert is created (panic SOS, fall detection, vital signs, etc.), all relevant caregivers and family members will receive an instant push notification on their Android devices.
