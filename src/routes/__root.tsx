import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Menu, X, Compass, ArrowUpRight } from "lucide-react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AiChatLauncher } from "../components/AiChat";
import { SavedTripsChip } from "../components/SavedTripsChip";
import { useAuth, signOut } from "../hooks/useAuth";
import { TripSync } from "../components/TripSync";


const NAV = [
  { to: "/dream",    label: "Dream",    dot: "bg-pink-500" },
  { to: "/analyze",  label: "Analyze",  dot: "bg-orange-500" },
  { to: "/plan",     label: "Plan",     dot: "bg-indigo-500" },
  { to: "/optimize", label: "Optimize", dot: "bg-emerald-500" },
  { to: "/sightsee", label: "Sightsee", dot: "bg-rose-500" },
  { to: "/book",     label: "Book",     dot: "bg-violet-500" },
  { to: "/travel",   label: "Travel",   dot: "bg-cyan-500" },
] as const;

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-bold tracking-tight text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          That trail led nowhere. Let's get you back on the map.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition hover:opacity-90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">Try again, or head home.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition hover:opacity-90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground transition hover:bg-secondary"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "WanderCompanion — Dream, plan and travel India" },
      {
        name: "description",
        content:
          "Discover, plan and optimize Indian trips with smart engines: recommendations, costs, routes, hotels, flights & trains.",
      },
      { property: "og:title", content: "WanderCompanion — Dream, plan and travel India" },
      {
        property: "og:description",
        content: "Smart, hardcoded travel engines. No subscriptions, no signups.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap",
      },
      {
        rel: "stylesheet",
        href: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
        integrity: "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=",
        crossOrigin: "",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { user, displayName } = useAuth();

  useEffect(() => {
    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "light";
    localStorage.setItem("wc.theme", "light");
  }, []);

  const logout = () => {
    void signOut();
  };


  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 sm:py-4 md:flex md:justify-between">
        <Link to="/" className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-foreground text-background shadow-soft">
            <Compass className="h-4.5 w-4.5" strokeWidth={2.25} />
          </span>
          <span className="truncate font-display text-[17px] font-bold tracking-tight text-foreground">
            WanderCompanion
          </span>
        </Link>

        <nav className="hidden items-center gap-0.5 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium text-foreground/70 transition hover:bg-secondary hover:text-foreground"
              activeProps={{
                className:
                  "inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-[13px] font-semibold text-foreground",
              }}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${n.dot}`} />
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end">
                <span className="text-xs font-bold text-foreground">{displayName}</span>
                <button onClick={logout} className="text-[10px] font-semibold text-muted-foreground hover:text-foreground">Logout</button>
              </div>
              <div className="h-8 w-8 rounded-full bg-brand text-background grid place-items-center font-bold text-xs shadow-soft">
                {displayName[0]?.toUpperCase()}
              </div>
            </div>
          ) : (
            <Link
              to="/auth"
              className="text-sm font-semibold text-foreground/80 hover:text-foreground"
            >
              Log in
            </Link>
          )}

          <Link
            to="/dream"
            className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-[12.5px] font-semibold text-background transition hover:opacity-90"
          >
            Start planning <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <button
          aria-label="Toggle menu"
          onClick={() => setOpen((o) => !o)}
          className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground md:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <nav className="border-t border-border bg-background md:hidden">
          <ul className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3">
            {NAV.map((n) => (
              <li key={n.to}>
                <Link
                  to={n.to}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/80 hover:bg-secondary"
                  activeProps={{
                    className:
                      "flex items-center gap-2 rounded-lg bg-secondary px-3 py-2.5 text-sm font-semibold text-foreground",
                  }}
                >
                  <span className={`h-2 w-2 rounded-full ${n.dot}`} />
                  {n.label}
                </Link>
              </li>
            ))}
            <li className="pt-2">
              {user ? (
                <button
                  onClick={() => {
                    logout();
                    setOpen(false);
                  }}
                  className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-foreground/80 hover:bg-secondary"
                >
                  Log out ({displayName})
                </button>
              ) : (
                <Link
                  to="/auth"
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/80 hover:bg-secondary"
                >
                  Log in / Sign up
                </Link>
              )}
            </li>
            <li className="pt-1">
              <Link
                to="/dream"
                onClick={() => setOpen(false)}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-foreground px-4 py-2.5 text-sm font-semibold text-background"
              >
                Start planning <ArrowUpRight className="h-4 w-4" />
              </Link>
            </li>

          </ul>
        </nav>
      )}
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-border bg-secondary/40">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 text-sm sm:grid-cols-3">
        <div>
          <div className="flex items-center gap-2 font-display font-bold">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-foreground text-background">
              <Compass className="h-4 w-4" />
            </span>
            WanderCompanion
          </div>
          <p className="mt-3 text-muted-foreground">
            A travel guide and itinerary maker powered by transparent, offline engines. No accounts, no tracking.
          </p>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-foreground">Explore</div>
          <ul className="mt-3 space-y-2 text-muted-foreground">
            {NAV.slice(0, 4).map((n) => (
              <li key={n.to}>
                <Link to={n.to} className="hover:text-foreground">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-foreground">Trip tools</div>
          <ul className="mt-3 space-y-2 text-muted-foreground">
            {NAV.slice(4).map((n) => (
              <li key={n.to}>
                <Link to={n.to} className="hover:text-foreground">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} WanderCompanion. Crafted for travelers.
      </div>
    </footer>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen flex-col bg-background">
        <SiteHeader />
        <main className="flex-1">
          <Outlet />
        </main>
        <SiteFooter />
        <AiChatLauncher />
        <SavedTripsChip />
        <TripSync />

      </div>
    </QueryClientProvider>
  );
}
