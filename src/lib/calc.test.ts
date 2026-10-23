import { describe, expect, it } from "vitest";
import { goalProgress, scaleNutrition, sumMacros, trainingVolume, scheduledPlanFor } from "./calc";

describe("goalProgress", () => {
  it("48 → 49 toward 55 is ~14.3% and progressing", () => {
    const g = goalProgress(48, 49, 55);
    expect(g.change).toBe(1);
    expect(g.remaining).toBe(6);
    expect(g.percent).toBe(14.3);
    expect(g.status).toBe("progressing");
  });
  it("no change yet is not started", () => {
    expect(goalProgress(48, 48, 55).status).toBe("not_started");
  });
  it("reaching target is reached and clamps at 100", () => {
    expect(goalProgress(48, 56, 55).percent).toBe(100);
    expect(goalProgress(48, 56, 55).status).toBe("reached");
  });
  it("weight loss goals compute positive progress", () => {
    expect(goalProgress(80, 75, 70).percent).toBe(50);
  });
  it("zero denominator does not divide by zero", () => {
    expect(goalProgress(60, 60, 60).percent).toBe(100);
  });
  it("moving the wrong way clamps at 0", () => {
    expect(goalProgress(48, 47, 55).percent).toBe(0);
  });
});

describe("scaleNutrition", () => {
  it("200 g of a 150 kcal / 10 g protein per 100 g food is 300 kcal / 20 g", () => {
    const r = scaleNutrition(
      { serving_size: 100, calories: 150, protein: 10, carbs: 20, fat: 5 },
      200,
    );
    expect(r.calories).toBe(300);
    expect(r.protein).toBe(20);
    expect(r.carbs).toBe(40);
    expect(r.fat).toBe(10);
  });
  it("rejects zero quantity", () => {
    expect(
      scaleNutrition({ serving_size: 100, calories: 150, protein: 10, carbs: 0, fat: 0 }, 0)
        .calories,
    ).toBe(0);
  });
  it("sums without float noise", () => {
    expect(
      sumMacros([
        { calories: 0.1, protein: 0.1, carbs: 0, fat: 0 },
        { calories: 0.2, protein: 0.2, carbs: 0, fat: 0 },
      ]).protein,
    ).toBe(0.3);
  });
});

describe("trainingVolume", () => {
  it("doubles per-dumbbell load and skips timed sets", () => {
    expect(
      trainingVolume([
        { repetitions: 10, weight_kg: 5, weight_basis: "per_dumbbell" },
        { repetitions: 10, weight_kg: 8, weight_basis: "combined" },
        { repetitions: null, weight_kg: null },
      ]),
    ).toBe(180);
  });
});

describe("scheduledPlanFor", () => {
  const rows = [
    { workout_plan_id: "A", day_of_week: 1, week_parity: "odd" },
    { workout_plan_id: "B", day_of_week: 1, week_parity: "even" },
  ];
  it("alternates by ISO week", () => {
    expect(scheduledPlanFor(new Date(2026, 0, 5), rows)).toBe("B"); // ISO week 2
    expect(scheduledPlanFor(new Date(2026, 0, 12), rows)).toBe("A"); // ISO week 3
    expect(scheduledPlanFor(new Date(2026, 0, 6), rows)).toBeNull();
  });
});
