# Quorum

**Quorum** is a production-ready project management platform built for modern engineering teams. Ship projects, track tasks, and keep your team in sync — all in one place.

> **Live Demo:** [quorum.online-production.up.railway.app](https://quorum.online-production.up.railway.app) &nbsp;|&nbsp; **Demo login:** `demo@quorum.app` / `demo1234`

---

## Features

### Core (Assignment Requirements)
- **Auth** — Signup / Login with JWT-based authentication via Supabase
- **RBAC** — Admin and Member roles enforced at both UI and database (RLS) levels
- **Projects** — Create projects, invite team members, manage roles
- **Tasks** — Create, assign, and track tasks with full status lifecycle
- **Dashboard** — At-a-glance view of tasks, statuses, and overdue items
- **REST APIs + PostgreSQL** — Supabase backend with Row Level Security
- **Deployed live** — Hosted on Railway

### Standout Features
| Feature | Details |
|---|---|
| **Kanban Board** | Drag-and-drop columns: Backlog / Active / In Review / Shipped (dnd-kit) |
| **List View** | Sortable table with column headers, priority, status, due date |
| **Task Detail Modal** | Inline editing — no page navigation required |
| **Task Filters** | Filter by assignee, priority, and status |
| **Search** | Search tasks by title in real time |
| **Activity Log** | Per-project audit trail of all actions |
| **Analytics Tab** | Admin-only: tasks per member, status distribution, priority breakdown (Recharts) |
| **Workload View** | Visual indicator of who is overloaded |
| **Real-time Updates** | Board and notifications sync live via Supabase Realtime (no refresh needed) |
| **Deadline Badges** | Due Soon (amber) / Overdue (red), auto-flagged via pg_cron |
| **Task Dependencies** | Block a task on another — cannot ship until blocker is resolved |
| **Quick Add** | Keyboard shortcut `N` to create a task from anywhere |
| **CSV Export** | Export all tasks for a project (Admin only) |
| **Demo Mode** | One-click demo login with pre-seeded realistic team data |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TanStack Router, TanStack Start (SSR) |
| **Styling** | Tailwind CSS v4 |
| **State / Data** | TanStack React Query |
| **Drag and Drop** | dnd-kit |
| **Charts** | Recharts |
| **Backend / DB** | Supabase (PostgreSQL + RLS + Realtime + Auth) |
| **Scheduled Jobs** | pg_cron (overdue task flagging) |
| **Hosting** | Railway (Node.js SSR server) |

---

## Getting Started

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project

### 1. Clone and install

```bash
git clone https://github.com/Dheeraj-Reddy-07/Quorum.git
cd Quorum
npm install
```

### 2. Set up environment

Create a `.env` file in the root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Set up the database

In your Supabase project → **SQL Editor**, run (in order):

1. **`supabase_master_setup.sql`** — Tables, RLS policies, security definer functions, Realtime, and auto-profile trigger
2. **`supabase_seed.sql`** *(optional)* — Seeds demo team data for the Try Demo button

### 4. Disable email confirmation

Supabase Dashboard → **Authentication → Email** → turn off **Confirm email**.

### 5. Run locally

```bash
npm run dev
```

App runs at `http://localhost:5173`

---

## Project Structure

```
src/
├── lib/
│   ├── auth.tsx        # AuthProvider, signIn/signUp/signOut
│   ├── store.tsx       # All React Query hooks (data layer)
│   ├── realtime.tsx    # Supabase Realtime subscription hooks
│   ├── supabase.ts     # Supabase client singleton
│   └── types.ts        # Shared TypeScript types
├── routes/
│   ├── app.tsx                              # App shell + sidebar
│   ├── app.index.tsx                        # Dashboard
│   ├── app.projects.$projectId.index.tsx    # Kanban board
│   ├── app.projects.$projectId.list.tsx     # List view
│   ├── app.projects.$projectId.analytics.tsx # Analytics (Admin)
│   ├── app.projects.$projectId.members.tsx  # Members management
│   └── app.projects.$projectId.activity.tsx # Activity log
├── components/
│   ├── task-modal.tsx   # Task detail + inline edit modal
│   ├── task-card.tsx    # Kanban card
│   ├── filter-bar.tsx   # Filter / search bar
│   └── quick-add.tsx    # Quick-add shortcut modal
supabase_master_setup.sql   # Full DB schema + RLS + functions
supabase_seed.sql           # Demo data seed
railway.json                # Railway deployment config
DEPLOY.md                   # Step-by-step Railway deploy guide
```

---

## Deploying to Railway

See **[DEPLOY.md](./DEPLOY.md)** for the full step-by-step guide.

**Quick summary:**
1. Push to GitHub
2. Connect repo to [Railway](https://railway.app)
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as Railway environment variables
4. Railway builds with `npm run build` and starts with `npm start`
5. Update Supabase **Site URL** to your Railway domain

---

## RBAC — Role-Based Access Control

Roles are per-project (`ADMIN` or `MEMBER`), enforced at the database level via Supabase RLS policies.

| Action | ADMIN | MEMBER |
|---|---|---|
| View tasks and board | ✅ | ✅ |
| Create / edit tasks | ✅ | ✅ |
| Delete tasks | ✅ | ❌ |
| Invite / remove members | ✅ | ❌ |
| Change member roles | ✅ | ❌ |
| View Analytics tab | ✅ | ❌ |
| Export CSV | ✅ | ❌ |

---

## Demo

Click **"Try Demo"** on the login page to explore with a pre-seeded team workspace:

- **5 team members** across two projects
- **35 tasks** spread across all statuses and priorities
- **Full analytics** data visible on the Analytics tab
- **Activity log** with 30 days of history

---

## License

MIT
