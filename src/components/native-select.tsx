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
    <div className={cn("flex flex-col gap-1", className)}>
      <label htmlFor={id} className="text-muted-foreground text-xs font-medium">
        {label}
      </label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-8 rounded-lg border px-2 text-sm outline-none focus-visible:ring-3 disabled:opacity-50"
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
