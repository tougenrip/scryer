---
name: VTT Development Plan
overview: A comprehensive plan to implement a Virtual Tabletop with real-time collaboration, combat tracking, and immersive features for Scryer.
todos:
  - id: db-schema
    content: Create database migrations for tokens, audio_tracks, playlists, objectives, and weather_states tables.
    status: completed
  - id: storage-setup
    content: Create 'campaign-audio' storage bucket and RLS policies.
    status: completed
    dependencies:
      - db-schema
  - id: vtt-canvas
    content: Implement GameCanvas component with react-konva, map loading, and grid rendering.
    status: completed
    dependencies:
      - db-schema
  - id: vtt-tokens
    content: Implement Token component with drag-and-drop and Supabase Realtime sync.
    status: completed
    dependencies:
      - vtt-canvas
  - id: vtt-fog
    content: Implement Fog of War system (masking and persistence).
    status: completed
    dependencies:
      - vtt-canvas
  - id: vtt-weather
    content: Implement WeatherOverlay component with particle effects.
    status: completed
    dependencies:
      - vtt-canvas
  - id: combat-tracker
    content: Build InitiativeTracker component and integrate with combat_encounters table.
    status: completed
    dependencies:
      - vtt-tokens
  - id: music-player
    content: Develop MusicPlayer component with file upload and playback sync.
    status: completed
    dependencies:
      - storage-setup
  - id: party-tools
    content: Create ObjectiveTracker, Inventory, and Notes quick-access panels.
    status: completed
    dependencies:
      - db-schema
  - id: ruler-tool
    content: Implement Ruler tool for distance measurement on canvas.
    status: completed
    dependencies:
      - vtt-canvas
  - id: compact-sheet
    content: Integrate CompactSheet viewer for players and DMs.
    status: completed
    dependencies:
      - vtt-tokens
---

# VTT Development Plan

## 1. Database & Schema Updates

We need to extend the database to support VTT features, Music, and advanced campaign state.

- **New Tables**:
    - `tokens`: Store token instances on maps (x, y, rotation, scale, stats).
    - `audio_tracks`: Store uploaded music/sfx metadata.
    - `playlists`: Group audio tracks.
    - `objectives`: Track campaign goals (separate from Quests).
    - `weather_states`: Store active weather for campaigns/maps.
- **Updates**:
    - `media_items`: Add `grid_config` (size, type, color) and `fog_data` (paths/shapes) columns.
    - `campaigns`: Add `active_playlist_id` and `active_weather_id`.
- **Storage**:
    - Create `campaign-audio` bucket for music files.

## 2. VTT Core: Canvas & Map System

Build the interactive canvas using `react-konva`.

- **Component**: `components/map/GameCanvas.tsx`
- **Features**:
    - **Map Rendering**: Load map images from `media_items`.
    - **Grid System**: Render customizable Square/Hex grids overlay.
    - **Navigation**: Zoom, Pan, and Fit-to-Screen controls.
    - **Ruler Tool**: Interactive measuring tool (click-drag to measure distance).
- **State Management**: Use `zustand` for local canvas state (zoom, offset, tool selection).

## 3. Tokens & Real-time Sync

Implement movable tokens with live synchronization.

- **Component**: `components/map/Token.tsx`
- **Features**:
    - **Rendering**: Display Character/Monster avatars.
    - **Interaction**: Drag & Drop movement with grid snapping.
    - **Stats**: HP bars and status effect icons on tokens.
    - **Sync**: Use Supabase Realtime to broadcast position changes (`tokens` table).

## 4. Fog of War & Visual Effects

Implement immersive visual features.

- **Fog of War**:
    - Editable mask layer (DM reveals areas).
    - "Destination-out" compositing for revealing map parts.
    - Persist fog state to `media_items`.
- **Weather System**:
    - `components/map/WeatherOverlay.tsx`
    - Particle systems for Rain, Snow, Fog using `react-konva`.
    - Controls in DM toolbar.

## 5. Combat & Initiative Tracker

Integrate combat management with the VTT.

- **Component**: `components/combat/InitiativeTracker.tsx`
- **Features**:
    - **List View**: Sortable turn order.
    - **Controls**: Next Turn, Previous Turn, Round Counter.
    - **Active Highlighting**: Highlight the token of the current turn's character.
    - **HP Sync**: Real-time HP updates reflected on Tokens and Tracker.

## 6. Atmosphere & Tools (Music, Objectives, Notes)

Add supporting tools for the campaign.

- **Music Player**:
    - `components/tools/MusicPlayer.tsx`
    - Upload audio files to Supabase.
    - Play/Pause/Loop controls synced to all players.
- **Objective Tracker**:
    - `components/tools/ObjectiveTracker.tsx`
    - Simple checklist for current campaign goals.
- **Party Tools**:
    - Quick-access panels for **Party Inventory** and **Campaign Notes**.
    - **Dice Roller**: Integrate existing `dice-roller-context` into the VTT HUD.
- **Member List**:
    - Live list of online members with status indicators.

## 7. Character Sheet Viewer

- **Component**: `components/character/CompactSheet.tsx`
- **Features**:
    - Modal or Sidebar view of character stats.
    - Click-to-roll skills/saves directly from the VTT.

## Implementation Flow

1.  **Schema**: Create necessary tables and buckets.
2.  **Map Core**: Build the Canvas and Map loading.
3.  **Tokens**: Add token rendering and sync.
4.  **Combat**: Build Initiative Tracker and link to Tokens.
5.  **Atmosphere**: Add Music, Weather, and Fog.
6.  **HUD**: Add Ruler, Objectives, and Dice UI.