import { FoodImage } from "./food-image";
import { useId } from "react";
import type { Food, FoodLog } from "@/lib/data";
import { Field, NumberField, selectClass } from "@/components/fields";
import { Input } from "@/components/ui/input";
import { ResponsiveModal } from "@/components/responsive-modal";
import { ModalActionBar, ModalFormActions } from "@/components/modal-actions";
type Macros = { calories: number; protein: number; carbs: number; fat: number };
export function MealEntryModal({
  selected,
  editing,
  quantity,
  setQuantity,
  portionMode,
  setPortionMode,
  date,
  preview,
  mealDefault,
  pending,
  onSave,
  onClose,
}: {
  selected: Food | null;
  editing: FoodLog | null;
  quantity: string;
  setQuantity: (value: string) => void;
  portionMode: string;
  setPortionMode: (value: string) => void;
  date: string;
  mealDefault: string;
  preview: Macros | null;
  pending: boolean;
  onSave: (form: HTMLFormElement) => void;
  onClose: () => void;
}) {
  const formId = useId();
  return (
    <ResponsiveModal
      open={Boolean(selected || editing)}
      onOpenChange={(open) => !open && onClose()}
      title={editing ? "Edit food entry" : "Log a food"}
      description="Choose your portion and meal. Review the nutrition before saving."
    >
      <form
        id={formId}
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!pending) onSave(e.currentTarget);
        }}
      >
        <div className="flex items-center gap-4 rounded-xl bg-elevated/40 p-4">
          <FoodImage
            name={editing?.food_name_snapshot ?? selected?.name ?? ""}
            className="size-16 rounded-xl object-cover"
          />
          <div>
            <p className="text-sm font-semibold">{editing?.food_name_snapshot ?? selected?.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">Portion for {date}</p>
          </div>
        </div>
        {!editing && selected && selected.serving_unit !== "serving" && (
          <Field label="Serving unit">
            <select
              className={selectClass}
              value={portionMode}
              onChange={(e) => {
                setPortionMode(e.target.value);
                setQuantity(e.target.value === "serving" ? "1" : String(selected.serving_size));
              }}
            >
              <option value="native">{selected.serving_unit}</option>
              <option value="serving">
                Serving ({selected.serving_size} {selected.serving_unit})
              </option>
            </select>
          </Field>
        )}
        <Field
          label={`Quantity (${editing?.unit ?? (portionMode === "serving" ? "serving" : selected?.serving_unit)})`}
        >
          <Input
            name="quantity"
            type="number"
            min="0.01"
            max="10000"
            step="any"
            required
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </Field>
        <Field label="Meal">
          <select
            name="meal"
            className={selectClass}
            defaultValue={editing?.meal_type ?? mealDefault}
          >
            {["breakfast", "lunch", "dinner", "snack"].map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </Field>
        {preview && (
          <div className="grid grid-cols-2 gap-3 rounded-2xl border bg-primary/5 p-4 sm:grid-cols-4">
            {[
              ["Calories", preview.calories, "kcal"],
              ["Protein", preview.protein, "g"],
              ["Carbs", preview.carbs, "g"],
              ["Fat", preview.fat, "g"],
            ].map(([label, value, unit]) => (
              <div key={label}>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 text-lg font-semibold">
                  {Math.round(Number(value) * 10) / 10}{" "}
                  <span className="text-xs font-normal text-muted-foreground">{unit}</span>
                </p>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          {selected?.source_note ??
            "Saved nutrition snapshot. Quantity changes scale the original values."}{" "}
          Nutrition values are approximate; use custom foods for your label or recipe.
        </p>
      </form>
      <ModalActionBar>
        <ModalFormActions
          form={formId}
          onCancel={onClose}
          pending={pending}
          label="Save food entry"
          hint="Nutrition is calculated for your portion."
        />
      </ModalActionBar>
    </ResponsiveModal>
  );
}
export function CustomFoodModal({
  open,
  pending,
  onSave,
  onClose,
}: {
  open: boolean;
  pending: boolean;
  onSave: (form: HTMLFormElement) => void;
  onClose: () => void;
}) {
  const formId = useId();
  return (
    <ResponsiveModal
      open={open}
      onOpenChange={(open) => !open && onClose()}
      title="Create a custom food"
      description="Use the nutrition label or recipe values for one serving."
    >
      <div className="mb-5 rounded-xl border bg-primary/5 p-4 text-sm text-muted-foreground">
        Enter all nutrition values for the serving size below. Your food will be available in the
        food library.
      </div>
      <form
        id={formId}
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!pending) onSave(e.currentTarget);
        }}
      >
        <Field label="Food name">
          <Input name="name" required maxLength={100} />
        </Field>
        <NumberField label="Serving size" name="size" min={0.01} max={10000} />
        <Field label="Serving unit">
          <select name="unit" className={selectClass}>
            {["g", "mL", "serving", "piece", "cup", "tbsp"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </Field>
        <NumberField label="Calories per serving" name="calories" min={0} max={10000} />
        <NumberField label="Protein (g)" name="protein" min={0} max={1000} />
        <NumberField label="Carbohydrates (g)" name="carbs" min={0} max={1000} />
        <NumberField label="Fat (g)" name="fat" min={0} max={1000} />
        <Field label="Label or recipe source">
          <Input name="source" maxLength={300} />
        </Field>
      </form>
      <ModalActionBar>
        <ModalFormActions
          form={formId}
          onCancel={onClose}
          pending={pending}
          label="Create food"
          pendingLabel="Creating food..."
          hint="Check your label before saving."
        />
      </ModalActionBar>
    </ResponsiveModal>
  );
}
