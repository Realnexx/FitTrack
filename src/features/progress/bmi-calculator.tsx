import { BmiHistory } from "./bmi-history";
import { supabase } from "@/integrations/supabase/client";
import { ModalActionBar } from "@/components/modal-actions";
import { useRef, useState } from "react";
import { Calculator, ArrowUpRight, Save, Loader2 } from "lucide-react";
import { useProfile, useAction, uid, unwrap } from "@/lib/data";
import { calculateBmi, bmiCategory } from "@/lib/bmi";
import { ResponsiveModal } from "@/components/responsive-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/fields";
export function BmiCalculator({ weightKg }: { weightKg: number }) {
  const profile = useProfile();
  const [open, setOpen] = useState(false);
  const save = useAction(
    async (entry: BmiEntry) => {
      if (calculateBmi(entry.weight_kg, entry.height_cm) === null)
        throw new Error("Enter valid measurements before saving.");
      unwrap(await supabase.from("bmi_logs").insert({ ...entry, user_id: await uid() }));
    },
    { invalidate: [["bmi-history"]], success: "BMI saved to your history" },
  );
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-6 flex w-full items-center gap-4 rounded-2xl border bg-card p-5 text-left transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Calculator className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display font-semibold">BMI calculator</span>
          <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
            Explore your body mass index using your height and weight.
          </span>
        </span>
        <ArrowUpRight className="size-5 shrink-0 text-primary" />
      </button>
      <ResponsiveModal
        open={open}
        onOpenChange={setOpen}
        title="BMI calculator"
        description="A quick look at your height-to-weight ratio."
      >
        {open && (
          <>
            <BmiForm
              weightKg={weightKg}
              heightCm={profile.data?.height_cm ?? null}
              onSave={async (entry) => {
                await save.mutateAsync(entry);
              }}
              onClose={() => setOpen(false)}
            />
            <BmiHistory />
          </>
        )}
      </ResponsiveModal>
    </>
  );
}
type BmiEntry = { weight_kg: number; height_cm: number; adult_confirmed: boolean };
export function BmiForm({
  weightKg,
  heightCm,
  onSave,
  onClose,
}: {
  weightKg: number;
  heightCm: number | null;
  onSave?: (entry: BmiEntry) => Promise<void>;
  onClose?: () => void;
}) {
  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState("");
  const [system, setSystem] = useState("metric");
  const [weight, setWeight] = useState(weightKg > 0 ? String(weightKg) : "");
  const [height, setHeight] = useState(heightCm ? String(heightCm) : "");
  const [adult, setAdult] = useState(false);
  const kg = Number(weight) / (system === "imperial" ? 2.2046226218 : 1);
  const cm = Number(height) * (system === "imperial" ? 2.54 : 1);
  const bmi = weight.trim() && height.trim() ? calculateBmi(kg, cm) : null;
  const fingerprint = JSON.stringify([kg, cm, adult]);
  return (
    <div className="space-y-5">
      <div
        className="flex rounded-xl border bg-background/50 p-1"
        role="group"
        aria-label="Measurement units"
      >
        {[
          ["metric", "kg / cm"],
          ["imperial", "lb / in"],
        ].map(([value, label]) => (
          <Button
            key={value}
            type="button"
            variant={system === value ? "secondary" : "ghost"}
            aria-pressed={system === value}
            className="flex-1 rounded-lg"
            onClick={() => {
              if (system === value) return;
              setWeight(
                weight && Number.isFinite(kg)
                  ? String(Math.round(kg * (value === "imperial" ? 2.2046226218 : 1) * 100) / 100)
                  : "",
              );
              setHeight(
                height && Number.isFinite(cm)
                  ? String(Math.round((cm / (value === "imperial" ? 2.54 : 1)) * 100) / 100)
                  : "",
              );
              setSystem(value!);
            }}
          >
            {label}
          </Button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label={`Weight (${system === "metric" ? "kg" : "lb"})`}>
          <Input
            aria-label="BMI weight"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="h-12 rounded-xl"
          />
        </Field>
        <Field label={`Height (${system === "metric" ? "cm" : "in"})`}>
          <Input
            aria-label="BMI height"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            className="h-12 rounded-xl"
          />
        </Field>
      </div>
      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={adult}
          onChange={(e) => setAdult(e.target.checked)}
          className="size-4 accent-primary"
        />
        I am 20 years or older
      </label>
      <div
        className="rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center"
        role="status"
        aria-live="polite"
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Your BMI
        </p>
        <p className="my-3 font-display text-5xl font-semibold tabular-nums">
          {bmi === null ? "—" : bmi.toFixed(1)}
        </p>
        <p className="text-sm text-primary">
          {bmi === null
            ? "Enter valid height and weight"
            : adult
              ? bmiCategory(bmi)
              : "Confirm your age to view adult categories"}
        </p>
      </div>
      {weight && height && bmi === null && (
        <p role="alert" className="text-sm text-destructive">
          Enter a weight between 20–500 kg and height between 100–250 cm, or their equivalent.
        </p>
      )}
      {adult && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          {[
            ["Underweight", "Below 18.5"],
            ["Healthy weight", "18.5 to below 25"],
            ["Overweight", "25 to below 30"],
            ["Obesity", "30 or above"],
          ].map(([label, range]) => (
            <div
              key={label}
              className={`rounded-xl border p-3 ${bmi !== null && bmiCategory(bmi) === label ? "border-primary/40 bg-primary/10" : "bg-card"}`}
            >
              <p className="font-medium">{label}</p>
              <p className="mt-1 text-muted-foreground">{range}</p>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs leading-relaxed text-muted-foreground">
        BMI is a screening measure, not a diagnosis or a measure of body fat. Adult categories apply
        to ages 20 and older; younger people need BMI-for-age assessment.{" "}
        <a
          href="https://www.cdc.gov/bmi/adult-calculator/"
          target="_blank"
          rel="noreferrer"
          className="text-primary underline"
        >
          About BMI · CDC
        </a>
      </p>
      <p className="text-xs text-muted-foreground">
        Save BMI adds a dated snapshot to your BMI history. It does not change your profile or
        weight log.
      </p>
      {onSave && (
        <ModalActionBar>
          <div className="flex w-full items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl"
              onClick={onClose}
              disabled={saving}
            >
              Close
            </Button>
            <Button
              type="button"
              className="h-11 flex-1 rounded-xl sm:flex-none"
              disabled={bmi === null || saving || saved === fingerprint}
              onClick={async () => {
                if (bmi === null || savingRef.current || saved === fingerprint) return;
                savingRef.current = true;
                setSaving(true);
                try {
                  await onSave({ weight_kg: kg, height_cm: cm, adult_confirmed: adult });
                  setSaved(fingerprint);
                } catch {
                  /* The save action displays its error and allows retrying. */
                } finally {
                  savingRef.current = false;
                  setSaving(false);
                }
              }}
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {saving ? "Saving…" : saved === fingerprint ? "BMI saved" : "Save BMI"}
            </Button>
          </div>
        </ModalActionBar>
      )}
    </div>
  );
}
