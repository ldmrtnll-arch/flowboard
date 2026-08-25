import { AppHeader } from "@/components/layout/app-header";
import { EditProject } from "@/components/projects/edit-project";


type EditProjectPageProps = { params: Promise<{ id: string }> };

export default async function EditProjectPage({ params }: EditProjectPageProps) {
  const { id } = await params;
  return (
    <main className="min-h-screen px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-5xl">
        <AppHeader />
        <section className="py-12">
          <p className="text-sm font-medium text-slate-500">Projects</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">Edit project</h1>
          <p className="mt-3 text-slate-600">Keep project details current.</p>
          <EditProject projectId={id} />
        </section>
      </div>
    </main>
  );
}
