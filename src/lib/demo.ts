/**
 * demo.ts — Fully client-side, in-memory demo mode.
 *
 * When demo mode is active, the entire data layer (auth + store) is served from
 * a seeded in-memory dataset instead of Supabase. This lets anyone explore the
 * product — create/move/edit tasks, comment, manage members — with realistic
 * sample data, even when the database is unreachable or not configured.
 *
 * Mutations mutate the in-memory `db`; React Query invalidation re-runs the
 * read functions so the UI updates exactly like the real backend.
 */
import type {
  Activity,
  Comment,
  Priority,
  Project,
  Role,
  Task,
  TaskStatus,
} from "./types";

// ─── Mode flag ───────────────────────────────────────────────────────────────
const FLAG = "quorum:demo";

export function isDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(FLAG) === "1";
  } catch {
    return false;
  }
}

export function enableDemo() {
  try {
    window.localStorage.setItem(FLAG, "1");
  } catch {
    /* ignore */
  }
  // Fresh dataset every time demo is entered.
  db = null;
}

export function disableDemo() {
  try {
    window.localStorage.removeItem(FLAG);
  } catch {
    /* ignore */
  }
  db = null;
}

// ─── The demo "you" ────────────────────────────────────────────────────────────
export const DEMO_USER = {
  id: "demo-u1",
  email: "demo@quorum.app",
  name: "Aria Chen",
};

// ─── In-memory schema ──────────────────────────────────────────────────────────
interface DemoProfile {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
}
interface DemoMember {
  userId: string;
  projectId: string;
  role: Role;
  joinedAt: string;
}
interface DemoComment extends Comment {}
interface DemoActivity {
  id: string;
  action: string;
  entityType: Activity["entityType"];
  entityId: string;
  projectId: string;
  performedById: string;
  createdAt: string;
}
interface DemoNotification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  taskId?: string;
  createdAt: string;
}

interface DemoDB {
  profiles: DemoProfile[];
  projects: Project[];
  members: DemoMember[];
  tasks: Task[];
  comments: DemoComment[];
  activity: DemoActivity[];
  notifications: DemoNotification[];
}

let db: DemoDB | null = null;
let seq = 1;
const uid = (p: string) => `demo-${p}-${seq++}`;

// ─── Time helpers ───────────────────────────────────────────────────────────────
const DAY = 86_400_000;
const HOUR = 3_600_000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString();
const hoursAgo = (n: number) => new Date(Date.now() - n * HOUR).toISOString();
const daysFromNow = (n: number) => new Date(Date.now() + n * DAY).toISOString();

// ─── Seed data ──────────────────────────────────────────────────────────────────
function seed(): DemoDB {
  const profiles: DemoProfile[] = [
    { id: "demo-u1", name: "Aria Chen", email: "demo@quorum.app" },
    { id: "demo-u2", name: "Marcus Webb", email: "marcus@quorum.app" },
    { id: "demo-u3", name: "Priya Nair", email: "priya@quorum.app" },
    { id: "demo-u4", name: "Diego Santos", email: "diego@quorum.app" },
    { id: "demo-u5", name: "Lena Fischer", email: "lena@quorum.app" },
    { id: "demo-u6", name: "Tom Okafor", email: "tom@quorum.app" },
    { id: "demo-u7", name: "Sara Lindqvist", email: "sara@quorum.app" },
  ];

  const projects: Project[] = [
    {
      id: "demo-p1",
      name: "Mobile App v2.0",
      description: "Ground-up rewrite of the iOS & Android apps with offline support.",
      status: "ACTIVE",
      ownerId: "demo-u1",
      createdAt: daysAgo(62),
    },
    {
      id: "demo-p2",
      name: "Website Redesign",
      description: "New marketing site, design system refresh, and CMS migration.",
      status: "ACTIVE",
      ownerId: "demo-u1",
      createdAt: daysAgo(48),
    },
    {
      id: "demo-p3",
      name: "Payments API",
      description: "Stripe + invoicing integration with webhooks and reconciliation.",
      status: "ACTIVE",
      ownerId: "demo-u3",
      createdAt: daysAgo(40),
    },
    {
      id: "demo-p4",
      name: "Q3 Growth Experiments",
      description: "Onboarding funnel A/B tests, referral loop, and lifecycle emails.",
      status: "ACTIVE",
      ownerId: "demo-u1",
      createdAt: daysAgo(21),
    },
    {
      id: "demo-p5",
      name: "Infra & Reliability",
      description: "Migrate to multi-region, add tracing, and harden CI/CD.",
      status: "ACTIVE",
      ownerId: "demo-u4",
      createdAt: daysAgo(33),
    },
    {
      id: "demo-p6",
      name: "Brand Refresh 2024",
      description: "Logo, palette, and voice & tone guidelines. Shipped last quarter.",
      status: "ARCHIVED",
      ownerId: "demo-u5",
      createdAt: daysAgo(140),
    },
  ];

  // Membership: demo user (u1) is on every active project.
  const M = (
    projectId: string,
    userId: string,
    role: Role,
    joined: number
  ): DemoMember => ({ userId, projectId, role, joinedAt: daysAgo(joined) });

  const members: DemoMember[] = [
    // p1 — Mobile App
    M("demo-p1", "demo-u1", "ADMIN", 62),
    M("demo-p1", "demo-u2", "MEMBER", 60),
    M("demo-p1", "demo-u4", "MEMBER", 55),
    M("demo-p1", "demo-u6", "MEMBER", 30),
    // p2 — Website
    M("demo-p2", "demo-u1", "ADMIN", 48),
    M("demo-p2", "demo-u5", "ADMIN", 48),
    M("demo-p2", "demo-u3", "MEMBER", 45),
    M("demo-p2", "demo-u7", "MEMBER", 20),
    // p3 — Payments API
    M("demo-p3", "demo-u3", "ADMIN", 40),
    M("demo-p3", "demo-u1", "MEMBER", 38),
    M("demo-p3", "demo-u2", "MEMBER", 36),
    M("demo-p3", "demo-u4", "MEMBER", 32),
    // p4 — Growth
    M("demo-p4", "demo-u1", "ADMIN", 21),
    M("demo-p4", "demo-u5", "MEMBER", 21),
    M("demo-p4", "demo-u7", "MEMBER", 18),
    // p5 — Infra
    M("demo-p5", "demo-u4", "ADMIN", 33),
    M("demo-p5", "demo-u1", "MEMBER", 30),
    M("demo-p5", "demo-u6", "MEMBER", 28),
    // p6 — archived
    M("demo-p6", "demo-u5", "ADMIN", 140),
    M("demo-p6", "demo-u1", "MEMBER", 138),
  ];

  // Task blueprints per project: [title, status, priority, assigneeIdx-in-project, dueOffsetDays|null]
  const tasks: Task[] = [];
  let pos = 1;

  function addTasks(
    projectId: string,
    rows: Array<[string, TaskStatus, Priority, string | null, number | null, number]>
  ) {
    for (const [title, status, priority, assigneeId, due, createdDaysAgo] of rows) {
      tasks.push({
        id: uid("t"),
        title,
        description:
          status === "SHIPPED"
            ? "Completed and verified. See the linked PR and QA notes."
            : "Scoped with the team. Acceptance criteria in the description thread.",
        status,
        priority,
        projectId,
        assigneeId: assigneeId ?? undefined,
        createdById: "demo-u1",
        dueDate: due === null ? undefined : due >= 0 ? daysFromNow(due) : daysAgo(-due),
        position: pos++,
        blockedById: undefined,
        createdAt: daysAgo(createdDaysAgo),
        updatedAt: hoursAgo(Math.floor(Math.random() * 72) + 1),
      });
    }
  }

  // p1 — Mobile App v2.0
  addTasks("demo-p1", [
    ["Set up offline-first sync engine", "ACTIVE", "URGENT", "demo-u2", 3, 28],
    ["Design new onboarding flow", "IN_REVIEW", "HIGH", "demo-u6", 1, 25],
    ["Push notification permissions UX", "BACKLOG", "MEDIUM", "demo-u4", 9, 12],
    ["Migrate auth to biometric login", "ACTIVE", "HIGH", "demo-u1", 5, 20],
    ["Fix crash on Android 13 cold start", "ACTIVE", "URGENT", "demo-u2", -1, 6],
    ["Dark mode polish pass", "BACKLOG", "LOW", "demo-u6", 18, 8],
    ["Ship v2.0 beta to TestFlight", "SHIPPED", "HIGH", "demo-u1", -4, 30],
    ["Instrument analytics events", "IN_REVIEW", "MEDIUM", "demo-u4", 2, 14],
    ["Reduce app bundle size below 30MB", "BACKLOG", "MEDIUM", "demo-u2", 14, 10],
    ["Offline conflict resolution rules", "ACTIVE", "HIGH", null, 7, 9],
  ]);

  // p2 — Website Redesign
  addTasks("demo-p2", [
    ["Build new design system tokens", "SHIPPED", "HIGH", "demo-u5", -10, 40],
    ["Homepage hero & above-the-fold", "IN_REVIEW", "HIGH", "demo-u5", 1, 18],
    ["Migrate blog to new CMS", "ACTIVE", "MEDIUM", "demo-u3", 6, 15],
    ["Pricing page with annual toggle", "ACTIVE", "HIGH", "demo-u7", 4, 11],
    ["SEO audit & metadata pass", "BACKLOG", "MEDIUM", "demo-u3", 12, 7],
    ["Accessibility (WCAG AA) review", "BACKLOG", "HIGH", "demo-u7", 20, 5],
    ["Set up preview deploys", "SHIPPED", "MEDIUM", "demo-u1", -6, 22],
    ["Customer logos & social proof", "IN_REVIEW", "LOW", "demo-u5", 0, 4],
  ]);

  // p3 — Payments API
  addTasks("demo-p3", [
    ["Stripe webhook signature verification", "ACTIVE", "URGENT", "demo-u2", 2, 16],
    ["Idempotency keys on charge endpoint", "IN_REVIEW", "HIGH", "demo-u3", 1, 12],
    ["Invoice PDF generation", "BACKLOG", "MEDIUM", "demo-u4", 10, 9],
    ["Nightly reconciliation job", "ACTIVE", "HIGH", "demo-u1", -2, 8],
    ["Refund & partial-refund flow", "BACKLOG", "HIGH", "demo-u2", 15, 6],
    ["PCI compliance checklist", "ACTIVE", "URGENT", "demo-u3", 5, 14],
    ["Sandbox test data seeding", "SHIPPED", "LOW", "demo-u4", -8, 18],
  ]);

  // p4 — Q3 Growth
  addTasks("demo-p4", [
    ["A/B test signup CTA copy", "ACTIVE", "MEDIUM", "demo-u5", 3, 12],
    ["Build referral invite loop", "BACKLOG", "HIGH", "demo-u7", 14, 8],
    ["Lifecycle email: day-3 activation", "IN_REVIEW", "MEDIUM", "demo-u5", 1, 7],
    ["Reduce onboarding steps 5 → 3", "ACTIVE", "HIGH", "demo-u1", 4, 10],
    ["Instrument funnel drop-off events", "BACKLOG", "MEDIUM", "demo-u7", 9, 5],
    ["Win-back campaign for churned users", "BACKLOG", "LOW", null, 21, 3],
  ]);

  // p5 — Infra
  addTasks("demo-p5", [
    ["Multi-region failover for Postgres", "ACTIVE", "URGENT", "demo-u4", 6, 18],
    ["Add distributed tracing (OTel)", "IN_REVIEW", "HIGH", "demo-u6", 2, 14],
    ["Harden CI: required checks + cache", "SHIPPED", "MEDIUM", "demo-u1", -5, 16],
    ["Set up on-call rotation & alerts", "ACTIVE", "HIGH", "demo-u4", 3, 9],
    ["Load test checkout to 10k RPS", "BACKLOG", "MEDIUM", "demo-u6", 12, 6],
    ["Rotate and vault all secrets", "BACKLOG", "URGENT", "demo-u4", 8, 4],
  ]);

  // p6 — archived
  addTasks("demo-p6", [
    ["Finalize logo lockups", "SHIPPED", "HIGH", "demo-u5", -60, 130],
    ["Publish brand guidelines site", "SHIPPED", "MEDIUM", "demo-u1", -55, 120],
  ]);

  // A blocked task for realism (Android crash blocks the beta-style chain)
  const syncTask = tasks.find((t) => t.title.startsWith("Offline conflict"));
  const engineTask = tasks.find((t) => t.title.startsWith("Set up offline-first"));
  if (syncTask && engineTask) syncTask.blockedById = engineTask.id;

  // ─── Comments on a handful of tasks ──────────────────────────────────────────
  const comments: DemoComment[] = [];
  function addComments(taskTitle: string, rows: Array<[string, string, number]>) {
    const t = tasks.find((x) => x.title === taskTitle);
    if (!t) return;
    for (const [authorId, content, hAgo] of rows) {
      comments.push({
        id: uid("c"),
        taskId: t.id,
        authorId,
        content,
        createdAt: hoursAgo(hAgo),
      });
    }
  }
  addComments("Set up offline-first sync engine", [
    ["demo-u2", "Spiked CRDT vs last-write-wins. Leaning CRDT for the notes feature.", 52],
    ["demo-u1", "Agreed — let's keep @Diego Santos in the loop on the schema.", 49],
    ["demo-u4", "I can review the migration tomorrow morning.", 30],
  ]);
  addComments("Fix crash on Android 13 cold start", [
    ["demo-u2", "Repro'd it — null intent extra on resume. Patch incoming.", 20],
    ["demo-u1", "Nice. Can we add a regression test before we ship?", 18],
  ]);
  addComments("Homepage hero & above-the-fold", [
    ["demo-u5", "New hero copy from marketing is in the Figma. @Aria Chen take a look?", 26],
    ["demo-u1", "Looks great. Tighten the subhead and we're good to ship.", 22],
  ]);
  addComments("Stripe webhook signature verification", [
    ["demo-u3", "We were not verifying the timestamp tolerance — fixing.", 40],
  ]);

  // ─── Activity feed ───────────────────────────────────────────────────────────
  const activity: DemoActivity[] = [];
  function act(
    action: string,
    projectId: string,
    entityId: string,
    performedById: string,
    hAgo: number
  ) {
    activity.push({
      id: uid("a"),
      action,
      entityType: "TASK",
      entityId,
      projectId,
      performedById,
      createdAt: hoursAgo(hAgo),
    });
  }
  // Derive activity from notable tasks
  const byTitle = (t: string) => tasks.find((x) => x.title === t);
  act(`moved task to SHIPPED`, "demo-p1", byTitle("Ship v2.0 beta to TestFlight")?.id ?? "", "demo-u1", 5);
  act(`commented on a task`, "demo-p1", byTitle("Fix crash on Android 13 cold start")?.id ?? "", "demo-u2", 20);
  act(`changed status to IN_REVIEW`, "demo-p2", byTitle("Homepage hero & above-the-fold")?.id ?? "", "demo-u5", 24);
  act(`created task "Refund & partial-refund flow"`, "demo-p3", byTitle("Refund & partial-refund flow")?.id ?? "", "demo-u2", 30);
  act(`changed status to ACTIVE`, "demo-p5", byTitle("Multi-region failover for Postgres")?.id ?? "", "demo-u4", 36);
  act(`moved task to SHIPPED`, "demo-p5", byTitle("Harden CI: required checks + cache")?.id ?? "", "demo-u1", 40);
  act(`commented on a task`, "demo-p3", byTitle("Stripe webhook signature verification")?.id ?? "", "demo-u3", 42);
  act(`changed status to IN_REVIEW`, "demo-p4", byTitle("Lifecycle email: day-3 activation")?.id ?? "", "demo-u5", 50);
  act(`created task "Win-back campaign for churned users"`, "demo-p4", byTitle("Win-back campaign for churned users")?.id ?? "", "demo-u1", 60);
  act(`moved task to SHIPPED`, "demo-p2", byTitle("Build new design system tokens")?.id ?? "", "demo-u5", 72);

  // ─── Notifications for the demo user ─────────────────────────────────────────
  const notifications: DemoNotification[] = [
    {
      id: uid("n"),
      userId: "demo-u1",
      message: "Marcus Webb mentioned you in a comment",
      read: false,
      taskId: byTitle("Set up offline-first sync engine")?.id,
      createdAt: hoursAgo(49),
    },
    {
      id: uid("n"),
      userId: "demo-u1",
      message: "Lena Fischer mentioned you in a comment",
      read: false,
      taskId: byTitle("Homepage hero & above-the-fold")?.id,
      createdAt: hoursAgo(26),
    },
    {
      id: uid("n"),
      userId: "demo-u1",
      message: "Diego Santos assigned you to “Nightly reconciliation job”",
      read: false,
      taskId: byTitle("Nightly reconciliation job")?.id,
      createdAt: hoursAgo(8),
    },
    {
      id: uid("n"),
      userId: "demo-u1",
      message: "“Fix crash on Android 13 cold start” is overdue",
      read: true,
      taskId: byTitle("Fix crash on Android 13 cold start")?.id,
      createdAt: hoursAgo(12),
    },
  ];

  return { profiles, projects, members, tasks, comments, activity, notifications };
}

function getDB(): DemoDB {
  if (!db) db = seed();
  return db;
}

// ─── Join helpers ───────────────────────────────────────────────────────────────
function profileOf(id: string) {
  const p = getDB().profiles.find((x) => x.id === id);
  return p ? { id: p.id, name: p.name, email: p.email, avatar_url: p.avatar_url } : null;
}

// ─── Read/write API (shapes match store.tsx hook returns) ────────────────────────
export const demoApi = {
  // Projects ----------------------------------------------------------------
  projects(): Project[] {
    const mine = new Set(
      getDB().members.filter((m) => m.userId === DEMO_USER.id).map((m) => m.projectId)
    );
    return getDB()
      .projects.filter((p) => mine.has(p.id))
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  },
  project(id: string): Project {
    const p = getDB().projects.find((x) => x.id === id);
    if (!p) throw new Error("Project not found");
    return p;
  },
  createProject({ name, description }: { name: string; description: string }): Project {
    const p: Project = {
      id: uid("p"),
      name,
      description,
      status: "ACTIVE",
      ownerId: DEMO_USER.id,
      createdAt: new Date().toISOString(),
    };
    getDB().projects.unshift(p);
    getDB().members.push({
      userId: DEMO_USER.id,
      projectId: p.id,
      role: "ADMIN",
      joinedAt: new Date().toISOString(),
    });
    return p;
  },
  updateProject({ id, patch }: { id: string; patch: Partial<Project> }) {
    const p = getDB().projects.find((x) => x.id === id);
    if (!p) return;
    if (patch.name !== undefined) p.name = patch.name;
    if (patch.description !== undefined) p.description = patch.description;
    if (patch.status !== undefined) p.status = patch.status;
  },

  // Members -----------------------------------------------------------------
  members(projectId: string) {
    return getDB()
      .members.filter((m) => m.projectId === projectId)
      .map((m) => ({
        userId: m.userId,
        projectId: m.projectId,
        role: m.role,
        joinedAt: m.joinedAt,
        profile: profileOf(m.userId),
      }));
  },
  allMembers() {
    return getDB().members.map((m) => ({
      userId: m.userId,
      projectId: m.projectId,
      role: m.role,
      joinedAt: m.joinedAt,
      profile: profileOf(m.userId),
    }));
  },
  myRole(projectId: string): Role | null {
    return (
      getDB().members.find((m) => m.projectId === projectId && m.userId === DEMO_USER.id)
        ?.role ?? null
    );
  },
  addMember({ projectId, email, role }: { projectId: string; email: string; role: Role }) {
    const profile = getDB().profiles.find(
      (p) => p.email.toLowerCase() === email.toLowerCase()
    );
    if (!profile) throw new Error("User not found — they must sign up first.");
    if (getDB().members.some((m) => m.projectId === projectId && m.userId === profile.id))
      throw new Error("Already a member.");
    getDB().members.push({
      userId: profile.id,
      projectId,
      role,
      joinedAt: new Date().toISOString(),
    });
  },
  removeMember({ projectId, userId }: { projectId: string; userId: string }) {
    db = getDB();
    db.members = db.members.filter(
      (m) => !(m.projectId === projectId && m.userId === userId)
    );
  },
  setMemberRole({ projectId, userId, role }: { projectId: string; userId: string; role: Role }) {
    const m = getDB().members.find((x) => x.projectId === projectId && x.userId === userId);
    if (m) m.role = role;
  },

  // Tasks -------------------------------------------------------------------
  tasks(projectId: string): Task[] {
    return getDB()
      .tasks.filter((t) => t.projectId === projectId)
      .sort((a, b) => a.position - b.position);
  },
  allTasks(): Task[] {
    const mine = new Set(
      getDB().members.filter((m) => m.userId === DEMO_USER.id).map((m) => m.projectId)
    );
    return getDB()
      .tasks.filter((t) => mine.has(t.projectId))
      .sort((a, b) => a.position - b.position);
  },
  resolveTaskProjectId(taskId: string): string | null {
    return getDB().tasks.find((t) => t.id === taskId)?.projectId ?? null;
  },
  createTask(data: Partial<Task> & { title: string; projectId: string }): Task {
    const t: Task = {
      id: uid("t"),
      title: data.title,
      description: data.description ?? "",
      status: data.status ?? "BACKLOG",
      priority: data.priority ?? "MEDIUM",
      projectId: data.projectId,
      assigneeId: data.assigneeId,
      createdById: DEMO_USER.id,
      dueDate: data.dueDate,
      position: Date.now(),
      blockedById: data.blockedById,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    getDB().tasks.push(t);
    demoApi._log(`created task "${data.title}"`, data.projectId, t.id);
    return t;
  },
  updateTask({ id, patch, projectId }: { id: string; patch: Partial<Task>; projectId: string }) {
    const t = getDB().tasks.find((x) => x.id === id);
    if (!t) return;
    Object.assign(t, patch);
    t.updatedAt = new Date().toISOString();
    if (patch.status) demoApi._log(`changed status to ${patch.status}`, projectId, id);
  },
  deleteTask({ id }: { id: string; projectId: string }) {
    db = getDB();
    db.tasks = db.tasks.filter((t) => t.id !== id);
  },
  moveTask({ id, status, position, projectId }: { id: string; status: TaskStatus; position: number; projectId: string }) {
    const t = getDB().tasks.find((x) => x.id === id);
    if (!t) return;
    t.status = status;
    t.position = position;
    t.updatedAt = new Date().toISOString();
    demoApi._log(`moved task to ${status}`, projectId, id);
  },

  // Comments ----------------------------------------------------------------
  comments(taskId: string) {
    return getDB()
      .comments.filter((c) => c.taskId === taskId)
      .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))
      .map((c) => ({ ...c, author: profileOf(c.authorId) }));
  },
  addComment({ taskId, content, projectId }: { taskId: string; content: string; projectId: string }) {
    getDB().comments.push({
      id: uid("c"),
      taskId,
      authorId: DEMO_USER.id,
      content,
      createdAt: new Date().toISOString(),
    });
    // Mention notifications
    const mentions = Array.from(content.matchAll(/@([\w ]+?)(?=[,.!?]|$|\s{2,})/g)).map((m) =>
      m[1].trim()
    );
    for (const name of mentions) {
      const prof = getDB().profiles.find(
        (p) => p.name.toLowerCase() === name.toLowerCase()
      );
      if (prof) {
        getDB().notifications.unshift({
          id: uid("n"),
          userId: prof.id,
          message: `${DEMO_USER.name} mentioned you in a comment`,
          read: false,
          taskId,
          createdAt: new Date().toISOString(),
        });
      }
    }
    demoApi._log("commented on a task", projectId, taskId);
  },

  // Activity ----------------------------------------------------------------
  activity(projectId: string) {
    return getDB()
      .activity.filter((a) => a.projectId === projectId)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .slice(0, 50)
      .map((a) => ({ ...a, performer: profileOf(a.performedById) }));
  },
  allActivity() {
    return getDB()
      .activity.slice()
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .slice(0, 100)
      .map((a) => ({ ...a, performer: profileOf(a.performedById) }));
  },
  _log(action: string, projectId: string, entityId: string) {
    getDB().activity.unshift({
      id: uid("a"),
      action,
      entityType: "TASK",
      entityId,
      projectId,
      performedById: DEMO_USER.id,
      createdAt: new Date().toISOString(),
    });
  },

  // Notifications -----------------------------------------------------------
  notifications() {
    return getDB()
      .notifications.filter((n) => n.userId === DEMO_USER.id)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .slice(0, 30);
  },
  markNotificationRead(id: string) {
    const n = getDB().notifications.find((x) => x.id === id);
    if (n) n.read = true;
  },
  markAllNotificationsRead() {
    getDB()
      .notifications.filter((n) => n.userId === DEMO_USER.id)
      .forEach((n) => (n.read = true));
  },
};
