"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { readClientError } from "@/lib/clients/client";
import {
  clientInputSchema,
  type ClientFormValues,
  type ClientInput,
} from "@/lib/clients/schemas";


type ClientFormProps = {
  mode: "create" | "edit";
  clientId?: number;
  initialValues?: ClientFormValues;
};

const emptyValues: ClientFormValues = {
  name: "",
  email: "",
  phone: "",
  notes: "",
};

const inputClassName =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100";

export function ClientForm({ mode, clientId, initialValues }: ClientFormProps) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ClientInput>({
    resolver: zodResolver(clientInputSchema),
    defaultValues: initialValues ?? emptyValues,
  });

  async function onSubmit(values: ClientInput) {
    const url = mode === "create" ? "/api/clients" : `/api/clients/${clientId}`;
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
        const error = await readClientError(response);
        for (const field of ["name", "email", "phone", "notes"] as const) {
          const message = error.errors?.[field]?.[0];
          if (message) {
            setError(field, { type: "server", message });
          }
        }
        setError("root.server", { type: "server", message: error.message });
        return;
      }

      router.replace("/clients");
      router.refresh();
    } catch {
      setError("root.server", {
        type: "network",
        message: "Unable to connect to the server. Please try again.",
      });
    }
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
        <label className="text-sm font-medium text-slate-800" htmlFor="client-name">
          Name
        </label>
        <input
          {...register("name")}
          className={inputClassName}
          id="client-name"
          type="text"
          autoComplete="organization"
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "client-name-error" : undefined}
        />
        {errors.name ? (
          <p className="mt-2 text-sm text-red-700" id="client-name-error">
            {errors.name.message}
          </p>
        ) : null}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-slate-800" htmlFor="client-email">
            Email
          </label>
          <input
            {...register("email")}
            className={inputClassName}
            id="client-email"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "client-email-error" : undefined}
          />
          {errors.email ? (
            <p className="mt-2 text-sm text-red-700" id="client-email-error">
              {errors.email.message}
            </p>
          ) : null}
        </div>

        <div>
          <label className="text-sm font-medium text-slate-800" htmlFor="client-phone">
            Phone
          </label>
          <input
            {...register("phone")}
            className={inputClassName}
            id="client-phone"
            type="tel"
            autoComplete="tel"
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? "client-phone-error" : undefined}
          />
          {errors.phone ? (
            <p className="mt-2 text-sm text-red-700" id="client-phone-error">
              {errors.phone.message}
            </p>
          ) : null}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-slate-800" htmlFor="client-notes">
          Notes
        </label>
        <textarea
          {...register("notes")}
          className={`${inputClassName} min-h-32 resize-y`}
          id="client-notes"
          aria-invalid={Boolean(errors.notes)}
          aria-describedby={errors.notes ? "client-notes-error" : undefined}
        />
        {errors.notes ? (
          <p className="mt-2 text-sm text-red-700" id="client-notes-error">
            {errors.notes.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
        <Link
          href="/clients"
          className="rounded-xl border border-slate-300 px-5 py-3 text-center font-semibold text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </Link>
        <button
          className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? mode === "create"
              ? "Creating..."
              : "Saving..."
            : mode === "create"
              ? "Create client"
              : "Save changes"}
        </button>
      </div>
    </form>
  );
}
