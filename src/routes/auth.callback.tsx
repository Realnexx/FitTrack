import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { completeOAuthReturn } from "@/lib/oauth-return";
import { AuthCard } from "@/components/auth-card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
export const Route = createFileRoute("/auth/callback")({ ssr: false, component: AuthCallback });
export function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(window.location.search);
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    void (async () => {
      try {
        if (params.has("error") || fragment.has("error"))
          throw new Error("Authorization was cancelled or expired. Please try again.");
        const user = await completeOAuthReturn();
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("id", user.id)
          .maybeSingle();
        if (error) throw new Error("Could not load your profile. Please try signing in again.");
        if (!active) return;
        window.history.replaceState(null, "", window.location.pathname);
        const to = !profile?.onboarding_completed
          ? "/onboarding"
          : params.get("next") === "settings"
            ? "/settings"
            : "/dashboard";
        toast.success(
          params.get("next") === "settings"
            ? "Account connection updated"
            : "Signed in successfully",
          { id: "oauth-return" },
        );
        await navigate({ to, replace: true });
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Unable to finish sign-in.");
      }
    })();
    return () => {
      active = false;
    };
  }, [navigate]);
  return (
    <AuthCard
      title={error ? "Sign-in needs another try" : "Finishing sign-in"}
      subtitle={
        error ? "Your existing account is unchanged." : "Getting your FitTrack account ready."
      }
    >
      {error ? (
        <>
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
          <Link to="/login" className="mt-5 block text-sm font-semibold text-primary">
            Back to sign in
          </Link>
        </>
      ) : (
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin text-primary" />
          Please wait...
        </div>
      )}
    </AuthCard>
  );
}
