export function calculateBmi(weightKg: number, heightCm: number): number | null {
  if (
    !Number.isFinite(weightKg) ||
    !Number.isFinite(heightCm) ||
    weightKg < 20 ||
    weightKg > 500 ||
    heightCm < 100 ||
    heightCm > 250
  )
    return null;
  return weightKg / (heightCm / 100) ** 2;
}
export function bmiCategory(bmi: number): string {
  return bmi < 18.5
    ? "Underweight"
    : bmi < 25
      ? "Healthy weight"
      : bmi < 30
        ? "Overweight"
        : "Obesity";
}
