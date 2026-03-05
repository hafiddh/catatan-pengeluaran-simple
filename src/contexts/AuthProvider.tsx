import React, { createContext, useContext, useEffect, useState } from "react";

type AuthUser = {
  id?: string;
  name?: string;
  email?: string;
  picture?: string;
};

const AuthContext = createContext<{ user: AuthUser | null } | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("auth_user");
      if (raw) {
        setUser(JSON.parse(raw));
        return;
      }
      const pic = localStorage.getItem("auth_user.picture");
      if (pic) setUser({ picture: pic });
    } catch {
      // ignore
    }
  }, []);

  return <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
