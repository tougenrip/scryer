"use client";

import { cn } from "@/lib/utils";

/**
 * Themed "parchment" surface. We keep the D&D-sourcebook *typography* (serif,
 * small-caps section heads, double-rule dividers) but swap the cream/burgundy
 * palette for the rest of the site's amber-on-dark theme so handouts and the
 * Quick Search detail view look at home with the chrome around them.
 */
export const PARCHMENT_BG = "bg-card text-foreground";

export const PARCHMENT_BORDER = "border border-amber-500/30";

export function ParchmentTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={cn(
        "font-serif text-2xl font-bold tracking-wide text-amber-400",
        className
      )}
      style={{ fontVariant: "small-caps" }}
    >
      {children}
    </h2>
  );
}

export function ParchmentSection({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-2", className)}>
      {title && (
        <h3
          className="font-serif text-lg font-semibold text-amber-400 border-t-2 border-b border-amber-500/60 pt-1"
          style={{ fontVariant: "small-caps" }}
        >
          {title}
        </h3>
      )}
      {children}
    </section>
  );
}

export function ParchmentRule() {
  return <div className="h-px bg-amber-500/30 my-2" />;
}

export function ParchmentLabel({
  label,
  children,
}: {
  label: string;
  children?: React.ReactNode;
}) {
  return (
    <p className="text-sm font-serif">
      <span className="font-bold text-amber-400">{label}</span>
      {children !== undefined && (
        <span className="ml-1 text-foreground">{children}</span>
      )}
    </p>
  );
}

/**
 * Tailwind class string for tooltip surfaces. Site-themed: dark popover
 * background, amber accent border, serif body for D&D vibe.
 */
export const PARCHMENT_TOOLTIP_CLASS =
  "bg-popover text-popover-foreground border border-amber-500/40 shadow-lg font-serif";

/** Italic feature line: "**Trait Name.** description" */
export function ParchmentFeature({
  name,
  text,
}: {
  name: string;
  text: string;
}) {
  return (
    <p className="text-sm font-serif leading-relaxed">
      <span className="italic font-semibold text-amber-300">{name}.</span>{" "}
      <span className="text-foreground">{text}</span>
    </p>
  );
}
