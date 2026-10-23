import {
  createFileRoute,
  Outlet,
  Link,
  redirect,
  useNavigate,
  useLocation,
} from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SignOutDialog } from "@/components/sign-out-dialog";
import { AppSidebar } from "@/components/app-sidebar";
import { profilePhoto } from "@/components/user-avatar";
import { useState } from "react";
import { Home, Dumbbell, Utensils, TrendingUp, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/data";
import { AppHeader } from "@/components/app-header";
import { ErrorBlock, LoadingBlock } from "@/components/common";

export const Route = createFileRoute("/_app")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
    const profile = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", data.user.id)
      .maybeSingle();
    if (profile.error) throw profile.error;
    if (!profile.data?.onboarding_completed) throw redirect({ to: "/onboarding" });
  },
  component: AppShell,
});
const links = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/workouts", label: "Workouts", icon: Dumbbell },
  { to: "/nutrition", label: "Nutrition", icon: Utensils },
  { to: "/progress", label: "Progress", icon: TrendingUp },
  { to: "/settings", label: "More", icon: Settings },
] as const;
function AppShell() {
  const profile = useProfile();
  const pathname = useLocation({ select: (location) => location.pathname });
  const navigate = useNavigate();
  const account = useQuery({
    queryKey: ["account-avatar", profile.data?.id],
    enabled: Boolean(profile.data?.id),
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      return { id: data.user?.id, metadata: data.user?.user_metadata };
    },
    staleTime: 60000,
  });
  const photo =
    profilePhoto(profile.data) ??
    (account.data?.id === profile.data?.id ? profilePhoto(account.data?.metadata) : null);
  const name = profile.data?.full_name || "FitTrack";
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [error, setError] = useState<unknown>(null);
  async function logout() {
    if (signingOut) return;
    setSigningOut(true);
    setError(null);
    try {
      const r = await supabase.auth.signOut();
      if (r.error) throw r.error;
      await navigate({ to: "/login" });
    } catch (failure) {
      setError(failure);
    } finally {
      setSigningOut(false);
    }
  }
  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:p-3 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <AppSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        pathname={pathname}
        name={name}
        photo={photo}
        onLogout={() => {
          setError(null);
          setLogoutOpen(true);
        }}
        signingOut={signingOut}
      />

      <div
        className={`min-w-0 motion-safe:transition-[padding] motion-safe:duration-200 ${collapsed ? "md:pl-20" : "md:pl-[272px]"}`}
      >
        <AppHeader pathname={pathname} name={name} photo={photo} />
        <main id="main" className="mx-auto max-w-7xl p-4 pb-28 md:p-8">
          {error !== null && <ErrorBlock error={error} />}{" "}
          {profile.isPending ? <LoadingBlock /> : <Outlet />}
        </main>
      </div>
      <SignOutDialog
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
        onConfirm={logout}
        pending={signingOut}
        error={error}
      />
      <nav
        aria-label="Main navigation"
        className="pb-safe fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-border/60 bg-sidebar/95 backdrop-blur-xl md:hidden"
      >
        {links.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            activeProps={{ className: "text-primary bg-primary/5" }}
            className="flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-xs text-muted-foreground"
          >
            <l.icon className="size-5" />
            {l.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
