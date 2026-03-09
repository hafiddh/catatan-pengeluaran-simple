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
    <div className={"flex flex-wrap gap-2 " + (className || "")}>
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
              "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed hover:cursor-pointer" +
              (selected
                ? " border-gray-900 bg-gray-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
                : " border-gray-300 bg-white text-gray-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100")
            }
          >
            <span aria-hidden="true" className="leading-none">
              {getExpenseTypeIcon(it.icon, it.label)}
            </span>
            <span>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}
