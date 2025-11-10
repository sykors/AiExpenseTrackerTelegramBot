import type {
  CategoryBreakdown,
  DashboardData,
  ExpenseListResponse,
  ExpenseResponse,
  SummaryStats,
  TrendApiResponse,
  TrendPoint,
  VendorStats,
} from "./types";

const API_BASE =
  (process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(
    /\/$/,
    ""
  );

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(init?.headers ?? {}),
      },
    });

    if (!response.ok) {
      throw new Error(`API error ${response.status}`);
    }

    return (await response.json()) as T;
  } catch (error) {
    console.warn(`Failed to fetch ${path}:`, error);
    return null;
  }
}

const fallbackSummary: SummaryStats = {
  current_month: {
    total: 5420.5,
    count: 82,
    average: 66.1,
  },
  current_week: {
    total: 1280.4,
    count: 18,
  },
  today: {
    total: 249.9,
    count: 3,
  },
  comparison_previous_month: {
    previous_total: 4980.2,
    change_amount: 440.3,
    change_percentage: 8.8,
    trend: "up",
  },
};

const fallbackCategories: CategoryBreakdown = {
  period: "2025-01",
  grand_total: 5420.5,
  categories: [
    {
      category_id: "1",
      category_name: "Groceries",
      color: "#34d399",
      icon: "shopping-basket",
      total: 2140.22,
      count: 32,
      percentage: 39.5,
    },
    {
      category_id: "2",
      category_name: "Transport",
      color: "#60a5fa",
      icon: "bus",
      total: 940.5,
      count: 18,
      percentage: 17.3,
    },
    {
      category_id: "3",
      category_name: "Restaurant",
      color: "#f472b6",
      icon: "fork-knife",
      total: 870.0,
      count: 11,
      percentage: 16.0,
    },
    {
      category_id: "4",
      category_name: "Household",
      color: "#facc15",
      icon: "home",
      total: 620.35,
      count: 9,
      percentage: 11.4,
    },
    {
      category_id: "5",
      category_name: "Entertainment",
      color: "#c084fc",
      icon: "gamepad",
      total: 410.5,
      count: 7,
      percentage: 7.6,
    },
  ],
};

const fallbackTrend: TrendPoint[] = [
  { label: "2025-01-01", total: 120, count: 2 },
  { label: "2025-01-02", total: 220, count: 3 },
  { label: "2025-01-03", total: 180, count: 3 },
  { label: "2025-01-04", total: 340, count: 4 },
  { label: "2025-01-05", total: 210, count: 2 },
  { label: "2025-01-06", total: 260, count: 3 },
  { label: "2025-01-07", total: 190, count: 2 },
  { label: "2025-01-08", total: 320, count: 3 },
  { label: "2025-01-09", total: 280, count: 3 },
  { label: "2025-01-10", total: 410, count: 5 },
];

const fallbackVendors: VendorStats = {
  period: "2025-01",
  grand_total: 5420.5,
  top_vendors: [
    { vendor: "Linella", total: 960.2, count: 8, percentage: 17.7 },
    { vendor: "Starbucks", total: 640.5, count: 6, percentage: 11.8 },
    { vendor: "Ikea", total: 540.1, count: 3, percentage: 10.0 },
    { vendor: "Petrom", total: 420.6, count: 5, percentage: 7.8 },
    { vendor: "Mega Image", total: 390.2, count: 4, percentage: 7.1 },
  ],
};

const fallbackExpenses: ExpenseResponse[] = [
  {
    id: "1",
    owner_user_id: "user",
    source: "manual",
    amount: 249.9,
    currency: "MDL",
    vendor: "Linella",
    purchase_date: "2025-01-10",
    category_id: "1",
    ai_confidence: 0.94,
    created_at: "2025-01-10T10:21:00Z",
  },
  {
    id: "2",
    owner_user_id: "user",
    source: "photo",
    amount: 120.5,
    currency: "MDL",
    vendor: "Starbucks",
    purchase_date: "2025-01-09",
    category_id: "3",
    ai_confidence: 0.89,
    created_at: "2025-01-09T08:05:00Z",
  },
  {
    id: "3",
    owner_user_id: "user",
    source: "voice",
    amount: 540.1,
    currency: "MDL",
    vendor: "Ikea",
    purchase_date: "2025-01-08",
    category_id: "4",
    ai_confidence: 0.91,
    created_at: "2025-01-08T17:30:00Z",
  },
  {
    id: "4",
    owner_user_id: "user",
    source: "manual",
    amount: 86.4,
    currency: "MDL",
    vendor: "Petrom",
    purchase_date: "2025-01-08",
    category_id: "2",
    ai_confidence: 0.88,
    created_at: "2025-01-08T07:44:00Z",
  },
  {
    id: "5",
    owner_user_id: "user",
    source: "photo",
    amount: 410.5,
    currency: "MDL",
    vendor: "Mega Image",
    purchase_date: "2025-01-07",
    category_id: "5",
    ai_confidence: 0.9,
    created_at: "2025-01-07T12:10:00Z",
  },
];

function mapTrendResponse(trend?: TrendApiResponse | null): TrendPoint[] {
  if (!trend) {
    return fallbackTrend;
  }

  return trend.data.map((entry) => ({
    label: entry.date || entry.month || entry.week_start || "—",
    subLabel: entry.week_end,
    total: entry.total ?? 0,
    count: entry.count ?? 0,
  }));
}

function buildPath(
  base: string,
  params?: Record<string, string | number | undefined | null>
) {
  if (!params) {
    return base;
  }

  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    searchParams.append(key, String(value));
  });

  const qs = searchParams.toString();
  if (!qs) {
    return base;
  }

  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}${qs}`;
}

function extractDate(dateString?: string | null) {
  if (!dateString) return null;
  return dateString.includes("T") ? dateString.split("T")[0] : dateString;
}

function normalizeExpenses(response?: ExpenseListResponse | null) {
  if (!response?.expenses?.length) {
    return fallbackExpenses;
  }
  return response.expenses.slice(0, 5);
}

type DashboardFilters = {
  dateFrom?: string;
  dateTo?: string;
};

const DEFAULT_TREND_RANGE = 10;
const MAX_TREND_RANGE = 180;
const MIN_TREND_RANGE = 2;

function computeTrendRange(
  filters?: DashboardFilters,
  fallbackStart?: string,
  fallbackEnd?: string
) {
  const hasExplicitRange = Boolean(filters?.dateFrom || filters?.dateTo);
  const startDate = filters?.dateFrom ?? fallbackStart;
  const endDate = filters?.dateTo ?? fallbackEnd;

  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff =
      Math.floor(
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;
    if (Number.isFinite(diff) && diff > 0) {
      const clamped = Math.min(diff, MAX_TREND_RANGE);
      if (hasExplicitRange) {
        return Math.max(MIN_TREND_RANGE, clamped);
      }
      return Math.max(DEFAULT_TREND_RANGE, Math.max(MIN_TREND_RANGE, clamped));
    }
  }

  return hasExplicitRange ? MIN_TREND_RANGE : DEFAULT_TREND_RANGE;
}

export async function getDashboardData(
  filters?: DashboardFilters
): Promise<DashboardData> {
  const dateFilter = {
    date_from: filters?.dateFrom,
    date_to: filters?.dateTo,
  };

  const [recentExpensesResponse, earliestExpenseResponse] = await Promise.all([
    fetchJson<ExpenseListResponse>(
      buildPath("/api/v1/expenses", {
        limit: 5,
        sort_by: "purchase_date",
        order: "desc",
        ...dateFilter,
      })
    ),
    filters?.dateFrom || filters?.dateTo
      ? Promise.resolve(null)
      : fetchJson<ExpenseListResponse>(
          "/api/v1/expenses?limit=1&sort_by=purchase_date&order=asc"
        ),
  ]);

  const recentExpenses = normalizeExpenses(recentExpensesResponse);
  const targetDate =
    extractDate(recentExpensesResponse?.expenses?.[0]?.purchase_date) ??
    extractDate(recentExpensesResponse?.expenses?.[0]?.created_at) ??
    null;
  const earliestDate =
    filters?.dateFrom ??
    extractDate(earliestExpenseResponse?.expenses?.[0]?.purchase_date) ??
    extractDate(earliestExpenseResponse?.expenses?.[0]?.created_at) ??
    targetDate;

  const summaryParams = {
    ...(targetDate ? { target_date: targetDate } : {}),
    ...dateFilter,
  };

  const categoryParams =
    filters?.dateFrom || filters?.dateTo
      ? { ...dateFilter }
      : { period: "all" };

  const vendorParams =
    filters?.dateFrom || filters?.dateTo
      ? { ...dateFilter, limit: 5 }
      : { period: "all", limit: 5 };

  const trendRange = computeTrendRange(filters, earliestDate, filters?.dateTo ?? targetDate ?? undefined);
  const trendParams = {
    trend_type: "daily",
    range_value: trendRange,
    ...(targetDate ? { target_date: targetDate } : {}),
    ...dateFilter,
  };

  const [summary, categories, trend, vendors] = await Promise.all([
    fetchJson<SummaryStats>(
      buildPath("/api/v1/statistics/summary", summaryParams)
    ),
    fetchJson<CategoryBreakdown>(
      buildPath("/api/v1/statistics/by_category", categoryParams)
    ),
    fetchJson<TrendApiResponse>(
      buildPath("/api/v1/statistics/trend", trendParams)
    ),
    fetchJson<VendorStats>(
      buildPath("/api/v1/statistics/by_vendor", vendorParams)
    ),
  ]);

  const categoryData = categories ?? fallbackCategories;
  const categoryPeriodLabel =
    filters?.dateFrom && filters?.dateTo
      ? `${filters.dateFrom} → ${filters.dateTo}`
      : filters?.dateFrom
      ? filters.dateFrom
      : filters?.dateTo
      ? filters.dateTo
      : categoryData.period;

  const vendorData = vendors ?? fallbackVendors;
  const vendorPeriodLabel =
    filters?.dateFrom && filters?.dateTo
      ? `${filters.dateFrom} → ${filters.dateTo}`
      : filters?.dateFrom
      ? filters.dateFrom
      : filters?.dateTo
      ? filters.dateTo
      : vendorData.period;

  return {
    summary: summary ?? fallbackSummary,
    categories: { ...(categories ?? fallbackCategories), period: categoryPeriodLabel },
    trend: mapTrendResponse(trend),
    vendors: { ...(vendors ?? fallbackVendors), period: vendorPeriodLabel },
    recentExpenses,
  };
}
