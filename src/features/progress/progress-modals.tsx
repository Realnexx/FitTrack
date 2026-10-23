import { useId } from "react";
import type { WeightLog } from "@/lib/data";
import { weightToDisplay } from "@/lib/measurements";
import { ResponsiveModal } from "@/components/responsive-modal";
import { ModalActionBar, ModalFormActions } from "@/components/modal-actions";
import { Field, NumberField, selectClass } from "@/components/fields";
import { Input } from "@/components/ui/input";
type Actions = {
  open: boolean;
  onClose: () => void;
  pending: boolean;
  onSave: (form: HTMLFormElement) => void;
  unit: string;
};
export function MeasurementModal({
  open,
  onClose,
  pending,
  onSave,
  editing,
  latest,
  unit,
}: Actions & { editing: WeightLog | null; latest: number }) {
  const formId = useId();
  return (
    <ResponsiveModal
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={editing ? "Edit measurement" : "Log your weight"}
      description="Every check-in adds to your story. Record the date and weight you measured."
    >
      <form
        id={formId}
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(e.currentTarget);
        }}
      >
        <NumberField
          label={`Weight (${unit})`}
          name="weight"
          value={weightToDisplay(editing?.weight_kg ?? latest, unit)}
          min={weightToDisplay(20.01, unit)}
          max={weightToDisplay(399, unit)}
        />
        <Field label="Measurement date and time">
          <Input
            type="datetime-local"
            name="date"
            required
            defaultValue={
              editing
                ? new Date(
                    new Date(editing.measured_at).getTime() -
                      new Date(editing.measured_at).getTimezoneOffset() * 60000,
                  )
                    .toISOString()
                    .slice(0, 16)
                : new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
                    .toISOString()
                    .slice(0, 16)
            }
          />
        </Field>
        <Field label="Notes (optional)">
          <Input name="notes" maxLength={500} defaultValue={editing?.notes ?? ""} />
        </Field>
      </form>
      <ModalActionBar>
        <ModalFormActions
          form={formId}
          onCancel={onClose}
          pending={pending}
          label="Save measurement"
          hint="Use the same scale and similar conditions."
        />
      </ModalActionBar>
    </ResponsiveModal>
  );
}
type Goal = {
  goal_type: string;
  target_weight_kg: number;
  weekly_weight_change_target_kg: number;
  daily_calorie_target: number;
  daily_protein_target_g: number;
};
export function GoalModal({ open, onClose, pending, onSave, unit, g }: Actions & { g: Goal }) {
  const formId = useId();
  return (
    <ResponsiveModal
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Adjust your targets"
      description="Keep your weight, nutrition and weekly goals in one place."
    >
      <form
        id={formId}
        className="mt-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(e.currentTarget);
        }}
      >
        <Field label="Goal">
          <select className={selectClass} name="type" defaultValue={g.goal_type}>
            {["gain_weight", "build_muscle", "maintain", "lose_weight"].map((t) => (
              <option key={t} value={t}>
                {t.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </Field>
        <NumberField
          label={`Target weight (${unit})`}
          name="target"
          value={weightToDisplay(g.target_weight_kg, unit)}
          min={weightToDisplay(20.01, unit)}
          max={weightToDisplay(399, unit)}
        />
        <NumberField
          label={`Weekly change (${unit})`}
          name="weekly"
          value={weightToDisplay(g.weekly_weight_change_target_kg, unit)}
          min={weightToDisplay(-2, unit)}
          max={weightToDisplay(2, unit)}
        />
        <NumberField
          label="Daily calories (kcal)"
          name="calories"
          value={g.daily_calorie_target}
          min={800}
          max={8000}
          step="1"
        />
        <NumberField
          label="Daily protein (g)"
          name="protein"
          value={g.daily_protein_target_g}
          min={10}
          max={500}
          step="1"
        />
      </form>
      <ModalActionBar>
        <ModalFormActions
          form={formId}
          onCancel={onClose}
          pending={pending}
          label="Update targets"
          hint="Your starting weight stays the same."
        />
      </ModalActionBar>
    </ResponsiveModal>
  );
}
