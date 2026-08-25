"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { TaskForm } from "@/components/tasks/task-form";
import { taskSchema } from "@/lib/tasks/schemas";
import type { Task } from "@/lib/types/task";


export function EditTask({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function loadTask() {
      try {
        const response = await fetch(`/api/tasks/${taskId}`, { cache: "no-store", signal: controller.signal });
        if (response.status === 401) {
          router.replace("/login");
          router.refresh();
          return;
        }
        if (response.status === 404) {
          setNotFound(true);
          return;
        }
        if (!response.ok) {
          setError("Unable to load this task. Please try again.");
          return;
        }
        const result = taskSchema.safeParse(await response.json());
        if (!result.success) {
          setError("Unable to load this task. Please try again.");
          return;
        }
        setTask(result.data);
      } catch (requestError) {
        if (requestError instanceof Error && requestError.name === "AbortError") return;
        setError("Unable to connect to the server. Please try again.");
      }
    }
    void loadTask();
    return () => controller.abort();
  }, [router, taskId]);

  if (notFound) return <p className="mt-8 rounded-xl border border-slate-200 bg-white p-6 text-slate-700">Task not found or unavailable.</p>;
  if (error) return <p className="mt-8 rounded-xl border border-red-200 bg-red-50 p-6 text-red-700" role="alert">{error}</p>;
  if (!task) return <p className="mt-8 text-sm text-slate-500" role="status">Loading task...</p>;

  return <TaskForm mode="edit" taskId={task.id} initialValues={{
    project: task.project,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    assignee: task.assignee ?? "",
    due_date: task.due_date ?? "",
  }} />;
}
