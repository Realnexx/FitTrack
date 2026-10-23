/** Read only the callback kind; never copy tokens into messages or extra storage. */
export function signupReturn(hash: string): boolean {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  return params.get("type") === "signup" && Boolean(params.get("access_token"));
}
let pending = typeof window !== "undefined" && signupReturn(window.location.hash);
export function hasSignupReturn() {
  return pending;
}
export function consumeSignupReturn() {
  const value = pending;
  pending = false;
  return value;
}
