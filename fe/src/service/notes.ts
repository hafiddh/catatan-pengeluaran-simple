import { authorizedFetch, getErrorMessage } from "@/lib/api";

export type CreateShoppingNoteRequest = {
  tanggal: string;
  jumlah: number;
  jenis_transaksi: string;
  kategori_id: string;
  nama_barang?: string;
  jumlah_barang?: number;
  catatan?: string;
};

export type ShoppingNote = {
  id: string;
  user_id: string;
  jenis_transaksi: string;
  kategori_id: string;
  jumlah: number;
  nama_barang?: string;
  jumlah_barang?: number;
  catatan?: string;
  tanggal: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
};

export type ListNotesParams = {
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
};

export type ListNotesResult = {
  data: ShoppingNote[];
  total: number;
  page: number;
  limit: number;
  has_next: boolean;
};

export type NotesSummaryItem = {
  kategori_id: string;
  kategori_label: string;
  icon: string;
  count: number;
  total: number;
};

export type NotesSummary = {
  total_count: number;
  total_amount: number;
  categories: NotesSummaryItem[];
};

export async function createShoppingNote(
  token: string,
  payload: CreateShoppingNoteRequest,
): Promise<ShoppingNote> {
  const res = await authorizedFetch(
    "/notes",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
    token,
  );

  if (!res.ok) {
    throw new Error(await getErrorMessage(res, "Gagal menyimpan catatan"));
  }

  return (await res.json()) as ShoppingNote;
}

export async function listShoppingNotes(
  token: string,
  params: ListNotesParams = {},
): Promise<ListNotesResult> {
  const query = new URLSearchParams();
  if (params.startDate) query.set("start_date", params.startDate);
  if (params.endDate) query.set("end_date", params.endDate);
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));

  const qs = query.toString();
  const res = await authorizedFetch(
    `/notes${qs ? `?${qs}` : ""}`,
    { method: "GET" },
    token,
  );

  if (!res.ok) {
    throw new Error(await getErrorMessage(res, "Gagal mengambil catatan"));
  }

  return (await res.json()) as ListNotesResult;
}

export async function getShoppingNotesSummary(
  token: string,
  params: { startDate?: string; endDate?: string } = {},
): Promise<NotesSummary> {
  const query = new URLSearchParams();
  if (params.startDate) query.set("start_date", params.startDate);
  if (params.endDate) query.set("end_date", params.endDate);

  const qs = query.toString();
  const res = await authorizedFetch(
    `/notes/summary${qs ? `?${qs}` : ""}`,
    { method: "GET" },
    token,
  );

  if (!res.ok) {
    throw new Error(await getErrorMessage(res, "Gagal mengambil laporan"));
  }

  return (await res.json()) as NotesSummary;
}

export async function getShoppingNoteByID(
  token: string,
  id: string,
): Promise<ShoppingNote> {
  if (!id) throw new Error("ID catatan tidak valid");

  const res = await authorizedFetch(`/notes/${id}`, { method: "GET" }, token);

  if (!res.ok) {
    throw new Error(await getErrorMessage(res, "Gagal mengambil catatan"));
  }

  return (await res.json()) as ShoppingNote;
}

export async function updateShoppingNote(
  token: string,
  id: string,
  payload: CreateShoppingNoteRequest,
): Promise<ShoppingNote> {
  if (!id) throw new Error("ID catatan tidak valid");

  const res = await authorizedFetch(
    `/notes/${id}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
    token,
  );

  if (!res.ok) {
    throw new Error(await getErrorMessage(res, "Gagal mengubah catatan"));
  }

  return (await res.json()) as ShoppingNote;
}

export async function deleteShoppingNote(
  token: string,
  id: string,
): Promise<void> {
  if (!id) throw new Error("ID catatan tidak valid");

  const res = await authorizedFetch(`/notes/${id}`, { method: "DELETE" }, token);

  if (!res.ok) {
    throw new Error(await getErrorMessage(res, "Gagal menghapus catatan"));
  }
}
