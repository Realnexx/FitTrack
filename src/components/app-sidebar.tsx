import { Link } from "@tanstack/react-router";
import {
  Home,
  Dumbbell,
  Utensils,
  TrendingUp,
  BarChart3,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Logo } from "@/components/auth-card";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "./user-avatar";
import { cn } from "@/lib/utils";
const links = [
  { to: "/dashboard", label: "Overview", icon: Home, group: "daily" },
  { to: "/workouts", label: "Workouts", icon: Dumbbell, group: "daily" },
  { to: "/nutrition", label: "Nutrition", icon: Utensils, group: "daily" },
  { to: "/progress", label: "Progress", icon: TrendingUp, group: "insights" },
  { to: "/reports", label: "Reports", icon: BarChart3, group: "insights" },
] as const;
export function AppSidebar({
  collapsed,
  onToggle,
  pathname,
  name,
  photo,
  onLogout,
  signingOut = false,
}: {
  collapsed: boolean;
  onToggle: () => void;
  pathname: string;
  name: string;
  photo?: string | null;
  onLogout: () => void;
  signingOut?: boolean;
}) {
  return (
    <aside
      aria-label="Sidebar"
      className={cn(
        "fixed inset-y-0 left-0 z-20 hidden flex-col overflow-hidden border-r border-border/60 bg-sidebar md:flex motion-safe:transition-[width] motion-safe:duration-200",
        collapsed ? "w-20" : "w-[272px]",
      )}
    >
      <div
        className={cn(
          "flex shrink-0 gap-3 border-b border-border/50 py-5",
          collapsed ? "flex-col items-center px-2" : "items-center justify-between px-5",
        )}
      >
        <Logo compact={collapsed} />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          aria-controls="sidebar-navigation"
          className="size-8 shrink-0 rounded-lg text-muted-foreground hover:bg-elevated hover:text-foreground"
        >
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-6">
        <nav id="sidebar-navigation" aria-label="Desktop navigation" className="space-y-7">
          {[
            { key: "daily", label: "Your routine" },
            { key: "insights", label: "Your insights" },
          ].map((group) => (
            <div key={group.key}>
              {!collapsed && (
                <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
                  {group.label}
                </p>
              )}
              <div className="space-y-1.5">
                {links
                  .filter((link) => link.group === group.key)
                  .map((link) => {
                    const active = pathname === link.to || pathname.startsWith(link.to + "/");
                    return (
                      <Link
                        key={link.to}
                        to={link.to}
                        aria-label={link.label}
                        aria-current={active ? "page" : undefined}
                        title={collapsed ? link.label : undefined}
                        className={cn(
                          "group relative flex min-h-12 items-center gap-3 rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                          collapsed ? "justify-center px-2" : "px-3",
                          active
                            ? "bg-primary/10 text-primary ring-1 ring-inset ring-primary/15"
                            : "text-muted-foreground hover:bg-elevated/70 hover:text-foreground",
                        )}
                      >
                        <link.icon className="size-[19px] shrink-0" />
                        {!collapsed && (
                          <>
                            <span className="flex-1">{link.label}</span>
                            {active && <span className="size-1.5 rounded-full bg-primary" />}
                          </>
                        )}
                      </Link>
                    );
                  })}
              </div>
            </div>
          ))}
        </nav>
      </div>
      <div className="shrink-0 space-y-3 border-t border-border/60 bg-background/20 p-3">
        <Link
          to="/settings"
          title={collapsed ? "Settings" : undefined}
          aria-label="Settings"
          aria-current={pathname === "/settings" ? "page" : undefined}
          className={cn(
            "flex min-h-11 items-center gap-3 rounded-xl text-sm transition-colors hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            collapsed ? "justify-center" : "px-3",
            pathname === "/settings" ? "bg-primary/10 text-primary" : "text-muted-foreground",
          )}
        >
          <Settings className="size-[19px] shrink-0" />
          {!collapsed && "Settings"}
        </Link>
        <Link
          to="/settings"
          aria-label={`View profile for ${name}`}
          title={collapsed ? name : undefined}
          className={cn(
            "flex min-w-0 items-center gap-3 rounded-2xl border border-border/60 bg-card/70 p-3 transition-colors hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            collapsed && "justify-center border-transparent bg-transparent p-1",
          )}
        >
          <UserAvatar name={name} src={photo ?? null} className="size-9" />
          {!collapsed && (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{name}</span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">Your profile</span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </>
          )}
        </Link>
        <Button
          variant="ghost"
          disabled={signingOut}
          onClick={onLogout}
          aria-label="Sign out"
          title={collapsed ? "Sign out" : undefined}
          className="h-10 w-full justify-center rounded-xl text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          {signingOut ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
          {!collapsed && (signingOut ? "Signing out..." : "Sign out")}
        </Button>
      </div>
    </aside>
  );
}
