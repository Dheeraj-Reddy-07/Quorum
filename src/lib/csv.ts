import type { Task, User } from "./types";

function esc(v: string) {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export function exportTasksCsv(tasks: Task[], users: User[], projectName: string) {
  const rows = [
    ["Title", "Status", "Priority", "Assignee", "Due Date", "Created Date"],
    ...tasks.map((t) => [
      t.title,
      t.status,
      t.priority,
      users.find((u) => u.id === t.assigneeId)?.name ?? "Unassigned",
      t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 10) : "",
      new Date(t.createdAt).toISOString().slice(0, 10),
    ]),
  ];
  const csv = rows.map((r) => r.map((c) => esc(String(c))).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${projectName.replace(/\s+/g, "-").toLowerCase()}-tasks.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
