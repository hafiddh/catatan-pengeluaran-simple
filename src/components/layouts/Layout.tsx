import "@/assets/styles/style.css";
import showToast from "@/lib/simpleToast";
import { FileText, Home, List, LogOut, Moon, Sun, User } from "lucide-react";
import React, { useEffect, useState } from "react";

export type LayoutProps = {
  title: string;
  description?: string;
  children?: React.ReactNode;
};

export default function Layout({ title, description, children }: LayoutProps) {
  const [profileSrc, setProfileSrc] = useState<string>("");
  const [isDark, setIsDark] = useState<boolean>(false);
  const [allowed, setAllowed] = useState<boolean | null>(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("auth_user");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.picture) setProfileSrc(parsed.picture);
      } else {
        const pic = localStorage.getItem("auth_user.picture");
        if (pic) setProfileSrc(pic);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    document.title = `${title} - Pencatatan Pengeluaran`;
    if (description) {
      const meta = document.querySelector('meta[name="description"]');
      if (meta) meta.setAttribute("content", description);
    }
  }, [title, description]);

  useEffect(() => {
    try {
      const storageKey = "theme-preference";
      const root =
        typeof document !== "undefined" ? document.documentElement : null;
      if (!root) return;

      const applyTheme = (nextIsDark: boolean) => {
        try {
          root.classList.toggle("dark", nextIsDark);
          root.setAttribute("data-theme", nextIsDark ? "dark" : "light");
        } catch {}
        setIsDark(nextIsDark);
      };

      const saved = (() => {
        try {
          return localStorage.getItem(storageKey);
        } catch {
          return null;
        }
      })();

      const mq =
        window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");

      if (saved === "dark" || saved === "light") {
        applyTheme(saved === "dark");
        return;
      }

      const initial = mq ? mq.matches : false;
      applyTheme(initial);

      const listener = (e: MediaQueryListEvent | MediaQueryList) => {
        try {
          applyTheme((e as any).matches);
        } catch {}
      };

      try {
        if (mq) {
          if ((mq as MediaQueryList).addEventListener) {
            (mq as MediaQueryList).addEventListener("change", listener as any);
          } else {
            (mq as MediaQueryList).addListener(listener as any);
          }
        }
      } catch {}

      return () => {
        try {
          if (mq) {
            if ((mq as MediaQueryList).removeEventListener) {
              (mq as MediaQueryList).removeEventListener(
                "change",
                listener as any,
              );
            } else {
              (mq as MediaQueryList).removeListener(listener as any);
            }
          }
        } catch {}
      };
    } catch {}
  }, []);

  const handleLogout = () => {
    try {
      try {
        localStorage.clear();
      } catch {}
      try {
        const cookies = document.cookie ? document.cookie.split(";") : [];
        cookies.forEach(function (c) {
          const eqPos = c.indexOf("=");
          const name = eqPos > -1 ? c.substr(0, eqPos).trim() : c.trim();
          if (!name) return;
          document.cookie =
            name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
          try {
            const host = location.hostname;
            document.cookie =
              name +
              "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" +
              host;
            if (host && host.indexOf(".") !== -1) {
              document.cookie =
                name +
                "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=." +
                host;
            }
          } catch (err) {}
        });
      } catch (err) {}
    } catch {}
    try {
      window.location.href = "/";
    } catch {}
  };

  const handleComingSoonPage = () => {
    showToast("Halaman belum dibuat", { type: "info" });
  };

  useEffect(() => {
    try {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("auth_token")
          : null;
      if (token) setAllowed(true);
      else {
        setAllowed(false);
        try {
          window.location.href = "/";
        } catch {}
      }
    } catch {
      setAllowed(false);
      try {
        window.location.href = "/";
      } catch {}
    }
  }, []);

  if (allowed === null) return null;

  return (
    <div>
      <main className="flex items-center justify-center">
        <div
          className="relative max-w-full sm:max-w-xl mx-auto w-full px-4"
          style={{
            maxHeight: "calc(100vh - (72px + env(safe-area-inset-bottom)))",
            overflow: "auto",
          }}
        >
          {children}
        </div>
      </main>

      <button
        type="button"
        id="theme-toggle"
        aria-label="Toggle theme"
        className="fixed right-4 sm:right-10 top-6 sm:top-10 z-60 theme-toggle"
        onClick={() => {
          try {
            const root =
              typeof document !== "undefined" ? document.documentElement : null;
            const nextIsDark = !isDark;
            if (root) {
              root.classList.toggle("dark", nextIsDark);
              root.setAttribute("data-theme", nextIsDark ? "dark" : "light");
            }
            localStorage.setItem(
              "theme-preference",
              nextIsDark ? "dark" : "light",
            );
            setIsDark(nextIsDark);
          } catch {}
        }}
      >
        {isDark ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
      </button>

      {/* Mobile bottom bar (always visible) */}
      {/* spacer so floating elements don't overlap main content on small screens */}
      <div aria-hidden="true" className="h-20 sm:h-24" />

      <nav
        aria-label="Bottom navigation"
        className="fixed left-0 right-0 bottom-0 z-50 px-2 sm:px-4 py-3"
      >
        <div className="relative max-w-full sm:max-w-xl mx-auto">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-3 sm:px-4 py-2 flex items-center justify-between shadow-lg">
            <a href="/dashboard" className="flex-1 text-center">
              <div className="text-center">
                <Home className="w-6 h-6 mx-auto" />
                <div className="text-xs">Dashboard</div>
              </div>
            </a>

            <button
              type="button"
              onClick={handleComingSoonPage}
              className="flex-1 text-center pr-6  cursor-pointer"
            >
              <div>
                <List className="w-6 h-6 mx-auto" />
                <div className="text-xs">List</div>
              </div>
            </button>

            <div className="absolute left-1/2 transform -translate-x-1/2 -top-8">
              <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-slate-800 border-4 border-white dark:border-slate-900 overflow-hidden flex items-center justify-center">
                {profileSrc ? (
                  // eslint-disable-next-line jsx-a11y/img-redundant-alt
                  <img
                    src={profileSrc}
                    alt="profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-8 h-8 text-gray-600 dark:text-slate-300" />
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleComingSoonPage}
              className="flex-1 text-center pl-6  cursor-pointer"
            >
              <div>
                <FileText className="w-6 h-6 mx-auto" />
                <div className="text-xs">Laporan</div>
              </div>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="flex-1 text-center cursor-pointer"
            >
              <div>
                <LogOut className="w-6 h-6 mx-auto" />
                <div className="text-xs">Logout</div>
              </div>
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
}
