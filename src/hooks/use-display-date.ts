import { format } from "date-fns";
import { useSettings } from "@/lib/data";
import { todayISO, parseISODate } from "@/lib/dates";
export function useDisplayDate() {
  const settings = useSettings();
  return (value: string) => {
    const date = value.length === 10 ? value : todayISO(settings.data?.timezone, new Date(value));
    return format(
      parseISODate(date),
      ["MMM d, yyyy", "yyyy-MM-dd", "dd/MM/yyyy"].includes(settings.data?.date_format ?? "")
        ? settings.data!.date_format
        : "MMM d, yyyy",
    );
  };
}
