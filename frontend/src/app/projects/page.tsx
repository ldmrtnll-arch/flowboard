"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AppHeader } from "@/components/layout/app-header";
import { projectsSchema } from "@/lib/projects/schemas";
import {
  PROJECT_STATUS_LABELS,
  type Project,
} from "@/lib/types/project";


function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
    new Date(`${value}T00:00:00`),
  );
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function loadProjects() {
      try {
        const response = await fetch("/api/projects", { cache: "no-store", signal: controller.signal });
        if (response.status === 401) {
          router.replace("/login");
          router.refresh();
          return;
        }
        if (!response.ok) {
          setError("Unable to load projects. Please try again.");
          return;
        }
        const result = projectsSchema.safeParse(await response.json());
        if (!result.success) {
          setError("Unable to load projects. Please try again.");
          return;
        }
        setProjects(result.data);
      } catch (requestError) {
        if (requestError instanceof Error && requestError.name === "AbortError") return;
        setError("Unable to connect to the server. Please try again.");
      }
    }
    void loadProjects();
    return () => controller.abort();
  }, [router]);

  async function deleteProject(project: Project) {
    if (!window.confirm(`Delete ${project.name}? This action cannot be undone.`)) return;
    setDeletingId(project.id);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
      if (response.status === 401) {
        router.replace("/login");
        router.refresh();
        return;
      }
      if (!response.ok) {
        setError("Unable to delete this project. Please try again.");
        return;
      }
      setProjects((current) => current?.filter((item) => item.id !== project.id) ?? current);
    } catch {
      setError("Unable to connect to the server. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="min-h-screen px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-5xl">
        <AppHeader />
        <section className="py-12">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-medium text-slate-500">Delivery</p>
              <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">Projects</h1>
              <p className="mt-3 max-w-2xl leading-7 text-slate-600">Track the work connected to each client.</p>
            </div>
            <Link href="/projects/new" className="rounded-xl bg-indigo-600 px-5 py-3 text-center font-semibold text-white hover:bg-indigo-500">New project</Link>
          </div>

          {error ? <p className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p> : null}
          {projects === null && !error ? <p className="mt-8 text-sm text-slate-500" role="status">Loading projects...</p> : null}
          {projects?.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <h2 className="text-lg font-semibold text-slate-900">No projects yet.</h2>
              <p className="mt-2 text-slate-600">Create a project to start organizing client work.</p>
              <Link href="/projects/new" className="mt-6 inline-block rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-500">Create your first project</Link>
            </div>
          ) : null}

          {projects && projects.length > 0 ? (
            <ul className="mt-8 grid gap-4">
              {projects.map((project) => (
                <li key={project.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="truncate text-lg font-semibold text-slate-950">{project.name}</h2>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{PROJECT_STATUS_LABELS[project.status]}</span>
                      </div>
                      <p className="mt-2 text-sm font-medium text-indigo-700">{project.client_name}</p>
                      {project.start_date || project.due_date ? (
                        <p className="mt-2 text-sm text-slate-500">
                          {project.start_date ? `Starts ${formatDate(project.start_date)}` : "No start date"}
                          {" · "}
                          {project.due_date ? `Due ${formatDate(project.due_date)}` : "No due date"}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/projects/${project.id}/edit`} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Edit</Link>
                      <button
                        className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                        type="button"
                        onClick={() => deleteProject(project)}
                        disabled={deletingId === project.id}
                        aria-label={`Delete ${project.name}`}
                      >
                        {deletingId === project.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </div>
    </main>
  );
}
