import { MealScanner } from "./scan/meal-scanner";
import { Camera } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  useFoods,
  useFoodLogs,
  useGoal,
  useSettings,
  useAction,
  unwrap,
  uid,
  type FoodLog,
  type Food,
} from "@/lib/data";
import { todayISO, shiftISO } from "@/lib/dates";
import { scaleNutrition, sumMacros } from "@/lib/calc";
import { PageHeader, Panel, LoadingBlock, ErrorBlock, ConfirmDialog } from "@/components/common";
import { values } from "@/components/fields";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Utensils,
  Flame,
  Beef,
  Wheat,
  Droplets,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
} from "lucide-react";
import { FoodImage } from "./food-image";
import { FoodLibraryModal } from "./food-library-modal";
import { MealEntryModal, CustomFoodModal } from "./nutrition-modals";
const MEALS = ["breakfast", "lunch", "dinner", "snack"];
export function Nutrition() {
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [mealDefault, setMealDefault] = useState("breakfast");
  const settings = useSettings();
  const [dateOverride, setDate] = useState<string | null>(null);
  const date = dateOverride ?? todayISO(settings.data?.timezone);
  const [search, setSearch] = useState("");
  const foods = useFoods(search);
  const logs = useFoodLogs(date, date);
  const goal = useGoal();
  const [selected, setSelected] = useState<Food | null>(null);
  const [editing, setEditing] = useState<FoodLog | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [quantity, setQuantity] = useState("");
  const [portionMode, setPortionMode] = useState("native");
  const [key, setKey] = useState(0);
  const save = useAction(
    async (form: HTMLFormElement) => {
      const v = values(form);
      if (!editing && !selected) throw new Error("Choose a food first.");
      const qty = v.num("quantity");
      let macros;
      let multiplier;
      if (editing) {
        const ratio = qty / editing.quantity;
        macros = {
          calories: editing.calories_snapshot * ratio,
          protein: editing.protein_snapshot_g * ratio,
          carbs: editing.carbs_snapshot_g * ratio,
          fat: editing.fat_snapshot_g * ratio,
        };
        multiplier = editing.serving_multiplier * ratio;
      } else {
        if (!selected) throw new Error("Select a food.");
        const scaled = scaleNutrition(
          {
            serving_size: selected.serving_size,
            calories: selected.calories,
            protein: selected.protein_g,
            carbs: selected.carbs_g,
            fat: selected.fat_g,
          },
          portionMode === "serving" ? qty * selected.serving_size : qty,
        );
        macros = scaled;
        multiplier = scaled.multiplier;
      }
      if (qty <= 0 || multiplier <= 0) throw new Error("Enter a positive quantity.");
      const record = {
        user_id: await uid(),
        food_id: editing?.food_id ?? selected?.id ?? null,
        food_name_snapshot: editing?.food_name_snapshot ?? selected?.name ?? "",
        quantity: qty,
        unit:
          editing?.unit ??
          (portionMode === "serving" ? "serving" : (selected?.serving_unit ?? "g")),
        log_date: date,
        meal_type: v.text("meal"),
        serving_multiplier: multiplier,
        calories_snapshot: Math.round(macros.calories * 10) / 10,
        protein_snapshot_g: Math.round(macros.protein * 10) / 10,
        carbs_snapshot_g: Math.round(macros.carbs * 10) / 10,
        fat_snapshot_g: Math.round(macros.fat * 10) / 10,
      };
      unwrap(
        editing
          ? await supabase.from("food_logs").update(record).eq("id", editing.id)
          : await supabase.from("food_logs").insert(record),
      );
    },
    {
      invalidate: [["foodLogs"]],
      success: "Meal saved",
      onSuccess: () => {
        setSelected(null);
        setEditing(null);
        setQuantity("");
        setKey((k) => k + 1);
      },
    },
  );
  const remove = useAction(
    async (id: string) => unwrap(await supabase.from("food_logs").delete().eq("id", id)),
    {
      invalidate: [["foodLogs"]],
      success: "Food entry deleted",
      onSuccess: () => setDeleting(null),
    },
  );
  const custom = useAction(
    async (form: HTMLFormElement) => {
      const v = values(form);
      unwrap(
        await supabase.from("foods").insert({
          name: v.text("name"),
          created_by: await uid(),
          serving_size: v.num("size"),
          serving_unit: v.text("unit"),
          calories: v.num("calories"),
          protein_g: v.num("protein"),
          carbs_g: v.num("carbs"),
          fat_g: v.num("fat"),
          source_note: v.text("source") || "User supplied nutrition label / recipe",
          is_system_food: false,
        }),
      );
      form.reset();
    },
    {
      invalidate: [["foods"]],
      success: "Custom food created",
      onSuccess: () => setCustomOpen(false),
    },
  );
  if (logs.isPending || goal.isPending || settings.isPending) return <LoadingBlock />;
  if (logs.error || goal.error || settings.error)
    return (
      <ErrorBlock
        error={logs.error || goal.error || settings.error}
        retry={() => {
          void logs.refetch();
          void goal.refetch();
          void settings.refetch();
        }}
      />
    );
  const totals = sumMacros(
    (logs.data ?? []).map((l) => ({
      calories: l.calories_snapshot,
      protein: l.protein_snapshot_g,
      carbs: l.carbs_snapshot_g,
      fat: l.fat_snapshot_g,
    })),
  );
  const preview = editing
    ? {
        calories: (editing.calories_snapshot * Number(quantity)) / editing.quantity,
        protein: (editing.protein_snapshot_g * Number(quantity)) / editing.quantity,
        carbs: (editing.carbs_snapshot_g * Number(quantity)) / editing.quantity,
        fat: (editing.fat_snapshot_g * Number(quantity)) / editing.quantity,
      }
    : selected
      ? scaleNutrition(
          {
            serving_size: selected.serving_size,
            calories: selected.calories,
            protein: selected.protein_g,
            carbs: selected.carbs_g,
            fat: selected.fat_g,
          },
          portionMode === "serving" ? Number(quantity) * selected.serving_size : Number(quantity),
        )
      : null;
  const closeEntry = () => {
    setSelected(null);
    setEditing(null);
  };
  const choose = (food: Food) => {
    setLibraryOpen(false);
    setSelected(food);
    setEditing(null);
    setPortionMode("native");
    setQuantity(String(food.serving_size));
    setKey((k) => k + 1);
  };
  const calorieTarget = goal.data?.daily_calorie_target;
  const remaining = calorieTarget ? Math.round(calorieTarget - totals.calories) : null;
  return (
    <>
      {scanOpen && (
        <MealScanner meal={mealDefault} date={date} onClose={() => setScanOpen(false)} />
      )}
      <PageHeader
        title="Nutrition"
        subtitle="Small choices. A stronger you."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" className="h-11 rounded-xl" onClick={() => setScanOpen(true)}>
              <Camera className="size-4" />
              Scan meal
            </Button>
            <Button
              className="h-11 rounded-xl"
              variant="outline"
              onClick={() => setCustomOpen(true)}
            >
              <Plus className="size-4" />
              Create custom food
            </Button>
          </div>
        }
      />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card p-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <Utensils className="size-5" />
          </span>
          <div>
            <p className="font-semibold">Your daily food diary</p>
            <p className="text-xs text-muted-foreground">
              {date === todayISO(settings.data?.timezone) ? "Today" : date} ·{" "}
              {logs.data?.length ?? 0} food entries
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Previous day"
            onClick={() => {
              setDate(shiftISO(date, -1));
              closeEntry();
            }}
          >
            <ChevronLeft />
          </Button>
          <Input
            aria-label="Nutrition date"
            type="date"
            className="w-40 rounded-xl"
            value={date}
            max={todayISO(settings.data?.timezone)}
            onChange={(e) => {
              if (e.target.value) {
                setDate(e.target.value);
                closeEntry();
              }
            }}
          />
          <Button
            variant="ghost"
            size="icon"
            aria-label="Next day"
            disabled={date >= todayISO(settings.data?.timezone)}
            onClick={() => {
              setDate(shiftISO(date, 1));
              closeEntry();
            }}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Calories",
            value: totals.calories,
            unit: "kcal",
            target: calorieTarget,
            icon: Flame,
          },
          {
            label: "Protein",
            value: totals.protein,
            unit: "g",
            target: goal.data?.daily_protein_target_g,
            icon: Beef,
          },
          { label: "Carbohydrates", value: totals.carbs, unit: "g", target: null, icon: Wheat },
          { label: "Fat", value: totals.fat, unit: "g", target: null, icon: Droplets },
        ].map(({ label, value, unit, target, icon: Icon }) => (
          <Panel key={label} className="relative overflow-hidden">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{label}</p>
              <Icon className="size-4 text-primary" />
            </div>
            <p className="font-display text-3xl font-semibold">
              {Math.round(value)}{" "}
              <span className="text-sm font-normal text-muted-foreground">{unit}</span>
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {target ? `Daily target: ${target} ${unit}` : "Total logged today"}
            </p>
            {target && (
              <div
                className="mt-4 h-1.5 overflow-hidden rounded-full bg-elevated"
                role="progressbar"
                aria-label={`${label} target progress`}
                aria-valuenow={Math.round(value)}
                aria-valuemin={0}
                aria-valuemax={Math.max(target, Math.round(value))}
              >
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, (value / target) * 100))}%` }}
                />
              </div>
            )}
          </Panel>
        ))}
      </div>
      <div className="mx-auto max-w-5xl">
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Your meals</h2>
            <span className="text-xs text-muted-foreground">
              {remaining === null
                ? "Log meals to track your day"
                : remaining >= 0
                  ? `${remaining} kcal remaining`
                  : `${Math.abs(remaining)} kcal above target`}
            </span>
          </div>
          {MEALS.map((meal, index) => {
            const entries = (logs.data ?? []).filter((l) => l.meal_type === meal);
            return (
              <Panel key={meal}>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-xl bg-elevated text-xs font-semibold text-muted-foreground">
                      0{index + 1}
                    </span>
                    <div>
                      <h3 className="font-semibold capitalize">{meal}</h3>
                      <p className="text-xs text-muted-foreground">
                        {Math.round(entries.reduce((sum, l) => sum + l.calories_snapshot, 0))} kcal
                        · {entries.length} entries
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-end gap-1">
                    <Button
                      type="button"
                      variant="tonal"
                      size="sm"
                      aria-label={`Scan meal for ${meal}`}
                      onClick={() => {
                        setMealDefault(meal);
                        setScanOpen(true);
                      }}
                    >
                      <Camera className="size-4" />
                      Scan
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-xl text-primary"
                      onClick={() => {
                        setMealDefault(meal);
                        setLibraryOpen(true);
                      }}
                      aria-label={`Add food to ${meal}`}
                    >
                      <Plus className="size-4" />
                      Add food
                    </Button>
                  </div>
                </div>
                {entries.map((l) => (
                  <div
                    key={l.id}
                    data-testid="food-entry"
                    className="flex items-center gap-3 border-t py-4 last:pb-0"
                  >
                    <FoodImage
                      imagePath={l.image_path ?? null}
                      name={l.food_name_snapshot}
                      className="size-12 shrink-0 rounded-xl border border-border/50 object-cover sm:size-16"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-medium">{l.food_name_snapshot}</p>
                      {l.nutrition_source === "ai_estimate" && (
                        <span className="text-[10px] font-semibold text-primary">
                          AI-estimated nutrition
                        </span>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {l.quantity} {l.unit} · {Math.round(l.calories_snapshot)} kcal ·{" "}
                        {Math.round(l.protein_snapshot_g)} g protein
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-9 rounded-xl"
                      aria-label={`Edit ${l.food_name_snapshot}`}
                      onClick={() => {
                        setEditing(l);
                        setSelected(null);
                        setQuantity(String(l.quantity));
                        setKey((k) => k + 1);
                      }}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-9 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Delete ${l.food_name_snapshot}`}
                      onClick={() => setDeleting(l.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
                {!entries.length && (
                  <div className="rounded-xl border border-dashed p-5 text-center">
                    <p className="text-sm text-muted-foreground">No food logged yet.</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Tap Add food to choose something for your {meal}.
                    </p>
                  </div>
                )}
              </Panel>
            );
          })}
        </div>
      </div>
      <FoodLibraryModal
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        search={search}
        onSearch={setSearch}
        foods={foods.data ?? []}
        loading={foods.isPending}
        error={foods.error}
        onRetry={() => void foods.refetch()}
        meal={mealDefault}
        onChoose={choose}
        onCustom={() => {
          setLibraryOpen(false);
          setCustomOpen(true);
        }}
      />
      <MealEntryModal
        key={key}
        selected={selected}
        editing={editing}
        quantity={quantity}
        setQuantity={setQuantity}
        portionMode={portionMode}
        setPortionMode={setPortionMode}
        date={date}
        preview={preview}
        pending={save.isPending}
        onSave={(form) => save.mutate(form)}
        onClose={closeEntry}
        mealDefault={mealDefault}
      />
      <CustomFoodModal
        open={customOpen}
        pending={custom.isPending}
        onSave={(form) => custom.mutate(form)}
        onClose={() => setCustomOpen(false)}
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete food entry?"
        body="This consumed food entry will be permanently removed."
        onConfirm={() => deleting && remove.mutate(deleting)}
      />
    </>
  );
}
