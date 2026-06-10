import type { ReactNode } from "react";

/** 半透明のフローティングパネル */
export function Panel({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={
        "pointer-events-auto rounded-[10px] border border-black/10 bg-white/95 " +
        "shadow-[0_2px_12px_rgba(0,0,0,0.18)] backdrop-blur-sm " +
        className
      }
    >
      {children}
    </section>
  );
}

/** ラベル付きのコントロール群 */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold uppercase tracking-wide text-gray-500">{label}</span>
      {children}
    </div>
  );
}

export interface Option<T extends string> {
  value: T;
  label: string;
}

/** セグメント切替ボタン */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div className="flex overflow-hidden rounded-lg border border-gray-300" role="group" aria-label={ariaLabel}>
      {options.map((o, i) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={
              "flex-1 cursor-pointer px-1 py-1.5 text-[13px] transition-colors " +
              (i > 0 ? "border-l border-gray-300 " : "") +
              (active ? "bg-accent font-bold text-white" : "bg-white text-gray-800 hover:bg-accent-hover")
            }
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** セレクトボックス */
export function Select<T extends string>({
  options,
  value,
  onChange,
  disabled,
}: {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as T)}
      className="cursor-pointer rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-[13px] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/** チェックボックス トグル */
export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-[13px]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-[15px] w-[15px] accent-accent"
      />
      {label}
    </label>
  );
}
