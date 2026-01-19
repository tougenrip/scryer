'use client'

import { useState, useEffect, useMemo, memo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import {
  MapPin,
  User,
  Swords,
  Sparkles,
  Home,
  Search,
  Image,
  Hammer,
  Settings,
} from 'lucide-react'
import Link from 'next/link'
import { useWorldLocations, type WorldLocation } from '@/hooks/useForgeContent'
import { useCampaignNPCs } from '@/hooks/useCampaignContent'
import { useFactions } from '@/hooks/useForgeContent'
import { usePantheonDeities } from '@/hooks/useForgeContent'

interface ContentSidebarProps {
  campaignId: string
  currentEntityId?: string
  currentEntityType?: 'location' | 'npc' | 'faction' | 'pantheon'
  isDm?: boolean
}

export const ContentSidebar = memo(function ContentSidebar({
  campaignId,
  currentEntityId,
  currentEntityType,
  isDm = false,
}: ContentSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedSections, setExpandedSections] = useState<string[]>(['locations'])

  // Fetch all content
  const { locations, loading: locationsLoading } = useWorldLocations(campaignId, isDm)
  const { npcs, loading: npcsLoading } = useCampaignNPCs(campaignId, isDm)
  const { factions, loading: factionsLoading } = useFactions(campaignId)
  const { deities, loading: deitiesLoading } = usePantheonDeities(campaignId)

  // Organize locations hierarchically
  const organizedLocations = useMemo(() => {
    if (!locations || locations.length === 0) return { root: [] as WorldLocation[], children: new Map<string, WorldLocation[]>() }
    
    const locationMap = new Map<string, WorldLocation[]>()
    const rootLocations: WorldLocation[] = []
    
    locations.forEach(loc => {
      if (!loc.parent_location_id) {
        rootLocations.push(loc)
      } else {
        if (!locationMap.has(loc.parent_location_id)) {
          locationMap.set(loc.parent_location_id, [])
        }
        locationMap.get(loc.parent_location_id)!.push(loc)
      }
    })
    
    return { root: rootLocations, children: locationMap }
  }, [locations])

  // Filter content based on search
  const filteredLocations = useMemo(() => {
    if (!searchQuery) return locations || []
    const query = searchQuery.toLowerCase()
    return (locations || []).filter(loc => 
      loc.name.toLowerCase().includes(query) ||
      loc.description?.toLowerCase().includes(query)
    )
  }, [locations, searchQuery])

  const filteredNPCs = useMemo(() => {
    if (!searchQuery) return npcs || []
    const query = searchQuery.toLowerCase()
    return (npcs || []).filter(npc =>
      npc.name.toLowerCase().includes(query) ||
      npc.description?.toLowerCase().includes(query)
    )
  }, [npcs, searchQuery])

  const filteredFactions = useMemo(() => {
    if (!searchQuery) return factions || []
    const query = searchQuery.toLowerCase()
    return (factions || []).filter(faction =>
      faction.name.toLowerCase().includes(query) ||
      faction.description?.toLowerCase().includes(query)
    )
  }, [factions, searchQuery])

  const filteredDeities = useMemo(() => {
    if (!searchQuery) return deities || []
    const query = searchQuery.toLowerCase()
    return (deities || []).filter(deity =>
      deity.name.toLowerCase().includes(query) ||
      deity.description?.toLowerCase().includes(query)
    )
  }, [deities, searchQuery])

  // Auto-expand section if current entity is in it (only on mount or type change)
  useEffect(() => {
    if (currentEntityType) {
      const sectionKey = `${currentEntityType}s`
      setExpandedSections(prev => {
        if (!prev.includes(sectionKey)) {
          return [...prev, sectionKey]
        }
        return prev
      })
    }
  }, [currentEntityType])

  const navigateToEntity = (type: 'location' | 'npc' | 'faction' | 'pantheon', id: string) => {
    const path = `/campaigns/${campaignId}/${type === 'pantheon' ? 'pantheons' : `${type}s`}/${id}`
    router.push(path)
  }

  const renderLocationItem = (location: WorldLocation, level = 0) => {
    const isActive = currentEntityType === 'location' && currentEntityId === location.id
    const children = organizedLocations.children.get(location.id) || []
    const hasChildren = children.length > 0

    return (
      <div key={location.id} className={level === 0 ? '' : ''}>
        <button
          onClick={() => navigateToEntity('location', location.id)}
          className={cn(
            'text-left py-1.5 rounded-md text-sm transition-colors flex items-center gap-2',
            isActive
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-muted text-muted-foreground hover:text-foreground',
            level === 0 ? 'pl-6 pr-4' : 'pl-8 pr-4',
            'w-full'
          )}
        >
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{location.name}</span>
        </button>
        {hasChildren && (
          <div className={cn('mt-1 space-y-1', level === 0 ? 'ml-0' : 'ml-4')}>
            {children.map(child => renderLocationItem(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  const basePath = `/campaigns/${campaignId}`
  const isOverviewActive = pathname === basePath || pathname === `${basePath}/`
  const isMediaLibraryActive = pathname?.startsWith(`${basePath}/media-library`)
  const isForgeActive = pathname?.startsWith(`${basePath}/forge`)
  const isSettingsActive = pathname?.startsWith(`${basePath}/settings`)

  const navigationItems = [
    { title: 'Overview', href: basePath, icon: Home, isActive: isOverviewActive },
    { title: 'Media Library', href: `${basePath}/media-library`, icon: Image, isActive: isMediaLibraryActive },
    { title: 'The Forge', href: `${basePath}/forge`, icon: Hammer, isActive: isForgeActive },
    { title: 'Settings', href: `${basePath}/settings`, icon: Settings, isActive: isSettingsActive },
  ]

  return (
    <div className="w-64 border-r bg-background flex flex-col h-full max-h-screen overflow-hidden shrink-0">
      {/* Navigation Icons */}
      <div className="p-2 border-b flex-shrink-0 flex items-center justify-center gap-2">
        {navigationItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            title={item.title}
            className={cn(
              'p-2 rounded-md transition-colors',
              item.isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <item.icon className="h-4 w-4" />
          </Link>
        ))}
      </div>

      {/* Filter Input */}
      <div className="p-4 border-b flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
      </div>

      {/* Navigation Menu */}
      <ScrollArea className="flex-1 min-h-0 w-full max-w-full">
        <div className="w-full overflow-hidden box-border" style={{ minWidth: 0, width: '256px' }}>
          <Accordion
            type="multiple"
            value={expandedSections}
            onValueChange={setExpandedSections}
            className="w-full max-w-full box-border"
            style={{ minWidth: 0, width: '100%' }}
          >
          {/* Locations */}
          <AccordionItem value="locations" className="border-b">
            <AccordionTrigger className="px-4 py-2 hover:no-underline">
              <div className="flex items-center gap-2 flex-1">
                <MapPin className="h-4 w-4" />
                <span className="font-medium">Locations</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-2 overflow-hidden box-border">
              <div className="space-y-1 box-border">
                {locationsLoading ? (
                  <div className="text-sm text-muted-foreground pl-6 pr-4 py-2">Loading...</div>
                ) : filteredLocations.length === 0 ? (
                  <div className="text-sm text-muted-foreground pl-6 pr-4 py-2">No locations found</div>
                ) : (
                  organizedLocations.root.map(loc => renderLocationItem(loc))
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* NPCs */}
          <AccordionItem value="npcs" className="border-b">
            <AccordionTrigger className="px-4 py-2 hover:no-underline">
              <div className="flex items-center gap-2 flex-1">
                <User className="h-4 w-4" />
                <span className="font-medium">NPCs</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-2 overflow-hidden box-border">
              <div className="space-y-1 box-border">
                {npcsLoading ? (
                  <div className="text-sm text-muted-foreground pl-6 pr-4 py-2">Loading...</div>
                ) : filteredNPCs.length === 0 ? (
                  <div className="text-sm text-muted-foreground pl-6 pr-4 py-2">No NPCs found</div>
                ) : (
                  filteredNPCs.map((npc) => {
                    const isActive = currentEntityType === 'npc' && currentEntityId === npc.id
                    return (
                      <button
                        key={npc.id}
                        onClick={() => navigateToEntity('npc', npc.id)}
                        className={cn(
                          'w-full text-left pl-6 pr-4 py-1.5 rounded-md text-sm transition-colors flex items-center gap-2',
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <User className="h-3 w-3 shrink-0" />
                        <span className="truncate">{npc.name}</span>
                      </button>
                    )
                  })
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Factions */}
          <AccordionItem value="factions" className="border-b">
            <AccordionTrigger className="px-4 py-2 hover:no-underline">
              <div className="flex items-center gap-2 flex-1">
                <Swords className="h-4 w-4" />
                <span className="font-medium">Factions</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-2 overflow-hidden box-border">
              <div className="space-y-1 box-border">
                {factionsLoading ? (
                  <div className="text-sm text-muted-foreground pl-6 pr-4 py-2">Loading...</div>
                ) : filteredFactions.length === 0 ? (
                  <div className="text-sm text-muted-foreground pl-6 pr-4 py-2">No factions found</div>
                ) : (
                  filteredFactions.map((faction) => {
                    const isActive = currentEntityType === 'faction' && currentEntityId === faction.id
                    return (
                      <button
                        key={faction.id}
                        onClick={() => navigateToEntity('faction', faction.id)}
                        className={cn(
                          'w-full text-left pl-6 pr-4 py-1.5 rounded-md text-sm transition-colors flex items-center gap-2',
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <Swords className="h-3 w-3 shrink-0" />
                        <span className="truncate">{faction.name}</span>
                      </button>
                    )
                  })
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Pantheons */}
          <AccordionItem value="pantheons" className="border-b">
            <AccordionTrigger className="px-4 py-2 hover:no-underline">
              <div className="flex items-center gap-2 flex-1">
                <Sparkles className="h-4 w-4" />
                <span className="font-medium">Deities</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-2 overflow-hidden box-border">
              <div className="space-y-1 box-border">
                {deitiesLoading ? (
                  <div className="text-sm text-muted-foreground pl-6 pr-4 py-2">Loading...</div>
                ) : filteredDeities.length === 0 ? (
                  <div className="text-sm text-muted-foreground pl-6 pr-4 py-2">No deities found</div>
                ) : (
                  filteredDeities.map((deity) => {
                    const isActive = currentEntityType === 'pantheon' && currentEntityId === deity.id
                    return (
                      <button
                        key={deity.id}
                        onClick={() => navigateToEntity('pantheon', deity.id)}
                        className={cn(
                          'w-full text-left pl-6 pr-4 py-1.5 rounded-md text-sm transition-colors flex items-center gap-2',
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <Sparkles className="h-3 w-3 shrink-0" />
                        <span className="truncate">{deity.name}</span>
                      </button>
                    )
                  })
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        </div>
      </ScrollArea>
    </div>
  )
})

