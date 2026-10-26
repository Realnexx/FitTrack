import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ScheduleEditor } from "./schedule-editor";
import { SessionExerciseCards } from "./session-exercise-cards";
import type { Schedule, SessionExercise } from "@/lib/data";
afterEach(cleanup);
it("selects a training day and submits the precise routine and week pattern", () => {
  const save = vi.fn();
  render(
    <>
      <ScheduleEditor
        formId="schedule"
        plans={[
          { id: "a", name: "Workout A" },
          { id: "b", name: "Workout B" },
        ]}
        rows={[]}
        pending={false}
        onSave={save}
        onRemove={() => {}}
      />
      <button type="submit" form="schedule">
        Save routine
      </button>
    </>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Wed Rest" }));
  fireEvent.change(screen.getByLabelText("Plan"), { target: { value: "b" } });
  fireEvent.change(screen.getByLabelText("Week"), { target: { value: "odd" } });
  fireEvent.click(screen.getByRole("button", { name: "Save routine" }));
  expect(save).toHaveBeenCalledTimes(1);
  const data = new FormData(save.mock.calls[0]![0]);
  expect(Object.fromEntries(data)).toEqual({ day: "3", plan: "b", parity: "odd" });
});
it("shows saved assignments and requests removal without deleting directly", () => {
  const remove = vi.fn();
  const rows = [
    { id: "row", day_of_week: 1, week_parity: "even", workout_plan_id: "a" },
  ] as Schedule[];
  render(
    <ScheduleEditor
      formId="schedule"
      plans={[{ id: "a", name: "Workout A" }]}
      rows={rows}
      pending={false}
      onSave={() => {}}
      onRemove={remove}
    />,
  );
  expect(screen.getByText("Even ISO weeks", { selector: "p" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Remove Mon even schedule" }));
  expect(remove).toHaveBeenCalledWith("row");
});
it("disables scheduling while saving and when no plans exist", () => {
  render(
    <ScheduleEditor
      formId="schedule"
      plans={[]}
      rows={[]}
      pending={false}
      onSave={() => {}}
      onRemove={() => {}}
    />,
  );
  expect(screen.getByLabelText("Plan")).toBeDisabled();
  expect(screen.getByText("Create a plan first")).toBeInTheDocument();
});
it("visualizes saved sets and opens only the chosen exercise", () => {
  const open = vi.fn();
  const exercises = [
    {
      id: "e1",
      target_sets: 3,
      target_reps_min: 8,
      target_reps_max: 12,
      status: "completed",
      sets: [{}, {}, {}],
      exercise: { name: "Squat", tracking_type: "reps" },
    },
    {
      id: "e2",
      target_sets: 2,
      target_duration_seconds: 30,
      status: "pending",
      sets: [],
      exercise: { name: "Plank", tracking_type: "time" },
    },
  ] as unknown as SessionExercise[];
  render(<SessionExerciseCards exercises={exercises} onOpen={open} />);
  expect(screen.getByRole("img", { name: "1 of 2 exercises complete" })).toBeInTheDocument();
  expect(screen.getByText("50%")).toBeInTheDocument();
  expect(screen.getByText("3 / 3 sets recorded")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Open Plank" }));
  expect(open).toHaveBeenCalledWith("e2");
  expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
});
