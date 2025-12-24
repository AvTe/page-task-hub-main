# EasTask - Collaborative Task Management Platform

<div align="center">
  <img src="public/logo.svg" alt="EasTask Logo" width="120" height="120">
  
  **A modern, workspace-based task management platform for teams**
  
  [![React](https://img.shields.io/badge/React-18.3-blue.svg)](https://reactjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)
  [![Supabase](https://img.shields.io/badge/Supabase-Backend-green.svg)](https://supabase.com/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-blue.svg)](https://tailwindcss.com/)
</div>

---

## 🎯 Overview

**EasTask** is a collaborative task management platform where teams can organize work within **workspaces**. Each workspace acts as a container for team members, pages (websites/projects), and tasks.

### Core Concept: Workspaces

```
┌─────────────────────────────────────────────────────────┐
│                    WORKSPACE                             │
│  (Your team's central hub for collaboration)            │
├─────────────────────────────────────────────────────────┤
│                                                          │
│   👥 Team Members                                        │
│   ├── Owner (full control)                               │
│   ├── Admins (manage members & settings)                 │
│   └── Members (create & manage their tasks)              │
│                                                          │
│   📄 Pages (Websites/Projects)                           │
│   ├── Each page can have multiple tasks                  │
│   └── Tasks can be assigned to any team member           │
│                                                          │
│   ✅ Tasks                                               │
│   ├── Assigned to team members                           │
│   ├── Priority levels (Low → Urgent)                     │
│   ├── Status tracking (Todo → In Progress → Done)        │
│   ├── Due dates & comments                               │
│   └── File attachments                                   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## ✨ Key Features

### 🏢 Workspace Management
- **Create unlimited workspaces** for different teams or projects
- **Invite team members** via email or shareable invite link
- **Role-based access control**: Owner, Admin, Member, Viewer
- **Workspace settings**: Name, description, and visibility options

### 👥 Team Collaboration
- **Invite members** by email with role selection
- **Join via invite code** - Share a link and team members can join instantly
- **Real-time presence** - See who's online in your workspace
- **Activity tracking** - Track all changes and updates

### ✅ Task Management
- **Create tasks** with title, description, priority, and due date
- **Assign tasks** to any workspace member
- **Multiple statuses**: Pending, In Progress, Completed, Cancelled
- **Priority levels**: Low, Medium, High, Urgent
- **Subtasks** for breaking down complex work
- **Comments** for team discussion on tasks
- **File attachments** - Attach documents and images to tasks

### 📄 Page/Project Management
- **Create pages** to organize related tasks
- **Link external websites** to track web projects
- **Group tasks by page** for better organization

### 📊 Analytics & Insights
- **Dashboard overview** with task statistics
- **Task completion metrics**
- **Team productivity insights**

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Supabase account (for backend)

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd page-task-hub-main

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Start development server
npm run dev
```

### Environment Variables

Create a `.env.local` file with your Supabase credentials:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## 🗄️ Database Setup

### 1. Create Tables
Run the following SQL scripts in your Supabase SQL Editor (in order):

1. **`supabase-schema.sql`** - Creates all database tables
2. **`FIX_INFINITE_RECURSION.sql`** - Sets up RLS policies with helper functions

### 2. Tables Overview

| Table | Purpose |
|-------|---------|
| `workspaces` | Stores workspace info (name, description, owner) |
| `workspace_members` | Links users to workspaces with roles |
| `pages` | Stores website/project pages within workspaces |
| `tasks` | All tasks with assignments, due dates, etc. |
| `task_comments` | Comments on tasks |
| `workspace_invitations` | Pending invitations to workspaces |
| `user_activities` | Activity log for tracking changes |
| `user_presence` | Real-time online status |
| `file_attachments` | Files attached to tasks |

---

## 📱 User Flow

### 1. First-Time User
```
Sign Up → Create Your First Workspace → Invite Team Members → Add Pages → Create Tasks
```

### 2. Joining a Team
```
Receive Invite Link → Click Link → Sign Up/Login → Automatically Joined to Workspace
```

### 3. Daily Workflow
```
Login → Select Workspace → View Dashboard → Manage Tasks → Collaborate with Team
```

---

## 🏗️ Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── ui/              # shadcn/ui components
│   ├── routes/          # Lazy-loaded route components
│   └── suspense/        # Loading wrappers
├── contexts/            # React Context providers
│   ├── SupabaseAuthContext.tsx      # Authentication
│   ├── SupabaseWorkspaceContext.tsx # Workspace management
│   ├── TaskContext.tsx              # Task state
│   └── NotificationContext.tsx      # Notifications
├── hooks/               # Custom React hooks
├── pages/               # Page components
│   ├── Landing.tsx      # Login/Signup page
│   ├── Home.tsx         # Dashboard
│   ├── Tasker.tsx       # Task management
│   ├── Team.tsx         # Team management
│   └── WorkspaceManagement.tsx  # Workspace settings
├── services/            # API and external services
├── types/               # TypeScript type definitions
└── utils/               # Utility functions
```

---

## 🔐 Role Permissions

| Action | Owner | Admin | Member | Viewer |
|--------|:-----:|:-----:|:------:|:------:|
| View workspace | ✅ | ✅ | ✅ | ✅ |
| Edit workspace settings | ✅ | ✅ | ❌ | ❌ |
| Delete workspace | ✅ | ❌ | ❌ | ❌ |
| Invite members | ✅ | ✅ | ❌ | ❌ |
| Remove members | ✅ | ✅ | ❌ | ❌ |
| Create pages | ✅ | ✅ | ✅ | ❌ |
| Create tasks | ✅ | ✅ | ✅ | ❌ |
| Assign tasks | ✅ | ✅ | ✅ | ❌ |
| Update own tasks | ✅ | ✅ | ✅ | ❌ |
| Delete any task | ✅ | ✅ | ❌ | ❌ |

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| **Frontend** | React 18, TypeScript |
| **Styling** | Tailwind CSS, shadcn/ui |
| **State Management** | React Context, TanStack Query |
| **Backend** | Supabase (PostgreSQL + Auth + Realtime) |
| **Build Tool** | Vite |
| **Routing** | React Router v6 |

---

## 📝 Available Scripts

```bash
# Development
npm run dev          # Start dev server at http://localhost:8080

# Build
npm run build        # Production build
npm run preview      # Preview production build

# Linting
npm run lint         # Run ESLint
```

---

## 🐛 Troubleshooting

### "Infinite recursion detected in policy"
This error occurs when RLS policies reference themselves. Run `FIX_INFINITE_RECURSION.sql` in Supabase SQL Editor to fix it.

### Workspace not loading
1. Check Supabase credentials in `.env.local`
2. Ensure database tables exist (run schema SQL)
3. Verify RLS policies are set up correctly

### Tasks not showing
1. Make sure you're viewing the correct workspace
2. Check if tasks exist in the database
3. Verify you have proper workspace membership

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <strong>Built with ❤️ for productive teams</strong>
</div>
