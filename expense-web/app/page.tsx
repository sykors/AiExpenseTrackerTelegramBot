import { Suspense } from "react";
import { CategoryBreakdownCard } from "@/components/dashboard/CategoryBreakdownCard";
import { DashboardFilters } from "@/components/dashboard/DashboardFilters";
import { RecentExpensesTable } from "@/components/dashboard/RecentExpensesTable";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { TrendCard } from "@/components/dashboard/TrendCard";
import { VendorLeaderboard } from "@/components/dashboard/VendorLeaderboard";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { getDashboardData } from "@/lib/dashboard-data";

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home({ searchParams }: PageProps) {
  const dateFrom =
    typeof searchParams?.date_from === "string"
      ? searchParams?.date_from
      : undefined;
  const dateTo =
    typeof searchParams?.date_to === "string"
      ? searchParams?.date_to
      : undefined;

  const dashboardData = await getDashboardData({
    dateFrom,
    dateTo,
  });

  const filterRangeLabel =
    dateFrom && dateTo
      ? `${dateFrom} → ${dateTo}`
      : dateFrom
      ? `De la ${dateFrom}`
      : dateTo
      ? `Până la ${dateTo}`
      : undefined;

  return (
    <DashboardShell>
      <div className="space-y-6">
        <Suspense fallback={<div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">Se încarcă filtrele...</div>}>
          <DashboardFilters dateFrom={dateFrom} dateTo={dateTo} />
        </Suspense>
        <CategoryBreakdownCard categories={dashboardData.categories} />

        <div className="grid gap-6 xl:grid-cols-[2fr_1fr] xl:items-stretch">
          <TrendCard
            trend={dashboardData.trend}
            summary={dashboardData.summary}
            rangeLabel={
              filterRangeLabel ??
              (dashboardData.trend.length > 1
                ? `${dashboardData.trend[0].label} → ${
                    dashboardData.trend[dashboardData.trend.length - 1].label
                  }`
                : undefined)
            }
          />
          <SummaryCards
            summary={dashboardData.summary}
            variant="stacked"
            className="h-full"
            rangeLabel={filterRangeLabel}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RecentExpensesTable expenses={dashboardData.recentExpenses} />
          </div>
          <VendorLeaderboard vendors={dashboardData.vendors} />
        </div>
      </div>
    </DashboardShell>
  );
}
