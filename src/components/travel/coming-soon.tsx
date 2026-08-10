import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Hammer, ArrowLeft } from "lucide-react";

export function ComingSoon({
  tag,
  title,
  blurb,
  bullets,
  gradient,
  next,
}: {
  tag: string;
  title: string;
  blurb: string;
  bullets: string[];
  gradient: string;
  next?: ReactNode;
}) {
  return (
    <div>
      <section className={`${gradient} px-4 py-16 text-white sm:py-20`}>
        <div className="mx-auto max-w-4xl">
          <Link to="/" className="inline-flex items-center gap-1 text-sm font-semibold text-white/90 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
          <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur">
            <Hammer className="h-3.5 w-3.5" /> {tag} · In progress
          </span>
          <h1 className="mt-3 text-4xl font-black sm:text-5xl">{title}</h1>
          <p className="mt-3 max-w-2xl text-white/90">{blurb}</p>
        </div>
      </section>
      <section className="mx-auto max-w-4xl px-4 py-12">
        <div className="shadow-card rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-bold">What this will do</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {bullets.map((b) => (
              <li key={b} className="flex gap-2">
                <span className="bg-sunset mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
          {next && <div className="mt-6 text-sm text-muted-foreground">{next}</div>}
        </div>
      </section>
    </div>
  );
}
