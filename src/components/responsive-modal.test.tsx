import { useState } from "react";
import { render, screen, fireEvent, cleanup, waitFor, within } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
const device = vi.hoisted(() => ({ mobile: false }));
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => device.mobile }));
import { ModalActionBar, ModalFormActions } from "./modal-actions";
import { SignOutDialog } from "./sign-out-dialog";
import { ResponsiveModal } from "./responsive-modal";
afterEach(cleanup);
function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>View workout</button>
      <ResponsiveModal
        open={open}
        onOpenChange={setOpen}
        title="Workout A"
        description="Your exercises and targets."
      >
        <label>
          Plan name
          <input defaultValue="Workout A" />
        </label>
        <p>Three sets of ten repetitions.</p>
      </ResponsiveModal>
    </>
  );
}
describe("Responsive workout overlay", () => {
  it.each([false, true])(
    "opens and closes with accessible content on mobile=%s",
    async (mobile) => {
      device.mobile = mobile;
      render(<Harness />);
      const opener = screen.getByRole("button", { name: "View workout" });
      opener.focus();
      fireEvent.click(opener);
      const dialog = await screen.findByRole("dialog", { name: "Workout A" });
      expect(dialog).toHaveAccessibleDescription("Your exercises and targets.");
      expect(within(dialog).getByLabelText("Plan name")).toHaveValue("Workout A");
      fireEvent.click(
        within(dialog).getByRole("button", {
          name: mobile ? "Close dialog" : "Close",
        }),
      );
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      await waitFor(() => expect(opener).toHaveFocus());
    },
  );
  it("closes the desktop modal with Escape", async () => {
    device.mobile = false;
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "View workout" }));
    await screen.findByRole("dialog");
    fireEvent.keyDown(document, { key: "Escape", code: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});

it.each([false, true])("submits the form from the pinned footer on mobile=%s", async (mobile) => {
  device.mobile = mobile;
  const submit = vi.fn((event: React.FormEvent) => event.preventDefault());
  const cancel = vi.fn();
  const view = (pending: boolean) => (
    <ResponsiveModal open onOpenChange={vi.fn()} title="Edit plan" description="Plan details">
      <form id="test-plan" onSubmit={submit}>
        <input aria-label="Name" defaultValue="Workout A" />
      </form>
      <ModalActionBar>
        <ModalFormActions form="test-plan" onCancel={cancel} pending={pending} label="Save plan" />
      </ModalActionBar>
    </ResponsiveModal>
  );
  const { rerender } = render(view(false));
  const save = await screen.findByRole("button", { name: "Save plan" });
  expect(save.closest("form")).toBeNull();
  fireEvent.click(save);
  expect(submit).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(cancel).toHaveBeenCalledTimes(1);
  rerender(view(true));
  expect(screen.getByRole("button", { name: /^Saving/ })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
});

it.each([false, true])(
  "confirms sign out explicitly and blocks repeat clicks on mobile=%s",
  async (mobile) => {
    device.mobile = mobile;
    const confirm = vi.fn();
    const close = vi.fn();
    const view = (pending: boolean) => (
      <SignOutDialog open onOpenChange={close} onConfirm={confirm} pending={pending} />
    );
    const { rerender } = render(view(false));
    const dialog = await screen.findByRole("dialog", { name: "Sign out of FitTrack?" });
    expect(confirm).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Stay signed in" }));
    expect(close).toHaveBeenCalledWith(false);
    fireEvent.click(within(dialog).getByRole("button", { name: "Sign out" }));
    expect(confirm).toHaveBeenCalledTimes(1);
    rerender(view(true));
    expect(screen.getByRole("button", { name: "Signing out..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Stay signed in" })).toBeDisabled();
  },
);
