# EasTask - Project Overview

A professional task management and collaboration platform built with modern web technologies.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18 + TypeScript + Vite |
| **UI Framework** | TailwindCSS + shadcn/ui |
| **Backend** | Supabase (PostgreSQL + Auth + Realtime) |
| **State Management** | React Context + TanStack Query |
| **Routing** | React Router v6 |

---

## 📁 Project Structure

```
page-task-hub-main/
├── src/
│   ├── components/          # Reusable UI components (50+ files)
│   │   ├── ui/              # shadcn/ui base components
│   │   ├── routes/          # Lazy-loaded route components
│   │   ├── suspense/        # Loading wrappers
│   │   └── loading/         # Loading skeleton components
│   ├── contexts/            # React Context providers
│   │   ├── SupabaseAuthContext.tsx      # Authentication
│   │   ├── SupabaseWorkspaceContext.tsx # Workspace management
│   │   ├── TaskContext.tsx              # Task state
│   │   ├── NotificationContext.tsx      # Notifications
│   │   ├── SearchContext.tsx            # Global search
│   │   └── ThemeContext.tsx             # Dark/light mode
│   ├── pages/               # Page components (17 files)
│   ├── hooks/               # Custom React hooks
│   ├── services/            # Business logic services
│   ├── lib/                 # Utility libraries
│   ├── types/               # TypeScript definitions
│   └── utils/               # Helper functions
├── sql/                     # Database scripts (24 files)
├── public/                  # Static assets
└── supabase/                # Supabase configuration
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         App.tsx                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                   Context Providers                      ││
│  │  AuthProvider → WorkspaceProvider → TaskProvider        ││
│  │  NotificationProvider → SearchProvider → ThemeProvider  ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      React Router                            │
│  Public: /login, /landing, /reset-password, /join/:code    │
│  Protected: /, /tasker, /team, /calendar, /analytics        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   Supabase Database                          │
│  Tables: users, workspaces, workspace_members, tasks,       │
│  pages, task_comments, subtasks, notifications              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 Authentication

**Provider**: Supabase Auth  
**File**: `src/contexts/SupabaseAuthContext.tsx`

### Supported Methods
- Google OAuth
- GitHub OAuth  
- Email/Password
- Password Reset

### Flow
1. User visits `/login` or `/landing`
2. Selects authentication method
3. Supabase handles OAuth/credentials
4. On success → redirected to Home (`/`)
5. `ProtectedRoute` guards all authenticated pages

---

## 🏢 Workspace System

**File**: `src/contexts/SupabaseWorkspaceContext.tsx`

### Data Hierarchy
```
User
  └── Workspaces (owned or member of)
        └── Pages/Projects
              └── Tasks
                    ├── Subtasks
                    ├── Comments
                    └── Time Entries
```

### Key Functions
| Function | Description |
|----------|-------------|
| `createWorkspace()` | Creates new workspace, auto-adds owner as member |
| `loadUserWorkspaces()` | Fetches only workspaces user owns or is member of |
| `switchWorkspace()` | Changes active workspace context |
| `inviteMember()` | Sends email invitation to join workspace |
| `joinWorkspaceByCode()` | Allows joining via invite link |
| `removeMember()` | Removes user from workspace |

### Row Level Security (RLS)
- Users only see workspaces they own or are members of
- Tasks/pages visible only to workspace members
- Policies enforced at database level

---

## ✅ Task Management

**Files**: `src/contexts/TaskContext.tsx`, `src/pages/Tasker.tsx`

### Task Views
| View | Component | Description |
|------|-----------|-------------|
| Board | `TaskBoard.tsx` | Kanban-style columns (Todo, In Progress, Done) |
| List | `TaskListView.tsx` | Sortable table view |
| Calendar | `TaskCalendarView.tsx` | Monthly calendar with due dates |

### Task Properties
- Title, Description
- Status (todo, progress, done)
- Priority (low, medium, high, urgent)
- Due Date
- Assignee
- Tags
- Custom Fields

### Advanced Features
| Feature | Component | Description |
|---------|-----------|-------------|
| Subtasks | `SubtaskManager.tsx` | Nested checklist items with progress |
| Time Tracking | `TimeTracker.tsx` | Start/stop timer, manual time entry |
| Comments | `TaskComments.tsx` | Threaded discussions, @mentions, reactions |
| Dependencies | `TaskDependencyManager.tsx` | Block/blocked-by relationships |
| Attachments | `FileAttachmentManager.tsx` | File upload with preview |

---

## 📱 Pages

| Page | Route | File | Purpose |
|------|-------|------|---------|
| Landing | `/login` | `Landing.tsx` | Authentication UI |
| Home | `/` | `Home.tsx` | Dashboard with stats and quick actions |
| Tasker | `/tasker` | `Tasker.tsx` | Main task management interface |
| Websites | `/websites` | `Websites.tsx` | Project/page management |
| Team | `/team` | `Team.tsx` | Team member management |
| Calendar | `/calendar` | `Calendar.tsx` | Calendar view of tasks |
| Analytics | `/analytics` | `Analytics.tsx` | Charts and productivity metrics |
| Profile | `/profile` | `Profile.tsx` | User profile settings |
| Settings | `/settings` | `Settings.tsx` | App preferences |
| Workspace Management | `/workspace-management` | `WorkspaceManagement.tsx` | Full workspace admin |
| Join Workspace | `/join/:code` | `JoinWorkspace.tsx` | Handle invite links |

---

## 🗄️ Database Schema

### Core Tables
| Table | Description |
|-------|-------------|
| `users` | User profiles (synced from auth.users) |
| `workspaces` | Workspace definitions |
| `workspace_members` | User-workspace relationships with roles |
| `pages` | Projects/websites within workspaces |
| `tasks` | Individual task items |

### Feature Tables
| Table | Description |
|-------|-------------|
| `subtasks` | Nested task items |
| `task_comments` | Discussion threads on tasks |
| `task_time_entries` | Time tracking records |
| `task_dependencies` | Task blocking relationships |
| `notifications` | In-app notification storage |
| `user_presence` | Real-time online status |
| `workspace_invitations` | Pending invitations |

### User Roles
| Role | Permissions |
|------|-------------|
| `owner` | Full control, can delete workspace |
| `admin` | Manage members, edit settings |
| `member` | Create/edit tasks and pages |
| `guest` | View only (limited) |

---

## 🔄 State Management

### Context Providers
```
QueryClientProvider (TanStack Query - caching)
  └── ThemeProvider (dark/light mode)
        └── SupabaseAuthProvider (user authentication)
              └── NotificationProvider (in-app alerts)
                    └── SupabaseWorkspaceProvider (workspaces)
                          └── TaskProvider (tasks/pages)
                                └── SearchProvider (global search)
```

### Caching Strategy
- **TanStack Query** for server state caching
- Automatic background refetching
- Optimistic updates for better UX
- Cache invalidation on mutations

---

## 🔒 Security

### Row Level Security (RLS)
All tables have RLS enabled with policies:

```sql
-- Users see only their workspaces
CREATE POLICY "workspaces_select_policy" ON workspaces
FOR SELECT USING (
    owner_id = auth.uid()
    OR id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
);

-- Tasks visible only to workspace members  
CREATE POLICY "tasks_select_policy" ON tasks
FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
);
```

### Security Functions
- `get_user_workspace_ids()` - Returns user's workspace IDs (SECURITY DEFINER)
- `is_workspace_member()` - Checks membership
- `is_workspace_owner()` - Checks ownership

---

## 🎨 UI Components

### Key Components
| Component | Purpose |
|-----------|---------|
| `ModernLayout.tsx` | Main page layout wrapper |
| `ModernSidebar.tsx` | Navigation sidebar |
| `ModernHeader.tsx` | Top header with search |
| `TaskCard.tsx` | Individual task display |
| `TaskViews.tsx` | View switcher (Board/List/Calendar) |
| `WorkspaceSelector.tsx` | Workspace dropdown |
| `GlobalSearchModal.tsx` | Cmd+K search interface |
| `NotificationCenter.tsx` | Notification panel |

### UI Library
- **shadcn/ui** components in `src/components/ui/`
- Customized with TailwindCSS
- Dark mode support via ThemeContext

---

## ⚡ Performance Optimizations

1. **Lazy Loading** - Pages loaded on-demand via React.lazy()
2. **Code Splitting** - Separate chunks for each route
3. **Query Caching** - TanStack Query with configurable stale times
4. **Suspense Boundaries** - Loading states for async components
5. **Preloading** - Critical components preloaded on app start

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or bun
- Supabase account

### Installation
```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Add your Supabase credentials to .env.local
# VITE_SUPABASE_URL=your_url
# VITE_SUPABASE_ANON_KEY=your_key

# Run development server
npm run dev
```

### Database Setup
1. Create Supabase project
2. Run `sql/supabase-schema.sql` for base tables
3. Run `sql/FIX_WORKSPACE_VISIBILITY_V2.sql` for RLS policies
4. Optionally run `sql/ENABLE_ADVANCED_FEATURES.sql` for extra features

---

## 📝 Key Files Reference

| File | Purpose |
|------|---------|
| `src/App.tsx` | Main app with providers and routing |
| `src/lib/supabase.ts` | Supabase client configuration |
| `src/lib/queryClient.ts` | TanStack Query setup |
| `src/contexts/SupabaseAuthContext.tsx` | Authentication logic |
| `src/contexts/SupabaseWorkspaceContext.tsx` | Workspace management |
| `src/contexts/TaskContext.tsx` | Task CRUD operations |
| `sql/FIX_WORKSPACE_VISIBILITY_V2.sql` | Recommended RLS setup |

---

## 🐛 Common Issues

| Issue | Solution |
|-------|----------|
| 500 errors on workspace queries | Run `sql/FIX_WORKSPACE_VISIBILITY_V2.sql` |
| Users see all workspaces | RLS policies not applied - run SQL fix |
| User presence errors | Add policies for `user_presence` table |
| Authentication failures | Check Supabase credentials in `.env.local` |

---

*Last updated: December 2024*
