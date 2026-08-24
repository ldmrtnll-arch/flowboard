export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <section className="w-full max-w-2xl text-center">
        <p className="mb-4 text-sm font-medium tracking-[0.2em] text-slate-500 uppercase">
          Work management
        </p>
        <h1 className="text-5xl font-semibold tracking-tight text-slate-950 sm:text-6xl">
          FlowBoard
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-slate-600">
          A platform for managing projects and tasks with clarity and focus.
        </p>
        <p className="mt-10 text-sm text-slate-400">Currently in development.</p>
      </section>
    </main>
  );
}
