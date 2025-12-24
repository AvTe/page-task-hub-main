# Google OAuth Setup Guide for EasTask

## Overview

This guide explains how to enable Google Sign-In for EasTask using Supabase Authentication.

## Prerequisites

- A Supabase project (you should already have this)
- A Google Cloud Platform account

---

## Step 1: Create Google OAuth Credentials

### 1.1 Go to Google Cloud Console

1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account

### 1.2 Create or Select a Project

1. Click the project dropdown at the top
2. Click **New Project** (or select an existing one)
3. Name it something like "EasTask" or your app name
4. Click **Create**

### 1.3 Enable OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** (unless you have a Google Workspace organization)
3. Click **Create**
4. Fill in the required fields:
   - **App name**: EasTask
   - **User support email**: Your email
   - **Developer contact email**: Your email
5. Click **Save and Continue**
6. Skip the **Scopes** section (click **Save and Continue**)
7. Skip the **Test users** section (click **Save and Continue**)
8. Review and click **Back to Dashboard**

### 1.4 Create OAuth 2.0 Client ID

1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
3. Select **Web application**
4. Configure the following:

   **Name:** 
   ```
   EasTask Web Client
   ```

   **Authorized JavaScript origins:**
   ```
   http://localhost:5173
   http://localhost:3000
   ```
   (Add your production URL when deploying)

   **Authorized redirect URIs:**
   ```
   https://YOUR_SUPABASE_PROJECT_REF.supabase.co/auth/v1/callback
   ```
   
   ⚠️ **IMPORTANT**: Get the exact redirect URI from Supabase (Step 2)

5. Click **Create**
6. **Save** the **Client ID** and **Client Secret** shown in the popup

---

## Step 2: Configure Supabase Authentication

### 2.1 Access Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your EasTask project
3. Navigate to **Authentication** → **Providers**

### 2.2 Enable Google Provider

1. Find **Google** in the list of providers
2. Toggle it **ON**
3. Enter your credentials:
   - **Client ID**: (from Google Cloud Console)
   - **Client Secret**: (from Google Cloud Console)
4. **Copy the Callback URL** shown (this is what you need for Google Cloud Console)
5. Click **Save**

### 2.3 Update Google Cloud Console with Callback URL

1. Go back to Google Cloud Console → **Credentials**
2. Click on your OAuth 2.0 Client ID to edit it
3. Add the Supabase callback URL to **Authorized redirect URIs**
4. Click **Save**

---

## Step 3: Configure Site URL (Important!)

### 3.1 Set Site URL in Supabase

1. In Supabase Dashboard, go to **Authentication** → **URL Configuration**
2. Set the **Site URL** to:
   - For development: `http://localhost:5173`
   - For production: `https://your-domain.com`
3. Add **Redirect URLs**:
   ```
   http://localhost:5173/**
   http://localhost:3000/**
   ```
4. Click **Save**

---

## Step 4: Environment Variables

Ensure your `.env.local` file has the correct Supabase credentials:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

You can find these in Supabase Dashboard → **Settings** → **API**

---

## Step 5: Test the Integration

1. Run your development server:
   ```bash
   npm run dev
   ```

2. Navigate to the login page (usually `http://localhost:5173/login`)

3. Click **"Sign in with Google"**

4. You should be redirected to Google's sign-in page

5. After signing in, you'll be redirected back to your app

---

## Troubleshooting

### Error: "redirect_uri_mismatch"

**Cause**: The redirect URI in Google Cloud Console doesn't match Supabase's callback URL.

**Solution**: 
1. Copy the exact callback URL from Supabase (Authentication → Providers → Google)
2. Paste it into Google Cloud Console (Credentials → Edit Client ID → Authorized redirect URIs)
3. Make sure there are no trailing slashes or extra characters

### Error: "Invalid OAuth client"

**Cause**: Client ID or Secret is incorrect.

**Solution**: Double-check the Client ID and Client Secret in both Google Cloud Console and Supabase.

### Error: "Access blocked: app not verified"

**Cause**: Your OAuth consent screen is in testing mode.

**Solution**: 
1. Add your test email to Google Cloud Console → OAuth consent screen → Test users
2. Or publish your app (requires verification for sensitive scopes)

### User not showing after login

**Cause**: The auth callback isn't being processed correctly.

**Solution**:
1. Check that `detectSessionInUrl: true` is set in your Supabase client config
2. Ensure the Site URL in Supabase matches your development/production URL

---

## Security Recommendations

1. **Never commit** the Client Secret to version control
2. Use **environment variables** for sensitive credentials
3. Restrict your authorized origins to only necessary domains
4. For production, obtain Google verification if required

---

## Summary Checklist

| Step | Status |
|------|--------|
| ☐ Created Google Cloud project | |
| ☐ Configured OAuth consent screen | |
| ☐ Created OAuth 2.0 client credentials | |
| ☐ Enabled Google provider in Supabase | |
| ☐ Added callback URL to Google Console | |
| ☐ Set Site URL in Supabase | |
| ☐ Tested sign-in flow | |

---

## Need Help?

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
