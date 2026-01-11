export default function VttLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // VTT is meant to be standalone - no navbar, sidebar, or container
  return <>{children}</>;
}

