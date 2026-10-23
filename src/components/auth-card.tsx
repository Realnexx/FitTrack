import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Dumbbell } from "lucide-react";

export function Logo({ compact = false }: { compact?: boolean } = {}) {
  return (
    <Link
      to="/"
      aria-label="FitTrack home"
      className="flex items-center gap-2 font-display text-xl font-bold"
    >
      <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-glow">
        <Dumbbell className="size-5" aria-hidden />
      </span>
      {!compact && "FitTrack"}
    </Link>
  );
}

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="bg-hero flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="mb-8">
        <Logo />
      </div>
      <div className="w-full max-w-md animate-rise rounded-2xl border bg-card p-6 shadow-card md:p-8">
        <h1 className="font-display text-2xl font-bold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
      {footer && <div className="mt-6 text-sm text-muted-foreground">{footer}</div>}
    </main>
  );
}

export function FieldError({ id, message }: { id: string; message?: string | undefined }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1 text-xs text-destructive">
      {message}
    </p>
  );
}
