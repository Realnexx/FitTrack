import { describe, it, expect } from "vitest";
import { signInError } from "./auth-errors";
describe("Sign-in errors", () => {
  it("keeps invalid credentials generic", () =>
    expect(
      signInError({
        code: "invalid_credentials",
        status: 400,
        message: "Invalid login credentials",
      }),
    ).toBe("Incorrect email or password."));
  it("distinguishes an unconfirmed email", () =>
    expect(signInError({ code: "email_not_confirmed", message: "Email not confirmed" })).toMatch(
      /confirm your email/,
    ));
  it("does not blame the password for a network failure", () =>
    expect(signInError({ message: "Failed to fetch" })).toMatch(/connection/));
  it("gives actionable rate-limit and service-unavailable errors", () => {
    expect(signInError({ status: 429, message: "Rate limited" })).toMatch(/Too many/);
    expect(signInError({ status: 503, message: "Unavailable" })).toMatch(/temporarily unavailable/);
  });
  it("does not expose unexpected server details", () =>
    expect(signInError({ message: "Internal database implementation details" })).toBe(
      "Sign-in could not be completed. Please try again.",
    ));
});
