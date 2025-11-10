import type { ComponentType } from "react";
import type { SummaryStats } from "@/lib/types";
import { formatCurrency, getTrendColor } from "@/lib/utils";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Clock3,
  Timer,
} from "lucide-react";

const icons = {
  month: CalendarDays,
  week: Clock3,
  today: Timer,
};

type SummaryCardsProps = {
  summary: SummaryStats;
  variant?: "default" | "stacked";
  className?: string;
  rangeLabel?: string;
};

export function SummaryCards({
  summary,
  variant = "default",
  className = "",
  rangeLabel,
}: SummaryCardsProps) {
  const cards = [
    {
      key: "month",
      title: "Luna curentă",
      value: formatCurrency(summary.current_month.total),
      subLabel: `${summary.current_month.count} tranzacții`,
      accent: "from-emerald-400/20 to-cyan-400/20",
    },
    {
      key: "week",
      title: "Săptămâna curentă",
      value: formatCurrency(summary.current_week.total),
      subLabel: `${summary.current_week.count} tranzacții`,
      accent: "from-indigo-400/20 to-blue-400/20",
    },
    {
      key: "today",
      title: "Astăzi",
      value: formatCurrency(summary.today.total),
      subLabel: `${summary.today.count} tranzacții`,
      accent: "from-pink-400/20 to-rose-400/20",
    },
  ] as const;

  const IconMonth = icons.month;
  const IconWeek = icons.week;
  const IconToday = icons.today;
  const iconMap: Record<string, ComponentType<{ className?: string }>> = {
    month: IconMonth,
    week: IconWeek,
    today: IconToday,
  };

  const gridClasses =
    variant === "stacked"
      ? "grid gap-4"
      : "grid gap-4 md:grid-cols-2 xl:grid-cols-3";

  const comparisonClasses =
    variant === "stacked"
      ? "rounded-3xl border border-white/10 bg-gradient-to-r from-emerald-500/30 via-emerald-400/10 to-transparent p-5 text-sm text-white/80"
      : "col-span-full rounded-3xl border border-white/10 bg-gradient-to-r from-emerald-500/30 via-emerald-400/10 to-transparent p-5 text-sm text-white/80 md:col-span-2 xl:col-span-1";

  return (
    <section className={`${gridClasses} ${className}`}>
      {cards.map((card) => {
        const Icon = iconMap[card.key];
        return (
          <div
            key={card.key}
            className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-5 text-white shadow-[0_0_30px_rgba(15,23,42,0.35)] transition hover:border-white/30"
          >
            <div
              className={`absolute inset-0 -z-10 bg-gradient-to-br ${card.accent} opacity-60 blur-3xl transition group-hover:opacity-80`}
            />
            <div className="mb-6 flex items-center justify-between gap-2 text-sm uppercase tracking-[0.35em] text-white/60">
              <span>{card.title}</span>
              <Icon className="h-4 w-4 text-white/70" />
            </div>
            <p className="text-3xl font-semibold text-white">{card.value}</p>
            <p className="mt-1 text-sm text-white/60">{card.subLabel}</p>
          </div>
        );
      })}

      <div className={comparisonClasses}>
        <p className="text-xs uppercase tracking-[0.35em] text-white/60">
          Trend lunar
        </p>
        <div className="mt-4 flex items-baseline gap-2">
          <p className="text-3xl font-semibold text-white">
            {summary.comparison_previous_month.change_percentage.toFixed(1)}%
          </p>
          {summary.comparison_previous_month.trend === "up" ? (
            <ArrowUpRight className="h-5 w-5 text-emerald-300" />
          ) : summary.comparison_previous_month.trend === "down" ? (
            <ArrowDownRight className="h-5 w-5 text-rose-300" />
          ) : null}
        </div>
        <p className="mt-2 text-xs uppercase tracking-[0.25em] text-white/50">
          vs luna precedentă
        </p>
        <p className={`mt-3 text-sm ${getTrendColor(summary.comparison_previous_month.trend)}`}>
          {formatCurrency(summary.comparison_previous_month.change_amount)} față
          de {formatCurrency(summary.comparison_previous_month.previous_total)}
        </p>
      </div>
      {rangeLabel && (
        <p className="col-span-full text-xs uppercase tracking-[0.25em] text-white/50">
          Interval selectat: {rangeLabel}
        </p>
      )}
    </section>
  );
}
