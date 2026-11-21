import { Input } from "@/components/ui/input";

interface TextFieldProps {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  /** Id of a <datalist> that offers suggestions while still allowing new values. */
  list?: string;
  type?: "text" | "email" | "date";
  inputMode?: "numeric" | "text";
  autoComplete?: string;
  maxLength?: number;
}

/** A labelled input whose error is announced to screen readers and linked to the field. */
export function TextField({
  name,
  label,
  value,
  onChange,
  error,
  hint,
  list,
  type = "text",
  inputMode,
  autoComplete = "off",
  maxLength,
}: TextFieldProps) {
  const errorId = `${name}-error`;
  const hintId = `${name}-hint`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ");

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>
      <Input
        id={name}
        name={name}
        type={type}
        value={value}
        list={list}
        inputMode={inputMode}
        autoComplete={autoComplete}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={type === "date" ? "[&::-webkit-calendar-picker-indicator]:cursor-pointer" : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {hint && (
        <p id={hintId} className="text-muted-foreground text-xs">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
