import { useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { hasSignupReturn, consumeSignupReturn } from "@/lib/email-verification-return";
export function EmailVerificationToast() {
  useEffect(() => {
    if (!hasSignupReturn()) return;
    let active = true;
    void (async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (!active || !consumeSignupReturn()) return;
        if (!error && data.user?.email_confirmed_at)
          toast.success("Email verified successfully", {
            id: "email-verification",
            description: "Your account is ready. Welcome to FitTrack!",
            duration: 6500,
          });
        else
          toast.error("We couldn't confirm your sign-in", {
            id: "email-verification",
            description:
              "Try signing in. If your email is still unverified, request a new confirmation link.",
          });
      } catch {
        if (active && consumeSignupReturn())
          toast.error("Unable to check email verification", {
            id: "email-verification",
            description: "Check your connection and try signing in again.",
          });
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  return null;
}
