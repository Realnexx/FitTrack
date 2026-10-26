import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  request: vi.fn(),
  prepare: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  rpc: vi.fn(),
  close: vi.fn(),
}));
vi.mock("./client", () => ({ scanRequest: state.request, prepareMealPhoto: state.prepare }));
vi.mock("@/lib/data", () => ({
  uid: async () => "owner",
  useFoods: () => ({
    data: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        name: "Cooked White Rice",
        serving_size: 100,
        serving_unit: "g",
        calories: 130,
        protein_g: 2.7,
        carbs_g: 28,
        fat_g: 0.3,
      },
    ],
  }),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: state.rpc,
    storage: { from: () => ({ upload: state.upload, remove: state.remove }) },
  },
}));
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));
import { MealScanner } from "./meal-scanner";
function show() {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MealScanner meal="lunch" date="2026-10-26" onClose={state.close} />
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  state.request.mockReset();
  state.request.mockImplementation(async (method: string) =>
    method === "GET"
      ? { available: true, message: "Free meal scanning is available.", remaining: 3 }
      : {
          scan_id: "22222222-2222-4222-8222-222222222222",
          items: [
            {
              food_id: null,
              name: "Grilled vegetables",
              quantity: 100,
              unit: "g",
              calories: 100,
              protein: 3,
              carbs: 12,
              fat: 4,
              notes: "Estimated serving",
            },
          ],
        },
  );
  state.prepare.mockResolvedValue({
    file: new File(["jpeg"], "meal.jpg", { type: "image/jpeg" }),
    preview: "data:image/jpeg;base64,test",
    base64: "test",
  });
  state.upload.mockResolvedValue({ data: {}, error: null });
  state.remove.mockResolvedValue({ error: null });
  state.rpc.mockResolvedValue({ data: ["log"], error: null });
});
afterEach(cleanup);
it("requires photo consent and availability, then reviews and saves the selected meal", async () => {
  show();
  expect(screen.getByRole("button", { name: "Analyze meal" })).toBeDisabled();
  await screen.findByText("Free meal scanning is available.");
  fireEvent.change(screen.getByLabelText("Choose meal photo"), {
    target: { files: [new File(["jpeg"], "meal.jpg", { type: "image/jpeg" })] },
  });
  await screen.findByAltText("Your meal photo");
  expect(screen.getByRole("button", { name: "Analyze meal" })).toBeDisabled();
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Analyze meal" }));
  expect(await screen.findByLabelText("Food name 1")).toHaveValue("Grilled vegetables");
  fireEvent.change(screen.getByLabelText("Portion 1 (g)"), { target: { value: "200" } });
  expect(screen.getByText("Meal total: 200 kcal · 6 g protein")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Save to lunch" }));
  await waitFor(() =>
    expect(state.rpc).toHaveBeenCalledWith(
      "save_scanned_meal",
      expect.objectContaining({
        p_meal: "lunch",
        p_date: "2026-10-26",
        p_image: "owner/22222222-2222-4222-8222-222222222222.jpg",
        p_items: [expect.objectContaining({ quantity: 200, calories: 200 })],
      }),
    ),
  );
  await waitFor(() => expect(state.close).toHaveBeenCalled());
});
it("never starts analysis when free scans are unavailable", async () => {
  state.request.mockRejectedValue(new Error("Free scanning allowance reached."));
  show();
  expect(await screen.findByText("Free scanning allowance reached.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Analyze meal" })).toBeDisabled();
  expect(state.request.mock.calls.every((call) => call[0] === "GET")).toBe(true);
});
it("reuses selected food nutrition instead of AI values", async () => {
  show();
  await screen.findByText("Free meal scanning is available.");
  fireEvent.change(screen.getByLabelText("Choose meal photo"), {
    target: { files: [new File(["jpeg"], "meal.jpg", { type: "image/jpeg" })] },
  });
  await screen.findByAltText("Your meal photo");
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Analyze meal" }));
  await screen.findByLabelText("Food match 1");
  fireEvent.change(screen.getByLabelText("Food match 1"), {
    target: { value: "11111111-1111-4111-8111-111111111111" },
  });
  expect(screen.getByLabelText("Calories (kcal) 1")).toHaveValue(130);
  expect(screen.getByLabelText("Calories (kcal) 1")).toBeDisabled();
  expect(screen.getByLabelText("Food name 1")).toHaveValue("Cooked White Rice");
});
