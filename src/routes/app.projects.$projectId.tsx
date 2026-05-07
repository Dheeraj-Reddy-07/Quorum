import { createFileRoute, Link, Navigate, Outlet, useRouterState } from "@tanstack/react-router";
import { useProject, useMembers, useMyRole, useTasks } from "@/lib/store";
import { useProjectRealtime } from "@/lib/realtime";
import { exportTasksCsv } from "@/lib/csv";
import { useQuickAdd } from "@/components/quick-add";
import { AvatarStack } from "@/components/avatar";
import { Activity, BarChart3, Kanban, List, Plus, Users, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/app/projects/$projectId")({ component: ProjectLayout });

function ProjectLayout() {
  const { projectId } = Route.useParams();
  // Subscribe to live updates for this project
  useProjectRealtime(projectId);
  const { data: project, isLoading } = useProject(projectId);
  const { data: members = [] } = useMembers(projectId);
  const { data: tasks = [] } = useTasks(projectId);
  const { data: role } = useMyRole(projectId);
  const { openFor } = useQuickAdd();
  const path = useRouterState({ select: (r) => r.location.pathname });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!project) return <Navigate to="/app/projects" />;
  if (role === null && role !== undefined) return <Navigate to="/app/projects" />;

  const memberNames = members.map((m) => m.profile?.name).filter(Boolean) as string[];

  const tabs = [
    { to: `/app/projects/${projectId}`, label: "Board", icon: Kanban, exact: true },
    { to: `/app/projects/${projectId}/list`, label: "List", icon: List },
    { to: `/app/projects/${projectId}/activity`, label: "Activity", icon: Activity },
    { to: `/app/projects/${projectId}/members`, label: "Members", icon: Users },
    ...(role === "ADMIN" ? [{ to: `/app/projects/${projectId}/analytics`, label: "Analytics", icon: BarChart3 }] : []),
  ];

  function handleExport() {
    const users = members.map((m) => ({ id: m.userId, name: m.profile?.name ?? "", email: m.profile?.email ?? "" }));
    exportTasksCsv(tasks, users, project!.name);
    toast.success("CSV exported");
  }

  return (
    <div>
      <div className="border-b border-border bg-surface/40">
        <div className="mx-auto max-w-7xl px-6 pt-6 pb-0">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-xl font-semibold">{project.name}</h1>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-medium",
                    role === "ADMIN"
                      ? "bg-primary/10 text-primary"
                      : "bg-surface-2 text-muted-foreground border border-border"
                  )}
                >
                  {role ?? "MEMBER"}
                </span>
              </div>
              <p className="mt-1 max-w-2xl truncate text-sm text-muted-foreground">
                {project.description || "No description."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <AvatarStack names={memberNames} size={26} max={5} />
              {role === "ADMIN" && (
                <button onClick={handleExport} className="btn-ghost" title="Export CSV">
                  <Download className="h-4 w-4" /> Export
                </button>
              )}
              <button onClick={() => openFor(projectId)} className="btn-primary">
                <Plus className="h-4 w-4" /> New task
              </button>
            </div>
          </div>

          <nav className="mt-5 flex gap-1 overflow-x-auto scrollbar-thin">
            {tabs.map((t) => {
              const active = t.exact ? path === t.to : path === t.to;
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-t-md border-b-2 px-3 py-2 text-sm transition",
                    active
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <t.icon className="h-4 w-4" />
                  {t.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <Outlet />
    </div>
  );
}
