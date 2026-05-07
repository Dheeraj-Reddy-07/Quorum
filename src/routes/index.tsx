import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { ArrowRight, Kanban, Activity, Users, BarChart3, Bell, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { user } = useAuth();
  if (user) return <Navigate to="/app" />;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <Logo />
          <span className="text-sm font-semibold tracking-tight">Quorum</span>
        </div>
        <nav className="flex items-center gap-3 text-sm">
          <Link to="/login" className="text-muted-foreground hover:text-foreground">Sign in</Link>
          <Link to="/signup" className="rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground hover:opacity-90">
            Get started
          </Link>
        </nav>
      </header>

      <section className="mx-auto max-w-5xl px-6 pt-16 pb-12 text-center anim-fade-in">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3 text-primary" /> Built for teams that ship
        </span>
        <h1 className="mt-6 text-5xl font-semibold tracking-tight md:text-6xl">
          Ship projects,<br />
          <span className="bg-gradient-to-r from-primary to-sky-300 bg-clip-text text-transparent">not chaos.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
          Quorum is a focused project & task manager for product teams. Kanban boards, real-time updates,
          deadline tracking, and analytics. All in one calm, fast workspace.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/signup" className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90">
            Start your workspace <ArrowRight className="h-4 w-4" />
          </Link>
          <Link to="/login" className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-5 py-2.5 text-sm font-medium hover:bg-accent">
            Sign in
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="rounded-2xl border border-border bg-surface p-3">
          <div className="rounded-xl border border-border bg-background p-6">
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { icon: Kanban, title: "Kanban that flows", desc: "Drag-and-drop boards with priorities, blockers, and due dates." },
                { icon: Activity, title: "Live activity", desc: "Every status change, comment, and assignment in real time." },
                { icon: BarChart3, title: "Analytics built-in", desc: "Workload, throughput, and priority distribution charts." },
                { icon: Users, title: "Roles done right", desc: "Per-project ADMIN and MEMBER roles. Clean RBAC." },
                { icon: Bell, title: "Mentions & alerts", desc: "@mention teammates and never miss a deadline." },
                { icon: Sparkles, title: "Quick add (N)", desc: "Press N anywhere to create a task in seconds." },
              ].map((f) => (
                <div key={f.title} className="rounded-lg border border-border bg-surface-2/40 p-4">
                  <f.icon className="h-5 w-5 text-primary" />
                  <h3 className="mt-3 text-sm font-semibold">{f.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Quorum. Built for teams that ship.
      </footer>
    </div>
  );
}

function Logo() {
  return (
    <div className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-primary to-sky-400 text-[11px] font-bold text-primary-foreground">
      Q
    </div>
  );
}
