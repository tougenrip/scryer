export type VttGridConfig = {
  pixelSize?: number;
  type?: "square" | "hex";
  feetPerSquare?: number;
  widthSquares?: number | null;
  heightSquares?: number | null;
  showGrid?: boolean;
};

export function parseGridConfig(raw: unknown): {
  pixelSize: number;
  gridType: "square" | "hex";
  feetPerSquare: number;
  widthSquares: number | null;
  heightSquares: number | null;
  showGrid: boolean;
} {
  const o = raw && typeof raw === "object" ? (raw as VttGridConfig) : {};
  const pixelSize =
    typeof o.pixelSize === "number" && o.pixelSize > 0 ? o.pixelSize : 50;
  const gridType = o.type === "hex" ? "hex" : "square";
  const feetPerSquare =
    typeof o.feetPerSquare === "number" && o.feetPerSquare > 0
      ? o.feetPerSquare
      : 5;
  const showGrid = typeof o.showGrid === "boolean" ? o.showGrid : true;
  return {
    pixelSize,
    gridType,
    feetPerSquare,
    widthSquares:
      typeof o.widthSquares === "number" ? o.widthSquares : null,
    heightSquares:
      typeof o.heightSquares === "number" ? o.heightSquares : null,
    showGrid,
  };
}

export function buildGridConfig(opts: {
  gridType: "square" | "hex";
  feetPerSquare: number;
  widthSquares: number | null;
  heightSquares: number | null;
  pixelSize?: number;
  showGrid?: boolean;
}): VttGridConfig {
  return {
    pixelSize: opts.pixelSize ?? 50,
    type: opts.gridType,
    feetPerSquare: opts.feetPerSquare,
    widthSquares: opts.widthSquares,
    heightSquares: opts.heightSquares,
    showGrid: opts.showGrid ?? true,
  };
}

/** Merge grid fields into existing JSON (keeps forge/sample_token keys, etc.). */
export function patchGridConfig(
  existing: unknown,
  patch: {
    pixelSize: number;
    gridType: "square" | "hex";
    feetPerSquare: number;
    showGrid: boolean;
  }
): Record<string, unknown> {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};
  base.pixelSize = patch.pixelSize;
  base.type = patch.gridType;
  base.feetPerSquare = patch.feetPerSquare;
  base.showGrid = patch.showGrid;
  return base;
}
