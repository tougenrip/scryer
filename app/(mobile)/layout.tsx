import type { Viewport } from "next";

/**
 * Mobile companion route group. Bypasses the campaign sidebar/navbar
 * layouts — bare children render so the route can paint full-bleed
 * with its own bottom nav. Lives in a route group `(mobile)` so the
 * `/m/...` URL segment isn't polluted by the group folder.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  // Don't let users zoom into a tap-target accidentally and lose the
  // layout — companion is meant to be glance-and-tap.
  userScalable: false,
  themeColor: "#0a0a0a",
};

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 flex flex-col bg-neutral-950 text-foreground overflow-hidden">
      {children}
    </div>
  );
}
