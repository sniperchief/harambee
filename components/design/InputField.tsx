import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, forwardRef } from "react";

/**
 * Input Field (DESIGN.md › Components): white, 1.5px Oat border, 16px radius,
 * 16px padding, DM Sans 16/400, Char placeholder; focus turns the border ink.
 * (16px text also stops iOS Safari zooming into the field.)
 */
export function FieldShell({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label?: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      {(label || hint) && (
        <div>
          {label && (
            <label htmlFor={htmlFor} className="block text-[15px] font-medium">
              {label}
            </label>
          )}
          {hint && <p className="text-sm text-char">{hint}</p>}
        </div>
      )}
      {children}
      {error && <FormMessage>{error}</FormMessage>}
    </div>
  );
}

export const InputField = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function InputField({ className = "", ...props }, ref) {
    return <input ref={ref} {...props} className={`input-field ${className}`} />;
  }
);

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function TextAreaField({ className = "", ...props }, ref) {
    return <textarea ref={ref} {...props} className={`input-field min-h-[112px] resize-y ${className}`} />;
  }
);

const CHEVRON =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23000' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")";

export const SelectField = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function SelectField({ className = "", children, ...props }, ref) {
    return (
      <select
        ref={ref}
        {...props}
        className={`input-field cursor-pointer appearance-none bg-no-repeat pr-12 ${className}`}
        style={{ backgroundImage: CHEVRON, backgroundPosition: "right 16px center" }}
      >
        {children}
      </select>
    );
  }
);

/** Money entry: DM Mono figure with a $ prefix and a USDC suffix tag. */
export const AmountField = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { suffix?: string }>(
  function AmountField({ className = "", suffix = "USDC", ...props }, ref) {
    return (
      <div className="relative flex items-center">
        <span className="type-mono pointer-events-none absolute left-4 text-char">$</span>
        <input
          ref={ref}
          inputMode="decimal"
          {...props}
          className={`input-field type-mono pl-9 pr-24 ${className}`}
          style={{ fontSize: 24 }}
        />
        <span className="tag tag--cream pointer-events-none absolute right-3">{suffix}</span>
      </div>
    );
  }
);

/** Form-level message. No red: the state is carried by an ink rule + glyph. */
export function FormMessage({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p role="alert" className={`flex items-start gap-2 border-l-[3px] border-ink-black pl-3 text-sm font-medium ${className}`}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="mt-0.5 shrink-0" aria-hidden>
        <circle cx="12" cy="12" r="9.5" />
        <path d="M12 7.5v5.5M12 16.5h.01" />
      </svg>
      <span>{children}</span>
    </p>
  );
}
