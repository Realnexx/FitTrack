import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, it, expect, vi } from "vitest";
import type { ReactNode } from "react";
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...props }: { to: string; children: ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));
import { AppSidebar } from "./app-sidebar";
import { UserAvatar, profilePhoto } from "./user-avatar";
afterEach(cleanup);
it("reads valid photo URLs and rejects unsupported values", () => {
  expect(profilePhoto({ avatar_url: "https://example.com/profile.jpg" })).toBe(
    "https://example.com/profile.jpg",
  );
  expect(profilePhoto({ avatar_url: null, picture: "https://example.com/account.jpg" })).toBe(
    "https://example.com/account.jpg",
  );
  expect(profilePhoto({ avatar_url: "javascript:alert(1)" })).toBeNull();
  expect(profilePhoto(null)).toBeNull();
});
it("falls back to initials for a broken image and tries a changed photo", () => {
  const { rerender } = render(
    <UserAvatar name="Alvin Golosino" src="https://example.com/broken.jpg" />,
  );
  fireEvent.error(screen.getByRole("img"));
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
  expect(screen.getByText("AG")).toBeInTheDocument();
  rerender(<UserAvatar name="Alvin Golosino" src="https://example.com/new.jpg" />);
  expect(screen.getByRole("img")).toHaveAttribute("src", "https://example.com/new.jpg");
});
it("retains navigation and profile access when collapsed", () => {
  const toggle = vi.fn();
  const props = {
    collapsed: false,
    onToggle: toggle,
    pathname: "/workouts/history/session",
    name: "Alvin Golosino",
    photo: "https://example.com/profile.jpg",
    onLogout: vi.fn(),
  };
  const { rerender } = render(<AppSidebar {...props} />);
  expect(screen.getByRole("link", { name: "Workouts" })).toHaveAttribute("aria-current", "page");
  expect(screen.getByRole("link", { name: "Reports" })).toHaveAttribute("href", "/reports");
  fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));
  expect(toggle).toHaveBeenCalled();
  rerender(<AppSidebar {...props} collapsed />);
  expect(screen.getByRole("link", { name: "Workouts" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "View profile for Alvin Golosino" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Expand sidebar" })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
});
