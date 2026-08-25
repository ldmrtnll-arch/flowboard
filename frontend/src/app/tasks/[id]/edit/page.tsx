import { AppHeader } from "@/components/layout/app-header";
import { EditTask } from "@/components/tasks/edit-task";


type EditTaskPageProps = { params: Promise<{ id: string }> };

export default async function EditTaskPage({ params }: EditTaskPageProps) {
  const { id } = await params;
  return <main className="min-h-screen px-6 py-10 sm:px-10"><div className="mx-auto max-w-5xl">
    <AppHeader />
    <section className="py-12">
      <p className="text-sm font-medium text-slate-500">Tasks</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">Edit task</h1>
      <p className="mt-3 text-slate-600">Keep task details and ownership accurate.</p>
      <EditTask taskId={id} />
    </section>
  </div></main>;
}
