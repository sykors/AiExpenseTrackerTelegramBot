import { DashboardShell } from "@/components/layout/DashboardShell";
import { TransactionsTable } from "@/components/transactions/TransactionsTable";
import { serverFetch } from "@/lib/api";
import type {
  CategoryResponse,
  ExpenseListResponse,
  ExpenseResponse,
} from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getTransactionsData(): Promise<{
  expenses: ExpenseResponse[];
  categories: CategoryResponse[];
}> {
  const [expenses, categories] = await Promise.all([
    serverFetch<ExpenseListResponse>(
      "/api/v1/expenses?limit=200&sort_by=purchase_date&order=desc"
    ),
    serverFetch<CategoryResponse[]>("/api/v1/categories"),
  ]);

  return {
    expenses: expenses?.expenses ?? [],
    categories: categories ?? [],
  };
}

export default async function TransactionsPage() {
  const { expenses, categories } = await getTransactionsData();

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-white/50">
            Management
          </p>
          <h1 className="text-2xl font-semibold text-white">Tranzacții</h1>
          <p className="text-sm text-white/60">
            Vizualizează și editează toate cheltuielile înregistrate prin bot.
          </p>
        </div>
        <TransactionsTable expenses={expenses} categories={categories} />
      </div>
    </DashboardShell>
  );
}
