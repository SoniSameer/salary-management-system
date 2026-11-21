import { cn } from "cn";

export interface SelectOption {
  value: string;
  label: string;
}

interface NativeSelectProps {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * A labelled native <select>. Native controls are fully keyboard and screen
 * reader accessible, work on mobile, and need no extra dependency.
 */
export function NativeSelect({ label, value, options, onChange, disabled, className }: NativeSelectProps) {
  const id = `select-${label.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <div className={cn("flex min-w-[148px] flex-1 flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
        {label}
      </label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="border-input bg-background text-foreground focus-visible:border-ring focus-visible:ring-ring/30 h-10 w-full rounded-lg border px-3 text-sm shadow-sm outline-none transition-[border-color,box-shadow] duration-150 focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
