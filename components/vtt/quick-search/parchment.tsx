"use client";

import { cn } from "@/lib/utils";

/**
 * Shared parchment styling — D&D 5e statblock vibe.
 * Cream background, burgundy serif headers with double rule, dark brown ink.
 */
export const PARCHMENT_BG =
  "bg-[linear-gradient(180deg,#f5ecd7_0%,#efe2c0_100%)] text-[#2b1d10]";

export const PARCHMENT_BORDER = "border border-[#7a1f1f]/30";

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
        "font-serif text-2xl font-bold tracking-wide text-[#7a1f1f]",
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
          className="font-serif text-lg font-semibold text-[#7a1f1f] border-t-2 border-b border-[#7a1f1f]/60 pt-1"
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
  return <div className="h-px bg-[#7a1f1f]/40 my-2" />;
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
      <span className="font-bold text-[#7a1f1f]">{label}</span>
      {children !== undefined && (
        <span className="ml-1 text-[#2b1d10]">{children}</span>
      )}
    </p>
  );
}

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
      <span className="italic font-semibold">{name}.</span>{" "}
      <span className="text-[#2b1d10]">{text}</span>
    </p>
  );
}
