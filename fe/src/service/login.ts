import { API_BASE_URL } from "@/lib/api";

export type BackendUser = {
  id: string;
  email: string;
  name?: string;
  picture?: string;
};

export type BackendGoogleLoginResponse = {
  token: string;
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  refresh_expires_in: number;
  user: BackendUser;
};

export async function LoginWithGoogle(
  credential: string,
): Promise<BackendGoogleLoginResponse> {
  if (!credential) {
    throw new Error("Credential Google tidak ditemukan");
  }

  const res = await fetch(`${API_BASE_URL}/auth/google`, {
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
