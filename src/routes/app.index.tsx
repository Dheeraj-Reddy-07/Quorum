import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useProjects, useAllTasks, useAllMembers, useAllActivity, formatRelative, dueLabel } from "@/lib/store";
import { Avatar } from "@/components/avatar";
import { PriorityBadge, StatusBadge, DueBadge } from "@/components/badges";
import { ArrowRight, CheckCircle2, Clock, Folder, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/app/")({ component: DashboardHome });

function DashboardHome() {
  const { user, profile } = useAuth();
  const { data: projects = [] } = useProjects();
  const { data: allTasks = [] } = useAllTasks();
  const { data: allActivity = [] } = useAllActivity();

  if (!user) return null;

  const myTasks = allTasks.filter((t) => t.assigneeId === user.id);
  const open = myTasks.filter((t) => t.status !== "SHIPPED");
  const dueToday = open.filter((t) => t.dueDate && new Date(t.dueDate).toDateString() === new Date().toDateString());
  const overdue = open.filter((t) => t.dueDate && new Date(t.dueDate) < new Date());
  const myProjectIds = new Set(projects.map((p) => p.id));
  const recent = allActivity.filter((a) => myProjectIds.has(a.projectId)).slice(0, 8);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Dashboard</p>
        <h1 className="mt-1 text-2xl font-semibold">
          Welcome back, {(profile?.name ?? user.email ?? "").split(" ")[0]}.
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Here's what's on your plate today.</p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="My open tasks" value={open.length} icon={Clock} tone="primary" />
        <Stat label="Due today" value={dueToday.length} icon={AlertTriangle} tone="warning" />
        <Stat label="Overdue" value={overdue.length} icon={AlertTriangle} tone="danger" />
        <Stat label="My projects" value={projects.length} icon={Folder} tone="muted" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2 rounded-xl border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <h2 className="text-sm font-semibold">My tasks</h2>
            <span className="text-xs text-muted-foreground">{open.length} open</span>
          </div>
          {open.length === 0 ? (
            <Empty icon={CheckCircle2} title="Inbox zero." desc="No open tasks assigned to you. Press N to create one." />
          ) : (
            <ul className="divide-y divide-border">
              {open
                .sort((a, b) => (a.dueDate ?? "z").localeCompare(b.dueDate ?? "z"))
                .slice(0, 8)
                .map((t) => {
                  const proj = projects.find((p) => p.id === t.projectId);
                  const due = dueLabel(t.dueDate);
                  return (
                    <li key={t.id} className="flex items-center gap-3 px-5 py-3 hover:bg-accent/50">
                      <PriorityBadge priority={t.priority} />
                      <Link
                        to="/app/projects/$projectId"
                        params={{ projectId: t.projectId }}
                        className="flex-1 truncate text-sm hover:text-primary"
                      >
                        {t.title}
                      </Link>
                      <span className="hidden md:inline text-xs text-muted-foreground">{proj?.name}</span>
                      <StatusBadge status={t.status} />
                      {due && <DueBadge tone={due.tone} text={due.text} />}
                    </li>
                  );
                })}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-border bg-surface">
          <div className="border-b border-border px-5 py-3">
            <h2 className="text-sm font-semibold">Recent activity</h2>
          </div>
          {recent.length === 0 ? (
            <Empty icon={Clock} title="Nothing yet" desc="Activity from your projects will show here." />
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((a) => (
                <li key={a.id} className="flex items-start gap-3 px-5 py-3 text-sm">
                  <Avatar name={a.performer?.name} size={24} />
                  <div className="flex-1">
                    <p className="text-foreground">
                      <span className="font-medium">{a.performer?.name ?? "Someone"}</span>{" "}
                      <span className="text-muted-foreground">{a.action}</span>
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{formatRelative(a.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">My projects</h2>
          <Link to="/app/projects" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
            All projects <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.slice(0, 6).map((p) => {
            const tasks = allTasks.filter((t) => t.projectId === p.id);
            const shipped = tasks.filter((t) => t.status === "SHIPPED").length;
            const pct = tasks.length ? Math.round((shipped / tasks.length) * 100) : 0;
            return (
              <Link
                key={p.id}
                to="/app/projects/$projectId"
                params={{ projectId: p.id }}
                className="group rounded-xl border border-border bg-surface p-4 transition hover:border-primary/40 hover:bg-surface-2/40"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold">{p.name}</h3>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:text-primary group-hover:translate-x-0.5" />
                </div>
                <div className="mt-4 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{tasks.length} tasks</span>
                  <span>{pct}% shipped</span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full bg-gradient-to-r from-primary to-sky-400" style={{ width: `${pct}%` }} />
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, icon: Icon, tone }: { label: string; value: number; icon: any; tone: "primary" | "warning" | "danger" | "muted" }) {
  const colors = {
    primary: "text-primary bg-primary/10",
    warning: "text-amber-300 bg-amber-500/10",
    danger: "text-rose-300 bg-rose-500/10",
    muted: "text-muted-foreground bg-surface-2",
  };
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
        </div>
        <div className={`grid h-8 w-8 place-items-center rounded-md ${colors[tone]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

export function Empty({ icon: Icon, title, desc, action }: { icon: any; title: string; desc: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="grid h-10 w-10 place-items-center rounded-full bg-surface-2 text-muted-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-3 text-sm font-medium">{title}</p>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground">{desc}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
