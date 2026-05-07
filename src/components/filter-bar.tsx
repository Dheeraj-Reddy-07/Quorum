import { useMembers } from "@/lib/store";
import type { Priority, TaskStatus } from "@/lib/types";
import { X, Filter as FilterIcon, Search } from "lucide-react";

export interface Filters {
  search: string;
  assignees: string[];
  priorities: Priority[];
  statuses: TaskStatus[];
}

export const emptyFilters: Filters = { search: "", assignees: [], priorities: [], statuses: [] };

export function FilterBar({
  filters,
  setFilters,
  projectId,
  showStatus = false,
}: {
  filters: Filters;
  setFilters: (f: Filters) => void;
  projectId: string;
  showStatus?: boolean;
}) {
  const { data: members = [] } = useMembers(projectId);

  function toggle<T>(arr: T[], v: T) {
    return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
  }

  const active =
    filters.search.length > 0 ||
    filters.assignees.length > 0 ||
    filters.priorities.length > 0 ||
    filters.statuses.length > 0;

  return (
    <div className="flex flex-wrap items-center gap-2 py-3">
      <div className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 min-w-[220px] flex-1 max-w-sm">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          placeholder="Search tasks..."
          className="w-full bg-transparent py-1.5 text-sm focus:outline-none"
        />
      </div>

      <Dropdown
        label={`Assignee${filters.assignees.length ? ` (${filters.assignees.length})` : ""}`}
        items={members.map((m) => ({ id: m.userId, label: m.profile?.name ?? m.userId }))}
        selected={filters.assignees}
        onToggle={(id) => setFilters({ ...filters, assignees: toggle(filters.assignees, id) })}
      />
      <Dropdown
        label={`Priority${filters.priorities.length ? ` (${filters.priorities.length})` : ""}`}
        items={[
          { id: "URGENT", label: "Urgent" },
          { id: "HIGH", label: "High" },
          { id: "MEDIUM", label: "Medium" },
          { id: "LOW", label: "Low" },
        ]}
        selected={filters.priorities}
        onToggle={(id) => setFilters({ ...filters, priorities: toggle(filters.priorities, id as Priority) })}
      />
      {showStatus && (
        <Dropdown
          label={`Status${filters.statuses.length ? ` (${filters.statuses.length})` : ""}`}
          items={[
            { id: "BACKLOG", label: "Backlog" },
            { id: "ACTIVE", label: "Active" },
            { id: "IN_REVIEW", label: "In Review" },
            { id: "SHIPPED", label: "Shipped" },
          ]}
          selected={filters.statuses}
          onToggle={(id) => setFilters({ ...filters, statuses: toggle(filters.statuses, id as TaskStatus) })}
        />
      )}

      {active && (
        <button
          onClick={() => setFilters(emptyFilters)}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="h-3 w-3" /> Clear
        </button>
      )}
    </div>
  );
}

function Dropdown({
  label,
  items,
  selected,
  onToggle,
}: {
  label: string;
  items: { id: string; label: string }[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <details className="relative">
      <summary className="list-none cursor-pointer inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs hover:bg-accent">
        <FilterIcon className="h-3 w-3" />
        {label}
      </summary>
      <div className="absolute z-20 mt-1 w-48 rounded-lg border border-border bg-surface shadow-xl anim-slide-up">
        {items.map((i) => {
          const on = selected.includes(i.id);
          return (
            <label key={i.id} className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent">
              <input type="checkbox" checked={on} onChange={() => onToggle(i.id)} className="accent-[var(--primary)]" />
              {i.label}
            </label>
          );
        })}
      </div>
    </details>
  );
}

export function applyFilters<T extends { title: string; assigneeId?: string; priority: Priority; status: TaskStatus }>(
  tasks: T[],
  f: Filters
) {
  return tasks.filter((t) => {
    if (f.search && !t.title.toLowerCase().includes(f.search.toLowerCase())) return false;
    if (f.assignees.length && (!t.assigneeId || !f.assignees.includes(t.assigneeId))) return false;
    if (f.priorities.length && !f.priorities.includes(t.priority)) return false;
    if (f.statuses.length && !f.statuses.includes(t.status)) return false;
    return true;
  });
}
