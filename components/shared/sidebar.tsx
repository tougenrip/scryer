"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  Home,
  Hammer,
  Image as ImageIcon,
  Grid3x3,
  Users,
  Settings,
  Crown,
  MapPin,
  User as UserIcon,
  Swords,
  Sparkles,
  Search,
  ChevronRight,
  ScrollText,
  Target,
  Clapperboard,
} from "lucide-react";
import { TweaksPanel, TweaksTrigger } from "./tweaks-panel";
import { useRole } from "@/contexts/role-context";
import {
  useWorldLocations,
  useFactions,
  usePantheonDeities,
  useScenes,
  type WorldLocation,
} from "@/hooks/useForgeContent";
import {
  useCampaignNPCs,
  useCampaignQuests,
  useCampaignBounties,
  useCampaignEncounters,
} from "@/hooks/useCampaignContent";

interface SidebarProps {
  campaignId: string;
  campaignName?: string;
}

const navItems = [
  { title: "Campaign",      href: "",               icon: Home },
  { title: "The Forge",     href: "/forge",         icon: Hammer },
  { title: "VTT",           href: "/vtt",           icon: Grid3x3 },
  { title: "Media Library", href: "/media-library", icon: ImageIcon },
];

type EntityType = "location" | "npc" | "faction" | "pantheon";

const SIDEBAR_WIDTH = 256;

export function CampaignSidebar({ campaignId, campaignName }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isDM } = useRole();

  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    locations: true,
    npcs: true,
    factions: false,
    pantheons: false,
    scenes: false,
    quests: false,
    bounties: false,
    encounters: false,
  });

  const basePath = `/campaigns/${campaignId}`;

  // Detect active entity from pathname
  const { currentEntityType, currentEntityId } = useMemo(() => {
    const match = pathname?.match(
      /\/campaigns\/[^/]+\/(locations|npcs|factions|pantheons)\/([^/]+)/,
    );
    if (!match)
      return {
        currentEntityType: null as EntityType | null,
        currentEntityId: null as string | null,
      };
    const map: Record<string, EntityType> = {
      locations: "location",
      npcs: "npc",
      factions: "faction",
      pantheons: "pantheon",
    };
    return { currentEntityType: map[match[1]], currentEntityId: match[2] };
  }, [pathname]);

  // Fetch content
  const { locations } = useWorldLocations(campaignId, isDM);
  const { npcs } = useCampaignNPCs(campaignId, isDM);
  const { factions } = useFactions(campaignId);
  const { deities } = usePantheonDeities(campaignId);
  const { scenes } = useScenes(campaignId);
  const { quests } = useCampaignQuests(campaignId);
  const { bounties } = useCampaignBounties(campaignId, isDM);
  const { encounters } = useCampaignEncounters(campaignId);

  const q = search.trim().toLowerCase();
  const matchesSearch = (name?: string | null, desc?: string | null) => {
    if (!q) return true;
    return (
      (name || "").toLowerCase().includes(q) ||
      (desc || "").toLowerCase().includes(q)
    );
  };

  const filteredLocations = useMemo(
    () => (locations || []).filter((l) => matchesSearch(l.name, l.description)),
    [locations, q],
  );
  const filteredNPCs = useMemo(
    () => (npcs || []).filter((n) => matchesSearch(n.name, n.description)),
    [npcs, q],
  );
  const filteredFactions = useMemo(
    () => (factions || []).filter((f) => matchesSearch(f.name, f.description)),
    [factions, q],
  );
  const filteredDeities = useMemo(
    () => (deities || []).filter((d) => matchesSearch(d.name, d.description)),
    [deities, q],
  );
  const filteredScenes = useMemo(
    () => (scenes || []).filter((s) => matchesSearch(s.name, s.description)),
    [scenes, q],
  );
  const filteredQuests = useMemo(
    () => (quests || []).filter((x) => matchesSearch(x.title, x.content)),
    [quests, q],
  );
  const filteredBounties = useMemo(
    () =>
      (bounties || []).filter((b) =>
        matchesSearch(b.title || b.target_name, b.description),
      ),
    [bounties, q],
  );
  const filteredEncounters = useMemo(
    () => (encounters || []).filter((e) => matchesSearch(e.name, null)),
    [encounters, q],
  );

  // Build hierarchical locations from filtered set
  const organizedLocations = useMemo(() => {
    const idSet = new Set(filteredLocations.map((l) => l.id));
    const roots: WorldLocation[] = [];
    const children = new Map<string, WorldLocation[]>();
    for (const loc of filteredLocations) {
      const parentInSet =
        loc.parent_location_id && idSet.has(loc.parent_location_id);
      if (!parentInSet) {
        roots.push(loc);
      } else {
        const list = children.get(loc.parent_location_id as string) || [];
        list.push(loc);
        children.set(loc.parent_location_id as string, list);
      }
    }
    return { roots, children };
  }, [filteredLocations]);

  const toggleSection = (key: string) =>
    setOpenSections((s) => ({ ...s, [key]: !s[key] }));

  const goto = (type: EntityType, id: string) => {
    const seg = type === "pantheon" ? "pantheons" : `${type}s`;
    router.push(`${basePath}/${seg}/${id}`);
  };

  const gotoScene = (sceneId: string) => {
    router.push(`${basePath}/scenes/${sceneId}/edit`);
  };

  const gotoForgeTab = (tab: string) => {
    router.push(`${basePath}/forge?tab=${tab}`);
  };

  const activeSceneId = useMemo(() => {
    const m = pathname?.match(/\/campaigns\/[^/]+\/scenes\/([^/]+)/);
    return m ? m[1] : null;
  }, [pathname]);

  const forgeTabParam = useMemo(() => {
    if (!pathname?.includes("/forge")) return null;
    return searchParams?.get("tab") || null;
  }, [pathname, searchParams]);

  const isEntityActive = (type: EntityType, id: string) =>
    currentEntityType === type && currentEntityId === id;

  const renderLocation = (loc: WorldLocation, level = 0): React.ReactNode => {
    const active = isEntityActive("location", loc.id);
    const kids = organizedLocations.children.get(loc.id) || [];
    return (
      <div key={loc.id}>
        <button
          type="button"
          onClick={() => goto("location", loc.id)}
          className={cn("sidebar-link sidebar-sublink", active && "active")}
          style={{ paddingLeft: 18 + level * 12 }}
        >
          <MapPin size={12} />
          <span className="truncate">{loc.name}</span>
        </button>
        {kids.map((child) => renderLocation(child, level + 1))}
      </div>
    );
  };

  const renderSectionHeader = (
    key: string,
    label: string,
    Icon: typeof MapPin,
    count: number,
  ) => {
    const open = openSections[key];
    return (
      <button
        type="button"
        onClick={() => toggleSection(key)}
        className="sidebar-section-header"
      >
        <ChevronRight
          size={12}
          style={{
            transition: "transform 120ms",
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
            flexShrink: 0,
          }}
        />
        <Icon size={13} />
        <span style={{ flex: 1, textAlign: "left" }}>{label}</span>
        {count > 0 && (
          <span
            style={{
              fontSize: 10.5,
              opacity: 0.55,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {count}
          </span>
        )}
      </button>
    );
  };

  return (
    <>
      <nav
        style={{
          width: SIDEBAR_WIDTH,
          background: "var(--sidebar)",
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          height: "100%",
        }}
      >
        {/* Icon-only template rail */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            padding: "8px 10px",
            borderBottom: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          {navItems.map((item) => {
            const href = `${basePath}${item.href}`;
            const isActive =
              item.href === ""
                ? pathname === href || pathname === `${href}/`
                : pathname === href || pathname?.startsWith(`${href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={href}
                title={item.title}
                aria-label={item.title}
                className={cn("sidebar-icon-btn", isActive && "active")}
              >
                <Icon size={16} />
              </Link>
            );
          })}
        </div>

        {/* Filter input */}
        <div
          style={{
            padding: "10px 10px 8px",
            position: "relative",
            flexShrink: 0,
          }}
        >
          <Search
            size={12}
            style={{
              position: "absolute",
              left: 20,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--muted-foreground)",
              pointerEvents: "none",
            }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter…"
            className="sidebar-filter"
          />
        </div>

        {/* Scrollable content (scrollbar hidden) */}
        <div
          className="sidebar-scroll"
          style={{
            flex: 1,
            minHeight: 0,
            padding: "0 8px 8px",
          }}
        >
          {/* Locations */}
          {renderSectionHeader(
            "locations",
            "Locations",
            MapPin,
            locations?.length || 0,
          )}
          {openSections.locations && (
            <div style={{ marginBottom: 6 }}>
              {filteredLocations.length === 0 ? (
                <div className="sidebar-empty">
                  {q ? "No matches" : "No locations"}
                </div>
              ) : (
                organizedLocations.roots.map((l) => renderLocation(l))
              )}
            </div>
          )}

          {/* NPCs */}
          {renderSectionHeader("npcs", "NPCs", UserIcon, npcs?.length || 0)}
          {openSections.npcs && (
            <div style={{ marginBottom: 6 }}>
              {filteredNPCs.length === 0 ? (
                <div className="sidebar-empty">
                  {q ? "No matches" : "No NPCs"}
                </div>
              ) : (
                filteredNPCs.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => goto("npc", n.id)}
                    className={cn(
                      "sidebar-link sidebar-sublink",
                      isEntityActive("npc", n.id) && "active",
                    )}
                    style={{ paddingLeft: 18 }}
                  >
                    <UserIcon size={12} />
                    <span className="truncate">{n.name}</span>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Factions */}
          {renderSectionHeader(
            "factions",
            "Factions",
            Swords,
            factions?.length || 0,
          )}
          {openSections.factions && (
            <div style={{ marginBottom: 6 }}>
              {filteredFactions.length === 0 ? (
                <div className="sidebar-empty">
                  {q ? "No matches" : "No factions"}
                </div>
              ) : (
                filteredFactions.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => goto("faction", f.id)}
                    className={cn(
                      "sidebar-link sidebar-sublink",
                      isEntityActive("faction", f.id) && "active",
                    )}
                    style={{ paddingLeft: 18 }}
                  >
                    <Swords size={12} />
                    <span className="truncate">{f.name}</span>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Deities */}
          {renderSectionHeader(
            "pantheons",
            "Deities",
            Sparkles,
            deities?.length || 0,
          )}
          {openSections.pantheons && (
            <div style={{ marginBottom: 6 }}>
              {filteredDeities.length === 0 ? (
                <div className="sidebar-empty">
                  {q ? "No matches" : "No deities"}
                </div>
              ) : (
                filteredDeities.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => goto("pantheon", d.id)}
                    className={cn(
                      "sidebar-link sidebar-sublink",
                      isEntityActive("pantheon", d.id) && "active",
                    )}
                    style={{ paddingLeft: 18 }}
                  >
                    <Sparkles size={12} />
                    <span className="truncate">{d.name}</span>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Scenes */}
          {renderSectionHeader(
            "scenes",
            "Scenes",
            Clapperboard,
            scenes?.length || 0,
          )}
          {openSections.scenes && (
            <div style={{ marginBottom: 6 }}>
              {filteredScenes.length === 0 ? (
                <div className="sidebar-empty">
                  {q ? "No matches" : "No scenes"}
                </div>
              ) : (
                filteredScenes.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => gotoScene(s.id)}
                    className={cn(
                      "sidebar-link sidebar-sublink",
                      activeSceneId === s.id && "active",
                    )}
                    style={{ paddingLeft: 18 }}
                  >
                    <Clapperboard size={12} />
                    <span className="truncate">{s.name}</span>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Quests */}
          {renderSectionHeader(
            "quests",
            "Quests",
            ScrollText,
            quests?.length || 0,
          )}
          {openSections.quests && (
            <div style={{ marginBottom: 6 }}>
              {filteredQuests.length === 0 ? (
                <div className="sidebar-empty">
                  {q ? "No matches" : "No quests"}
                </div>
              ) : (
                filteredQuests.map((quest) => (
                  <button
                    key={quest.id}
                    type="button"
                    onClick={() => gotoForgeTab("quests")}
                    className={cn(
                      "sidebar-link sidebar-sublink",
                      forgeTabParam === "quests" && "active",
                    )}
                    style={{ paddingLeft: 18 }}
                    title={quest.title}
                  >
                    <ScrollText size={12} />
                    <span className="truncate">{quest.title}</span>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Bounties */}
          {renderSectionHeader(
            "bounties",
            "Bounties",
            Target,
            bounties?.length || 0,
          )}
          {openSections.bounties && (
            <div style={{ marginBottom: 6 }}>
              {filteredBounties.length === 0 ? (
                <div className="sidebar-empty">
                  {q ? "No matches" : "No bounties"}
                </div>
              ) : (
                filteredBounties.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => gotoForgeTab("bounties")}
                    className={cn(
                      "sidebar-link sidebar-sublink",
                      forgeTabParam === "bounties" && "active",
                    )}
                    style={{ paddingLeft: 18 }}
                    title={b.title || b.target_name}
                  >
                    <Target size={12} />
                    <span className="truncate">
                      {b.title || b.target_name}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Encounters */}
          {renderSectionHeader(
            "encounters",
            "Encounters",
            Swords,
            encounters?.length || 0,
          )}
          {openSections.encounters && (
            <div style={{ marginBottom: 6 }}>
              {filteredEncounters.length === 0 ? (
                <div className="sidebar-empty">
                  {q ? "No matches" : "No encounters"}
                </div>
              ) : (
                filteredEncounters.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => gotoForgeTab("encounters")}
                    className={cn(
                      "sidebar-link sidebar-sublink",
                      forgeTabParam === "encounters" && "active",
                    )}
                    style={{ paddingLeft: 18 }}
                    title={e.name || "Untitled encounter"}
                  >
                    <Swords size={12} />
                    <span className="truncate">
                      {e.name || "Untitled encounter"}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Context block */}
        <div
          style={{
            padding: "10px 14px 10px",
            borderTop: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontSize: 10,
                  color: "var(--muted-foreground)",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                Campaign
              </div>
              <div
                className="font-serif truncate"
                style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              >
                {campaignName || "Campaign"}
              </div>
            </div>
            <span className={`sc-badge${isDM ? " sc-badge-dm" : ""}`}>
              {isDM ? (
                <>
                  <Crown size={10} />
                  DM
                </>
              ) : (
                <>
                  <Users size={10} />
                  Player
                </>
              )}
            </span>
          </div>
        </div>

        {/* Footer: Settings + Tweaks */}
        <div
          style={{
            padding: 10,
            borderTop: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            flexShrink: 0,
          }}
        >
          <Link
            href={`${basePath}/settings`}
            className={cn(
              "sidebar-link",
              pathname === `${basePath}/settings` && "active",
            )}
            style={{ textDecoration: "none" }}
          >
            <Settings size={15} />
            <span>Settings</span>
          </Link>
          <TweaksTrigger onClick={() => setTweaksOpen((v) => !v)} />
        </div>
      </nav>

      <TweaksPanel open={tweaksOpen} onClose={() => setTweaksOpen(false)} />
    </>
  );
}
