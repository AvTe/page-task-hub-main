# SQL Database Scripts

This folder contains all SQL scripts for setting up and managing the Supabase database for EasTask.

## 🚀 Recommended Setup Order

If setting up a fresh database, run these scripts in order:

1. **`supabase-schema.sql`** - Creates the base database schema (tables, columns, indexes)
2. **`supabase-functions-triggers.sql`** - Creates database functions and triggers
3. **`FIX_WORKSPACE_VISIBILITY_V2.sql`** - **RECOMMENDED** - Sets up proper RLS policies for workspace isolation

## 📁 File Categories

### Core Schema Files
| File | Description |
|------|-------------|
| `supabase-schema.sql` | Base database schema - creates all tables |
| `supabase-migration.sql` | Database migrations |
| `supabase-complete-setup.sql` | Complete database setup in one file |
| `CREATE_USERS_TABLE.sql` | Creates the public.users table |

### RLS (Row Level Security) Policies
| File | Description | Status |
|------|-------------|--------|
| `FIX_WORKSPACE_VISIBILITY_V2.sql` | **RECOMMENDED** - Non-recursive RLS policies | ✅ Use this |
| `PROPER_RLS_FIX.sql` | Production-ready RLS policies | ✅ Alternative |
| `supabase-rls-policies.sql` | Basic RLS policies | ⚠️ May have recursion |
| `supabase-rls-policies-fixed.sql` | Fixed RLS policies | ⚠️ Older version |
| `supabase-fix-rls.sql` | RLS fix script | ⚠️ Older version |

### Fix Scripts (Troubleshooting)
| File | Description |
|------|-------------|
| `FIX_INFINITE_RECURSION.sql` | Fixes infinite recursion in RLS policies |
| `FIX_USERS_PERMISSION.sql` | Fixes user table permissions |
| `FIX_USERS_NOW.sql` | Quick fix for users table |
| `FIX_WORKSPACE_VISIBILITY.sql` | Older version of workspace visibility fix |
| `DROP_BAD_TRIGGERS.sql` | Removes problematic triggers |
| `DISABLE_RLS.sql` | ⚠️ **DEV ONLY** - Disables RLS for debugging |

### Feature-Specific Scripts
| File | Description |
|------|-------------|
| `ENABLE_ADVANCED_FEATURES.sql` | Enables time tracking, subtasks, comments, dependencies |
| `supabase-fix-subtasks.sql` | Fix for subtasks functionality |
| `supabase-notifications-table.sql` | Creates notifications table |
| `supabase-functions-triggers.sql` | Database functions and triggers |

### Legacy/Archive Scripts
| File | Description |
|------|-------------|
| `COMPLETE_DATABASE_FIX.sql` | Complete fix from previous issues |
| `FINAL_FIX.sql` | Final fix attempt |
| `SIMPLE_FIX.sql` | Simple fix attempt |
| `NUCLEAR_FIX.sql` | Complete reset/fix |

## ⚡ Quick Commands

### Fresh Setup
```sql
-- Run in Supabase SQL Editor in this order:
-- 1. supabase-schema.sql
-- 2. supabase-functions-triggers.sql  
-- 3. FIX_WORKSPACE_VISIBILITY_V2.sql
```

### Fix Workspace Visibility Issues
```sql
-- Run this single file to fix all workspace RLS issues:
-- FIX_WORKSPACE_VISIBILITY_V2.sql
```

### Enable Advanced Features
```sql
-- Run this to enable time tracking, subtasks, comments:
-- ENABLE_ADVANCED_FEATURES.sql
```

## ⚠️ Important Notes

1. **Always backup your data** before running any SQL scripts
2. **RLS must be enabled** in production for security
3. Use `FIX_WORKSPACE_VISIBILITY_V2.sql` as the primary RLS solution - it uses SECURITY DEFINER functions to avoid infinite recursion
4. Never run `DISABLE_RLS.sql` in production environments
