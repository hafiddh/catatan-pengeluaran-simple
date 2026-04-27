import type { ExpenseType } from "@/service/expense-types";
import {
  CigaretteIcon,
  CookingPot,
  FileText,
  Film,
  Gamepad,
  ShoppingCart,
  Tag,
  Truck,
} from "lucide-react";

type ExpenseTypePillsProps = {
  items: ExpenseType[];
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  className?: string;
};

export function getExpenseTypeIcon(
  iconName: string | null | undefined,
  label?: string,
) {
  const key = (iconName || label || "").toString().toLowerCase();
  if (
    key.includes("belanj") ||
    key.includes("shopping") ||
    key.includes("shopping-cart")
  )
    return <ShoppingCart className="w-4 h-4" />;
  if (key.includes("game")) return <Gamepad className="w-4 h-4" />;
  if (key.includes("hibur")) return <Film className="w-4 h-4" />;
  if (key.includes("makan")) return <CookingPot className="w-4 h-4" />;
  if (key.includes("tagihan")) return <FileText className="w-4 h-4" />;
  if (key.includes("mobil")) return <Truck className="w-4 h-4" />;
  if (key.includes("rokok")) return <CigaretteIcon className="w-4 h-4" />;
  return <Tag className="w-4 h-4" />;
}

export function ExpenseTypePills({
  items,
  value,
  onChange,
  disabled,
  className,
}: ExpenseTypePillsProps) {
  return (
    <div className={"flex flex-wrap justify-center gap-1.5 " + (className || "")}>
      {items.map((it) => {
        const selected = it.id === value;
        return (
          <button
            key={it.id}
            type="button"
            disabled={disabled}
            aria-pressed={selected}
            onClick={() => onChange(it.id)}
            className={
              "group inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold backdrop-blur-sm transition-all duration-300 ease-out disabled:cursor-not-allowed disabled:opacity-60 hover:cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-300/60 dark:focus:ring-slate-500/50 sm:text-sm " +
              (selected
                ? "-translate-y-0.5 border-white/70 bg-white/70 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_12px_28px_rgba(148,163,184,0.16)] dark:border-slate-600/80 dark:bg-slate-800/80 dark:text-white"
                : "border-white/45 bg-white/35 text-slate-700 hover:-translate-y-0.5 hover:bg-white/50 hover:text-slate-900 dark:border-slate-700/70 dark:bg-slate-900/35 dark:text-slate-200 dark:hover:bg-slate-800/45 dark:hover:text-slate-50")
            }
          >
            <span
              aria-hidden="true"
              className={
                "flex h-6 w-6 items-center justify-center rounded-full border leading-none transition-all duration-300 ease-out sm:h-7 sm:w-7 " +
                (selected
                  ? "border-slate-200 bg-white/90 text-slate-800 shadow-[0_8px_20px_rgba(148,163,184,0.18)] dark:border-slate-600/80 dark:bg-slate-700/70 dark:text-slate-100"
                  : "border-transparent bg-transparent text-current group-hover:border-white/35 group-hover:bg-white/20 dark:group-hover:border-slate-700/70 dark:group-hover:bg-slate-800/35")
              }
            >
              {getExpenseTypeIcon(it.icon, it.label)}
            </span>
            <span
              className={
                selected
                  ? "tracking-[0.01em] text-slate-700 dark:text-slate-100"
                  : "text-current"
              }
            >
              {it.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
