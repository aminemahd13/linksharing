"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type UsageDatum = { day: string; used: number };

export function UsageChart({ data }: { data: UsageDatum[] }) {
  return (
    <div className="h-60 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="usage" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#34d399" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#34d399" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <XAxis dataKey="day" axisLine={false} tickLine={false} dy={8} />
          <YAxis allowDecimals={false} axisLine={false} tickLine={false} dx={-8} />
          <Tooltip
            cursor={{ stroke: "#34d399", strokeWidth: 1, strokeDasharray: "3 3" }}
            contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
          />
          <Area
            type="monotone"
            dataKey="used"
            stroke="#34d399"
            fillOpacity={1}
            fill="url(#usage)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
