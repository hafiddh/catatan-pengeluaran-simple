import { useEffect, useRef, useState } from "react";

type AmountInputProps = {
  value: string; // raw numeric string (digits only)
  onChange: (next: string) => void; // emits raw numeric string
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  min?: number;
};

function formatRupiah(digits: string): string {
  if (!digits) return "Rp ";
  // remove leading zeros
  digits = digits.replace(/^0+(?=\d)/, "");
  const n = digits.replace(/\D/g, "");
  const parts: string[] = [];
  let i = n.length;
  while (i > 3) {
    parts.unshift(n.slice(i - 3, i));
    i -= 3;
  }
  parts.unshift(n.slice(0, i));
  return `Rp ${parts.join(".")}`;
}

export function AmountInput({
  value,
  onChange,
  placeholder,
  disabled,
  className,
  min,
}: AmountInputProps) {
  const [display, setDisplay] = useState<string>(() => formatRupiah(value || ""));
  const ref = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setDisplay(formatRupiah(value || ""));
  }, [value]);

  const handleChange = (raw: string) => {
    // extract digits only
    const digits = raw.replace(/\D/g, "");
    if (min !== undefined && digits !== "") {
      const num = Number(digits);
      if (!Number.isFinite(num) || num < (min ?? 0)) {
        // if below min, still allow display but do not emit negative values
      }
    }
    onChange(digits);
    setDisplay(formatRupiah(digits));
    // move cursor to end
    setTimeout(() => {
      try {
        const el = ref.current;
        if (el) el.setSelectionRange(el.value.length, el.value.length);
      } catch {
        // ignore
      }
    }, 0);
  };

  return (
    <input
      ref={ref}
      type="text"
      inputMode="numeric"
      disabled={disabled}
      className={
        "w-full rounded-2xl border border-white/45 bg-white/35 px-3.5 py-2.5 text-center font-bold text-slate-900 shadow-[0_14px_36px_rgba(15,23,42,0.08)] backdrop-blur-sm transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-slate-300/60 dark:border-slate-700/70 dark:bg-slate-900/35 dark:text-slate-100 dark:focus:ring-slate-500/50 supports-backdrop-filter:bg-white/25 dark:supports-backdrop-filter:bg-slate-900/25 " +
        (className || "")
      }
      value={display}
      onChange={(e) => handleChange(e.target.value)}
      onFocus={(e) => {
        // when focusing, keep caret at end
        setTimeout(() => {
          try {
            const el = ref.current;
            if (el) el.setSelectionRange(el.value.length, el.value.length);
          } catch {}
        }, 0);
      }}
      placeholder={placeholder ? `Rp ${placeholder}` : "Rp 0"}
    />
  );
}
