"use client";

import { useEffect, useId, useRef, useState } from "react";
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
  /** Text shown when no value has been selected yet. */
  placeholder?: string;
}

/**
 * Accessible custom select with pointer-enabled options. Native OS select menus
 * do not allow reliable CSS cursor styling for their option rows, so the listbox
 * is rendered in the app while preserving the labelled-control contract.
 */
export function NativeSelect({ label, value, options, onChange, disabled, className, placeholder = "Select an option" }: NativeSelectProps) {
  const generatedId = useId();
  const id = `select-${label.toLowerCase().replace(/\s+/g, "-")}`;
  const listboxId = `${id}-options-${generatedId.replace(/:/g, "")}`;
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);
  const displayLabel = selected?.label ?? (value ? value : placeholder);

  useEffect(() => {
    function close(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function select(option: SelectOption) {
    onChange(option.value);
    setOpen(false);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen((current) => !current);
      return;
    }
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if ((event.key === "ArrowDown" || event.key === "ArrowUp") && options.length > 0) {
      event.preventDefault();
      const index = Math.max(0, options.findIndex((option) => option.value === value));
      const next = event.key === "ArrowDown" ? Math.min(options.length - 1, index + 1) : Math.max(0, index - 1);
      select(options[next]);
    }
  }

  return (
    <div ref={rootRef} className={cn("relative flex min-w-[148px] flex-1 flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
        {label}
      </label>
      <button
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={label}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleKeyDown}
        className="border-input bg-background text-foreground focus-visible:border-ring focus-visible:ring-ring/30 flex h-10 w-full cursor-pointer items-center justify-between rounded-lg border px-3 pr-3 text-left text-sm shadow-sm outline-none transition-[border-color,box-shadow] duration-150 focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={`truncate ${selected ? "" : "text-muted-foreground"}`}>{displayLabel}</span>
        <svg aria-hidden="true" viewBox="0 0 20 20" className={`text-muted-foreground ml-2 size-4 shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.7">
          <path d="m5 7 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div id={listboxId} role="listbox" aria-label={`${label} options`} className="border-border bg-popover text-popover-foreground absolute top-full z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border p-1 shadow-lg [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              onClick={() => select(option)}
              className={`hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent flex w-full cursor-pointer items-center rounded-md px-3 py-2 text-left text-sm outline-none ${option.value === value ? "bg-primary/10 text-primary font-medium" : ""}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
