"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { authUserSchema } from "@/lib/auth/schemas";
import { projectsSchema } from "@/lib/projects/schemas";
import { readTaskError } from "@/lib/tasks/client";
import {
  taskInputSchema,
  type TaskFormInput,
  type TaskFormValues,
  type TaskInput,
} from "@/lib/tasks/schemas";
import type { AuthUser } from "@/lib/types/auth";
import type { Project } from "@/lib/types/project";
import {
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
} from "@/lib/types/task";


type TaskFormProps = {
  mode: "create" | "edit";
  taskId?: number;
  initialValues?: TaskFormValues;
};

const emptyValues: TaskFormValues = {
  project: 0,
  title: "",
  description: "",
  status: "backlog",
  priority: "medium",
  assignee: "",
  due_date: "",
};

const inputClassName =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100";

export function TaskForm({ mode, taskId, initialValues }: TaskFormProps) {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [prerequisiteError, setPrerequisiteError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormInput, unknown, TaskInput>({
    resolver: zodResolver(taskInputSchema),
    defaultValues: initialValues ?? emptyValues,
  });

  useEffect(() => {
    const controller = new AbortController();
    async function loadPrerequisites() {
      try {
        const [projectsResponse, userResponse] = await Promise.all([
          fetch("/api/projects", { cache: "no-store", signal: controller.signal }),
          fetch("/api/auth/me", { cache: "no-store", signal: controller.signal }),
        ]);
        if (projectsResponse.status === 401 || userResponse.status === 401) {
          router.replace("/login");
          router.refresh();
          return;
        }
        if (!projectsResponse.ok || !userResponse.ok) {
          setPrerequisiteError("Unable to load task options. Please try again.");
          return;
        }
        const projectsResult = projectsSchema.safeParse(await projectsResponse.json());
        const userResult = authUserSchema.safeParse(await userResponse.json());
        if (!projectsResult.success || !userResult.success) {
          setPrerequisiteError("Unable to load task options. Please try again.");
          return;
        }
        setProjects(projectsResult.data);
        setUser(userResult.data);
      } catch (requestError) {
        if (requestError instanceof Error && requestError.name === "AbortError") return;
        setPrerequisiteError("Unable to connect to the server. Please try again.");
      }
    }
    void loadPrerequisites();
    return () => controller.abort();
  }, [router]);

  async function onSubmit(values: TaskInput) {
    const url = mode === "create" ? "/api/tasks" : `/api/tasks/${taskId}`;
    const method = mode === "create" ? "POST" : "PATCH";
    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (response.status === 401) {
        router.replace("/login");
        router.refresh();
        return;
      }
      if (!response.ok) {
        const error = await readTaskError(response);
        for (const field of [
          "project", "title", "description", "status", "priority", "assignee", "due_date",
        ] as const) {
          const message = error.errors?.[field]?.[0];
          if (message) setError(field, { type: "server", message });
        }
        setError("root.server", { type: "server", message: error.message });
        return;
      }
      router.replace("/tasks");
      router.refresh();
    } catch {
      setError("root.server", {
        type: "network",
        message: "Unable to connect to the server. Please try again.",
      });
    }
  }

  if (prerequisiteError) {
    return <p className="mt-8 rounded-xl border border-red-200 bg-red-50 p-6 text-red-700" role="alert">{prerequisiteError}</p>;
  }
  if (projects === null || user === null) {
    return <p className="mt-8 text-sm text-slate-500" role="status">Loading task options...</p>;
  }
  if (projects.length === 0) {
    return (
      <div className="mt-8 max-w-2xl rounded-2xl border border-dashed border-slate-300 bg-white p-8">
        <h2 className="text-lg font-semibold text-slate-900">You need a project before creating a task.</h2>
        <p className="mt-2 text-slate-600">Tasks must belong to one of your projects.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/projects" className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50">View projects</Link>
          <Link href="/projects/new" className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-500">Create project</Link>
        </div>
      </div>
    );
  }

  return (
    <form className="mt-8 max-w-2xl space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8" onSubmit={handleSubmit(onSubmit)} noValidate>
      {errors.root?.server ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{errors.root.server.message}</p> : null}

      <div>
        <label className="text-sm font-medium text-slate-800" htmlFor="task-project">Project</label>
        <select {...register("project")} className={inputClassName} id="task-project" aria-invalid={Boolean(errors.project)}>
          <option value="">Select a project</option>
          {projects.map((project) => <option key={project.id} value={project.id}>{project.name} — {project.client_name}</option>)}
        </select>
        {errors.project ? <p className="mt-2 text-sm text-red-700">{errors.project.message}</p> : null}
      </div>

      <div>
        <label className="text-sm font-medium text-slate-800" htmlFor="task-title">Title</label>
        <input {...register("title")} className={inputClassName} id="task-title" type="text" aria-invalid={Boolean(errors.title)} />
        {errors.title ? <p className="mt-2 text-sm text-red-700">{errors.title.message}</p> : null}
      </div>

      <div>
        <label className="text-sm font-medium text-slate-800" htmlFor="task-description">Description</label>
        <textarea {...register("description")} className={`${inputClassName} min-h-32 resize-y`} id="task-description" aria-invalid={Boolean(errors.description)} />
        {errors.description ? <p className="mt-2 text-sm text-red-700">{errors.description.message}</p> : null}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-slate-800" htmlFor="task-status">Status</label>
          <select {...register("status")} className={inputClassName} id="task-status" aria-invalid={Boolean(errors.status)}>
            {TASK_STATUSES.map((status) => <option key={status} value={status}>{TASK_STATUS_LABELS[status]}</option>)}
          </select>
          {errors.status ? <p className="mt-2 text-sm text-red-700">{errors.status.message}</p> : null}
        </div>
        <div>
          <label className="text-sm font-medium text-slate-800" htmlFor="task-priority">Priority</label>
          <select {...register("priority")} className={inputClassName} id="task-priority" aria-invalid={Boolean(errors.priority)}>
            {TASK_PRIORITIES.map((priority) => <option key={priority} value={priority}>{TASK_PRIORITY_LABELS[priority]}</option>)}
          </select>
          {errors.priority ? <p className="mt-2 text-sm text-red-700">{errors.priority.message}</p> : null}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-slate-800" htmlFor="task-assignee">Assignee</label>
          <select {...register("assignee")} className={inputClassName} id="task-assignee" aria-invalid={Boolean(errors.assignee)}>
            <option value="">Unassigned</option>
            <option value={user.id}>Assigned to me</option>
          </select>
          {errors.assignee ? <p className="mt-2 text-sm text-red-700">{errors.assignee.message}</p> : null}
        </div>
        <div>
          <label className="text-sm font-medium text-slate-800" htmlFor="task-due-date">Due date</label>
          <input {...register("due_date")} className={inputClassName} id="task-due-date" type="date" aria-invalid={Boolean(errors.due_date)} />
          {errors.due_date ? <p className="mt-2 text-sm text-red-700">{errors.due_date.message}</p> : null}
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
        <Link href="/tasks" className="rounded-xl border border-slate-300 px-5 py-3 text-center font-semibold text-slate-700 hover:bg-slate-50">Cancel</Link>
        <button className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={isSubmitting}>
          {isSubmitting ? (mode === "create" ? "Creating..." : "Saving...") : (mode === "create" ? "Create task" : "Save changes")}
        </button>
      </div>
    </form>
  );
}
