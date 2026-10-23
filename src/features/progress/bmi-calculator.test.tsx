import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { BmiForm } from "./bmi-calculator";
afterEach(cleanup);
it("prefills measurements, calculates live and gates adult categories", () => {
  render(<BmiForm weightKg={70} heightCm={175} />);
  expect(screen.getByRole("status")).toHaveTextContent("22.9");
  expect(screen.getByRole("status")).not.toHaveTextContent("Healthy weight");
  fireEvent.click(screen.getByRole("checkbox"));
  expect(screen.getByRole("status")).toHaveTextContent("Healthy weight");
  fireEvent.change(screen.getByLabelText("BMI weight"), { target: { value: "95" } });
  expect(screen.getByRole("status")).toHaveTextContent("31.0");
  expect(screen.getByRole("status")).toHaveTextContent("Obesity");
});
it("preserves the result when converting to imperial units", () => {
  render(<BmiForm weightKg={70} heightCm={175} />);
  fireEvent.click(screen.getByRole("button", { name: "lb / in" }));
  expect(screen.getByRole("status")).toHaveTextContent("22.9");
  expect(Number((screen.getByLabelText("BMI weight") as HTMLInputElement).value)).toBeCloseTo(
    154.32,
  );
});
it("does not show a fabricated result for empty or invalid inputs", () => {
  render(<BmiForm weightKg={0} heightCm={null} />);
  expect(screen.getByRole("status")).toHaveTextContent("—");
  fireEvent.change(screen.getByLabelText("BMI weight"), { target: { value: "70" } });
  fireEvent.change(screen.getByLabelText("BMI height"), { target: { value: "0" } });
  expect(screen.getByRole("alert")).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("—");
});
