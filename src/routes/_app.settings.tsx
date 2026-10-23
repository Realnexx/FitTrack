import { ProfilePhotoEditor } from "@/components/profile-photo-editor";
import { AccountConnections } from "@/components/account-connections";
import { DeleteAccountRequest } from "@/components/delete-account-request";
import { heightToDisplay, heightToCm } from "@/lib/measurements";
import { InstallApp } from "@/components/install-app";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useId, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useSettings, useAction, unwrap, uid, qk } from "@/lib/data";
import { todayISO, DAY_NAMES } from "@/lib/dates";
import { PageHeader, LoadingBlock, ErrorBlock } from "@/components/common";
import { Field, NumberField, selectClass, values } from "@/components/fields";
import { Input } from "@/components/ui/input";
import { ResponsiveModal } from "@/components/responsive-modal";
import { ModalActionBar, ModalFormActions } from "@/components/modal-actions";
import { SignOutDialog } from "@/components/sign-out-dialog";
import { UserAvatar, profilePhoto } from "@/components/user-avatar";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  UserRound,
  SlidersHorizontal,
  ShieldCheck,
  Link2,
  LogOut,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/_app/settings")({ component: Settings });
export function Settings() {
  const [section, setSection] = useState<
    "profile" | "preferences" | "account" | "connections" | null
  >(null);
  const formId = useId();
  const profile = useProfile();
  const settings = useSettings();
  const navigate = useNavigate();
  const [logoutOpen, setLogoutOpen] = useState(false);
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
  const [password, setPassword] = useState("");
  const save = useAction(
    async (form: HTMLFormElement) => {
      const v = values(form);
      unwrap(
        await supabase
          .from("profiles")
          .update({
            full_name: v.text("name"),
            height_cm: heightToCm(v.num("height"), settings.data?.height_unit),
            date_of_birth: v.text("dob") || null,
            sex: v.text("sex") || null,
            activity_level: v.text("activity"),
            experience_level: v.text("experience"),
            workout_location: v.text("location"),
            equipment: v.all("equipment"),
            preferred_days: v.all("days").map(Number),
          })
          .eq("id", await uid()),
      );
    },
    { invalidate: [qk.profile], success: "Profile updated", onSuccess: () => setSection(null) },
  );
  const prefs = useAction(
    async (form: HTMLFormElement) => {
      const v = values(form);
      try {
        new Intl.DateTimeFormat("en", { timeZone: v.text("timezone") }).format();
      } catch {
        throw new Error("Enter a valid time zone such as Asia/Manila.");
      }
      unwrap(
        await supabase.from("user_settings").upsert(
          {
            user_id: await uid(),
            timezone: v.text("timezone"),
            weight_unit: v.text("weight_unit"),
            height_unit: v.text("height_unit"),
            date_format: v.text("format"),
            default_landing: v.text("landing"),
          },
          { onConflict: "user_id" },
        ),
      );
    },
    { invalidate: [qk.settings], success: "Preferences saved", onSuccess: () => setSection(null) },
  );
  const changePassword = useAction(
    async (form: HTMLFormElement) => {
      const v = values(form);
      if (v.text("password") !== v.text("confirm")) throw new Error("Passwords do not match.");
      const result = await supabase.auth.updateUser({ password: v.text("password") });
      if (result.error) throw result.error;
      form.reset();
      setPassword("");
    },
    { invalidate: [], success: "Password updated" },
  );
  const logout = useAction(
    async () => {
      const result = await supabase.auth.signOut();
      if (result.error) throw result.error;
    },
    {
      invalidate: [],
      onSuccess: () => {
        void navigate({ to: "/login" });
      },
    },
  );
  if (profile.isPending || settings.isPending) return <LoadingBlock />;
  if (profile.error || settings.error)
    return <ErrorBlock error={profile.error || settings.error} />;
  const p = profile.data;
  const s = settings.data;
  return (
    <>
      <PageHeader title="Profile & settings" subtitle="Your routine, your preferences." />
      <section className="relative mb-6 overflow-hidden rounded-3xl border bg-card p-5 md:p-7">
        <div className="pointer-events-none absolute -right-16 -top-16 size-60 rounded-full bg-primary/5 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <UserAvatar
              name={p?.full_name || "FitTrack member"}
              src={photo}
              className="size-16 text-xl md:size-20"
            />
            <div className="min-w-0">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-primary">
                Your account
              </p>
              <h2 className="break-words font-display text-xl font-semibold md:text-2xl">
                {p?.full_name || "FitTrack member"}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">A routine that works for you.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="h-11 rounded-xl">
              <Link to="/reports">
                <BarChart3 className="size-4" />
                Progress reports
                <ArrowUpRight className="size-3.5" />
              </Link>
            </Button>
            <Button
              variant="outline"
              className="h-11 rounded-xl border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setLogoutOpen(true)}
            >
              <LogOut className="size-4" />
              Sign out
            </Button>
          </div>
        </div>
      </section>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            value: "profile" as const,
            label: "Personal profile",
            body: "Your details & training",
            icon: UserRound,
          },
          {
            value: "preferences" as const,
            label: "Preferences",
            body: "Units, dates & time zone",
            icon: SlidersHorizontal,
          },
          {
            value: "connections" as const,
            label: "Connections",
            body: "Sign-in accounts & social links",
            icon: Link2,
          },
          {
            value: "account" as const,
            label: "Account & security",
            body: "Password & account controls",
            icon: ShieldCheck,
          },
        ].map(({ value, label, body, icon: Icon }) => (
          <button
            type="button"
            key={value}
            onClick={() => setSection(value)}
            className="group flex items-center gap-3 text-left rounded-2xl border bg-card/50 p-4 transition-colors hover:border-primary/30 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Icon className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{label}</span>
              <span className="mt-1 block text-xs text-muted-foreground">{body}</span>
            </span>
            <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" />
          </button>
        ))}
      </div>
      <ResponsiveModal
        open={section !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSection(null);
            setPassword("");
          }
        }}
        title={
          section === "profile"
            ? "Personal profile"
            : section === "preferences"
              ? "Preferences"
              : section === "connections"
                ? "Connections"
                : "Account & security"
        }
        description={
          section === "profile"
            ? "Your details and training preferences."
            : section === "preferences"
              ? "Choose your units, time zone and display preferences."
              : section === "connections"
                ? "Manage your connected accounts and social profiles."
                : "Manage your password and account controls."
        }
      >
        {section === "profile" && (
          <div key="profile">
            <ProfilePhotoEditor
              name={p?.full_name || "FitTrack member"}
              photo={photo}
              customPhoto={p?.avatar_url ?? null}
            />
            <form
              id={formId}
              key={s?.height_unit}
              className="space-y-5 [&_input:not([type=checkbox])]:h-11 [&_input:not([type=checkbox])]:rounded-xl [&_input:not([type=checkbox])]:bg-elevated/20 [&_select]:rounded-xl [&_select]:bg-elevated/20"
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate(e.currentTarget);
              }}
            >
              <fieldset className="grid gap-4 rounded-2xl border border-border/70 bg-elevated/10 p-4 sm:grid-cols-2 sm:p-5">
                <legend className="px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  About you
                </legend>
                <Field label="Full name">
                  <Input name="name" required defaultValue={p?.full_name ?? ""} maxLength={80} />
                </Field>
                <Field label="Date of birth">
                  <Input
                    name="dob"
                    type="date"
                    max={todayISO()}
                    defaultValue={p?.date_of_birth ?? ""}
                  />
                </Field>
                <NumberField
                  label={`Height (${s?.height_unit ?? "cm"}${s?.height_unit === "ft" ? ", decimal feet" : ""})`}
                  name="height"
                  value={heightToDisplay(p?.height_cm ?? 163, s?.height_unit)}
                  min={s?.height_unit === "ft" ? 1.68 : 51}
                  max={s?.height_unit === "ft" ? 9.15 : 279}
                />
                <Field label="Sex (optional)">
                  <select className={selectClass} name="sex" defaultValue={p?.sex ?? ""}>
                    <option value="">Prefer not to say</option>
                    {["male", "female", "other"].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </Field>
              </fieldset>
              <fieldset className="grid gap-4 rounded-2xl border border-border/70 bg-elevated/10 p-4 sm:grid-cols-2 sm:p-5">
                <legend className="px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Your training
                </legend>
                <Field label="Activity">
                  <select
                    className={selectClass}
                    name="activity"
                    defaultValue={p?.activity_level ?? "moderate"}
                  >
                    {["sedentary", "light", "moderate", "active", "very_active"].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Experience">
                  <select
                    className={selectClass}
                    name="experience"
                    defaultValue={p?.experience_level ?? "beginner"}
                  >
                    {["beginner", "intermediate", "advanced"].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Workout location">
                  <Input
                    name="location"
                    defaultValue={p?.workout_location ?? "Home"}
                    required
                    maxLength={80}
                  />
                </Field>
              </fieldset>
              <fieldset className="rounded-2xl border border-border/70 bg-elevated/10 p-4 sm:p-5">
                <legend className="px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Equipment
                </legend>
                {["Bodyweight", "Dumbbells", "Resistance Bands", "Other"].map((x) => (
                  <label
                    key={x}
                    className="mb-2 mr-2 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border bg-background/40 px-3 py-2 text-sm transition-colors has-[:checked]:border-primary/40 has-[:checked]:bg-primary/10 has-[:checked]:text-primary"
                  >
                    <input
                      className="accent-primary"
                      type="checkbox"
                      name="equipment"
                      value={x}
                      defaultChecked={p?.equipment.includes(x)}
                    />
                    {x}
                  </label>
                ))}
              </fieldset>
              <fieldset className="rounded-2xl border border-border/70 bg-elevated/10 p-4 sm:p-5">
                <legend className="px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Training days
                </legend>
                <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
                  Choose your preferred days. Manage your actual schedule in Workouts.
                </p>
                {DAY_NAMES.map((d, i) => (
                  <label
                    key={d}
                    className="mb-2 mr-2 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border bg-background/40 px-3 py-2 text-sm transition-colors has-[:checked]:border-primary/40 has-[:checked]:bg-primary/10 has-[:checked]:text-primary"
                  >
                    <input
                      className="accent-primary"
                      type="checkbox"
                      name="days"
                      value={i}
                      defaultChecked={p?.preferred_days.includes(i)}
                    />
                    {d}
                  </label>
                ))}
              </fieldset>
            </form>
          </div>
        )}
        {section === "preferences" && (
          <div key="preferences">
            <p className="mb-5 text-xs leading-relaxed text-muted-foreground">
              Choose how FitTrack displays your measurements and dates.
            </p>
            <form
              id={formId}
              className="space-y-5 [&_input]:h-11 [&_input]:rounded-xl [&_input]:bg-elevated/20 [&_select]:rounded-xl [&_select]:bg-elevated/20"
              onSubmit={(e) => {
                e.preventDefault();
                prefs.mutate(e.currentTarget);
              }}
            >
              <fieldset className="grid gap-4 rounded-2xl border bg-elevated/10 p-4 sm:grid-cols-2 sm:p-5">
                <legend className="px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Measurements
                </legend>
                <Field label="Body weight unit">
                  <select
                    name="weight_unit"
                    className={selectClass}
                    defaultValue={s?.weight_unit ?? "kg"}
                  >
                    <option value="kg">Kilograms (kg)</option>
                    <option value="lb">Pounds (lb)</option>
                  </select>
                </Field>
                <Field label="Height unit">
                  <select
                    name="height_unit"
                    className={selectClass}
                    defaultValue={s?.height_unit ?? "cm"}
                  >
                    <option value="cm">Centimeters (cm)</option>
                    <option value="ft">Feet (decimal ft)</option>
                  </select>
                </Field>
              </fieldset>
              <fieldset className="grid gap-4 rounded-2xl border bg-elevated/10 p-4 sm:grid-cols-2 sm:p-5">
                <legend className="px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Region & display
                </legend>
                <Field label="Time zone">
                  <Input name="timezone" required defaultValue={s?.timezone ?? "Asia/Manila"} />
                </Field>
                <Field label="Date format">
                  <select
                    name="format"
                    className={selectClass}
                    defaultValue={s?.date_format ?? "MMM d, yyyy"}
                  >
                    <option>MMM d, yyyy</option>
                    <option>yyyy-MM-dd</option>
                    <option>dd/MM/yyyy</option>
                  </select>
                </Field>
              </fieldset>
              <fieldset className="rounded-2xl border bg-elevated/10 p-4 sm:p-5">
                <legend className="px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Start your day
                </legend>
                <Field label="Landing page">
                  <select
                    name="landing"
                    className={selectClass}
                    defaultValue={s?.default_landing ?? "/dashboard"}
                  >
                    <option value="/dashboard">Dashboard</option>
                    <option value="/workouts">Workouts</option>
                    <option value="/nutrition">Nutrition</option>
                    <option value="/progress">Progress</option>
                  </select>
                </Field>
              </fieldset>
              <p className="rounded-xl bg-primary/5 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
                Exercise loads are recorded in kilograms.
              </p>
            </form>
          </div>
        )}
        {section === "account" && (
          <div key="account">
            <p className="mb-5 text-xs leading-relaxed text-muted-foreground">
              Manage your password and account access.
            </p>
            <form
              id={formId}
              className="space-y-4 rounded-2xl border bg-elevated/10 p-4 sm:p-5 [&_input]:h-11 [&_input]:rounded-xl [&_input]:bg-background/40"
              onSubmit={(e) => {
                e.preventDefault();
                changePassword.mutate(e.currentTarget);
              }}
            >
              <div className="mb-1">
                <h3 className="text-sm font-semibold">Change password</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Use at least 8 characters and choose a password unique to this account.
                </p>
              </div>
              <Field label="New password">
                <Input
                  type="password"
                  name="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
              <Field label="Confirm password">
                <Input
                  type="password"
                  name="confirm"
                  autoComplete="new-password"
                  required
                  minLength={8}
                />
              </Field>
            </form>
            <div className="mt-6 rounded-2xl border bg-elevated/10 px-4 pb-4 sm:px-5">
              <InstallApp />
            </div>
            <div className="mt-4 rounded-2xl border border-destructive/20 bg-destructive/[0.03] px-4 pb-4 sm:px-5">
              <DeleteAccountRequest />
            </div>
          </div>
        )}
        {section === "connections" && p && (
          <AccountConnections
            userId={p.id}
            links={p.social_links}
            onClose={() => setSection(null)}
          />
        )}
        {section !== "connections" && (
          <ModalActionBar>
            <ModalFormActions
              form={formId}
              hint={
                section === "profile"
                  ? "Keep your details up to date."
                  : section === "preferences"
                    ? "Your app, your preferences."
                    : "Password changes apply when you save."
              }
              onCancel={() => {
                setSection(null);
                setPassword("");
              }}
              pending={
                section === "profile"
                  ? save.isPending
                  : section === "preferences"
                    ? prefs.isPending
                    : changePassword.isPending
              }
              label={
                section === "profile"
                  ? "Save profile"
                  : section === "preferences"
                    ? "Save preferences"
                    : "Update password"
              }
            />
          </ModalActionBar>
        )}
      </ResponsiveModal>
      <SignOutDialog
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
        onConfirm={() => logout.mutate()}
        pending={logout.isPending}
      />
    </>
  );
}

