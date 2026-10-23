import { it, expect } from "vitest";
import { onboardingPayload, validateOnboardingStep } from "./onboarding";
const draft = {
  dob: "2000-01-01",
  height: "170",
  weight: "60",
  sex: "",
  activity: "active",
  goal: "maintain",
  target: "60",
  weekly: "0",
  calories: "2200",
  protein: "100",
  location: "Home",
  equipment: "Bodyweight",
  days: "6,0,2",
  experience: "beginner",
};
it("preserves an explicitly entered zero weekly change and sorts the selected days", () => {
  expect(onboardingPayload(draft, " Registered Name ", "2026-10-23")).toMatchObject({
    full_name: "Registered Name",
    weekly_weight_change_target_kg: 0,
    preferred_days: [0, 2, 6],
    sex: null,
  });
});
it("does not replace missing personal measurements with defaults", () => {
  expect(() => validateOnboardingStep(1, { ...draft, height: "" }, "Test")).toThrow(/height/);
});
it("requires users to select equipment and training days", () => {
  expect(() => validateOnboardingStep(4, { ...draft, equipment: "" }, "Test")).toThrow(/equipment/);
  expect(() => validateOnboardingStep(4, { ...draft, days: "" }, "Test")).toThrow(/training day/);
});
it("rejects targets that disagree with the chosen goal", () => {
  expect(() => onboardingPayload({ ...draft, goal: "build_muscle" }, "Test", "2026-10-23")).toThrow(
    /higher target/,
  );
});
