'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { X, Moon, MapPin, Edit, Check, User, Sword, Swords, Sparkles, Building2, Home, Castle, TreePine, Globe, Landmark, DoorOpen, Waves, Flag, Church, UtensilsCrossed, ShoppingBag, Mountain, ScrollText } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useWorldLocations, useUpdateWorldLocation, useScenes, useScene, useLocationMarkers } from '@/hooks/useForgeContent'
import { createClient } from '@/lib/supabase/client'
import type { WorldLocation } from '@/hooks/useForgeContent'
import { AtlasMap } from '@/components/forge/atlas/atlas-map'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { EntityHistory } from '@/components/shared/entity-history'
import { ManageTags } from '@/components/shared/manage-tags'
import { ManageAssociates } from '@/components/shared/manage-associates'
import { cn } from '@/lib/utils'
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
  const [userId, setUserId] = useState<string | null>(null)
  const [isDm, setIsDm] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [tags, setTags] = useState<string[]>([])
  const [summary, setSummary] = useState<string>('')
  const [customLabel, setCustomLabel] = useState<string>('')
  const [backlinks, setBacklinks] = useState<Array<{ type: string; name: string; id: string }>>([])
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [entityName, setEntityName] = useState<string>('')
  const [iconName, setIconName] = useState<string>('moon')
  const [portraitLightboxOpen, setPortraitLightboxOpen] = useState(false)

  const { locations, loading } = useWorldLocations(campaignId, isDm)
  const { updateLocation, loading: updating } = useUpdateWorldLocation()
  const { scenes, loading: scenesLoading } = useScenes(campaignId)
  const { scene, loading: sceneLoading } = useScene(selectedSceneId)
  const { markers, loading: markersLoading } = useLocationMarkers(campaignId, selectedSceneId)
  const baseLocation = locations.find(l => l.id === locationId)
  // Local state to track optimistic updates
  const [optimisticDescription, setOptimisticDescription] = useState<string | null>(null)
  const location = useMemo(() => {
    if (!baseLocation) return baseLocation
    return { ...baseLocation, description: optimisticDescription ?? baseLocation.description }
  }, [baseLocation, optimisticDescription])

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
      // Optimistically update local state
      setOptimisticDescription(htmlContent)
      await updateLocation(locationId, { description: htmlContent })
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
      updateLocation(locationId, { description: htmlContent })
    }
    previousEditModeRef.current = editMode
  }, [editMode, isDm, location, markdownContent, locationId, updateLocation])

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
        setUserId(user.id)
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
      if (location.metadata.tags) {
        setTags(location.metadata.tags)
      }
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

  // Load associates from metadata
  useEffect(() => {
    if (location) {
      const metadataAssociates = location.metadata?.associates || []
      const associatesArray: Array<{ type: string; name: string; id: string }> = []
      
      metadataAssociates.forEach((assoc: any) => {
        associatesArray.push({ type: assoc.type, id: assoc.id, name: '' })
      })
      
      setBacklinks(associatesArray)
    }
  }, [location])

  // Load associate names from IDs
  useEffect(() => {
    async function loadAssociateNames() {
      if (!location) return
      
      const metadataAssociates = location.metadata?.associates || []
      if (metadataAssociates.length === 0) return
      
      const supabase = createClient()
      const linksWithNames: Array<{ type: string; name: string; id: string }> = []

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

      if (linksWithNames.length > 0) {
        setBacklinks(linksWithNames)
      }
    }
    loadAssociateNames()
  }, [location?.metadata?.associates])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold">Loading location...</p>
        </div>
      </div>
    )
  }

  if (!location) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold mb-2">Location not found</p>
          <Button onClick={() => router.push(`/campaigns/${campaignId}/forge?tab=locations`)}>
            Back to Locations
          </Button>
        </div>
      </div>
    )
  }

  // Extract secret from dm_notes or metadata
  const secret = isDm && location.dm_notes ? location.dm_notes : location.metadata?.secret || null

  // Extract features/items from metadata
  const features = location.metadata?.features || []

  return (
    <div className="flex h-full bg-background overflow-hidden">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header with illustration */}
        <div className="relative w-full h-64 md:h-80 overflow-hidden flex-shrink-0">
          {location.image_url ? (
            <img
              src={location.image_url}
              alt={location.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900" />
          )}
          <div className="absolute inset-x-0 bottom-0 top-0 entity-hero-gradient" />
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {isDm && editMode ? (
                  <>
                    <Select value={iconName} onValueChange={async (value) => {
                      setIconName(value)
                      if (location) {
                        const supabase = createClient()
                        const currentMetadata = location.metadata || {}
                        await supabase
                          .from('world_locations')
                          .update({
                            metadata: { ...currentMetadata, icon_name: value }
                          })
                          .eq('id', locationId)
                      }
                    }}>
                      <SelectTrigger className="w-10 h-10 p-0 justify-center [&>svg:last-child]:hidden">
                        <SelectValue className="flex items-center justify-center">
                          {entityIcons[iconName] && React.createElement(entityIcons[iconName], { className: 'h-6 w-6' })}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {iconOptions
                          .filter((option) => option.icon) // Filter out any undefined icons
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
                          await updateLocation(locationId, { name: entityName.trim() })
                        }
                      }}
                      className="text-3xl md:text-4xl font-bold h-auto border-none bg-transparent px-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                      style={{ width: `${Math.max(entityName.length * 0.6, 10)}ch` }}
                    />
                  </>
                ) : (
                  <>
                    {entityIcons[iconName] && React.createElement(entityIcons[iconName], { className: 'h-6 w-6 text-foreground' })}
                    <h1 className="text-3xl md:text-4xl font-bold text-foreground">{location.name}</h1>
                  </>
                )}
              </div>
              {isDm && (
                <Button
                  variant={editMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setEditMode(!editMode)}
                >
                  {editMode ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Done
                    </>
                  ) : (
                    <>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </>
                  )}
                </Button>
              )}
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="bg-background/80 backdrop-blur-sm inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px] text-muted-foreground">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="map">Map</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
                <TabsTrigger value="associates">Associates</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(`/campaigns/${campaignId}/forge?tab=locations`)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Scrollable Content with Right Sidebar */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto">
            <div className="container mx-auto px-4 py-8 max-w-4xl">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsContent value="overview" className="space-y-6 mt-0">
                {/* Origins/Description - Editable with Markdown (includes heading) */}
                <div className="entity-section">
                  {isDm && editMode ? (
                    <Textarea
                      value={markdownContent}
                      onChange={(e) => handleMarkdownChange(e.target.value)}
                      className={cn(
                        'min-h-[200px] rounded-md p-4 font-mono text-sm transition-colors',
                        'border border-border bg-muted/30 focus:border-ring focus:ring-1 focus:ring-ring/50',
                        'resize-none'
                      )}
                      placeholder="## Heading&#10;&#10;Write your description in markdown format...&#10;&#10;**Bold text**&#10;*Italic text*&#10;- List item"
                    />
                  ) : (
                    <div className="prose-entity">
                      <div 
                        dangerouslySetInnerHTML={{ __html: getHtmlContent() || '<p>No description available.</p>' }}
                      />
                    </div>
                  )}
                </div>

                {/* Secret Section */}
                {secret && (
                  <div className="entity-section secret-callout">
                    <div className="secret-label">Secret</div>
                    <p>{secret}</p>
                  </div>
                )}

                {/* Features/Items */}
                {features.length > 0 && (
                  <div className="entity-section feature-grid">
                    {features.map((feature: any, index: number) => (
                      <div key={index} className="feature-card">
                        {feature.icon && (
                          <div className="feature-icon">
                            <span className="text-lg">{feature.icon}</span>
                          </div>
                        )}
                        <h4>{feature.name}</h4>
                        <p>{feature.description}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Type and Status */}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{location.type}</Badge>
                  {location.status && location.status !== 'normal' && (
                    <Badge variant="outline">{location.status}</Badge>
                  )}
                </div>
                  </TabsContent>

                  <TabsContent value="map" className="mt-0">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Label htmlFor="scene-select" className="text-sm font-medium">Select Scene</Label>
                    <Select
                      value={selectedSceneId || ''}
                      onValueChange={async (value) => {
                        const newSceneId = value || null
                        setSelectedSceneId(newSceneId)
                        // Save to database
                        if (location && isDm) {
                          await updateLocation(locationId, {
                            scene_id: newSceneId
                          })
                        }
                      }}
                    >
                      <SelectTrigger id="scene-select" className="w-64">
                        <SelectValue placeholder="Choose a scene..." />
                      </SelectTrigger>
                      <SelectContent>
                        {scenesLoading ? (
                          <SelectItem value="loading" disabled>Loading scenes...</SelectItem>
                        ) : scenes.length === 0 ? (
                          <SelectItem value="none" disabled>No scenes available</SelectItem>
                        ) : (
                          scenes.map((scene) => (
                            <SelectItem key={scene.id} value={scene.id}>
                              {scene.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedSceneId && scene ? (
                    <div className="border rounded-lg overflow-hidden">
                      <AtlasMap
                        imageUrl={scene.image_url}
                        markers={markers || []}
                        isDm={isDm}
                      />
                    </div>
                  ) : selectedSceneId && sceneLoading ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <p>Loading scene...</p>
                    </div>
                  ) : !selectedSceneId ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Select a scene to view the map</p>
                    </div>
                  ) : null}
                  </div>
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

                  <TabsContent value="associates" className="mt-0">
                <ManageAssociates
                  campaignId={campaignId}
                  entityId={locationId}
                  entityType="location"
                  currentAssociates={backlinks as Array<{ type: 'npc' | 'faction' | 'location' | 'quest'; name: string; id: string }>}
                  onUpdate={(associates) => setBacklinks(associates)}
                  isDm={isDm}
                  editMode={editMode}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Right Sidebar - Always Visible */}
          <div className="w-80 border-l border-border bg-background overflow-y-auto flex-shrink-0">
            <div className="p-6 space-y-0">
              {/* Portrait */}
              {location.image_url && (
                <div className="mb-6">
                  <button
                    type="button"
                    onClick={() => setPortraitLightboxOpen(true)}
                    className={cn(
                      'w-full p-0 border-0 bg-transparent rounded-[0.75rem] cursor-zoom-in',
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
                      className="w-fit max-w-[min(96vw,1400px)] gap-0 p-2 sm:p-3 sm:max-w-[min(96vw,1400px)]"
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
              )}

              {/* Summary */}
              <div>
                <h3 className="sidebar-section-label">SUMMARY</h3>
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
                          metadata: { ...currentMetadata, summary: summary.trim() || null }
                        })
                        .eq('id', locationId)
                    }}
                    placeholder="Enter a brief summary of this location..."
                    className="min-h-[100px] text-sm resize-none"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {summary || 'There is no summary.'}
                  </p>
                )}
              </div>

              <hr className="sidebar-divider my-5" />

                {/* Tags */}
                <ManageTags
              campaignId={campaignId}
              entityId={locationId}
              entityType="location"
              currentTags={tags}
              onUpdate={(newTags) => setTags(newTags)}
              isDm={isDm && editMode}
                />

                <hr className="sidebar-divider my-5" />

                {/* Atmosphere */}
                {location.metadata?.atmosphere && (
                  <div>
                    <h3 className="sidebar-section-label">ATMOSPHERE</h3>
                    <div className="p-3 rounded-lg bg-muted/50 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{location.metadata.atmosphere.title || 'Ambient Music'}</p>
                        {location.metadata.atmosphere.artist && (
                          <p className="text-xs text-muted-foreground truncate">{location.metadata.atmosphere.artist}</p>
                        )}
                      </div>
                      {location.metadata.atmosphere.spotify_url && (
                        <a
                          href={location.metadata.atmosphere.spotify_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 flex-shrink-0"
                        >
                          <div className="h-6 w-6 bg-green-500 rounded flex items-center justify-center">
                            <span className="text-white text-xs font-bold">♪</span>
                          </div>
                        </a>
                      )}
                    </div>
                  </div>
                )}

                <hr className="sidebar-divider my-5" />

                {/* Backlinks */}
                <div>
                  <h3 className="sidebar-section-label">BACKLINKS</h3>
                  {backlinks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No associated entities</p>
                  ) : (
                    <div className="space-y-1">
                      {backlinks.map((link) => {
                        const BacklinkIcon = link.type === 'npc' ? User
                          : link.type === 'faction' ? Swords
                          : link.type === 'location' ? MapPin
                          : link.type === 'quest' ? ScrollText
                          : MapPin
                        return (
                          <div
                            key={link.id}
                            className="backlink-item"
                            onClick={() => {
                              if (link.type === 'npc') {
                                router.push(`/campaigns/${campaignId}/npcs/${link.id}`)
                              } else if (link.type === 'faction') {
                                router.push(`/campaigns/${campaignId}/factions/${link.id}`)
                              } else if (link.type === 'location') {
                                router.push(`/campaigns/${campaignId}/locations/${link.id}`)
                              } else if (link.type === 'quest') {
                                router.push(`/campaigns/${campaignId}/quest-board`)
                              }
                            }}
                          >
                            <BacklinkIcon className="backlink-icon" />
                            <span>{link.name}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}

