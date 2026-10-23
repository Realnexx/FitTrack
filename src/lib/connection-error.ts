export function connectionError(error: unknown, provider: string): string {
  const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
  switch (code) {
    case "manual_linking_disabled":
      return "Account linking is disabled. Enable manual identity linking in Supabase Authentication settings, then try again.";
    case "provider_disabled":
    case "oauth_provider_not_supported":
      return `${provider} sign-in is not configured. Enable this provider in Supabase Authentication and save its OAuth credentials.`;
    case "identity_already_exists":
      return "This provider account is already connected to another FitTrack account. Choose a different account.";
    case "session_not_found":
    case "refresh_token_not_found":
      return "Your session has expired. Sign in again before connecting an account.";
    default:
      return `Could not connect ${provider}. Check your connection and try again. If it continues, check the provider and manual linking settings in Supabase.`;
  }
}
