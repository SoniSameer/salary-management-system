interface LogoProps {
  size?: number;
  className?: string;
}

/**
 * Original Salary Management mark: three ascending payroll bars with a small
 * neutral coin cutout. No text is embedded, so it remains legible at 24px.
 */
export function Logo({ size = 32, className }: LogoProps) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      focusable="false"
    >
      <rect width="32" height="32" rx="9" fill="currentColor" />
      <path
        d="M8 22.5h16M9 18.5h5.5M17 18.5h6M9 14.5h5.5M17 14.5h6"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="12" cy="10" r="2.1" fill="white" />
      <path d="M12 7.2v5.6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}
