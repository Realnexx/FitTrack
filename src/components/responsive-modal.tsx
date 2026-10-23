import { ModalFooterContext } from "@/components/modal-actions";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
export function ResponsiveModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const mobile = useIsMobile();
  const [footerTarget, setFooterTarget] = useState<HTMLDivElement | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const opener =
    typeof document === "undefined" ? null : (document.activeElement as HTMLElement | null);
  useEffect(() => {
    if (open) returnFocus.current = opener;
  }, [open]);
  const restoreFocus = (event: Event) => {
    if (returnFocus.current?.isConnected) {
      event.preventDefault();
      returnFocus.current.focus();
    }
  };
  if (mobile)
    return (
      <ModalFooterContext.Provider value={footerTarget}>
        <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
          <DrawerContent onCloseAutoFocus={restoreFocus} className="max-h-[92dvh] rounded-t-3xl">
            <DrawerHeader className="relative shrink-0 border-b px-5 pb-5 pr-16 text-left">
              <DrawerTitle className="font-display text-xl">{title}</DrawerTitle>
              <DrawerDescription>{description}</DrawerDescription>
              <DrawerClose asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-3 top-2 rounded-full border border-border/60 bg-elevated/60 text-muted-foreground hover:bg-elevated hover:text-foreground"
                  aria-label="Close dialog"
                >
                  <X className="size-5" />
                </Button>
              </DrawerClose>
            </DrawerHeader>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
              {children}
            </div>
            <div
              ref={setFooterTarget}
              className="pb-safe shrink-0 border-t border-border/70 bg-card px-5 py-4 empty:hidden"
            >
              {footer}
            </div>
          </DrawerContent>
        </Drawer>
      </ModalFooterContext.Provider>
    );
  return (
    <ModalFooterContext.Provider value={footerTarget}>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          onCloseAutoFocus={restoreFocus}
          className="flex w-[calc(100%-3rem)] sm:rounded-2xl max-h-[85dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl"
        >
          <DialogHeader className="shrink-0 border-b border-border/70 bg-card/60 px-7 py-6 pr-16">
            <DialogTitle className="font-display text-2xl">{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-7 py-6">
            {children}
          </div>
          <div
            ref={setFooterTarget}
            className="shrink-0 border-t border-border/70 bg-card px-7 py-4 empty:hidden"
          >
            {footer}
          </div>
        </DialogContent>
      </Dialog>
    </ModalFooterContext.Provider>
  );
}
