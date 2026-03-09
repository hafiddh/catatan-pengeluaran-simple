import { AmountInput } from "@/components/ui/amount-input";
import { AppleDatePicker } from "@/components/ui/apple-date-picker";
import {
    ExpenseTypePills,
    getExpenseTypeIcon,
} from "@/components/ui/expense-type-pills";
import showToast from "@/lib/simpleToast";
import { listExpenseTypes, type ExpenseType } from "@/service/expense-types";
import {
    deleteShoppingNote,
    listShoppingNotes,
    updateShoppingNote,
    type ShoppingNote,
} from "@/service/notes";
import {
    CalendarRange,
    ChevronDown,
    LoaderCircle,
    Pencil,
    RefreshCcw,
    Save,
    Tag,
    Trash2,
    Wallet
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 10;

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: string): string {
  const value = new Date(`${date}T00:00:00`);
  if (Number.isNaN(value.getTime())) return date;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(value);
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

export function ListNotesPage() {
  const [notes, setNotes] = useState<ShoppingNote[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [startDate, setStartDate] = useState<string>(() =>
    getFirstDayOfMonth(),
  );
  const [endDate, setEndDate] = useState<string>(() => getTodayLocalISODate());
  const [currentPage, setCurrentPage] = useState(1);
  const [editingNote, setEditingNote] = useState<ShoppingNote | null>(null);
  const [editDate, setEditDate] = useState<string>("");
  const [editAmount, setEditAmount] = useState<string>("");
  const [editExpenseType, setEditExpenseType] = useState<string>("");
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string>("");
  const [pendingDeleteNote, setPendingDeleteNote] =
    useState<ShoppingNote | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

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
        e instanceof Error ? e.message : "Gagal mengambil data catatan";
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

  useEffect(() => {
    setCurrentPage(1);
  }, [startDate, endDate]);

  const filteredNotes = useMemo(() => {
    const from = startDate || "0000-01-01";
    const to = endDate || "9999-12-31";

    return notes.filter((note) => {
      if (startDate && note.tanggal < from) return false;
      if (endDate && note.tanggal > to) return false;
      return true;
    });
  }, [endDate, notes, startDate]);

  const totalPages = Math.max(1, Math.ceil(filteredNotes.length / PAGE_SIZE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedNotes = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredNotes.slice(startIndex, startIndex + PAGE_SIZE);
  }, [currentPage, filteredNotes]);

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

  const openEditModal = (note: ShoppingNote) => {
    setEditingNote(note);
    setEditDate(note.tanggal);
    setEditAmount(String(note.jumlah));
    setEditExpenseType(note.kategori_id);
  };

  const closeEditModal = (force = false) => {
    if (isSubmittingEdit && !force) return;
    setEditingNote(null);
    setEditDate("");
    setEditAmount("");
    setEditExpenseType("");
  };

  const handleUpdate = async () => {
    if (!editingNote) return;

    const parsedAmount = Number(editAmount);
    if (!editDate) {
      showToast("Tanggal wajib diisi", { type: "error" });
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      showToast("Jumlah harus lebih dari 0", { type: "error" });
      return;
    }
    if (!editExpenseType) {
      showToast("Tipe pengeluaran wajib dipilih", { type: "error" });
      return;
    }

    setIsSubmittingEdit(true);
    try {
      const updatedNote = await updateShoppingNote(token, editingNote.id, {
        tanggal: editDate,
        jumlah: parsedAmount,
        jenis_transaksi: editingNote.jenis_transaksi || "pengeluaran",
        kategori_id: editExpenseType,
      });

      setNotes((current) =>
        current.map((note) =>
          note.id === updatedNote.id ? updatedNote : note,
        ),
      );
      closeEditModal(true);
      showToast("Catatan berhasil diubah", { type: "success" });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Gagal mengubah catatan";
      showToast(message, { type: "error" });
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleDelete = (note: ShoppingNote) => {
    if (deletingId) return;

    setPendingDeleteNote(note);
  };

  const closeDeleteModal = () => {
    if (deletingId) return;
    setPendingDeleteNote(null);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteNote) return;

    setDeletingId(pendingDeleteNote.id);
    try {
      await deleteShoppingNote(token, pendingDeleteNote.id);
      setNotes((current) =>
        current.filter((item) => item.id !== pendingDeleteNote.id),
      );
      if (editingNote?.id === pendingDeleteNote.id) {
        closeEditModal();
      }
      setPendingDeleteNote(null);
      showToast("Catatan berhasil dihapus", { type: "success" });
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Gagal menghapus catatan";
      showToast(message, { type: "error" });
    } finally {
      setDeletingId("");
    }
  };

  const firstItemIndex =
    filteredNotes.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const lastItemIndex = Math.min(currentPage * PAGE_SIZE, filteredNotes.length);

  return (
    <main className="min-h-screen pt-6 pb-12">
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

        <section className="rounded-2xl border border-gray-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <div className="border-b border-gray-200 px-5 py-4 dark:border-slate-700 sm:px-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
              Data pengeluaran
            </h2>
          </div>

          {isLoading ? (
            <div className="flex min-h-72 items-center justify-center gap-3 px-6 py-10 text-sm text-gray-500 dark:text-slate-300">
              <LoaderCircle className="h-5 w-5 animate-spin" />
              Memuat data catatan...
            </div>
          ) : error ? (
            <div className="px-6 py-10 text-center text-sm font-medium text-red-600">
              {error}
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-gray-500 dark:text-slate-300">
              Belum ada data pada rentang tanggal yang dipilih.
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-100 dark:divide-slate-800 md:hidden">
                {paginatedNotes.map((note) => {
                  const category = expenseTypeMap.get(note.kategori_id);

                  return (
                    <div key={note.id} className="px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                            {formatDate(note.tanggal)}
                          </p>
                        </div>

                        <div className="inline-flex shrink-0 items-center gap-2 rounded-full bg-cyan-50 px-3.5 py-1.5 text-sm font-semibold text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-200">
                          {getExpenseTypeIcon(
                            category?.icon,
                            category?.label || "Tanpa kategori",
                          )}
                          <span>{category?.label || "Tanpa kategori"}</span>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <p className="text-xl font-bold tracking-[0.08em] tabular-nums text-gray-900 dark:text-slate-100">
                          {formatCurrency(note.jumlah)}
                        </p>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(note)}
                            aria-label={`Edit catatan ${formatDate(note.tanggal)}`}
                            title="Edit"
                            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-amber-300 bg-amber-50 text-amber-700 transition hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(note)}
                            disabled={deletingId === note.id}
                            aria-label={`Hapus catatan ${formatDate(note.tanggal)}`}
                            title="Hapus"
                            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-red-300 bg-red-50 text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
                          >
                            {deletingId === note.id ? (
                              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full border-separate border-spacing-0 text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-gray-600 dark:bg-slate-800/60 dark:text-slate-200">
                      <th className="px-5 py-4 font-semibold sm:px-6">No</th>
                      <th className="px-5 py-4 font-semibold sm:px-6">
                        Tanggal
                      </th>
                      <th className="px-5 py-4 font-semibold sm:px-6">
                        Kategori
                      </th>
                      <th className="px-5 py-4 font-semibold sm:px-6">
                        Jumlah
                      </th>
                      <th className="px-5 py-4 font-semibold sm:px-6">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedNotes.map((note, index) => {
                      const category = expenseTypeMap.get(note.kategori_id);
                      const rowNumber =
                        (currentPage - 1) * PAGE_SIZE + index + 1;

                      return (
                        <tr
                          key={note.id}
                          className="border-t border-gray-100 dark:border-slate-800"
                        >
                          <td className="px-5 py-4 align-top text-gray-500 dark:text-slate-300 sm:px-6">
                            {rowNumber}
                          </td>
                          <td className="px-5 py-4 align-top text-gray-900 dark:text-slate-100 sm:px-6">
                            {formatDate(note.tanggal)}
                          </td>
                          <td className="px-5 py-4 align-top sm:px-6">
                            <div className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3.5 py-1.5 text-sm font-semibold text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-200">
                              {getExpenseTypeIcon(
                                category?.icon,
                                category?.label || "Tanpa kategori",
                              )}
                              {category?.label || "Tanpa kategori"}
                            </div>
                          </td>
                          <td className="px-5 py-4 align-top font-semibold tracking-[0.08em] tabular-nums text-gray-900 dark:text-slate-100 sm:px-6">
                            {formatCurrency(note.jumlah)}
                          </td>
                          <td className="px-5 py-4 align-top sm:px-6">
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => openEditModal(note)}
                                aria-label={`Edit catatan ${formatDate(note.tanggal)}`}
                                title="Edit"
                                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-amber-300 bg-amber-50 text-amber-700 transition hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDelete(note)}
                                disabled={deletingId === note.id}
                                aria-label={`Hapus catatan ${formatDate(note.tanggal)}`}
                                title="Hapus"
                                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-red-300 bg-red-50 text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
                              >
                                {deletingId === note.id ? (
                                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-4 border-t border-gray-200 px-5 py-4 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <p className="text-sm text-gray-500 dark:text-slate-300">
                  Menampilkan{" "}
                  <strong className="text-gray-900 dark:text-slate-100">
                    {firstItemIndex}
                  </strong>{" "}
                  -{" "}
                  <strong className="text-gray-900 dark:text-slate-100">
                    {lastItemIndex}
                  </strong>{" "}
                  dari{" "}
                  <strong className="text-gray-900 dark:text-slate-100">
                    {filteredNotes.length}
                  </strong>{" "}
                  data
                </p>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() =>
                      setCurrentPage((page) => Math.max(1, page - 1))
                    }
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"
                  >
                    Sebelumnya
                  </button>

                  <span className="min-w-20 text-center text-sm font-semibold text-gray-700 dark:text-slate-200">
                    {currentPage} / {totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() =>
                      setCurrentPage((page) => Math.min(totalPages, page + 1))
                    }
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"
                  >
                    Berikutnya
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      {editingNote ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-3 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => closeEditModal()} />

          <section className="p-3 relative z-10 max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:p-6">
            {/* <div className="flex items-start justify-between gap-4">
              <div> 
              </div>

              <button
                type="button"
                onClick={() => closeEditModal()}
                disabled={isSubmittingEdit}
                className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-gray-300 text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div> */}

            <div className="grid grid-cols-1 gap-4">
              <label className="space-y-3">
                <div className="flex items-center gap-2">
                  <CalendarRange className="h-4 w-4 text-gray-500 dark:text-slate-300" />
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-200">
                    Tanggal
                  </span>
                </div>
                <AppleDatePicker value={editDate} onChange={setEditDate} />
              </label>

              <label className="space-y-3">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-gray-500 dark:text-slate-300" />
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-200">
                    Jumlah
                  </span>
                </div>
                <AmountInput
                  value={editAmount}
                  onChange={setEditAmount}
                  min={0}
                />
              </label>

              <label className="space-y-3">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-gray-500 dark:text-slate-300" />
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-200">
                    Tipe pengeluaran
                  </span>
                </div>
                <ExpenseTypePills
                  items={expenseTypes}
                  value={editExpenseType}
                  onChange={setEditExpenseType}
                  disabled={isSubmittingEdit}
                />
              </label>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => closeEditModal()}
                disabled={isSubmittingEdit}
                className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-900 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleUpdate}
                disabled={isSubmittingEdit}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
              >
                {isSubmittingEdit ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Simpan perubahan
                  </>
                )}
              </button>
            </div> 
          </section>
        </div>
      ) : null}

      {pendingDeleteNote ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-3 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={closeDeleteModal} />

          <section className="relative z-10 w-full max-w-md rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                <Trash2 className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">
                  Hapus catatan?
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-slate-300">
                  Catatan
                  {" "}
                  <span className="font-medium text-gray-900 dark:text-slate-100">
                    {expenseTypeMap.get(pendingDeleteNote.kategori_id)?.label ||
                      "tanpa kategori"}
                  </span>
                  {" "}
                  pada tanggal
                  {" "}
                  <span className="font-medium text-gray-900 dark:text-slate-100">
                    {formatDate(pendingDeleteNote.tanggal)}
                  </span>
                  {" "}
                  akan dihapus permanen dari daftar.
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={!!deletingId}
                className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-900 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={confirmDelete}
                disabled={!!deletingId}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
              >
                {deletingId ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Menghapus...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Ya, hapus
                  </>
                )}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
