import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useCreateProject } from "@/lib/store";
import { ChevronLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/projects/new")({ component: NewProject });

function NewProject() {
  const createProject = useCreateProject();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const p = await createProject.mutateAsync({ name: name.trim(), description: description.trim() });
      toast.success("Project created");
      navigate({ to: "/app/projects/$projectId", params: { projectId: p.id } });
    } catch (err: any) {
      toast.error("Failed to create project", { description: err?.message });
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Link to="/app/projects" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-3 w-3" /> Back to projects
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">New project</h1>
      <p className="mt-1 text-sm text-muted-foreground">Give your project a clear name and a short description.</p>

      <form onSubmit={submit} className="mt-6 space-y-4 rounded-xl border border-border bg-surface p-6">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required className="input" placeholder="e.g. Atlas Web Platform" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Description</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="input" placeholder="What is this project about?" />
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Link to="/app/projects" className="btn-ghost">Cancel</Link>
          <button type="submit" disabled={createProject.isPending} className="btn-primary inline-flex items-center gap-2">
            {createProject.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create project
          </button>
        </div>
      </form>
    </div>
  );
}
