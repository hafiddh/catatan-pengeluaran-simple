import "@/assets/styles/style.css";
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
  const [pathname, setPathname] = useState<string>("");

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

  useEffect(() => {
    try {
      setPathname(window.location.pathname || "");
    } catch {
      setPathname("");
    }
  }, []);

  const navItemClass = (active: boolean, extraClassName = "") =>
    [
      "group relative flex min-w-0 flex-1 flex-col items-center justify-center rounded-2xl px-2 py-2.5 text-center transition-all duration-300 ease-out sm:px-3 sm:py-3",
      "focus:outline-none focus:ring-2 focus:ring-slate-300/60 dark:focus:ring-slate-500/50",
      active
        ? "-translate-y-0.5 bg-white/60 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_12px_28px_rgba(148,163,184,0.16)] dark:bg-slate-800/80 dark:text-white"
        : "text-slate-700 hover:bg-white/30 dark:text-slate-200 dark:hover:bg-slate-800/45",
      extraClassName,
    ].join(" ");

  const navIndicatorClass = (active: boolean) =>
    [
      "absolute left-1/2 top-1 h-0.5 w-8 -translate-x-1/2 rounded-full transition-all duration-300 ease-out sm:top-1.5 sm:w-10",
      active
        ? "scale-100 opacity-100 bg-black dark:bg-white"
        : "scale-75 opacity-0 bg-transparent shadow-none",
    ].join(" ");

  const navIconClass = (active: boolean) =>
    [
      "h-4.5 w-4.5 transition-all duration-300 ease-out sm:h-5 sm:w-5",
      active
        ? "scale-105 text-slate-800 drop-shadow-[0_0_10px_rgba(255,255,255,0.45)] dark:text-slate-100 dark:drop-shadow-[0_0_14px_rgba(226,232,240,0.35)]"
        : "text-current group-hover:text-slate-600 dark:group-hover:text-slate-100",
    ].join(" ");

  const navIconFrameClass = (active: boolean) =>
    [
      "mb-1 flex h-8 w-8 items-center justify-center rounded-full border transition-all duration-300 ease-out sm:mb-1.5 sm:h-9 sm:w-9",
      active
        ? "scale-105 border-slate-200 bg-white/90 shadow-[0_8px_20px_rgba(148,163,184,0.18)] dark:border-slate-600/80 dark:bg-slate-700/70"
        : "border-transparent bg-transparent group-hover:border-white/35 group-hover:bg-white/20 dark:group-hover:border-slate-700/70 dark:group-hover:bg-slate-800/35",
    ].join(" ");

  const navLabelClass = (active: boolean) =>
    [
      "text-[10px] leading-none transition-all duration-300 ease-out sm:text-xs",
      active
        ? "font-semibold tracking-[0.01em] text-slate-700 dark:text-slate-100"
        : "text-current",
    ].join(" ");

  if (allowed === null) return null;

  return (
    <div className="relative min-h-screen">
      <main className="relative z-0 flex items-center justify-center pb-28 sm:pb-32">
        <div
          className="relative mx-auto w-full max-w-full px-4 sm:max-w-xl"
          style={{
            // maxHeight: "calc(100vh - (72px + env(safe-area-inset-bottom)))",
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
        className="fixed right-2 top-2 z-60 inline-flex h-8 w-8 items-center justify-center rounded-2xl border border-white/45 bg-white/35 text-slate-800 shadow-[0_14px_36px_rgba(15,23,42,0.16)] backdrop-blur-2xl transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-white/50 hover:text-slate-700 dark:border-slate-700/70 dark:bg-slate-900/35 dark:text-slate-100 dark:hover:bg-slate-900/55 dark:hover:text-slate-50 sm:right-10 sm:top-10 supports-backdrop-filter:bg-white/25 dark:supports-backdrop-filter:bg-slate-900/25"
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
        {isDark ? (
          <Moon className="h-5 w-5 drop-shadow-[0_0_10px_rgba(226,232,240,0.3)]" />
        ) : (
          <Sun className="h-5 w-5 drop-shadow-[0_0_10px_rgba(255,255,255,0.45)]" />
        )}
      </button>

      <nav
        aria-label="Bottom navigation"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-70 px-4"
      >
        <div className="pointer-events-auto relative mx-auto max-w-full sm:max-w-xl">
          <div className="p-1.5 rounded-2xl border border-white/50 bg-white/38 shadow-[0_20px_50px_rgba(15,23,42,0.18)] backdrop-blur-xs supports-backdrop-filter:bg-white/24 dark:border-slate-700/70 dark:bg-slate-900/38 dark:supports-backdrop-filter:bg-slate-900/24 ">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
                <a
                  href="/dashboard"
                  aria-current={pathname === "/dashboard" ? "page" : undefined}
                  className={navItemClass(pathname === "/dashboard")}
                >
                  <span
                    className={navIndicatorClass(pathname === "/dashboard")}
                  />
                  <span
                    className={navIconFrameClass(pathname === "/dashboard")}
                  >
                    <Home className={navIconClass(pathname === "/dashboard")} />
                  </span>
                  <span className={navLabelClass(pathname === "/dashboard")}>
                    Dashboard
                  </span>
                </a>

                <a
                  href="/list"
                  aria-current={pathname === "/list" ? "page" : undefined}
                  className={navItemClass(pathname === "/list")}
                >
                  <span className={navIndicatorClass(pathname === "/list")} />
                  <span className={navIconFrameClass(pathname === "/list")}>
                    <List className={navIconClass(pathname === "/list")} />
                  </span>
                  <span className={navLabelClass(pathname === "/list")}>
                    List
                  </span>
                </a>
              </div>

              <div aria-hidden="true" className="h-full w-12 shrink-0" />

              <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
                <a
                  href="/laporan"
                  aria-current={pathname === "/laporan" ? "page" : undefined}
                  className={navItemClass(pathname === "/laporan")}
                >
                  <span
                    className={navIndicatorClass(pathname === "/laporan")}
                  />
                  <span className={navIconFrameClass(pathname === "/laporan")}>
                    <FileText
                      className={navIconClass(pathname === "/laporan")}
                    />
                  </span>
                  <span className={navLabelClass(pathname === "/laporan")}>
                    Laporan
                  </span>
                </a>

                <button
                  type="button"
                  onClick={handleLogout}
                  className={navItemClass(false, "cursor-pointer")}
                >
                  <span className={navIconFrameClass(false)}>
                    <LogOut className={navIconClass(false)} />
                  </span>
                  <span className={navLabelClass(false)}>Logout</span>
                </button>
              </div>
            </div>

            <div className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-[36%] transform transition-transform duration-300 ease-out">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-white/65 bg-white/40 p-0.5 shadow-[0_22px_45px_rgba(15,23,42,0.24)] backdrop-blur-2xl supports-backdrop-filter:bg-white/26 dark:border-slate-700/75 dark:bg-slate-900/40 dark:supports-backdrop-filter:bg-slate-900/24 sm:h-20 sm:w-20">
                <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border border-white/40 bg-slate-200/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] dark:border-slate-700/60 dark:bg-slate-800/75">
                  {profileSrc ? (
                    // eslint-disable-next-line jsx-a11y/img-redundant-alt
                    <img
                      src={profileSrc}
                      alt="profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="h-6 w-6 text-gray-600 dark:text-slate-300 sm:h-8 sm:w-8" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
}
