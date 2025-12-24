# EasTask - Complete Database Setup Guide

## 📋 Overview

This document explains the complete database setup required for all features to work properly.

---

## 🗄️ SQL Files to Run (In Order)

Run these SQL files in Supabase SQL Editor in the following order:

### 1. `supabase-schema.sql` - Core Tables
Creates the main tables:
- `workspaces` - Team workspaces
- `workspace_members` - Workspace membership
- `pages` - Website/page tracking
- `tasks` - Task management
- `task_comments` - Basic comments (enhanced later)
- `workspace_invitations` - Invite system
- `user_activities` - Activity logging
- `user_presence` - Real-time presence
- `file_attachments` - File uploads

### 2. `supabase-complete-setup.sql` - Advanced Features
Creates additional tables:
- `user_profiles` - Extended user profile info
- `user_settings` - User preferences
- `user_statistics` - User stats tracking
- `user_activity` - Detailed activity log
- `task_time_entries` - Time tracking
- `task_dependencies` - Task relationships
- `subtasks` - Task breakdown
- `notifications` - User notifications

Includes:
- RLS policies for all tables
- Automatic triggers for user creation
- Helper functions

### 3. `supabase-functions-triggers.sql` - Triggers
Creates database triggers for:
- Auto-updating `updated_at` timestamps
- Adding workspace owner as member
- Setting task `completed_at` on completion
- Activity tracking for various operations

### 4. `supabase-migration.sql` - Enhancements
Adds:
- Missing columns to `task_comments` (threading, edit flag)
- `log_user_activity` RPC function
- Additional RLS policies for core tables

---

## ✅ Feature-to-Table Mapping

| Feature | Required Tables | Status |
|---------|----------------|--------|
| **Drag & Drop Tasks** | `tasks`, `pages`, `workspaces` | ✅ Core |
| **Time Tracking** | `task_time_entries` | 📦 Complete Setup |
| **Subtask Management** | `subtasks` | 📦 Complete Setup |
| **Task Comments** | `task_comments` + migration | 🔄 Migration |
| **Task Dependencies** | `task_dependencies` | 📦 Complete Setup |
| **File Attachments** | `file_attachments` | ✅ Core |
| **User Settings** | `user_settings` | 📦 Complete Setup |
| **User Profiles** | `user_profiles` | 📦 Complete Setup |
| **Notifications** | `notifications` | 📦 Complete Setup |

---

## 🏗️ Table Structures

### task_time_entries
```sql
- id: UUID (PK)
- task_id: UUID (FK -> tasks)
- user_id: UUID (FK -> auth.users)
- workspace_id: UUID (FK -> workspaces)
- description: TEXT
- start_time: TIMESTAMPTZ
- end_time: TIMESTAMPTZ
- duration_minutes: INTEGER
- is_manual: BOOLEAN
- created_at, updated_at: TIMESTAMPTZ
```

### subtasks
```sql
- id: UUID (PK)
- parent_task_id: UUID (FK -> tasks)  ⚠️ Note: NOT task_id
- title: TEXT
- description: TEXT
- status: ENUM ('todo', 'progress', 'done')
- assigned_to: UUID (FK -> auth.users)
- created_by: UUID (FK -> auth.users)
- due_date: TIMESTAMPTZ
- completed_at: TIMESTAMPTZ
- order_index: INTEGER
- created_at, updated_at: TIMESTAMPTZ
```

### task_dependencies
```sql
- id: UUID (PK)
- task_id: UUID (FK -> tasks)
- depends_on_task_id: UUID (FK -> tasks)
- dependency_type: ENUM ('blocks', 'blocked_by', 'relates_to')
- created_by: UUID (FK -> auth.users)
- created_at: TIMESTAMPTZ
```

### task_comments (with migration)
```sql
- id: UUID (PK)
- task_id: UUID (FK -> tasks)
- user_id: UUID (FK -> auth.users)
- content: TEXT
- parent_comment_id: UUID (FK -> task_comments) -- For threading
- is_edited: BOOLEAN -- Edit flag
- created_at, updated_at: TIMESTAMPTZ
```

### notifications
```sql
- id: UUID (PK)
- user_id: UUID (FK -> auth.users)
- workspace_id: UUID (FK -> workspaces)
- type: ENUM (invitation, task_assignment, etc.)
- title: TEXT
- message: TEXT
- data: JSONB
- read: BOOLEAN
- action_url: TEXT
- created_at: TIMESTAMPTZ
```

---

## 🔧 Quick Setup Commands

Run these in Supabase SQL Editor:

```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'workspaces', 'workspace_members', 'pages', 'tasks',
  'task_comments', 'task_time_entries', 'task_dependencies',
  'subtasks', 'notifications', 'user_profiles', 'user_settings',
  'user_statistics', 'user_activity', 'file_attachments'
);

-- Check for missing columns
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'task_comments';
```

---

## 🚨 Troubleshooting

### "Table does not exist" error
Run the appropriate SQL file from this guide.

### "Column does not exist" error
Run `supabase-migration.sql` to add missing columns.

### "RLS policy" error
Check that RLS is enabled and policies exist for the table.

### "Email not confirmed" error
Disable email confirmation in Supabase Dashboard or run:
```sql
UPDATE auth.users SET email_confirmed_at = NOW() WHERE email_confirmed_at IS NULL;
```

---

## 📁 SQL Files Location

All SQL files are in the project root:
- `supabase-schema.sql`
- `supabase-complete-setup.sql`
- `supabase-functions-triggers.sql`
- `supabase-migration.sql`
- `supabase-notifications-table.sql`
