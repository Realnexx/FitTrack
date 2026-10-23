import { UserAvatar } from "./user-avatar";
import { Link } from "@tanstack/react-router";
import {
  ChevronRight,
  Dumbbell,
  Home,
  Utensils,
  TrendingUp,
  Settings,
  BarChart3,
  History,
} from "lucide-react";
const sections = [
  { path: "/dashboard", label: "Dashboard", icon: Home },
  { path: "/workouts/history", label: "Workout history", icon: History },
  { path: "/workouts", label: "Workouts", icon: Dumbbell },
  { path: "/nutrition", label: "Nutrition", icon: Utensils },
  { path: "/progress", label: "Progress", icon: TrendingUp },
  { path: "/reports", label: "Reports", icon: BarChart3 },
  { path: "/settings", label: "Settings", icon: Settings },
];
export function AppHeader({
  pathname,
  name,
  photo,
}: {
  pathname: string;
  name: string;
  photo?: string | null;
}) {
  const section =
    sections.find((item) => pathname === item.path || pathname.startsWith(item.path + "/")) ??
    sections[0]!;
  const Icon = section.icon;
  return (
    <header className="sticky top-0 z-10 flex min-h-16 min-w-0 items-center justify-between gap-3 border-b border-border/60 bg-background/85 backdrop-blur-xl px-4 py-3 md:min-h-20 md:px-8">
      <nav aria-label="Current section" className="flex min-w-0 items-center gap-2 text-sm">
        <Link
          to="/dashboard"
          className="shrink-0 rounded-lg font-display text-base font-bold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Fit<span className="text-primary">Track</span>
        </Link>
        <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/60" aria-hidden="true" />
        <span
          aria-current="page"
          className="flex min-w-0 items-center gap-2 font-medium text-muted-foreground"
        >
          <Icon className="hidden size-4 shrink-0 sm:block" aria-hidden="true" />
          <span className="truncate">{section.label}</span>
        </span>
      </nav>
      <Link
        to="/settings"
        aria-label={`Profile and settings for ${name}`}
        className="flex max-w-[45%] shrink-0 items-center gap-2.5 rounded-full border border-border/60 bg-card p-1 transition-colors hover:border-primary/40 hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:pr-4"
      >
        <UserAvatar name={name} src={photo ?? null} className="size-8" />
        <span className="hidden min-w-0 truncate text-sm font-medium sm:block">{name}</span>
      </Link>
    </header>
  );
}
