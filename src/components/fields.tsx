import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      {children}
    </label>
  );
}
export function NumberField({
  label,
  name,
  value,
  min,
  max,
  step = "any",
}: {
  label: string;
  name: string;
  value?: number;
  min?: number;
  max?: number;
  step?: string;
}) {
  return (
    <Field label={label}>
      <Input
        name={name}
        type="number"
        defaultValue={value}
        min={min}
        max={max}
        step={step}
        required
      />
    </Field>
  );
}
export const selectClass = "h-11 w-full rounded-lg border bg-background px-3 text-sm";
export function values(form: HTMLFormElement) {
  const d = new FormData(form);
  return {
    text: (k: string) => String(d.get(k) ?? "").trim(),
    num: (k: string) => Number(d.get(k)),
    all: (k: string) => d.getAll(k).map(String),
  };
}
