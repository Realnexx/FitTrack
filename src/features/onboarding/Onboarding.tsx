import { validateGoal } from "@/lib/measurements";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { uid, unwrap, friendlyError } from "@/lib/data";
import { suggestTargets, ageFromDob, type Sex, type Activity } from "@/lib/calc";
import { todayISO, DAY_NAMES } from "@/lib/dates";
import { AuthCard } from "@/components/auth-card";
import { Field, NumberField, selectClass, values } from "@/components/fields";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
export function Onboarding() {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  const qc = useQueryClient();
  const titles = [
    "Welcome to FitTrack",
    "Tell us about yourself",
    "Choose your direction",
    "Set your targets",
    "Make training yours",
    "Ready to begin",
  ];
  async function submit(form: HTMLFormElement) {
    const v = values(form);
    const collected = { ...draft, ...Object.fromEntries(new FormData(form).entries()) } as Record<
      string,
      string
    >;
    setDraft(collected);
    setError("");
    if (step === 1) {
      const age = ageFromDob(v.text("dob"));
      if (age === null || age < 13 || age > 100) {
        setError("Enter a date of birth corresponding to an age between 13 and 100.");
        return;
      }
    }
    if (step === 2) {
      const targets = suggestTargets({
        weightKg: Number(collected["weight"]),
        heightCm: Number(collected["height"]),
        age: ageFromDob(collected["dob"] ?? null) ?? 23,
        sex: (collected["sex"] || null) as Sex,
        activity: collected["activity"] as Activity,
        goal: v.text("goal"),
        weeklyChangeKg:
          v.text("goal") === "lose_weight" ? -0.25 : v.text("goal") === "maintain" ? 0 : 0.25,
      });
      setDraft({
        ...collected,
        calories: String(targets.calories),
        protein: String(targets.protein),
      });
    }
    if (step === 3) {
      try {
        validateGoal(
          Number(collected["weight"]),
          Number(collected["target"]),
          Number(collected["weekly"]),
          collected["goal"] ?? "build_muscle",
        );
      } catch (e) {
        setError(friendlyError(e));
        return;
      }
    }
    if (step === 4) {
      setDraft({
        ...collected,
        equipment: v.all("equipment").join(","),
        days: v.all("days").join(","),
      });
    }
    if (step < 5) {
      setStep(step + 1);
      return;
    }
    setBusy(true);
    try {
      const n = (k: string) => Number(draft[k]);
      const type = draft["goal"] ?? "build_muscle";
      if (
        (type === "lose_weight" && n("target") >= n("weight")) ||
        ((type === "gain_weight" || type === "build_muscle") && n("target") <= n("weight"))
      )
        throw new Error(
          "Target weight must match the direction of your goal. Go back to adjust your targets.",
        );
      unwrap(
        await supabase.rpc("complete_onboarding", {
          payload: {
            full_name: draft["name"] ?? "",
            date_of_birth: draft["dob"] ?? "",
            height_cm: n("height"),
            sex: draft["sex"] || null,
            activity_level: draft["activity"] ?? "moderate",
            experience_level: draft["experience"] ?? "beginner",
            workout_location: draft["location"] ?? "Home",
            equipment: (draft["equipment"] ?? "").split(",").filter(Boolean),
            preferred_days: (draft["days"] ?? "").split(",").filter(Boolean).map(Number),
            goal_type: type,
            starting_weight_kg: n("weight"),
            target_weight_kg: n("target"),
            weekly_weight_change_target_kg: n("weekly"),
            daily_calorie_target: n("calories"),
            daily_protein_target_g: n("protein"),
            start_date: todayISO(),
          },
        }),
      );
      await qc.invalidateQueries();
      await navigate({ to: "/dashboard" });
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthCard title={titles[step] ?? ""} subtitle={`Step ${step + 1} of 6`}>
      <form
        key={step}
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(e.currentTarget);
        }}
      >
        {step === 0 && (
          <p className="text-muted-foreground">
            Build a steady routine with weight, workout and meal tracking. Start with a profile that
            fits you.
          </p>
        )}
        {step === 1 && (
          <>
            <Field label="Full name">
              <Input name="name" required maxLength={80} defaultValue={draft["name"]} />
            </Field>
            <Field label="Date of birth">
              <Input name="dob" type="date" required max={todayISO()} defaultValue={draft["dob"]} />
            </Field>
            <NumberField
              label="Height (cm)"
              name="height"
              value={Number(draft["height"]) || 163}
              min={51}
              max={279}
            />
            <NumberField
              label="Current / starting weight (kg)"
              name="weight"
              value={Number(draft["weight"]) || 48}
              min={20.01}
              max={399}
            />
            <Field label="Sex (optional, for calorie estimates)">
              <select name="sex" className={selectClass} defaultValue={draft["sex"] ?? ""}>
                <option value="">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <Field label="Activity level">
              <select
                name="activity"
                className={selectClass}
                defaultValue={draft["activity"] ?? "moderate"}
              >
                {["sedentary", "light", "moderate", "active", "very_active"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </Field>
          </>
        )}
        {step === 2 && (
          <Field label="Primary goal">
            <select
              name="goal"
              className={selectClass}
              defaultValue={draft["goal"] ?? "build_muscle"}
            >
              <option value="gain_weight">Gain weight</option>
              <option value="build_muscle">Build muscle</option>
              <option value="maintain">Maintain weight</option>
              <option value="lose_weight">Lose weight</option>
            </select>
          </Field>
        )}
        {step === 3 && (
          <>
            <NumberField
              label="Target weight (kg)"
              name="target"
              value={
                Number(draft["target"]) ||
                Number(draft["weight"]) +
                  (draft["goal"] === "lose_weight" ? -5 : draft["goal"] === "maintain" ? 0 : 7)
              }
              min={20.01}
              max={399}
            />
            <NumberField
              label="Weekly weight change (kg; negative for loss)"
              name="weekly"
              value={
                Number(draft["weekly"]) ||
                (draft["goal"] === "lose_weight" ? -0.25 : draft["goal"] === "maintain" ? 0 : 0.25)
              }
              min={-2}
              max={2}
            />
            <NumberField
              label="Daily calories (kcal)"
              name="calories"
              value={Number(draft["calories"])}
              min={800}
              max={8000}
              step="1"
            />
            <NumberField
              label="Daily protein (g)"
              name="protein"
              value={Number(draft["protein"])}
              min={10}
              max={500}
              step="1"
            />
            <p className="text-xs text-muted-foreground">
              Suggested targets are estimates, not medical prescriptions. Adjust them to your needs.
            </p>
          </>
        )}
        {step === 4 && (
          <>
            <Field label="Workout location">
              <Input
                name="location"
                defaultValue={draft["location"] ?? "Home"}
                required
                maxLength={80}
              />
            </Field>
            <fieldset>
              <legend className="mb-2 text-sm">Available equipment</legend>
              {["Bodyweight", "Dumbbells", "Resistance Bands", "Other"].map((x) => (
                <label key={x} className="mr-3 inline-flex min-h-10 items-center gap-2">
                  <input
                    name="equipment"
                    type="checkbox"
                    value={x}
                    defaultChecked={(draft["equipment"] ?? "Dumbbells").split(",").includes(x)}
                  />
                  {x}
                </label>
              ))}
            </fieldset>
            <fieldset>
              <legend className="mb-2 text-sm">Preferred training days</legend>
              {DAY_NAMES.map((x, i) => (
                <label key={x} className="mr-3 inline-flex min-h-10 items-center gap-2">
                  <input
                    type="checkbox"
                    name="days"
                    value={i}
                    defaultChecked={(draft["days"] ?? "1,3,5").split(",").includes(String(i))}
                  />
                  {x}
                </label>
              ))}
            </fieldset>
            <Field label="Experience">
              <select
                className={selectClass}
                name="experience"
                defaultValue={draft["experience"] ?? "beginner"}
              >
                {["beginner", "intermediate", "advanced"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </Field>
          </>
        )}
        {step === 5 && (
          <div className="space-y-2">
            <p>
              {draft["name"]}, your goal is {draft["goal"]?.replaceAll("_", " ")}.
            </p>
            <p>
              {draft["weight"]} → {draft["target"]} kg
            </p>
            <p>
              {draft["calories"]} kcal · {draft["protein"]} g protein daily
            </p>
            <p className="text-sm text-muted-foreground">
              Your A/B plans are ready. The starter schedule is Monday, Wednesday and Friday; you
              can change it in Workouts.
            </p>
          </div>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex gap-3">
          {step > 0 && (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => setStep(step - 1)}
            >
              Back
            </Button>
          )}
          <Button disabled={busy} className="flex-1">
            {busy
              ? "Saving…"
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
