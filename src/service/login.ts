export type BackendUser = {
  id: string;
  email: string;
  name?: string;
  picture?: string;
};

export type BackendGoogleLoginResponse = {
  token: string;
  user: BackendUser;
};

const API_BASE_URL =
  import.meta.env.PUBLIC_API_BASE_URL?.toString() || "http://localhost:1323";

export async function LoginWithGoogle(
  credential: string,
): Promise<BackendGoogleLoginResponse> {
  if (!credential) {
    throw new Error("Credential Google tidak ditemukan");
  }

  const res = await fetch(`${API_BASE_URL}/api/auth/google`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ credential }),
  });

  if (!res.ok) {
    let message = "Terjadi kesalahan saat login dengan Google";
    try {
      const data = await res.json();
      if (typeof data?.message === "string") message = data.message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return (await res.json()) as BackendGoogleLoginResponse;
}
