import { z } from "zod";
export const scanItemSchema = z.object({
  food_id: z.string().uuid().nullable(),
  name: z.string().trim().min(1).max(100),
  quantity: z.number().finite().min(0.01).max(10000),
  unit: z.enum(["g", "mL", "serving", "piece", "cup", "tbsp"]),
  calories: z.number().finite().min(0).max(10000),
  protein: z.number().finite().min(0).max(999),
  carbs: z.number().finite().min(0).max(999),
  fat: z.number().finite().min(0).max(999),
  notes: z.string().max(400),
});
export const scanResultSchema = z.object({ items: z.array(scanItemSchema).max(8) });
export type ScanItem = z.infer<typeof scanItemSchema>;
export type ScanAllowance = {
  available: boolean;
  message: string;
  remaining?: number;
  retry_at?: string;
};
export type ScanResult = { scan_id: string; items: ScanItem[] };
export const FREE_LIMIT_MESSAGE =
  "Free meal scans are currently unavailable. The scanning allowance has been reached. Try again later or add your food manually.";
export function resizePortion(item: ScanItem, quantity: number): ScanItem {
  if (item.quantity <= 0 || !Number.isFinite(quantity)) return { ...item, quantity };
  const factor = quantity / item.quantity;
  return {
    ...item,
    quantity,
    calories: item.calories * factor,
    protein: item.protein * factor,
    carbs: item.carbs * factor,
    fat: item.fat * factor,
  };
}
export const geminiSchema = {
  type: "OBJECT",
  properties: {
    items: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          food_id: { type: "STRING", nullable: true },
          name: { type: "STRING" },
          quantity: { type: "NUMBER" },
          unit: { type: "STRING", enum: ["g", "mL", "serving", "piece", "cup", "tbsp"] },
          calories: { type: "NUMBER" },
          protein: { type: "NUMBER" },
          carbs: { type: "NUMBER" },
          fat: { type: "NUMBER" },
          notes: { type: "STRING" },
        },
        required: [
          "food_id",
          "name",
          "quantity",
          "unit",
          "calories",
          "protein",
          "carbs",
          "fat",
          "notes",
        ],
      },
    },
  },
  required: ["items"],
};
