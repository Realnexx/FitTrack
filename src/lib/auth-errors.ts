/** Keep credential failures generic while distinguishing operational failures. */
export function signInError(error: { code?: string | undefined; status?: number | undefined; message: string }): string {
  if (error.code === "email_not_confirmed")
    return "Please confirm your email first — check your inbox.";
  if (
    error.code === "invalid_credentials" ||
    (error.status === 400 && /invalid login credentials/i.test(error.message))
  )
    return "Incorrect email or password.";
  if (
    error.status === 429 ||
    error.code === "over_request_rate_limit" ||
    error.code === "over_email_send_rate_limit"
  )
    return "Too many sign-in attempts. Please wait a moment and try again.";
  if (/fetch|network|connection|timeout/i.test(error.message) || error.status === 0)
    return "Could not reach the sign-in service. Check your connection and try again.";
  if (error.status !== undefined && error.status >= 500)
    return "The sign-in service is temporarily unavailable. Please try again shortly.";
  return "Sign-in could not be completed. Please try again.";
}

