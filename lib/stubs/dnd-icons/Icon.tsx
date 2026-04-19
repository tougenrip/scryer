import * as React from "react";

type IconProps = React.SVGProps<SVGSVGElement> & { size?: number | string };

export function makeIcon(label: string) {
  const Component = ({ size = 24, className, ...rest }: IconProps) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-label={label}
      {...rest}
    >
      <circle cx="12" cy="12" r="9" />
      <text
        x="12"
        y="15"
        textAnchor="middle"
        fontSize="9"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fill="currentColor"
        stroke="none"
      >
        {label.slice(0, 2)}
      </text>
    </svg>
  );
  Component.displayName = label;
  return Component;
}
