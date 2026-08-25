"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AppHeader } from "@/components/layout/app-header";
import { authUserSchema } from "@/lib/auth/schemas";
import type { AuthUser } from "@/lib/types/auth";


export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadUser() {
      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (response.status === 401) {
          router.replace("/login");
          router.refresh();
          return;
        }

        if (!response.ok) {
          setError("Unable to load your workspace. Please try again.");
          return;
        }

        const result = authUserSchema.safeParse(await response.json());
        if (!result.success) {
          setError("Unable to load your workspace. Please try again.");
          return;
        }

        setUser(result.data);
      } catch (requestError) {
        if (requestError instanceof Error && requestError.name === "AbortError") {
          return;
        }
        setError("Unable to connect to the server. Please try again.");
      }
    }

    void loadUser();
    return () => controller.abort();
  }, [router]);

  return (
    <main className="min-h-screen px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-5xl">
        <AppHeader />

        <section className="py-16">
          {!user && !error ? (
            <p className="text-sm text-slate-500" role="status">
              Loading your workspace...
            </p>
          ) : null}

          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}

          {user ? (
            <div className="max-w-2xl">
              <p className="text-sm font-medium text-slate-500">Your workspace</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
                Welcome{user.first_name ? `, ${user.first_name}` : ""}.
              </h1>
              <p className="mt-3 text-slate-600">Signed in as {user.email}</p>
              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                <Link href="/clients" className="rounded-2xl border border-slate-200 bg-white p-6 hover:border-indigo-300">
                  <h2 className="font-semibold text-slate-900">Clients</h2>
                  <p className="mt-2 leading-7 text-slate-600">Organize contact details and relationships.</p>
                </Link>
                <Link href="/projects" className="rounded-2xl border border-slate-200 bg-white p-6 hover:border-indigo-300">
                  <h2 className="font-semibold text-slate-900">Projects</h2>
                  <p className="mt-2 leading-7 text-slate-600">Manage client work through project Kanban boards.</p>
                </Link>
                <Link href="/tasks" className="rounded-2xl border border-slate-200 bg-white p-6 hover:border-indigo-300">
                  <h2 className="font-semibold text-slate-900">Tasks</h2>
                  <p className="mt-2 leading-7 text-slate-600">Track actionable work across projects.</p>
                </Link>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
