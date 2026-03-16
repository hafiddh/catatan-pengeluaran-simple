export type AuthUser = {
  id?: string;
  email?: string;
  name?: string;
  picture?: string;
};

export type AuthSessionPayload = {
  token?: string;
  access_token?: string;
  refresh_token?: string;
  user?: AuthUser;
  token_type?: string;
  expires_in?: number;
  refresh_expires_in?: number;
};

const ACCESS_TOKEN_KEY = "auth_token";
const REFRESH_TOKEN_KEY = "auth_refresh_token";
const USER_KEY = "auth_user";
const USER_PICTURE_KEY = "auth_user.picture";

function getStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export function getStoredAccessToken(): string {
  const storage = getStorage();
  if (!storage) return "";
  return storage.getItem(ACCESS_TOKEN_KEY) || "";
}

export function getStoredRefreshToken(): string {
  const storage = getStorage();
  if (!storage) return "";
  return storage.getItem(REFRESH_TOKEN_KEY) || "";
}

export function getStoredUser(): AuthUser | null {
  const storage = getStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(USER_KEY);
    if (raw) return JSON.parse(raw) as AuthUser;
  } catch {
    // ignore malformed storage
  }

  const picture = storage.getItem(USER_PICTURE_KEY) || "";
  return picture ? { picture } : null;
}

export function hasStoredAuth(): boolean {
  return Boolean(getStoredAccessToken() || getStoredRefreshToken());
}

export function storeAuthSession(payload: AuthSessionPayload): void {
  const storage = getStorage();
  if (!storage) return;

  const accessToken = payload.access_token || payload.token || "";
  const refreshToken = payload.refresh_token || "";

  if (accessToken) {
    storage.setItem(ACCESS_TOKEN_KEY, accessToken);
  }

  if (refreshToken) {
    storage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }

  if (payload.user) {
    storage.setItem(USER_KEY, JSON.stringify(payload.user));
    if (payload.user.picture) {
      storage.setItem(USER_PICTURE_KEY, payload.user.picture);
    } else {
      storage.removeItem(USER_PICTURE_KEY);
    }
  }
}

export function clearAuthSession(): void {
  const storage = getStorage();
  if (!storage) return;

  storage.removeItem(ACCESS_TOKEN_KEY);
  storage.removeItem(REFRESH_TOKEN_KEY);
  storage.removeItem(USER_KEY);
  storage.removeItem(USER_PICTURE_KEY);
}

export function resolveAccessToken(preferredToken?: string): string {
  return getStoredAccessToken() || preferredToken || "";
}