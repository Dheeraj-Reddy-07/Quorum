/**
 * realtime.tsx — Supabase Realtime subscriptions
 * Subscribes to postgres_changes on relevant tables and auto-invalidates
 * React Query caches so all views stay live without manual refresh.
 */
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";
import { QK } from "./store";
import { useAuth } from "./auth";

/**
 * Mount this inside any project view to get live task/comment/activity updates
 * for that specific project.
 */
export function useProjectRealtime(projectId: string) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel(`project:${projectId}`)
      // Task changes
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `project_id=eq.${projectId}` },
        () => {
          qc.invalidateQueries({ queryKey: QK.tasks(projectId) });
          qc.invalidateQueries({ queryKey: QK.allTasks });
        }
      )
      // Comment changes
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comments" },
        (payload: any) => {
          // We don't know taskId here easily, invalidate all comment queries
          qc.invalidateQueries({ queryKey: ["comments"] });
        }
      )
      // Activity changes
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity", filter: `project_id=eq.${projectId}` },
        () => {
          qc.invalidateQueries({ queryKey: QK.activity(projectId) });
          qc.invalidateQueries({ queryKey: QK.allActivity });
        }
      )
      // Member changes
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "project_members", filter: `project_id=eq.${projectId}` },
        () => {
          qc.invalidateQueries({ queryKey: QK.members(projectId) });
          qc.invalidateQueries({ queryKey: QK.allMembers });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, qc]);
}

/**
 * Mount this globally (in app layout) to get live notification updates
 * for the current user.
 */
export function useNotificationRealtime() {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => {
          qc.invalidateQueries({ queryKey: QK.notifications(user.id) });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => {
          qc.invalidateQueries({ queryKey: QK.notifications(user.id) });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, qc]);
}

/**
 * Mount this globally to keep the projects list in the sidebar in sync.
 */
export function useProjectsRealtime() {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`projects:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "projects" },
        () => {
          qc.invalidateQueries({ queryKey: QK.projects });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, qc]);
}
