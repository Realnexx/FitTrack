import { createFileRoute, redirect } from "@tanstack/react-router";
import { Onboarding } from "@/features/onboarding/Onboarding";
import { supabase } from "@/integrations/supabase/client";
export const Route = createFileRoute("/onboarding")({
  ssr: false,
  beforeLoad: async () => {
    const r = await supabase.auth.getUser();
    if (!r.data.user) throw redirect({ to: "/login" });
    const p = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", r.data.user.id)
      .maybeSingle();
    if (p.error) throw p.error;
    if (p.data?.onboarding_completed) throw redirect({ to: "/dashboard" });
  },
  component: Onboarding,
});
