import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ThemeSelector } from "@/components/theme-selector";
import { ThemeController, setTheme, themeScript } from "./theme";
beforeEach(() => {
  localStorage.clear();
  setTheme("dark");
});
afterEach(cleanup);
it("applies and persists light mode across mounted controls", () => {
  render(
    <>
      <ThemeController />
      <ThemeSelector />
    </>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Light" }));
  expect(document.documentElement).toHaveClass("light");
  expect(document.documentElement).not.toHaveClass("dark");
  expect(localStorage.getItem("fittrack-theme")).toBe("light");
  expect(document.documentElement.style.colorScheme).toBe("light");
  expect(screen.getByRole("button", { name: "Light" })).toHaveAttribute("aria-pressed", "true");
  cleanup();
  render(<ThemeSelector />);
  expect(screen.getByRole("button", { name: "Light" })).toHaveAttribute("aria-pressed", "true");
});
it("responds to device changes only while System is selected", () => {
  let dark = false;
  const listeners = new Set<() => void>();
  vi.spyOn(window, "matchMedia").mockImplementation(
    () =>
      ({
        matches: dark,
        addEventListener: (_event: string, cb: () => void) => listeners.add(cb),
        removeEventListener: (_event: string, cb: () => void) => listeners.delete(cb),
      }) as unknown as MediaQueryList,
  );
  render(
    <>
      <ThemeController />
      <ThemeSelector />
    </>,
  );
  fireEvent.click(screen.getByRole("button", { name: "System" }));
  expect(document.documentElement).toHaveClass("light");
  act(() => {
    dark = true;
    listeners.forEach((cb) => cb());
  });
  expect(document.documentElement).toHaveClass("dark");
  fireEvent.click(screen.getByRole("button", { name: "Light" }));
  act(() => {
    listeners.forEach((cb) => cb());
  });
  expect(document.documentElement).toHaveClass("light");
  vi.restoreAllMocks();
});
it("synchronizes another tabs selection", () => {
  render(
    <>
      <ThemeController />
      <ThemeSelector />
    </>,
  );
  act(() => {
    localStorage.setItem("fittrack-theme", "light");
    window.dispatchEvent(new Event("storage"));
  });
  expect(document.documentElement).toHaveClass("light");
});
it("restores the saved choice before the app mounts", () => {
  localStorage.setItem("fittrack-theme", "light");
  Function(themeScript)();
  expect(document.documentElement).toHaveClass("light");
});
