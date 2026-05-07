import { useMembers, useComments, dueLabel } from "@/lib/store";
import { Avatar } from "@/components/avatar";
import { PriorityBadge, DueBadge } from "@/components/badges";
import type { Task } from "@/lib/types";
import { MessageSquare, Link2, AlertOctagon } from "lucide-react";
import { cn } from "@/lib/utils";

export function TaskCard({ task, onClick, dragging }: { task: Task; onClick?: () => void; dragging?: boolean }) {
  const { data: members = [] } = useMembers(task.projectId);
  const { data: comments = [] } = useComments(task.id);
  const assignee = members.find((m) => m.userId === task.assigneeId);
  const due = dueLabel(task.dueDate);
  const commentCount = comments.length;
  // Blocked indicator — we can't cross-query tasks here without extra fetch,
  // so just show the "linked" badge if blockedById is set
  const isLinked = !!task.blockedById;

  return (
    <div
      onClick={onClick}
      className={cn(
        "group cursor-pointer rounded-lg border border-border bg-surface p-3 text-left transition",
        "hover:border-primary/40 hover:bg-surface-2/60",
        dragging && "opacity-50 ring-2 ring-primary/50"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 text-sm font-medium text-foreground line-clamp-2">{task.title}</div>
        {assignee ? (
          <Avatar name={assignee.profile?.name} size={22} />
        ) : (
          <span className="h-[22px] w-[22px] rounded-full border border-dashed border-border" />
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <PriorityBadge priority={task.priority} />
        {due && <DueBadge tone={due.tone} text={due.text} />}
        {isLinked && (
          <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-300">
            <AlertOctagon className="h-3 w-3" /> Blocked
          </span>
        )}
      </div>
      {(commentCount > 0 || isLinked) && (
        <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
          {commentCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="h-3 w-3" /> {commentCount}
            </span>
          )}
          {isLinked && (
            <span className="inline-flex items-center gap-1">
              <Link2 className="h-3 w-3" /> linked
            </span>
          )}
        </div>
      )}
    </div>
  );
}
