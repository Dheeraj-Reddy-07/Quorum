import { useState, useEffect, useRef, useMemo } from "react";
import { Modal } from "./modal";
import { useTasks, useMembers, useComments, useActivity, useUpdateTask, useDeleteTask, useAddComment, useMyRole, formatRelative } from "@/lib/store";
import type { Priority, TaskStatus } from "@/lib/types";
import { Avatar } from "./avatar";
import { PriorityBadge, StatusBadge } from "./badges";
import { Trash2, Send, AtSign, AlertOctagon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function TaskModal({
  taskId,
  open,
  onClose,
}: {
  taskId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  // We need the task's projectId — fetch it from the tasks query
  // taskId is passed from the board — we need its projectId first
  // We'll use a wrapper that resolves this lazily
  if (!taskId || !open) return null;
  return <TaskModalInner taskId={taskId} onClose={onClose} />;
}

function TaskModalInner({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  // We don't know projectId yet — we need to look it up
  // Use a generic all-tasks approach: the board already has tasks loaded, so we pass projectId separately
  // Instead, use the task from the board's project via a "find in any loaded task cache"
  // Simplest: require callers to pass projectId OR look up via a separate query
  // For now, we'll fetch the task directly
  const [projectId, setProjectId] = useState<string | null>(null);

  // Fetch the task by ID to get its projectId
  useEffect(() => {
    import("@/lib/supabase").then(({ supabase }) => {
      supabase.from("tasks").select("project_id").eq("id", taskId).single().then(({ data }) => {
        if (data) setProjectId(data.project_id);
      });
    });
  }, [taskId]);

  if (!projectId) {
    return (
      <Modal open onClose={onClose} size="xl" title="Task details">
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </Modal>
    );
  }

  return <TaskModalContent taskId={taskId} projectId={projectId} onClose={onClose} />;
}

function TaskModalContent({ taskId, projectId, onClose }: { taskId: string; projectId: string; onClose: () => void }) {
  const { data: tasks = [] } = useTasks(projectId);
  const { data: members = [] } = useMembers(projectId);
  const { data: comments = [] } = useComments(taskId);
  const { data: activityItems = [] } = useActivity(projectId);
  const { data: role } = useMyRole(projectId);
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const addComment = useAddComment();

  const task = tasks.find((t) => t.id === taskId);
  if (!task) return null;

  const isAdmin = role === "ADMIN";
  const projectTasks = tasks.filter((t) => t.id !== taskId);
  const taskActivity = activityItems.filter((a) => a.entityId === taskId).slice(0, 8);
  const blocker = task.blockedById ? tasks.find((t) => t.id === task.blockedById) : undefined;
  const isBlocked = blocker && blocker.status !== "SHIPPED";

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">#{taskId.slice(0, 6)}</span>
          <span>Task details</span>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px]">
        <div className="border-r border-border p-5">
          <TitleInput task={task} projectId={projectId} updateTask={updateTask} />
          {isBlocked && (
            <div className="mt-2 flex items-center gap-2 rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
              <AlertOctagon className="h-4 w-4" />
              Blocked by <span className="font-medium">"{blocker?.title}"</span>. It must be shipped first.
            </div>
          )}

          <DescriptionInput task={task} projectId={projectId} updateTask={updateTask} />

          <div className="mt-6">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Comments ({comments.length})
            </p>
            <div className="space-y-3">
              {comments.length === 0 && (
                <p className="text-xs text-muted-foreground">No comments yet. Start the conversation.</p>
              )}
              {comments.map((c) => (
                <div key={c.id} className="flex gap-3">
                  <Avatar name={c.author?.name} size={28} />
                  <div className="flex-1 rounded-lg border border-border bg-surface-2/40 px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">{c.author?.name ?? "Unknown"}</span>
                      <span className="text-[10px] text-muted-foreground">{formatRelative(c.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-sm whitespace-pre-wrap">{renderMentions(c.content)}</p>
                  </div>
                </div>
              ))}
            </div>
            <CommentBox
              taskId={taskId}
              projectId={projectId}
              members={members.map((m) => ({ id: m.userId, name: m.profile?.name ?? "" }))}
              addComment={addComment}
            />
          </div>

          {taskActivity.length > 0 && (
            <div className="mt-6">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Activity</p>
              <ul className="space-y-2">
                {taskActivity.map((a) => (
                  <li key={a.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Avatar name={a.performer?.name} size={18} />
                    <span>
                      <span className="font-medium text-foreground">{a.performer?.name ?? "Someone"}</span> {a.action}
                    </span>
                    <span>·</span>
                    <span>{formatRelative(a.createdAt)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <aside className="space-y-4 p-5">
          <Field label="Status">
            <select
              value={task.status}
              onChange={(e) => {
                const v = e.target.value as TaskStatus;
                if (v === "SHIPPED" && isBlocked) {
                  toast.error("Cannot ship: task is blocked");
                  return;
                }
                updateTask.mutate({ id: taskId, patch: { status: v }, projectId });
              }}
              className="input"
            >
              <option value="BACKLOG">Backlog</option>
              <option value="ACTIVE">Active</option>
              <option value="IN_REVIEW">In Review</option>
              <option value="SHIPPED">Shipped</option>
            </select>
          </Field>
          <Field label="Priority">
            <select
              value={task.priority}
              onChange={(e) => updateTask.mutate({ id: taskId, patch: { priority: e.target.value as Priority }, projectId })}
              className="input"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </Field>
          <Field label="Assignee">
            <select
              value={task.assigneeId ?? ""}
              onChange={(e) =>
                updateTask.mutate({ id: taskId, patch: { assigneeId: e.target.value || undefined }, projectId })
              }
              className="input"
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>{m.profile?.name ?? m.userId}</option>
              ))}
            </select>
          </Field>
          <Field label="Due date">
            <input
              type="date"
              value={task.dueDate ? task.dueDate.slice(0, 10) : ""}
              onChange={(e) =>
                updateTask.mutate({
                  id: taskId,
                  patch: { dueDate: e.target.value ? new Date(e.target.value).toISOString() : undefined },
                  projectId,
                })
              }
              className="input"
            />
          </Field>
          <Field label="Blocked by">
            <select
              value={task.blockedById ?? ""}
              onChange={(e) =>
                updateTask.mutate({ id: taskId, patch: { blockedById: e.target.value || undefined }, projectId })
              }
              className="input"
            >
              <option value="">None</option>
              {projectTasks.map((t) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          </Field>

          {isAdmin && (
            <div className="pt-3 border-t border-border">
              <button
                onClick={async () => {
                  if (confirm("Delete this task?")) {
                    await deleteTask.mutateAsync({ id: taskId, projectId });
                    toast.success("Task deleted");
                    onClose();
                  }
                }}
                className="inline-flex items-center gap-2 rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-300 hover:bg-rose-500/20"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete task
              </button>
            </div>
          )}
        </aside>
      </div>
    </Modal>
  );
}

function TitleInput({ task, projectId, updateTask }: any) {
  const [title, setTitle] = useState(task.title);
  useEffect(() => setTitle(task.title), [task.id]);
  return (
    <input
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      onBlur={() => title !== task.title && updateTask.mutate({ id: task.id, patch: { title }, projectId })}
      className="w-full bg-transparent text-xl font-semibold focus:outline-none focus:ring-0"
    />
  );
}

function DescriptionInput({ task, projectId, updateTask }: any) {
  const [description, setDescription] = useState(task.description);
  useEffect(() => setDescription(task.description), [task.id]);
  return (
    <div className="mt-4">
      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Description</p>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        onBlur={() =>
          description !== task.description &&
          updateTask.mutate({ id: task.id, patch: { description }, projectId })
        }
        rows={4}
        placeholder="Add a description..."
        className="input"
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function renderMentions(text: string) {
  const parts = text.split(/(@[\w ]+?(?=[,.!?]|$|\s{2,}))/g);
  return parts.map((p, i) =>
    p.startsWith("@") ? (
      <span key={i} className="rounded bg-primary/20 px-1 text-primary">{p}</span>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}

function CommentBox({
  taskId,
  projectId,
  members,
  addComment,
}: {
  taskId: string;
  projectId: string;
  members: { id: string; name: string }[];
  addComment: any;
}) {
  const [text, setText] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  function onChange(v: string) {
    setText(v);
    const at = v.lastIndexOf("@");
    if (at >= 0 && (at === 0 || /\s/.test(v[at - 1]))) {
      const after = v.slice(at + 1);
      if (!after.includes(" ")) {
        setShowMentions(true);
        setQuery(after.toLowerCase());
        return;
      }
    }
    setShowMentions(false);
  }

  const matches = useMemo(
    () => members.filter((m) => m.name.toLowerCase().includes(query)).slice(0, 5),
    [members, query]
  );

  function pick(name: string) {
    const at = text.lastIndexOf("@");
    setText(text.slice(0, at) + "@" + name + " ");
    setShowMentions(false);
    ref.current?.focus();
  }

  async function send() {
    if (!text.trim()) return;
    try {
      await addComment.mutateAsync({ taskId, content: text.trim(), projectId });
      setText("");
    } catch {
      toast.error("Failed to send comment");
    }
  }

  return (
    <div className="mt-3 relative">
      <textarea
        ref={ref}
        value={text}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(); }}
        rows={2}
        placeholder="Write a comment... use @ to mention"
        className="input resize-none pr-12"
      />
      <button
        onClick={send}
        disabled={addComment.isPending}
        className="absolute bottom-2 right-2 grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
        title="Send (⌘ Enter)"
      >
        {addComment.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
      </button>
      {showMentions && matches.length > 0 && (
        <div className="absolute bottom-full mb-1 left-0 w-60 rounded-lg border border-border bg-surface shadow-xl anim-slide-up">
          <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
            <AtSign className="inline h-3 w-3 mr-1" /> Mention
          </div>
          {matches.map((m) => (
            <button
              key={m.id}
              onClick={() => pick(m.name)}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
            >
              <Avatar name={m.name} size={20} />
              {m.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
