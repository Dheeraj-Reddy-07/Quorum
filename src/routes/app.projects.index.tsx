import { createFileRoute, Link } from "@tanstack/react-router";
import { useProjects, useAllTasks, useAllMembers } from "@/lib/store";
import { AvatarStack } from "@/components/avatar";
import { Empty } from "./app.index";
import { Folder, Plus, Search } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/app/projects/")({ component: ProjectsList });

function ProjectsList() {
  const { data: projects = [], isLoading } = useProjects();
  const { data: allTasks = [] } = useAllTasks();
  const { data: allMembers = [] } = useAllMembers();
  const [q, setQ] = useState("");
  const filtered = projects.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Projects</p>
          <h1 className="mt-1 text-2xl font-semibold">All projects</h1>
        </div>
        <Link to="/app/projects/new" className="btn-primary">
          <Plus className="h-4 w-4" /> New project
        </Link>
      </div>

      <div className="mt-6 flex items-center gap-2 rounded-md border border-border bg-surface px-3">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search projects..."
          className="w-full bg-transparent py-2 text-sm focus:outline-none"
        />
      </div>

      <div className="mt-6">
        {filtered.length === 0 ? (
          <Empty
            icon={Folder}
            title="No projects yet"
            desc="Create your first project to get started."
            action={
              <Link to="/app/projects/new" className="btn-primary">
                <Plus className="h-4 w-4" /> Create project
              </Link>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => {
              const tasks = allTasks.filter((t) => t.projectId === p.id);
              const shipped = tasks.filter((t) => t.status === "SHIPPED").length;
              const open = tasks.length - shipped;
              const pct = tasks.length ? Math.round((shipped / tasks.length) * 100) : 0;
              const memberNames = allMembers
                .filter((m) => m.projectId === p.id)
                .map((m) => m.profile?.name)
                .filter(Boolean) as string[];
              return (
                <Link
                  key={p.id}
                  to="/app/projects/$projectId"
                  params={{ projectId: p.id }}
                  className="group rounded-xl border border-border bg-surface p-5 transition hover:border-primary/40"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-semibold">{p.name}</h3>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.description}</p>
                    </div>
                    {p.status === "ARCHIVED" && (
                      <span className="rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[10px] text-muted-foreground">
                        Archived
                      </span>
                    )}
                  </div>
                  <div className="mt-5 flex items-center justify-between">
                    <AvatarStack names={memberNames} size={22} />
                    <div className="text-[11px] text-muted-foreground">{open} open · {tasks.length} total</div>
                  </div>
                  <div className="mt-3 h-1 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full bg-gradient-to-r from-primary to-sky-400" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-1.5 text-right text-[10px] text-muted-foreground">{pct}% shipped</div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
