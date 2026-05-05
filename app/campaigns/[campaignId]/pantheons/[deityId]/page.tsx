'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { marked } from 'marked'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { X, Sparkles, Edit, Check, ChevronLeft, Link2 } from 'lucide-react'
import { toast } from 'sonner'
import { usePantheonDeities, useUpdatePantheonDeity, type PantheonDeity } from '@/hooks/useForgeContent'
import { createClient } from '@/lib/supabase/client'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ManageTags } from '@/components/shared/manage-tags'
import { ManageAssociates } from '@/components/shared/manage-associates'
import { EntityHistory } from '@/components/shared/entity-history'
import { normalizeMetadataTags } from '@/lib/utils/metadata-tags'

const DEITY_ALIGNMENTS: Array<NonNullable<PantheonDeity['alignment']>> = [
  'LG',
  'NG',
  'CG',
  'LN',
  'N',
  'CN',
  'LE',
  'NE',
  'CE',
]

export default function PantheonOverviewPage() {
  const params = useParams()
  const router = useRouter()
  const { campaignId: campaignIdParam, deityId: deityIdParam } = params
  const campaignId = campaignIdParam as string
  const deityId = deityIdParam as string
  const [isDm, setIsDm] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [tags, setTags] = useState<string[]>([])
  const [summary, setSummary] = useState<string>('')
  const [customLabel, setCustomLabel] = useState<string>('')
  const [backlinks, setBacklinks] = useState<
    Array<{ type: 'npc' | 'faction' | 'location' | 'quest'; name: string; id: string; relation?: string }>
  >([])
  const [worshipLocations, setWorshipLocations] = useState<Array<{ id: string; name: string }>>([])
  const [deityTitle, setDeityTitle] = useState('')
  const [editMode, setEditMode] = useState(false)

  // Debounce timer for saving description
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)

  const { deities, loading, refetch: refetchDeities } = usePantheonDeities(campaignId)
  const { updateDeity } = useUpdatePantheonDeity()
  const baseDeity = deities.find(d => d.id === deityId)
  // Local state to track optimistic updates
  const [optimisticDescription, setOptimisticDescription] = useState<string | null>(null)
  const deity = useMemo(() => {
    if (!baseDeity) return baseDeity
    return { ...baseDeity, description: optimisticDescription ?? baseDeity.description }
  }, [baseDeity, optimisticDescription])

  useEffect(() => {
    if (deity) setDeityTitle(deity.title ?? '')
  }, [deity])

  const handleDeityAlignmentChange = useCallback(
    async (value: string) => {
      if (!deity) return
      const alignment =
        value === 'none' ? null : (value as NonNullable<PantheonDeity['alignment']>)
      const res = await updateDeity(deityId, { alignment })
      if (!res.success) {
        toast.error('Could not update alignment')
        return
      }
      await refetchDeities({ silent: true })
    },
    [deity, deityId, updateDeity, refetchDeities]
  )

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
      setOptimisticDescription(htmlContent)
      const res = await updateDeity(deityId, { description: htmlContent })
      if (res.success) await refetchDeities({ silent: true })
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
      void updateDeity(deityId, { description: htmlContent }).then((res) => {
        if (res.success) void refetchDeities({ silent: true })
      })
    }
    previousEditModeRef.current = editMode
  }, [editMode, isDm, deity, markdownContent, deityId, updateDeity, refetchDeities])

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

  useEffect(() => {
    if (deity) {
      setTags(normalizeMetadataTags(deity.metadata?.tags))

      if (deity.metadata?.custom_label) {
        setCustomLabel(String(deity.metadata.custom_label))
      } else {
        setCustomLabel('')
      }
    }
  }, [deity])

  // Load associate names from IDs (do not reset backlinks on unrelated deity refetches — e.g. identity fields)
  useEffect(() => {
    async function loadAssociateNames() {
      if (!deity) return
      
      const metadataAssociates = deity.metadata?.associates || []
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
        }
      }

      setBacklinks(linksWithNames)
    }
    loadAssociateNames()
  }, [deity?.id, deity?.metadata?.associates])

  const copyPageUrl = () => {
    if (typeof window === 'undefined') return
    void navigator.clipboard.writeText(window.location.href)
    toast.success('Link copied')
  }

  if (loading) {
    return (
      <div className="flex h-full min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold">Loading deity...</p>
        </div>
      </div>
    )
  }

  if (!deity) {
    return (
      <div className="flex h-full min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <p className="mb-2 text-lg font-semibold">Deity not found</p>
          <Button onClick={() => router.push(`/campaigns/${campaignId}/forge?tab=pantheon`)}>
            Back to Pantheon
          </Button>
        </div>
      </div>
    )
  }

  const features: { name: string; description: string; icon: string }[] = []
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
    <div className="sc-fade-in relative min-h-full bg-background">
      <div className="relative h-[280px] w-full shrink-0 overflow-hidden">
        {deity.image_url ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- dynamic campaign URLs */}
            <img
              src={deity.image_url}
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
            onClick={() => router.push(`/campaigns/${campaignId}/forge?tab=pantheon`)}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Pantheon
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
            onClick={() => router.push(`/campaigns/${campaignId}/forge?tab=pantheon`)}
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
              {deity.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={deity.image_url}
                  alt={deity.name}
                  className="h-[120px] w-[120px] shrink-0 rounded-[14px] border-2 border-border object-cover shadow-xl"
                />
              ) : (
                <div
                  className="flex h-[120px] w-[120px] shrink-0 items-center justify-center rounded-[14px] border border-stone-700/70 bg-gradient-to-br from-purple-900 via-violet-900 to-indigo-950 shadow-xl shadow-black/50"
                  aria-hidden
                >
                  <Sparkles className="h-14 w-14 text-white/90" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="sc-label mb-1">Deity</div>
                <h1 className="font-serif text-3xl font-bold tracking-tight sm:text-[42px] sm:leading-[1.05]">
                  {deity.name}
                  {deity.title ? (
                    <span className="ml-2 text-xl font-normal text-muted-foreground">({deity.title})</span>
                  ) : null}
                </h1>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {tags.map((t) => (
                    <span key={t} className="sc-badge">
                      {t}
                    </span>
                  ))}
                  {deity.domain?.map((domain) => (
                    <span key={domain} className="sc-badge">
                      {domain}
                    </span>
                  ))}
                  {deity.alignment ? <span className="sc-badge">{deity.alignment}</span> : null}
                  {deity.symbol ? (
                    <span className="sc-badge">
                      🔮 {deity.symbol}
                    </span>
                  ) : null}
                </div>
                {isDm && editMode && (
                  <div className="mt-4 max-w-xl">
                    <ManageTags
                      campaignId={campaignId}
                      entityId={deityId}
                      entityType="pantheon"
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

                {features.length > 0 ? (
                  <div className="space-y-4">
                    {features.map((feature, index) => (
                      <div key={index} className="flex gap-4 rounded-lg bg-muted/50 p-4">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500/20 to-indigo-500/20">
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

                {worshipLocations.length > 0 ? (
                  <div>
                    <h3 className="mb-3 text-xl font-bold">Places of Worship</h3>
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
                ) : null}
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
            </Tabs>
          </div>

          <aside className="flex flex-col gap-4 lg:-mt-5">
            <div className="sc-card p-4">
              <div className="sc-label mb-2.5">Identity</div>
              {isDm && editMode ? (
                <div className="space-y-3">
                  <div>
                    <div className="mb-1 text-xs text-muted-foreground">Title</div>
                    <Input
                      value={deityTitle}
                      onChange={(e) => setDeityTitle(e.target.value)}
                      onBlur={async () => {
                        if (!deity) return
                        const trimmed = deityTitle.trim()
                        const next = trimmed || null
                        if (next === (deity.title ?? null)) return
                        const res = await updateDeity(deityId, { title: next })
                        if (!res.success) {
                          toast.error('Could not update title')
                          return
                        }
                        await refetchDeities({ silent: true })
                      }}
                      placeholder="e.g. God of Storms"
                      className="h-9 text-xs"
                    />
                  </div>
                  <div>
                    <div className="mb-1 text-xs text-muted-foreground">Alignment</div>
                    <Select
                      value={deity.alignment ?? 'none'}
                      onValueChange={(v) => void handleDeityAlignmentChange(v)}
                    >
                      <SelectTrigger className="h-9 w-full text-xs">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— None —</SelectItem>
                        {DEITY_ALIGNMENTS.map(a => (
                          <SelectItem key={a} value={a}>
                            {a}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between gap-4 border-b border-dashed border-border/60 py-1.5 text-xs last:border-b-0">
                    <span className="text-muted-foreground">Title</span>
                    <span className="max-w-[60%] text-right font-medium">{deity.title ?? '—'}</span>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-dashed border-border/60 py-1.5 text-xs last:border-b-0">
                    <span className="text-muted-foreground">Alignment</span>
                    <span className="max-w-[60%] text-right font-medium">{deity.alignment ?? '—'}</span>
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
                    if (!deity) return
                    const supabase = createClient()
                    const currentMetadata = deity.metadata || {}
                    await supabase
                      .from('pantheon_deities')
                      .update({
                        metadata: { ...currentMetadata, summary: summary.trim() || null },
                      })
                      .eq('id', deityId)
                    await refetchDeities({ silent: true })
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
                entityId={deityId}
                entityType="pantheon"
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

