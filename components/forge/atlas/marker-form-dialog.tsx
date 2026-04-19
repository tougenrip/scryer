"use client";

import { useState, useEffect } from "react";
import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/shared/rich-text-editor";
import { RichTextDisplay } from "@/components/shared/rich-text-display";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { 
  Search, 
  MapPin, 
  Building2, 
  Home, 
  Store, 
  Globe, 
  Mountain, 
  Flag,
  Castle,
  UtensilsCrossed,
  ShoppingBag,
  Church,
  DoorOpen,
  TreePine,
  Landmark,
  Anchor,
  Shield,
  Sword,
  Axe,
  FlaskConical,
  Gem,
  Circle,
  Diamond,
  Square,
  Star,
  Moon
} from "lucide-react";
import { LocationMarker, WorldLocation } from "@/hooks/useForgeContent";
import {
  CircleIcon,
  DiamondIcon,
  SquareIcon,
  TriangleIcon,
  TeardropIcon,
  BookmarkIcon,
  AxeIcon,
  PotionIcon,
  MoonStarIcon,
  StarIcon,
  SwordIcon,
  FlagIcon,
  CastleIcon,
  HouseIcon,
  GlobeIcon,
  MagicShopIcon,
  ButcherIcon,
  SchoolIcon,
  EnemyIcon,
  LootIcon,
  QuestIcon,
  SideQuestIcon,
} from "./marker-icons";
import { AtlasMarkerBackground } from "@/components/forge/atlas/atlas-marker-background";
import { markerIconCentroidNudgeY } from "@/components/forge/atlas/marker-layout";

interface MarkerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  marker: LocationMarker | null;
  clickedPosition: { x: number; y: number } | null;
  campaignId: string;
  locations: WorldLocation[];
  onSave: (data: {
    location_id?: string | null;
    background_shape?: LocationMarker['background_shape'];
    icon_type?: LocationMarker['icon_type'];
    status_icon?: LocationMarker['status_icon'];
    name: string;
    description?: string | null;
    color?: string;
    size?: LocationMarker['size'];
  }) => void;
  onDelete?: (markerId: string) => void;
  isDm?: boolean;
}

const getTypeIcon = (type: string) => {
  const iconMap: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
    world: Globe,
    continent: Mountain,
    region: Flag,
    kingdom: Flag,
    city: Building2,
    village: Home,
    settlement: Home,
    poi: Store,
  };
  return iconMap[type];
};

const getTypeLabel = (type: string): string => {
  const labelMap: Record<string, string> = {
    world: "World",
    continent: "Continent",
    region: "Region",
    kingdom: "Kingdom",
    city: "City",
    village: "Village",
    settlement: "Settlement",
    poi: "Point of Interest",
  };
  return labelMap[type] || type.charAt(0).toUpperCase() + type.slice(1);
};

// Background shapes (optional)
const backgroundShapes: Record<NonNullable<LocationMarker['background_shape']>, { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>, label: string }> = {
  teardrop: { icon: TeardropIcon, label: 'Map pin' },
  circle: { icon: CircleIcon, label: 'Circle' },
  diamond: { icon: DiamondIcon, label: 'Diamond' },
  square: { icon: SquareIcon, label: 'Square' },
  triangle: { icon: TriangleIcon, label: 'Triangle' },
  bookmark: { icon: BookmarkIcon, label: 'Bookmark' },
};

// Icon type definitions for marker icons - using filled, outlined style
const markerIcons: Record<NonNullable<LocationMarker['icon_type']>, { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>, label: string }> = {
  // Fantasy Icons
  axe: { icon: AxeIcon, label: 'Axe' },
  potion: { icon: PotionIcon, label: 'Potion' },
  moon_star: { icon: MoonStarIcon, label: 'Moon & Stars' },
  star: { icon: StarIcon, label: 'Star' },
  sword: { icon: SwordIcon, label: 'Sword' },
  flag: { icon: FlagIcon, label: 'Flag' },
  magic_shop: { icon: MagicShopIcon, label: 'Magic shop' },
  butcher: { icon: ButcherIcon, label: 'Butcher' },
  school: { icon: SchoolIcon, label: 'School' },
  enemy: { icon: EnemyIcon, label: 'Enemy' },
  loot: { icon: LootIcon, label: 'Loot' },
  quest: { icon: QuestIcon, label: 'Quest' },
  side_quest: { icon: SideQuestIcon, label: 'Side quest' },
  // Location Icons
  castle: { icon: CastleIcon, label: 'Castle' },
  house: { icon: HouseIcon, label: 'House' },
  globe: { icon: GlobeIcon, label: 'Globe' },
  // Special shapes
  sphere: { icon: GlobeIcon, label: 'Sphere' },
  shape_square: { icon: SquareIcon, label: 'Plain Square' },
  shape_diamond: { icon: DiamondIcon, label: 'Plain Diamond' },
  // Legacy icons (keeping for backward compatibility)
  city: { icon: Building2, label: 'City' },
  village: { icon: Home, label: 'Village' },
  fort: { icon: Castle, label: 'Fort' },
  tavern: { icon: UtensilsCrossed, label: 'Tavern' },
  shop: { icon: ShoppingBag, label: 'Shop' },
  temple: { icon: Church, label: 'Temple' },
  dungeon: { icon: DoorOpen, label: 'Dungeon' },
  cave: { icon: TreePine, label: 'Cave' },
  landmark: { icon: Landmark, label: 'Landmark' },
  port: { icon: Anchor, label: 'Port' },
  border: { icon: Shield, label: 'Border' },
};

/** Glyphs on dark picker tiles — solid light silhouettes (reference: white on charcoal cells, gold selected ring) */
const MARKER_PICKER_GLYPH_STYLE = {
  color: '#f4f4f5',
  fill: '#f4f4f5',
  stroke: '#f4f4f5',
  strokeWidth: 1.5,
  strokeLinejoin: 'round' as const,
  strokeLinecap: 'round' as const,
};

function markerPickerTileClass(isSelected: boolean, disabled?: boolean) {
  return cn(
    'rounded-md border transition-colors',
    'bg-muted/55 hover:bg-muted/80',
    isSelected
      ? 'border-primary shadow-none'
      : 'border-border/70 hover:border-border',
    disabled && 'opacity-50 cursor-not-allowed'
  );
}

interface BackgroundShapeSelectorProps {
  value: LocationMarker['background_shape'];
  onChange: (value: LocationMarker['background_shape']) => void;
  disabled?: boolean;
}

function BackgroundShapeSelector({ value, onChange, disabled }: BackgroundShapeSelectorProps) {
  const shapeOrder: LocationMarker['background_shape'][] = [
    'teardrop',
    'circle',
    'diamond',
    'square',
    'triangle',
    'bookmark',
  ];

  return (
    <div className="flex gap-1.5">
      <button
        type="button"
        onClick={() => !disabled && onChange(null)}
        disabled={disabled}
        className={cn(
          'flex items-center justify-center px-2 rounded-md border h-10',
          markerPickerTileClass(value === null, disabled)
        )}
        title="No Background"
      >
        <span className="text-xs font-medium text-zinc-100/90">None</span>
      </button>
      {shapeOrder.map((shape) => {
        const { icon: ShapeComponent, label } = backgroundShapes[shape!];
        const isSelected = value === shape;
        return (
          <button
            key={shape}
            type="button"
            onClick={() => !disabled && onChange(shape)}
            disabled={disabled}
            className={cn(
              'flex items-center justify-center p-1.5 rounded-md border h-10 w-10',
              markerPickerTileClass(isSelected, disabled)
            )}
            title={label}
          >
            <ShapeComponent className="h-5 w-5 shrink-0" style={MARKER_PICKER_GLYPH_STYLE} />
          </button>
        );
      })}
    </div>
  );
}

interface IconTypeSelectorProps {
  value: LocationMarker['icon_type'];
  onChange: (value: LocationMarker['icon_type']) => void;
  disabled?: boolean;
}

function IconTypeSelector({ value, onChange, disabled }: IconTypeSelectorProps) {
  // Order icons: fantasy icons first, then location icons, then legacy
  const iconOrder: NonNullable<LocationMarker['icon_type']>[] = [
    // Fantasy / adventure
    'axe',
    'potion',
    'moon_star',
    'star',
    'sword',
    'flag',
    'magic_shop',
    'butcher',
    'school',
    'enemy',
    'loot',
    'quest',
    'side_quest',
    // Location Icons
    'castle',
    'house',
    'globe',
    // Legacy icons
    'city',
    'village',
    'fort',
    'tavern',
    'shop',
    'temple',
    'dungeon',
    'cave',
    'landmark',
    'port',
    'border',
    // Basic shapes (often used as plain pins)
    'sphere',
    'shape_square',
    'shape_diamond',
  ];

  return (
    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
      {iconOrder
        .filter(iconType => markerIcons[iconType])
        .map((iconType) => {
          const { icon: IconComponent, label } = markerIcons[iconType];
          const isSelected = value === iconType;
          return (
            <button
              key={iconType}
              type="button"
              onClick={() => !disabled && onChange(iconType)}
              disabled={disabled}
              className={cn(
                'flex items-center justify-center p-2 aspect-square',
                markerPickerTileClass(isSelected, disabled)
              )}
              title={label}
            >
              <IconComponent
                className="h-7 w-7 shrink-0 text-zinc-100"
                style={MARKER_PICKER_GLYPH_STYLE}
              />
            </button>
          );
        })}
    </div>
  );
}

interface MarkerPreviewProps {
  backgroundShape: LocationMarker['background_shape'];
  iconType: LocationMarker['icon_type'];
  color: string;
  size: LocationMarker['size'];
}

function resolveMarkerInteriorFill(colorField: string): string {
  try {
    const o = JSON.parse(colorField) as { fill?: string };
    if (typeof o?.fill === 'string') return o.fill;
  } catch {
    /* plain hex or legacy */
  }
  return colorField?.trim() ? colorField : '#c9b882';
}

function resolveJsonIconOverride(colorField: string): string | undefined {
  try {
    const o = JSON.parse(colorField) as { icon?: string };
    if (typeof o?.icon === 'string') return o.icon;
  } catch {
    return undefined;
  }
  return undefined;
}

function MarkerPreview({ backgroundShape, iconType, color, size }: MarkerPreviewProps) {
  // Keep in sync with atlas-map.tsx marker sizePixels (container + icon ratio).
  const sizePixels = {
    small: 32,
    medium: 44,
    large: 56,
  };

  const iconSizePixels = {
    small: 10,
    medium: 13,
    large: 17,
  };

  const containerSize = sizePixels[size];
  const iconSize = iconSizePixels[size];
  const interiorFill = resolveMarkerInteriorFill(color);
  const jsonIcon = resolveJsonIconOverride(color);

  const IconComponent = iconType ? markerIcons[iconType].icon : null;
  const hasFrame = !!backgroundShape;
  const pinIconPx = Math.max(6, Math.round(iconSize * (hasFrame ? 0.9 : 1)));

  let wrapperOffsetY = 0;
  let backgroundOnlyOffsetY = 0;
  if (backgroundShape === 'triangle') wrapperOffsetY = -3;
  else if (backgroundShape === 'bookmark') backgroundOnlyOffsetY = 9;
  else if (backgroundShape === 'teardrop') backgroundOnlyOffsetY = 9;

  const iconCentroidNudgeY = markerIconCentroidNudgeY(
    backgroundShape,
    containerSize
  );

  const iconStyle: React.CSSProperties = hasFrame
    ? {
        width: pinIconPx,
        height: pinIconPx,
        color: jsonIcon ?? '#ffffff',
        fill: jsonIcon ?? '#ffffff',
        stroke: jsonIcon ?? '#ffffff',
        strokeWidth: 1,
        strokeLinejoin: 'round',
        strokeLinecap: 'round',
      }
    : {
        width: iconSize,
        height: iconSize,
        color: '#ffffff',
        fill: '#ffffff',
        stroke: '#0a0a0a',
        strokeWidth: 2.25,
        paintOrder: 'stroke fill',
        strokeLinejoin: 'round',
        strokeLinecap: 'round',
        filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.45))',
      };

  return (
    <div className="flex items-center justify-center p-4 bg-muted rounded-lg border min-h-[120px]">
      <div
        className="relative flex items-center justify-center"
        style={{ width: containerSize, height: containerSize }}
      >
        <div
          className="relative flex h-full w-full items-center justify-center"
          style={{
            transform:
              wrapperOffsetY !== 0 ? `translateY(${wrapperOffsetY}px)` : undefined,
          }}
        >
          {backgroundShape && (
            <div
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
              style={{
                transform:
                  backgroundOnlyOffsetY !== 0
                    ? `translateY(${backgroundOnlyOffsetY}px)`
                    : undefined,
              }}
            >
              <AtlasMarkerBackground
                shape={backgroundShape}
                fill={interiorFill}
                size={containerSize}
              />
            </div>
          )}
          {IconComponent ? (
            <div
              className="relative z-10 flex items-center justify-center"
              style={{
                transform:
                  iconCentroidNudgeY !== 0
                    ? `translateY(${iconCentroidNudgeY}px)`
                    : undefined,
              }}
            >
              <IconComponent style={iconStyle} />
            </div>
          ) : (
            <div className="relative z-10 flex items-center justify-center text-muted-foreground text-xs">
              No icon
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function MarkerFormDialog({
  open,
  onOpenChange,
  marker,
  clickedPosition,
  campaignId,
  locations,
  onSave,
  onDelete,
  isDm = false,
}: MarkerFormDialogProps) {
  const [backgroundShape, setBackgroundShape] = useState<LocationMarker['background_shape']>(marker?.background_shape || null);
  const [iconType, setIconType] = useState<LocationMarker['icon_type']>(marker?.icon_type || 'landmark');
  const [statusIcon, setStatusIcon] = useState<string>(marker?.status_icon || 'normal');
  const [isCustomStatus, setIsCustomStatus] = useState(false);
  const [customStatusText, setCustomStatusText] = useState('');
  const [name, setName] = useState(marker?.name || '');
  const [description, setDescription] = useState(marker?.description || '');
  const [color, setColor] = useState(marker?.color || '#c9b882');
  const [size, setSize] = useState<LocationMarker['size']>(marker?.size || 'medium');
  const [locationId, setLocationId] = useState<string | null>(marker?.location_id || null);
  const [locationSearch, setLocationSearch] = useState("");

  // Get the linked location
  const linkedLocation = locationId ? locations.find(loc => loc.id === locationId) : null;

  // Handle location selection - auto-populate marker data from location
  const handleLocationChange = (selectedLocationId: string | null) => {
    setLocationId(selectedLocationId);
    setLocationSearch(""); // Clear search after selection
    
    if (selectedLocationId) {
      const selectedLocation = locations.find(loc => loc.id === selectedLocationId);
      if (selectedLocation) {
        // Auto-populate marker fields from location
        setName(selectedLocation.name);
        setDescription(selectedLocation.description || '');
        
        // Auto-set icon type based on location type
        const typeToIconMap: Record<string, LocationMarker['icon_type']> = {
          'city': 'city',
          'village': 'village',
          'settlement': 'village',
          'poi': 'landmark',
          'fort': 'fort',
          'temple': 'temple',
          'port': 'port',
        };
        const suggestedIcon = typeToIconMap[selectedLocation.type] || 'landmark';
        setIconType(suggestedIcon);
        
        // Sync status from location if it exists
        if (selectedLocation.status) {
          const predefinedStatuses = ['normal', 'under_attack', 'celebrating', 'plague', 'trade_route', 'blockaded', 'at_war', 'prosperous', 'declining'];
          setIsCustomStatus(!predefinedStatuses.includes(selectedLocation.status));
          setStatusIcon(selectedLocation.status);
          setCustomStatusText(predefinedStatuses.includes(selectedLocation.status) ? '' : selectedLocation.status);
        }
      }
    }
  };

  useEffect(() => {
    if (marker) {
      setBackgroundShape(marker.background_shape || null);
      setIconType(marker.icon_type || 'landmark');
      
      // If marker is linked to a location, use location's status, otherwise use marker's status
      const linkedLocation = marker.location_id ? locations.find(loc => loc.id === marker.location_id) : null;
      const statusToUse = linkedLocation?.status || marker.status_icon || 'normal';
      
      const predefinedStatuses = ['normal', 'under_attack', 'celebrating', 'plague', 'trade_route', 'blockaded', 'at_war', 'prosperous', 'declining'];
      setIsCustomStatus(!predefinedStatuses.includes(statusToUse));
      setStatusIcon(statusToUse);
      setCustomStatusText(predefinedStatuses.includes(statusToUse) ? '' : statusToUse);
      setName(marker.name || '');
      setDescription(marker.description || '');
      setColor(marker.color || '#c9b882');
      setSize(marker.size || 'medium');
      setLocationId(marker.location_id || null);
    } else {
      setBackgroundShape(null);
      setIconType('landmark');
      setStatusIcon('normal');
      setIsCustomStatus(false);
      setCustomStatusText('');
      setName('');
      setDescription('');
      setColor('#c9b882');
      setSize('medium');
      setLocationId(null);
    }
    setLocationSearch(""); // Reset search when dialog state changes
  }, [marker, open, locations]);

  const handleSave = () => {
    if (!name.trim()) {
      return; // Name is required
    }
    if (!iconType) {
      return; // Icon is required
    }

    const finalStatus = isCustomStatus ? customStatusText : statusIcon;
    onSave({
      location_id: locationId,
      background_shape: backgroundShape,
      icon_type: iconType,
      status_icon: finalStatus || null,
      name: name.trim(),
      description: description.trim() || null,
      color,
      size,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {marker ? "Edit Marker" : "Add Marker"}
          </SheetTitle>
          <SheetDescription>
            {marker
              ? "Update the marker properties"
              : "Place a marker on the map"}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Linked Location Details */}
          {linkedLocation && (
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const IconComponent = getTypeIcon(linkedLocation.type);
                      return IconComponent ? (
                        <div className="h-8 w-8 text-muted-foreground shrink-0 flex items-center justify-center">
                          <IconComponent className="h-8 w-8" />
                        </div>
                      ) : null;
                    })()}
                    <div>
                      <h3 className="font-semibold text-lg">{linkedLocation.name}</h3>
                      <Badge variant="secondary" className="mt-1">
                        {getTypeLabel(linkedLocation.type)}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleLocationChange(null)}
                    className="h-8 px-2 text-xs"
                  >
                    Clear
                  </Button>
                </div>

                {linkedLocation.image_url && (
                  <div className="rounded-lg overflow-hidden border border-border">
                    <img
                      src={linkedLocation.image_url}
                      alt={linkedLocation.name}
                      className="w-full h-48 object-cover"
                    />
                  </div>
                )}

                {linkedLocation.description && (
                  <div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {linkedLocation.description}
                    </p>
                  </div>
                )}

                {linkedLocation.status && linkedLocation.status !== 'normal' && (
                  <div>
                    <Badge variant="outline" className="capitalize">
                      Status: {linkedLocation.status.replace('_', ' ')}
                    </Badge>
                  </div>
                )}
                <div className="text-xs text-muted-foreground pt-2 border-t">
                  This marker represents the location above. Fields below have been auto-filled from the location. Status is synced.
                </div>
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* Marker Form Fields */}
          {isDm || !marker ? (
            <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Marker Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Marker name"
                required
                disabled={!isDm && !!marker}
              />
            </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <RichTextEditor
                  id="description"
                  value={description}
                  onChange={setDescription}
                  placeholder="Marker description or notes"
                  campaignId={campaignId}
                  disabled={!isDm && !!marker}
                  compact
                  minHeight="80px"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Represent Location (Optional)</Label>
                <div className="space-y-2">
                  {locations.length > 5 && (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search locations to filter..."
                        value={locationSearch}
                        onChange={(e) => setLocationSearch(e.target.value)}
                        className="pl-10"
                        disabled={!isDm && !!marker}
                      />
                    </div>
                  )}
                  <Select
                    value={locationId || 'none'}
                    onValueChange={(value) => {
                      handleLocationChange(value === 'none' ? null : value);
                    }}
                    disabled={!isDm && !!marker}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No location">
                        {locationId 
                          ? `${locations.find(l => l.id === locationId)?.name || 'Unknown'} (${locations.find(l => l.id === locationId)?.type || 'unknown'})`
                          : "No location"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No location</SelectItem>
                      {locations
                        .filter(loc => 
                          !locationSearch || 
                          loc.name.toLowerCase().includes(locationSearch.toLowerCase()) ||
                          loc.type.toLowerCase().includes(locationSearch.toLowerCase())
                        )
                        .slice(0, 50) // Limit to 50 results for performance
                        .map((loc) => (
                          <SelectItem key={loc.id} value={loc.id}>
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium">{loc.name}</span>
                              <Badge variant="secondary" className="text-xs shrink-0 ml-2 capitalize">
                                {loc.type}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      {locations.filter(loc => 
                        locationSearch && (
                          loc.name.toLowerCase().includes(locationSearch.toLowerCase()) ||
                          loc.type.toLowerCase().includes(locationSearch.toLowerCase())
                        )
                      ).length === 0 && locationSearch && (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          No locations found matching "{locationSearch}"
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Marker Preview */}
              <div className="space-y-2">
                <Label>Preview</Label>
                <MarkerPreview
                  backgroundShape={backgroundShape}
                  iconType={iconType}
                  color={color}
                  size={size}
                />
              </div>

              {/* Background Shape */}
              <div className="space-y-2">
                <Label>Background Shape (Optional)</Label>
                <BackgroundShapeSelector
                  value={backgroundShape}
                  onChange={(value) => setBackgroundShape(value)}
                  disabled={!isDm && !!marker}
                />
              </div>

              {/* Icon Type */}
              <div className="space-y-2">
                <Label>Icon <span className="text-destructive">*</span></Label>
                <IconTypeSelector
                  value={iconType || 'landmark'}
                  onChange={(value) => setIconType(value as LocationMarker['icon_type'])}
                  disabled={!isDm && !!marker}
                />
              </div>

              {/* Color */}
              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="color"
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-10 w-20 cursor-pointer"
                    disabled={!isDm && !!marker}
                  />
                  <Input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="#c9b882"
                    className="flex-1"
                    disabled={!isDm && !!marker}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="size">Marker Size</Label>
                <Select
                  value={size}
                  onValueChange={(value) => setSize(value as LocationMarker['size'])}
                  disabled={!isDm && !!marker}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status-icon">Status</Label>
                <div className="space-y-2">
                  <Select
                    value={isCustomStatus ? 'custom' : (statusIcon || 'normal')}
                    onValueChange={(value) => {
                      if (value === 'custom') {
                        setIsCustomStatus(true);
                      } else {
                        setIsCustomStatus(false);
                        setStatusIcon(value);
                      }
                    }}
                    disabled={!isDm && !!marker}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="under_attack">Under Attack</SelectItem>
                      <SelectItem value="celebrating">Celebrating</SelectItem>
                      <SelectItem value="plague">Plague</SelectItem>
                      <SelectItem value="trade_route">Trade Route</SelectItem>
                      <SelectItem value="blockaded">Blockaded</SelectItem>
                      <SelectItem value="at_war">At War</SelectItem>
                      <SelectItem value="prosperous">Prosperous</SelectItem>
                      <SelectItem value="declining">Declining</SelectItem>
                      <SelectItem value="custom">Custom Status...</SelectItem>
                    </SelectContent>
                  </Select>
                  {isCustomStatus && (
                    <Input
                      id="custom-status"
                      type="text"
                      value={customStatusText}
                      onChange={(e) => setCustomStatusText(e.target.value)}
                      placeholder="Enter custom status"
                      disabled={!isDm && !!marker}
                    />
                  )}
                </div>
              </div>

            </div>
          ) : (
            /* Read-only view for non-DMs */
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <p className="text-sm py-2 px-3 bg-muted rounded-md">{marker.name || 'Unnamed marker'}</p>
              </div>
              {marker.description && (
                <div className="space-y-2">
                  <Label>Description</Label>
                  <div className="text-sm py-2 px-3 bg-muted rounded-md">
                    <RichTextDisplay content={marker.description} />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Icon Type</Label>
                  <p className="text-sm py-2 px-3 bg-muted rounded-md capitalize">{marker.icon_type?.replace('_', ' ') || 'landmark'}</p>
                </div>
                <div className="space-y-2">
                  <Label>Marker Size</Label>
                  <p className="text-sm py-2 px-3 bg-muted rounded-md capitalize">{marker.size || 'medium'}</p>
                </div>
              </div>
              {marker.status_icon && marker.status_icon !== 'normal' && (
                <div className="space-y-2">
                  <Label>Status</Label>
                  <p className="text-sm py-2 px-3 bg-muted rounded-md capitalize">
                    {marker.status_icon.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <SheetFooter className="flex-col-reverse sm:flex-row gap-2 sm:justify-between">
          {isDm ? (
            <>
              <div className="flex-1 flex justify-start">
                {marker && onDelete && (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      onDelete(marker.id);
                      onOpenChange(false);
                    }}
                    className="w-full sm:w-auto"
                  >
                    Delete Marker
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={!name.trim()} className="w-full sm:w-auto">
                  {marker ? "Update" : "Create"} Marker
                </Button>
              </div>
            </>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
              Close
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
