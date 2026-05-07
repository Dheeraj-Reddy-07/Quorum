import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMembers, useMyRole, useAddMember, useRemoveMember, useSetMemberRole, useTasks } from "@/lib/store";
import { Avatar } from "@/components/avatar";
import { Empty } from "./app.index";
import { Users, UserPlus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Role } from "@/lib/types";

export const Route = createFileRoute("/app/projects/$projectId/members")({ component: MembersPage });

function MembersPage() {
  const { projectId } = Route.useParams();
  const { data: members = [], isLoading } = useMembers(projectId);
  const { data: role } = useMyRole(projectId);
  const { data: tasks = [] } = useTasks(projectId);
  const addMember = useAddMember();
  const removeMember = useRemoveMember();
  const setMemberRole = useSetMemberRole();
  const isAdmin = role === "ADMIN";
  const [email, setEmail] = useState("");

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    try {
      await addMember.mutateAsync({ projectId, email: email.trim(), role: "MEMBER" });
      toast.success("Member added");
      setEmail("");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to add member");
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      {isAdmin && (
        <form onSubmit={invite} className="mb-5 flex gap-2 rounded-xl border border-border bg-surface p-3">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teammate@email.com"
            className="input"
            required
            type="email"
          />
          <button type="submit" disabled={addMember.isPending} className="btn-primary inline-flex items-center gap-2">
            {addMember.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Invite
          </button>
        </form>
      )}

      {members.length === 0 ? (
        <Empty icon={Users} title="No members yet" desc="Invite teammates to collaborate." />
      ) : (
        <div className="rounded-xl border border-border bg-surface divide-y divide-border">
          {members.map((m) => {
            const taskCount = tasks.filter((t) => t.assigneeId === m.userId).length;
            return (
              <div key={m.userId} className="flex items-center gap-3 p-4">
                <Avatar name={m.profile?.name} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{m.profile?.name ?? "Unknown"}</div>
                  <div className="text-xs text-muted-foreground">{m.profile?.email}</div>
                </div>
                <span className="text-xs text-muted-foreground">{taskCount} tasks</span>
                {isAdmin ? (
                  <select
                    value={m.role}
                    onChange={(e) =>
                      setMemberRole.mutate({ projectId, userId: m.userId, role: e.target.value as Role })
                    }
                    className="input w-32"
                  >
                    <option value="ADMIN">Admin</option>
                    <option value="MEMBER">Member</option>
                  </select>
                ) : (
                  <span className="chip">{m.role}</span>
                )}
                {isAdmin && (
                  <button
                    onClick={async () => {
                      if (confirm("Remove this member?")) {
                        await removeMember.mutateAsync({ projectId, userId: m.userId });
                        toast.success("Member removed");
                      }
                    }}
                    className="rounded-md p-2 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
