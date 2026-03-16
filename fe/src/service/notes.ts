import { authorizedFetch, getErrorMessage } from "@/lib/api";

export type CreateShoppingNoteRequest = {
  tanggal: string;
  jumlah: number;
  jenis_transaksi: string;
  kategori_id: string;
};

export type ShoppingNote = {
  id: string;
  user_id: string;
  jenis_transaksi: string;
  kategori_id: string;
  jumlah: number;
  tanggal: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
};

export async function createShoppingNote(
  token: string,
  payload: CreateShoppingNoteRequest,
): Promise<ShoppingNote> {
  const res = await authorizedFetch(
    "/api/notes",
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
): Promise<ShoppingNote[]> {
  const res = await authorizedFetch("/api/notes", { method: "GET" }, token);

  if (!res.ok) {
    throw new Error(await getErrorMessage(res, "Gagal mengambil catatan"));
  }

  return (await res.json()) as ShoppingNote[];
}

export async function getShoppingNoteByID(
  token: string,
  id: string,
): Promise<ShoppingNote> {
  if (!id) throw new Error("ID catatan tidak valid");

  const res = await authorizedFetch(`/api/notes/${id}`, { method: "GET" }, token);

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
    `/api/notes/${id}`,
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

  const res = await authorizedFetch(`/api/notes/${id}`, { method: "DELETE" }, token);

  if (!res.ok) {
    throw new Error(await getErrorMessage(res, "Gagal menghapus catatan"));
  }
}
