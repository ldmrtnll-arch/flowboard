"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ClientForm } from "@/components/clients/client-form";
import { clientSchema } from "@/lib/clients/schemas";
import type { Client } from "@/lib/types/client";


type EditClientProps = {
  clientId: string;
};

export function EditClient({ clientId }: EditClientProps) {
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadClient() {
      try {
        const response = await fetch(`/api/clients/${clientId}`, {
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
          setError("Unable to load this client. Please try again.");
          return;
        }

        const result = clientSchema.safeParse(await response.json());
        if (!result.success) {
          setError("Unable to load this client. Please try again.");
          return;
        }
        setClient(result.data);
      } catch (requestError) {
        if (requestError instanceof Error && requestError.name === "AbortError") {
          return;
        }
        setError("Unable to connect to the server. Please try again.");
      }
    }

    void loadClient();
    return () => controller.abort();
  }, [clientId, router]);

  if (notFound) {
    return (
      <p className="mt-8 rounded-xl border border-slate-200 bg-white p-6 text-slate-700">
        Client not found or unavailable.
      </p>
    );
  }

  if (error) {
    return (
      <p className="mt-8 rounded-xl border border-red-200 bg-red-50 p-6 text-red-700" role="alert">
        {error}
      </p>
    );
  }

  if (!client) {
    return (
      <p className="mt-8 text-sm text-slate-500" role="status">
        Loading client...
      </p>
    );
  }

  return (
    <ClientForm
      mode="edit"
      clientId={client.id}
      initialValues={{
        name: client.name,
        email: client.email,
        phone: client.phone,
        notes: client.notes,
      }}
    />
  );
}
