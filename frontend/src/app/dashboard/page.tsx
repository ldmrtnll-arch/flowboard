"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { authUserSchema } from "@/lib/auth/schemas";
import type { AuthUser } from "@/lib/types/auth";


export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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

  async function logout() {
    setIsLoggingOut(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        setError("Unable to sign out. Please try again.");
        setIsLoggingOut(false);
        return;
      }

      setUser(null);
      router.replace("/login");
      router.refresh();
    } catch {
      setError("Unable to connect to the server. Please try again.");
      setIsLoggingOut(false);
    }
  }

  return (
    <main className="min-h-screen px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between border-b border-slate-200 pb-6">
          <span className="text-sm font-semibold tracking-[0.18em] text-indigo-600 uppercase">
            FlowBoard
          </span>
          <button
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            onClick={logout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? "Signing out..." : "Sign out"}
          </button>
        </header>

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
              <div className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white p-8">
                <h2 className="font-semibold text-slate-900">A clear place to begin</h2>
                <p className="mt-2 leading-7 text-slate-600">
                  Your project workspace will be built here in the next stage.
                </p>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
