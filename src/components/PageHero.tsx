import { type ReactNode } from "react";

interface PageHeroProps {
  eyebrow: string;
  title: ReactNode;
  description: string;
  icon?: ReactNode;
}

export function PageHero({ eyebrow, title, description, icon }: PageHeroProps) {
  return (
    <section className="relative overflow-hidden border-b border-border bg-hero">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
          {icon}
          <span>{eyebrow}</span>
        </div>
        <h1 className="mt-4 max-w-3xl font-display text-3xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-5xl">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground sm:text-base">
          {description}
        </p>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-px bg-brand opacity-60" />
    </section>
  );
}
