import type { ReactNode } from "react";
import { Loader2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex min-w-0 flex-col gap-4 border-b border-border/60 pb-5 md:mb-7 md:flex-row md:items-center md:justify-between md:gap-6 md:pb-6">
      <div className="min-w-0 flex-1">
        <h1 className="break-words font-display text-2xl font-bold leading-tight tracking-tight md:text-3xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex max-w-full shrink-0 flex-wrap items-center gap-2 [&>button]:h-11 [&>button]:rounded-xl [&>a]:min-h-11 [&>a]:rounded-xl">
          {actions}
        </div>
      )}
    </header>
  );
}

export function Panel({
  id,
  title,
  action,
  children,
  className,
}: {
  id?: string;
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn("animate-rise rounded-2xl border bg-card p-4 shadow-card md:p-5", className)}
    >
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-base font-semibold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  unit,
  hint,
  icon: Icon,
  tone = "primary",
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  hint?: ReactNode;
  icon?: LucideIcon;
  tone?: "primary" | "info" | "warning";
}) {
  const toneCls = {
    primary: "text-primary bg-primary/10",
    info: "text-info bg-info/10",
    warning: "text-warning bg-warning/10",
  }[tone];
  return (
    <div className="animate-rise rounded-2xl border bg-card p-4 shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        {Icon && (
          <span className={cn("grid size-8 place-items-center rounded-lg", toneCls)}>
            <Icon className="size-4" aria-hidden />
          </span>
        )}
      </div>
      <p className="mt-2 font-display text-3xl font-bold tabular-nums">
        {value}
        {unit && <span className="ml-1 text-base font-medium text-muted-foreground">{unit}</span>}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function ProgressBar({
  value,
  max,
  tone = "primary",
  label,
}: {
  value: number;
  max: number;
  tone?: "primary" | "info" | "warning";
  label: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const bar = { primary: "bg-primary", info: "bg-info", warning: "bg-warning" }[tone];
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
      className="h-2.5 w-full overflow-hidden rounded-full bg-elevated"
    >
      <div
        className={cn("h-full rounded-full transition-all duration-500", bar)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function ProgressRing({
  value,
  max,
  size = 120,
  stroke = 10,
  label,
  children,
  tone = "primary",
}: {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  label: string;
  children?: ReactNode;
  tone?: "primary" | "info";
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return (
    <div
      className="relative inline-grid place-items-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label}: ${Math.round(value)} of ${Math.round(max)}`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          className="fill-none stroke-elevated"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeLinecap="round"
          className={cn(
            "fill-none transition-all duration-700",
            tone === "primary" ? "stroke-primary" : "stroke-info",
          )}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: LucideIcon;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-6 text-center">
      <span className="grid size-10 place-items-center rounded-full bg-elevated text-muted-foreground">
        <Icon className="size-5" aria-hidden />
      </span>
      <p className="font-medium">{title}</p>
      {body && <p className="max-w-sm text-sm text-muted-foreground">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function LoadingBlock({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-xl bg-elevated" />
      ))}
    </div>
  );
}

export function ErrorBlock({ error, retry }: { error: unknown; retry?: () => void }) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm"
    >
      <p className="font-medium text-destructive">Couldn't load this data.</p>
      <p className="mt-1 text-muted-foreground">
        {error instanceof Error ? error.message : String(error)}
      </p>
      {retry && (
        <button
          onClick={retry}
          className="mt-2 font-medium text-primary underline-offset-4 hover:underline"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function Spinner() {
  return <Loader2 className="size-4 animate-spin" aria-hidden />;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  body,
  confirmLabel = "Delete",
  onConfirm,
  destructive = true,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  body: string;
  confirmLabel?: string;
  onConfirm: () => void;
  destructive?: boolean;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{body}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={
              destructive
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : undefined
            }
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function RangeTabs<V extends string>({
  value,
  onChange,
  options,
}: {
  value: V;
  onChange: (v: V) => void;
  options: { value: V; label: string }[];
}) {
  return (
    <div role="tablist" className="inline-flex rounded-lg bg-elevated p-1">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "min-h-8 rounded-md px-3 text-xs font-semibold transition-colors",
            value === o.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
