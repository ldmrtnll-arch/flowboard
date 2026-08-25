"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ProjectForm } from "@/components/projects/project-form";
import { projectSchema } from "@/lib/projects/schemas";
import type { Project } from "@/lib/types/project";


export function EditProject({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProject() {
      try {
        const response = await fetch(`/api/projects/${projectId}`, {
          cache: "no-store",
          signal: controller.signal,
        });
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
          setError("Unable to load this project. Please try again.");
          return;
        }

        const result = projectSchema.safeParse(await response.json());
        if (!result.success) {
          setError("Unable to load this project. Please try again.");
          return;
        }
        setProject(result.data);
      } catch (requestError) {
        if (requestError instanceof Error && requestError.name === "AbortError") return;
        setError("Unable to connect to the server. Please try again.");
      }
    }

    void loadProject();
    return () => controller.abort();
  }, [projectId, router]);

  if (notFound) return <p className="mt-8 rounded-xl border border-slate-200 bg-white p-6 text-slate-700">Project not found or unavailable.</p>;
  if (error) return <p className="mt-8 rounded-xl border border-red-200 bg-red-50 p-6 text-red-700" role="alert">{error}</p>;
  if (!project) return <p className="mt-8 text-sm text-slate-500" role="status">Loading project...</p>;

  return (
    <ProjectForm
      mode="edit"
      projectId={project.id}
      initialValues={{
        client: project.client,
        name: project.name,
        description: project.description,
        status: project.status,
        start_date: project.start_date ?? "",
        due_date: project.due_date ?? "",
      }}
    />
  );
}
