// @vitest-environment node
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, it, expect, vi } from "vitest";
function worker() {
  const handlers = new Map<string, (event: unknown) => void>();
  const fetch = vi.fn().mockResolvedValue({ ok: true, clone: () => ({}) });
  const cache = { match: vi.fn().mockResolvedValue(null), put: vi.fn(), addAll: vi.fn() };
  const caches = {
    open: vi.fn().mockResolvedValue(cache),
    match: vi.fn().mockResolvedValue({ offline: true }),
  };
  runInNewContext(readFileSync(new URL("../../public/sw.js", import.meta.url), "utf8"), {
    URL,
    fetch,
    caches,
    self: {
      location: { origin: "https://fittrack.test" },
      addEventListener: (name: string, fn: (e: unknown) => void) => handlers.set(name, fn),
      skipWaiting: vi.fn(),
    },
  });
  return { handlers, fetch, cache, caches };
}
describe("PWA cache privacy", () => {
  it("does not intercept or cache Supabase API requests", () => {
    const w = worker();
    const respondWith = vi.fn();
    w.handlers.get("fetch")!({
      request: { url: "https://backend.test/rest/v1/food_logs", method: "GET" },
      respondWith,
    });
    expect(respondWith).not.toHaveBeenCalled();
    expect(w.caches.open).not.toHaveBeenCalled();
  });
  it("does not cache same-origin private data or mutations", () => {
    const w = worker();
    const respondWith = vi.fn();
    for (const [path, method] of [
      ["/api/profile", "GET"],
      ["/api/weight", "POST"],
    ])
      w.handlers.get("fetch")!({
        request: { url: "https://fittrack.test" + path, method },
        respondWith,
      });
    expect(respondWith).not.toHaveBeenCalled();
  });
  it("returns an offline notice for failed navigation without caching authenticated HTML", async () => {
    const w = worker();
    w.fetch.mockRejectedValue(new Error("Offline"));
    let response: Promise<unknown> | undefined;
    w.handlers.get("fetch")!({
      request: { url: "https://fittrack.test/dashboard", method: "GET", mode: "navigate" },
      respondWith: (p: Promise<unknown>) => (response = p),
    });
    await expect(response).resolves.toEqual({ offline: true });
    expect(w.cache.put).not.toHaveBeenCalled();
  });
});
