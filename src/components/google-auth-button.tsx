import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "./ui/button";
import { Loader2 } from "lucide-react";
export function GoogleAuthButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="mb-5">
      <Button
        type="button"
        variant="outline"
        className="h-12 w-full rounded-xl"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const { error } = await supabase.auth.signInWithOAuth({
              provider: "google",
              options: {
                redirectTo: `${window.location.origin}/auth/callback`,
                queryParams: { prompt: "select_account" },
              },
            });
            if (error) throw error;
          } catch {
            setError("Google sign-in is unavailable. Try again or use your email.");
            setBusy(false);
          }
        }}
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <span aria-hidden="true" className="text-lg font-bold">
            G
          </span>
        )}
        Continue with Google
      </Button>
      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="mt-5 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or use email
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}
