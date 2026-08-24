"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { readAuthError } from "@/lib/auth/client";
import { registerSchema, type RegisterInput } from "@/lib/auth/schemas";


const inputClassName =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100";

export function RegisterForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { first_name: "", last_name: "", email: "", password: "" },
  });

  async function onSubmit(values: RegisterInput) {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const error = await readAuthError(response);
        for (const field of ["first_name", "last_name", "email", "password"] as const) {
          const message = error.errors?.[field]?.[0];
          if (message) {
            setError(field, { type: "server", message });
          }
        }
        setError("root.server", { type: "server", message: error.message });
        return;
      }

      router.replace("/login?registered=1");
      router.refresh();
    } catch {
      setError("root.server", {
        type: "network",
        message: "Unable to connect to the server. Please try again.",
      });
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
      {errors.root?.server ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {errors.root.server.message}
        </p>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-slate-800" htmlFor="first_name">
            First name
          </label>
          <input
            {...register("first_name")}
            className={inputClassName}
            id="first_name"
            type="text"
            autoComplete="given-name"
            aria-invalid={Boolean(errors.first_name)}
            aria-describedby={errors.first_name ? "first-name-error" : undefined}
          />
          {errors.first_name ? (
            <p className="mt-2 text-sm text-red-700" id="first-name-error">
              {errors.first_name.message}
            </p>
          ) : null}
        </div>

        <div>
          <label className="text-sm font-medium text-slate-800" htmlFor="last_name">
            Last name
          </label>
          <input
            {...register("last_name")}
            className={inputClassName}
            id="last_name"
            type="text"
            autoComplete="family-name"
            aria-invalid={Boolean(errors.last_name)}
            aria-describedby={errors.last_name ? "last-name-error" : undefined}
          />
          {errors.last_name ? (
            <p className="mt-2 text-sm text-red-700" id="last-name-error">
              {errors.last_name.message}
            </p>
          ) : null}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-slate-800" htmlFor="email">
          Email
        </label>
        <input
          {...register("email")}
          className={inputClassName}
          id="email"
          type="email"
          autoComplete="email"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "email-error" : undefined}
        />
        {errors.email ? (
          <p className="mt-2 text-sm text-red-700" id="email-error">
            {errors.email.message}
          </p>
        ) : null}
      </div>

      <div>
        <label className="text-sm font-medium text-slate-800" htmlFor="password">
          Password
        </label>
        <input
          {...register("password")}
          className={inputClassName}
          id="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? "password-error" : undefined}
        />
        {errors.password ? (
          <p className="mt-2 text-sm text-red-700" id="password-error">
            {errors.password.message}
          </p>
        ) : (
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Use at least 8 characters. The server applies the final password rules.
          </p>
        )}
      </div>

      <button
        className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}
