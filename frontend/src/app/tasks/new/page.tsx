import { AppHeader } from "@/components/layout/app-header";
import { TaskForm } from "@/components/tasks/task-form";


export default function NewTaskPage() {
  return <main className="min-h-screen px-6 py-10 sm:px-10"><div className="mx-auto max-w-5xl">
    <AppHeader />
    <section className="py-12">
      <p className="text-sm font-medium text-slate-500">Tasks</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">New task</h1>
      <p className="mt-3 text-slate-600">Add actionable work to one of your projects.</p>
      <TaskForm mode="create" />
    </section>
  </div></main>;
}
