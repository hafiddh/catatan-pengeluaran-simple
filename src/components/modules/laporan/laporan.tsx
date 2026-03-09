import showToast from "@/lib/simpleToast";
import { listExpenseTypes, type ExpenseType } from "@/service/expense-types";
import { listShoppingNotes, type ShoppingNote } from "@/service/notes";
import {
    CalendarRange,
    LoaderCircle,
    RefreshCcw,
    Tag,
    Wallet
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
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-lg dark:border-slate-700 dark:bg-slate-900 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarRange className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
              <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
                Filter
              </h2>
            </div>
            <button
              type="button"
              onClick={() => {
                setStartDate(getFirstDayOfMonth());
                setEndDate(getTodayLocalISODate());
              }}
              disabled={isLoading || isRefreshing}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-gray-300 px-2 py-2 text-sm font-semibold text-gray-900 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              <RefreshCcw
                className={"h-4 w-4 " + (isRefreshing ? "animate-spin" : "")}
              /> 
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
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
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-lg dark:border-slate-700 dark:bg-slate-900 sm:p-6">
          <div className="mb-5 flex items-center gap-2">
            <Wallet className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
              Summary tabel
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
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                  <p className="text-sm text-gray-500 dark:text-slate-300">
                    Total data
                  </p>
                  <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-slate-100">
                    {filteredNotes.length}
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                  <p className="text-sm text-gray-500 dark:text-slate-300">
                    Jumlah kategori
                  </p>
                  <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-slate-100">
                    {summary.length}
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                  <p className="text-sm text-gray-500 dark:text-slate-300">
                    Total nominal
                  </p>
                  <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-slate-100">
                    {formatCurrency(summaryTotalAmount)}
                  </p>
                </div>
              </div>

              <div className="mt-6 overflow-x-auto rounded-2xl border border-gray-200 dark:border-slate-700">
                <table className="min-w-full border-separate border-spacing-0 text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-gray-600 dark:bg-slate-800/60 dark:text-slate-200">
                      <th className="px-5 py-4 font-semibold">Kategori</th>
                      <th className="px-5 py-4 font-semibold">Jumlah data</th>
                      <th className="px-5 py-4 font-semibold">Total nominal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.length === 0 ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-5 py-8 text-center text-sm text-gray-500 dark:text-slate-300"
                        >
                          Belum ada summary untuk filter yang dipilih.
                        </td>
                      </tr>
                    ) : (
                      summary.map((item) => (
                        <tr
                          key={item.categoryId}
                          className="border-t border-gray-100 dark:border-slate-800"
                        >
                          <td className="px-5 py-4 font-medium text-gray-900 dark:text-slate-100">
                            <div className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-200">
                              <Tag className="h-3.5 w-3.5" />
                              {item.categoryLabel}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-gray-600 dark:text-slate-300">
                            {item.count}
                          </td>
                          <td className="px-5 py-4 font-semibold text-gray-900 dark:text-slate-100">
                            {formatCurrency(item.total)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
