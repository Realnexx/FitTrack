import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AuthCard } from "@/components/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/common";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — FitTrack" },
      { name: "description", content: "Choose a new password for your FitTrack account." },
      { property: "og:title", content: "Set a new password — FitTrack" },
      { property: "og:description", content: "Choose a new password for your FitTrack account." },
    ],
  }),
  component: Reset,
});

function Reset() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    if (window.location.hash.includes("type=recovery")) setReady(true);
    supabase.auth.getSession().then(({ data }) => data.session && setReady(true));
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return setError("At least 8 characters");
    if (pw !== confirm) return setError("Passwords don't match");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setError(error.message);
    toast.success("Password updated");
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <AuthCard
      title="Set a new password"
      footer={
        <Link to="/login" className="font-semibold text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      {!ready ? (
        <p className="text-sm text-muted-foreground">
          Open this page from the reset link in your email. Links expire after a while — request a
          new one if needed.
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div>
            <Label htmlFor="pw">New password</Label>
            <Input
              id="pw"
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              className="mt-1.5 h-11"
              autoComplete="new-password"
            />
          </div>
          <div>
            <Label htmlFor="pw2">Confirm password</Label>
            <Input
              id="pw2"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-1.5 h-11"
              autoComplete="new-password"
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy && <Spinner />} Update password
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
