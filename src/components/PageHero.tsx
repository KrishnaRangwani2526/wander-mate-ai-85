import { type ReactNode } from "react";

interface PageHeroProps {
  eyebrow: string;
  title: ReactNode;
  description: string;
  icon?: ReactNode;
}

export function PageHero({ eyebrow, title, description, icon }: PageHeroProps) {
  return (
    <section className="relative isolate overflow-hidden border-b border-border bg-gradient-to-br from-secondary/70 via-background to-background">
      <div className="pointer-events-none absolute -right-24 -top-28 -z-10 h-72 w-72 rounded-full bg-brand/5 blur-3xl" />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
        <div className="flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
          {icon && (
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
              {icon}
            </span>
          )}
          <span>{eyebrow}</span>
        </div>
        <h1 className="mt-4 max-w-3xl font-display text-3xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-5xl">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground sm:text-base">
          {description}
        </p>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
    </section>
  );
}
