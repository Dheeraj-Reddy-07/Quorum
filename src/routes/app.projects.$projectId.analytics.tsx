import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useTasks, useMembers, useMyRole } from "@/lib/store";
import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from "recharts";
import { CheckCircle2, Clock, AlertTriangle, ListTodo } from "lucide-react";

export const Route = createFileRoute("/app/projects/$projectId/analytics")({ component: AnalyticsPage });

const STATUS_COLORS: Record<string, string> = {
  BACKLOG: "#8B949E", ACTIVE: "#3B82F6", IN_REVIEW: "#F59E0B", SHIPPED: "#22C55E",
};
const PRIORITY_COLORS: Record<string, string> = {
  LOW: "#8B949E", MEDIUM: "#38BDF8", HIGH: "#F59E0B", URGENT: "#EF4444",
};

function AnalyticsPage() {
  const { projectId } = Route.useParams();
  const { data: role, isLoading: roleLoading } = useMyRole(projectId);
  const { data: tasks = [] } = useTasks(projectId);
  const { data: members = [] } = useMembers(projectId);

  if (roleLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (role !== "ADMIN") return <Navigate to={`/app/projects/${projectId}` as any} />;

  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "SHIPPED").length;
  const inProgress = tasks.filter((t) => t.status === "ACTIVE" || t.status === "IN_REVIEW").length;
  const overdue = tasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "SHIPPED").length;

  const perMember = useMemo(() =>
    members.map((m) => ({
      name: (m.profile?.name ?? "Unknown").split(" ")[0],
      tasks: tasks.filter((t) => t.assigneeId === m.userId).length,
    })),
    [members, tasks]
  );

  const byStatus = ["BACKLOG", "ACTIVE", "IN_REVIEW", "SHIPPED"].map((s) => ({
    name: s, value: tasks.filter((t) => t.status === s).length,
  }));
  const byPriority = ["URGENT", "HIGH", "MEDIUM", "LOW"].map((p) => ({
    name: p, value: tasks.filter((t) => t.priority === p).length,
  }));

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Total tasks" value={total} icon={ListTodo} tone="muted" />
        <Stat label="Completed" value={completed} icon={CheckCircle2} tone="success" />
        <Stat label="Overdue" value={overdue} icon={AlertTriangle} tone="danger" />
        <Stat label="In progress" value={inProgress} icon={Clock} tone="primary" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <ChartCard title="Tasks per member">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={perMember}>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262D" />
              <XAxis dataKey="name" stroke="#8B949E" fontSize={11} />
              <YAxis stroke="#8B949E" fontSize={11} />
              <Tooltip contentStyle={tooltip} />
              <Bar dataKey="tasks" fill="#3B82F6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Tasks by status">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={byStatus} dataKey="value" innerRadius={55} outerRadius={90} paddingAngle={2}>
                {byStatus.map((e, i) => <Cell key={i} fill={STATUS_COLORS[e.name]} stroke="none" />)}
              </Pie>
              <Tooltip contentStyle={tooltip} />
            </PieChart>
          </ResponsiveContainer>
          <Legend items={byStatus.map((s) => ({ label: s.name, color: STATUS_COLORS[s.name], value: s.value }))} />
        </ChartCard>

        <ChartCard title="Tasks by priority">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byPriority}>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262D" />
              <XAxis dataKey="name" stroke="#8B949E" fontSize={11} />
              <YAxis stroke="#8B949E" fontSize={11} />
              <Tooltip contentStyle={tooltip} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {byPriority.map((e, i) => <Cell key={i} fill={PRIORITY_COLORS[e.name]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Workload">
          <div className="space-y-3 p-1">
            {members.map((m) => {
              const count = tasks.filter((t) => t.assigneeId === m.userId).length;
              const pct = total ? (count / total) * 100 : 0;
              return (
                <div key={m.userId}>
                  <div className="flex items-center justify-between text-xs">
                    <span>{m.profile?.name ?? "Unknown"}</span>
                    <span className="text-muted-foreground">{count} tasks</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full bg-gradient-to-r from-primary to-sky-400" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

const tooltip = { background: "#161B22", border: "1px solid #21262D", borderRadius: 8, fontSize: 12 } as const;

function Stat({ label, value, icon: Icon, tone }: { label: string; value: number; icon: any; tone: "primary" | "success" | "danger" | "muted" }) {
  const colors = {
    primary: "text-primary bg-primary/10",
    success: "text-emerald-300 bg-emerald-500/10",
    danger: "text-rose-300 bg-rose-500/10",
    muted: "text-muted-foreground bg-surface-2",
  };
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
        </div>
        <div className={`grid h-8 w-8 place-items-center rounded-md ${colors[tone]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}

function Legend({ items }: { items: { label: string; color: string; value: number }[] }) {
  return (
    <div className="mt-3 flex flex-wrap justify-center gap-3 text-xs">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: i.color }} />
          <span className="text-muted-foreground">{i.label}</span>
          <span className="font-medium">{i.value}</span>
        </span>
      ))}
    </div>
  );
}
