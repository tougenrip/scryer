'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { marked } from 'marked'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import {
  X,
  Edit,
  Check,
  ChevronLeft,
  Link2,
  EyeOff,
  Dice5,
  Sword,
  LayoutGrid,
} from 'lucide-react'
import { toast } from 'sonner'
import { useCampaignNPCs, useUpdateNPC } from '@/hooks/useCampaignContent'
import { createClient } from '@/lib/supabase/client'
import { useClasses, useRaces } from '@/hooks/useDndContent'
import { EntityHistory } from '@/components/shared/entity-history'
import { ManageTags } from '@/components/shared/manage-tags'
import { ManageAssociates } from '@/components/shared/manage-associates'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useWorldLocations } from '@/hooks/useForgeContent'
import { cn } from '@/lib/utils'
import { normalizeMetadataTags } from '@/lib/utils/metadata-tags'

function InfoRow({ label, value }: { label: string; value: string }) {
  const empty = value === '—' || value.trim() === ''
  return (
    <div className="flex justify-between gap-4 border-b border-dashed border-border/60 py-1.5 text-xs last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          'max-w-[60%] text-right font-medium',
          empty ? 'text-muted-foreground' : 'text-foreground'
        )}
      >
        {empty ? '—' : value}
      </span>
    </div>
  )
}

export default function NPCOverviewPage() {
  const params = useParams()
  const router = useRouter()
  const { campaignId: campaignIdParam, npcId: npcIdParam } = params
  const campaignId = campaignIdParam as string
  const npcId = npcIdParam as string
  const [isDm, setIsDm] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [tags, setTags] = useState<string[]>([])
  const [summary, setSummary] = useState<string>('')
  const [customLabel, setCustomLabel] = useState<string>('')
  const [backlinks, setBacklinks] = useState<
    Array<{ type: 'npc' | 'faction' | 'location' | 'quest'; name: string; id: string; relation?: string }>
  >([])
  const [attitudeValue, setAttitudeValue] = useState(62)
  const [editMode, setEditMode] = useState(false)

  const { npcs, loading, refetch: refetchNpcs } = useCampaignNPCs(campaignId, isDm)
  const { updateNPC } = useUpdateNPC()
  const { classes, loading: classesLoading } = useClasses(campaignId, null)
  const { races, loading: racesLoading } = useRaces(campaignId, null)
  const { locations, loading: locationsLoading } = useWorldLocations(campaignId, isDm)
  const baseNPC = npcs.find((n) => n.id === npcId)
  const [optimisticDescription, setOptimisticDescription] = useState<string | null>(null)
  const npc = useMemo(() => {
    if (!baseNPC) return baseNPC
    return { ...baseNPC, description: optimisticDescription ?? baseNPC.description }
  }, [baseNPC, optimisticDescription])

  /** Same resolution as NPCs list: SRD picks need source+index lookup */
  const resolvedSpecies = useMemo(() => {
    if (!baseNPC) return null
    if (baseNPC.custom_species) return baseNPC.custom_species
    if (baseNPC.species_source && baseNPC.species_index) {
      const raceData = races.find(
        (r) => r.source === baseNPC.species_source && r.index === baseNPC.species_index
      )
      if (raceData?.name) return raceData.name
    }
    if (baseNPC.species_index) return baseNPC.species_index
    return null
  }, [baseNPC, races])

  const resolvedClass = useMemo(() => {
    if (!baseNPC) return null
    if (baseNPC.custom_class) return baseNPC.custom_class
    if (baseNPC.class_source && baseNPC.class_index) {
      const classData = classes.find(
        (c) => c.source === baseNPC.class_source && c.index === baseNPC.class_index
      )
      if (classData?.name) return classData.name
    }
    if (baseNPC.class_index) return baseNPC.class_index
    return null
  }, [baseNPC, classes])

  const locationDisplay = useMemo(() => {
    if (!baseNPC) return null
    const m = baseNPC.metadata as { location_id?: string; location?: string } | null | undefined
    if (m?.location_id && locations.length > 0) {
      const wl = locations.find((l) => l.id === m.location_id)
      if (wl?.name) return wl.name
    }
    const loc = baseNPC.location?.trim()
    if (loc) return loc
    if (m?.location && String(m.location).trim()) return String(m.location).trim()
    return null
  }, [baseNPC, locations])

  /** Sidebar location dropdown: linked world_location id, legacy name match, or none */
  const locationSelectValue = useMemo(() => {
    if (!baseNPC) return 'none'
    const m = baseNPC.metadata as { location_id?: string } | null | undefined
    if (m?.location_id && locations.some((l) => l.id === m.location_id)) {
      return m.location_id
    }
    const name = baseNPC.location?.trim()
    if (name) {
      const match = locations.find((l) => l.name.trim() === name)
      if (match) return match.id
    }
    return 'none'
  }, [baseNPC, locations])

  const speciesSelectValue = useMemo(() => {
    if (!baseNPC) return 'none'
    if (baseNPC.species_source && baseNPC.species_index) {
      return `${baseNPC.species_source}:${baseNPC.species_index}`
    }
    if (baseNPC.custom_species !== null && baseNPC.custom_species !== undefined) {
      return 'custom'
    }
    return 'none'
  }, [baseNPC])

  const classSelectValue = useMemo(() => {
    if (!baseNPC) return 'none'
    if (baseNPC.class_source && baseNPC.class_index) {
      return `${baseNPC.class_source}:${baseNPC.class_index}`
    }
    if (baseNPC.custom_class !== null && baseNPC.custom_class !== undefined) {
      return 'custom'
    }
    return 'none'
  }, [baseNPC])

  const [speciesCustomDraft, setSpeciesCustomDraft] = useState('')
  const [classCustomDraft, setClassCustomDraft] = useState('')

  useEffect(() => {
    if (!editMode || !isDm || !baseNPC) return
    setSpeciesCustomDraft(baseNPC.custom_species ?? '')
    setClassCustomDraft(baseNPC.custom_class ?? '')
  }, [editMode, isDm, baseNPC])

  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [markdownContent, setMarkdownContent] = useState<string>('')

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
      .replace(/<[^>]+>/g, '')
      .trim()
  }

  const markdownToHtml = (markdown: string): string => {
    if (!markdown) return ''
    try {
      return marked.parse(markdown, { breaks: true }) as string
    } catch (error) {
      console.error('Error parsing markdown:', error)
      return markdown
    }
  }

  const stripHtml = (html: string): string => {
    if (!html) return ''
    return html.replace(/<[^>]+>/g, '').trim()
  }

  const getHtmlContent = useCallback(() => {
    if (!npc) return ''
    return npc.description || ''
  }, [npc])

  const handleMarkdownChange = (value: string) => {
    setMarkdownContent(value)
    if (!npc || !isDm || !editMode) return
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }
    saveTimerRef.current = setTimeout(async () => {
      const htmlContent = markdownToHtml(value)
      setOptimisticDescription(htmlContent)
      await updateNPC(npcId, { description: htmlContent })
    }, 1000)
  }

  useEffect(() => {
    if (editMode && isDm && npc) {
      const htmlContent = getHtmlContent()
      setMarkdownContent(htmlToMarkdown(htmlContent))
    }
  }, [editMode, isDm, npc, getHtmlContent])

  const previousEditModeRef = useRef(editMode)
  useEffect(() => {
    if (previousEditModeRef.current && !editMode && isDm && npc && markdownContent) {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
      const htmlContent = markdownToHtml(markdownContent)
      setOptimisticDescription(htmlContent)
      updateNPC(npcId, { description: htmlContent })
    }
    previousEditModeRef.current = editMode
  }, [editMode, isDm, npc, markdownContent, npcId, updateNPC])

  useEffect(() => {
    if (baseNPC?.description && optimisticDescription && baseNPC.description === optimisticDescription) {
      setOptimisticDescription(null)
    }
  }, [baseNPC?.description, optimisticDescription])

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (npc?.metadata?.summary) {
      setSummary(stripHtml(npc.metadata.summary))
    } else {
      setSummary('')
    }
  }, [npc])

  useEffect(() => {
    if (npc?.metadata?.custom_label) {
      setCustomLabel(String(npc.metadata.custom_label))
    } else {
      setCustomLabel('')
    }
  }, [npc])

  useEffect(() => {
    const raw = npc?.metadata && typeof npc.metadata === 'object' && 'attitude_to_party' in npc.metadata
      ? Number((npc.metadata as { attitude_to_party?: number }).attitude_to_party)
      : NaN
    if (!Number.isNaN(raw) && raw >= 0 && raw <= 100) {
      setAttitudeValue(raw)
    } else {
      setAttitudeValue(62)
    }
  }, [npc?.metadata])

  useEffect(() => {
    async function getUser() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        const { data: campaign } = await supabase.from('campaigns').select('dm_user_id').eq('id', campaignId).single()
        if (campaign && campaign.dm_user_id === user.id) {
          setIsDm(true)
        }
      }
    }
    getUser()
  }, [campaignId])

  useEffect(() => {
    if (npc) {
      setTags(normalizeMetadataTags(npc.metadata?.tags))
    }
  }, [npc])

  useEffect(() => {
    async function loadAssociateNames() {
      if (!npc) return
      const metadataAssociates = npc.metadata?.associates || []
      if (metadataAssociates.length === 0) {
        setBacklinks([])
        return
      }
      const supabase = createClient()
      const linksWithNames: Array<{
        type: 'npc' | 'faction' | 'location' | 'quest'
        name: string
        id: string
        relation?: string
      }> = []

      for (const assoc of metadataAssociates as Array<{ type: string; id: string; relation?: string }>) {
        if (!assoc.id || !assoc.type) continue
        const relation = assoc.relation?.trim() || undefined
        if (assoc.type === 'npc') {
          const { data: associate } = await supabase.from('npcs').select('name').eq('id', assoc.id).single()
          if (associate) linksWithNames.push({ type: 'npc', id: assoc.id, name: associate.name, relation })
        } else if (assoc.type === 'faction') {
          const { data: associate } = await supabase.from('factions').select('name').eq('id', assoc.id).single()
          if (associate) linksWithNames.push({ type: 'faction', id: assoc.id, name: associate.name, relation })
        } else if (assoc.type === 'location') {
          const { data: associate } = await supabase.from('world_locations').select('name').eq('id', assoc.id).single()
          if (associate) linksWithNames.push({ type: 'location', id: assoc.id, name: associate.name, relation })
        } else if (assoc.type === 'quest') {
          const { data: associate } = await supabase.from('quests').select('title').eq('id', assoc.id).single()
          if (associate) linksWithNames.push({ type: 'quest', id: assoc.id, name: associate.title, relation })
        }
      }

      setBacklinks(linksWithNames)
    }
    loadAssociateNames()
  }, [npc])

  const copyPageUrl = () => {
    if (typeof window === 'undefined') return
    void navigator.clipboard.writeText(window.location.href)
    toast.success('Link copied')
  }

  const partyAttitudeLabel = (v: number) => {
    if (v < 28) return 'Hostile'
    if (v < 52) return 'Wary'
    if (v < 76) return 'Friendly'
    return 'Allied'
  }

  const saveAttitudeToMetadata = async (value: number) => {
    if (!isDm || !npc) return
    const supabase = createClient()
    const currentMetadata = npc.metadata || {}
    await supabase
      .from('npcs')
      .update({
        metadata: { ...currentMetadata, attitude_to_party: value },
      })
      .eq('id', npcId)
  }

  const persistIdentity = useCallback(
    async (updates: Parameters<typeof updateNPC>[1]) => {
      const res = await updateNPC(npcId, updates)
      if (res.success) {
        /** Background refresh — avoid toggling loading (prevents full-page spinner flash). */
        await refetchNpcs({ silent: true })
      } else {
        toast.error('Could not save NPC details')
      }
    },
    [npcId, updateNPC, refetchNpcs]
  )

  const handleSpeciesSelect = useCallback(
    async (value: string) => {
      if (!baseNPC) return
      if (value === 'none') {
        await persistIdentity({
          species_source: null,
          species_index: null,
          custom_species: null,
        })
        return
      }
      if (value === 'custom') {
        setSpeciesCustomDraft(baseNPC.custom_species ?? '')
        await persistIdentity({
          species_source: null,
          species_index: null,
          custom_species: baseNPC.custom_species ?? '',
        })
        return
      }
      const colon = value.indexOf(':')
      const source = value.slice(0, colon)
      const index = value.slice(colon + 1)
      await persistIdentity({
        species_source: source,
        species_index: index,
        custom_species: null,
      })
    },
    [baseNPC, persistIdentity]
  )

  const handleClassSelect = useCallback(
    async (value: string) => {
      if (!baseNPC) return
      if (value === 'none') {
        await persistIdentity({
          class_source: null,
          class_index: null,
          custom_class: null,
        })
        return
      }
      if (value === 'custom') {
        setClassCustomDraft(baseNPC.custom_class ?? '')
        await persistIdentity({
          class_source: null,
          class_index: null,
          custom_class: baseNPC.custom_class ?? '',
        })
        return
      }
      const colon = value.indexOf(':')
      const source = value.slice(0, colon)
      const index = value.slice(colon + 1)
      await persistIdentity({
        class_source: source,
        class_index: index,
        custom_class: null,
      })
    },
    [baseNPC, persistIdentity]
  )

  const handleLocationSelect = useCallback(
    async (value: string) => {
      if (!baseNPC) return
      const meta = {
        ...(baseNPC.metadata && typeof baseNPC.metadata === 'object' ? baseNPC.metadata : {}),
      } as Record<string, unknown>
      if (value === 'none') {
        meta.location_id = null
        await persistIdentity({ location: null, metadata: meta })
        return
      }
      const loc = locations.find((l) => l.id === value)
      meta.location_id = value
      await persistIdentity({ location: loc?.name ?? null, metadata: meta })
    },
    [baseNPC, locations, persistIdentity]
  )

  const saveSpeciesCustomBlur = useCallback(async () => {
    if (!baseNPC) return
    const trimmed = speciesCustomDraft.trim()
    if (trimmed === (baseNPC.custom_species ?? '').trim()) return
    await persistIdentity({
      species_source: null,
      species_index: null,
      custom_species: trimmed || null,
    })
  }, [baseNPC, speciesCustomDraft, persistIdentity])

  const saveClassCustomBlur = useCallback(async () => {
    if (!baseNPC) return
    const trimmed = classCustomDraft.trim()
    if (trimmed === (baseNPC.custom_class ?? '').trim()) return
    await persistIdentity({
      class_source: null,
      class_index: null,
      custom_class: trimmed || null,
    })
  }, [baseNPC, classCustomDraft, persistIdentity])

  if (loading) {
    return (
      <div className="flex h-full min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold">Loading NPC...</p>
        </div>
      </div>
    )
  }

  if (!npc) {
    return (
      <div className="flex h-full min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <p className="mb-2 text-lg font-semibold">NPC not found</p>
          <Button onClick={() => router.push(`/campaigns/${campaignId}/forge?tab=npcs`)}>Back to NPCs</Button>
        </div>
      </div>
    )
  }

  const secret =
    isDm && npc.notes
      ? npc.notes.split('\n').find((line) => line.startsWith('SECRET:'))?.replace('SECRET:', '').trim()
      : null

  const features: { name: string; description: string }[] = []
  if (npc.appearance) features.push({ name: 'Appearance', description: npc.appearance })
  if (npc.personality) features.push({ name: 'Personality', description: npc.personality })
  if (npc.background) features.push({ name: 'Background', description: npc.background })

  const npcTitle =
    npc.metadata && typeof npc.metadata === 'object' && 'title' in npc.metadata
      ? String((npc.metadata as { title?: string }).title || '')
      : ''
  const factionName =
    npc.metadata && typeof npc.metadata === 'object' && 'faction_name' in npc.metadata
      ? String((npc.metadata as { faction_name?: string }).faction_name || '')
      : ''

  const nameInitial = npc.name.trim().charAt(0).toUpperCase() || '?'

  return (
    <div className="sc-fade-in relative min-h-full bg-background">
      {/* Hero */}
      <div className="relative h-[280px] w-full shrink-0 overflow-hidden">
        {npc.image_url ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- dynamic campaign URLs */}
            <img src={npc.image_url} alt="" className="absolute inset-0 h-full w-full object-cover" aria-hidden />
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
            onClick={() => router.push(`/campaigns/${campaignId}/forge?tab=npcs`)}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            NPCs
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
            onClick={() => router.push(`/campaigns/${campaignId}/forge?tab=npcs`)}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1280px] px-4 pb-10 sm:px-8 -mt-20">
        <div className="grid grid-cols-1 gap-7 lg:grid-cols-[1fr_320px]">
          {/* Main column */}
          <div>
            {/* Identity */}
            <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end">
              {npc.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={npc.image_url}
                  alt={npc.name}
                  className="h-[120px] w-[120px] shrink-0 rounded-[14px] border-2 border-border object-cover shadow-xl"
                />
              ) : (
                <div
                  className="flex h-[120px] w-[120px] shrink-0 items-center justify-center rounded-[14px] border border-stone-700/70 bg-gradient-to-br from-teal-900 via-slate-950 to-black font-serif text-[54px] font-semibold leading-none tracking-tight text-white shadow-xl shadow-black/50"
                  aria-hidden
                >
                  {nameInitial}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="sc-label mb-1">NPC</div>
                <h1 className="font-serif text-3xl font-bold tracking-tight sm:text-[42px] sm:leading-[1.05]">
                  {npc.name}
                </h1>
                {(npcTitle || locationDisplay) && (
                  <div className="mt-1.5 space-y-0.5">
                    {npcTitle ? (
                      <p className="text-sm italic text-muted-foreground">{npcTitle}</p>
                    ) : null}
                    {locationDisplay ? (
                      <p className="text-sm text-muted-foreground">{locationDisplay}</p>
                    ) : null}
                  </div>
                )}
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {tags.map((t) => (
                    <span key={t} className="sc-badge">
                      {t}
                    </span>
                  ))}
                  {resolvedClass ? <span className="sc-badge">{resolvedClass}</span> : null}
                  {resolvedSpecies ? (
                    <span className="sc-badge sc-badge-primary">{resolvedSpecies}</span>
                  ) : null}
                </div>
                {isDm && editMode && (
                  <div className="mt-4 max-w-xl">
                    <ManageTags
                      campaignId={campaignId}
                      entityId={npcId}
                      entityType="npc"
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
                    {features.map((feature) => (
                      <React.Fragment key={feature.name}>
                        <h2>{feature.name}</h2>
                        <p className="whitespace-pre-wrap">{feature.description}</p>
                      </React.Fragment>
                    ))}
                  </div>
                )}

                {secret && (
                  <div className="dm-secret">
                    <div className="dm-secret-label">
                      <EyeOff className="h-3 w-3" aria-hidden />
                      DM secrets
                    </div>
                    <div className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{secret}</div>
                  </div>
                )}

              </TabsContent>

              <TabsContent value="history" className="mt-0">
                <EntityHistory
                  campaignId={campaignId}
                  entityId={npcId}
                  entityType="npc"
                  isDm={isDm}
                  editMode={editMode}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <aside className="flex flex-col gap-4 lg:-mt-5">
            <div className="sc-card p-4">
              <div className="sc-label mb-2.5">Identity</div>
              {isDm && editMode ? (
                <div className="space-y-3">
                  <div className="border-b border-dashed border-border/60 pb-3 last:border-b-0 last:pb-0">
                    <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Species
                    </div>
                    <Select
                      value={speciesSelectValue}
                      onValueChange={(v) => void handleSpeciesSelect(v)}
                      disabled={racesLoading}
                    >
                      <SelectTrigger className="h-8 w-full text-xs" size="sm">
                        <SelectValue placeholder="Select species" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— None —</SelectItem>
                        <SelectItem value="custom">Custom species…</SelectItem>
                        {races.map((race) => (
                          <SelectItem key={`${race.source}-${race.index}`} value={`${race.source}:${race.index}`}>
                            {race.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {speciesSelectValue === 'custom' ? (
                      <Input
                        value={speciesCustomDraft}
                        onChange={(e) => setSpeciesCustomDraft(e.target.value)}
                        onBlur={() => void saveSpeciesCustomBlur()}
                        placeholder="Enter species"
                        className="mt-2 h-8 text-xs"
                      />
                    ) : null}
                  </div>

                  <div className="border-b border-dashed border-border/60 pb-3 last:border-b-0 last:pb-0">
                    <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Class
                    </div>
                    <Select
                      value={classSelectValue}
                      onValueChange={(v) => void handleClassSelect(v)}
                      disabled={classesLoading}
                    >
                      <SelectTrigger className="h-8 w-full text-xs" size="sm">
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— None —</SelectItem>
                        <SelectItem value="custom">Custom class…</SelectItem>
                        {classes.map((cls) => (
                          <SelectItem key={`${cls.source}-${cls.index}`} value={`${cls.source}:${cls.index}`}>
                            {cls.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {classSelectValue === 'custom' ? (
                      <Input
                        value={classCustomDraft}
                        onChange={(e) => setClassCustomDraft(e.target.value)}
                        onBlur={() => void saveClassCustomBlur()}
                        placeholder="Enter class"
                        className="mt-2 h-8 text-xs"
                      />
                    ) : null}
                  </div>

                  <div className="border-b border-dashed border-border/60 pb-3 last:border-b-0 last:pb-0">
                    <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Location
                    </div>
                    <Select
                      value={locationSelectValue}
                      onValueChange={(v) => void handleLocationSelect(v)}
                      disabled={locationsLoading}
                    >
                      <SelectTrigger className="h-8 w-full text-xs" size="sm">
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— None —</SelectItem>
                        {locations.map((loc) => (
                          <SelectItem key={loc.id} value={loc.id}>
                            {loc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {locationSelectValue === 'none' &&
                    (baseNPC?.location?.trim() ?? '') !== '' &&
                    !locations.some((l) => l.name.trim() === baseNPC?.location?.trim()) ? (
                      <p className="mt-1.5 text-[10px] leading-snug text-muted-foreground">
                        Unlinked text: &quot;{baseNPC?.location?.trim() ?? ''}&quot;. Pick a location above to attach this NPC
                        to the atlas, or clear the field with None.
                      </p>
                    ) : null}
                  </div>

                  {factionName ? (
                    <div className="pt-0.5">
                      <InfoRow label="Faction" value={factionName} />
                    </div>
                  ) : null}
                </div>
              ) : (
                <>
                  <InfoRow label="Species" value={resolvedSpecies ?? '—'} />
                  <InfoRow label="Class" value={resolvedClass ?? '—'} />
                  <InfoRow label="Location" value={locationDisplay ?? '—'} />
                  {factionName ? <InfoRow label="Faction" value={factionName} /> : null}
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
                    if (!npc) return
                    const supabase = createClient()
                    const currentMetadata = npc.metadata || {}
                    await supabase
                      .from('npcs')
                      .update({
                        metadata: { ...currentMetadata, summary: summary.trim() || null },
                      })
                      .eq('id', npcId)
                  }}
                  placeholder="Short summary..."
                  className="min-h-[100px] resize-none text-sm"
                />
              ) : (
                <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                  {summary || 'No summary yet.'}
                </p>
              )}
            </div>

            {/* Attitude — pixel-matched to design handoff (muted track, primary dot, no fill) */}
            <div className="sc-card p-4">
              <div className="sc-label mb-[10px]">Attitude toward party</div>
              <div className="mb-1.5 flex items-center gap-2">
                <div className="relative flex h-6 flex-1 items-center">
                  <div
                    className="pointer-events-none relative h-[6px] w-full rounded-full bg-muted"
                    aria-hidden
                  >
                    <div
                      className="absolute top-[-2px] h-[10px] w-[10px] -translate-x-1/2 rounded-full bg-primary"
                      style={{ left: `${attitudeValue}%` }}
                    />
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={attitudeValue}
                    disabled={!isDm || !editMode}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                    onChange={(e) => setAttitudeValue(Number(e.target.value))}
                    onPointerUp={(e) => {
                      void saveAttitudeToMetadata(Number((e.target as HTMLInputElement).value))
                    }}
                    onKeyUp={(e) => {
                      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Home' || e.key === 'End') {
                        void saveAttitudeToMetadata(Number((e.target as HTMLInputElement).value))
                      }
                    }}
                    aria-label="Attitude toward party"
                  />
                </div>
                <span className="shrink-0 text-[12px] font-semibold text-primary">
                  {partyAttitudeLabel(attitudeValue)}
                </span>
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>Hostile</span>
                <span>Neutral</span>
                <span>Allied</span>
              </div>
            </div>

            <div className="sc-card p-4">
              <ManageAssociates
                campaignId={campaignId}
                entityId={npcId}
                entityType="npc"
                currentAssociates={backlinks}
                onUpdate={(associates) => setBacklinks(associates)}
                isDm={isDm}
                editMode={editMode}
                layout="npc-sidebar"
              />
            </div>

            {customLabel && (
              <div className="sc-card p-4">
                <div className="sc-label mb-2.5">Custom label</div>
                <p className="text-sm">{customLabel}</p>
              </div>
            )}

            <div className="sc-card p-4">
              <div className="sc-label mb-2">Quick actions</div>
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  className="sc-btn sc-btn-sm w-full justify-center"
                  onClick={() => toast.message('Dice roller opens from the campaign toolbar.')}
                >
                  <Dice5 className="h-3 w-3" />
                  Roll check
                </button>
                <button
                  type="button"
                  className="sc-btn sc-btn-sm w-full justify-center"
                  onClick={() => router.push(`/campaigns/${campaignId}/forge?tab=encounters`)}
                >
                  <Sword className="h-3 w-3" />
                  Encounters
                </button>
                <button
                  type="button"
                  className="sc-btn sc-btn-sm w-full justify-center"
                  onClick={() => router.push(`/campaigns/${campaignId}/vtt`)}
                >
                  <LayoutGrid className="h-3 w-3" />
                  Open VTT
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
