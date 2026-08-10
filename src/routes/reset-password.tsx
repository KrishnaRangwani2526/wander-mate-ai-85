import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Lock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — WanderCompanion" },
      { name: "description", content: "Set a new password for your WanderCompanion travel account." },
      { property: "og:title", content: "Reset password — WanderCompanion" },
      { property: "og:description", content: "Set a new password for your WanderCompanion travel account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setReady(!!data.session));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) setErr(error.message);
    else navigate({ to: "/dream" });
  }

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-4">
      <form onSubmit={submit} className="rounded-3xl border border-border bg-background p-6 shadow-card">
        <h1 className="font-display text-xl font-bold text-foreground">Set a new password</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          {ready ? "Choose a new password for your account." : "Open this page from the reset link in your email."}
        </p>
        <label className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-secondary/40 px-3 py-2.5 text-muted-foreground focus-within:border-foreground/30">
          <Lock className="h-4 w-4" />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password"
            className="w-full bg-transparent text-sm outline-none"
          />
        </label>
        {err && <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{err}</p>}
        <button
          disabled={busy}
          className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-foreground px-4 py-2.5 text-sm font-semibold text-background disabled:opacity-60"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Update password
        </button>
      </form>
    </div>
  );
}
