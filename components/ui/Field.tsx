import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, forwardRef } from "react";

// text-base (16px) is deliberate: iOS Safari auto-zooms into any input with a
// font smaller than 16px. Keeping controls at 16px prevents that zoom.
const CONTROL =
  "w-full rounded-[12px] border border-line bg-surface px-3.5 text-base text-ink " +
  "placeholder:text-muted/70 transition-colors duration-150 " +
  "hover:border-line-strong focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10 " +
  "disabled:opacity-60";

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  className = "",
}: {
  label?: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs font-medium text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = "", ...props }, ref) {
    return <input ref={ref} {...props} className={`${CONTROL} h-11 ${className}`} />;
  }
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className = "", ...props }, ref) {
    return <textarea ref={ref} {...props} className={`${CONTROL} py-2.5 min-h-[92px] resize-y ${className}`} />;
  }
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className = "", children, ...props }, ref) {
    return (
      <select ref={ref} {...props} className={`${CONTROL} h-11 cursor-pointer appearance-none bg-[right_0.75rem_center] bg-no-repeat pr-9 ${className}`} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}>
        {children}
      </select>
    );
  }
);

/** Money input with a currency affix, e.g. $ [ 100.00 ] USDC */
export const AmountInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { suffix?: string }>(
  function AmountInput({ className = "", suffix = "USDC", ...props }, ref) {
    return (
      <div className="relative flex items-center">
        <span className="pointer-events-none absolute left-4 text-lg font-semibold text-muted">$</span>
        <input
          ref={ref}
          inputMode="decimal"
          {...props}
          className={`${CONTROL} h-14 pl-9 pr-16 text-2xl font-semibold tnum ${className}`}
        />
        <span className="pointer-events-none absolute right-4 text-sm font-semibold text-muted">{suffix}</span>
      </div>
    );
  }
);
