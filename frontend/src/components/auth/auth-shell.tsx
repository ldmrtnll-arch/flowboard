import Link from "next/link";
import type { ReactNode } from "react";


type AuthShellProps = {
  title: string;
  description: string;
  footerText: string;
  footerLinkLabel: string;
  footerHref: string;
  children: ReactNode;
};

export function AuthShell({
  title,
  description,
  footerText,
  footerLinkLabel,
  footerHref,
  children,
}: AuthShellProps) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/50 sm:p-10">
        <Link
          href="/"
          className="text-sm font-semibold tracking-[0.18em] text-indigo-600 uppercase"
        >
          FlowBoard
        </Link>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-slate-950">
          {title}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>

        <div className="mt-8">{children}</div>

        <p className="mt-8 text-center text-sm text-slate-600">
          {footerText}{" "}
          <Link className="font-semibold text-indigo-600 hover:text-indigo-500" href={footerHref}>
            {footerLinkLabel}
          </Link>
        </p>
      </section>
    </main>
  );
}
