import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useTasks, useMoveTask } from "@/lib/store";
import { useQuickAdd } from "@/components/quick-add";
import type { TaskStatus, Task } from "@/lib/types";
import { STATUS_META } from "@/lib/types";
import { TaskCard } from "@/components/task-card";
import { TaskModal } from "@/components/task-modal";
import { FilterBar, emptyFilters, applyFilters } from "@/components/filter-bar";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";

export const Route = createFileRoute("/app/projects/$projectId/")({ component: BoardPage });

const COLUMNS: TaskStatus[] = ["BACKLOG", "ACTIVE", "IN_REVIEW", "SHIPPED"];

function BoardPage() {
  const { projectId } = Route.useParams();
  const { data: allTasks = [], isLoading } = useTasks(projectId);
  const moveTask = useMoveTask();
  const { openFor } = useQuickAdd();
  const [filters, setFilters] = useState(emptyFilters);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const tasks = useMemo(
    () => applyFilters(allTasks, filters),
    [allTasks, filters]
  );

  function onDragStart(e: DragStartEvent) {
    setActiveId(e.active.id as string);
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const taskId = e.active.id as string;
    const overId = e.over?.id as string | undefined;
    if (!overId) return;
    const targetStatus = COLUMNS.includes(overId as TaskStatus)
      ? (overId as TaskStatus)
      : allTasks.find((t) => t.id === overId)?.status;
    if (!targetStatus) return;
    const task = allTasks.find((t) => t.id === taskId);
    if (!task || task.status === targetStatus) return;

    // Check blocker
    if (targetStatus === "SHIPPED" && task.blockedById) {
      const blocker = allTasks.find((b) => b.id === task.blockedById);
      if (blocker && blocker.status !== "SHIPPED") {
        toast.error("Cannot ship: task is blocked");
        return;
      }
    }

    moveTask.mutate(
      { id: taskId, status: targetStatus, position: Date.now(), projectId },
      {
        onSuccess: () => toast(`Moved to ${STATUS_META[targetStatus].label}`, { description: task.title }),
        onError: () => toast.error("Failed to move task"),
      }
    );
  }

  const activeTask = activeId ? allTasks.find((t) => t.id === activeId) : null;

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] px-6 pb-10">
      <FilterBar filters={filters} setFilters={setFilters} projectId={projectId} />
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((status) => (
            <Column
              key={status}
              status={status}
              tasks={tasks.filter((t) => t.status === status)}
              onCardClick={(id) => setOpenTaskId(id)}
              onAdd={() => openFor(projectId)}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTask ? <div className="w-[280px]"><TaskCard task={activeTask} dragging /></div> : null}
        </DragOverlay>
      </DndContext>
      <TaskModal taskId={openTaskId} open={!!openTaskId} onClose={() => setOpenTaskId(null)} />
    </div>
  );
}

function Column({ status, tasks, onCardClick, onAdd }: { status: TaskStatus; tasks: Task[]; onCardClick: (id: string) => void; onAdd: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const meta = STATUS_META[status];
  return (
    <div
      ref={setNodeRef}
      className={`flex h-fit min-h-[200px] flex-col rounded-xl border bg-surface/40 transition ${isOver ? "border-primary/50 bg-primary/5" : "border-border"}`}
    >
      <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: meta.color }} />
          <span className="text-xs font-semibold uppercase tracking-wider">{meta.label}</span>
          <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[10px] text-muted-foreground">{tasks.length}</span>
        </div>
      </div>
      <div className="flex flex-col gap-2 p-2.5">
        {tasks.map((t) => (
          <DraggableCard key={t.id} task={t} onClick={() => onCardClick(t.id)} />
        ))}
        <button
          onClick={onAdd}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground transition"
        >
          <Plus className="h-3.5 w-3.5" /> Add task
        </button>
      </div>
    </div>
  );
}

function DraggableCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className={isDragging ? "opacity-30" : ""}>
      <TaskCard task={task} onClick={onClick} />
    </div>
  );
}
