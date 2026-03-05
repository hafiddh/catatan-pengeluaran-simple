import showToast from "@/lib/simpleToast";
import { listExpenseTypes, type ExpenseType } from "@/service/expense-types";
import { createShoppingNote } from "@/service/notes";
import { AmountInput } from "@components/ui/amount-input";
import { AppleDatePicker } from "@components/ui/apple-date-picker";
import { ExpenseTypePills } from "@components/ui/expense-type-pills";
import { Calendar, CheckCircle, DollarSign, Save, Tag } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

function todayLocalISODate(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export const Dashboard = () => {
  const [date, setDate] = useState<string>(() => todayLocalISODate());
  const [amount, setAmount] = useState<string>("");
  const [expenseType, setExpenseType] = useState<string>("");
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [isLoadingExpenseTypes, setIsLoadingExpenseTypes] = useState(false);
  const [expenseTypesError, setExpenseTypesError] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  const token = useMemo(() => {
    try {
      return localStorage.getItem("auth_token") || "";
    } catch {
      return "";
    }
  }, []);

  // use simple DOM toast

  useEffect(() => {
    let active = true;

    const load = async () => {
      setExpenseTypesError("");
      if (!token) return;

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
  }, [token]);

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
      });
      setAmount("");
      showToast("Catatan tersimpan", { type: "success" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Gagal menyimpan catatan";
      showToast(msg, { type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="py-20">
      <section className="w-full max-w-2xl rounded-2xl bg-white border border-gray-200 shadow-lg p-6 dark:bg-slate-900 dark:border-slate-700">
        {/* <header className="mb-6">
          <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100">
            Catatan Belanja
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-300">
            Input catatan belanja harian Anda.
          </p>
        </header> */}

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

          <label className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-gray-500 dark:text-slate-300" />
              <span className="text-sm font-medium text-gray-700 dark:text-slate-200">
                Jumlah
              </span>
            </div>
            <AmountInput
              value={amount}
              onChange={setAmount}
              min={0}
              placeholder=""
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
            className="inline-flex cursor-pointer text-sm items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 bg-gray-900 text-white font-semibold disabled:opacity-60 disabled:cursor-not-allowed dark:bg-slate-100 dark:text-slate-900"
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
