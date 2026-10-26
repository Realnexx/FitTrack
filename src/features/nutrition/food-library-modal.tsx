import type { Food } from "@/lib/data";
import { Plus, Search, ArrowUpRight } from "lucide-react";
import { ResponsiveModal } from "@/components/responsive-modal";
import { Field } from "@/components/fields";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoadingBlock, ErrorBlock } from "@/components/common";
import { FoodImage } from "./food-image";
export function FoodLibraryModal({
  open,
  onClose,
  search,
  onSearch,
  foods,
  loading,
  error,
  onRetry,
  meal,
  onChoose,
  onCustom,
}: {
  open: boolean;
  onClose: () => void;
  search: string;
  onSearch: (value: string) => void;
  foods: Food[] | undefined;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  meal: string;
  onChoose: (food: Food) => void;
  onCustom: () => void;
}) {
  return (
    <ResponsiveModal
      open={open}
      onOpenChange={(value) => !value && onClose()}
      title="Food library"
      description="Find a food, adjust your portion, and add it to your diary."
    >
      <Field label="Search foods">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
          <Input
            id="food-search"
            className="h-11 rounded-xl pl-9"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Rice, egg, adobo..."
          />
        </div>
      </Field>
      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Adding to <span className="capitalize text-foreground">{meal}</span>
        </span>
        <span>{foods?.length ?? 0} results</span>
      </div>
      {loading ? (
        <LoadingBlock rows={3} />
      ) : error ? (
        <ErrorBlock error={error} retry={() => void onRetry()} />
      ) : (
        <div className="mt-4 space-y-2">
          {foods?.map((food) => (
            <button
              key={food.id}
              type="button"
              className="group flex w-full items-center gap-3 rounded-xl border border-transparent bg-elevated/25 p-3 text-left transition-colors hover:border-primary/30 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => onChoose(food)}
            >
              <FoodImage
                imagePath={food.image_path ?? null}
                name={food.name}
                className="size-16 shrink-0 rounded-xl object-cover"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">
                  {food.name}
                  {!food.is_system_food && (
                    <span className="ml-2 rounded-full border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      Custom
                    </span>
                  )}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {food.calories} kcal · {food.protein_g} g protein / {food.serving_size}{" "}
                  {food.serving_unit}
                </span>
              </span>
              <ArrowUpRight className="size-4 shrink-0 text-muted-foreground group-hover:text-primary" />
            </button>
          ))}
          {foods?.length === 0 && (
            <div className="p-6 text-center">
              <Search className="mx-auto mb-3 size-6 text-muted-foreground" />
              <p className="text-sm font-medium">No matching foods</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Try another name or add your own food.
              </p>
              <Button variant="outline" className="mt-4 rounded-xl" onClick={() => onCustom()}>
                <Plus className="size-4" />
                Create food
              </Button>
            </div>
          )}
        </div>
      )}
      <div className="mt-4 border-t pt-4">
        <Button variant="outline" className="h-11 w-full rounded-xl" onClick={() => onCustom()}>
          <Plus className="size-4" />
          Create a custom food
        </Button>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Photos illustrate the food; portions and preparation may vary.{" "}
        <a className="underline" href="/foods/ATTRIBUTION.html" target="_blank" rel="noreferrer">
          Photo credits
        </a>
      </p>
    </ResponsiveModal>
  );
}
