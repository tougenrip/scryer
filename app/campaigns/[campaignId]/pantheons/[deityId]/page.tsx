'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { marked } from 'marked'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { X, Moon, MapPin, History, Users, Sparkles, Edit, Check } from 'lucide-react'
import { usePantheonDeities, useUpdatePantheonDeity, useScenes, useScene, useLocationMarkers } from '@/hooks/useForgeContent'
import { createClient } from '@/lib/supabase/client'
import type { PantheonDeity } from '@/hooks/useForgeContent'
import { ContentSidebar } from '@/components/forge/navigation/content-sidebar'
import { DeityFormDialog } from '@/components/forge/pantheon/deity-form-dialog'
import { AtlasMap } from '@/components/forge/atlas/atlas-map'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ManageTags } from '@/components/shared/manage-tags'
import { ManageAssociates } from '@/components/shared/manage-associates'
import { EntityHistory } from '@/components/shared/entity-history'

const alignmentOptions = [
  { value: "LG", label: "Lawful Good" },
  { value: "NG", label: "Neutral Good" },
  { value: "CG", label: "Chaotic Good" },
  { value: "LN", label: "Lawful Neutral" },
  { value: "N", label: "Neutral" },
  { value: "CN", label: "Chaotic Neutral" },
  { value: "LE", label: "Lawful Evil" },
  { value: "NE", label: "Neutral Evil" },
  { value: "CE", label: "Chaotic Evil" },
]

const domainOptions = [
  "War", "Peace", "Life", "Death", "Light", "Darkness", "Nature", "Chaos",
  "Order", "Wisdom", "Knowledge", "Trickery", "Tempest", "Forge", "Grave",
  "Arcana", "Strength", "Beauty", "Love", "Hate", "Justice", "Mercy",
  "Travel", "Commerce", "Secrets", "Music", "Poetry", "Healing"
]

export default function PantheonOverviewPage() {
  const params = useParams()
  const router = useRouter()
  const { campaignId: campaignIdParam, deityId: deityIdParam } = params
  const campaignId = campaignIdParam as string
  const deityId = deityIdParam as string
  const [userId, setUserId] = useState<string | null>(null)
  const [isDm, setIsDm] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [tags, setTags] = useState<string[]>([])
  const [summary, setSummary] = useState<string>('')
  const [customLabel, setCustomLabel] = useState<string>('')
  const [backlinks, setBacklinks] = useState<Array<{ type: string; name: string; id: string }>>([])
  const [worshipLocations, setWorshipLocations] = useState<Array<{ id: string; name: string }>>([])
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)

  // Debounce timer for saving description
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)

  const { deities, loading } = usePantheonDeities(campaignId)
  const { updateDeity, loading: updating } = useUpdatePantheonDeity()
  const { scenes, loading: scenesLoading } = useScenes(campaignId)
  const { scene, loading: sceneLoading } = useScene(selectedSceneId)
  const { markers, loading: markersLoading } = useLocationMarkers(campaignId, selectedSceneId)
  const baseDeity = deities.find(d => d.id === deityId)
  // Local state to track optimistic updates
  const [optimisticDescription, setOptimisticDescription] = useState<string | null>(null)
  const deity = useMemo(() => {
    if (!baseDeity) return baseDeity
    return { ...baseDeity, description: optimisticDescription ?? baseDeity.description }
  }, [baseDeity, optimisticDescription])

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
    if (!deity) return ''
    const description = deity.description || ''
    // Return description as-is, don't add heading
    return description
  }, [deity])

  // Handle markdown content changes
  const handleMarkdownChange = (value: string) => {
    setMarkdownContent(value)
    if (!deity || !isDm || !editMode) return
    // Clear existing timer
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }
    // Save after 1 second of no typing
    saveTimerRef.current = setTimeout(async () => {
      const htmlContent = markdownToHtml(value)
      // Optimistically update local state
      setOptimisticDescription(htmlContent)
      await updateDeity(deityId, { description: htmlContent })
    }, 1000)
  }

  // Initialize markdown content when entering edit mode
  useEffect(() => {
    if (editMode && isDm && deity) {
      const htmlContent = getHtmlContent()
      const markdown = htmlToMarkdown(htmlContent)
      setMarkdownContent(markdown)
    }
  }, [editMode, isDm, deity, getHtmlContent])

  // Save markdown content when exiting edit mode
  const previousEditModeRef = useRef(editMode)
  useEffect(() => {
    // If edit mode changed from true to false, save immediately
    if (previousEditModeRef.current && !editMode && isDm && deity && markdownContent) {
      // Clear any pending debounced save
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
      // Save immediately and update local state
      const htmlContent = markdownToHtml(markdownContent)
      setOptimisticDescription(htmlContent)
      updateDeity(deityId, { description: htmlContent })
    }
    previousEditModeRef.current = editMode
  }, [editMode, isDm, deity, markdownContent, deityId, updateDeity])

  // Reset optimistic description when deity data updates from server
  useEffect(() => {
    if (baseDeity?.description && optimisticDescription && baseDeity.description === optimisticDescription) {
      setOptimisticDescription(null)
    }
  }, [baseDeity?.description, optimisticDescription])

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
    if (deity?.scene_id) {
      setSelectedSceneId(deity.scene_id)
    }
  }, [deity?.scene_id])

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

  // Load worship locations
  useEffect(() => {
    async function loadWorshipLocations() {
      if (!deity || !deity.worshipers_location_ids || deity.worshipers_location_ids.length === 0) return
      const supabase = createClient()

      const { data: locations } = await supabase
        .from('world_locations')
        .select('id, name')
        .in('id', deity.worshipers_location_ids)
        .eq('campaign_id', campaignId)

      if (locations) {
        setWorshipLocations(locations)
        locations.forEach(loc => {
          setBacklinks(prev => [...prev, { type: 'location', name: loc.name, id: loc.id }])
        })
      }
    }
    loadWorshipLocations()
  }, [deity, campaignId])

  // Load summary from metadata
  useEffect(() => {
    if (deity?.metadata?.summary) {
      // If metadata summary exists, use it (strip HTML if present)
      setSummary(stripHtml(deity.metadata.summary))
    } else {
      // Don't auto-populate from description, summary is separate
      setSummary('')
    }
  }, [deity])

  // Load tags and associates from metadata
  useEffect(() => {
    if (deity) {
      // Load tags from metadata
      const tagsArray = deity.metadata?.tags || []
      setTags(tagsArray)

      // Load associates from metadata
      const metadataAssociates = deity.metadata?.associates || []
      const associatesArray: Array<{ type: string; name: string; id: string }> = []
      
      metadataAssociates.forEach((assoc: any) => {
        associatesArray.push({ type: assoc.type, id: assoc.id, name: '' })
      })
      
      setBacklinks(associatesArray)
    }
  }, [deity])

  // Load associate names from IDs
  useEffect(() => {
    async function loadAssociateNames() {
      if (!deity) return
      
      const metadataAssociates = deity.metadata?.associates || []
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
        }
      }

      if (linksWithNames.length > 0) {
        setBacklinks(linksWithNames)
      }
    }
    loadAssociateNames()
  }, [deity?.metadata?.associates])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold">Loading deity...</p>
        </div>
      </div>
    )
  }

  if (!deity) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold mb-2">Deity not found</p>
          <Button onClick={() => router.push(`/campaigns/${campaignId}/forge?tab=pantheon`)}>
            Back to Pantheon
          </Button>
        </div>
      </div>
    )
  }

  // Build features from domain, symbol, and holy days
  const features = []
  if (deity.domain && deity.domain.length > 0) {
    features.push({
      name: 'Domains',
      description: deity.domain.join(', '),
      icon: '⚡'
    })
  }
  if (deity.symbol) {
    features.push({
      name: 'Symbol',
      description: deity.symbol,
      icon: '🔮'
    })
  }
  if (deity.holy_days && deity.holy_days.length > 0) {
    features.push({
      name: 'Holy Days',
      description: deity.holy_days.join(', '),
      icon: '📅'
    })
  }

  return (
    <div className="flex h-full bg-background overflow-hidden">
      {/* Left Sidebar Navigation */}
      <ContentSidebar
        campaignId={campaignId}
        currentEntityId={deityId}
        currentEntityType="pantheon"
        isDm={isDm}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header with illustration */}
        <div className="relative w-full h-64 md:h-80 overflow-hidden flex-shrink-0">
        {deity.image_url ? (
          <img
            src={deity.image_url}
            alt={deity.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-900 via-violet-900 to-indigo-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
          <div className="flex items-center gap-2 mb-4">
            <Moon className="h-5 w-5 text-foreground" />
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              {deity.name}
              {deity.title && <span className="text-xl font-normal text-muted-foreground ml-2">({deity.title})</span>}
            </h1>
            {isDm && (
              <Button
                variant={editMode ? "default" : "outline"}
                size="sm"
                onClick={() => setEditMode(!editMode)}
                className="ml-4"
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
            onClick={() => router.push(`/campaigns/${campaignId}/forge?tab=pantheon`)}
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
                <div>
                  {isDm && editMode ? (
                    <Textarea
                      value={markdownContent}
                      onChange={(e) => handleMarkdownChange(e.target.value)}
                      className="min-h-[200px] rounded-md p-4 font-mono text-sm transition-colors border border-border bg-muted/30 focus:border-ring focus:ring-1 focus:ring-ring/50 resize-none"
                      placeholder="## Heading&#10;&#10;Write your description in markdown format...&#10;&#10;**Bold text**&#10;*Italic text*&#10;- List item"
                    />
                  ) : (
                    <div className="max-w-none text-foreground [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-4 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-5 [&_h2]:mb-3 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_h4]:text-base [&_h4]:font-semibold [&_h4]:mt-3 [&_h4]:mb-2 [&_p]:leading-relaxed [&_p]:mb-4 [&_strong]:font-bold [&_em]:italic [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_li]:mb-1">
                      <div 
                        dangerouslySetInnerHTML={{ __html: getHtmlContent() || '<p>No description available.</p>' }}
                      />
                    </div>
                  )}
                </div>

                {/* Features/Items */}
                {features.length > 0 && (
                  <div className="space-y-4">
                    {features.map((feature, index) => (
                      <div key={index} className="flex gap-4 p-4 rounded-lg bg-muted/50">
                        <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-gradient-to-br from-purple-500/20 to-indigo-500/20 flex items-center justify-center">
                          <span className="text-2xl">{feature.icon}</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg mb-1">{feature.name}</h4>
                          <p className="text-sm text-muted-foreground">{feature.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Worship Locations */}
                {worshipLocations.length > 0 && (
                  <div>
                    <h3 className="text-xl font-bold mb-3">Places of Worship</h3>
                    <div className="flex flex-wrap gap-2">
                      {worshipLocations.map((loc) => (
                        <Badge
                          key={loc.id}
                          variant="outline"
                          className="cursor-pointer hover:bg-muted"
                          onClick={() => router.push(`/campaigns/${campaignId}/locations/${loc.id}`)}
                        >
                          📍 {loc.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Domain, Alignment, Symbol */}
                <div className="flex flex-wrap gap-2">
                  {deity.domain && deity.domain.length > 0 && (
                    <>
                      {deity.domain.map((domain, idx) => (
                        <Badge key={idx} variant="secondary">{domain}</Badge>
                      ))}
                    </>
                  )}
                  {deity.alignment && <Badge variant="outline">{deity.alignment}</Badge>}
                  {deity.symbol && <Badge variant="outline">🔮 {deity.symbol}</Badge>}
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
                        if (deity && isDm) {
                          await updateDeity(deityId, {
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
                  entityId={deityId} 
                  entityType="pantheon"
                  isDm={isDm}
                  editMode={editMode}
                  />
                  </TabsContent>

                  <TabsContent value="associates" className="mt-0">
                <ManageAssociates
                  campaignId={campaignId}
                  entityId={deityId}
                  entityType="pantheon"
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
            <div className="p-6 space-y-6">
              {/* Summary */}
              <div>
                <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide">SUMMARY</h3>
                {isDm && editMode ? (
                  <Textarea
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    onBlur={async () => {
                      if (!deity) return
                      const supabase = createClient()
                      const currentMetadata = deity.metadata || {}
                      await supabase
                        .from('pantheon_deities')
                        .update({
                          metadata: { ...currentMetadata, summary: summary.trim() || null }
                        })
                        .eq('id', deityId)
                    }}
                    placeholder="Enter a brief summary of this deity..."
                    className="min-h-[100px] text-sm resize-none"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {summary || 'There is no summary.'}
                  </p>
                )}
              </div>

              {/* Tags */}
              <ManageTags
                campaignId={campaignId}
                entityId={deityId}
                entityType="pantheon"
                currentTags={tags}
                onUpdate={(newTags) => setTags(newTags)}
                isDm={isDm && editMode}
              />

            {/* Custom Label */}
            {customLabel && (
              <div>
                <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide">CUSTOM LABEL</h3>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-sm">{customLabel}</p>
                </div>
              </div>
            )}

              {/* Backlinks */}
              {backlinks.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide">BACKLINKS</h3>
                  <div className="space-y-2">
                    {backlinks.map((link) => (
                      <div
                        key={link.id}
                        className="flex items-center gap-2 text-sm cursor-pointer hover:text-foreground text-muted-foreground transition-colors"
                        onClick={() => {
                          if (link.type === 'location') {
                            router.push(`/campaigns/${campaignId}/locations/${link.id}`)
                          } else if (link.type === 'quest') {
                            router.push(`/campaigns/${campaignId}/quests/${link.id}`)
                          }
                        }}
                      >
                        <span className="text-xs">•</span>
                        <span>{link.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

