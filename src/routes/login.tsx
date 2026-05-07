import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error, name } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast.error("Sign in failed", { description: error });
      return;
    }
    const firstName = name?.split(" ")[0];
    toast.success(firstName ? `Welcome back, ${firstName}!` : "Welcome back!");
    navigate({ to: "/app" });
  }

  async function tryDemo() {
    setLoading(true);
    const { error, name } = await signIn("demo@quorum.app", "demo1234");
    setLoading(false);
    if (error) {
      toast.error("Demo unavailable", { description: "Run the seed SQL first in Supabase." });
      return;
    }
    toast.success(`Welcome, ${name?.split(" ")[0] ?? "Aria"}! (Demo)`);
    navigate({ to: "/app" });
  }

  return (
    <AuthShell title="Sign in to Quorum" subtitle="Welcome back. Let's ship something today.">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            autoComplete="email"
            placeholder="you@company.com"
            className="input"
          />
        </Field>
        <Field label="Password">
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            className="input"
          />
        </Field>
        <button
          type="submit"
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Sign in
        </button>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <button
          type="button"
          onClick={tryDemo}
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-primary/40 bg-primary/10 py-2.5 text-sm font-medium text-primary hover:bg-primary/20 disabled:opacity-60 transition-colors"
        >
          <Sparkles className="h-4 w-4" />
          Try Demo — explore with sample data
        </button>
      </form>
      <p className="mt-5 text-center text-xs text-muted-foreground">
        Don't have an account?{" "}
        <Link to="/signup" className="text-primary hover:underline">
          Create one
        </Link>
      </p>
    </AuthShell>
  );
}

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex flex-col justify-between border-r border-border bg-surface p-10">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-primary to-sky-400 text-[11px] font-bold text-primary-foreground">
            Q
          </div>
          <span className="text-sm font-semibold">Quorum</span>
        </Link>
        <div>
          <h2 className="text-3xl font-semibold leading-tight">
            Ship projects,
            <br />
            not chaos.
          </h2>
          <p className="mt-3 max-w-md text-sm text-muted-foreground">
            Kanban boards, deadline tracking, and team analytics. Built for teams that move fast.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Quorum</p>
      </div>
      <div className="flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm anim-fade-in">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
