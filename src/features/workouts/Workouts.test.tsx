import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
const state = vi.hoisted(() => {
  const exercise = {
    id: "e1",
    name: "Push-Up",
    primary_muscle_group: "Chest",
    equipment: "Bodyweight",
    suggested_sets: 3,
    suggested_reps: "8–15",
    instructions: "Press up.",
    tracking_type: "reps",
    is_unilateral: false,
  };
  return {
    exercise,
    plan: {
      id: "p1",
      name: "Workout A",
      description: "Your full body routine",
      workout_plan_exercises: [{ id: "pe1" }],
    },
    mutate: vi.fn(),
  };
});
vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("@tanstack/react-router");
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
      <a href={to}>{children}</a>
    ),
  };
});
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));
vi.mock("@/lib/data", () => {
  const q = (data: unknown) => ({ data, isPending: false, error: null, refetch: vi.fn() });
  return {
    usePlans: () => q([state.plan]),
    useExercises: () => q([state.exercise]),
    useSchedule: () => q([]),
    useSessions: () => q([]),
    useActiveSession: () => q(null),
    usePlan: () =>
      q({
        plan: state.plan,
        items: [
          {
            id: "pe1",
            exercise: state.exercise,
            target_sets: 3,
            target_reps_min: 8,
            target_reps_max: 15,
            rest_seconds: 60,
          },
        ],
      }),
    useSession: () => q(null),
    useAction: () => ({ mutate: state.mutate, isPending: false }),
    unwrap: (r: { data: unknown }) => r.data,
    uid: async () => "user",
    qk: {
      plans: ["plans"],
      schedule: ["schedule"],
      activeSession: ["activeSession"],
      plan: (id: string) => ["plan", id],
    },
  };
});
import { Workouts, PlanEditor } from "./Workouts";
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
describe("Workout page detail flows", () => {
  it("keeps the page concise and opens plan details before editing", async () => {
    render(<Workouts />);
    expect(screen.queryByLabelText("Plan name")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "View details" }));
    const dialog = await screen.findByRole("dialog", { name: "Workout A" });
    expect(within(dialog).getByText("Planned sets")).toBeInTheDocument();
    expect(within(dialog).getByText("Push-Up")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Edit plan" }));
    expect(await screen.findByRole("dialog", { name: "Edit workout plan" })).toBeInTheDocument();
    expect(screen.getByLabelText("Plan name")).toHaveValue("Workout A");
    expect(screen.getByRole("button", { name: "Save plan" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Plan name"), { target: { value: "Workout B" } });
    fireEvent.click(screen.getByRole("button", { name: "Save plan" }));
    expect(state.mutate).toHaveBeenCalledWith(expect.any(HTMLFormElement));
  });
  it("opens plan creation in its own dialog", async () => {
    render(<Workouts />);
    fireEvent.click(screen.getByRole("button", { name: "New plan" }));
    const dialog = await screen.findByRole("dialog", { name: "Create a workout plan" });
    expect(within(dialog).getByLabelText("New plan name")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Create plan" })).toBeInTheDocument();
  });
  it("opens a searchable exercise guide without expanding the page", async () => {
    render(<Workouts />);
    fireEvent.change(screen.getByLabelText("Search exercise library"), {
      target: { value: "Chest" },
    });
    fireEvent.click(screen.getByRole("button", { name: "View guide for Push-Up" }));
    const dialog = await screen.findByRole("dialog", { name: "Push-Up" });
    expect(within(dialog).getByRole("heading", { name: "How to do it" })).toBeInTheDocument();
    expect(within(dialog).getAllByRole("img")).toHaveLength(2);
  });
  it("moves scheduling controls into a focused dialog", async () => {
    render(<Workouts />);
    expect(screen.queryByLabelText("Day")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Manage schedule" }));
    const dialog = await screen.findByRole("dialog", { name: "Your training schedule" });
    expect(within(dialog).getByLabelText("Day")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Plan")).toBeInTheDocument();
  });
});

it("opens exercise targets in a dedicated modal with a fixed save action", async () => {
  render(<PlanEditor id="p1" close={() => {}} />);
  expect(screen.queryByLabelText("Sets")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Edit targets for Push-Up" }));
  const dialog = await screen.findByRole("dialog", { name: "Edit Push-Up" });
  expect(within(dialog).getByLabelText("Sets")).toHaveValue(3);
  fireEvent.change(within(dialog).getByLabelText("Sets"), { target: { value: "4" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Save targets" }));
  expect(state.mutate).toHaveBeenCalledWith(
    expect.objectContaining({
      item: expect.objectContaining({ id: "pe1" }),
      form: expect.any(HTMLFormElement),
    }),
  );
  const payload = state.mutate.mock.calls.at(-1)![0];
  expect(new FormData(payload.form).get("sets")).toBe("4");
});
it("keeps add-exercise inputs hidden until its modal is opened", async () => {
  render(<PlanEditor id="p1" close={() => {}} />);
  expect(screen.queryByLabelText("Exercise")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Add an exercise" }));
  const dialog = await screen.findByRole("dialog", { name: "Add an exercise" });
  expect(within(dialog).getByLabelText("Exercise")).toHaveValue("e1");
  fireEvent.click(within(dialog).getByRole("button", { name: "Add to workout" }));
  expect(state.mutate).toHaveBeenCalledWith(expect.any(HTMLFormElement));
  fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
  expect(screen.queryByLabelText("Exercise")).not.toBeInTheDocument();
});
