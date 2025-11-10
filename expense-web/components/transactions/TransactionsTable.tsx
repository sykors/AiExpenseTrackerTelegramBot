"use client";

import { useMemo, useState } from "react";
import type { CategoryResponse, ExpenseResponse } from "@/lib/types";
import { formatCurrency, formatFullDate } from "@/lib/utils";
import { PUBLIC_API_BASE } from "@/lib/api";
import {
  Check,
  Bell,
  CirclePlus,
  Eye,
  Funnel,
  Loader2,
  Pencil,
  ReceiptText,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { TransactionDetailsDialog } from "./TransactionDetailsDialog";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const levenshteinDistance = (a: string, b: string) => {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matrix = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0)
  );

  for (let i = 0; i <= a.length; i += 1) {
    matrix[i][0] = i;
  }
  for (let j = 0; j <= b.length; j += 1) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
};

const fuzzyMatch = (input: string, query: string) => {
  if (!query) return true;
  if (!input) return false;

  const normalizedInput = normalizeText(input);
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) return true;
  if (normalizedInput.includes(normalizedQuery)) return true;

  const distance = levenshteinDistance(
    normalizedInput,
    normalizedQuery
  );
  const tolerance = Math.max(
    1,
    Math.floor(normalizedQuery.length * 0.35)
  );

  return distance <= tolerance;
};

const sourceLabels: Record<
  string,
  { label: string; className: string }
> = {
  manual: { label: "Manual", className: "bg-purple-500/20 text-purple-200" },
  photo: { label: "Foto", className: "bg-emerald-500/20 text-emerald-200" },
  voice: { label: "Voce", className: "bg-blue-500/20 text-blue-200" },
};

type Props = {
  expenses: ExpenseResponse[];
  categories: CategoryResponse[];
};

type FilterState = {
  dateFrom: string;
  dateTo: string;
  categories: string[];
  minAmount: string;
  maxAmount: string;
};

type StatusState = { type: "idle" | "success" | "error"; message?: string };

const sortExpenses = (list: ExpenseResponse[]) =>
  [...list].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

export function TransactionsTable({ expenses, categories }: Props) {
  const [rows, setRows] = useState(() => sortExpenses(expenses));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ExpenseResponse | null>(null);
  const [detailTarget, setDetailTarget] = useState<ExpenseResponse | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formValues, setFormValues] = useState<{
    vendor: string;
    category_id: string;
    amount: string;
  }>({ vendor: "", category_id: "", amount: "" });
  const [status, setStatus] = useState<StatusState>({ type: "idle" });
  const [isSaving, setIsSaving] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    dateFrom: "",
    dateTo: "",
    categories: [],
    minAmount: "",
    maxAmount: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [chartOpen, setChartOpen] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);

  const categoryMap = useMemo(() => {
    const map: Record<string, CategoryResponse> = {};
    categories.forEach((cat) => {
      map[cat.id] = cat;
    });
    return map;
  }, [categories]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.dateFrom || filters.dateTo) count += 1;
    if (filters.categories.length) count += 1;
    if (filters.minAmount || filters.maxAmount) count += 1;
    return count;
  }, [filters]);

  const startEdit = (expense: ExpenseResponse) => {
    setEditingId(expense.id);
    setStatus({ type: "idle" });
    const fallbackCategoryId =
      expense.category_id ||
      categories.find(
        (cat) =>
          expense.category_name &&
          cat.name.toLowerCase() ===
            expense.category_name.toLowerCase()
      )?.id ||
      "";
    setFormValues({
      vendor: expense.vendor || "",
      category_id: fallbackCategoryId,
      amount: String(expense.amount ?? ""),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setStatus({ type: "idle" });
  };

  const handleInputChange = (
    field: keyof typeof formValues,
    value: string
  ) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  };

  const normalizeExpense = (expense: ExpenseResponse): ExpenseResponse => ({
    ...expense,
    vendor: expense.vendor ?? expense.decrypted_vendor ?? "Fără denumire",
  });

  const filteredRows = useMemo(() => {
    const query = searchTerm.trim();
    if (!query) {
      return rows;
    }
    return rows.filter((expense) => {
      const vendor =
        expense.vendor ||
        expense.decrypted_vendor ||
        "Fără denumire";
      const category = expense.category_name || "Fără categorie";
      return (
        fuzzyMatch(vendor, query) ||
        fuzzyMatch(category, query)
      );
    });
  }, [rows, searchTerm]);

  const chartData = useMemo(() => {
    const map = new Map<string, number>();
    filteredRows.forEach((expense) => {
      const key =
        expense.purchase_date ||
        (expense.created_at
          ? expense.created_at.slice(0, 10)
          : "Necunoscut");
      const amount = Number(expense.amount) || 0;
      map.set(key, (map.get(key) || 0) + amount);
    });
    return Array.from(map.entries())
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredRows]);

  const categoryChartData = useMemo(() => {
    const map = new Map<string, number>();
    filteredRows.forEach((expense) => {
      const key = expense.category_name || "Fără categorie";
      const amount = Number(expense.amount) || 0;
      map.set(key, (map.get(key) || 0) + amount);
    });

    return Array.from(map.entries())
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);
  }, [filteredRows]);

  const cumulativeChartData = useMemo(() => {
    let running = 0;
    return chartData.map((entry) => {
      running += entry.total;
      return { ...entry, cumulative: running };
    });
  }, [chartData]);

  const vendorChartData = useMemo(() => {
    const map = new Map<string, number>();
    filteredRows.forEach((expense) => {
      const key =
        expense.vendor ||
        expense.decrypted_vendor ||
        "Fără denumire";
      const amount = Number(expense.amount) || 0;
      map.set(key, (map.get(key) || 0) + amount);
    });

    return Array.from(map.entries())
      .map(([vendor, total]) => ({ vendor, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [filteredRows]);

  const handleExpenseCreated = (expense: ExpenseResponse) => {
    setRows((prev) =>
      sortExpenses([normalizeExpense(expense), ...prev])
    );
    setStatus({
      type: "success",
      message: "Tranzacția a fost adăugată.",
    });
  };

  const saveChanges = async () => {
    if (!editingId) return;
    setIsSaving(true);
    setStatus({ type: "idle" });

    try {
      const payload: Record<string, unknown> = {};

      if (formValues.vendor.trim().length === 0) {
        throw new Error("Denumirea nu poate fi goală.");
      }

      payload.vendor = formValues.vendor.trim();

      if (formValues.amount.trim().length === 0) {
        throw new Error("Completează suma.");
      }

      const parsedAmount = parseFloat(
        formValues.amount.replace(",", ".")
      );
      if (Number.isNaN(parsedAmount)) {
        throw new Error("Suma nu este un număr valid.");
      }
      payload.amount = parsedAmount;

      if (formValues.category_id) {
        payload.category_id = formValues.category_id;
      } else {
        payload.category_id = null;
      }

      const response = await fetch(
        `${PUBLIC_API_BASE}/api/v1/expenses/${editingId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const detail = await response.json().catch(() => ({}));
        throw new Error(
          detail?.detail || "Nu am putut salva modificările."
        );
      }

      const updated = normalizeExpense(
        (await response.json()) as ExpenseResponse
      );

      setRows((prev) =>
        sortExpenses(
          prev.map((row) =>
            row.id === updated.id ? updated : row
          )
        )
      );

      setStatus({
        type: "success",
        message: "Tranzacția a fost actualizată.",
      });
      setEditingId(null);
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "A apărut o eroare neprevăzută.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const renderSourceBadge = (source: string) => {
    const lookup = sourceLabels[source] || {
      label: source,
      className: "bg-white/10 text-white",
    };

    return (
      <span
        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${lookup.className}`}
      >
        {lookup.label}
      </span>
    );
  };

  const fetchWithFilters = async (customFilters?: FilterState) => {
    const applied = customFilters ?? filters;
    const params = new URLSearchParams({
      limit: "200",
      sort_by: "purchase_date",
      order: "desc",
    });

    if (applied.dateFrom) params.append("date_from", applied.dateFrom);
    if (applied.dateTo) params.append("date_to", applied.dateTo);
    if (applied.categories.length) {
      applied.categories.forEach((cat) => params.append("category_id", cat));
    }
    if (applied.minAmount) params.append("min_amount", applied.minAmount);
    if (applied.maxAmount) params.append("max_amount", applied.maxAmount);

    setIsFiltering(true);
    try {
      const response = await fetch(
        `${PUBLIC_API_BASE}/api/v1/expenses?${params.toString()}`
      );
      if (!response.ok) {
        throw new Error("Nu am putut aplica filtrele.");
      }
      const payload = (await response.json()) as {
        expenses: ExpenseResponse[];
      };
      setRows(
        sortExpenses(
          (payload.expenses || []).map(normalizeExpense)
        )
      );
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Filtrele nu au putut fi aplicate.",
      });
    } finally {
      setIsFiltering(false);
    }
  };

  const handleExportCsv = () => {
    const headers = [
      "ID",
      "Vendor",
      "Categorie",
      "Sumă",
      "Monedă",
      "Dată",
      "Sursă",
    ];
    const csvRows = filteredRows.map((expense) => [
      expense.id,
      (expense.vendor || expense.decrypted_vendor || "Fără denumire").replace(
        /"/g,
        '""'
      ),
      (expense.category_name || "Fără categorie").replace(/"/g, '""'),
      Number(expense.amount ?? 0).toFixed(2),
      expense.currency || "MDL",
      expense.purchase_date || expense.created_at.slice(0, 10),
      expense.source,
    ]);

    const csvContent = [headers, ...csvRows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `expense_export_${new Date().toISOString()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_0_30px_rgba(15,23,42,0.35)]">
      <div className="mb-6 flex flex-wrap gap-4">
        <div className="flex-1">
          <p className="text-xs uppercase tracking-[0.35em] text-white/50">
            Tranzacții
          </p>
          <p className="text-sm text-white/70">
            {rows.length} tranzacții înregistrate
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row lg:items-center">
          <div className="flex flex-1 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/60 lg:w-72">
            <Search className="h-4 w-4" aria-hidden="true" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Caută vendori sau categorii..."
              className="flex-1 bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
              type="search"
            />
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:border-white/30 hover:bg-white/10"
            type="button"
            onClick={() => setShowFilters(true)}
          >
            <Funnel className="h-4 w-4" />
            Filtre
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-xs font-semibold text-emerald-200">
                {activeFilterCount}
              </span>
            )}
          </button>
          <button
            className="relative rounded-2xl border border-white/10 bg-white/5 p-2 text-white transition hover:border-emerald-300/40 hover:bg-emerald-400/10"
            type="button"
            title="Notificări disponibile în curând"
            disabled
          >
            <Bell className="h-4 w-4" aria-hidden="true" />
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-emerald-400" />
          </button>
        </div>
      </div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-white/60">
          <span>
            {searchTerm
              ? `${filteredRows.length} rezultate pentru „${searchTerm}”`
              : `${filteredRows.length} rezultate`}{" "}
            {isFiltering && (
              <span className="text-emerald-300">• se aplică filtre...</span>
            )}
          </span>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="text-xs uppercase tracking-[0.3em] text-emerald-300 hover:text-emerald-200"
            >
              Curăță
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          {status.type !== "idle" && (
            <span
              className={`text-sm ${
                status.type === "success"
                  ? "text-emerald-300"
                  : "text-rose-300"
              }`}
            >
              {status.message}
            </span>
          )}
          <AddTransactionDialog
            categories={categories}
            onCreated={handleExpenseCreated}
            onStatus={setStatus}
          />
        </div>
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setChartOpen(true)}
          className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-white transition hover:border-emerald-400/60 hover:text-emerald-200"
        >
          Creează diagramă
        </button>
        <button
          type="button"
          onClick={handleExportCsv}
          className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-white transition hover:border-emerald-400/60 hover:text-emerald-200"
        >
          Exportă CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-white/80">
          <thead>
            <tr className="text-xs uppercase tracking-[0.25em] text-white/40">
              <th className="pb-3 font-medium">Denumire</th>
              <th className="pb-3 font-medium">Categorie</th>
              <th className="pb-3 font-medium">Tip introducere</th>
              <th className="pb-3 font-medium">Dată introdusă</th>
              <th className="pb-3 font-medium text-right">Sumă</th>
              <th className="pb-3 font-medium text-right">Acțiuni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredRows.map((expense) => {
              const isEditing = editingId === expense.id;
              const category =
                (expense.category_id &&
                  categoryMap[expense.category_id]) ||
                null;

              return (
                <tr key={expense.id} className="align-middle">
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
                        <ReceiptText className="h-4 w-4 text-emerald-300" />
                      </div>
                      <div className="space-y-1">
                        {isEditing ? (
                          <input
                            className="rounded-xl border border-white/10 bg-transparent px-3 py-2 text-sm text-white focus:border-emerald-300/60 focus:outline-none"
                            value={formValues.vendor}
                            onChange={(event) =>
                              handleInputChange(
                                "vendor",
                                event.target.value
                              )
                            }
                          />
                        ) : (
                          <p className="font-medium text-white">
                            {expense.vendor || "Fără denumire"}
                          </p>
                        )}
                        <p className="text-xs text-white/50">
                          ID: {expense.id.slice(0, 8)}…
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4">
                    {isEditing ? (
                      <select
                        className="w-48 rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2 text-sm text-white focus:border-emerald-300/60 focus:outline-none"
                        value={formValues.category_id}
                        onChange={(event) =>
                          handleInputChange(
                            "category_id",
                            event.target.value
                          )
                        }
                      >
                        <option value="">Fără categorie</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-white">
                    {expense.category_name ||
                      category?.name ||
                      "Fără categorie"}
                  </p>
                )}
              </td>
                  <td className="py-4">{renderSourceBadge(expense.source)}</td>
                  <td className="py-4 text-white/70">
                    {formatFullDate(expense.created_at)}
                  </td>
                  <td className="py-4 text-right">
                    {isEditing ? (
                      <input
                        type="text"
                        className="w-32 rounded-xl border border-white/10 bg-transparent px-3 py-2 text-right text-sm text-white focus:border-emerald-300/60 focus:outline-none"
                        value={formValues.amount}
                        onChange={(event) =>
                          handleInputChange("amount", event.target.value)
                        }
                      />
                    ) : (
                      <span className="font-semibold text-white">
                        {formatCurrency(expense.amount, expense.currency || "MDL")}
                      </span>
                    )}
                  </td>
                  <td className="py-4 text-right">
                    {isEditing ? (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={cancelEdit}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white hover:border-white/40"
                          title="Anulează"
                          disabled={isSaving}
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <button
                          onClick={saveChanges}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-400/80 text-slate-900 transition hover:bg-emerald-300"
                          title="Salvează"
                          disabled={isSaving}
                        >
                          {isSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setDetailTarget(expense)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white transition hover:border-white/40"
                          title="Vezi detalii"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => startEdit(expense)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white transition hover:border-white/40"
                          title="Editează"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(expense)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white transition hover:border-rose-400/60 hover:text-rose-200"
                          title="Șterge"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <DeleteExpenseDialog
        expense={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={(id) => {
          setRows((prev) => prev.filter((row) => row.id !== id));
          setStatus({
            type: "success",
            message: "Tranzacția a fost ștearsă.",
          });
        }}
        onError={(message) =>
          setStatus({
            type: "error",
            message,
          })
        }
      />
      <TransactionDetailsDialog
        expense={detailTarget}
        onClose={() => setDetailTarget(null)}
      />
      <FiltersDrawer
        open={showFilters}
        filters={filters}
        categories={categories}
        onChange={setFilters}
        onApply={() => {
          setShowFilters(false);
          fetchWithFilters();
        }}
        onReset={() => {
          const resetFilters: FilterState = {
            dateFrom: "",
            dateTo: "",
            categories: [],
            minAmount: "",
            maxAmount: "",
          };
          setFilters(resetFilters);
          setShowFilters(false);
          fetchWithFilters(resetFilters);
        }}
        onClose={() => setShowFilters(false)}
      />
      <ChartDialog
        open={chartOpen}
        dailyData={chartData}
        cumulativeData={cumulativeChartData}
        categoryData={categoryChartData}
        vendorData={vendorChartData}
        onClose={() => setChartOpen(false)}
      />
    </section>
  );
}

type AddTransactionDialogProps = {
  categories: CategoryResponse[];
  onCreated: (expense: ExpenseResponse) => void;
  onStatus: (state: StatusState) => void;
};

type PreviewItem = {
  name?: string;
  qty?: number | string;
  price?: number | string;
  total?: number | string;
};

type ExpensePreviewData = {
  amount?: number;
  currency?: string;
  vendor?: string;
  purchase_date?: string;
  category?: string;
  notes?: string;
  items?: PreviewItem[];
};

function AddTransactionDialog({
  categories,
  onCreated,
  onStatus,
}: AddTransactionDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"input" | "preview">("input");
  const [textValue, setTextValue] = useState("");
  const [preview, setPreview] = useState<ExpensePreviewData | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetState = () => {
    setStep("input");
    setTextValue("");
    setPreview(null);
    setSelectedCategoryId("");
    setError(null);
    setLoading(false);
  };

  const openDialog = () => {
    resetState();
    setOpen(true);
  };

  const closeDialog = () => {
    resetState();
    setOpen(false);
  };

  const requestPreview = async () => {
    if (textValue.trim().length < 5) {
      setError("Descrie cheltuiala în câteva cuvinte.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${PUBLIC_API_BASE}/api/v1/expenses/manual/preview`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ text: textValue }),
        }
      );

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.detail || "Nu am putut genera previzualizarea.");
      }

      const data = (result?.data || {}) as ExpensePreviewData;
      setPreview(data);
      const suggestedCategory =
        categories.find(
          (cat) =>
            data?.category &&
            cat.name.toLowerCase() === data.category.toLowerCase()
        )?.id || "";
      setSelectedCategoryId(suggestedCategory);
      setStep("preview");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "A apărut o eroare în timpul generării."
      );
    } finally {
      setLoading(false);
    }
  };

  const confirmExpense = async () => {
    if (!preview) return;
    setLoading(true);
    setError(null);
    try {
      const categoryName =
        (selectedCategoryId &&
          categories.find((cat) => cat.id === selectedCategoryId)?.name) ||
        preview.category;

      const payload = {
        source: "manual",
        parsed_data: {
          ...preview,
          category: categoryName,
        },
      };

      const response = await fetch(
        `${PUBLIC_API_BASE}/api/v1/expenses/manual/confirm`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const detail = (await response.json()) as ExpenseResponse;
      if (!response.ok) {
        throw new Error(
          (detail as unknown as { detail?: string })?.detail ||
            "Nu am putut salva cheltuiala."
        );
      }

      const normalized = {
        ...detail,
        vendor: detail.vendor ?? detail.decrypted_vendor ?? "Fără denumire",
      };

      onCreated(normalized);
      closeDialog();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "A apărut o eroare la salvare.";
      setError(message);
      onStatus({ type: "error", message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={openDialog}
        className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:opacity-90"
      >
        <CirclePlus className="h-4 w-4" />
        Adaugă tranzacție
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur">
          <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-slate-900/90 p-6 text-white shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-white/50">
                  Adaugă tranzacție
                </p>
                <h2 className="text-lg font-semibold text-white">
                  Descrie cheltuiala și lasă AI-ul să o structureze
                </h2>
              </div>
              <button
                onClick={closeDialog}
                className="rounded-full border border-white/10 p-2 text-white hover:border-white/40"
                title="Închide"
                disabled={loading}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {step === "input" && (
              <div className="space-y-4">
                <textarea
                  className="min-h-[140px] w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-emerald-300/60 focus:outline-none"
                  placeholder="Ex: Am cumpărat 2 burgeri și 2 cafele de la McDonalds cu 350 MDL azi."
                  value={textValue}
                  onChange={(event) => setTextValue(event.target.value)}
                  disabled={loading}
                />
                {error && (
                  <p className="text-sm text-rose-300">{error}</p>
                )}
                <div className="flex justify-end gap-3">
                  <button
                    onClick={closeDialog}
                    className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-white hover:border-white/40"
                    disabled={loading}
                  >
                    Renunță
                  </button>
                  <button
                    onClick={requestPreview}
                    className="rounded-2xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-emerald-300 disabled:opacity-60"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generez...
                      </span>
                    ) : (
                      "Generează cu AI"
                    )}
                  </button>
                </div>
              </div>
            )}

            {step === "preview" && preview && (
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <PreviewTile
                    label="Denumire"
                    value={preview.vendor || "—"}
                  />
                  <PreviewTile
                    label="Sumă"
                    value={formatCurrency(
                      preview.amount ?? 0,
                      preview.currency || "MDL"
                    )}
                  />
                  <PreviewTile
                    label="Data"
                    value={formatFullDate(preview.purchase_date)}
                  />
                  <PreviewTile
                    label="Categorie sugerată"
                    value={preview.category || "Fără categorisire"}
                  />
                </div>

                <div>
                  <label className="text-xs uppercase tracking-[0.3em] text-white/50">
                    Confirmă categoria
                  </label>
                  <select
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/40 px-4 py-2 text-sm text-white focus:border-emerald-300/60 focus:outline-none"
                    value={selectedCategoryId}
                    onChange={(event) =>
                      setSelectedCategoryId(event.target.value)
                    }
                    disabled={loading}
                  >
                    <option value="">Fără categorie</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {preview.notes && (
                  <PreviewTile label="Notițe" value={preview.notes} />
                )}

                {preview.items && preview.items.length > 0 && (
                  <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-white/50">
                      Articole identificate
                    </p>
                    <ul className="mt-2 space-y-1 text-sm text-white/80">
                      {preview.items.map((item, index) => (
                        <li key={index}>
                          {item.name || "Produs"} — {item.qty || 1} x{" "}
                          {formatCurrency(
                            Number(item.price) || 0,
                            preview.currency || "MDL"
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {error && (
                  <p className="text-sm text-rose-300">{error}</p>
                )}

                <div className="flex flex-wrap justify-end gap-3">
                  <button
                    onClick={() => setStep("input")}
                    className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-white hover:border-white/40"
                    disabled={loading}
                  >
                    Modifică textul
                  </button>
                  <button
                    onClick={confirmExpense}
                    className="rounded-2xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-emerald-300 disabled:opacity-60"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Se salvează...
                      </span>
                    ) : (
                      "Confirmă și salvează"
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

type PreviewTileProps = {
  label: string;
  value?: string;
};

function PreviewTile({ label, value }: PreviewTileProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
      <p className="text-xs uppercase tracking-[0.3em] text-white/50">
        {label}
      </p>
      <p className="mt-2 font-medium text-white">{value || "—"}</p>
    </div>
  );
}

type DeleteExpenseDialogProps = {
  expense: ExpenseResponse | null;
  onClose: () => void;
  onDeleted: (id: string) => void;
  onError: (message: string) => void;
};

function DeleteExpenseDialog({
  expense,
  onClose,
  onDeleted,
  onError,
}: DeleteExpenseDialogProps) {
  const [loading, setLoading] = useState(false);

  if (!expense) {
    return null;
  }

  const handleDelete = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${PUBLIC_API_BASE}/api/v1/expenses/${expense.id}`,
        { method: "DELETE" }
      );
      if (!response.ok) {
        const detail = await response.json().catch(() => ({}));
        throw new Error(detail?.detail || "Nu am putut șterge tranzacția.");
      }
      onDeleted(expense.id);
      onClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "A apărut o eroare la ștergere.";
      onError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/90 p-6 text-white shadow-2xl">
        <div className="mb-4">
          <p className="text-xs uppercase tracking-[0.35em] text-white/50">
            Confirmare ștergere
          </p>
          <h2 className="text-lg font-semibold text-white">
            Sigur vrei să ștergi această tranzacție?
          </h2>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4 text-sm text-white/80">
          <p className="font-semibold text-white">
            {expense.vendor || "Fără denumire"}
          </p>
          <p>ID: {expense.id.slice(0, 12)}…</p>
          <p>Sumă: {formatCurrency(expense.amount, expense.currency || "MDL")}</p>
          <p>Categorie: {expense.category_name || "Fără categorie"}</p>
        </div>
        <p className="mt-4 text-sm text-white/70">
          Această acțiune este definitivă. Tranzacția va fi eliminată din baza de
          date și din statistici.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-white hover:border-white/40"
            disabled={loading}
          >
            Renunță
          </button>
          <button
            onClick={handleDelete}
            className="rounded-2xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-400 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Se șterge...
              </span>
            ) : (
              "Da, șterge"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

type FiltersDrawerProps = {
  open: boolean;
  filters: FilterState;
  categories: CategoryResponse[];
  onChange: (state: FilterState) => void;
  onApply: () => void;
  onReset: () => void;
  onClose: () => void;
};

function FiltersDrawer({
  open,
  filters,
  categories,
  onChange,
  onApply,
  onReset,
  onClose,
}: FiltersDrawerProps) {
  if (!open) {
    return null;
  }

  const toggleCategory = (categoryId: string) => {
    onChange({
      ...filters,
      categories: filters.categories.includes(categoryId)
        ? filters.categories.filter((id) => id !== categoryId)
        : [...filters.categories, categoryId],
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-6 backdrop-blur">
      <div className="w-full max-w-3xl rounded-3xl border border-white/10 bg-slate-900/95 p-6 text-white shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/50">
              Filtrează tranzacții
            </p>
            <h2 className="text-2xl font-semibold text-white">
              Ajustează perioada, categoriile și sumele
            </h2>
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white transition hover:border-white/40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">
              Perioadă
            </p>
            <label className="space-y-1 text-sm">
              <span className="text-white/60">De la</span>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(event) =>
                  onChange({ ...filters, dateFrom: event.target.value })
                }
                className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-white focus:border-emerald-300/60 focus:outline-none"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-white/60">Până la</span>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(event) =>
                  onChange({ ...filters, dateTo: event.target.value })
                }
                className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-white focus:border-emerald-300/60 focus:outline-none"
              />
            </label>
          </div>

          <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">
              Sume
            </p>
            <label className="space-y-1 text-sm">
              <span className="text-white/60">Sumă minimă</span>
              <input
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={filters.minAmount}
                onChange={(event) =>
                  onChange({ ...filters, minAmount: event.target.value })
                }
                className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-white focus:border-emerald-300/60 focus:outline-none"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-white/60">Sumă maximă</span>
              <input
                type="number"
                inputMode="decimal"
                placeholder="Nelimitat"
                value={filters.maxAmount}
                onChange={(event) =>
                  onChange({ ...filters, maxAmount: event.target.value })
                }
                className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-white focus:border-emerald-300/60 focus:outline-none"
              />
            </label>
          </div>
        </div>

        <div className="mt-6 space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">
            Categorii
          </p>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => toggleCategory(category.id)}
                className={`rounded-full px-4 py-2 text-sm transition ${
                  filters.categories.includes(category.id)
                    ? "bg-emerald-400/90 text-slate-900"
                    : "border border-white/10 text-white hover:border-white/40"
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-between gap-3">
          <button
            onClick={onReset}
            className="text-sm text-white/60 underline-offset-2 hover:text-white"
            type="button"
          >
            Curăță filtrele
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-white hover:border-white/40"
              type="button"
            >
              Închide
            </button>
            <button
              onClick={onApply}
              className="rounded-2xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-emerald-300"
              type="button"
            >
              Aplică filtrele
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type ChartDialogProps = {
  open: boolean;
  dailyData: Array<{ date: string; total: number }>;
  categoryData: Array<{ category: string; total: number }>;
  cumulativeData: Array<{ date: string; total: number; cumulative: number }>;
  vendorData: Array<{ vendor: string; total: number }>;
  onClose: () => void;
};

function ChartDialog({
  open,
  dailyData,
  categoryData,
  cumulativeData,
  vendorData,
  onClose,
}: ChartDialogProps) {
  const [view, setView] = useState<
    "daily" | "categories" | "cumulative" | "vendors"
  >("daily");

  if (!open) {
    return null;
  }

  const hasData =
    (view === "daily"
      ? dailyData.length
      : view === "categories"
      ? categoryData.length
      : view === "cumulative"
      ? cumulativeData.length
      : vendorData.length) > 0;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 px-4 py-6 backdrop-blur">
      <div className="w-full max-w-4xl rounded-3xl border border-white/10 bg-slate-900/95 p-6 text-white shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <p className="text-xs uppercase tracking-[0.35em] text-white/50">
                Vizualizări rapide
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "daily", label: "Zilnic" },
                  { id: "cumulative", label: "Cumulativ" },
                  { id: "categories", label: "Categorii" },
                  { id: "vendors", label: "Vendori" },
                ].map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() =>
                      setView(option.id as typeof view)
                    }
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      view === option.id
                        ? "bg-emerald-400 text-slate-900"
                        : "border border-white/10 text-white/70"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <h2 className="text-2xl font-semibold text-white">
              {view === "daily"
                ? "Evoluție zilnică"
                : view === "cumulative"
                ? "Sumă cumulativă"
                : view === "categories"
                ? "Top categorii"
                : "Top vendori"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white transition hover:border-white/40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {hasData ? (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {view === "daily" && (
                <AreaChart data={dailyData}>
                  <defs>
                    <linearGradient id="transactionsTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34d399" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    stroke="#94a3b8"
                    tick={{ fontSize: 12, fill: "#94a3b8" }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    tick={{ fontSize: 12, fill: "#94a3b8" }}
                    width={80}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15,23,42,0.9)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                      color: "#fff",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#34d399"
                    fillOpacity={1}
                    fill="url(#transactionsTrend)"
                  />
                </AreaChart>
              )}
              {view === "cumulative" && (
                <LineChart data={cumulativeData}>
                  <XAxis
                    dataKey="date"
                    stroke="#94a3b8"
                    tick={{ fontSize: 12, fill: "#94a3b8" }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    tick={{ fontSize: 12, fill: "#94a3b8" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15,23,42,0.9)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                      color: "#fff",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="cumulative"
                    stroke="#38bdf8"
                    strokeWidth={2}
                  />
                </LineChart>
              )}
              {view === "categories" && (
                <BarChart data={categoryData}>
                  <XAxis
                    dataKey="category"
                    stroke="#94a3b8"
                    tick={{ fontSize: 12, fill: "#94a3b8" }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    tick={{ fontSize: 12, fill: "#94a3b8" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15,23,42,0.9)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                      color: "#fff",
                    }}
                  />
                  <Bar dataKey="total" fill="#34d399" radius={6} />
                </BarChart>
              )}
              {view === "vendors" && (
                <PieChart>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15,23,42,0.9)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                      color: "#fff",
                    }}
                  />
                  <Pie
                    data={vendorData}
                    dataKey="total"
                    nameKey="vendor"
                    outerRadius={110}
                    fill="#8884d8"
                    label
                  >
                    {vendorData.map((entry, index) => (
                      <Cell
                        key={entry.vendor}
                        fill={`hsl(${(index * 70) % 360} 70% 55%)`}
                      />
                    ))}
                  </Pie>
                </PieChart>
              )}
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-10 text-center text-sm text-white/60">
            Nu există suficiente date pentru această vizualizare. Ajustează filtrele
            sau adaugă noi tranzacții.
          </p>
        )}
      </div>
    </div>
  );
}
