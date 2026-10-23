import { useId } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { Activity } from "lucide-react";
import { EmptyState } from "@/components/common";
import { weightToDisplay } from "@/lib/measurements";
import { useDisplayDate } from "@/hooks/use-display-date";
export function WeightChart({
  rows,
  target,
  unit = "kg",
}: {
  rows: { measured_at: string; weight_kg: number }[];
  target?: number;
  unit?: string;
}) {
  const display = useDisplayDate();
  const gradientId = useId();
  if (!rows.length)
    return (
      <EmptyState
        icon={Activity}
        title="Your trend starts with a weigh-in"
        body="Only recorded measurements will appear here."
      />
    );
  return (
    <div
      className="h-64 w-full"
      role="img"
      aria-label={`Recorded body weight in ${unit} over time`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={rows.map((r) => ({
            timestamp: new Date(r.measured_at).getTime(),
            weight: weightToDisplay(r.weight_kg, unit),
          }))}
          margin={{ top: 15, right: 15, bottom: 15, left: 0 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.2} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 5" vertical={false} />
          <XAxis
            dataKey="timestamp"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(t) => display(new Date(Number(t)).toISOString())}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            minTickGap={40}
          />
          <YAxis
            domain={["auto", "auto"]}
            unit={` ${unit}`}
            width={75}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          />
          <Tooltip
            labelFormatter={(t) => display(new Date(Number(t)).toISOString())}
            contentStyle={{
              background: "var(--card)",
              borderColor: "var(--border)",
              borderRadius: 12,
            }}
          />
          {target !== undefined && (
            <ReferenceLine
              y={weightToDisplay(target, unit)}
              stroke="var(--info)"
              strokeDasharray="4 4"
              label="Target"
            />
          )}
          <Area
            dataKey="weight"
            type="linear"
            fill={`url(#${gradientId})`}
            stroke="none"
            isAnimationActive={false}
            tooltipType="none"
          />
          <Line
            type="linear"
            dataKey="weight"
            name={`Weight (${unit})`}
            stroke="var(--primary)"
            strokeWidth={3}
            dot={{ r: 3, fill: "var(--card)", strokeWidth: 2 }}
            activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 3 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
