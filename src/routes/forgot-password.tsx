import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthCard } from "@/components/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/common";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset password — FitTrack" },
      { name: "description", content: "Get a link to reset your FitTrack password." },
      { property: "og:title", content: "Reset password — FitTrack" },
      { property: "og:description", content: "Get a link to reset your FitTrack password." },
    ],
  }),
  component: Forgot,
});

function Forgot() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Enter a valid email");
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) setError(error.message);
    else setDone(true);
  }

  return (
    <AuthCard
      title="Forgot password"
      subtitle="We'll email you a reset link."
      footer={
        <Link to="/login" className="font-semibold text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      {done ? (
        <p className="text-sm text-muted-foreground">
          If an account exists for that email, a reset link is on its way.
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 h-11"
              autoComplete="email"
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy && <Spinner />} Send reset link
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
