import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  LineChart,
  Line,
} from "recharts";
export function MetricChart({
  rows,
  unit,
  name,
  target,
  line = false,
}: {
  rows: { date: string; value: number }[];
  unit: string;
  name: string;
  target?: number;
  line?: boolean;
}) {
  const shared = { data: rows, margin: { top: 20, right: 15, bottom: 10, left: 0 } };
  const parts = (
    <>
      <CartesianGrid stroke="var(--border)" strokeDasharray="3 5" vertical={false} />
      <XAxis
        dataKey="date"
        axisLine={false}
        tickLine={false}
        tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
        minTickGap={30}
      />
      <YAxis
        unit={` ${unit}`}
        width={75}
        axisLine={false}
        tickLine={false}
        tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
      />
      <Tooltip
        contentStyle={{ background: "var(--card)", borderColor: "var(--border)", borderRadius: 12 }}
      />
      {target !== undefined && (
        <ReferenceLine y={target} stroke="var(--info)" strokeDasharray="4 4" label="Current goal" />
      )}
    </>
  );
  return (
    <div className="h-60 w-full" role="img" aria-label={`${name} by date, measured in ${unit}`}>
      <ResponsiveContainer width="100%" height="100%">
        {line ? (
          <LineChart {...shared}>
            {parts}
            <Line
              type="linear"
              dataKey="value"
              name={`${name} (${unit})`}
              stroke="var(--primary)"
              strokeWidth={2}
              dot={{ r: 3, fill: "var(--card)", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        ) : (
          <BarChart {...shared}>
            {parts}
            <Bar
              dataKey="value"
              name={`${name} (${unit})`}
              fill="var(--primary)"
              maxBarSize={36}
              radius={[6, 6, 0, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
