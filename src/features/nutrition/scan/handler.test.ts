// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ rpc: vi.fn(), update: vi.fn(), eq: vi.fn(), adult: true }));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    rpc: state.rpc,
    from: () => ({ update: state.update }),
    storage: { from: () => ({ remove: vi.fn() }) },
  },
}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: { id: "owner" } }, error: null }) },
    from: (table: string) => ({
      select: () =>
        table === "profiles"
          ? {
              eq: () => ({
                maybeSingle: async () => ({
                  data: { date_of_birth: state.adult ? "2000-01-01" : "2020-01-01" },
                  error: null,
                }),
              }),
            }
          : { order: () => ({ limit: async () => ({ data: [], error: null }) }) },
    }),
  }),
}));
import { handleMealScan, scanConfig, validJpeg, libraryMatches } from "./handler.server";
import { resizePortion, scanResultSchema } from "./types";
const id = "11111111-1111-4111-8111-111111111111";
function photo() {
  return Buffer.from([
    255, 216, 255, 192, 0, 17, 8, 0, 100, 0, 100, 3, 1, 0, 2, 0, 3, 0, 0, 0, 0, 255, 217,
  ]).toString("base64");
}
function request() {
  return new Request("https://fit.test/api/meal-scan", {
    method: "POST",
    headers: {
      authorization: "Bearer test-session",
      "content-type": "application/json",
      origin: "https://fit.test",
    },
    body: JSON.stringify({ request_id: id, image: photo(), consent: true }),
  });
}
beforeEach(() => {
  vi.stubEnv("MEAL_SCAN_ENABLED", "true");
  vi.stubEnv("MEAL_SCAN_FREE_TIER_CONFIRMED", "true");
  vi.stubEnv("MEAL_SCAN_ELIGIBILITY_CONFIRMED", "true");
  vi.stubEnv("GEMINI_API_KEY", "test-only-key");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-only-service");
  vi.stubEnv("SUPABASE_URL", "https://db.test");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "test-publishable");
  vi.stubEnv("MEAL_SCAN_DAILY_LIMIT", "10");
  vi.stubEnv("MEAL_SCAN_USER_DAILY_LIMIT", "5");
  vi.stubEnv("MEAL_SCAN_RPM_LIMIT", "2");
  vi.stubEnv("MEAL_SCAN_TPM_LIMIT", "20480");
  state.adult = true;
  state.rpc.mockReset();
  state.update.mockReset();
  state.eq.mockReset();
  state.update.mockReturnValue({ eq: state.eq });
  state.eq.mockResolvedValue({ error: null });
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it("fails closed without free-tier confirmation", async () => {
  vi.stubEnv("MEAL_SCAN_FREE_TIER_CONFIRMED", "false");
  expect(scanConfig(process.env)).toBeNull();
  expect((await handleMealScan(request())).status).toBe(503);
  expect(fetch).not.toHaveBeenCalled();
  expect(state.rpc).not.toHaveBeenCalled();
});
it("does not call Gemini when the allowance is exhausted", async () => {
  state.rpc.mockResolvedValue({
    data: { allowed: false, remaining: 0, retry_at: "2026-10-27T07:00:00Z" },
    error: null,
  });
  const response = await handleMealScan(request());
  expect(response.status).toBe(429);
  expect((await response.json()).message).toContain("allowance has been reached");
  expect(fetch).not.toHaveBeenCalled();
});
it("blocks users below the provider age requirement before reservation", async () => {
  state.adult = false;
  expect((await handleMealScan(request())).status).toBe(403);
  expect(state.rpc).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
});
it("checks JPEG dimensions and rejects invalid uploads before using quota", async () => {
  expect(validJpeg(Buffer.from(photo(), "base64"))).toBe(true);
  expect(validJpeg(new Uint8Array([1, 2, 3]))).toBe(false);
  const response = await handleMealScan(
    new Request("https://fit.test/api/meal-scan", {
      method: "POST",
      headers: { authorization: "Bearer test" },
      body: JSON.stringify({ request_id: id, image: "aGVsbG8=", consent: true }),
    }),
  );
  expect(response.status).toBe(400);
  expect(state.rpc).not.toHaveBeenCalled();
});
it("opens the shared circuit breaker on provider quota errors without retries", async () => {
  state.rpc.mockResolvedValue({ data: { allowed: true, scan_id: id }, error: null });
  vi.mocked(fetch).mockResolvedValue(new Response("{}", { status: 429 }));
  const response = await handleMealScan(request());
  expect(response.status).toBe(429);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(state.update).toHaveBeenCalledWith(
    expect.objectContaining({ blocked_until: expect.any(String) }),
  );
});
it("returns a stored draft without another AI request", async () => {
  state.rpc.mockResolvedValue({
    data: { allowed: true, existing: true, state: "ready", result: { items: [] } },
    error: null,
  });
  expect((await handleMealScan(request())).status).toBe(200);
  expect(fetch).not.toHaveBeenCalled();
});
it("uses stored nutrition for matched foods and scales editable portions", () => {
  const item = {
    food_id: id,
    name: "Rice",
    quantity: 200,
    unit: "g" as const,
    calories: 999,
    protein: 999,
    carbs: 999,
    fat: 999,
    notes: "Estimated portion",
  };
  const match = libraryMatches(
    [item],
    [
      {
        id,
        name: "Rice",
        serving_size: 100,
        serving_unit: "g",
        calories: 130,
        protein_g: 2.7,
        carbs_g: 28,
        fat_g: 0.3,
      },
    ],
  )[0]!;
  expect(match.calories).toBe(260);
  expect(resizePortion(match, 100).calories).toBe(130);
  expect(scanResultSchema.safeParse({ items: [{ ...item, calories: -1 }] }).success).toBe(false);
});

it("validates a successful provider response and persists the review draft", async () => {
  state.rpc.mockResolvedValue({ data: { allowed: true, scan_id: id }, error: null });
  const result = {
    items: [
      {
        food_id: null,
        name: "Grilled vegetables",
        quantity: 150,
        unit: "g",
        calories: 160,
        protein: 4,
        carbs: 20,
        fat: 7,
        notes: "Oil and portion are estimates.",
      },
    ],
  };
  vi.mocked(fetch).mockResolvedValue(
    new Response(
      JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(result) }] } }] }),
      { status: 200 },
    ),
  );
  const response = await handleMealScan(request());
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ scan_id: id, ...result });
  expect(state.update).toHaveBeenCalledWith({ state: "ready", result });
  expect(fetch).toHaveBeenCalledTimes(1);
});
