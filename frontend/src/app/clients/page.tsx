"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AppHeader } from "@/components/layout/app-header";
import { clientsSchema } from "@/lib/clients/schemas";
import type { Client } from "@/lib/types/client";


export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

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
          setError("Unable to load clients. Please try again.");
          return;
        }

        const result = clientsSchema.safeParse(await response.json());
        if (!result.success) {
          setError("Unable to load clients. Please try again.");
          return;
        }
        setClients(result.data);
      } catch (requestError) {
        if (requestError instanceof Error && requestError.name === "AbortError") {
          return;
        }
        setError("Unable to connect to the server. Please try again.");
      }
    }

    void loadClients();
    return () => controller.abort();
  }, [router]);

  async function deleteClient(client: Client) {
    if (!window.confirm(`Delete ${client.name}? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(client.id);
    setError(null);
    try {
      const response = await fetch(`/api/clients/${client.id}`, {
        method: "DELETE",
      });

      if (response.status === 401) {
        router.replace("/login");
        router.refresh();
        return;
      }
      if (!response.ok) {
        setError("Unable to delete this client. Please try again.");
        return;
      }

      setClients((current) =>
        current ? current.filter((item) => item.id !== client.id) : current,
      );
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
              <p className="text-sm font-medium text-slate-500">Relationships</p>
              <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">
                Clients
              </h1>
              <p className="mt-3 max-w-2xl leading-7 text-slate-600">
                Keep the people and organizations you work with in one clear place.
              </p>
            </div>
            <Link
              href="/clients/new"
              className="rounded-xl bg-indigo-600 px-5 py-3 text-center font-semibold text-white transition hover:bg-indigo-500"
            >
              New client
            </Link>
          </div>

          {error ? (
            <p className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}

          {clients === null && !error ? (
            <p className="mt-8 text-sm text-slate-500" role="status">
              Loading clients...
            </p>
          ) : null}

          {clients?.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <h2 className="text-lg font-semibold text-slate-900">No clients yet.</h2>
              <p className="mt-2 text-slate-600">
                Add your first client to begin organizing your relationships.
              </p>
              <Link
                href="/clients/new"
                className="mt-6 inline-block rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-500"
              >
                Create your first client
              </Link>
            </div>
          ) : null}

          {clients && clients.length > 0 ? (
            <ul className="mt-8 grid gap-4">
              {clients.map((client) => (
                <li
                  key={client.id}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-semibold text-slate-950">
                        {client.name}
                      </h2>
                      <div className="mt-2 space-y-1 text-sm text-slate-600">
                        {client.email ? <p>{client.email}</p> : null}
                        {client.phone ? <p>{client.phone}</p> : null}
                        {!client.email && !client.phone ? (
                          <p className="text-slate-400">No contact details</p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href={`/clients/${client.id}/edit`}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Edit
                      </Link>
                      <button
                        className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                        type="button"
                        onClick={() => deleteClient(client)}
                        disabled={deletingId === client.id}
                        aria-label={`Delete ${client.name}`}
                      >
                        {deletingId === client.id ? "Deleting..." : "Delete"}
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
