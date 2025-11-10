"use client";

import type { TrendPoint } from "@/lib/types";
import { formatDateLabel } from "@/lib/utils";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Props = {
  data: TrendPoint[];
};

const tooltipStyles =
  "rounded-2xl border border-white/10 bg-slate-900/90 px-3 py-2 text-xs text-white shadow-xl backdrop-blur";

export function ExpenseTrendChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="trend" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#34d399" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="label"
          tickFormatter={(value) => formatDateLabel(value)}
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#94a3b8", fontSize: 12 }}
        />
        <YAxis
          width={80}
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#94a3b8", fontSize: 12 }}
          tickFormatter={(value: number) =>
            new Intl.NumberFormat("ro-RO", {
              maximumFractionDigits: 0,
            }).format(value)
          }
        />
        <Tooltip
          cursor={{ stroke: "#38bdf8", strokeDasharray: 4, strokeWidth: 1 }}
          content={({ payload, label }) => {
            if (!payload?.length) {
              return null;
            }

            const entry = payload[0].payload as TrendPoint;
            return (
              <div className={tooltipStyles}>
                <p className="font-medium">{formatDateLabel(label)}</p>
                <p className="text-white/70">
                  Total: <span className="font-semibold">{entry.total.toFixed(2)}</span>
                </p>
                <p className="text-white/70">
                  Tranzacții:{" "}
                  <span className="font-semibold">{entry.count}</span>
                </p>
              </div>
            );
          }}
        />
        <Area
          type="monotone"
          dataKey="total"
          stroke="#5eead4"
          strokeWidth={2.4}
          fill="url(#trend)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
