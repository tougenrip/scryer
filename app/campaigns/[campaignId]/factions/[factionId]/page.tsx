'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { marked } from 'marked'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { X, Moon, Edit, Check, ChevronLeft, Link2, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { useFactions, useUpdateFaction, useWorldLocations } from '@/hooks/useForgeContent'
import { createClient } from '@/lib/supabase/client'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCampaignNPCs } from '@/hooks/useCampaignContent'
import { EntityHistory } from '@/components/shared/entity-history'
import { ManageTags } from '@/components/shared/manage-tags'
import { ManageAssociates } from '@/components/shared/manage-associates'
import { normalizeMetadataTags } from '@/lib/utils/metadata-tags'

export default function FactionOverviewPage() {
  const params = useParams()
  const router = useRouter()
  const { campaignId: campaignIdParam, factionId: factionIdParam } = params
  const campaignId = campaignIdParam as string
  const factionId = factionIdParam as string
  const [isDm, setIsDm] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [tags, setTags] = useState<string[]>([])
  const [summary, setSummary] = useState<string>('')
  const [customLabel, setCustomLabel] = useState<string>('')
  const [backlinks, setBacklinks] = useState<
    Array<{ type: 'npc' | 'faction' | 'location' | 'quest'; name: string; id: string; relation?: string }>
  >([])
  const [leaderNPC, setLeaderNPC] = useState<{ id: string; name: string } | null>(null)
  const [headquarters, setHeadquarters] = useState<{ id: string; name: string } | null>(null)
  const [editMode, setEditMode] = useState(false)

  // Debounce timer for saving description
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)

  const { factions, loading, refetch: refetchFactions } = useFactions(campaignId)
  const { updateFaction } = useUpdateFaction()
  const { npcs: campaignNpcs } = useCampaignNPCs(campaignId, isDm)
  const { locations: worldLocations } = useWorldLocations(campaignId, isDm)

  const npcOptions = useMemo(
    () => [...campaignNpcs].sort((a, b) => a.name.localeCompare(b.name)),
    [campaignNpcs]
  )
  const locationOptions = useMemo(
    () => [...worldLocations].sort((a, b) => a.name.localeCompare(b.name)),
    [worldLocations]
  )
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
      setOptimisticDescription(htmlContent)
      const res = await updateFaction(factionId, { description: htmlContent })
      if (res.success) await refetchFactions({ silent: true })
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
      void updateFaction(factionId, { description: htmlContent }).then((res) => {
        if (res.success) void refetchFactions({ silent: true })
      })
    }
    previousEditModeRef.current = editMode
  }, [editMode, isDm, faction, markdownContent, factionId, updateFaction, refetchFactions])

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

  // Load leader NPC and headquarters (clear when unlinked in DB)
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
        setLeaderNPC(npc ?? null)
      } else {
        setLeaderNPC(null)
      }

      if (faction.headquarters_location_id) {
        const { data: loc } = await supabase
          .from('world_locations')
          .select('id, name')
          .eq('id', faction.headquarters_location_id)
          .single()
        setHeadquarters(loc ?? null)
      } else {
        setHeadquarters(null)
      }
    }
    loadRelatedData()
  }, [faction])

  const handleLeaderChange = useCallback(
    async (value: string) => {
      if (!faction) return
      if (value === 'none') {
        const res = await updateFaction(factionId, {
          leader_npc_id: null,
          leader_name: null,
        })
        if (!res.success) {
          toast.error('Could not update leader')
          return
        }
        setLeaderNPC(null)
      } else {
        const npc = npcOptions.find(n => n.id === value)
        const res = await updateFaction(factionId, {
          leader_npc_id: value,
          leader_name: npc?.name ?? null,
        })
        if (!res.success) {
          toast.error('Could not update leader')
          return
        }
        if (npc) setLeaderNPC({ id: npc.id, name: npc.name })
      }
      await refetchFactions({ silent: true })
    },
    [faction, factionId, updateFaction, npcOptions, refetchFactions]
  )

  const handleHeadquartersChange = useCallback(
    async (value: string) => {
      if (!faction) return
      if (value === 'none') {
        const res = await updateFaction(factionId, {
          headquarters_location_id: null,
        })
        if (!res.success) {
          toast.error('Could not update headquarters')
          return
        }
        setHeadquarters(null)
      } else {
        const loc = locationOptions.find(l => l.id === value)
        const res = await updateFaction(factionId, {
          headquarters_location_id: value,
        })
        if (!res.success) {
          toast.error('Could not update headquarters')
          return
        }
        if (loc) setHeadquarters({ id: loc.id, name: loc.name })
      }
      await refetchFactions({ silent: true })
    },
    [faction, factionId, updateFaction, locationOptions, refetchFactions]
  )

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
      setTags(normalizeMetadataTags(faction.metadata?.tags))

      if (faction.metadata?.custom_label) {
        setCustomLabel(String(faction.metadata.custom_label))
      } else {
        setCustomLabel('')
      }
    }
  }, [faction])

  // Load associate names from IDs (do not reset backlinks on unrelated faction refetches — e.g. identity fields)
  useEffect(() => {
    async function loadAssociateNames() {
      if (!faction) return
      
      const metadataAssociates = faction.metadata?.associates || []
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
  }, [faction?.id, faction?.metadata?.associates])

  const copyPageUrl = () => {
    if (typeof window === 'undefined') return
    void navigator.clipboard.writeText(window.location.href)
    toast.success('Link copied')
  }

  if (loading) {
    return (
      <div className="flex h-full min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold">Loading faction...</p>
        </div>
      </div>
    )
  }

  if (!faction) {
    return (
      <div className="flex h-full min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <p className="mb-2 text-lg font-semibold">Faction not found</p>
          <Button onClick={() => router.push(`/campaigns/${campaignId}/forge?tab=factions`)}>
            Back to Factions
          </Button>
        </div>
      </div>
    )
  }

  const secret = isDm && faction.secret_agenda?.trim() ? faction.secret_agenda : null

  const features: { name: string; description: string; icon: string }[] = []
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
    <div className="sc-fade-in relative min-h-full bg-background">
      <div className="relative h-[280px] w-full shrink-0 overflow-hidden">
        {faction.emblem_sigil_url ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- dynamic campaign URLs */}
            <img
              src={faction.emblem_sigil_url}
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
            onClick={() => router.push(`/campaigns/${campaignId}/forge?tab=factions`)}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Factions
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
            onClick={() => router.push(`/campaigns/${campaignId}/forge?tab=factions`)}
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
              {faction.emblem_sigil_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={faction.emblem_sigil_url}
                  alt={faction.name}
                  className="h-[120px] w-[120px] shrink-0 rounded-[14px] border-2 border-border object-cover shadow-xl"
                />
              ) : (
                <div
                  className="flex h-[120px] w-[120px] shrink-0 items-center justify-center rounded-[14px] border border-stone-700/70 bg-gradient-to-br from-orange-900 via-amber-900 to-yellow-950 font-serif text-[54px] font-semibold leading-none tracking-tight text-white shadow-xl shadow-black/50"
                  aria-hidden
                >
                  <Moon className="h-14 w-14 text-white/90" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="sc-label mb-1">Faction</div>
                <h1 className="font-serif text-3xl font-bold tracking-tight sm:text-[42px] sm:leading-[1.05]">
                  {faction.name}
                </h1>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {tags.map((t) => (
                    <span key={t} className="sc-badge">
                      {t}
                    </span>
                  ))}
                  {faction.type ? <span className="sc-badge">{faction.type}</span> : null}
                  {faction.alignment ? <span className="sc-badge">{faction.alignment}</span> : null}
                  {faction.influence_level ? <span className="sc-badge">{faction.influence_level}</span> : null}
                  {faction.leader_name ? <span className="sc-badge">👑 {faction.leader_name}</span> : null}
                </div>
                {isDm && editMode && (
                  <div className="mt-4 max-w-xl">
                    <ManageTags
                      campaignId={campaignId}
                      entityId={factionId}
                      entityType="faction"
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

                {faction.public_agenda ? (
                  <div>
                    <h3 className="mb-2 text-xl font-bold">Public Agenda</h3>
                    <p className="whitespace-pre-wrap text-muted-foreground">{faction.public_agenda}</p>
                  </div>
                ) : null}

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
                  <div className="space-y-4">
                    {features.map((feature, index) => (
                      <div key={index} className="flex gap-4 rounded-lg bg-muted/50 p-4">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500/20 to-yellow-500/20">
                          <span className="text-2xl">{feature.icon}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="mb-1 text-lg font-semibold">{feature.name}</h4>
                          <p className="text-sm text-muted-foreground">{feature.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
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
            </Tabs>
          </div>

          <aside className="flex flex-col gap-4 lg:-mt-5">
            <div className="sc-card p-4">
              <div className="sc-label mb-2.5">Identity</div>
              {isDm && editMode ? (
                <div className="space-y-3">
                  <div>
                    <div className="mb-1 text-xs text-muted-foreground">Leader</div>
                    <Select
                      value={faction.leader_npc_id ?? 'none'}
                      onValueChange={(v) => void handleLeaderChange(v)}
                    >
                      <SelectTrigger className="h-9 w-full text-xs">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— None —</SelectItem>
                        {npcOptions.map(npc => (
                          <SelectItem key={npc.id} value={npc.id}>
                            {npc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!faction.leader_npc_id && faction.leader_name ? (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Legacy name (no NPC link): {faction.leader_name}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <div className="mb-1 text-xs text-muted-foreground">Headquarters</div>
                    <Select
                      value={faction.headquarters_location_id ?? 'none'}
                      onValueChange={(v) => void handleHeadquartersChange(v)}
                    >
                      <SelectTrigger className="h-9 w-full text-xs">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— None —</SelectItem>
                        {locationOptions.map(loc => (
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
                    <span className="text-muted-foreground">Leader</span>
                    <span className="max-w-[60%] text-right font-medium">
                      {leaderNPC?.name ?? faction.leader_name ?? '—'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-dashed border-border/60 py-1.5 text-xs last:border-b-0">
                    <span className="text-muted-foreground">Headquarters</span>
                    <span className="max-w-[60%] text-right font-medium">{headquarters?.name ?? '—'}</span>
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
                    if (!faction) return
                    const supabase = createClient()
                    const currentMetadata = faction.metadata || {}
                    await supabase
                      .from('factions')
                      .update({
                        metadata: { ...currentMetadata, summary: summary.trim() || null },
                      })
                      .eq('id', factionId)
                    await refetchFactions({ silent: true })
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

            {customLabel ? (
              <div className="sc-card p-4">
                <div className="sc-label mb-2.5">Custom label</div>
                <p className="text-sm">{customLabel}</p>
              </div>
            ) : null}

            <div className="sc-card p-4">
              <ManageAssociates
                campaignId={campaignId}
                entityId={factionId}
                entityType="faction"
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

