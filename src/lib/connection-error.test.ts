import { expect, it } from "vitest";
import { connectionError } from "./connection-error";
it("explains required manual linking configuration", () => {
  expect(connectionError({code:"manual_linking_disabled"},"Google")).toContain("Enable manual identity linking");
});
it("distinguishes disabled providers and existing identities", () => {
  expect(connectionError({code:"provider_disabled"},"Google")).toContain("Google sign-in is not configured");
  expect(connectionError({code:"identity_already_exists"},"Google")).toContain("another FitTrack account");
});
it("does not expose raw server errors or credentials", () => {
  expect(connectionError(new Error("secret-token"),"Google")).not.toContain("secret-token");
});
