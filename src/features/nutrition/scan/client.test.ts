import { afterEach, beforeEach, expect, it, vi } from "vitest";
const authState = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: { access_token: "test-session" } } }),
      refreshSession: authState.refresh,
    },
  },
}));
import { scanRequest } from "./client";
beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
  authState.refresh.mockReset();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it("preserves setup errors from the server", async () => {
  vi.mocked(fetch).mockResolvedValue(
    new Response(JSON.stringify({ message: "Meal scanning is not configured yet." }), {
      status: 503,
    }),
  );
  await expect(scanRequest("GET")).rejects.toThrow("not configured");
});
it("explains an undeployed endpoint instead of silently failing", async () => {
  vi.mocked(fetch).mockResolvedValue(new Response("<html>Not found</html>", { status: 404 }));
  await expect(scanRequest("GET")).rejects.toThrow("endpoint is not deployed");
});
it("times out availability checks so the retry button can recover", async () => {
  vi.useFakeTimers();
  vi.mocked(fetch).mockImplementation(
    (_url, options) =>
      new Promise((_resolve, reject) => {
        options?.signal?.addEventListener("abort", () =>
          reject(new DOMException("Aborted", "AbortError")),
        );
      }),
  );
  const pending = expect(scanRequest("GET")).rejects.toThrow("took too long");
  await vi.advanceTimersByTimeAsync(15000);
  await pending;
});

it("refreshes a rejected session and retries with the new token once", async () => {
  authState.refresh.mockResolvedValue({
    data: { session: { access_token: "refreshed-test-session" } },
    error: null,
  });
  vi.mocked(fetch)
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "Session expired" }), { status: 401 }),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ available: true, message: "Ready" }), { status: 200 }),
    );
  expect(await scanRequest("GET")).toEqual({ available: true, message: "Ready" });
  expect(authState.refresh).toHaveBeenCalledTimes(1);
  expect(vi.mocked(fetch).mock.calls[1]?.[1]?.headers).toEqual(
    expect.objectContaining({ Authorization: "Bearer refreshed-test-session" }),
  );
});
it("does not retry indefinitely when the refreshed session is rejected", async () => {
  authState.refresh.mockResolvedValue({
    data: { session: { access_token: "refreshed-test-session" } },
    error: null,
  });
  vi.mocked(fetch).mockImplementation(
    async () => new Response(JSON.stringify({ message: "Cannot verify session" }), { status: 401 }),
  );
  await expect(scanRequest("GET")).rejects.toThrow("Cannot verify session");
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(authState.refresh).toHaveBeenCalledTimes(1);
});
it("asks for a fresh login if session renewal fails", async () => {
  authState.refresh.mockResolvedValue({
    data: { session: null },
    error: new Error("Expired refresh token"),
  });
  vi.mocked(fetch).mockResolvedValue(
    new Response(JSON.stringify({ message: "Session expired" }), { status: 401 }),
  );
  await expect(scanRequest("GET")).rejects.toThrow("Sign out of FitTrack and sign in again");
  expect(fetch).toHaveBeenCalledTimes(1);
});
