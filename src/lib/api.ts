import {
    clearAuthSession,
    getStoredAccessToken,
    getStoredRefreshToken,
    resolveAccessToken,
    storeAuthSession,
    type AuthSessionPayload,
} from "@/lib/auth-session";

export const API_BASE_URL = (
  import.meta.env.PUBLIC_API_BE_URL ??
  import.meta.env.PUBLIC_API_BASE_URL ??
  import.meta.env.API_BE_URL ??
  "http://localhost:3061"
)
  .toString()
  .replace(/\/+$/, "");

let refreshInFlight: Promise<string> | null = null;

async function parseMessage(response: Response): Promise<string> {
  try {
    const data = await response.clone().json();
    if (typeof data?.message === "string" && data.message.trim()) {
      return data.message;
    }
  } catch {
    // ignore non-json payload
  }

  return "";
}

function withAuthorization(
  init: RequestInit,
  token: string,
): RequestInit {
  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  return { ...init, headers };
}

export async function refreshAccessToken(): Promise<string> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    const refreshToken = getStoredRefreshToken();
    if (!refreshToken) {
      clearAuthSession();
      throw new Error("Sesi login berakhir, silakan login kembali");
    }

    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      const message =
        (await parseMessage(response)) ||
        "Refresh token tidak valid, silakan login kembali";
      clearAuthSession();
      throw new Error(message);
    }

    const payload = (await response.json()) as AuthSessionPayload;
    storeAuthSession(payload);

    const nextAccessToken = getStoredAccessToken();
    if (!nextAccessToken) {
      clearAuthSession();
      throw new Error("Access token baru tidak ditemukan");
    }

    return nextAccessToken;
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

export async function authorizedFetch(
  path: string,
  init: RequestInit = {},
  preferredToken?: string,
): Promise<Response> {
  let accessToken = resolveAccessToken(preferredToken);

  if (!accessToken && getStoredRefreshToken()) {
    accessToken = await refreshAccessToken();
  }

  if (!accessToken) {
    throw new Error("Anda belum login");
  }

  let response = await fetch(
    `${API_BASE_URL}${path}`,
    withAuthorization(init, accessToken),
  );

  const responseMessage = await parseMessage(response);
  if (response.status !== 401 || responseMessage !== "JWT tidak valid") {
    return response;
  }

  const nextAccessToken = await refreshAccessToken();
  response = await fetch(
    `${API_BASE_URL}${path}`,
    withAuthorization(init, nextAccessToken),
  );

  return response;
}

export async function getErrorMessage(
  response: Response,
  fallbackMessage: string,
): Promise<string> {
  return (await parseMessage(response)) || fallbackMessage;
}