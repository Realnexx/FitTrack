export type WeightUnit = "kg" | "lb";
export type HeightUnit = "cm" | "ft";
export const weightToDisplay = (kg: number, unit: string = "kg") =>
  Math.round(kg * (unit === "lb" ? 2.2046226218 : 1) * 100) / 100;
export const weightToKg = (value: number, unit: string = "kg") =>
  Math.round((value / (unit === "lb" ? 2.2046226218 : 1)) * 100) / 100;
export const heightToDisplay = (cm: number, unit: string = "cm") =>
  Math.round((cm / (unit === "ft" ? 30.48 : 1)) * 100) / 100;
export const heightToCm = (value: number, unit: string = "cm") =>
  Math.round(value * (unit === "ft" ? 30.48 : 1) * 10) / 10;
export function validateGoal(start: number, target: number, weekly: number, type: string) {
  if (
    ![start, target, weekly].every(Number.isFinite) ||
    start <= 20 ||
    start >= 400 ||
    target <= 20 ||
    target >= 400 ||
    Math.abs(weekly) > 2
  )
    throw new Error("Enter valid weight and weekly change targets.");
  if ((type === "gain_weight" || type === "build_muscle") && (target <= start || weekly <= 0))
    throw new Error(
      "For weight gain or muscle building, choose a higher target and positive weekly change.",
    );
  if (type === "lose_weight" && (target >= start || weekly >= 0))
    throw new Error("For weight loss, choose a lower target and negative weekly change.");
  if (type === "maintain" && (target !== start || weekly !== 0))
    throw new Error("For maintenance, match your starting weight and set weekly change to zero.");
}
