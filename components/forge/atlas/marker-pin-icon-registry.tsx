"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { LocationMarker } from "@/hooks/useForgeContent";
import {
  Axe,
  FlaskConical,
  MoonStar,
  Star,
  Sword,
  Flag,
  Sparkles,
  ChefHat,
  GraduationCap,
  Swords,
  Gem,
  ScrollText,
  ClipboardList,
  Building,
  Home,
  Castle,
  Fence,
  UtensilsCrossed,
  Store,
  Church,
  DoorOpen,
  TreePine,
  Landmark,
  Anchor,
  Shield,
  Tent,
  Moon,
  Orbit,
  Flame,
  Skull,
  Wand2,
  AlertTriangle,
  Bomb,
  BookOpen,
  Circle,
  Square,
  Diamond,
  Globe,
  Warehouse,
} from "lucide-react";

export type MarkerPinIconComponent = React.ComponentType<{
  className?: string;
  style?: React.CSSProperties;
}>;

/** How to render a Lucide glyph: hybrid = solid fill + line art on top; stroke = outline-first (keeps windows, eyes, tines, etc.). Default is stroke — hybrid is opt-in where fills read well. */
type MarkerPinRenderMode = "hybrid" | "stroke";

const PICKER_GLYPH_COLOR = "#f4f4f5";

/** Default line weight on the stroke layer in hybrid mode, and fallback for stroke-only mode. */
export const MARKER_LUCIDE_OUTLINE_PX = 2;

/** Minimum stroke width when the icon is stroke-only (line-art icons stay legible at small sizes). */
const MARKER_LUCIDE_STROKE_ONLY_MIN_PX = 2.25;

type LucideIconLike = React.ComponentType<
  React.ComponentProps<typeof Building>
>;

function wrapLucideIcon(
  Icon: LucideIconLike,
  displayName: string,
  options?: { mode?: MarkerPinRenderMode }
): MarkerPinIconComponent {
  const mode: MarkerPinRenderMode = options?.mode ?? "stroke";

  const Wrapped: MarkerPinIconComponent = ({ className, style }) => {
    const s = style || {};
    const fillColor =
      (typeof s.fill === "string" && s.fill) ||
      (typeof s.color === "string" && s.color) ||
      PICKER_GLYPH_COLOR;
    const strokeColor =
      (typeof s.stroke === "string" && s.stroke) || fillColor;
    const raw = s.strokeWidth;
    const parsed =
      typeof raw === "number"
        ? raw
        : typeof raw === "string"
          ? parseFloat(raw)
          : NaN;
    const outlineW = Number.isFinite(parsed) && parsed > 0
      ? parsed
      : MARKER_LUCIDE_OUTLINE_PX;
    const { strokeWidth: _sw, fill: _f, stroke: _st, color: _c, ...restStyle } =
      s;

    if (mode === "stroke") {
      const strokeW = Math.max(outlineW, MARKER_LUCIDE_STROKE_ONLY_MIN_PX);
      return (
        <Icon
          className={cn(
            "h-7 w-7 shrink-0 leading-none [&_svg]:block",
            className
          )}
          size={24}
          fill="none"
          strokeWidth={strokeW}
          aria-hidden
          color={strokeColor}
          style={{
            ...restStyle,
            color: strokeColor,
            strokeLinejoin: "round",
            strokeLinecap: "round",
          }}
        />
      );
    }

    return (
      <span
        aria-hidden
        className={cn(
          "relative inline-flex h-7 w-7 shrink-0 items-center justify-center leading-none [&_svg]:block",
          className
        )}
        style={restStyle}
      >
        {/* Silhouette: fills closed paths; interior detail is drawn on the stroke layer above. */}
        <Icon
          className="pointer-events-none absolute inset-0 block h-full w-full [&_svg]:block"
          size={24}
          fill={fillColor}
          strokeWidth={0}
          color="transparent"
          style={{
            width: "100%",
            height: "100%",
            paintOrder: "normal",
          }}
        />
        {/* Line art: muntins, crosses, weapon edges, etc. stay as strokes on top. */}
        <Icon
          className="pointer-events-none absolute inset-0 block h-full w-full [&_svg]:block"
          size={24}
          fill="none"
          strokeWidth={outlineW}
          color={strokeColor}
          style={{
            width: "100%",
            height: "100%",
            paintOrder: "normal",
          }}
        />
      </span>
    );
  };
  Wrapped.displayName = displayName;
  return Wrapped;
}

/** Adventure / POI row — Lucide only. */
const Fantasy = {
  axe: wrapLucideIcon(Axe, "PinAxe", { mode: "hybrid" }),
  potion: wrapLucideIcon(FlaskConical, "PinPotion", { mode: "hybrid" }),
  moon_star: wrapLucideIcon(MoonStar, "PinMoonStar", { mode: "hybrid" }),
  star: wrapLucideIcon(Star, "PinStar", { mode: "hybrid" }),
  sword: wrapLucideIcon(Sword, "PinSword"),
  flag: wrapLucideIcon(Flag, "PinFlag", { mode: "hybrid" }),
  magic_shop: wrapLucideIcon(Sparkles, "PinMagicShop", { mode: "hybrid" }),
  butcher: wrapLucideIcon(ChefHat, "PinButcher", { mode: "hybrid" }),
  school: wrapLucideIcon(GraduationCap, "PinSchool", { mode: "hybrid" }),
  enemy: wrapLucideIcon(Swords, "PinEnemy"),
  loot: wrapLucideIcon(Gem, "PinLoot"),
  quest: wrapLucideIcon(ScrollText, "PinQuest"),
  side_quest: wrapLucideIcon(ClipboardList, "PinSideQuest"),
  castle: wrapLucideIcon(Castle, "PinCastle"),
  house: wrapLucideIcon(Home, "PinHouse"),
  globe: wrapLucideIcon(Globe, "PinGlobe", { mode: "hybrid" }),
};

const Places = {
  city: wrapLucideIcon(Building, "PinCity"),
  village: wrapLucideIcon(Warehouse, "PinVillage"),
  fort: wrapLucideIcon(Fence, "PinFort"),
  tavern: wrapLucideIcon(UtensilsCrossed, "PinTavern"),
  shop: wrapLucideIcon(Store, "PinShop"),
  temple: wrapLucideIcon(Church, "PinTemple"),
  dungeon: wrapLucideIcon(DoorOpen, "PinDungeon"),
  cave: wrapLucideIcon(TreePine, "PinCave", { mode: "hybrid" }),
  landmark: wrapLucideIcon(Landmark, "PinLandmark", { mode: "hybrid" }),
  port: wrapLucideIcon(Anchor, "PinPort", { mode: "hybrid" }),
  border: wrapLucideIcon(Shield, "PinBorder", { mode: "hybrid" }),
};

const Rpg = {
  camp: wrapLucideIcon(Tent, "PinCamp"),
  rest: wrapLucideIcon(Moon, "PinRest"),
  portal: wrapLucideIcon(Orbit, "PinPortal"),
  dragon: wrapLucideIcon(Flame, "PinDragon", { mode: "hybrid" }),
  lair: wrapLucideIcon(Skull, "PinLair"),
  arcane: wrapLucideIcon(Wand2, "PinArcane", { mode: "hybrid" }),
  hazard: wrapLucideIcon(AlertTriangle, "PinHazard", { mode: "hybrid" }),
  trap: wrapLucideIcon(Bomb, "PinTrap"),
  shrine: wrapLucideIcon(BookOpen, "PinShrine"),
};

const Shapes = {
  sphere: wrapLucideIcon(Circle, "PinSphere"),
  shape_square: wrapLucideIcon(Square, "PinShapeSquare"),
  shape_diamond: wrapLucideIcon(Diamond, "PinShapeDiamond"),
};

export const MARKER_PIN_ICONS: Record<
  NonNullable<LocationMarker["icon_type"]>,
  { icon: MarkerPinIconComponent; label: string }
> = {
  axe: { icon: Fantasy.axe, label: "Axe" },
  potion: { icon: Fantasy.potion, label: "Potion" },
  moon_star: { icon: Fantasy.moon_star, label: "Moon & stars" },
  star: { icon: Fantasy.star, label: "Star" },
  sword: { icon: Fantasy.sword, label: "Sword" },
  flag: { icon: Fantasy.flag, label: "Flag" },
  magic_shop: { icon: Fantasy.magic_shop, label: "Magic shop" },
  butcher: { icon: Fantasy.butcher, label: "Butcher" },
  school: { icon: Fantasy.school, label: "School" },
  enemy: { icon: Fantasy.enemy, label: "Enemy" },
  loot: { icon: Fantasy.loot, label: "Loot" },
  quest: { icon: Fantasy.quest, label: "Quest" },
  side_quest: { icon: Fantasy.side_quest, label: "Side quest" },
  castle: { icon: Fantasy.castle, label: "Castle" },
  house: { icon: Fantasy.house, label: "House" },
  globe: { icon: Fantasy.globe, label: "Globe" },
  sphere: { icon: Shapes.sphere, label: "Circle" },
  shape_square: { icon: Shapes.shape_square, label: "Square" },
  shape_diamond: { icon: Shapes.shape_diamond, label: "Diamond" },
  city: { icon: Places.city, label: "City" },
  village: { icon: Places.village, label: "Village" },
  fort: { icon: Places.fort, label: "Fort" },
  tavern: { icon: Places.tavern, label: "Tavern" },
  shop: { icon: Places.shop, label: "Shop & trade" },
  temple: { icon: Places.temple, label: "Temple" },
  dungeon: { icon: Places.dungeon, label: "Dungeon" },
  cave: { icon: Places.cave, label: "Wilds / cave" },
  landmark: { icon: Places.landmark, label: "Landmark" },
  port: { icon: Places.port, label: "Port" },
  border: { icon: Places.border, label: "Border / wall" },
  camp: { icon: Rpg.camp, label: "Camp" },
  portal: { icon: Rpg.portal, label: "Portal" },
  dragon: { icon: Rpg.dragon, label: "Dragon" },
  lair: { icon: Rpg.lair, label: "Monster lair" },
  arcane: { icon: Rpg.arcane, label: "Arcane site" },
  hazard: { icon: Rpg.hazard, label: "Hazard" },
  trap: { icon: Rpg.trap, label: "Trap" },
  rest: { icon: Rpg.rest, label: "Rest / haven" },
  shrine: { icon: Rpg.shrine, label: "Shrine / lore" },
};

export const MARKER_PIN_ICON_MAP: Record<
  NonNullable<LocationMarker["icon_type"]>,
  MarkerPinIconComponent
> = Object.fromEntries(
  Object.entries(MARKER_PIN_ICONS).map(([k, v]) => [k, v.icon])
) as Record<NonNullable<LocationMarker["icon_type"]>, MarkerPinIconComponent>;

export const MARKER_PIN_ICON_ORDER: NonNullable<LocationMarker["icon_type"]>[] = [
  "axe",
  "potion",
  "moon_star",
  "star",
  "sword",
  "flag",
  "magic_shop",
  "butcher",
  "school",
  "enemy",
  "loot",
  "quest",
  "side_quest",
  "castle",
  "house",
  "globe",
  "camp",
  "rest",
  "portal",
  "dragon",
  "lair",
  "arcane",
  "hazard",
  "trap",
  "shrine",
  "city",
  "village",
  "fort",
  "tavern",
  "shop",
  "temple",
  "dungeon",
  "cave",
  "landmark",
  "port",
  "border",
];
