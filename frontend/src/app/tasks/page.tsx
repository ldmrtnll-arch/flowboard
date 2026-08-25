"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AppHeader } from "@/components/layout/app-header";
import { tasksSchema } from "@/lib/tasks/schemas";
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  type Task,
} from "@/lib/types/task";


function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`));
}

export default function TasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function loadTasks() {
      try {
        const response = await fetch("/api/tasks", { cache: "no-store", signal: controller.signal });
        if (response.status === 401) {
          router.replace("/login");
          router.refresh();
          return;
        }
        if (!response.ok) {
          setError("Unable to load tasks. Please try again.");
          return;
        }
        const result = tasksSchema.safeParse(await response.json());
        if (!result.success) {
          setError("Unable to load tasks. Please try again.");
          return;
        }
        setTasks(result.data);
      } catch (requestError) {
        if (requestError instanceof Error && requestError.name === "AbortError") return;
        setError("Unable to connect to the server. Please try again.");
      }
    }
    void loadTasks();
    return () => controller.abort();
  }, [router]);

  async function deleteTask(task: Task) {
    if (!window.confirm(`Delete ${task.title}? This action cannot be undone.`)) return;
    setDeletingId(task.id);
    setError(null);
    try {
      const response = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      if (response.status === 401) {
        router.replace("/login");
        router.refresh();
        return;
      }
      if (!response.ok) {
        setError("Unable to delete this task. Please try again.");
        return;
      }
      setTasks((current) => current?.filter((item) => item.id !== task.id) ?? current);
    } catch {
      setError("Unable to connect to the server. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  return <main className="min-h-screen px-6 py-10 sm:px-10"><div className="mx-auto max-w-5xl">
    <AppHeader />
    <section className="py-12">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-slate-500">Execution</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">Tasks</h1>
          <p className="mt-3 max-w-2xl leading-7 text-slate-600">Manage actionable work across your projects.</p>
        </div>
        <Link href="/tasks/new" className="rounded-xl bg-indigo-600 px-5 py-3 text-center font-semibold text-white hover:bg-indigo-500">New task</Link>
      </div>

      {error ? <p className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p> : null}
      {tasks === null && !error ? <p className="mt-8 text-sm text-slate-500" role="status">Loading tasks...</p> : null}
      {tasks?.length === 0 ? <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <h2 className="text-lg font-semibold text-slate-900">No tasks yet.</h2>
        <p className="mt-2 text-slate-600">Create a task to start tracking project work.</p>
        <Link href="/tasks/new" className="mt-6 inline-block rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-500">Create your first task</Link>
      </div> : null}

      {tasks && tasks.length > 0 ? <ul className="mt-8 grid gap-4">{tasks.map((task) => <li key={task.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-semibold text-slate-950">{task.title}</h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{TASK_STATUS_LABELS[task.status]}</span>
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">{TASK_PRIORITY_LABELS[task.priority]}</span>
            </div>
            <p className="mt-2 text-sm font-medium text-indigo-700">{task.project_name} — {task.client_name}</p>
            <p className="mt-2 text-sm text-slate-500">{task.assignee ? "Assigned to me" : "Unassigned"}{task.due_date ? ` · Due ${formatDate(task.due_date)}` : ""}</p>
          </div>
          <div className="flex gap-2">
            <Link href={`/tasks/${task.id}/edit`} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Edit</Link>
            <button className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60" type="button" onClick={() => deleteTask(task)} disabled={deletingId === task.id} aria-label={`Delete ${task.title}`}>{deletingId === task.id ? "Deleting..." : "Delete"}</button>
          </div>
        </div>
      </li>)}</ul> : null}
    </section>
  </div></main>;
}
