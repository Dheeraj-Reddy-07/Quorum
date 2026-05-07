import { PRIORITY_META, STATUS_META, type Priority, type TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PriorityBadge({ priority }: { priority: Priority }) {
  const meta = PRIORITY_META[priority];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] font-medium", meta.color)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}

export function StatusBadge({ status }: { status: TaskStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] font-medium text-foreground">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
      {meta.label}
    </span>
  );
}

export function DueBadge({ tone, text }: { tone: "danger" | "warning" | "muted"; text: string }) {
  const cls =
    tone === "danger"
      ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
      : tone === "warning"
      ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
      : "bg-surface text-muted-foreground border-border";
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium", cls)}>
      {text}
    </span>
  );
}
