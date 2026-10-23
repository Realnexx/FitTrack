import { supabase } from "@/integrations/supabase/client";
export async function completeOAuthReturn() {
  // Initialization consumes implicit tokens or the PKCE code exactly once.
  const initialized = await supabase.auth.initialize();
  if (initialized.error)
    throw new Error("Authorization was cancelled or expired. Please try again.");
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Sign-in could not be completed. Please try again.");
  return data.user;
}
