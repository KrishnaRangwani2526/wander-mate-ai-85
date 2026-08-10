import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Compass, Mail, Lock, User as UserIcon, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — WanderCompanion travel copilot" },
      {
        name: "description",
        content:
          "Sign in with Google or email to save your trips, itineraries and AI chat history across devices on WanderCompanion.",
      },
      { property: "og:title", content: "Sign in — WanderCompanion travel copilot" },
      {
        property: "og:description",
        content: "Keep your trips, itineraries and AI conversations in one personal travel account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dream" });
  }, [user, loading, navigate]);

  async function google() {
    setErr(null);
    try {
      await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    } catch (e: any) {
      setErr(e?.message || "Google sign-in failed. Try email instead.");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        if (!data.session) setMsg("Check your email to confirm your account, then sign in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e: any) {
      setErr(e?.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    if (!email) return setErr("Enter your email first.");
    setErr(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setErr(error?.message ?? null);
    if (!error) setMsg("Password reset link sent — check your inbox.");
  }

  return (
    <div className="mx-auto flex min-h-[80vh] w-full max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-3xl border border-border bg-background p-6 shadow-card sm:p-8">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-foreground text-background">
            <Compass className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="text-xs text-muted-foreground">
              Your trips, itineraries and AI chats, saved to your account.
            </p>
          </div>
        </div>

        <button
          onClick={google}
          className="mb-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-secondary"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M23 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.2a5.3 5.3 0 0 1-2.3 3.5v2.9h3.7c2.2-2 3.4-5 3.4-8.6z" />
            <path fill="#34A853" d="M12 24c3.1 0 5.7-1 7.6-2.8l-3.7-2.9c-1 .7-2.3 1.1-3.9 1.1-3 0-5.5-2-6.4-4.7H1.8v3A12 12 0 0 0 12 24z" />
            <path fill="#FBBC05" d="M5.6 14.7a7.2 7.2 0 0 1 0-4.6v-3H1.8a12 12 0 0 0 0 10.6l3.8-3z" />
            <path fill="#EA4335" d="M12 4.8c1.7 0 3.2.6 4.4 1.7l3.3-3.3A11.6 11.6 0 0 0 12 0 12 12 0 0 0 1.8 6.1l3.8 3C6.5 6.7 9 4.8 12 4.8z" />
          </svg>
          Continue with Google
        </button>

        <div className="mb-4 flex items-center gap-3 text-[11px] uppercase tracking-wider text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> or email <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <Field icon={<UserIcon className="h-4 w-4" />}>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full bg-transparent text-sm outline-none"
              />
            </Field>
          )}
          <Field icon={<Mail className="h-4 w-4" />}>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="w-full bg-transparent text-sm outline-none"
            />
          </Field>
          <Field icon={<Lock className="h-4 w-4" />}>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (min 6 characters)"
              className="w-full bg-transparent text-sm outline-none"
            />
          </Field>

          {err && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{err}</p>}
          {msg && <p className="rounded-lg bg-secondary px-3 py-2 text-xs text-foreground">{msg}</p>}

          <button
            type="submit"
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition hover:opacity-90 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {mode === "signin" ? "Sign in" : "Create account"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-xs">
          <button
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="font-semibold text-foreground hover:underline"
          >
            {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
          </button>
          {mode === "signin" && (
            <button onClick={reset} className="text-muted-foreground hover:text-foreground">
              Forgot password?
            </button>
          )}
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        You can keep browsing without an account —{" "}
        <Link to="/dream" className="font-semibold text-foreground hover:underline">
          explore destinations
        </Link>
        .
      </p>
    </div>
  );
}

function Field({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-2 rounded-xl border border-border bg-secondary/40 px-3 py-2.5 text-muted-foreground focus-within:border-foreground/30">
      {icon}
      {children}
    </label>
  );
}
