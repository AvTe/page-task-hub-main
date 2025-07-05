# 🚀 Supabase Setup Guide for Page Task Hub

## Step 1: Create Supabase Project

1. **Go to [supabase.com](https://supabase.com)** and sign up/login
2. **Click "New Project"**
3. **Project Settings:**
   - **Name**: `page-task-hub`
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free tier

## Step 2: Set up Database Schema

### 2.1 Run the Main Schema
1. Go to **SQL Editor** in your Supabase dashboard
2. Copy and paste the contents of `supabase-schema.sql`
3. Click **Run** to create all tables

### 2.2 Set up Row Level Security
1. In the **SQL Editor**, create a new query
2. Copy and paste the contents of `supabase-rls-policies.sql`
3. Click **Run** to enable RLS and create all security policies

### 2.3 Add Functions and Triggers
1. In the **SQL Editor**, create a new query
2. Copy and paste the contents of `supabase-functions-triggers.sql`
3. Click **Run** to create all functions and triggers

## Step 3: Configure Authentication

### 3.1 Enable Email Authentication
1. Go to **Authentication > Settings**
2. Under **Auth Providers**, ensure **Email** is enabled
3. Configure email templates if needed

### 3.2 Enable Google OAuth (Optional)
1. Go to **Authentication > Settings**
2. Under **Auth Providers**, click **Google**
3. Enable Google provider
4. Add your Google OAuth credentials:
   - **Client ID**: From Google Cloud Console
   - **Client Secret**: From Google Cloud Console
   - **Redirect URL**: `https://your-project.supabase.co/auth/v1/callback`

### 3.3 Configure Site URL
1. In **Authentication > Settings**
2. Set **Site URL** to your app's URL:
   - Development: `http://localhost:5173`
   - Production: `https://your-app.netlify.app`

## Step 4: Get Your Project Credentials

1. Go to **Settings > API**
2. Copy these values (you'll need them for your app):
   - **Project URL**: `https://your-project.supabase.co`
   - **Anon Public Key**: `eyJ...` (starts with eyJ)
   - **Service Role Key**: `eyJ...` (keep this secret!)

## Step 5: Test Your Setup

### 5.1 Test Database Connection
Run this query in the SQL Editor to verify everything is working:

```sql
-- Test query to verify setup
SELECT 
  'Database setup complete!' as message,
  COUNT(*) as table_count
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'workspaces', 'workspace_members', 'pages', 
    'tasks', 'task_comments', 'workspace_invitations',
    'user_activities', 'user_presence'
  );
```

You should see: `Database setup complete!` with `table_count: 8`

### 5.2 Test RLS Policies
```sql
-- Test RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND rowsecurity = true;
```

You should see all 8 tables with `rowsecurity: true`

## Step 6: Environment Variables

Create a `.env.local` file in your project root with:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## Database Schema Overview

### Core Tables:
- **workspaces**: Main workspace containers
- **workspace_members**: User membership and roles
- **pages**: Web pages being managed
- **tasks**: Individual tasks on pages
- **task_comments**: Comments on tasks
- **workspace_invitations**: Invitation system
- **user_activities**: Activity tracking
- **user_presence**: Real-time user presence

### Key Features:
- ✅ **Row Level Security**: Users only see their data
- ✅ **Real-time subscriptions**: Live updates
- ✅ **Activity tracking**: Automatic logging
- ✅ **Role-based permissions**: Owner/Admin/Member/Viewer
- ✅ **Invitation system**: Secure workspace sharing
- ✅ **Automatic timestamps**: Created/updated tracking

## Next Steps

Once your Supabase project is set up:

1. ✅ **Install Supabase client** in your React app
2. ✅ **Configure authentication** context
3. ✅ **Migrate workspace operations** from Firebase
4. ✅ **Migrate task management** from Firebase
5. ✅ **Deploy to Netlify** with environment variables

## Troubleshooting

### Common Issues:

1. **RLS Policies Not Working**
   - Ensure you're authenticated when testing
   - Check policy conditions match your use case

2. **Functions Not Found**
   - Verify all functions were created successfully
   - Check for syntax errors in the SQL

3. **Authentication Issues**
   - Verify Site URL is correct
   - Check OAuth provider configuration

4. **Real-time Not Working**
   - Ensure RLS policies allow SELECT on tables
   - Check network connectivity

## Support

- 📚 [Supabase Documentation](https://supabase.com/docs)
- 💬 [Supabase Discord](https://discord.supabase.com)
- 🐛 [GitHub Issues](https://github.com/supabase/supabase/issues)

---

**Ready to proceed?** Once your Supabase project is set up, we'll install the Supabase client in your React app!
