import { hasStoredAuth } from "@/lib/auth-session";
import showToast from "@/lib/simpleToast";
import { listExpenseTypes, type ExpenseType } from "@/service/expense-types";
import { createShoppingNote } from "@/service/notes";
import { AmountInput } from "@components/ui/amount-input";
import { AppleDatePicker } from "@components/ui/apple-date-picker";
import { ExpenseTypePills } from "@components/ui/expense-type-pills";
import { QtyPicker } from "@components/ui/qty-picker";
import {
  Calendar,
  CheckCircle,
  DollarSign,
  FileText,
  Package,
  Save,
  Tag,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

function todayLocalISODate(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

const inputClass =
  "w-full rounded-2xl border border-white/45 bg-white/35 px-4 py-3 text-sm text-slate-900 outline-none shadow-[0_14px_36px_rgba(15,23,42,0.08)] backdrop-blur-sm transition-all duration-300 ease-out focus:ring-2 focus:ring-slate-300/60 dark:border-slate-700/70 dark:bg-slate-900/35 dark:text-slate-100 dark:focus:ring-slate-500/50 supports-backdrop-filter:bg-white/25 dark:supports-backdrop-filter:bg-slate-900/25";

export const Dashboard = () => {
  const [date, setDate] = useState<string>(() => todayLocalISODate());
  const [amount, setAmount] = useState<string>("");
  const [namaBarang, setNamaBarang] = useState<string>("");
  const [jumlahBarang, setJumlahBarang] = useState<number>(0);
  const [catatan, setCatatan] = useState<string>("");
  const [expenseType, setExpenseType] = useState<string>("");
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [isLoadingExpenseTypes, setIsLoadingExpenseTypes] = useState(false);
  const [expenseTypesError, setExpenseTypesError] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  const token = useMemo(() => {
    try {
      return localStorage.getItem("auth_token") || "";
    } catch {
      return "";
    }
  }, []);

  const canRefreshSession = useMemo(() => hasStoredAuth(), []);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setExpenseTypesError("");
      if (!token && !canRefreshSession) return;

      setIsLoadingExpenseTypes(true);
      try {
        const items = await listExpenseTypes(token);
        if (!active) return;
        setExpenseTypes(items);
        setExpenseType((prev) => prev || items[0]?.id || "");
      } catch (e: unknown) {
        if (!active) return;
        const msg =
          e instanceof Error ? e.message : "Gagal mengambil jenis pengeluaran";
        setExpenseTypesError(msg);
        try {
          showToast(msg, { type: "error" });
        } catch {}
      } finally {
        if (!active) return;
        setIsLoadingExpenseTypes(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [canRefreshSession, token]);

  const onSave = async () => {
    const parsedAmount = Number(amount);
    if (!date) return showToast("Tanggal wajib diisi", { type: "error" });
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0)
      return showToast("Jumlah harus lebih dari 0", { type: "error" });
    if (!expenseType)
      return showToast("Tipe pengeluaran wajib dipilih", { type: "error" });

    setIsSaving(true);
    try {
      await createShoppingNote(token, {
        tanggal: date,
        jumlah: parsedAmount,
        jenis_transaksi: "pengeluaran",
        kategori_id: expenseType,
        nama_barang: namaBarang || undefined,
        jumlah_barang: jumlahBarang > 0 ? jumlahBarang : undefined,
        catatan: catatan || undefined,
      });
      setAmount("");
      setNamaBarang("");
      setJumlahBarang(0);
      setCatatan("");
      showToast("Catatan tersimpan", { type: "success" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Gagal menyimpan catatan";
      showToast(msg, { type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="pt-5 pb-20">
      <section className="w-full max-w-2xl rounded-2xl bg-white border border-gray-200 shadow-lg p-6 dark:bg-slate-900 dark:border-slate-700">
        <div className="grid grid-cols-1 gap-4">
          <label className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-gray-500 dark:text-slate-300" />
              <span className="text-sm font-medium text-gray-700 dark:text-slate-200">
                Tanggal
              </span>
            </div>
            <AppleDatePicker value={date} onChange={setDate} />
          </label>

          <div className="grid grid-cols-5 gap-3">
            <label className="col-span-4 space-y-2">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-gray-500 dark:text-slate-300" />
                <span className="text-sm font-medium text-gray-700 dark:text-slate-200">
                  Nama barang
                </span>
              </div>
              <input
                type="text"
                value={namaBarang}
                onChange={(e) => setNamaBarang(e.target.value)}
                className={inputClass}
              />
            </label>

            <div className="col-span-1 space-y-2">
              <p className="text-sm font-medium text-gray-700 dark:text-slate-200">
                Qty
              </p>
              <QtyPicker
                value={jumlahBarang}
                onChange={setJumlahBarang}
                disabled={isSaving}
              />
            </div>
          </div>

          <label className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-gray-500 dark:text-slate-300" />
              <span className="text-sm font-medium text-gray-700 dark:text-slate-200">
                Jumlah Harga
              </span>
            </div>
            <AmountInput
              value={amount}
              onChange={setAmount}
              min={0}
              placeholder=""
            />
          </label>

          <label className="space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-500 dark:text-slate-300" />
              <span className="text-sm font-medium text-gray-700 dark:text-slate-200">
                Catatan
              </span>
            </div>
            <textarea
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              rows={2}
              className={inputClass + " resize-none"}
            />
          </label>

          <label className="space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <Tag className="w-4 h-4 text-gray-500 dark:text-slate-300" />
              <span className="text-sm font-medium text-gray-700 dark:text-slate-200">
                Tipe pengeluaran
              </span>
            </div>
            <ExpenseTypePills
              className="text-center justify-center"
              items={expenseTypes}
              value={expenseType}
              onChange={setExpenseType}
              disabled={isLoadingExpenseTypes}
            />

            {expenseTypesError ? (
              <p className="text-xs text-red-600 font-medium">
                {expenseTypesError}
              </p>
            ) : null}
          </label>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-white/70 bg-white/75 px-3.5 py-2 text-sm font-semibold text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_12px_28px_rgba(148,163,184,0.16)] backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-white/85 focus:outline-none focus:ring-2 focus:ring-slate-300/60 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600/80 dark:bg-slate-800/80 dark:text-slate-100 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_12px_28px_rgba(15,23,42,0.45)] dark:hover:bg-slate-700/85 dark:focus:ring-slate-500/50"
          >
            {isSaving ? (
              <>
                <Save className="w-4 h-4 animate-pulse" />
                Menyimpan...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Simpan
              </>
            )}
          </button>
        </div>
      </section>
    </main>
  );
};
