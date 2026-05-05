export default function TestGraphPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6 text-center">
      <div>
        <h1 className="text-xl font-semibold">Relationship graph test route disabled</h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          This experimental route depended on an optional graph package that is not installed in
          this workspace. Use Forge relationship tools instead.
        </p>
      </div>
    </div>
  );
}
