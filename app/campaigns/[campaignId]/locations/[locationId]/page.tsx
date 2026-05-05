'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  X,
  Moon,
  MapPin,
  Edit,
  Check,
  User,
  Sword,
  Sparkles,
  Building2,
  Home,
  Castle,
  TreePine,
  Globe,
  Landmark,
  DoorOpen,
  Waves,
  Flag,
  Church,
  UtensilsCrossed,
  ShoppingBag,
  Mountain,
  ChevronLeft,
  Link2,
  EyeOff,
} from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import {
  useWorldLocations,
  useUpdateWorldLocation,
  useScenes,
  useScene,
  useLocationMarkers,
  type WorldLocation,
} from '@/hooks/useForgeContent'
import { createClient } from '@/lib/supabase/client'
import { AtlasMap } from '@/components/forge/atlas/atlas-map'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { EntityHistory } from '@/components/shared/entity-history'
import { ManageTags } from '@/components/shared/manage-tags'
import { ManageAssociates } from '@/components/shared/manage-associates'
import { cn } from '@/lib/utils'
import { normalizeMetadataTags } from '@/lib/utils/metadata-tags'
import { marked } from 'marked'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

// Predefined icon mapping for entity pages
const entityIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  moon: Moon,
  user: User,
  sword: Sword,
  sparkles: Sparkles,
  mapPin: MapPin,
  building2: Building2,
  home: Home,
  castle: Castle,
  treePine: TreePine,
  globe: Globe,
  landmark: Landmark,
  doorOpen: DoorOpen,
  waves: Waves,
  flag: Flag,
  church: Church,
  utensilsCrossed: UtensilsCrossed,
  shoppingBag: ShoppingBag,
  mountain: Mountain,
}

const WORLD_LOCATION_TYPES: WorldLocation['type'][] = [
  'world',
  'continent',
  'region',
  'kingdom',
  'city',
  'village',
  'settlement',
  'poi',
  'dungeon',
  'landmark',
  'structure',
  'lair',
  'biome',
  'island',
  'archipelago',
]

function formatLocationType(t: WorldLocation['type']): string {
  return t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

const iconOptions = [
  { value: 'moon', label: 'Moon', icon: Moon },
  { value: 'user', label: 'User', icon: User },
  { value: 'sword', label: 'Sword', icon: Sword },
  { value: 'sparkles', label: 'Sparkles', icon: Sparkles },
  { value: 'mapPin', label: 'Map Pin', icon: MapPin },
  { value: 'building2', label: 'Building', icon: Building2 },
  { value: 'home', label: 'Home', icon: Home },
  { value: 'castle', label: 'Castle', icon: Castle },
  { value: 'treePine', label: 'Tree', icon: TreePine },
  { value: 'globe', label: 'Globe', icon: Globe },
  { value: 'landmark', label: 'Landmark', icon: Landmark },
  { value: 'doorOpen', label: 'Door', icon: DoorOpen },
  { value: 'waves', label: 'Waves', icon: Waves },
  { value: 'flag', label: 'Flag', icon: Flag },
  { value: 'church', label: 'Church', icon: Church },
  { value: 'utensilsCrossed', label: 'Tavern', icon: UtensilsCrossed },
  { value: 'shoppingBag', label: 'Shop', icon: ShoppingBag },
  { value: 'mountain', label: 'Mountain', icon: Mountain },
]

export default function LocationOverviewPage() {
  const params = useParams()
  const router = useRouter()
  const { campaignId: campaignIdParam, locationId: locationIdParam } = params
  const campaignId = campaignIdParam as string
  const locationId = locationIdParam as string
  const [isDm, setIsDm] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [tags, setTags] = useState<string[]>([])
  const [summary, setSummary] = useState<string>('')
  const [customLabel, setCustomLabel] = useState<string>('')
  const [backlinks, setBacklinks] = useState<
    Array<{ type: 'npc' | 'faction' | 'location' | 'quest'; name: string; id: string; relation?: string }>
  >([])
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [entityName, setEntityName] = useState<string>('')
  const [iconName, setIconName] = useState<string>('moon')
  const [portraitLightboxOpen, setPortraitLightboxOpen] = useState(false)

  const { locations, loading, refetch: refetchLocations } = useWorldLocations(campaignId, isDm)
  const { updateLocation } = useUpdateWorldLocation()
  const { scenes, loading: scenesLoading } = useScenes(campaignId)
  const { scene, loading: sceneLoading } = useScene(selectedSceneId)
  const { markers } = useLocationMarkers(campaignId, selectedSceneId)
  const baseLocation = locations.find(l => l.id === locationId)
  // Local state to track optimistic updates
  const [optimisticDescription, setOptimisticDescription] = useState<string | null>(null)
  const location = useMemo(() => {
    if (!baseLocation) return baseLocation
    return { ...baseLocation, description: optimisticDescription ?? baseLocation.description }
  }, [baseLocation, optimisticDescription])

  const parentLocation = useMemo(
    () =>
      location?.parent_location_id
        ? locations.find(l => l.id === location.parent_location_id)
        : null,
    [locations, location?.parent_location_id]
  )

  const parentLocationOptions = useMemo(
    () =>
      [...locations]
        .filter(l => l.id !== locationId)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [locations, locationId]
  )

  const handleLocationTypeChange = useCallback(
    async (value: string) => {
      if (!location) return
      const res = await updateLocation(locationId, { type: value as WorldLocation['type'] })
      if (!res.success) {
        toast.error('Could not update location type')
        return
      }
      await refetchLocations({ silent: true })
    },
    [location, locationId, updateLocation, refetchLocations]
  )

  const handleParentLocationChange = useCallback(
    async (value: string) => {
      if (!location) return
      if (value === 'none') {
        const res = await updateLocation(locationId, { parent_location_id: null })
        if (!res.success) {
          toast.error('Could not update parent location')
          return
        }
      } else {
        const res = await updateLocation(locationId, { parent_location_id: value })
        if (!res.success) {
          toast.error('Could not update parent location')
          return
        }
      }
      await refetchLocations({ silent: true })
    },
    [location, locationId, updateLocation, refetchLocations]
  )

  // Debounce timer for saving description
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Markdown content state for editing
  const [markdownContent, setMarkdownContent] = useState<string>('')

  // Helper to convert HTML to Markdown (simple version)
  const htmlToMarkdown = (html: string): string => {
    if (!html) return ''
    return html
      .replace(/<h2>(.*?)<\/h2>/gi, '## $1')
      .replace(/<h3>(.*?)<\/h3>/gi, '### $1')
      .replace(/<h1>(.*?)<\/h1>/gi, '# $1')
      .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<b>(.*?)<\/b>/gi, '**$1**')
      .replace(/<em>(.*?)<\/em>/gi, '*$1*')
      .replace(/<i>(.*?)<\/i>/gi, '*$1*')
      .replace(/<p>(.*?)<\/p>/gi, '$1\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<ul>/gi, '')
      .replace(/<\/ul>/gi, '\n')
      .replace(/<ol>/gi, '')
      .replace(/<\/ol>/gi, '\n')
      .replace(/<li>(.*?)<\/li>/gi, '- $1\n')
      .replace(/<blockquote>(.*?)<\/blockquote>/gi, '> $1\n')
      .replace(/<[^>]+>/g, '') // Remove any remaining HTML tags
      .trim()
  }

  // Helper to convert Markdown to HTML using marked library
  const markdownToHtml = (markdown: string): string => {
    if (!markdown) return ''
    try {
      return marked.parse(markdown, { breaks: true }) as string
    } catch (error) {
      console.error('Error parsing markdown:', error)
      return markdown
    }
  }

  // Helper to strip HTML tags and get plain text
  const stripHtml = (html: string): string => {
    if (!html) return ''
    // Remove HTML tags
    return html.replace(/<[^>]+>/g, '').trim()
  }

  // Get HTML content for display (return description as-is, no heading added)
  const getHtmlContent = useCallback(() => {
    if (!location) return ''
    const description = location.description || ''
    // Return description as-is, don't add heading
    return description
  }, [location])

  // Handle markdown content changes
  const handleMarkdownChange = (value: string) => {
    setMarkdownContent(value)
    if (!location || !isDm || !editMode) return
    // Clear existing timer
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }
    // Save after 1 second of no typing
    saveTimerRef.current = setTimeout(async () => {
      const htmlContent = markdownToHtml(value)
      setOptimisticDescription(htmlContent)
      const res = await updateLocation(locationId, { description: htmlContent })
      if (res.success) await refetchLocations({ silent: true })
    }, 1000)
  }

  // Initialize markdown content when entering edit mode
  useEffect(() => {
    if (editMode && isDm && location) {
      const htmlContent = getHtmlContent()
      const markdown = htmlToMarkdown(htmlContent)
      setMarkdownContent(markdown)
    }
  }, [editMode, isDm, location, getHtmlContent])

  // Save markdown content when exiting edit mode
  const previousEditModeRef = useRef(editMode)
  useEffect(() => {
    // If edit mode changed from true to false, save immediately
    if (previousEditModeRef.current && !editMode && isDm && location && markdownContent) {
      // Clear any pending debounced save
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
      // Save immediately and update local state
      const htmlContent = markdownToHtml(markdownContent)
      setOptimisticDescription(htmlContent)
      void updateLocation(locationId, { description: htmlContent }).then((res) => {
        if (res.success) void refetchLocations({ silent: true })
      })
    }
    previousEditModeRef.current = editMode
  }, [editMode, isDm, location, markdownContent, locationId, updateLocation, refetchLocations])

  // Reset optimistic description when location data updates from server
  useEffect(() => {
    if (baseLocation?.description && optimisticDescription && baseLocation.description === optimisticDescription) {
      setOptimisticDescription(null)
    }
  }, [baseLocation?.description, optimisticDescription])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
    }
  }, [])


  // Load saved scene_id from database
  useEffect(() => {
    if (location?.scene_id) {
      setSelectedSceneId(location.scene_id)
    }
  }, [location?.scene_id])

  useEffect(() => {
    async function getUser() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Check if user is DM
        const { data: campaign } = await supabase
          .from('campaigns')
          .select('dm_user_id')
          .eq('id', campaignId)
          .single()
        if (campaign && campaign.dm_user_id === user.id) {
          setIsDm(true)
        }
      }
    }
    getUser()
  }, [campaignId])

  // Load name and icon
  useEffect(() => {
    if (location) {
      setEntityName(location.name)
      setIconName(location.metadata?.icon_name || 'moon')
    }
  }, [location])

  // Load tags, summary, custom label, and backlinks from metadata
  useEffect(() => {
    if (location?.metadata) {
      setTags(normalizeMetadataTags(location.metadata.tags))
      if (location.metadata.summary) {
        // If metadata summary exists, use it (strip HTML if present)
        setSummary(stripHtml(location.metadata.summary))
      } else {
        // Don't auto-populate from description, summary is separate
        setSummary('')
      }
      if (location.metadata.custom_label) {
        setCustomLabel(location.metadata.custom_label)
      }
    }
  }, [location])

  // Load associate names from IDs (avoid clearing names on unrelated location refetches — e.g. identity fields)
  useEffect(() => {
    async function loadAssociateNames() {
      if (!location) return
      
      const metadataAssociates = location.metadata?.associates || []
      if (metadataAssociates.length === 0) {
        setBacklinks([])
        return
      }
      
      const supabase = createClient()
      const linksWithNames: Array<{
        type: 'npc' | 'faction' | 'location' | 'quest'
        name: string
        id: string
      }> = []

      for (const assoc of metadataAssociates) {
        if (!assoc.id) continue
        
        if (assoc.type === 'npc') {
          const { data: associate } = await supabase
            .from('npcs')
            .select('name')
            .eq('id', assoc.id)
            .single()
          if (associate) {
            linksWithNames.push({ type: 'npc', id: assoc.id, name: associate.name })
          }
        } else if (assoc.type === 'faction') {
          const { data: associate } = await supabase
            .from('factions')
            .select('name')
            .eq('id', assoc.id)
            .single()
          if (associate) {
            linksWithNames.push({ type: 'faction', id: assoc.id, name: associate.name })
          }
        } else if (assoc.type === 'location') {
          const { data: associate } = await supabase
            .from('world_locations')
            .select('name')
            .eq('id', assoc.id)
            .single()
          if (associate) {
            linksWithNames.push({ type: 'location', id: assoc.id, name: associate.name })
          }
        } else if (assoc.type === 'quest') {
          const { data: associate } = await supabase
            .from('quests')
            .select('title')
            .eq('id', assoc.id)
            .single()
          if (associate) {
            linksWithNames.push({ type: 'quest', id: assoc.id, name: associate.title })
          }
        }
      }

      setBacklinks(linksWithNames)
    }
    loadAssociateNames()
  }, [location?.id, location?.metadata?.associates])

  const copyPageUrl = () => {
    if (typeof window === 'undefined') return
    void navigator.clipboard.writeText(window.location.href)
    toast.success('Link copied')
  }

  if (loading) {
    return (
      <div className="flex h-full min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold">Loading location...</p>
        </div>
      </div>
    )
  }

  if (!location) {
    return (
      <div className="flex h-full min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <p className="mb-2 text-lg font-semibold">Location not found</p>
          <Button onClick={() => router.push(`/campaigns/${campaignId}/forge?tab=locations`)}>
            Back to Locations
          </Button>
        </div>
      </div>
    )
  }

  const secret =
    isDm && (location.dm_notes?.trim() || location.metadata?.secret)
      ? String(location.dm_notes?.trim() || location.metadata?.secret || '')
      : null

  const features = location.metadata?.features || []

  const nameInitial = location.name.trim().charAt(0).toUpperCase() || '?'

  return (
    <div className="sc-fade-in relative min-h-full bg-background">
      <div className="relative h-[280px] w-full shrink-0 overflow-hidden">
        {location.image_url ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- dynamic campaign URLs */}
            <img
              src={location.image_url}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              aria-hidden
            />
            <div className="entity-hero-gradient absolute inset-0" />
          </>
        ) : (
          <>
            <div className="ph-img absolute inset-0" aria-hidden />
            <div className="entity-hero-gradient absolute inset-0" />
          </>
        )}

        <div className="absolute left-0 right-0 top-0 z-10 flex items-center gap-2 px-5 pt-4">
          <Button
            variant="secondary"
            size="sm"
            className="h-8 gap-1.5 bg-background/80 text-xs backdrop-blur-sm"
            onClick={() => router.push(`/campaigns/${campaignId}/forge?tab=locations`)}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Locations
          </Button>
          <div className="flex-1" />
          <Button
            variant="secondary"
            size="sm"
            className="h-8 gap-1.5 bg-background/80 text-xs backdrop-blur-sm"
            onClick={copyPageUrl}
          >
            <Link2 className="h-3.5 w-3.5" />
            Copy link
          </Button>
          {isDm && (
            <Button
              variant="secondary"
              size="sm"
              className="h-8 gap-1.5 bg-background/80 text-xs backdrop-blur-sm"
              onClick={() => setEditMode(!editMode)}
            >
              {editMode ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Done
                </>
              ) : (
                <>
                  <Edit className="h-3.5 w-3.5" />
                  Edit
                </>
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 bg-background/80 backdrop-blur-sm"
            onClick={() => router.push(`/campaigns/${campaignId}/forge?tab=locations`)}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1280px] px-4 pb-10 sm:px-8 -mt-20">
        <div className="grid grid-cols-1 gap-7 lg:grid-cols-[1fr_320px]">
          <div>
            <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end">
              {location.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={location.image_url}
                  alt={location.name}
                  className="h-[120px] w-[120px] shrink-0 rounded-[14px] border-2 border-border object-cover shadow-xl"
                />
              ) : (
                <div
                  className="flex h-[120px] w-[120px] shrink-0 items-center justify-center rounded-[14px] border border-stone-700/70 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-950 font-serif text-[54px] font-semibold leading-none tracking-tight text-white shadow-xl shadow-black/50"
                  aria-hidden
                >
                  {entityIcons[iconName] ? (
                    React.createElement(entityIcons[iconName], { className: 'h-14 w-14' })
                  ) : (
                    nameInitial
                  )}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="sc-label mb-1">Location</div>
                <div className="flex flex-wrap items-center gap-2">
                  {isDm && editMode ? (
                    <>
                      <Select
                        value={iconName}
                        onValueChange={async (value) => {
                          setIconName(value)
                          if (location) {
                            const supabase = createClient()
                            const currentMetadata = location.metadata || {}
                            await supabase
                              .from('world_locations')
                              .update({
                                metadata: { ...currentMetadata, icon_name: value },
                              })
                              .eq('id', locationId)
                            await refetchLocations({ silent: true })
                          }
                        }}
                      >
                        <SelectTrigger className="h-10 w-10 shrink-0 p-0 justify-center [&>svg:last-child]:hidden">
                          <SelectValue className="flex items-center justify-center">
                            {entityIcons[iconName] &&
                              React.createElement(entityIcons[iconName], { className: 'h-6 w-6' })}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {iconOptions
                            .filter((option) => option.icon)
                            .map((option) => {
                              const IconComponent = option.icon
                              if (!IconComponent) return null
                              return (
                                <SelectItem key={option.value} value={option.value}>
                                  <div className="flex items-center gap-2">
                                    <IconComponent className="h-4 w-4" />
                                    <span>{option.label}</span>
                                  </div>
                                </SelectItem>
                              )
                            })}
                        </SelectContent>
                      </Select>
                      <Input
                        value={entityName}
                        onChange={(e) => setEntityName(e.target.value)}
                        onBlur={async () => {
                          if (location && entityName.trim() && entityName !== location.name) {
                            const res = await updateLocation(locationId, { name: entityName.trim() })
                            if (res.success) await refetchLocations({ silent: true })
                          }
                        }}
                        className="min-w-0 flex-1 border-none bg-transparent px-0 font-serif text-3xl font-bold tracking-tight focus-visible:ring-0 focus-visible:ring-offset-0 sm:text-[42px] sm:leading-[1.05]"
                      />
                    </>
                  ) : (
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {entityIcons[iconName] &&
                          React.createElement(entityIcons[iconName], {
                            className: 'h-8 w-8 shrink-0 text-foreground',
                          })}
                        <h1 className="font-serif text-3xl font-bold tracking-tight sm:text-[42px] sm:leading-[1.05]">
                          {location.name}
                        </h1>
                      </div>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {tags.map((t) => (
                          <span key={t} className="sc-badge">
                            {t}
                          </span>
                        ))}
                        <span className="sc-badge">{location.type}</span>
                        {location.status && location.status !== 'normal' ? (
                          <span className="sc-badge">{location.status}</span>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
                {isDm && editMode ? (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <span className="sc-badge">{location.type}</span>
                    {location.status && location.status !== 'normal' ? (
                      <span className="sc-badge">{location.status}</span>
                    ) : null}
                  </div>
                ) : null}
                {isDm && editMode && (
                  <div className="mt-4 max-w-xl">
                    <ManageTags
                      campaignId={campaignId}
                      entityId={locationId}
                      entityType="location"
                      currentTags={tags}
                      onUpdate={(newTags) => setTags(newTags)}
                      isDm
                    />
                  </div>
                )}
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="mb-6 inline-flex h-auto w-full flex-wrap justify-start gap-1 rounded-lg bg-muted/40 p-1 sm:w-auto">
                <TabsTrigger value="overview" className="text-xs sm:text-sm">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="map" className="text-xs sm:text-sm">
                  Map
                </TabsTrigger>
                <TabsTrigger value="history" className="text-xs sm:text-sm">
                  History
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-0 space-y-8">
                {isDm && editMode ? (
                  <Textarea
                    value={markdownContent}
                    onChange={(e) => handleMarkdownChange(e.target.value)}
                    className="min-h-[220px] resize-none rounded-md border border-border bg-muted/30 p-4 font-mono text-sm transition-colors focus:border-ring focus:ring-1 focus:ring-ring/50"
                    placeholder="## Heading&#10;&#10;Write your description in markdown..."
                  />
                ) : (
                  <div className="prose-entity">
                    <div
                      className="contents"
                      dangerouslySetInnerHTML={{
                        __html: getHtmlContent() || '<p>No description available.</p>',
                      }}
                    />
                  </div>
                )}

                {secret ? (
                  <div className="dm-secret">
                    <div className="dm-secret-label">
                      <EyeOff className="h-3 w-3" aria-hidden />
                      DM secrets
                    </div>
                    <div className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{secret}</div>
                  </div>
                ) : null}

                {features.length > 0 ? (
                  <div className="entity-section feature-grid">
                    {features.map((feature: { icon?: string; name?: string; description?: string }, index: number) => (
                      <div key={index} className="feature-card">
                        {feature.icon ? (
                          <div className="feature-icon">
                            <span className="text-lg">{feature.icon}</span>
                          </div>
                        ) : null}
                        {feature.name ? <h4>{feature.name}</h4> : null}
                        {feature.description ? <p>{feature.description}</p> : null}
                      </div>
                    ))}
                  </div>
                ) : null}
              </TabsContent>

              <TabsContent value="map" className="mt-0 space-y-4">
                <div className="flex flex-wrap items-center gap-4">
                  <Label htmlFor="scene-select" className="text-sm font-medium">
                    Select Scene
                  </Label>
                  <Select
                    value={selectedSceneId || ''}
                    onValueChange={async (value) => {
                      const newSceneId = value || null
                      setSelectedSceneId(newSceneId)
                      if (location && isDm) {
                        const res = await updateLocation(locationId, {
                          scene_id: newSceneId,
                        })
                        if (res.success) await refetchLocations({ silent: true })
                      }
                    }}
                  >
                    <SelectTrigger id="scene-select" className="w-64">
                      <SelectValue placeholder="Choose a scene..." />
                    </SelectTrigger>
                    <SelectContent>
                      {scenesLoading ? (
                        <SelectItem value="loading" disabled>
                          Loading scenes...
                        </SelectItem>
                      ) : scenes.length === 0 ? (
                        <SelectItem value="none" disabled>
                          No scenes available
                        </SelectItem>
                      ) : (
                        scenes.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {selectedSceneId && scene ? (
                  <div className="overflow-hidden rounded-lg border">
                    <AtlasMap imageUrl={scene.image_url} markers={markers || []} isDm={isDm} />
                  </div>
                ) : selectedSceneId && sceneLoading ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <p>Loading scene...</p>
                  </div>
                ) : !selectedSceneId ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <MapPin className="mx-auto mb-4 h-12 w-12 opacity-50" />
                    <p>Select a scene to view the map</p>
                  </div>
                ) : null}
              </TabsContent>

              <TabsContent value="history" className="mt-0">
                <EntityHistory
                  campaignId={campaignId}
                  entityId={locationId}
                  entityType="location"
                  isDm={isDm}
                  editMode={editMode}
                />
              </TabsContent>
            </Tabs>
          </div>

          <aside className="flex flex-col gap-4 lg:-mt-5">
            {location.image_url ? (
              <div className="sc-card p-4">
                <div className="sc-label mb-2.5">Portrait</div>
                <button
                  type="button"
                  onClick={() => setPortraitLightboxOpen(true)}
                  className={cn(
                    'w-full cursor-zoom-in rounded-[0.75rem] border-0 bg-transparent p-0',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
                  )}
                  aria-label={`View ${location.name} image full size`}
                >
                  <img
                    src={location.image_url}
                    alt={location.name}
                    className="entity-portrait pointer-events-none"
                  />
                </button>
                <Dialog open={portraitLightboxOpen} onOpenChange={setPortraitLightboxOpen}>
                  <DialogContent
                    className="w-fit max-w-[min(96vw,1400px)] gap-0 p-2 sm:max-w-[min(96vw,1400px)] sm:p-3"
                    aria-describedby={undefined}
                  >
                    <DialogTitle className="sr-only">{location.name} — full size image</DialogTitle>
                    <img
                      src={location.image_url}
                      alt={location.name}
                      className="max-h-[min(85vh,1200px)] max-w-full w-auto object-contain rounded-md"
                    />
                  </DialogContent>
                </Dialog>
              </div>
            ) : null}

            <div className="sc-card p-4">
              <div className="sc-label mb-2.5">Identity</div>
              {isDm && editMode ? (
                <div className="space-y-3">
                  <div>
                    <div className="mb-1 text-xs text-muted-foreground">Type</div>
                    <Select
                      value={location.type}
                      onValueChange={(v) => void handleLocationTypeChange(v)}
                    >
                      <SelectTrigger className="h-9 w-full text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {WORLD_LOCATION_TYPES.map(t => (
                          <SelectItem key={t} value={t}>
                            {formatLocationType(t)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <div className="mb-1 text-xs text-muted-foreground">Parent location</div>
                    <Select
                      value={location.parent_location_id ?? 'none'}
                      onValueChange={(v) => void handleParentLocationChange(v)}
                    >
                      <SelectTrigger className="h-9 w-full text-xs">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— None —</SelectItem>
                        {parentLocationOptions.map(loc => (
                          <SelectItem key={loc.id} value={loc.id}>
                            {loc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between gap-4 border-b border-dashed border-border/60 py-1.5 text-xs last:border-b-0">
                    <span className="text-muted-foreground">Type</span>
                    <span className="max-w-[60%] text-right font-medium">
                      {formatLocationType(location.type)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-dashed border-border/60 py-1.5 text-xs last:border-b-0">
                    <span className="text-muted-foreground">Parent</span>
                    <span className="max-w-[60%] text-right font-medium">
                      {parentLocation?.name ?? '—'}
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="sc-card p-4">
              <div className="sc-label mb-2.5">Summary</div>
              {isDm && editMode ? (
                <Textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  onBlur={async () => {
                    if (!location) return
                    const supabase = createClient()
                    const currentMetadata = location.metadata || {}
                    await supabase
                      .from('world_locations')
                      .update({
                        metadata: { ...currentMetadata, summary: summary.trim() || null },
                      })
                      .eq('id', locationId)
                    await refetchLocations({ silent: true })
                  }}
                  placeholder="Short summary..."
                  className="min-h-[100px] resize-none text-sm"
                />
              ) : (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {summary || 'No summary yet.'}
                </p>
              )}
            </div>

            {location.metadata?.atmosphere ? (
              <div className="sc-card p-4">
                <div className="sc-label mb-2.5">Atmosphere</div>
                <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {location.metadata.atmosphere.title || 'Ambient Music'}
                    </p>
                    {location.metadata.atmosphere.artist ? (
                      <p className="truncate text-xs text-muted-foreground">
                        {location.metadata.atmosphere.artist}
                      </p>
                    ) : null}
                  </div>
                  {location.metadata.atmosphere.spotify_url ? (
                    <a
                      href={location.metadata.atmosphere.spotify_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 shrink-0"
                    >
                      <div className="flex h-6 w-6 items-center justify-center rounded bg-green-500">
                        <span className="text-xs font-bold text-white">♪</span>
                      </div>
                    </a>
                  ) : null}
                </div>
              </div>
            ) : null}

            {customLabel ? (
              <div className="sc-card p-4">
                <div className="sc-label mb-2.5">Custom label</div>
                <p className="text-sm">{customLabel}</p>
              </div>
            ) : null}

            <div className="sc-card p-4">
              <ManageAssociates
                campaignId={campaignId}
                entityId={locationId}
                entityType="location"
                currentAssociates={backlinks}
                onUpdate={(associates) => setBacklinks(associates)}
                isDm={isDm}
                editMode={editMode}
                layout="npc-sidebar"
              />
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

