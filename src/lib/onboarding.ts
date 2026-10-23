import { ageFromDob } from "./calc";
import { validateGoal } from "./measurements";
export type OnboardingDraft = Record<string, string>;
export const list = (value: string | undefined) => (value ?? "").split(",").filter(Boolean);
export function validateOnboardingStep(step: number, d: OnboardingDraft, name: string) {
  const n = (key: string) => (d[key]?.trim() ? Number(d[key]) : NaN);
  if (step === 1) {
    const age = ageFromDob(d["dob"] ?? null);
    if (!name.trim()) throw new Error("Enter your full name.");
    if (age === null || age < 13 || age > 100)
      throw new Error("Enter a date of birth corresponding to an age between 13 and 100.");
    if (
      !Number.isFinite(n("height")) ||
      n("height") < 51 ||
      n("height") > 279 ||
      !Number.isFinite(n("weight")) ||
      n("weight") <= 20 ||
      n("weight") >= 400
    )
      throw new Error("Enter your actual height and starting weight.");
    if (!["sedentary", "light", "moderate", "active", "very_active"].includes(d["activity"] ?? ""))
      throw new Error("Choose your activity level.");
  }
  if (
    step === 2 &&
    !["gain_weight", "build_muscle", "maintain", "lose_weight"].includes(d["goal"] ?? "")
  )
    throw new Error("Choose your primary goal.");
  if (step === 3) {
    validateGoal(n("weight"), n("target"), n("weekly"), d["goal"] ?? "");
    if (
      !Number.isInteger(n("calories")) ||
      n("calories") < 800 ||
      n("calories") > 8000 ||
      !Number.isInteger(n("protein")) ||
      n("protein") < 10 ||
      n("protein") > 500
    )
      throw new Error("Enter daily calories (800–8000) and protein (10–500 g).");
  }
  if (step === 4) {
    if (!d["location"]?.trim()) throw new Error("Enter your workout location.");
    if (!list(d["equipment"]).length)
      throw new Error(
        "Choose at least one equipment option, including Bodyweight if you have no equipment.",
      );
    if (!list(d["days"]).length) throw new Error("Choose at least one training day.");
    if (!["beginner", "intermediate", "advanced"].includes(d["experience"] ?? ""))
      throw new Error("Choose your experience level.");
  }
}
export function onboardingPayload(d: OnboardingDraft, name: string, startDate: string) {
  for (const step of [1, 2, 3, 4]) validateOnboardingStep(step, d, name);
  return {
    full_name: name.trim(),
    date_of_birth: d["dob"]!,
    height_cm: Number(d["height"]),
    sex: d["sex"] || null,
    activity_level: d["activity"]!,
    experience_level: d["experience"]!,
    workout_location: d["location"]!.trim(),
    equipment: list(d["equipment"]),
    preferred_days: list(d["days"])
      .map(Number)
      .sort((a, b) => a - b),
    goal_type: d["goal"]!,
    starting_weight_kg: Number(d["weight"]),
    target_weight_kg: Number(d["target"]),
    weekly_weight_change_target_kg: Number(d["weekly"]),
    daily_calorie_target: Number(d["calories"]),
    daily_protein_target_g: Number(d["protein"]),
    start_date: startDate,
  };
}
