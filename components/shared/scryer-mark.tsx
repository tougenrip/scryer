interface ScryerMarkProps {
  size?: number;
  className?: string;
}

export function ScryerMark({ size = 24, className }: ScryerMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="sc-mark" x1="0" y1="0" x2="24" y2="24">
          <stop offset="0" stopColor="var(--primary)" />
          <stop
            offset="1"
            stopColor="color-mix(in srgb, var(--primary) 60%, var(--foreground))"
          />
        </linearGradient>
      </defs>
      <path
        d="M12 2 L20 7 V13 C20 17.5 16.5 21 12 22 C7.5 21 4 17.5 4 13 V7 Z"
        fill="url(#sc-mark)"
        opacity="0.18"
        stroke="var(--primary)"
        strokeWidth="1.2"
      />
      <circle
        cx="12"
        cy="11"
        r="3.5"
        stroke="var(--primary)"
        strokeWidth="1.4"
        fill="none"
      />
      <circle cx="12" cy="11" r="1.2" fill="var(--primary)" />
      <path
        d="M14.5 13.5 17 16"
        stroke="var(--primary)"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
