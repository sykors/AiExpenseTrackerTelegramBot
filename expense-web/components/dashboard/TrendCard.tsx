import type { SummaryStats, TrendPoint } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Activity } from "lucide-react";
import { ExpenseTrendChart } from "../charts/ExpenseTrendChart";

type Props = {
  trend: TrendPoint[];
  summary: SummaryStats;
  rangeLabel?: string;
};

export function TrendCard({ trend, summary, rangeLabel }: Props) {
  const totalInPeriod = trend.reduce((sum, entry) => sum + entry.total, 0);
  const averageInPeriod =
    trend.length > 0 ? totalInPeriod / trend.length : 0;
  const peakDay = [...trend].sort((a, b) => b.total - a.total)[0];
  const subtitle = rangeLabel
    ? `Interval: ${rangeLabel}`
    : `Ultimele ${Math.max(trend.length, 1)} zile • ${formatCurrency(totalInPeriod || summary.current_month.total)}`;

  return (
    <section className="flex h-full flex-col rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_0_30px_rgba(15,23,42,0.45)]">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-white/50">
            Evoluție zilnică
          </p>
          <p className="text-sm text-white/70">{subtitle}</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-xs text-white/70">
          <Activity className="h-3.5 w-3.5 text-emerald-300" />
          Live sync
        </span>
      </div>
      <div className="flex-1 min-h-[300px]">
        <ExpenseTrendChart data={trend} />
      </div>
      {peakDay && (
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-white/70">
          <p>
            <span className="text-white">Zi cu consum maxim:</span>{" "}
            {peakDay.label} ({formatCurrency(peakDay.total)})
          </p>
          <p>
            <span className="text-white">Media zilnică:</span>{" "}
            {formatCurrency(averageInPeriod)}
          </p>
        </div>
      )}
    </section>
  );
}
