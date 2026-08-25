"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";


export function AppHeader() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      router.replace("/login");
      router.refresh();
    } catch {
      setError("Unable to connect to the server. Please try again.");
      setIsLoggingOut(false);
    }
  }

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <Link
          href="/dashboard"
          className="text-sm font-semibold tracking-[0.18em] text-indigo-600 uppercase"
        >
          FlowBoard
        </Link>
        <nav className="flex items-center gap-2" aria-label="Authenticated navigation">
          <Link
            href="/dashboard"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-white hover:text-slate-950"
          >
            Dashboard
          </Link>
          <Link
            href="/clients"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-white hover:text-slate-950"
          >
            Clients
          </Link>
          <Link
            href="/projects"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-white hover:text-slate-950"
          >
            Projects
          </Link>
          <button
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            onClick={logout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? "Signing out..." : "Sign out"}
          </button>
        </nav>
      </header>
      {error ? (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}
