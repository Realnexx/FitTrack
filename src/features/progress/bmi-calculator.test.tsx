import { render, screen, fireEvent, cleanup, waitFor, act } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
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

it("saves a snapshot once and allows another save after changing inputs", async () => {
  const save = vi.fn().mockResolvedValue(undefined);
  render(<BmiForm weightKg={70} heightCm={175} onSave={save} />);
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Save BMI" }));
  await waitFor(() =>
    expect(save).toHaveBeenCalledWith({ weight_kg: 70, height_cm: 175, adult_confirmed: true }),
  );
  await waitFor(() => expect(screen.getByRole("button", { name: "BMI saved" })).toBeDisabled());
  fireEvent.change(screen.getByLabelText("BMI weight"), { target: { value: "71" } });
  expect(screen.getByRole("button", { name: "Save BMI" })).toBeEnabled();
});
it("prevents duplicate clicks while saving and allows retry after failure", async () => {
  let rejectSave!: (error: Error) => void;
  const save = vi.fn(
    () =>
      new Promise<void>((_resolve, reject) => {
        rejectSave = reject;
      }),
  );
  render(<BmiForm weightKg={70} heightCm={175} onSave={save} />);
  const button = screen.getByRole("button", { name: "Save BMI" });
  fireEvent.click(button);
  fireEvent.click(button);
  expect(save).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
  await act(async () => rejectSave(new Error("offline")));
  expect(screen.getByRole("button", { name: "Save BMI" })).toBeEnabled();
});
it("normalizes imperial measurements when saving", async () => {
  const save = vi.fn().mockResolvedValue(undefined);
  render(<BmiForm weightKg={70} heightCm={175} onSave={save} />);
  fireEvent.click(screen.getByRole("button", { name: "lb / in" }));
  fireEvent.click(screen.getByRole("button", { name: "Save BMI" }));
  await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  expect(save.mock.calls[0]?.[0].weight_kg).toBeCloseTo(70, 1);
  expect(save.mock.calls[0]?.[0].height_cm).toBeCloseTo(175, 1);
});
