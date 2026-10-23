import { createContext, useContext, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Loader2, Check, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
export const ModalFooterContext = createContext<HTMLElement | null | undefined>(undefined);
/** Forms keep their actions in the modal's fixed footer, outside its scrolling body. */
export function ModalActionBar({ children }: { children: ReactNode }) {
  const target = useContext(ModalFooterContext);
  if (target === undefined)
    return <div className="sticky bottom-0 mt-6 border-t bg-card py-4">{children}</div>;
  return target ? createPortal(children, target) : null;
}
export function ModalFormActions({
  form,
  onCancel,
  pending = false,
  label = "Save changes",
  pendingLabel = "Saving…",
  disabled = false,
  saved = false,
  hint,
}: {
  form: string;
  onCancel: () => void;
  pending?: boolean;
  label?: string;
  pendingLabel?: string;
  disabled?: boolean;
  saved?: boolean;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <p
        role="status"
        aria-live="polite"
        className="flex items-center gap-2 text-xs text-muted-foreground"
      >
        {saved ? (
          <>
            <Check className="size-3.5 text-primary" />
            Changes saved
          </>
        ) : pending ? (
          <>
            <Loader2 className="size-3.5 animate-spin" />
            Saving your changes
          </>
        ) : (
          hint
        )}
      </p>
      <div className="grid grid-cols-2 gap-3 sm:flex sm:shrink-0">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={pending}
          className="h-11 rounded-xl border-border/80 px-5"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          form={form}
          disabled={pending || disabled}
          aria-busy={pending}
          className="h-11 sm:min-w-36 rounded-xl px-5 font-semibold transition-all active:scale-[0.98]"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {pending ? pendingLabel : label}
        </Button>
      </div>
    </div>
  );
}

