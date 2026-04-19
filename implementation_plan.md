# UI Redesign — LegendKeeper-Inspired Overhaul

Modernize Scryer's interface for better readability, UX, and visual polish, inspired by LegendKeeper's worldbuilding UI patterns.

## User Review Required

> [!IMPORTANT]
> This is a large UI overhaul. I've broken it into **phases** so we can tackle them incrementally. Please review and let me know:
> 1. Which phases you want to prioritize
> 2. If any items should be added/removed
> 3. Whether you want me to proceed with all phases sequentially or focus on specific ones

## Analysis: What LegendKeeper Does Well (from your reference images)

| Pattern | LegendKeeper | Scryer (Current) |
|---|---|---|
| **Breadcrumb nav** | Top bar: `Campaign > Category > Entity` with back/forward arrows | Navbar with flat links (Campaigns / Characters / Generators) — no breadcrumb context inside a campaign |
| **Left sidebar** | Collapsible tree view with icons per entity type, filter by tags input, icon-only nav rail at top | Already have ContentSidebar with accordion sections + search — close, but styling needs polish |
| **Entity header** | Full-width hero banner image with title + icon overlaid, tabs directly below the title (Overview, Map, History, Associates) | Already doing this — good foundation, needs styling refinement |
| **Right sidebar** | Fixed-width rail with: portrait/avatar, SUMMARY, TAGS (removable chips), ATMOSPHERE (Spotify embed), BACKLINKS | Already have this structure — needs visual polish, portrait section, and better spacing |
| **Content typography** | Clean serif headings, generous whitespace, blockquote "Secret" callouts with dashed borders, sub-entity cards in a 3-col grid | Using `dangerouslySetInnerHTML` with inline selector styling — needs a proper prose class system |
| **Overall feel** | Dark UI (charcoal `#1a1a2e` range), subtle borders, warm muted text, very readable | Multiple themes already — good, but entity pages feel dense and lack breathing room |

---

## Proposed Changes

### Phase 1: Typography, Spacing & Prose System
*The foundation — makes everything more readable immediately*

#### [MODIFY] [globals.css](file:///d:/Projects/scryer/app/globals.css)
- Add a `.prose-entity` class system for rendered markdown content (headings, paragraphs, lists, blockquotes)
- Add a `.secret-callout` class matching LegendKeeper's dashed-border Secret blocks
- Add a `.feature-grid` utility for 3-column sub-entity card layouts
- Improve base spacing tokens and add `--content-max-width` variable

---

### Phase 2: Content Sidebar Polish
*Better visual hierarchy and feel for the left navigation*

#### [MODIFY] [content-sidebar.tsx](file:///d:/Projects/scryer/components/forge/navigation/content-sidebar.tsx)
- Improve icon rail styling: subtle background, rounded corners, better active state with a bottom indicator vs full bg fill
- Add entity count badges next to section titles (e.g., "Locations (12)")
- Improve hover states: lighter background tint instead of full muted
- Add a `+ Create` button at the bottom (like LegendKeeper's bottom bar)
- Add tree-view indentation lines for nested locations

---

### Phase 3: Breadcrumb Navigation Bar
*Contextual navigation like LegendKeeper's top bar*

#### [MODIFY] [navbar.tsx](file:///d:/Projects/scryer/components/shared/navbar.tsx)
- Add a breadcrumb section that shows context: `Campaign Name > Forge > NPC Name`
- Add back/forward navigation arrows (using router history)
- Make breadcrumb segments clickable links
- Show a small home icon linking back to campaign overview

---

### Phase 4: Entity Detail Pages (NPC + Location)
*The biggest visual impact — make entity pages feel like LegendKeeper*

#### [MODIFY] [NPC page.tsx](file:///d:/Projects/scryer/app/campaigns/%5BcampaignId%5D/npcs/%5BnpcId%5D/page.tsx)
- **Hero header**: Extend gradient overlay, improve text shadow for readability on any image
- **Tab bar**: Style tabs to match LegendKeeper (icon + label, transparent bg, underline indicator)
- **Content area**: Replace inline HTML rendering with `.prose-entity` class
- **Feature cards**: Style appearance/personality/background as a 3-col grid with subtle icons
- **Secret block**: Use the new `.secret-callout` styling
- **Reduce visual density**: Add more vertical spacing between sections

#### [MODIFY] [Location page.tsx](file:///d:/Projects/scryer/app/campaigns/%5BcampaignId%5D/locations/%5BlocationId%5D/page.tsx)
- Same improvements as NPC page (shared layout pattern)
- Improve icon picker in edit mode (better visual selector)

#### [MODIFY] Right sidebar (in both entity pages)
- Add a **portrait/avatar section** at the top (rounded image from entity's `image_url`, cropped to circle/rounded square)
- Better visual separation between SUMMARY, TAGS, ATMOSPHERE, BACKLINKS sections
- Tags: style as removable pill chips with `×` button (already partially done, improve styling)
- Backlinks: add entity-type icons (📍, 👤, ⚔️) next to each link
- Add subtle section dividers

---

### Phase 5: Campaign Overview & Forge Dashboard
*Polish the main entry points*

#### [MODIFY] [Campaign overview page.tsx](file:///d:/Projects/scryer/app/campaigns/%5BcampaignId%5D/page.tsx)
- Improve navigation cards with subtle hover animations and gradient borders
- Add a campaign hero banner area (if campaign has an image)
- Better empty-state illustrations

#### [MODIFY] [Forge page.tsx](file:///d:/Projects/scryer/app/campaigns/%5BcampaignId%5D/forge/page.tsx)
- Restyle the 11-tab bar to be less overwhelming:
  - Use an **icon-only horizontal rail** on smaller screens
  - Group related tabs (World: Scenes/Locations/Pantheon | People: NPCs/Factions | Story: Quests/Encounters/Bounties)
  - Better hover/active states with smooth underline transitions

---

### Phase 6: Theme Refinement
*Ensure all themes look great with the new layout*

#### [MODIFY] [globals.css](file:///d:/Projects/scryer/app/globals.css)
- Audit sidebar, prose, and entity page styles across all 6 themes
- Ensure secret callouts and feature cards have proper contrast in light themes (Parchment, Silverlight)
- Fine-tune border opacity and muted text readability

---

## Open Questions

> [!IMPORTANT]
> 1. **Scope**: Do you want all 6 phases, or should we start with specific ones? I'd recommend **Phase 1 + Phase 4** first (typography + entity pages) since those give the most visual impact.

> [!IMPORTANT]
> 2. **Portrait/Avatar in right sidebar**: Should this be a separate uploaded image (like LegendKeeper where the portrait is different from the hero banner), or should we just crop the existing `image_url`?

> [!IMPORTANT]
> 3. **Breadcrumbs (Phase 3)**: Do you want a full breadcrumb bar replacing the current nav, or should it be added as a secondary bar below the existing navbar?

> [!IMPORTANT]
> 4. **Forge tab grouping (Phase 5)**: With 11 tabs, should we group them into sections, or is the current flat list fine with better styling?

> [!IMPORTANT]
> 5. **Mobile responsiveness**: The LegendKeeper reference is desktop-focused. How important is mobile support for the entity pages? Currently the right sidebar would be hidden on mobile.

## Verification Plan

### Manual Verification
- Visual inspection of each modified component across all 6 themes
- Test entity pages with both image and no-image states
- Verify edit mode still works correctly after styling changes
- Check responsive behavior on various screen sizes
- Compare before/after screenshots

### Automated Tests
- Build check: `npm run build` to ensure no TypeScript/compilation errors
- Dev server hot reload testing during development
