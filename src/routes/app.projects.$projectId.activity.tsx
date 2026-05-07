import { createFileRoute } from "@tanstack/react-router";
import { useActivity, formatRelative } from "@/lib/store";
import { Avatar } from "@/components/avatar";
import { Empty } from "./app.index";
import { Activity as ActivityIcon } from "lucide-react";

export const Route = createFileRoute("/app/projects/$projectId/activity")({ component: ActivityPage });

function ActivityPage() {
  const { projectId } = Route.useParams();
  const { data: items = [], isLoading } = useActivity(projectId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      {items.length === 0 ? (
        <Empty icon={ActivityIcon} title="No activity yet" desc="When the team works, you'll see it here." />
      ) : (
        <div className="rounded-xl border border-border bg-surface">
          <ul className="divide-y divide-border">
            {items.map((a) => (
              <li key={a.id} className="flex items-start gap-3 p-4 text-sm">
                <Avatar name={a.performer?.name} size={28} />
                <div className="flex-1">
                  <p>
                    <span className="font-medium">{a.performer?.name ?? "Someone"}</span>{" "}
                    <span className="text-muted-foreground">{a.action}</span>
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{formatRelative(a.createdAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
