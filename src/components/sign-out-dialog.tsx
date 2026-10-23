import { LogOut, Loader2 } from "lucide-react";
import { ResponsiveModal } from "./responsive-modal";
import { Button } from "./ui/button";
import { ErrorBlock } from "./common";
export function SignOutDialog({
  open,
  onOpenChange,
  onConfirm,
  pending = false,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  pending?: boolean;
  error?: unknown;
}) {
  return (
    <ResponsiveModal
      open={open}
      onOpenChange={(value) => !pending && onOpenChange(value)}
      title="Sign out of FitTrack?"
      description="Your saved workouts, meals and measurements will be here when you return."
      footer={
        <div className="grid grid-cols-2 gap-3 sm:flex sm:justify-end">
          <Button
            variant="outline"
            className="h-11 rounded-xl"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Stay signed in
          </Button>
          <Button
            className="h-11 rounded-xl"
            disabled={pending}
            aria-busy={pending}
            onClick={onConfirm}
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
            {pending ? "Signing out..." : "Sign out"}
          </Button>
        </div>
      }
    >
      <div className="flex items-start gap-4 rounded-2xl border bg-elevated/20 p-5">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <LogOut className="size-5" />
        </span>
        <div>
          <p className="text-sm font-semibold">Ready to take a break?</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            You will need to sign in again to access your account. Save any changes you want to keep
            before leaving.
          </p>
        </div>
      </div>
      {error != null && (
        <div className="mt-4">
          <ErrorBlock error={error} />
        </div>
      )}
    </ResponsiveModal>
  );
}
