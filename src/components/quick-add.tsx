import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Modal } from "./modal";
import { useProjects, useMembers, useCreateTask } from "@/lib/store";
import type { Priority, TaskStatus } from "@/lib/types";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

const Ctx = createContext<{ open: () => void; openFor: (projectId: string) => void } | null>(null);

export function useQuickAdd() {
  const c = useContext(Ctx);
  if (!c) throw new Error("QuickAddProvider missing");
  return c;
}

export function QuickAddProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [projectIdSeed, setProjectIdSeed] = useState<string | undefined>();
  const value = useMemo(
    () => ({
      open: () => setOpen(true),
      openFor: (pid: string) => {
        setProjectIdSeed(pid);
        setOpen(true);
      },
    }),
    []
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "n" || e.key === "N") {
        const t = e.target as HTMLElement;
        if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Ctx.Provider value={value}>
      {children}
      <QuickAddModal
        open={open}
        onClose={() => { setOpen(false); setProjectIdSeed(undefined); }}
        initialProjectId={projectIdSeed}
      />
    </Ctx.Provider>
  );
}

function QuickAddModal({ open, onClose, initialProjectId }: { open: boolean; onClose: () => void; initialProjectId?: string }) {
  const { data: projects = [] } = useProjects();
  const navigate = useNavigate();
  const createTask = useCreateTask();

  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState(initialProjectId ?? projects[0]?.id ?? "");
  const [status, setStatus] = useState<TaskStatus>("BACKLOG");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");

  const { data: members = [] } = useMembers(projectId);

  useEffect(() => {
    if (open) {
      setTitle("");
      setStatus("BACKLOG");
      setPriority("MEDIUM");
      setAssigneeId("");
      setDueDate("");
      setProjectId(initialProjectId ?? projects[0]?.id ?? "");
    }
  }, [open, initialProjectId, projects]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !projectId) return;
    try {
      const t = await createTask.mutateAsync({
        title: title.trim(),
        projectId,
        status,
        priority,
        assigneeId: assigneeId || undefined,
        dueDate: dueDate || undefined,
      });
      toast.success("Task created", {
        description: t.title,
        action: { label: "Open", onClick: () => navigate({ to: "/app/projects/$projectId", params: { projectId } }) },
      });
      onClose();
    } catch (err: any) {
      toast.error("Failed to create task", { description: err?.message });
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Quick add task" size="md">
      <form onSubmit={submit} className="space-y-3 p-5">
        <input
          autoFocus
          placeholder="What needs to be done?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="input text-base"
        />
        <div className="grid grid-cols-2 gap-3">
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="input">
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)} className="input">
            <option value="BACKLOG">Backlog</option>
            <option value="ACTIVE">Active</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="SHIPPED">Shipped</option>
          </select>
          <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className="input">
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
          <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className="input">
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>{m.profile?.name ?? m.userId}</option>
            ))}
          </select>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input col-span-2" />
        </div>
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-muted-foreground">
            Press <kbd className="rounded border border-border bg-surface px-1 py-0.5 text-[10px]">Esc</kbd> to close
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={createTask.isPending} className="btn-primary inline-flex items-center gap-2">
              {createTask.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Create task
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
