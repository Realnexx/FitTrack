import { validateGoal } from "@/lib/measurements";
import { useState, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, unwrap, friendlyError } from "@/lib/data";
import { suggestTargets, ageFromDob, type Sex, type Activity } from "@/lib/calc";
import {
  onboardingPayload,
  validateOnboardingStep,
  list,
  type OnboardingDraft,
} from "@/lib/onboarding";
import { todayISO, DAY_NAMES } from "@/lib/dates";
import { AuthCard } from "@/components/auth-card";
import { Field, selectClass } from "@/components/fields";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Check,
  ArrowRight,
  Sparkles,
  UserRound,
  Target,
  Dumbbell,
  CalendarDays,
} from "lucide-react";
const titles = [
  "Welcome to FitTrack",
  "Tell us about yourself",
  "Choose your direction",
  "Set your targets",
  "Make training yours",
  "Review your plan",
];
export function Onboarding() {
  const profile = useProfile();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<OnboardingDraft>({});
  const navigate = useNavigate();
  const qc = useQueryClient();
  const registeredName = profile.data?.full_name?.trim() || "";
  const name = draft["name"] ?? registeredName;
  const set = (key: string, value: string) => setDraft((d) => ({ ...d, [key]: value }));
  const toggle = (key: string, value: string) =>
    setDraft((d) => {
      const selected = list(d[key]);
      return {
        ...d,
        [key]: (selected.includes(value)
          ? selected.filter((x) => x !== value)
          : [...selected, value]
        ).join(","),
      };
    });
  const numeric = (label: string, key: string, min: number, max: number, integer = false) => (
    <Field label={label}>
      <Input
        name={key}
        type="number"
        required
        min={min}
        max={max}
        step={integer ? "1" : "any"}
        value={draft[key] ?? ""}
        onChange={(e) => set(key, e.target.value)}
        placeholder="Enter your value"
      />
    </Field>
  );
  const select = (label: string, key: string, options: string[]) => (
    <Field label={label}>
      <select
        name={key}
        required
        className={selectClass}
        value={draft[key] ?? ""}
        onChange={(e) => set(key, e.target.value)}
      >
        <option value="" disabled>
          Choose an option
        </option>
        {options.map((x) => (
          <option key={x} value={x}>
            {x.replaceAll("_", " ")}
          </option>
        ))}
      </select>
    </Field>
  );
  async function submit() {
    if (lock.current) return;
    setError("");
    try {
      if (step < 5) {
        validateOnboardingStep(step, draft, name);
        setStep((s) => s + 1);
        return;
      }
      const payload = onboardingPayload(draft, name, todayISO());
      lock.current = true;
      setBusy(true);
      unwrap(await supabase.rpc("complete_onboarding", { payload }));
      await qc.invalidateQueries();
      await navigate({ to: "/dashboard" });
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function applySuggestions() {
    try {
      validateGoal(
        Number(draft["weight"]),
        Number(draft["target"]),
        draft["weekly"]?.trim() ? Number(draft["weekly"]) : NaN,
        draft["goal"] ?? "",
      );
    } catch (e) {
      setError(friendlyError(e));
      return;
    }
    setError("");
    const targets = suggestTargets({
      weightKg: Number(draft["weight"]),
      heightCm: Number(draft["height"]),
      age: ageFromDob(draft["dob"] ?? null)!,
      sex: (draft["sex"] || null) as Sex,
      activity: draft["activity"] as Activity,
      goal: draft["goal"]!,
      weeklyChangeKg: Number(draft["weekly"] || 0),
    });
    setDraft((d) => ({
      ...d,
      calories: String(targets.calories),
      protein: String(targets.protein),
    }));
  }
  return (
    <AuthCard className="max-w-xl" title={titles[step]!} subtitle={`Step ${step + 1} of 6`}>
      <div className="mb-6 flex gap-1.5" aria-label={`Onboarding step ${step + 1} of 6`}>
        {titles.map((title, i) => (
          <span
            key={title}
            className={`h-1 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-elevated"}`}
          />
        ))}
      </div>
      <form
        className="space-y-5 [&_input:not([type=checkbox])]:h-11 [&_input]:rounded-xl [&_select]:rounded-xl"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <fieldset disabled={busy} className="space-y-5">
          {step === 0 && (
            <div className="space-y-5">
              <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Sparkles />
              </span>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {registeredName ? `Welcome, ${registeredName}. ` : ""}Build a profile from your own
                measurements, goals and training choices.
              </p>
              <div className="rounded-2xl border bg-elevated/20 p-4 text-sm">
                <p className="font-medium">A few minutes to make it yours</p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Review everything before saving. You can update your preferences later.
                </p>
              </div>
            </div>
          )}
          {step === 1 && (
            <>
              {registeredName ? (
                <div className="flex items-center gap-3 rounded-2xl border bg-primary/5 p-4">
                  <UserRound className="size-5 shrink-0 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Name from your account</p>
                    <p className="mt-1 text-sm font-semibold">{registeredName}</p>
                  </div>
                </div>
              ) : (
                <Field label="Full name">
                  <Input
                    name="name"
                    required
                    maxLength={80}
                    value={name}
                    onChange={(e) => set("name", e.target.value)}
                  />
                </Field>
              )}
              <Field label="Date of birth">
                <Input
                  name="dob"
                  type="date"
                  required
                  max={todayISO()}
                  value={draft["dob"] ?? ""}
                  onChange={(e) => set("dob", e.target.value)}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                {numeric("Height (cm)", "height", 51, 279)}
                {numeric("Current / starting weight (kg)", "weight", 20.01, 399)}
              </div>
              <Field label="Sex (optional, for calorie estimates)">
                <select
                  name="sex"
                  className={selectClass}
                  value={draft["sex"] ?? ""}
                  onChange={(e) => set("sex", e.target.value)}
                >
                  <option value="">Prefer not to say</option>
                  {["male", "female", "other"].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </Field>
              {select("Activity level", "activity", [
                "sedentary",
                "light",
                "moderate",
                "active",
                "very_active",
              ])}
            </>
          )}
          {step === 2 && (
            <>
              <div className="rounded-2xl border bg-primary/5 p-4">
                <Target className="mb-2 size-5 text-primary" />
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Choose the direction you want to work toward.
                </p>
              </div>
              {select("Primary goal", "goal", [
                "gain_weight",
                "build_muscle",
                "maintain",
                "lose_weight",
              ])}
            </>
          )}
          {step === 3 && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                {numeric("Target weight (kg)", "target", 20.01, 399)}
                {numeric("Weekly weight change (kg; negative for loss)", "weekly", -2, 2)}
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-auto w-full whitespace-normal rounded-xl py-3 text-left"
                onClick={applySuggestions}
              >
                <Sparkles className="size-4 shrink-0" />
                Suggest calorie and protein targets
              </Button>
              <div className="grid gap-4 sm:grid-cols-2">
                {numeric("Daily calories (kcal)", "calories", 800, 8000, true)}
                {numeric("Daily protein (g)", "protein", 10, 500, true)}
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Suggestions use your measurements and goal. They are estimates; review and adjust
                them before continuing.
              </p>
            </>
          )}
          {step === 4 && (
            <>
              <Field label="Workout location">
                <Input
                  name="location"
                  required
                  maxLength={80}
                  placeholder="e.g. Home or gym"
                  value={draft["location"] ?? ""}
                  onChange={(e) => set("location", e.target.value)}
                />
              </Field>
              <fieldset>
                <legend className="mb-3 text-sm font-semibold">Available equipment</legend>
                <div className="grid grid-cols-2 gap-2">
                  {["Bodyweight", "Dumbbells", "Resistance Bands", "Other"].map((x) => (
                    <label
                      key={x}
                      className="flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border bg-elevated/20 p-3 text-xs has-[:checked]:border-primary/50 has-[:checked]:bg-primary/10 has-[:checked]:text-primary"
                    >
                      <input
                        name="equipment"
                        type="checkbox"
                        className="accent-primary"
                        value={x}
                        checked={list(draft["equipment"]).includes(x)}
                        onChange={() => toggle("equipment", x)}
                      />
                      {x}
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <CalendarDays className="size-4 text-primary" />
                  Preferred training days
                </legend>
                <div className="grid grid-cols-4 gap-2">
                  {DAY_NAMES.map((day, i) => (
                    <label
                      key={day}
                      className="flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl border text-xs has-[:checked]:border-primary/50 has-[:checked]:bg-primary/10 has-[:checked]:text-primary"
                    >
                      <input
                        name="days"
                        type="checkbox"
                        className="accent-primary"
                        value={i}
                        checked={list(draft["days"]).includes(String(i))}
                        onChange={() => toggle("days", String(i))}
                      />
                      {day}
                    </label>
                  ))}
                </div>
              </fieldset>
              {select("Experience", "experience", ["beginner", "intermediate", "advanced"])}
            </>
          )}
          {step === 5 && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                <p className="text-xs uppercase tracking-wider text-primary">Your starting point</p>
                <h2 className="mt-2 text-lg font-semibold">{name}</h2>
                <p className="mt-1 text-sm capitalize text-muted-foreground">
                  {draft["goal"]?.replaceAll("_", " ")}
                </p>
                <p className="mt-4 flex items-center gap-3 text-xl font-semibold">
                  {draft["weight"]}
                  <ArrowRight className="size-4 text-primary" />
                  {draft["target"]}{" "}
                  <span className="text-xs font-normal text-muted-foreground">kg</span>
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Daily calories", `${draft["calories"]} kcal`],
                  ["Daily protein", `${draft["protein"]} g`],
                  ["Height", `${draft["height"]} cm`],
                  ["Weekly change", `${draft["weekly"]} kg`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border bg-elevated/20 p-3">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="mt-1 text-sm font-semibold">{value}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border p-4">
                <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <Dumbbell className="size-4 text-primary" />
                  Your training preferences
                </p>
                <dl className="grid gap-4 text-xs sm:grid-cols-2">
                  {[
                    ["Location", draft["location"]],
                    ["Equipment", list(draft["equipment"]).join(", ")],
                    [
                      "Training days",
                      list(draft["days"])
                        .map(Number)
                        .sort((a, b) => a - b)
                        .map((day) => DAY_NAMES[day])
                        .join(", "),
                    ],
                    ["Experience", draft["experience"]],
                    ["Activity", draft["activity"]?.replaceAll("_", " ")],
                    ["Date of birth", draft["dob"]],
                    ["Sex", draft["sex"] || "Not specified"],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="mt-1 font-medium">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Your selected training days will be scheduled with alternating starter A/B routines.
                Starter routines use dumbbells; adjust their exercises in Workouts to match your
                equipment.
              </p>
            </div>
          )}
        </fieldset>
        {profile.error && (
          <p role="alert" className="text-sm text-destructive">
            Could not load your saved account details.{" "}
            <button type="button" className="underline" onClick={() => void profile.refetch()}>
              Retry
            </button>
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive"
          >
            {error}
          </p>
        )}
        <div className="flex gap-3 border-t pt-5">
          {step > 0 && (
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl"
              disabled={busy}
              onClick={() => {
                setError("");
                setStep((s) => s - 1);
              }}
            >
              Back
            </Button>
          )}
          <Button
            disabled={busy || profile.isPending || Boolean(profile.error)}
            aria-busy={busy}
            className="h-11 flex-1 rounded-xl"
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : step === 5 ? (
              <Check className="size-4" />
            ) : null}
            {busy
              ? "Saving your plan..."
              : step === 5
                ? "Save and open dashboard"
                : step === 0
                  ? "Get started"
                  : "Continue"}
          </Button>
        </div>
      </form>
    </AuthCard>
  );
}
