"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { clientsSchema } from "@/lib/clients/schemas";
import { readProjectError } from "@/lib/projects/client";
import {
  projectInputSchema,
  type ProjectFormInput,
  type ProjectFormValues,
  type ProjectInput,
} from "@/lib/projects/schemas";
import type { Client } from "@/lib/types/client";
import {
  PROJECT_STATUSES,
  PROJECT_STATUS_LABELS,
} from "@/lib/types/project";


type ProjectFormProps = {
  mode: "create" | "edit";
  projectId?: number;
  initialValues?: ProjectFormValues;
};

const emptyValues: ProjectFormValues = {
  client: 0,
  name: "",
  description: "",
  status: "planning",
  start_date: "",
  due_date: "",
};

const inputClassName =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100";

export function ProjectForm({ mode, projectId, initialValues }: ProjectFormProps) {
  const router = useRouter();
  const [clients, setClients] = useState<Client[] | null>(null);
  const [clientsError, setClientsError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormInput, unknown, ProjectInput>({
    resolver: zodResolver(projectInputSchema),
    defaultValues: initialValues ?? emptyValues,
  });

  useEffect(() => {
    const controller = new AbortController();

    async function loadClients() {
      try {
        const response = await fetch("/api/clients", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (response.status === 401) {
          router.replace("/login");
          router.refresh();
          return;
        }
        if (!response.ok) {
          setClientsError("Unable to load clients. Please try again.");
          return;
        }

        const result = clientsSchema.safeParse(await response.json());
        if (!result.success) {
          setClientsError("Unable to load clients. Please try again.");
          return;
        }
        setClients(result.data);
      } catch (requestError) {
        if (requestError instanceof Error && requestError.name === "AbortError") return;
        setClientsError("Unable to connect to the server. Please try again.");
      }
    }

    void loadClients();
    return () => controller.abort();
  }, [router]);

  async function onSubmit(values: ProjectInput) {
    const url = mode === "create" ? "/api/projects" : `/api/projects/${projectId}`;
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
        const error = await readProjectError(response);
        for (const field of [
          "client",
          "name",
          "description",
          "status",
          "start_date",
          "due_date",
        ] as const) {
          const message = error.errors?.[field]?.[0];
          if (message) setError(field, { type: "server", message });
        }
        setError("root.server", { type: "server", message: error.message });
        return;
      }

      router.replace("/projects");
      router.refresh();
    } catch {
      setError("root.server", {
        type: "network",
        message: "Unable to connect to the server. Please try again.",
      });
    }
  }

  if (clientsError) {
    return (
      <p className="mt-8 rounded-xl border border-red-200 bg-red-50 p-6 text-red-700" role="alert">
        {clientsError}
      </p>
    );
  }

  if (clients === null) {
    return <p className="mt-8 text-sm text-slate-500" role="status">Loading clients...</p>;
  }

  if (clients.length === 0) {
    return (
      <div className="mt-8 max-w-2xl rounded-2xl border border-dashed border-slate-300 bg-white p-8">
        <h2 className="text-lg font-semibold text-slate-900">
          You need a client before creating a project.
        </h2>
        <p className="mt-2 text-slate-600">Projects must belong to one of your clients.</p>
        <Link
          href="/clients/new"
          className="mt-5 inline-block rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-500"
        >
          Create client
        </Link>
      </div>
    );
  }

  return (
    <form
      className="mt-8 max-w-2xl space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
    >
      {errors.root?.server ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {errors.root.server.message}
        </p>
      ) : null}

      <div>
        <label className="text-sm font-medium text-slate-800" htmlFor="project-client">Client</label>
        <select
          {...register("client")}
          className={inputClassName}
          id="project-client"
          aria-invalid={Boolean(errors.client)}
          aria-describedby={errors.client ? "project-client-error" : undefined}
        >
          <option value="">Select a client</option>
          {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
        </select>
        {errors.client ? <p className="mt-2 text-sm text-red-700" id="project-client-error">{errors.client.message}</p> : null}
      </div>

      <div>
        <label className="text-sm font-medium text-slate-800" htmlFor="project-name">Name</label>
        <input
          {...register("name")}
          className={inputClassName}
          id="project-name"
          type="text"
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "project-name-error" : undefined}
        />
        {errors.name ? <p className="mt-2 text-sm text-red-700" id="project-name-error">{errors.name.message}</p> : null}
      </div>

      <div>
        <label className="text-sm font-medium text-slate-800" htmlFor="project-description">Description</label>
        <textarea
          {...register("description")}
          className={`${inputClassName} min-h-32 resize-y`}
          id="project-description"
          aria-invalid={Boolean(errors.description)}
          aria-describedby={errors.description ? "project-description-error" : undefined}
        />
        {errors.description ? <p className="mt-2 text-sm text-red-700" id="project-description-error">{errors.description.message}</p> : null}
      </div>

      <div>
        <label className="text-sm font-medium text-slate-800" htmlFor="project-status">Status</label>
        <select
          {...register("status")}
          className={inputClassName}
          id="project-status"
          aria-invalid={Boolean(errors.status)}
          aria-describedby={errors.status ? "project-status-error" : undefined}
        >
          {PROJECT_STATUSES.map((status) => (
            <option key={status} value={status}>{PROJECT_STATUS_LABELS[status]}</option>
          ))}
        </select>
        {errors.status ? <p className="mt-2 text-sm text-red-700" id="project-status-error">{errors.status.message}</p> : null}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-slate-800" htmlFor="project-start-date">Start date</label>
          <input
            {...register("start_date")}
            className={inputClassName}
            id="project-start-date"
            type="date"
            aria-invalid={Boolean(errors.start_date)}
            aria-describedby={errors.start_date ? "project-start-date-error" : undefined}
          />
          {errors.start_date ? <p className="mt-2 text-sm text-red-700" id="project-start-date-error">{errors.start_date.message}</p> : null}
        </div>
        <div>
          <label className="text-sm font-medium text-slate-800" htmlFor="project-due-date">Due date</label>
          <input
            {...register("due_date")}
            className={inputClassName}
            id="project-due-date"
            type="date"
            aria-invalid={Boolean(errors.due_date)}
            aria-describedby={errors.due_date ? "project-due-date-error" : undefined}
          />
          {errors.due_date ? <p className="mt-2 text-sm text-red-700" id="project-due-date-error">{errors.due_date.message}</p> : null}
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
        <Link href="/projects" className="rounded-xl border border-slate-300 px-5 py-3 text-center font-semibold text-slate-700 hover:bg-slate-50">Cancel</Link>
        <button
          className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? (mode === "create" ? "Creating..." : "Saving...") : (mode === "create" ? "Create project" : "Save changes")}
        </button>
      </div>
    </form>
  );
}
