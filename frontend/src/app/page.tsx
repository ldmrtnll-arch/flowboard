import Link from "next/link";


export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <section className="w-full max-w-3xl text-center">
        <p className="text-sm font-semibold tracking-[0.2em] text-indigo-600 uppercase">
          Work management
        </p>
        <h1 className="mt-5 text-5xl font-semibold tracking-tight text-slate-950 sm:text-7xl">
          FlowBoard
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">
          A focused workspace for organizing projects and moving work forward
          with clarity.
        </p>
        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/login"
            className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-500"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
          >
            Create account
          </Link>
        </div>
      </section>
    </main>
  );
}
