import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, describe, it, expect } from "vitest";
import { ExerciseInstructions } from "./exercise-guide";
afterEach(cleanup);
describe("Exercise instructions", () => {
  it("shows distinct movement images with numbered procedures", () => {
    render(<ExerciseInstructions name="Dumbbell Floor Press" instructions={null} />);
    expect(screen.getAllByRole("img")).toHaveLength(2);
    expect(screen.getByRole("heading", { name: "How to do it" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    expect(screen.getByText(/Keep wrists straight/)).toBeInTheDocument();
  });
  it("shows plank preparation photos with forearm instructions", () => {
    render(<ExerciseInstructions name="Forearm Plank" instructions={null} />);
    expect(screen.getAllByRole("img")[0]).toHaveAttribute("src", "/exercises/plank-0.jpg");
    expect(screen.getByText(/Place your forearms/)).toBeInTheDocument();
  });
  it("retains custom exercise instructions without showing unrelated images", () => {
    render(
      <ExerciseInstructions name="Custom movement" instructions="Follow your custom routine." />,
    );
    expect(screen.getByText("Follow your custom routine.")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
  it("keeps instructions usable if an image cannot load", () => {
    render(<ExerciseInstructions name="Push-Up" instructions={null} />);
    fireEvent.error(screen.getAllByRole("img")[0]!);
    expect(screen.getByText("Exercise image unavailable")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
  });
});
