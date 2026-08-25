import { AppHeader } from "@/components/layout/app-header";
import { ProjectForm } from "@/components/projects/project-form";


export default function NewProjectPage() {
  return (
    <main className="min-h-screen px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-5xl">
        <AppHeader />
        <section className="py-12">
          <p className="text-sm font-medium text-slate-500">Projects</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">New project</h1>
          <p className="mt-3 text-slate-600">Create a project for one of your clients.</p>
          <ProjectForm mode="create" />
        </section>
      </div>
    </main>
  );
}
