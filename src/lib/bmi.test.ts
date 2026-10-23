import { expect, it } from "vitest";
import { calculateBmi, bmiCategory } from "./bmi";
it("calculates using metres squared and rejects invalid measurements", () => {
  expect(calculateBmi(70, 175)).toBeCloseTo(22.85714);
  expect(calculateBmi(0, 175)).toBeNull();
  expect(calculateBmi(70, 0)).toBeNull();
  expect(calculateBmi(NaN, 175)).toBeNull();
});
it("classifies using unrounded boundaries", () => {
  expect(bmiCategory(18.499)).toBe("Underweight");
  expect(bmiCategory(18.5)).toBe("Healthy weight");
  expect(bmiCategory(24.999)).toBe("Healthy weight");
  expect(bmiCategory(25)).toBe("Overweight");
  expect(bmiCategory(30)).toBe("Obesity");
});
