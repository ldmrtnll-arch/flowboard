import { ClientForm } from "@/components/clients/client-form";
import { AppHeader } from "@/components/layout/app-header";


export default function NewClientPage() {
  return (
    <main className="min-h-screen px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-5xl">
        <AppHeader />
        <section className="py-12">
          <p className="text-sm font-medium text-slate-500">Clients</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">
            New client
          </h1>
          <p className="mt-3 text-slate-600">
            Add the essential contact details. You can update them later.
          </p>
          <ClientForm mode="create" />
        </section>
      </div>
    </main>
  );
}
