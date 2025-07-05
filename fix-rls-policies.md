# Fix RLS Policies - Infinite Recursion Issue

## Problem
The current RLS policies have infinite recursion in the workspace_members table, causing the error:
`"infinite recursion detected in policy for relation \"workspaces\""`

## Solution
Run the fixed RLS policies to resolve the circular dependency.

## Steps to Fix

### 1. Open Supabase SQL Editor
1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"

### 2. Run the Fixed Policies
Copy and paste the entire content of `supabase-rls-policies-fixed.sql` into the SQL editor and run it.

### 3. Verify the Fix
After running the fixed policies, test the application:
1. Refresh your application at `http://localhost:8080`
2. The "Failed to load workspaces" error should be resolved
3. You should be able to create workspaces

## What Was Fixed
- Removed circular dependencies in workspace_members policies
- Simplified the workspace viewing policy to only check ownership directly
- Made workspace_members readable by all authenticated users (filtered by workspace access)
- Maintained security while eliminating recursion

## Alternative Quick Fix (If Above Doesn't Work)
If you want to temporarily disable RLS to test:

```sql
-- Temporarily disable RLS (NOT recommended for production)
ALTER TABLE workspaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members DISABLE ROW LEVEL SECURITY;
```

But it's better to use the fixed policies above for proper security.
