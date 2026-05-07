import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useTasks, useMembers, dueLabel } from "@/lib/store";
import { Avatar } from "@/components/avatar";
import { PriorityBadge, StatusBadge, DueBadge } from "@/components/badges";
import { TaskModal } from "@/components/task-modal";
import { FilterBar, emptyFilters, applyFilters } from "@/components/filter-bar";
import { Empty } from "./app.index";
import { ListTodo, ChevronDown, ChevronUp } from "lucide-react";
import type { Task } from "@/lib/types";

export const Route = createFileRoute("/app/projects/$projectId/list")({ component: ListView });

type SortKey = "title" | "priority" | "status" | "dueDate" | "createdAt";

function ListView() {
  const { projectId } = Route.useParams();
  const { data: tasks = [], isLoading } = useTasks(projectId);
  const { data: members = [] } = useMembers(projectId);
  const [filters, setFilters] = useState(emptyFilters);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "createdAt", dir: -1 });

  const sorted = useMemo(() => {
    const list = applyFilters(tasks, filters);
    const priorityOrder = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 } as const;
    return [...list].sort((a, b) => {
      const k = sort.key;
      let av: any = (a as any)[k];
      let bv: any = (b as any)[k];
      if (k === "priority") { av = priorityOrder[a.priority]; bv = priorityOrder[b.priority]; }
      av = av ?? "zzz"; bv = bv ?? "zzz";
      return av < bv ? -sort.dir : av > bv ? sort.dir : 0;
    });
  }, [tasks, filters, sort]);

  function header(label: string, key: SortKey) {
    return (
      <button
        onClick={() => setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: 1 }))}
        className="inline-flex items-center gap-1 hover:text-foreground"
      >
        {label}
        {sort.key === key && (sort.dir === 1 ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
      </button>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-6 pb-10">
      <FilterBar filters={filters} setFilters={setFilters} projectId={projectId} showStatus />
      {sorted.length === 0 ? (
        <Empty icon={ListTodo} title="No tasks match" desc="Try clearing filters or create a new task." />
      ) : (
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-2/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5">{header("Title", "title")}</th>
                <th className="px-4 py-2.5">Assignee</th>
                <th className="px-4 py-2.5">{header("Priority", "priority")}</th>
                <th className="px-4 py-2.5">{header("Status", "status")}</th>
                <th className="px-4 py-2.5">{header("Due", "dueDate")}</th>
                <th className="px-4 py-2.5">{header("Created", "createdAt")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sorted.map((t) => {
                const assignee = members.find((m) => m.userId === t.assigneeId);
                const due = dueLabel(t.dueDate);
                return (
                  <tr key={t.id} onClick={() => setOpenTaskId(t.id)} className="cursor-pointer hover:bg-accent/40">
                    <td className="px-4 py-3 font-medium">{t.title}</td>
                    <td className="px-4 py-3">
                      {assignee ? (
                        <span className="inline-flex items-center gap-2">
                          <Avatar name={assignee.profile?.name} size={20} />
                          <span className="text-xs">{assignee.profile?.name}</span>
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3"><PriorityBadge priority={t.priority} /></td>
                    <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                    <td className="px-4 py-3">{due ? <DueBadge tone={due.tone} text={due.text} /> : <span className="text-xs text-muted-foreground">No due date</span>}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleDateString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <TaskModal taskId={openTaskId} open={!!openTaskId} onClose={() => setOpenTaskId(null)} />
    </div>
  );
}
