import { getExpenseTypeIcon } from "@/components/ui/expense-type-pills";
import showToast from "@/lib/simpleToast";
import { listExpenseTypes, type ExpenseType } from "@/service/expense-types";
import { listShoppingNotes, type ShoppingNote } from "@/service/notes";
import {
    CalendarRange,
    ChevronDown,
    LoaderCircle,
    RefreshCcw,
    Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function getTodayLocalISODate(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function getFirstDayOfMonth(): string {
  return `${getTodayLocalISODate().slice(0, 8)}01`;
}

type SummaryItem = {
  categoryId: string;
  categoryLabel: string;
  total: number;
  count: number;
};

export function LaporanPage() {
  const [notes, setNotes] = useState<ShoppingNote[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [error, setError] = useState("");
  const [startDate, setStartDate] = useState<string>(() =>
    getFirstDayOfMonth(),
  );
  const [endDate, setEndDate] = useState<string>(() => getTodayLocalISODate());

  const token = useMemo(() => {
    try {
      return localStorage.getItem("auth_token") || "";
    } catch {
      return "";
    }
  }, []);

  const expenseTypeMap = useMemo(() => {
    return new Map(expenseTypes.map((item) => [item.id, item]));
  }, [expenseTypes]);

  const fetchData = async (withLoader: boolean) => {
    if (!token) {
      setIsLoading(false);
      setError("Anda belum login");
      try {
        window.location.href = "/";
      } catch {
        // ignore
      }
      return;
    }

    if (withLoader) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    setError("");
    try {
      const [loadedNotes, loadedExpenseTypes] = await Promise.all([
        listShoppingNotes(token),
        listExpenseTypes(token),
      ]);
      setNotes(loadedNotes);
      setExpenseTypes(loadedExpenseTypes);
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Gagal mengambil data laporan";
      setError(message);
      showToast(message, { type: "error" });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData(true);
  }, [token]);

  const filteredNotes = useMemo(() => {
    const from = startDate || "0000-01-01";
    const to = endDate || "9999-12-31";

    return notes.filter((note) => {
      if (startDate && note.tanggal < from) return false;
      if (endDate && note.tanggal > to) return false;
      return true;
    });
  }, [endDate, notes, startDate]);

  const summary = useMemo(() => {
    const grouped = new Map<string, SummaryItem>();

    for (const note of filteredNotes) {
      const current = grouped.get(note.kategori_id);
      const label =
        expenseTypeMap.get(note.kategori_id)?.label || "Tanpa kategori";

      if (!current) {
        grouped.set(note.kategori_id, {
          categoryId: note.kategori_id,
          categoryLabel: label,
          total: note.jumlah,
          count: 1,
        });
        continue;
      }

      current.total += note.jumlah;
      current.count += 1;
    }

    return Array.from(grouped.values()).sort(
      (left, right) => right.total - left.total,
    );
  }, [expenseTypeMap, filteredNotes]);

  const summaryTotalAmount = useMemo(() => {
    return filteredNotes.reduce((total, note) => total + note.jumlah, 0);
  }, [filteredNotes]);

  return (
    <main className="pt-6 pb-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="rounded-2xl border border-gray-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-900 sm:p-6">
          <button
            type="button"
            onClick={() => setIsFilterOpen((current) => !current)}
            className="flex w-full cursor-pointer items-center justify-between gap-3 text-left"
            aria-expanded={isFilterOpen}
            aria-controls="laporan-filter-panel"
          >
            <div className="flex items-center gap-2">
              <CalendarRange className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
                  Filter
                </h2>
              </div>
            </div>

            <span className="inline-flex items-center gap-2">
              <span className="hidden text-xs font-medium text-gray-500 dark:text-slate-300 sm:inline">
                {isFilterOpen ? "Tutup" : "Buka"}
              </span>
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-300 text-gray-700 transition dark:border-slate-600 dark:text-slate-200">
                <ChevronDown
                  className={
                    "h-4 w-4 transition-transform duration-200 " +
                    (isFilterOpen ? "rotate-180" : "rotate-0")
                  }
                />
              </span>
            </span>
          </button>

          <div
            id="laporan-filter-panel"
            className={
              "grid overflow-hidden transition-all duration-300 ease-out " +
              (isFilterOpen
                ? "mt-4 grid-rows-[1fr] opacity-100"
                : "grid-rows-[0fr] opacity-0")
            }
          >
            <div className="min-h-0 overflow-hidden">
              <div className="grid gap-4 md:grid-cols-[1fr_1fr] md:items-end">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-200">
                    Dari tanggal
                  </span>
                  <input
                    type="date"
                    value={startDate}
                    max={endDate || undefined}
                    onChange={(event) => setStartDate(event.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-cyan-500 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-200">
                    Sampai tanggal
                  </span>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate || undefined}
                    onChange={(event) => setEndDate(event.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-cyan-500 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
                  />
                </label>
              </div>
              <div className="flex items-center justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setStartDate(getFirstDayOfMonth());
                    setEndDate(getTodayLocalISODate());
                  }}
                  disabled={isLoading || isRefreshing}
                  className="inline-flex text-xs cursor-pointer items-center justify-center gap-2 rounded-xl border border-gray-300 px-2 py-2  font-semibold text-gray-900 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  <RefreshCcw
                    className={
                      "h-4 w-4 " + (isRefreshing ? "animate-spin" : "")
                    }
                  />{" "}
                  Reset Filter
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-lg dark:border-slate-700 dark:bg-slate-900 sm:p-6">
          <div className="mb-5 flex items-center gap-2">
            <Wallet className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
              Data Pengeluaran
            </h2>
          </div>

          {isLoading ? (
            <div className="flex min-h-72 items-center justify-center gap-3 px-6 py-10 text-sm text-gray-500 dark:text-slate-300">
              <LoaderCircle className="h-5 w-5 animate-spin" />
              Memuat data laporan...
            </div>
          ) : error ? (
            <div className="px-6 py-10 text-center text-sm font-medium text-red-600">
              {error}
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-3 w-full">
                <div className="flex w-full gap-3">
                  <div className="rounded-2xl w-full border border-gray-200 bg-gray-50 px-4 py-2 dark:border-slate-700 dark:bg-slate-800/60">
                    <p className="text-sm text-gray-500 dark:text-slate-300">
                      Total data
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                      {filteredNotes.length}
                    </p>
                  </div>
                  <div className="rounded-2xl w-full border border-gray-200 bg-gray-50 px-4 py-2 dark:border-slate-700 dark:bg-slate-800/60">
                    <p className="text-sm text-gray-500 dark:text-slate-300">
                      Jumlah kategori
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                      {summary.length}
                    </p>
                  </div>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2 dark:border-slate-700 dark:bg-slate-800/60">
                  <p className="text-sm text-gray-500 dark:text-slate-300">
                    Total nominal
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                    {formatCurrency(summaryTotalAmount)}
                  </p>
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 dark:border-slate-700">
                {summary.length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm text-gray-500 dark:text-slate-300">
                    Belum ada summary untuk filter yang dipilih.
                  </div>
                ) : (
                  <>
                    <div className="divide-y divide-gray-100 dark:divide-slate-800 md:hidden">
                      {summary.map((item) => {
                        const expenseType = expenseTypeMap.get(item.categoryId);

                        return (
                          <div key={item.categoryId} className="px-4 py-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="inline-flex min-w-0 items-center gap-2 rounded-full bg-cyan-50 px-3.5 py-1.5 text-sm font-semibold text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-200">
                                {getExpenseTypeIcon(
                                  expenseType?.icon,
                                  item.categoryLabel,
                                )}
                                <span className="truncate">
                                  {item.categoryLabel}
                                </span>
                              </div>

                              <div className="rounded-xl bg-gray-50 px-3 py-1.5 text-right dark:bg-slate-800/70">
                                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-gray-500 dark:text-slate-400">
                                  Data
                                </p>
                                <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                                  {item.count}
                                </p>
                              </div>
                            </div>

                            <div className="mt-3 flex items-end justify-between gap-3">
                              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-gray-500 dark:text-slate-400">
                                Total nominal
                              </p>
                              <p className="text-base font-semibold tracking-[0.08em] tabular-nums text-gray-900 dark:text-slate-100">
                                {formatCurrency(item.total)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="hidden overflow-x-auto md:block">
                      <table className="min-w-full border-separate border-spacing-0 text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-left text-gray-600 dark:bg-slate-800/60 dark:text-slate-200">
                            <th className="px-5 py-4 font-semibold">
                              Kategori
                            </th>
                            <th className="px-5 py-4 font-semibold">
                              Jumlah data
                            </th>
                            <th className="px-5 py-4 font-semibold">
                              Total nominal
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {summary.map((item) => (
                            <tr
                              key={item.categoryId}
                              className="border-t border-gray-100 dark:border-slate-800"
                            >
                              <td className="px-5 py-4 font-medium text-gray-900 dark:text-slate-100">
                                <div className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-200">
                                  {getExpenseTypeIcon(
                                    expenseTypeMap.get(item.categoryId)?.icon,
                                    item.categoryLabel,
                                  )}
                                  {item.categoryLabel}
                                </div>
                              </td>
                              <td className="px-5 py-4 text-gray-600 dark:text-slate-300">
                                {item.count}
                              </td>
                              <td className="px-5 py-4 font-semibold tracking-[0.08em] tabular-nums text-gray-900 dark:text-slate-100">
                                {formatCurrency(item.total)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
