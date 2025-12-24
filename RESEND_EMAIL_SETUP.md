# Resend Email Setup Guide for EasTask

## Overview

This guide will help you set up Resend email service for EasTask to send:
- Workspace invitation emails
- Task assignment notifications
- Task update notifications
- Reminder emails

**Free Tier:** 3,000 emails/month (perfect for small to medium teams!)

---

## Step 1: Create a Resend Account

1. Go to [resend.com](https://resend.com)
2. Click **"Start for free"**
3. Sign up with your email or GitHub account
4. Verify your email address

---

## Step 2: Get Your API Key

1. After logging in, go to **API Keys** in the sidebar
2. Click **"Create API Key"**
3. Name it: `EasTask Production` (or any name you prefer)
4. Set permission to **"Sending access"**
5. Click **"Create"**
6. **Copy the API key** (starts with `re_`)

⚠️ **Important:** Save this key somewhere safe! You won't be able to see it again.

---

## Step 3: Configure Your Domain (Optional but Recommended)

For production, you should verify your own domain for better deliverability.

### Using Resend's Test Domain (Quick Start)
- You can use `onboarding@resend.dev` as the sender for testing
- Emails will only go to your verified email address

### Using Your Own Domain (Recommended for Production)
1. Go to **Domains** in Resend dashboard
2. Click **"Add Domain"**
3. Enter your domain (e.g., `eastask.com`)
4. Add the DNS records Resend provides to your domain
5. Wait for verification (usually 1-24 hours)

---

## Step 4: Update Your Environment Variables

Edit your `.env.local` file and add these settings:

```env
# =====================================================
# RESEND EMAIL CONFIGURATION
# =====================================================

# Set provider to 'resend'
VITE_EMAIL_SERVICE_PROVIDER=resend

# Your Resend API key (starts with re_)
VITE_EMAIL_SERVICE_API_KEY=re_your_api_key_here

# Sender email (use your verified domain or resend.dev for testing)
VITE_FROM_EMAIL=noreply@yourdomain.com
# OR for testing:
# VITE_FROM_EMAIL=onboarding@resend.dev

# Sender name (shows in email clients)
VITE_FROM_NAME=EasTask Team

# Your app URL (for email links)
VITE_APP_URL=http://localhost:5173
```

---

## Step 5: Restart Your Development Server

After updating `.env.local`, restart your dev server:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

---

## Step 6: Test Email Sending

1. Open your app
2. Go to **Team** or **Workspace Management**
3. Try to **invite a member** by email
4. Check the console for email logs
5. If configured correctly, the email will be sent via Resend!

---

## Email Templates in EasTask

Your app includes these beautiful email templates:

### 1. Workspace Invitation
- Sent when you invite someone to your workspace
- Includes: Inviter name, workspace name, accept button

### 2. Task Assignment
- Sent when you assign a task to someone
- Includes: Task title, description, priority, due date

### 3. Task Update
- Sent when a task status changes
- Includes: What changed, who made the change

### 4. Task Reminder
- Sent before task due dates
- Includes: Task details, time remaining

---

## Troubleshooting

### "Email not sending"
1. Check that `VITE_EMAIL_SERVICE_PROVIDER=resend` is set
2. Verify your API key is correct
3. Check the browser console for errors

### "401 Unauthorized"
- Your API key is invalid
- Create a new API key in Resend dashboard

### "403 Forbidden"
- The sender email is not verified
- Use `onboarding@resend.dev` for testing, or verify your domain

### "Emails going to spam"
- Verify your own domain instead of using resend.dev
- Set up SPF, DKIM, and DMARC records

---

## Rate Limits

| Plan | Emails/Month | Emails/Second |
|------|--------------|---------------|
| Free | 3,000 | 1 |
| Pro | 50,000+ | 10 |

---

## Security Best Practices

1. **Never commit** your API key to version control
2. Add `.env.local` to your `.gitignore`
3. Use different API keys for development and production
4. Consider using environment variables on your hosting platform

---

## Quick Reference

| Setting | Value |
|---------|-------|
| API Endpoint | `https://api.resend.com/emails` |
| Provider Name | `resend` |
| Free Tier | 3,000 emails/month |
| Dashboard | [resend.com/emails](https://resend.com/emails) |

---

## Next Steps

1. ✅ Create Resend account
2. ✅ Get API key
3. ✅ Update .env.local
4. ✅ Restart dev server
5. ✅ Test by inviting a team member
6. ⬜ (Optional) Verify your own domain for production

---

## Need Help?

- [Resend Documentation](https://resend.com/docs)
- [Resend API Reference](https://resend.com/docs/api-reference)
