import { render, cleanup, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
const state = vi.hoisted(() => ({
  pending: true,
  getUser: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { success: state.success, error: state.error } }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getUser: state.getUser } },
}));
vi.mock("@/lib/email-verification-return", async () => ({
  ...(await vi.importActual<object>("@/lib/email-verification-return")),
  hasSignupReturn: () => state.pending,
  consumeSignupReturn: () => {
    const pending = state.pending;
    state.pending = false;
    return pending;
  },
}));
import { signupReturn } from "@/lib/email-verification-return";
import { EmailVerificationToast } from "./email-verification-toast";
beforeEach(() => {
  vi.clearAllMocks();
  state.pending = true;
  state.getUser.mockResolvedValue({
    data: { user: { email_confirmed_at: "2026-10-23" } },
    error: null,
  });
});
afterEach(cleanup);
it("recognizes signup callbacks without treating recovery or ordinary sign-ins as verification", () => {
  expect(signupReturn("#type=signup&access_token=test-token")).toBe(true);
  expect(signupReturn("#type=recovery&access_token=test-token")).toBe(false);
  expect(signupReturn("#type=signup")).toBe(false);
  expect(signupReturn("")).toBe(false);
});
it("shows success after the server confirms the email and only once", async () => {
  const first = render(<EmailVerificationToast />);
  await waitFor(() =>
    expect(state.success).toHaveBeenCalledWith("Email verified successfully", expect.any(Object)),
  );
  first.unmount();
  render(<EmailVerificationToast />);
  expect(state.success).toHaveBeenCalledTimes(1);
});
it("does not show verification messages for ordinary visits", () => {
  state.pending = false;
  render(<EmailVerificationToast />);
  expect(state.getUser).not.toHaveBeenCalled();
  expect(state.success).not.toHaveBeenCalled();
});
it("does not claim success for an unconfirmed or rejected user", async () => {
  state.getUser.mockResolvedValue({ data: { user: { email_confirmed_at: null } }, error: null });
  render(<EmailVerificationToast />);
  await waitFor(() => expect(state.error).toHaveBeenCalled());
  expect(state.success).not.toHaveBeenCalled();
});
it("handles a failed verification check without exposing tokens or raw errors", async () => {
  state.getUser.mockRejectedValue(new Error("private auth detail"));
  render(<EmailVerificationToast />);
  await waitFor(() =>
    expect(state.error).toHaveBeenCalledWith(
      "Unable to check email verification",
      expect.any(Object),
    ),
  );
  expect(state.success).not.toHaveBeenCalled();
});
