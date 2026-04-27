import { authorizedFetch, getErrorMessage } from "@/lib/api";

export type ExpenseType = {
  id: string;
  label: string;
  icon: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
};

export async function listExpenseTypes(token: string): Promise<ExpenseType[]> {
  const res = await authorizedFetch(
    "/expense-types",
    { method: "GET" },
    token,
  );

  if (!res.ok) {
    throw new Error(
      await getErrorMessage(res, "Gagal mengambil jenis pengeluaran"),
    );
  }

  return (await res.json()) as ExpenseType[];
}
