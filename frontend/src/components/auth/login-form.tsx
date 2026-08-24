"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { readAuthError } from "@/lib/auth/client";
import { loginSchema, type LoginInput } from "@/lib/auth/schemas";


type LoginFormProps = {
  accountCreated: boolean;
};

const inputClassName =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100";

export function LoginForm({ accountCreated }: LoginFormProps) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginInput) {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const error = await readAuthError(response);
        if (error.errors?.email?.[0]) {
          setError("email", { type: "server", message: error.errors.email[0] });
        }
        if (error.errors?.password?.[0]) {
          setError("password", {
            type: "server",
            message: error.errors.password[0],
          });
        }
        setError("root.server", { type: "server", message: error.message });
        return;
      }

      router.replace("/dashboard");
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
      {accountCreated ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
          Account created successfully. Sign in to continue.
        </p>
      ) : null}

      {errors.root?.server ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {errors.root.server.message}
        </p>
      ) : null}

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
          autoComplete="current-password"
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? "password-error" : undefined}
        />
        {errors.password ? (
          <p className="mt-2 text-sm text-red-700" id="password-error">
            {errors.password.message}
          </p>
        ) : null}
      </div>

      <button
        className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
