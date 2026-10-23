import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { uid, unwrap, useSettings } from "@/lib/data";
import { bmiCategory } from "@/lib/bmi";
import { useDisplayDate } from "@/hooks/use-display-date";
import { Button } from "@/components/ui/button";
import { History, Loader2 } from "lucide-react";
export function BmiHistory() {
  const date = useDisplayDate();
  const settings = useSettings();
  const history = useInfiniteQuery({
    queryKey: ["bmi-history"],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const id = await uid();
      return (
        unwrap(
          await supabase
            .from("bmi_logs")
            .select("*")
            .eq("user_id", id)
            .order("recorded_at", { ascending: false })
            .order("id", { ascending: false })
            .range(pageParam, pageParam + 19),
        ) ?? []
      );
    },
    getNextPageParam: (page, pages) => (page.length === 20 ? pages.length * 20 : undefined),
  });
  return (
    <section className="border-t pt-5">
      <h3 className="flex items-center gap-2 font-display font-semibold">
        <History className="size-4 text-primary" />
        BMI history
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">Your saved results, newest first.</p>
      {history.isPending ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading history…</p>
      ) : history.error ? (
        <div role="alert" className="mt-4 rounded-xl border border-destructive/30 p-4 text-sm">
          <p>Could not load BMI history. Please try again.</p>
          <Button
            type="button"
            variant="outline"
            className="mt-3"
            onClick={() => void history.refetch()}
          >
            Retry
          </Button>
        </div>
      ) : (
        <>
          {!history.data?.pages.flat().length && (
            <div className="mt-4 rounded-2xl border border-dashed p-5 text-center text-sm text-muted-foreground">
              No saved BMI results yet. Calculate your BMI and select Save BMI to start your
              history.
            </div>
          )}
          <ol className="mt-4 space-y-3">
            {history.data?.pages.flat().map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between gap-4 rounded-2xl border bg-card p-4"
              >
                <div>
                  <time dateTime={row.recorded_at} className="text-sm font-medium">
                    {date(row.recorded_at)}{" "}
                    <span className="text-xs text-muted-foreground">
                      {new Date(row.recorded_at).toLocaleTimeString(undefined, {
                        timeZone: settings.data?.timezone ?? "Asia/Manila",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </time>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {Number(row.weight_kg.toFixed(2))} kg · {Number(row.height_cm.toFixed(2))} cm
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {row.adult_confirmed ? bmiCategory(row.bmi) : "Adult category not assessed"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display text-2xl font-semibold tabular-nums">
                    {row.bmi.toFixed(1)}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">BMI</p>
                </div>
              </li>
            ))}
          </ol>
          {history.hasNextPage && (
            <Button
              type="button"
              variant="outline"
              className="mt-4 w-full rounded-xl"
              disabled={history.isFetchingNextPage}
              onClick={() => void history.fetchNextPage()}
            >
              {history.isFetchingNextPage && <Loader2 className="size-4 animate-spin" />}Load older
              results
            </Button>
          )}
        </>
      )}
    </section>
  );
}
