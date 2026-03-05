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

const API_BASE_URL = (
  import.meta.env.PUBLIC_API_BE_URL ??
  import.meta.env.PUBLIC_API_BASE_URL ??
  import.meta.env.API_BE_URL ??
  "http://localhost:3061"
)
  .toString()
  .replace(/\/+$/, "");

export async function createShoppingNote(
  token: string,
  payload: CreateShoppingNoteRequest,
): Promise<ShoppingNote> {
  if (!token) throw new Error("Anda belum login");

  const res = await fetch(`${API_BASE_URL}/api/notes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let message = "Gagal menyimpan catatan";
    try {
      const data = await res.json();
      if (typeof data?.message === "string") message = data.message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return (await res.json()) as ShoppingNote;
}

export async function listShoppingNotes(
  token: string,
): Promise<ShoppingNote[]> {
  if (!token) throw new Error("Anda belum login");

  const res = await fetch(`${API_BASE_URL}/api/notes`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    let message = "Gagal mengambil catatan";
    try {
      const data = await res.json();
      if (typeof data?.message === "string") message = data.message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return (await res.json()) as ShoppingNote[];
}

export async function getShoppingNoteByID(
  token: string,
  id: string,
): Promise<ShoppingNote> {
  if (!token) throw new Error("Anda belum login");
  if (!id) throw new Error("ID catatan tidak valid");

  const res = await fetch(`${API_BASE_URL}/api/notes/${id}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    let message = "Gagal mengambil catatan";
    try {
      const data = await res.json();
      if (typeof data?.message === "string") message = data.message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return (await res.json()) as ShoppingNote;
}

export async function updateShoppingNote(
  token: string,
  id: string,
  payload: CreateShoppingNoteRequest,
): Promise<ShoppingNote> {
  if (!token) throw new Error("Anda belum login");
  if (!id) throw new Error("ID catatan tidak valid");

  const res = await fetch(`${API_BASE_URL}/api/notes/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let message = "Gagal mengubah catatan";
    try {
      const data = await res.json();
      if (typeof data?.message === "string") message = data.message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return (await res.json()) as ShoppingNote;
}

export async function deleteShoppingNote(
  token: string,
  id: string,
): Promise<void> {
  if (!token) throw new Error("Anda belum login");
  if (!id) throw new Error("ID catatan tidak valid");

  const res = await fetch(`${API_BASE_URL}/api/notes/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    let message = "Gagal menghapus catatan";
    try {
      const data = await res.json();
      if (typeof data?.message === "string") message = data.message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
}
