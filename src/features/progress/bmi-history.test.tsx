import { render, screen, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ rows: [] as unknown[], range: vi.fn() }));
vi.mock("@/lib/data", () => ({
  uid: async () => "owner",
  unwrap: (result: { data: unknown; error: unknown }) => {
    if (result.error) throw result.error;
    return result.data;
  },
  useSettings: () => ({ data: { timezone: "Asia/Manila" } }),
}));
vi.mock("@/hooks/use-display-date", () => ({ useDisplayDate: () => () => "Oct 23, 2026" }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ order: () => ({ order: () => ({ range: state.range }) }) }) }),
    }),
  },
}));
import { BmiHistory } from "./bmi-history";
afterEach(cleanup);
function show() {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <BmiHistory />
    </QueryClientProvider>,
  );
}
it("shows saved snapshot values and an unassessed category for unconfirmed age", async () => {
  state.range.mockResolvedValue({
    data: [
      {
        id: "snapshot",
        recorded_at: "2026-10-23T04:00:00Z",
        weight_kg: 70,
        height_cm: 175,
        bmi: 22.857142,
        adult_confirmed: false,
      },
    ],
    error: null,
  });
  show();
  expect(await screen.findByText("22.9")).toBeInTheDocument();
  expect(screen.getByText("70 kg · 175 cm")).toBeInTheDocument();
  expect(screen.getByText("Adult category not assessed")).toBeInTheDocument();
  expect(state.range).toHaveBeenCalledWith(0, 19);
});
it("explains how to start an empty history", async () => {
  state.range.mockResolvedValue({ data: [], error: null });
  show();
  expect(await screen.findByText(/No saved BMI results yet/)).toBeInTheDocument();
});
