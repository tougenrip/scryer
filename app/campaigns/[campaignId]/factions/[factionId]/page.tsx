'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { marked } from 'marked'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { X, Moon, MapPin, History, Users, Swords, Edit, Check } from 'lucide-react'
import { useFactions, useUpdateFaction, useScenes, useScene, useLocationMarkers } from '@/hooks/useForgeContent'
import { createClient } from '@/lib/supabase/client'
import type { Faction } from '@/hooks/useForgeContent'
import { FactionFormDialog } from '@/components/forge/factions/faction-form-dialog'
import { AtlasMap } from '@/components/forge/atlas/atlas-map'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { EntityHistory } from '@/components/shared/entity-history'
import { ManageTags } from '@/components/shared/manage-tags'
import { ManageAssociates } from '@/components/shared/manage-associates'

export default function FactionOverviewPage() {
  const params = useParams()
  const router = useRouter()
  const { campaignId: campaignIdParam, factionId: factionIdParam } = params
  const campaignId = campaignIdParam as string
  const factionId = factionIdParam as string
  const [userId, setUserId] = useState<string | null>(null)
  const [isDm, setIsDm] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [tags, setTags] = useState<string[]>([])
  const [summary, setSummary] = useState<string>('')
  const [customLabel, setCustomLabel] = useState<string>('')
  const [backlinks, setBacklinks] = useState<Array<{ type: string; name: string; id: string }>>([])
  const [leaderNPC, setLeaderNPC] = useState<{ id: string; name: string } | null>(null)
  const [headquarters, setHeadquarters] = useState<{ id: string; name: string } | null>(null)
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)

  // Debounce timer for saving description
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)

  const { factions, loading } = useFactions(campaignId)
  const { updateFaction, loading: updating } = useUpdateFaction()
  const { scenes, loading: scenesLoading } = useScenes(campaignId)
  const { scene, loading: sceneLoading } = useScene(selectedSceneId)
  const { markers, loading: markersLoading } = useLocationMarkers(campaignId, selectedSceneId)
  const baseFaction = factions.find(f => f.id === factionId)
  // Local state to track optimistic updates
  const [optimisticDescription, setOptimisticDescription] = useState<string | null>(null)
  const faction = useMemo(() => {
    if (!baseFaction) return baseFaction
    return { ...baseFaction, description: optimisticDescription ?? baseFaction.description }
  }, [baseFaction, optimisticDescription])

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
    if (!faction) return ''
    const description = faction.description || ''
    // Return description as-is, don't add heading
    return description
  }, [faction])

  // Handle markdown content changes
  const handleMarkdownChange = (value: string) => {
    setMarkdownContent(value)
    if (!faction || !isDm || !editMode) return
    // Clear existing timer
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }
    // Save after 1 second of no typing
    saveTimerRef.current = setTimeout(async () => {
      const htmlContent = markdownToHtml(value)
      // Optimistically update local state
      setOptimisticDescription(htmlContent)
      await updateFaction(factionId, { description: htmlContent })
    }, 1000)
  }

  // Initialize markdown content when entering edit mode
  useEffect(() => {
    if (editMode && isDm && faction) {
      const htmlContent = getHtmlContent()
      const markdown = htmlToMarkdown(htmlContent)
      setMarkdownContent(markdown)
    }
  }, [editMode, isDm, faction, getHtmlContent])

  // Save markdown content when exiting edit mode
  const previousEditModeRef = useRef(editMode)
  useEffect(() => {
    // If edit mode changed from true to false, save immediately
    if (previousEditModeRef.current && !editMode && isDm && faction && markdownContent) {
      // Clear any pending debounced save
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
      // Save immediately and update local state
      const htmlContent = markdownToHtml(markdownContent)
      setOptimisticDescription(htmlContent)
      updateFaction(factionId, { description: htmlContent })
    }
    previousEditModeRef.current = editMode
  }, [editMode, isDm, faction, markdownContent, factionId, updateFaction])

  // Reset optimistic description when faction data updates from server
  useEffect(() => {
    if (baseFaction?.description && optimisticDescription && baseFaction.description === optimisticDescription) {
      setOptimisticDescription(null)
    }
  }, [baseFaction?.description, optimisticDescription])

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
    if (faction?.scene_id) {
      setSelectedSceneId(faction.scene_id)
    }
  }, [faction?.scene_id])

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

  // Load leader NPC and headquarters
  useEffect(() => {
    async function loadRelatedData() {
      if (!faction) return
      const supabase = createClient()

      if (faction.leader_npc_id) {
        const { data: npc } = await supabase
          .from('npcs')
          .select('id, name')
          .eq('id', faction.leader_npc_id)
          .single()
        if (npc) setLeaderNPC(npc)
      }

      if (faction.headquarters_location_id) {
        const { data: location } = await supabase
          .from('world_locations')
          .select('id, name')
          .eq('id', faction.headquarters_location_id)
          .single()
        if (location) setHeadquarters(location)
      }
    }
    loadRelatedData()
  }, [faction])

  // Load summary from metadata
  useEffect(() => {
    if (faction?.metadata?.summary) {
      // If metadata summary exists, use it (strip HTML if present)
      setSummary(stripHtml(faction.metadata.summary))
    } else {
      // Don't auto-populate from description, summary is separate
      setSummary('')
    }
  }, [faction])

  // Load tags and associates from metadata
  useEffect(() => {
    if (faction) {
      // Load tags from metadata
      const tagsArray = faction.metadata?.tags || []
      setTags(tagsArray)

      // Load associates from metadata
      const metadataAssociates = faction.metadata?.associates || []
      const associatesArray: Array<{ type: string; name: string; id: string }> = []
      
      metadataAssociates.forEach((assoc: any) => {
        associatesArray.push({ type: assoc.type, id: assoc.id, name: '' })
      })
      
      setBacklinks(associatesArray)
    }
  }, [faction])

  // Load associate names from IDs
  useEffect(() => {
    async function loadAssociateNames() {
      if (!faction) return
      
      const metadataAssociates = faction.metadata?.associates || []
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
  }, [faction?.metadata?.associates])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold">Loading faction...</p>
        </div>
      </div>
    )
  }

  if (!faction) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold mb-2">Faction not found</p>
          <Button onClick={() => router.push(`/campaigns/${campaignId}/forge?tab=factions`)}>
            Back to Factions
          </Button>
        </div>
      </div>
    )
  }

  // Extract secret from secret_agenda
  const secret = faction.secret_agenda

  // Build features from goals and resources
  const features = []
  if (faction.goals && faction.goals.length > 0) {
    features.push({
      name: 'Goals',
      description: faction.goals.join(', '),
      icon: '🎯'
    })
  }
  if (faction.resources && faction.resources.length > 0) {
    features.push({
      name: 'Resources',
      description: faction.resources.join(', '),
      icon: '💎'
    })
  }
  if (faction.motto_creed) {
    features.push({
      name: 'Motto',
      description: faction.motto_creed,
      icon: '📜'
    })
  }

  return (
    <div className="flex h-full bg-background overflow-hidden">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header with illustration */}
        <div className="relative w-full h-64 md:h-80 overflow-hidden flex-shrink-0">
        {faction.emblem_sigil_url ? (
          <img
            src={faction.emblem_sigil_url}
            alt={faction.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-orange-900 via-amber-900 to-yellow-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
          <div className="flex items-center gap-2 mb-4">
            <Moon className="h-5 w-5 text-foreground" />
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">{faction.name}</h1>
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
            onClick={() => router.push(`/campaigns/${campaignId}/forge?tab=factions`)}
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

                {/* Public Agenda */}
                {faction.public_agenda && (
                  <div>
                    <h3 className="text-xl font-bold mb-2">Public Agenda</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap">{faction.public_agenda}</p>
                  </div>
                )}

                {/* Secret Section */}
                {secret && (
                  <div className="border-2 border-dashed border-purple-500/50 rounded-lg p-6 bg-purple-500/5">
                    <h3 className="text-xl font-bold mb-2">Secret</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap">{secret}</p>
                  </div>
                )}

                {/* Features/Items */}
                {features.length > 0 && (
                  <div className="space-y-4">
                    {features.map((feature, index) => (
                      <div key={index} className="flex gap-4 p-4 rounded-lg bg-muted/50">
                        <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-gradient-to-br from-orange-500/20 to-yellow-500/20 flex items-center justify-center">
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

                {/* Type, Alignment, Influence */}
                <div className="flex flex-wrap gap-2">
                  {faction.type && <Badge variant="secondary">{faction.type}</Badge>}
                  {faction.alignment && <Badge variant="outline">{faction.alignment}</Badge>}
                  {faction.influence_level && <Badge variant="outline">{faction.influence_level}</Badge>}
                  {faction.leader_name && <Badge variant="outline">👑 {faction.leader_name}</Badge>}
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
                        if (faction && isDm) {
                          await updateFaction(factionId, {
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
                  entityId={factionId} 
                  entityType="faction"
                  isDm={isDm}
                  editMode={editMode}
                  />
                  </TabsContent>

                  <TabsContent value="associates" className="mt-0">
                <ManageAssociates
                  campaignId={campaignId}
                  entityId={factionId}
                  entityType="faction"
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
                      if (!faction) return
                      const supabase = createClient()
                      const currentMetadata = faction.metadata || {}
                      await supabase
                        .from('factions')
                        .update({
                          metadata: { ...currentMetadata, summary: summary.trim() || null }
                        })
                        .eq('id', factionId)
                    }}
                    placeholder="Enter a brief summary of this faction..."
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
                entityId={factionId}
                entityType="faction"
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
                        if (link.type === 'npc') {
                          router.push(`/campaigns/${campaignId}/npcs/${link.id}`)
                        } else if (link.type === 'location') {
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

