export type ExpenseType = {
  id: string;
  label: string;
  icon: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
};

const API_BASE_URL = (
  import.meta.env.PUBLIC_API_BE_URL ??
  import.meta.env.PUBLIC_API_BASE_URL ??
  import.meta.env.API_BE_URL ??
  "http://localhost:3061"
)
  .toString()
  .replace(/\/+$/, "");

export async function listExpenseTypes(token: string): Promise<ExpenseType[]> {
  if (!token) throw new Error("Anda belum login");

  const res = await fetch(`${API_BASE_URL}/api/expense-types`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    let message = "Gagal mengambil jenis pengeluaran";
    try {
      const data = await res.json();
      if (typeof data?.message === "string") message = data.message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return (await res.json()) as ExpenseType[];
}
