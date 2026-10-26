import { render, screen, fireEvent, waitFor, cleanup, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
const state = vi.hoisted(() => ({
  profile: {
    id: "user",
    full_name: "Test User",
    onboarding_completed: false,
    equipment: [],
    preferred_days: [],
  },
  goal: {
    id: "goal",
    starting_weight_kg: 48,
    target_weight_kg: 55,
    goal_type: "build_muscle",
    daily_calorie_target: 2100,
    daily_protein_target_g: 95,
    weekly_weight_change_target_kg: 0.25,
  },
  foods: [
    {
      id: "rice",
      name: "Rice",
      serving_size: 100,
      serving_unit: "g",
      calories: 150,
      protein_g: 10,
      carbs_g: 20,
      fat_g: 5,
      is_system_food: true,
      source_note: "Test reference",
    },
  ],
  weights: [] as unknown[],
  logs: [] as unknown[],
  reportSessions: [] as unknown[],
  session: null as unknown,
  write: vi.fn(),
  signOut: vi.fn(),
  rpc: vi.fn(),
  navigate: vi.fn(),
}));
vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("@tanstack/react-router");
  return {
    ...actual,
    useNavigate: () => state.navigate,
    Link: ({
      children,
      to,
      params: _params,
      ...props
    }: React.ComponentProps<"a"> & { to: string; params?: unknown }) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
    createFileRoute: () => (options: Record<string, unknown>) => ({
      options,
      useParams: () => ({ id: "session" }),
    }),
  };
});
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: { id: "user" } } }), signOut: state.signOut },
    rpc: state.rpc,
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
      insert: (record: unknown) => {
        state.write("insert", record);
        return Promise.resolve({ data: null, error: null });
      },
      update: (record: unknown) => ({
        eq: async () => {
          state.write("update", record);
          return { data: null, error: null };
        },
      }),
      delete: () => ({
        eq: async (id: string, value: string) => {
          state.write("delete", value);
          return { data: null, error: null };
        },
      }),
    }),
  },
}));
vi.mock("@/lib/data", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("@/lib/data");
  const q = (data: unknown) => ({ data, isPending: false, error: null, refetch: vi.fn() });
  return {
    ...actual,
    useProfile: () => q(state.profile),
    useSettings: () =>
      q({ timezone: "Asia/Manila", weight_unit: "kg", date_format: "MMM d, yyyy" }),
    useGoal: () => q(state.goal),
    useWeights: () => q(state.weights),
    useFoods: () => q(state.foods),
    useFoodLogs: () => q(state.logs),
    useSession: () => q(state.session),
    usePlans: () => q([]),
    useSchedule: () => q([]),
    useSessions: () => q(state.reportSessions),
    useActiveSession: () => q(null),
  };
});
vi.mock("@/components/weight-chart", () => ({ WeightChart: () => <div>Weight chart</div> }));
import { Onboarding } from "@/features/onboarding/Onboarding";
import { ProgressPage } from "@/features/progress/ProgressPage";
import { Settings as SettingsPage } from "@/routes/_app.settings";
import { Reports } from "@/routes/_app.reports";
import { Nutrition } from "@/features/nutrition/Nutrition";
import { WorkoutSession } from "@/features/workouts/WorkoutSession";
import { Dashboard } from "@/features/dashboard/Dashboard";
function show(ui: React.ReactNode) {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        })
      }
    >
      {ui}
    </QueryClientProvider>,
  );
}
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
beforeEach(() => {
  state.reportSessions = [];
  state.weights = [];
  state.logs = [];
  state.signOut.mockResolvedValue({ error: null });
  state.rpc.mockResolvedValue({ data: null, error: null });
});
function completeOnboardingForm() {
  fireEvent.click(screen.getByRole("button", { name: "Get started" }));
  expect(screen.queryByLabelText("Full name")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Height (cm)")).toHaveValue(null);
  expect(screen.getByLabelText("Current / starting weight (kg)")).toHaveValue(null);
  fireEvent.change(screen.getByLabelText("Date of birth"), { target: { value: "2000-01-01" } });
  fireEvent.change(screen.getByLabelText("Height (cm)"), { target: { value: "171" } });
  fireEvent.change(screen.getByLabelText("Current / starting weight (kg)"), {
    target: { value: "60" },
  });
  fireEvent.change(screen.getByLabelText("Activity level"), { target: { value: "active" } });
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  fireEvent.change(screen.getByLabelText("Primary goal"), { target: { value: "build_muscle" } });
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  for (const [label, value] of [
    ["Target weight (kg)", "65"],
    ["Weekly weight change (kg; negative for loss)", "0.3"],
    ["Daily calories (kcal)", "2300"],
    ["Daily protein (g)", "110"],
  ] as const)
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  expect(screen.getByLabelText("Workout location")).toHaveValue("");
  expect(screen.getAllByRole("checkbox").every((x) => !(x as HTMLInputElement).checked)).toBe(true);
  fireEvent.change(screen.getByLabelText("Workout location"), { target: { value: "Gym" } });
  for (const label of ["Bodyweight", "Resistance Bands", "Sun", "Tue", "Thu", "Fri", "Sat"])
    fireEvent.click(screen.getByLabelText(label));
  fireEvent.change(screen.getByLabelText("Experience"), { target: { value: "intermediate" } });
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
}
describe("Core MVP interactions", () => {
  it("saves the account name and every chosen onboarding value through one atomic operation", async () => {
    show(<Onboarding />);
    completeOnboardingForm();
    expect(screen.getByText("Sun, Tue, Thu, Fri, Sat")).toBeInTheDocument();
    expect(screen.queryByText(/Monday, Wednesday and Friday/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save and open dashboard" }));
    await waitFor(() =>
      expect(state.rpc).toHaveBeenCalledWith("complete_onboarding", {
        payload: expect.objectContaining({
          full_name: "Test User",
          date_of_birth: "2000-01-01",
          height_cm: 171,
          starting_weight_kg: 60,
          target_weight_kg: 65,
          goal_type: "build_muscle",
          weekly_weight_change_target_kg: 0.3,
          daily_calorie_target: 2300,
          daily_protein_target_g: 110,
          workout_location: "Gym",
          experience_level: "intermediate",
          activity_level: "active",
          preferred_days: [0, 2, 4, 5, 6],
          equipment: ["Bodyweight", "Resistance Bands"],
        }),
      }),
    );
    await waitFor(() => expect(state.navigate).toHaveBeenCalledWith({ to: "/dashboard" }));
  });
  it("logs a weight measurement with its own date and notes", async () => {
    show(<ProgressPage />);
    fireEvent.click(screen.getByRole("button", { name: "Log weight" }));
    fireEvent.change(screen.getByLabelText("Weight (kg)"), { target: { value: "49" } });
    fireEvent.change(screen.getByLabelText("Notes (optional)"), {
      target: { value: "Morning measurement" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save measurement" }));
    await waitFor(() =>
      expect(state.write).toHaveBeenCalledWith(
        "insert",
        expect.objectContaining({ weight_kg: 49, notes: "Morning measurement", user_id: "user" }),
      ),
    );
  });
  it("scales selected food macros by quantity before saving", async () => {
    show(<Nutrition />);
    fireEvent.click(screen.getByRole("button", { name: "Add food to breakfast" }));
    fireEvent.click(screen.getByRole("button", { name: /Rice/ }));
    fireEvent.change(screen.getByLabelText("Quantity (g)"), { target: { value: "200" } });
    const dialog = screen.getByRole("dialog", { name: "Log a food" });
    expect(within(dialog).getByText("Calories")).toBeInTheDocument();
    expect(within(dialog).getByText("300")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save food entry" }));
    await waitFor(() =>
      expect(state.write).toHaveBeenCalledWith(
        "insert",
        expect.objectContaining({
          quantity: 200,
          calories_snapshot: 300,
          protein_snapshot_g: 20,
          carbs_snapshot_g: 40,
          fat_snapshot_g: 10,
          serving_multiplier: 2,
        }),
      ),
    );
  });
  it("stores duration instead of repetitions for a timed exercise", async () => {
    state.session = {
      session: {
        id: "session",
        title: "Workout B",
        status: "in_progress",
        started_at: new Date().toISOString(),
        ended_at: null,
      },
      exercises: [
        {
          id: "plank",
          target_sets: 3,
          target_duration_seconds: 30,
          target_reps_min: null,
          target_reps_max: null,
          rest_seconds: 90,
          status: "pending",
          sets: [],
          exercise: {
            name: "Plank",
            tracking_type: "time",
            is_unilateral: false,
            instructions: "Hold",
          },
        },
      ],
    };
    show(<WorkoutSession id="session" />);
    expect(screen.queryByLabelText("Duration (seconds)")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open Plank" }));
    fireEvent.change(screen.getByLabelText("Duration (seconds)"), { target: { value: "40" } });
    fireEvent.click(screen.getByRole("button", { name: "Complete set" }));
    await waitFor(() =>
      expect(state.write).toHaveBeenCalledWith(
        "insert",
        expect.objectContaining({
          duration_seconds: 40,
          repetitions: null,
          weight_kg: null,
          set_number: 1,
        }),
      ),
    );
  });
  it("dashboard shows saved consumption totals without inventing history", () => {
    state.logs = [
      { calories_snapshot: 300, protein_snapshot_g: 20, carbs_snapshot_g: 40, fat_snapshot_g: 10 },
    ];
    show(<Dashboard />);
    expect(screen.getByText("300 / 2100 kcal")).toBeInTheDocument();
    expect(screen.getByText("20 / 95 g protein")).toBeInTheDocument();
    expect(screen.getByText("No workout scheduled")).toBeInTheDocument();
  });
  it("keeps onboarding open and shows a database error when save fails", async () => {
    state.signOut.mockResolvedValue({ error: null });
    state.rpc.mockResolvedValue({ data: null, error: { message: "Connection interrupted" } });
    show(<Onboarding />);
    completeOnboardingForm();
    fireEvent.click(screen.getByRole("button", { name: "Save and open dashboard" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Connection interrupted"),
    );
    expect(state.navigate).not.toHaveBeenCalled();
  });
  it("edits and deletes a weight record through explicit confirmation", async () => {
    state.weights = [
      {
        id: "weight-1",
        weight_kg: 49,
        measured_at: new Date().toISOString(),
        notes: "Original note",
      },
    ];
    show(<ProgressPage />);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Weight (kg)"), { target: { value: "49.5" } });
    fireEvent.click(screen.getByRole("button", { name: "Save measurement" }));
    await waitFor(() =>
      expect(state.write).toHaveBeenCalledWith(
        "update",
        expect.objectContaining({ weight_kg: 49.5 }),
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(state.write).not.toHaveBeenCalledWith("delete", "weight-1");
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(state.write).toHaveBeenCalledWith("delete", "weight-1"));
  });
  it("logs servings without treating each serving as one gram", async () => {
    show(<Nutrition />);
    fireEvent.click(screen.getByRole("button", { name: "Add food to breakfast" }));
    fireEvent.click(screen.getByRole("button", { name: /Rice/ }));
    fireEvent.change(screen.getAllByLabelText("Serving unit")[0]!, {
      target: { value: "serving" },
    });
    fireEvent.change(screen.getByLabelText("Quantity (serving)"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Save food entry" }));
    await waitFor(() =>
      expect(state.write).toHaveBeenCalledWith(
        "insert",
        expect.objectContaining({
          quantity: 2,
          unit: "serving",
          serving_multiplier: 2,
          calories_snapshot: 300,
        }),
      ),
    );
  });
  it("edits food snapshots proportionally without looking up changed food references", async () => {
    state.logs = [
      {
        id: "log-1",
        food_id: "rice",
        food_name_snapshot: "Saved Rice",
        quantity: 100,
        unit: "g",
        meal_type: "lunch",
        serving_multiplier: 1,
        calories_snapshot: 150,
        protein_snapshot_g: 10,
        carbs_snapshot_g: 20,
        fat_snapshot_g: 5,
      },
    ];
    show(<Nutrition />);
    fireEvent.click(screen.getByRole("button", { name: "Edit Saved Rice" }));
    fireEvent.change(screen.getByLabelText("Quantity (g)"), { target: { value: "150" } });
    fireEvent.click(screen.getByRole("button", { name: "Save food entry" }));
    await waitFor(() =>
      expect(state.write).toHaveBeenCalledWith(
        "update",
        expect.objectContaining({
          quantity: 150,
          calories_snapshot: 225,
          protein_snapshot_g: 15,
          serving_multiplier: 1.5,
        }),
      ),
    );
  });
});

it("opens custom food creation separately and cancels without saving", async () => {
  show(<Nutrition />);
  expect(screen.queryByLabelText("Food name")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Create custom food" }));
  const dialog = await screen.findByRole("dialog", { name: "Create a custom food" });
  expect(within(dialog).getByLabelText("Food name")).toBeInTheDocument();
  fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(state.write).not.toHaveBeenCalled();
});
it("defaults a new food entry to the selected meal", async () => {
  show(<Nutrition />);
  fireEvent.click(screen.getByRole("button", { name: "Add food to dinner" }));
  fireEvent.click(screen.getByRole("button", { name: /Rice/ }));
  expect(screen.getByLabelText("Meal")).toHaveValue("dinner");
  fireEvent.click(screen.getByRole("button", { name: "Save food entry" }));
  await waitFor(() =>
    expect(state.write).toHaveBeenCalledWith(
      "insert",
      expect.objectContaining({ meal_type: "dinner" }),
    ),
  );
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
});
it("creates a custom food from label values through its modal footer", async () => {
  show(<Nutrition />);
  fireEvent.click(screen.getByRole("button", { name: "Create custom food" }));
  fireEvent.change(screen.getByLabelText("Food name"), { target: { value: "Yogurt" } });
  for (const [label, value] of [
    ["Serving size", "150"],
    ["Calories per serving", "120"],
    ["Protein (g)", "12"],
    ["Carbohydrates (g)", "9"],
    ["Fat (g)", "4"],
  ] as const)
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  fireEvent.click(screen.getByRole("button", { name: "Create food" }));
  await waitFor(() =>
    expect(state.write).toHaveBeenCalledWith(
      "insert",
      expect.objectContaining({ name: "Yogurt", serving_size: 150, calories: 120, protein_g: 12 }),
    ),
  );
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
});

it("keeps the food library off the page until Add food opens it", async () => {
  show(<Nutrition />);
  expect(screen.queryByLabelText("Search foods")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Add food to lunch" }));
  const library = await screen.findByRole("dialog", { name: "Food library" });
  expect(within(library).getByLabelText("Search foods")).toBeInTheDocument();
  expect(within(library).getByRole("img")).toHaveAttribute("src", "/foods/rice.jpg");
  fireEvent.click(within(library).getByRole("button", { name: /Rice/ }));
  expect(screen.queryByRole("dialog", { name: "Food library" })).not.toBeInTheDocument();
  expect(screen.getByRole("dialog", { name: "Log a food" })).toBeInTheDocument();
  expect(screen.getByLabelText("Meal")).toHaveValue("lunch");
});
it("opens custom food creation from the food library", async () => {
  show(<Nutrition />);
  fireEvent.click(screen.getByRole("button", { name: "Add food to breakfast" }));
  const library = await screen.findByRole("dialog", { name: "Food library" });
  fireEvent.click(within(library).getByRole("button", { name: "Create a custom food" }));
  expect(screen.queryByRole("dialog", { name: "Food library" })).not.toBeInTheDocument();
  expect(await screen.findByRole("dialog", { name: "Create a custom food" })).toBeInTheDocument();
});

it("updates targets through the dedicated goal modal", async () => {
  show(<ProgressPage />);
  expect(screen.queryByLabelText("Target weight (kg)")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Adjust targets" }));
  expect(await screen.findByRole("dialog", { name: "Adjust your targets" })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Target weight (kg)"), { target: { value: "56" } });
  fireEvent.click(screen.getByRole("button", { name: "Update targets" }));
  await waitFor(() =>
    expect(state.write).toHaveBeenCalledWith(
      "update",
      expect.objectContaining({ target_weight_kg: 56 }),
    ),
  );
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
});
it("cancels a new weigh-in without saving a measurement", async () => {
  show(<ProgressPage />);
  fireEvent.click(screen.getByRole("button", { name: "Log weight" }));
  expect(await screen.findByRole("dialog", { name: "Log your weight" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(state.write).not.toHaveBeenCalled();
});

it("shows report ranges and meaningful empty states without invented averages", () => {
  show(<Reports />);
  expect(screen.getByRole("heading", { name: "Your reports" })).toBeInTheDocument();
  expect(screen.getByText("No completed workouts in this period.")).toBeInTheDocument();
  expect(screen.getAllByText("No food logs in this period.")).toHaveLength(2);
  fireEvent.click(screen.getByRole("tab", { name: "Custom" }));
  expect(screen.getByLabelText("From")).toBeInTheDocument();
  expect(screen.getByLabelText("To")).toBeInTheDocument();
});
it("links reported workouts to their read-only history summary", () => {
  state.reportSessions = [
    {
      id: "completed-1",
      title: "Workout A",
      started_at: new Date().toISOString(),
      workout_session_exercises: [],
    },
  ];
  show(<Reports />);
  expect(screen.getByRole("link", { name: /Workout A/ })).toHaveAttribute(
    "href",
    "/workouts/history/$id",
  );
});

it("requires confirmation before signing out from settings", async () => {
  show(<SettingsPage />);
  fireEvent.click(screen.getAllByRole("button", { name: "Sign out" })[0]!);
  const dialog = await screen.findByRole("dialog", { name: "Sign out of FitTrack?" });
  expect(state.signOut).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole("button", { name: "Stay signed in" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(state.signOut).not.toHaveBeenCalled();
  fireEvent.click(screen.getAllByRole("button", { name: "Sign out" })[0]!);
  fireEvent.click(
    within(await screen.findByRole("dialog")).getByRole("button", { name: "Sign out" }),
  );
  await waitFor(() => expect(state.signOut).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(state.navigate).toHaveBeenCalledWith({ to: "/login" }));
});

it("keeps settings sections hidden until opened and mounts only the selected form", async () => {
  show(<SettingsPage />);
  expect(screen.queryByLabelText("Full name")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Body weight unit")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("New password")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Personal profile Your details/ }));
  const profile = await screen.findByRole("dialog", { name: "Personal profile" });
  expect(within(profile).getByLabelText("Full name")).toHaveValue("Test User");
  expect(screen.queryByLabelText("New password")).not.toBeInTheDocument();
  fireEvent.click(within(profile).getByRole("button", { name: "Cancel" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  fireEvent.click(screen.getByRole("button", { name: /Preferences Units/ }));
  const prefs = await screen.findByRole("dialog", { name: "Preferences" });
  expect(within(prefs).getByLabelText("Body weight unit")).toHaveValue("kg");
  expect(screen.queryByLabelText("Full name")).not.toBeInTheDocument();
  fireEvent.click(within(prefs).getByRole("button", { name: "Cancel" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  fireEvent.click(screen.getByRole("button", { name: /Account & security Password/ }));
  const account = await screen.findByRole("dialog", { name: "Account & security" });
  expect(within(account).getByLabelText("New password")).toBeInTheDocument();
  expect(screen.queryByLabelText("Body weight unit")).not.toBeInTheDocument();
  expect(state.write).not.toHaveBeenCalled();
});

it("keeps review selections when going back and shows a spinner during saving", async () => {
  let finish: (value: unknown) => void = () => {};
  state.rpc.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  show(<Onboarding />);
  completeOnboardingForm();
  fireEvent.click(screen.getByRole("button", { name: "Back" }));
  expect(screen.getByLabelText("Sat")).toBeChecked();
  expect(screen.getByLabelText("Dumbbells")).not.toBeChecked();
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  fireEvent.click(screen.getByRole("button", { name: "Save and open dashboard" }));
  const button = screen.getByRole("button", { name: "Saving your plan..." });
  expect(button).toBeDisabled();
  expect(button).toHaveAttribute("aria-busy", "true");
  expect(button.querySelector(".animate-spin")).not.toBeNull();
  fireEvent.click(button);
  expect(state.rpc).toHaveBeenCalledTimes(1);
  finish({ data: null, error: null });
  await waitFor(() => expect(state.navigate).toHaveBeenCalledWith({ to: "/dashboard" }));
});
