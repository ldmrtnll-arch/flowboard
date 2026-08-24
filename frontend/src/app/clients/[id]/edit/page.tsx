import { EditClient } from "@/components/clients/edit-client";
import { AppHeader } from "@/components/layout/app-header";


type EditClientPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditClientPage({ params }: EditClientPageProps) {
  const { id } = await params;

  return (
    <main className="min-h-screen px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-5xl">
        <AppHeader />
        <section className="py-12">
          <p className="text-sm font-medium text-slate-500">Clients</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">
            Edit client
          </h1>
          <p className="mt-3 text-slate-600">
            Keep contact details accurate and useful for your work.
          </p>
          <EditClient clientId={id} />
        </section>
      </div>
    </main>
  );
}
