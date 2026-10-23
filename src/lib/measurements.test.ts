import { describe, it, expect } from "vitest";
import {
  weightToDisplay,
  weightToKg,
  heightToDisplay,
  heightToCm,
  validateGoal,
} from "./measurements";
import { parseISODate, shiftISO, todayISO } from "./dates";
import { avgWeeklyChange, ageFromDob, scheduledPlanFor } from "./calc";
describe("Unit preferences and calendar boundaries", () => {
  it("round trips body weight and height across supported units", () => {
    expect(weightToDisplay(50, "lb")).toBe(110.23);
    expect(weightToKg(110.23, "lb")).toBe(50);
    expect(heightToCm(heightToDisplay(163, "ft"), "ft")).toBeCloseTo(163, 0);
  });
  it("handles month boundaries and rejects nonexistent dates", () => {
    expect(shiftISO("2026-03-01", -1)).toBe("2026-02-28");
    expect(() => parseISODate("2026-02-30")).toThrow();
  });
  it("uses the chosen time zone around midnight", () => {
    expect(todayISO("Asia/Manila", new Date("2026-10-22T18:00:00Z"))).toBe("2026-10-23");
    expect(todayISO("America/New_York", new Date("2026-10-22T18:00:00Z"))).toBe("2026-10-22");
  });
  it("validates goal direction and maintenance", () => {
    expect(() => validateGoal(48, 55, 0.25, "build_muscle")).not.toThrow();
    expect(() => validateGoal(80, 70, -0.25, "lose_weight")).not.toThrow();
    expect(() => validateGoal(48, 55, -0.25, "gain_weight")).toThrow();
    expect(() => validateGoal(60, 60, 0, "maintain")).not.toThrow();
  });
  it("does not report a trend for empty or same-day measurements", () => {
    expect(avgWeeklyChange([])).toBeNull();
    expect(
      avgWeeklyChange([
        { weight_kg: 50, measured_at: "2026-10-23" },
        { weight_kg: 51, measured_at: "2026-10-23" },
      ]),
    ).toBeNull();
    expect(ageFromDob("not-a-date")).toBeNull();
  });
  it("ignores schedules outside their effective dates", () => {
    expect(
      scheduledPlanFor(new Date(2026, 9, 23), [
        { workout_plan_id: "A", day_of_week: 5, week_parity: "all", effective_from: "2026-11-01" },
      ]),
    ).toBeNull();
  });
});
