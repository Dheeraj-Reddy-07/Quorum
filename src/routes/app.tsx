import { createFileRoute, Link, Navigate, Outlet, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import {
  useProjects,
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  formatRelative,
} from "@/lib/store";
import { useNotificationRealtime, useProjectsRealtime } from "@/lib/realtime";
import { Avatar } from "@/components/avatar";
import { useQuickAdd } from "@/components/quick-add";
import {
  Bell,
  Plus,
  LogOut,
  Folder,
  LayoutDashboard,
  ChevronDown,
  Sparkles,
  Check,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app")({ component: AppLayout });

function AppLayout() {
  const { user, loading } = useAuth();
  // Mount global realtime subscriptions
  useNotificationRealtime();
  useProjectsRealtime();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" />;
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <div className="ml-[240px] flex min-h-screen flex-1 flex-col">
        <Topbar />
        <main className="flex-1 anim-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function Sidebar() {
  const { user, profile, signOut } = useAuth();
  const { data: projects = [] } = useProjects();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const [open, setOpen] = useState(true);
  const myProjects = projects.filter((p) => p.status === "ACTIVE");

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-[240px] flex-col border-r border-border bg-sidebar">
      <div className="flex items-center gap-2 px-5 py-4">
        <div className="grid h-8 w-8 place-items-center rounded-md bg-gradient-to-br from-primary to-sky-400 text-xs font-bold text-primary-foreground">
          Q
        </div>
        <div>
          <div className="text-sm font-semibold">Quorum</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Workspace</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2 scrollbar-thin">
        <NavItem to="/app" icon={LayoutDashboard} label="Dashboard" active={path === "/app"} />
        <NavItem to="/app/projects" icon={Folder} label="All projects" active={path === "/app/projects"} />

        <button
          onClick={() => setOpen((v) => !v)}
          className="mt-5 mb-1 flex w-full items-center justify-between px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
        >
          <span>Projects</span>
          <ChevronDown className={cn("h-3 w-3 transition-transform", !open && "-rotate-90")} />
        </button>
        {open && (
          <div className="space-y-0.5">
            {myProjects.map((p) => {
              const active = path.startsWith(`/app/projects/${p.id}`);
              return (
                <Link
                  key={p.id}
                  to="/app/projects/$projectId"
                  params={{ projectId: p.id }}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm",
                    active
                      ? "bg-sidebar-accent text-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                  )}
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-primary" : "bg-muted-foreground/50")} />
                  <span className="truncate">{p.name}</span>
                </Link>
              );
            })}
            <Link
              to="/app/projects/new"
              className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" /> New project
            </Link>
          </div>
        )}
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3 rounded-md p-2 hover:bg-sidebar-accent">
          <Avatar name={profile?.name ?? user?.email ?? ""} size={32} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{profile?.name ?? "You"}</div>
            <div className="truncate text-[11px] text-muted-foreground">{user?.email}</div>
          </div>
          <button
            onClick={signOut}
            title="Sign out"
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

function NavItem({
  to,
  icon: Icon,
  label,
  active,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm",
        active
          ? "bg-sidebar-accent text-foreground"
          : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

function Topbar() {
  const { open } = useQuickAdd();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { data: projects = [] } = useProjects();
  const crumbs = buildCrumbs(path, projects);

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur">
      <div className="flex items-center gap-2 text-sm">
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-2">
            {i > 0 && <span className="text-muted-foreground">/</span>}
            <span className={i === crumbs.length - 1 ? "font-medium text-foreground" : "text-muted-foreground"}>
              {c}
            </span>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={open}
          className="hidden md:inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent"
        >
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Quick add
          <kbd className="ml-1 rounded border border-border bg-background px-1.5 py-0.5 text-[10px]">N</kbd>
        </button>
        <NotificationBell />
      </div>
    </header>
  );
}

function buildCrumbs(path: string, projects: { id: string; name: string }[]) {
  const parts = path.split("/").filter(Boolean);
  const crumbs: string[] = [];
  if (parts[0] === "app") {
    crumbs.push("Quorum");
    if (parts[1] === "projects") {
      crumbs.push("Projects");
      if (parts[2] === "new") crumbs.push("New");
      else if (parts[2]) {
        const p = projects.find((x) => x.id === parts[2]);
        crumbs.push(p?.name ?? "Project");
        if (parts[3]) crumbs.push(parts[3].charAt(0).toUpperCase() + parts[3].slice(1));
      }
    } else if (!parts[1]) crumbs.push("Dashboard");
  }
  return crumbs;
}

function NotificationBell() {
  const { user } = useAuth();
  const { data: notifications = [] } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const mine = notifications.filter((n) => n.userId === user?.id);
  const unread = mine.filter((n) => !n.read).length;

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative grid h-9 w-9 place-items-center rounded-md border border-border bg-surface text-muted-foreground hover:text-foreground"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid h-4 min-w-[16px] place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-11 w-80 rounded-xl border border-border bg-surface shadow-2xl anim-slide-up">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <div className="text-sm font-semibold">Notifications</div>
            {unread > 0 && (
              <button
                onClick={() => markAll.mutate()}
                className="text-xs text-primary hover:underline inline-flex items-center gap-1"
              >
                <Check className="h-3 w-3" /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto scrollbar-thin">
            {mine.length === 0 ? (
              <div className="px-4 py-10 text-center text-xs text-muted-foreground">You're all caught up.</div>
            ) : (
              mine.map((n) => (
                <button
                  key={n.id}
                  onClick={() => markRead.mutate(n.id)}
                  className={cn(
                    "block w-full border-b border-border/60 px-4 py-3 text-left text-sm hover:bg-accent",
                    !n.read && "bg-primary/5"
                  )}
                >
                  <div className="flex items-start gap-2">
                    {!n.read && <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary" />}
                    <div>
                      <p className="text-foreground">{n.message}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{formatRelative(n.createdAt)}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
