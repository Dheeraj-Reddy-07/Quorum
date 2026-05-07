/**
 * store.tsx — Supabase-backed data layer
 * All state is fetched from Supabase and mutated via React Query.
 * Helper utilities (formatRelative, dueLabel, initialsOf) are unchanged.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";
import { useAuth } from "./auth";
import type { Activity, Comment, Member, Notification, Project, Task, TaskStatus, Role, Priority } from "./types";

// ─── Re-export types so existing imports still work ──────────────────────────
export type { Activity, Comment, Member, Notification, Project, Task, TaskStatus, Role, Priority };

// ─── Query Keys ──────────────────────────────────────────────────────────────
export const QK = {
  projects: ["projects"] as const,
  tasks: (projectId: string) => ["tasks", projectId] as const,
  members: (projectId: string) => ["members", projectId] as const,
  comments: (taskId: string) => ["comments", taskId] as const,
  activity: (projectId: string) => ["activity", projectId] as const,
  notifications: (userId: string) => ["notifications", userId] as const,
  allTasks: ["allTasks"] as const,
  allMembers: ["allMembers"] as const,
  allActivity: ["allActivity"] as const,
};

// ─── Projects ─────────────────────────────────────────────────────────────────
export function useProjects() {
  const { user } = useAuth();
  return useQuery({
    queryKey: QK.projects,
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*, project_members!inner(user_id)")
        .eq("project_members.user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapProject);
    },
  });
}

export function useProject(projectId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["project", projectId],
    enabled: !!user && !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();
      if (error) throw error;
      return mapProject(data);
    },
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, description }: { name: string; description: string }) => {
      const { data, error } = await supabase.rpc("create_project", {
        p_name: name,
        p_description: description,
      });
      if (error) throw error;
      return mapProject(data as Record<string, unknown>);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.projects }),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Project> }) => {
      const { error } = await supabase
        .from("projects")
        .update({ name: patch.name, description: patch.description, status: patch.status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: QK.projects });
      qc.invalidateQueries({ queryKey: ["project", id] });
    },
  });
}

// ─── Members ──────────────────────────────────────────────────────────────────
export function useMembers(projectId: string) {
  return useQuery({
    queryKey: QK.members(projectId),
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_members")
        .select("*, profiles(id, name, email, avatar_url)")
        .eq("project_id", projectId);
      if (error) throw error;
      return (data ?? []).map((m) => ({
        userId: m.user_id,
        projectId: m.project_id,
        role: m.role as Role,
        joinedAt: m.joined_at,
        profile: m.profiles as { id: string; name: string; email: string; avatar_url?: string },
      }));
    },
  });
}

export function useAllMembers() {
  const { user } = useAuth();
  return useQuery({
    queryKey: QK.allMembers,
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_members")
        .select("*, profiles(id, name, email, avatar_url)");
      if (error) throw error;
      return (data ?? []).map((m) => ({
        userId: m.user_id as string,
        projectId: m.project_id as string,
        role: m.role as Role,
        joinedAt: m.joined_at as string,
        profile: m.profiles as { id: string; name: string; email: string; avatar_url?: string } | null,
      }));
    },
  });
}

export function useMyRole(projectId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["myRole", projectId],
    enabled: !!user && !!projectId,
    queryFn: async () => {
      const { data } = await supabase
        .from("project_members")
        .select("role")
        .eq("project_id", projectId)
        .eq("user_id", user!.id)
        .single();
      return (data?.role as Role) ?? null;
    },
  });
}

export function useAddMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, email, role }: { projectId: string; email: string; role: Role }) => {
      const { data: profile, error: pe } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .single();
      if (pe || !profile) throw new Error("User not found — they must sign up first.");
      const { error } = await supabase.from("project_members").insert({
        user_id: profile.id,
        project_id: projectId,
        role,
      });
      if (error) throw new Error("Already a member or DB error.");
    },
    onSuccess: (_d, { projectId }) => qc.invalidateQueries({ queryKey: QK.members(projectId) }),
  });
}

export function useRemoveMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, userId }: { projectId: string; userId: string }) => {
      await supabase.from("project_members").delete().eq("project_id", projectId).eq("user_id", userId);
    },
    onSuccess: (_d, { projectId }) => qc.invalidateQueries({ queryKey: QK.members(projectId) }),
  });
}

export function useSetMemberRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, userId, role }: { projectId: string; userId: string; role: Role }) => {
      await supabase.from("project_members").update({ role }).eq("project_id", projectId).eq("user_id", userId);
    },
    onSuccess: (_d, { projectId }) => qc.invalidateQueries({ queryKey: QK.members(projectId) }),
  });
}

// ─── Tasks ────────────────────────────────────────────────────────────────────
export function useTasks(projectId: string) {
  return useQuery({
    queryKey: QK.tasks(projectId),
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("project_id", projectId)
        .order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(mapTask);
    },
  });
}

export function useAllTasks() {
  const { user } = useAuth();
  return useQuery({
    queryKey: QK.allTasks,
    enabled: !!user,
    queryFn: async () => {
      // Only tasks for projects the user is a member of (enforced by RLS)
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(mapTask);
    },
  });
}

export function useCreateTask() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Task> & { title: string; projectId: string }) => {
      const { data: task, error } = await supabase
        .from("tasks")
        .insert({
          title: data.title,
          description: data.description ?? "",
          status: data.status ?? "BACKLOG",
          priority: data.priority ?? "MEDIUM",
          project_id: data.projectId,
          assignee_id: data.assigneeId ?? null,
          created_by_id: user!.id,
          due_date: data.dueDate ?? null,
          position: Date.now(),
          blocked_by_id: data.blockedById ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      // Log activity
      await supabase.from("activity").insert({
        action: `created task "${data.title}"`,
        entity_type: "TASK",
        entity_id: task.id,
        project_id: data.projectId,
        performed_by_id: user!.id,
      });
      return mapTask(task);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: QK.tasks(vars.projectId) });
      qc.invalidateQueries({ queryKey: QK.allTasks });
      qc.invalidateQueries({ queryKey: QK.activity(vars.projectId) });
    },
  });
}

export function useUpdateTask() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch, projectId }: { id: string; patch: Partial<Task>; projectId: string }) => {
      const update: Record<string, unknown> = {};
      if (patch.title !== undefined) update.title = patch.title;
      if (patch.description !== undefined) update.description = patch.description;
      if (patch.status !== undefined) update.status = patch.status;
      if (patch.priority !== undefined) update.priority = patch.priority;
      if (patch.assigneeId !== undefined) update.assignee_id = patch.assigneeId;
      if (patch.dueDate !== undefined) update.due_date = patch.dueDate;
      if (patch.position !== undefined) update.position = patch.position;
      if (patch.blockedById !== undefined) update.blocked_by_id = patch.blockedById;
      update.updated_at = new Date().toISOString();

      const { error } = await supabase.from("tasks").update(update).eq("id", id);
      if (error) throw error;

      if (patch.status) {
        await supabase.from("activity").insert({
          action: `changed status to ${patch.status}`,
          entity_type: "TASK",
          entity_id: id,
          project_id: projectId,
          performed_by_id: user!.id,
        });
      }
    },
    onSuccess: (_d, { projectId }) => {
      qc.invalidateQueries({ queryKey: QK.tasks(projectId) });
      qc.invalidateQueries({ queryKey: QK.allTasks });
      qc.invalidateQueries({ queryKey: QK.activity(projectId) });
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      await supabase.from("tasks").delete().eq("id", id);
      return projectId;
    },
    onSuccess: (_d, { projectId }) => {
      qc.invalidateQueries({ queryKey: QK.tasks(projectId) });
      qc.invalidateQueries({ queryKey: QK.allTasks });
    },
  });
}

export function useMoveTask() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, position, projectId }: { id: string; status: TaskStatus; position: number; projectId: string }) => {
      const { error } = await supabase
        .from("tasks")
        .update({ status, position, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      await supabase.from("activity").insert({
        action: `moved task to ${status}`,
        entity_type: "TASK",
        entity_id: id,
        project_id: projectId,
        performed_by_id: user!.id,
      });
    },
    onSuccess: (_d, { projectId }) => {
      qc.invalidateQueries({ queryKey: QK.tasks(projectId) });
      qc.invalidateQueries({ queryKey: QK.allTasks });
      qc.invalidateQueries({ queryKey: QK.activity(projectId) });
    },
  });
}

// ─── Comments ─────────────────────────────────────────────────────────────────
export function useComments(taskId: string) {
  return useQuery({
    queryKey: QK.comments(taskId),
    enabled: !!taskId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("*, profiles(id, name)")
        .eq("task_id", taskId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((c) => ({
        id: c.id as string,
        taskId: c.task_id as string,
        authorId: c.author_id as string,
        content: c.content as string,
        createdAt: c.created_at as string,
        author: c.profiles as { id: string; name: string } | null,
      }));
    },
  });
}

export function useAddComment() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, content, projectId }: { taskId: string; content: string; projectId: string }) => {
      const { error } = await supabase.from("comments").insert({
        task_id: taskId,
        author_id: user!.id,
        content,
      });
      if (error) throw error;
      // Mention notifications
      const mentions = Array.from(content.matchAll(/@([\w ]+?)(?=[,.!?]|$|\s{2,})/g)).map((m) => m[1].trim());
      for (const name of mentions) {
        const { data: mentioned } = await supabase.from("profiles").select("id").ilike("name", name).single();
        if (mentioned) {
          await supabase.from("notifications").insert({
            user_id: mentioned.id,
            message: `${profile?.name ?? "Someone"} mentioned you in a comment`,
            task_id: taskId,
          });
        }
      }
      await supabase.from("activity").insert({
        action: "commented on a task",
        entity_type: "TASK",
        entity_id: taskId,
        project_id: projectId,
        performed_by_id: user!.id,
      });
    },
    onSuccess: (_d, { taskId, projectId }) => {
      qc.invalidateQueries({ queryKey: QK.comments(taskId) });
      qc.invalidateQueries({ queryKey: QK.activity(projectId) });
    },
  });
}

// ─── Activity ─────────────────────────────────────────────────────────────────
export function useActivity(projectId: string) {
  return useQuery({
    queryKey: QK.activity(projectId),
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity")
        .select("*, profiles(id, name)")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []).map((a) => ({
        id: a.id as string,
        action: a.action as string,
        entityType: a.entity_type as Activity["entityType"],
        entityId: a.entity_id as string,
        projectId: a.project_id as string,
        performedById: a.performed_by_id as string,
        createdAt: a.created_at as string,
        performer: a.profiles as { id: string; name: string } | null,
      }));
    },
  });
}

export function useAllActivity() {
  const { user } = useAuth();
  return useQuery({
    queryKey: QK.allActivity,
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity")
        .select("*, profiles(id, name)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []).map((a) => ({
        id: a.id as string,
        action: a.action as string,
        entityType: a.entity_type as Activity["entityType"],
        entityId: a.entity_id as string,
        projectId: a.project_id as string,
        performedById: a.performed_by_id as string,
        createdAt: a.created_at as string,
        performer: a.profiles as { id: string; name: string } | null,
      }));
    },
  });
}

// ─── Notifications ────────────────────────────────────────────────────────────
export function useNotifications() {
  const { user } = useAuth();
  return useQuery({
    queryKey: QK.notifications(user?.id ?? ""),
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []).map((n) => ({
        id: n.id as string,
        userId: n.user_id as string,
        message: n.message as string,
        read: n.read as boolean,
        taskId: n.task_id as string | undefined,
        createdAt: n.created_at as string,
      }));
    },
  });
}

export function useMarkNotificationRead() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("notifications").update({ read: true }).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.notifications(user?.id ?? "") }),
  });
}

export function useMarkAllNotificationsRead() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await supabase.from("notifications").update({ read: true }).eq("user_id", user!.id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.notifications(user?.id ?? "") }),
  });
}

// ─── Mappers ──────────────────────────────────────────────────────────────────
function mapProject(p: Record<string, unknown>): Project {
  return {
    id: p.id as string,
    name: p.name as string,
    description: (p.description as string) ?? "",
    status: p.status as "ACTIVE" | "ARCHIVED",
    ownerId: p.owner_id as string,
    createdAt: p.created_at as string,
  };
}

function mapTask(t: Record<string, unknown>): Task {
  return {
    id: t.id as string,
    title: t.title as string,
    description: (t.description as string) ?? "",
    status: t.status as TaskStatus,
    priority: t.priority as Priority,
    projectId: t.project_id as string,
    assigneeId: t.assignee_id as string | undefined,
    createdById: t.created_by_id as string,
    dueDate: t.due_date as string | undefined,
    position: t.position as number,
    blockedById: t.blocked_by_id as string | undefined,
    createdAt: t.created_at as string,
    updatedAt: t.updated_at as string,
  };
}

// ─── Utilities (unchanged) ────────────────────────────────────────────────────
export function initialsOf(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}

export function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function dueLabel(iso?: string) {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  const d = Math.ceil(diff / 86400000);
  if (d < 0) return { text: `Overdue ${Math.abs(d)}d`, tone: "danger" as const };
  if (d === 0) return { text: "Due today", tone: "warning" as const };
  if (d <= 1) return { text: "Due tomorrow", tone: "warning" as const };
  if (d <= 3) return { text: `Due in ${d}d`, tone: "warning" as const };
  return { text: `Due ${new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`, tone: "muted" as const };
}
