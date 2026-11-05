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
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const opener =
    typeof document === "undefined" ? null : (document.activeElement as HTMLElement | null);
  useEffect(() => {
    if (open) returnFocus.current = opener;
    else {
      setKeyboardOpen(false);
      setViewportHeight(null);
    }
  }, [open]);
  useEffect(() => {
    if (!open || !mobile || typeof window === "undefined") return;
    const vv = window.visualViewport;
    if (!vv) return;
    const initialHeight = window.innerHeight;
    const updateViewport = () => {
      const nextHeight = Math.round(vv.height);
      setViewportHeight(nextHeight);
      const active = document.activeElement;
      const inputFocused =
        active instanceof HTMLElement && active.matches("input, textarea, select");
      if (
        inputFocused ||
        initialHeight - nextHeight > 120 ||
        window.innerHeight - nextHeight > 120
      ) {
        setKeyboardOpen(true);
      } else {
        setKeyboardOpen(false);
      }
    };
    updateViewport();
    vv.addEventListener("resize", updateViewport);
    return () => vv.removeEventListener("resize", updateViewport);
  }, [open, mobile]);
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
          <DrawerContent
            onCloseAutoFocus={restoreFocus}
            style={
              keyboardOpen && viewportHeight
                ? { maxHeight: `${Math.max(220, viewportHeight)}px` }
                : undefined
            }
            className={
              keyboardOpen
                ? "mt-0 max-h-dvh rounded-t-none border-t-0 [&>div:first-child]:hidden"
                : "mt-2 max-h-[96dvh] rounded-t-3xl [&>div:first-child]:mt-2 [&>div:first-child]:h-1.5 [&>div:first-child]:w-12"
            }
          >
            <DrawerHeader
              className={`relative shrink-0 border-b px-4 pr-14 text-left transition-all ${
                keyboardOpen ? "py-2" : "pt-2.5 pb-3"
              }`}
            >
              <DrawerTitle className="font-display text-lg leading-snug">{title}</DrawerTitle>
              <DrawerDescription className={keyboardOpen ? "sr-only" : "text-xs leading-snug"}>
                {description}
              </DrawerDescription>
              <DrawerClose asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-3 top-1.5 size-8 rounded-full border border-border/60 bg-elevated/60 text-muted-foreground hover:bg-elevated hover:text-foreground"
                  aria-label="Close dialog"
                >
                  <X className="size-4" />
                </Button>
              </DrawerClose>
            </DrawerHeader>
            <div
              className="min-h-0 flex-1 scroll-py-3 overflow-y-auto overscroll-contain px-4 py-3"
              onFocusCapture={(e) => {
                const target = e.target;
                if (
                  target instanceof HTMLElement &&
                  target.matches("input, textarea, select")
                ) {
                  setKeyboardOpen(true);
                  window.setTimeout(() => {
                    if (typeof target.scrollIntoView === "function") {
                      target.scrollIntoView({ block: "nearest", behavior: "smooth" });
                    }
                  }, 120);
                }
              }}
              onBlurCapture={(e) => {
                const next = e.relatedTarget;
                if (
                  !(
                    next instanceof HTMLElement &&
                    next.matches("input, textarea, select")
                  )
                ) {
                  setKeyboardOpen(false);
                }
              }}
            >
              {children}
              <div
                ref={setFooterTarget}
                className="pb-safe mt-4 border-t border-border/70 pt-3 empty:hidden"
              >
                {footer}
              </div>
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
