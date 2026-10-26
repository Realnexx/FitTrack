import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, ScanLine, Trash2, Check, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { uid, useFoods } from "@/lib/data";
import type { Json } from "@/integrations/supabase/types";
import { ResponsiveModal } from "@/components/responsive-modal";
import { ModalActionBar } from "@/components/modal-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, selectClass } from "@/components/fields";
import { prepareMealPhoto, scanRequest } from "./client";
import {
  resizePortion,
  scanResultSchema,
  type ScanAllowance,
  type ScanItem,
  type ScanResult,
} from "./types";
type Photo = Awaited<ReturnType<typeof prepareMealPhoto>>;
export function MealScanner({
  meal,
  date,
  onClose,
}: {
  meal: string;
  date: string;
  onClose: () => void;
}) {
  const camera = useRef<HTMLInputElement>(null),
    picker = useRef<HTMLInputElement>(null);
  const lock = useRef(false);
  const [busy, setBusy] = useState<"photo" | "scan" | "save" | null>(null);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [allowance, setAllowance] = useState<ScanAllowance | null>(null);
  const [checking, setChecking] = useState(true);
  const checkVersion = useRef(0);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [consent, setConsent] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [items, setItems] = useState<ScanItem[]>([]);
  const bases = useRef<ScanItem[]>([]);
  const [selectedMeal, setSelectedMeal] = useState(meal);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const foods = useFoods("");
  const qc = useQueryClient();
  const check = async (signal?: AbortSignal) => {
    const version = ++checkVersion.current;
    setChecking(true);
    try {
      const available = await scanRequest<ScanAllowance>("GET", undefined, signal);
      if (!signal?.aborted && version === checkVersion.current) {
        setAllowance(available);
        setError("");
      }
    } catch (e) {
      if (!signal?.aborted && version === checkVersion.current) {
        const issue = e as Error & { retryAt?: string };
        setAllowance({
          available: false,
          message: issue.message,
          ...(issue.retryAt ? { retry_at: issue.retryAt } : {}),
        });
      }
    } finally {
      if (!signal?.aborted && version === checkVersion.current) {
        setChecking(false);
        setCheckedAt(new Date().toLocaleTimeString());
      }
    }
  };
  useEffect(() => {
    const controller = new AbortController();
    void check(controller.signal);
    return () => controller.abort();
  }, []);
  async function choose(file: File | undefined) {
    if (!file || lock.current) return;
    lock.current = true;
    setBusy("photo");
    setError("");
    setResult(null);
    setItems([]);
    try {
      setPhoto(await prepareMealPhoto(file));
      setRequestId(crypto.randomUUID());
    } catch (e) {
      setPhoto(null);
      setError(e instanceof Error ? e.message : "Could not prepare this photo.");
    } finally {
      lock.current = false;
      setBusy(null);
    }
  }
  async function analyze() {
    if (!photo || !consent || !allowance?.available || checking || lock.current) return;
    lock.current = true;
    setBusy("scan");
    setError("");
    try {
      const response = await scanRequest<ScanResult>("POST", {
        image: photo.base64,
        request_id: requestId,
        consent: true,
      });
      const parsed = scanResultSchema.parse(response);
      setResult({ ...response, items: parsed.items });
      setItems(parsed.items);
      bases.current = parsed.items;
      void check();
    } catch (e) {
      const issue = e as Error & { quota?: boolean; retryAt?: string };
      setError(issue.message);
      if (issue.quota)
        setAllowance({
          available: false,
          message: issue.message,
          ...(issue.retryAt ? { retry_at: issue.retryAt } : {}),
        });
      setRequestId(crypto.randomUUID());
    } finally {
      lock.current = false;
      setBusy(null);
    }
  }
  async function save() {
    if (!photo || !result || lock.current) return;
    const valid = scanResultSchema.safeParse({ items });
    if (!valid.success || !items.length) {
      setError("Review the food names, portions and nutrition before saving.");
      return;
    }
    lock.current = true;
    setBusy("save");
    setError("");
    let path: string | null = null;
    try {
      const userId = await uid();
      path = `${userId}/${result.scan_id}.jpg`;
      const uploaded = await supabase.storage.from("meal-photos").upload(path, photo.file, {
        contentType: "image/jpeg",
        cacheControl: "3600",
        upsert: false,
      });
      if (
        uploaded.error &&
        String((uploaded.error as unknown as { statusCode?: string }).statusCode) !== "409" &&
        !/already exists|duplicate/i.test(uploaded.error.message)
      )
        throw new Error("Could not save the meal photo. Please try again.");
      const { error: saveError } = await supabase.rpc("save_scanned_meal", {
        p_scan: result.scan_id,
        p_items: items as unknown as Json,
        p_meal: selectedMeal,
        p_date: date,
        p_image: path,
      });
      if (saveError)
        throw new Error(
          "Could not save this meal. Please retry. If the scan expired, take another photo.",
        );
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["foods"] }),
        qc.invalidateQueries({ queryKey: ["foodLogs"] }),
      ]);
      toast.success("Scanned meal saved");
      onClose();
    } catch (e) {
      if (path)
        await supabase.storage
          .from("meal-photos")
          .remove([path])
          .catch(() => undefined);
      setError(e instanceof Error ? e.message : "Could not save the meal.");
    } finally {
      lock.current = false;
      setBusy(null);
    }
  }
  function update(index: number, patch: Partial<ScanItem>) {
    setItems((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }
  return (
    <ResponsiveModal
      open
      onOpenChange={(open) => {
        if (!open && !lock.current) onClose();
      }}
      title={result ? "Review your meal" : "Scan your meal"}
      description={`Photo-assisted food logging · ${date}`}
    >
      <div className="space-y-5">
        <div className="rounded-2xl border bg-primary/5 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <ScanLine className="size-4 text-primary" />
            {result ? "Check portions before saving" : "Take a clear photo of your plate"}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Photos cannot reveal every ingredient or exact portion. AI nutrition is estimated;
            review it before adding to your diary.
          </p>
        </div>
        {!result && (
          <section
            className="space-y-3 rounded-2xl border bg-card p-4"
            aria-label="Scanning availability"
          >
            <div
              role="status"
              aria-live="polite"
              className="text-xs leading-relaxed text-muted-foreground"
            >
              <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-foreground">
                {checking ? (
                  <Loader2 className="size-4 animate-spin text-primary" />
                ) : allowance?.available ? (
                  <Check className="size-4 text-primary" />
                ) : (
                  <ScanLine className="size-4 text-muted-foreground" />
                )}
                {checking
                  ? "Checking availability…"
                  : allowance?.available
                    ? "Ready to scan"
                    : "Scanning unavailable"}
              </p>
              <p>
                {allowance
                  ? allowance.message
                  : "Checking your account and free scanning allowance."}
              </p>
              {allowance?.available && allowance.remaining !== undefined && (
                <p className="mt-1">
                  Up to {allowance.remaining} scans remaining in your daily allowance.
                </p>
              )}
              {allowance?.retry_at && (
                <p className="mt-1">
                  Try again after {new Date(allowance.retry_at).toLocaleString()}.
                </p>
              )}
              {!checking && checkedAt && (
                <p className="mt-2 text-[11px]">Last checked at {checkedAt}</p>
              )}
            </div>
            <Button
              type="button"
              variant="tonal"
              className="min-h-11 h-auto w-full whitespace-normal px-5 py-3 sm:w-auto"
              disabled={checking || !!busy}
              aria-busy={checking}
              onClick={() => void check()}
            >
              {checking ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              {checking ? "Checking…" : "Check availability"}
            </Button>
          </section>
        )}
        <input
          type="file"
          ref={camera}
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className="sr-only"
          aria-label="Take meal photo"
          disabled={!!busy}
          onChange={(e) => {
            void choose(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <input
          type="file"
          ref={picker}
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          aria-label="Choose meal photo"
          disabled={!!busy}
          onChange={(e) => {
            void choose(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        {photo && (
          <img
            src={photo.preview}
            alt="Your meal photo"
            className={`${result ? "h-28" : "max-h-56"} w-full rounded-2xl border bg-elevated object-contain`}
          />
        )}
        {!result && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="tonal"
                className="h-12"
                disabled={!!busy}
                onClick={() => camera.current?.click()}
              >
                <Camera />
                Take photo
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-12"
                disabled={!!busy}
                onClick={() => picker.current?.click()}
              >
                <ImagePlus />
                Choose image
              </Button>
            </div>
            <label className="flex items-start gap-3 rounded-xl border p-3 text-xs leading-relaxed text-muted-foreground">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                disabled={!!busy}
                className="mt-1 size-4 shrink-0 accent-primary"
              />
              <span>
                I agree to send this food-only photo to Google for analysis. It contains no people,
                personal or sensitive information. Google's free service may use images and
                responses for improvement and human review.{" "}
                <a
                  href="https://ai.google.dev/gemini-api/terms"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline"
                >
                  Read terms
                </a>
                .
              </span>
            </label>
          </>
        )}
        {result && (
          <>
            <Field label="Add to meal">
              <select
                className={selectClass}
                value={selectedMeal}
                disabled={!!busy}
                onChange={(e) => setSelectedMeal(e.target.value)}
              >
                {["breakfast", "lunch", "dinner", "snack"].map((value) => (
                  <option key={value} value={value}>
                    {value[0]!.toUpperCase() + value.slice(1)}
                  </option>
                ))}
              </select>
            </Field>
            {items.map((item, index) => (
              <section
                key={`${result.scan_id}-${index}`}
                className="space-y-3 rounded-2xl border bg-card p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full border border-primary/25 bg-primary/5 px-2.5 py-1 text-[11px] font-semibold text-primary">
                    {item.food_id ? "Food library match" : "AI estimate · personal food"}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${item.name}`}
                    disabled={!!busy}
                    onClick={() => {
                      setItems((current) => current.filter((_, i) => i !== index));
                      bases.current = bases.current.filter((_, i) => i !== index);
                    }}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
                <Field label={`Food match ${index + 1}`}>
                  <select
                    className={selectClass}
                    disabled={!!busy}
                    value={item.food_id ?? "new"}
                    onChange={(e) => {
                      const food = foods.data?.find((food) => food.id === e.target.value);
                      if (food) {
                        const next = {
                          ...item,
                          food_id: food.id,
                          name: food.name,
                          quantity: food.serving_size,
                          unit: food.serving_unit as ScanItem["unit"],
                          calories: food.calories,
                          protein: food.protein_g,
                          carbs: food.carbs_g,
                          fat: food.fat_g,
                        };
                        bases.current[index] = next;
                        update(index, next);
                      } else {
                        update(index, { food_id: null });
                        bases.current[index] = { ...item, food_id: null };
                      }
                    }}
                  >
                    <option value="new">Create/reuse a personal food</option>
                    {item.food_id && !foods.data?.some((food) => food.id === item.food_id) && (
                      <option value={item.food_id}>{item.name}</option>
                    )}
                    {foods.data?.map((food) => (
                      <option key={food.id} value={food.id}>
                        {food.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={`Food name ${index + 1}`}>
                  <Input
                    value={item.name}
                    maxLength={100}
                    disabled={!!busy || !!item.food_id}
                    onChange={(e) => update(index, { name: e.target.value })}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label={`Portion ${index + 1} (${item.unit})`}>
                    <Input
                      type="number"
                      min="0.01"
                      max="10000"
                      step="any"
                      value={item.quantity}
                      disabled={!!busy}
                      onChange={(e) => {
                        const amount = Number(e.target.value);
                        const base = bases.current[index]!;
                        update(index, {
                          ...resizePortion(base, amount),
                          food_id: item.food_id,
                          name: item.name,
                        });
                      }}
                    />
                  </Field>
                  <div className="flex items-end pb-3 text-xs text-muted-foreground">
                    Nutrition below is for this portion.
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {(["calories", "protein", "carbs", "fat"] as const).map((key) => (
                    <Field
                      key={key}
                      label={`${key === "calories" ? "Calories (kcal)" : key[0]!.toUpperCase() + key.slice(1) + " (g)"} ${index + 1}`}
                    >
                      <Input
                        type="number"
                        min="0"
                        max={key === "calories" ? 10000 : 999}
                        step="0.1"
                        value={Number(item[key].toFixed(1))}
                        disabled={!!busy || !!item.food_id}
                        onChange={(e) => {
                          const next = { ...item, [key]: Number(e.target.value) };
                          update(index, next);
                          bases.current[index] = next;
                        }}
                      />
                    </Field>
                  ))}
                </div>
                {item.notes && (
                  <p className="text-xs leading-relaxed text-muted-foreground">{item.notes}</p>
                )}
              </section>
            ))}
            {!items.length && (
              <p className="text-sm text-muted-foreground">
                All foods removed. Choose another photo or close the scanner.
              </p>
            )}
            <p className="rounded-xl border bg-primary/5 p-4 text-sm font-semibold">
              Meal total: {Math.round(items.reduce((sum, item) => sum + item.calories, 0))} kcal ·{" "}
              {Math.round(items.reduce((sum, item) => sum + item.protein, 0))} g protein
            </p>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={!!busy}
              onClick={() => {
                setResult(null);
                setItems([]);
                setPhoto(null);
                setRequestId(crypto.randomUUID());
                void check();
              }}
            >
              <Camera />
              Use another photo
            </Button>
          </>
        )}
        {error && (
          <p
            role="alert"
            className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          >
            {error}
          </p>
        )}
      </div>
      <ModalActionBar>
        {!result && (
          <p
            id="meal-analysis-help"
            role="status"
            className="mb-3 text-xs leading-relaxed text-muted-foreground"
          >
            {checking
              ? "Checking whether scanning is available…"
              : !allowance?.available
                ? "Analysis is unavailable until the availability check succeeds. Manual food logging remains available."
                : !photo
                  ? "Take a photo or choose an image to continue."
                  : !consent
                    ? "Confirm photo processing above to enable Analyze meal."
                    : "Ready. Analyze meal will identify the foods for you to review."}
          </p>
        )}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" disabled={!!busy} onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            className="min-h-12 whitespace-normal px-6"
            disabled={
              !!busy ||
              (!result && (checking || !photo || !consent || !allowance?.available)) ||
              (!!result && !items.length)
            }
            aria-describedby={!result ? "meal-analysis-help" : undefined}
            onClick={() => void (result ? save() : analyze())}
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : result ? (
              <Check className="size-4" />
            ) : (
              <ScanLine className="size-4" />
            )}
            {busy === "photo"
              ? "Preparing photo…"
              : busy === "scan"
                ? "Analyzing meal…"
                : busy === "save"
                  ? "Saving meal…"
                  : result
                    ? `Save to ${selectedMeal}`
                    : "Analyze meal"}
          </Button>
        </div>
      </ModalActionBar>
    </ResponsiveModal>
  );
}
