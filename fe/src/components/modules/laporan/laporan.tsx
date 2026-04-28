import { CategoryNotesModal } from "@/components/ui/category-notes-modal";
import { getExpenseTypeIcon } from "@/components/ui/expense-type-pills";
import { hasStoredAuth } from "@/lib/auth-session";
import showToast from "@/lib/simpleToast";
import { getShoppingNotesSummary, type NotesSummary, type NotesSummaryItem } from "@/service/notes";
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

export function LaporanPage() {
  const [summary, setSummary] = useState<NotesSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [error, setError] = useState("");
  const [startDate, setStartDate] = useState<string>(() =>
    getFirstDayOfMonth(),
  );
  const [endDate, setEndDate] = useState<string>(() => getTodayLocalISODate());

  const [selectedCategory, setSelectedCategory] =
    useState<NotesSummaryItem | null>(null);

  const token = useMemo(() => {
    try {
      return localStorage.getItem("auth_token") || "";
    } catch {
      return "";
    }
  }, []);

  const canRefreshSession = useMemo(() => hasStoredAuth(), []);

  const fetchData = async (withLoader: boolean) => {
    if (!token && !canRefreshSession) {
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
      const data = await getShoppingNotesSummary(token, { startDate, endDate });
      setSummary(data);
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
  }, [startDate, endDate, canRefreshSession, token]);

  return (
    <main className="pt-6 pb-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="rounded-3xl border border-white/45 bg-white/35 p-3 shadow-[0_20px_50px_rgba(15,23,42,0.12)] backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-900/35 supports-backdrop-filter:bg-white/25 dark:supports-backdrop-filter:bg-slate-900/25 sm:p-6">
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
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-white/45 bg-white/35 text-slate-700 transition-all duration-300 ease-out dark:border-slate-700/70 dark:bg-slate-900/35 dark:text-slate-200">
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
                    className="w-full rounded-2xl border border-white/45 bg-white/35 px-4 py-3 text-sm text-slate-900 outline-none shadow-[0_14px_36px_rgba(15,23,42,0.08)] backdrop-blur-sm transition-all duration-300 ease-out focus:ring-2 focus:ring-slate-300/60 dark:border-slate-700/70 dark:bg-slate-900/35 dark:text-slate-100 dark:focus:ring-slate-500/50 supports-backdrop-filter:bg-white/25 dark:supports-backdrop-filter:bg-slate-900/25"
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
                    className="w-full rounded-2xl border border-white/45 bg-white/35 px-4 py-3 text-sm text-slate-900 outline-none shadow-[0_14px_36px_rgba(15,23,42,0.08)] backdrop-blur-sm transition-all duration-300 ease-out focus:ring-2 focus:ring-slate-300/60 dark:border-slate-700/70 dark:bg-slate-900/35 dark:text-slate-100 dark:focus:ring-slate-500/50 supports-backdrop-filter:bg-white/25 dark:supports-backdrop-filter:bg-slate-900/25"
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
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-white/45 bg-white/35 px-3 py-2 text-xs font-semibold text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.08)] backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-white/50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700/70 dark:bg-slate-900/35 dark:text-slate-100 dark:hover:bg-slate-800/45"
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

        <section className="rounded-3xl border border-white/45 bg-white/35 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.12)] backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-900/35 supports-backdrop-filter:bg-white/25 dark:supports-backdrop-filter:bg-slate-900/25 sm:p-6">
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
              <div className="grid grid-cols-2 gap-4 w-full">
                <div className="rounded-2xl border border-white/45 bg-white/35 px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.08)] backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-900/35 text-center">
                  <p className="text-sm text-gray-500 dark:text-slate-300">
                    Total data
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                    {summary?.total_count ?? 0}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/45 bg-white/35 px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.08)] backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-900/35 text-center">
                  <p className="text-sm text-gray-500 dark:text-slate-300">
                    Jumlah kategori
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                    {summary?.categories.length ?? 0}
                  </p>
                </div>
                <div className="col-span-2 rounded-2xl border border-white/45 bg-white/35 px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.08)] backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-900/35 text-center">
                  <p className="text-sm text-gray-500 dark:text-slate-300">
                    Total nominal
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                    {formatCurrency(summary?.total_amount ?? 0)}
                  </p>
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-2xl border border-white/45 bg-white/20 dark:border-slate-700/70 dark:bg-slate-900/20">
                {!summary || summary.categories.length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm text-gray-500 dark:text-slate-300">
                    Belum ada summary untuk filter yang dipilih.
                  </div>
                ) : (
                  <>
                    <div className="divide-y divide-gray-100 dark:divide-slate-800 md:hidden">
                      {summary.categories.map((item) => (
                        <button
                          key={item.kategori_id}
                          type="button"
                          onClick={() => setSelectedCategory(item)}
                          className="w-full cursor-pointer px-4 py-4 text-left transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/30 active:bg-slate-100/60"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="inline-flex min-w-0 items-center gap-2 rounded-full bg-cyan-50 px-3.5 py-1.5 text-sm font-semibold text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-200">
                              {getExpenseTypeIcon(
                                item.icon,
                                item.kategori_label,
                              )}
                              <span className="truncate">
                                {item.kategori_label || "Tanpa kategori"}
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
                        </button>
                      ))}
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
                          {summary.categories.map((item) => (
                            <tr
                              key={item.kategori_id}
                              onClick={() => setSelectedCategory(item)}
                              className="cursor-pointer border-t border-gray-100 transition-colors hover:bg-slate-50/60 dark:border-slate-800 dark:hover:bg-slate-800/30"
                            >
                              <td className="px-5 py-4 font-medium text-gray-900 dark:text-slate-100">
                                <div className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-200">
                                  {getExpenseTypeIcon(
                                    item.icon,
                                    item.kategori_label,
                                  )}
                                  {item.kategori_label || "Tanpa kategori"}
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

      {selectedCategory && (
        <CategoryNotesModal
          isOpen={!!selectedCategory}
          onClose={() => setSelectedCategory(null)}
          token={token}
          kategoriId={selectedCategory.kategori_id}
          kategoriLabel={selectedCategory.kategori_label}
          kategoriIcon={selectedCategory.icon}
          startDate={startDate}
          endDate={endDate}
          totalAmount={selectedCategory.total}
        />
      )}
    </main>
  );
}
