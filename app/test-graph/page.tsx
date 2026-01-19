'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { useWorldLocations } from '@/hooks/useForgeContent'
import { usePantheonDeities } from '@/hooks/useForgeContent'
import { useFactions } from '@/hooks/useForgeContent'
import { useCampaignNPCs } from '@/hooks/useCampaignContent'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import type { WorldLocation, Faction, PantheonDeity } from '@/hooks/useForgeContent'
import type { NPC } from '@/hooks/useCampaignContent'

// Dynamically import ForceGraph2D to avoid SSR issues
// Use react-force-graph-2d which doesn't require AFRAME
const ForceGraph2D = dynamic(() => import('react-force-graph-2d').then(mod => mod.default || mod), {
  ssr: false,
})

interface GraphNode {
  id: string
  name: string
  type: 'location' | 'npc' | 'faction' | 'pantheon'
  originalId: string // The actual database ID
  color: string
  size: number
  group: number // Group number for clustering
}

interface GraphLink {
  source: string
  target: string
  value?: number // Optional link strength/value
}

type NodeType = 'location' | 'npc' | 'faction' | 'pantheon'

const NODE_COLORS = {
  location: '#3b82f6', // blue
  npc: '#10b981', // green
  faction: '#f59e0b', // orange
  pantheon: '#8b5cf6', // purple
}

export default function TestGraphPage() {
  const searchParams = useSearchParams()
  const campaignId = searchParams.get('campaignId') || undefined
  const [userId, setUserId] = useState<string | null>(null)
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([]) // Start with empty canvas
  const [graphLinks, setGraphLinks] = useState<GraphLink[]>([]) // Links between nodes
  const [sourceNode, setSourceNode] = useState<GraphNode | null>(null) // Node clicked to connect from
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showEditLinkDialog, setShowEditLinkDialog] = useState(false)
  const [editingNode, setEditingNode] = useState<GraphNode | null>(null)
  const [editingLink, setEditingLink] = useState<GraphLink | null>(null)
  const [selectedType, setSelectedType] = useState<NodeType>('location')
  const [selectedItemId, setSelectedItemId] = useState<string>('')
  const [nodeColor, setNodeColor] = useState<string>(NODE_COLORS.location)
  const [editNodeColor, setEditNodeColor] = useState<string>(NODE_COLORS.location)
  const [editNodeName, setEditNodeName] = useState<string>('')
  const [editNodeGroup, setEditNodeGroup] = useState<number>(0)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [selectedNodeForInfo, setSelectedNodeForInfo] = useState<GraphNode | null>(null)
  const [showInfoSheet, setShowInfoSheet] = useState(false)

  // Get userId and handle window resize
  useEffect(() => {
    async function getUser() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
      }
    }
    getUser()

    // Set initial dimensions
    if (typeof window !== 'undefined') {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    // Handle window resize
    function handleResize() {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Fetch all data (for dropdowns)
  const { locations } = useWorldLocations(campaignId || null, true)
  const { npcs } = useCampaignNPCs(campaignId || null, true)
  const { factions } = useFactions(campaignId || null)
  const { deities } = usePantheonDeities(campaignId || null)

  // Sync color with selected type when dialog opens without source node
  useEffect(() => {
    if (showAddDialog && !sourceNode) {
      setNodeColor(NODE_COLORS[selectedType])
    }
  }, [showAddDialog, sourceNode, selectedType])

  // Handle background click (empty space) - add standalone node
  const handleBackgroundClick = useCallback(() => {
    setSourceNode(null) // No source node for standalone addition
    setSelectedType('location') // Reset to default type
    setNodeColor(NODE_COLORS.location) // Reset to default type color
    setShowAddDialog(true)
  }, [])

  // Handle node click - show info sheet or add connected node
  const handleNodeClick = useCallback((node: GraphNode, event: MouseEvent) => {
    // Right-click for edit
    if (event.button === 2 || event.ctrlKey || event.metaKey) {
      event.preventDefault()
      setEditingNode(node)
      setEditNodeName(node.name)
      setEditNodeColor(node.color)
      setShowEditDialog(true)
    } else {
      // Left-click: show info sheet
      setSelectedNodeForInfo(node)
      setShowInfoSheet(true)
    }
  }, [])

  // Handle double-click to add connected node
  const handleNodeDoubleClick = useCallback((node: GraphNode) => {
    setSourceNode(node) // Set the clicked node as source
    setSelectedType('location') // Reset type
    setNodeColor(node.color) // Default to parent node color
    setShowAddDialog(true)
  }, [])

  // Get items for selected type
  const getItemsForType = useCallback((type: NodeType) => {
    switch (type) {
      case 'location':
        return locations.map(loc => ({ id: loc.id, name: loc.name }))
      case 'npc':
        return npcs.map(npc => ({ id: npc.id, name: npc.name }))
      case 'faction':
        return factions.map(faction => ({ id: faction.id, name: faction.name }))
      case 'pantheon':
        return deities.map(deity => ({ id: deity.id, name: deity.name }))
      default:
        return []
    }
  }, [locations, npcs, factions, deities])

  // Get entity data for selected node
  const getEntityData = useCallback(() => {
    if (!selectedNodeForInfo) return null

    switch (selectedNodeForInfo.type) {
      case 'location':
        return locations.find(loc => loc.id === selectedNodeForInfo.originalId) as WorldLocation | undefined
      case 'npc':
        return npcs.find(npc => npc.id === selectedNodeForInfo.originalId) as NPC | undefined
      case 'faction':
        return factions.find(faction => faction.id === selectedNodeForInfo.originalId) as Faction | undefined
      case 'pantheon':
        return deities.find(deity => deity.id === selectedNodeForInfo.originalId) as PantheonDeity | undefined
      default:
        return null
    }
  }, [selectedNodeForInfo, locations, npcs, factions, deities])

  const entityData = getEntityData()

  // Handle adding node to graph
  const handleAddNode = useCallback(() => {
    if (!selectedItemId || !selectedType) return

    const items = getItemsForType(selectedType)
    const selectedItem = items.find(item => item.id === selectedItemId)

    if (!selectedItem) return

    const nodeId = `${selectedType}-${selectedItemId}`
    const nodeExists = graphNodes.some(node => node.id === nodeId)
    let targetNode: GraphNode

    if (nodeExists) {
      // Use existing node
      targetNode = graphNodes.find(node => node.id === nodeId)!
    } else {
      // Add new node with selected color and group
      // If connecting from a source node, use its group; otherwise use group 0
      const nodeGroup = sourceNode ? sourceNode.group : 0
      targetNode = {
        id: nodeId,
        name: selectedItem.name,
        type: selectedType,
        originalId: selectedItemId,
        color: nodeColor, // Use selected color
        size: selectedType === 'faction' ? 9 : selectedType === 'npc' ? 7 : 8,
        group: nodeGroup,
      }
      setGraphNodes(prev => [...prev, targetNode])
    }

    // If we have a source node (clicked node), create a link
    if (sourceNode) {
      // Check if link already exists
      const linkExists = graphLinks.some(
        link => 
          (link.source === sourceNode.id && link.target === targetNode.id) ||
          (link.source === targetNode.id && link.target === sourceNode.id)
      )

      if (!linkExists && sourceNode.id !== targetNode.id) {
        const newLink = {
          source: sourceNode.id,
          target: targetNode.id,
          value: 1, // Default link strength
        }
        setGraphLinks(prev => [...prev, newLink])
      }
    }

    // Reset form
    setSelectedItemId('')
    setSelectedType('location')
    setNodeColor(NODE_COLORS.location)
    setSourceNode(null)
    setShowAddDialog(false)
  }, [selectedItemId, selectedType, nodeColor, graphNodes, graphLinks, sourceNode, getItemsForType])

  // Handle editing node
  const handleEditNode = useCallback(() => {
    if (!editingNode) return

    setGraphNodes(prev => prev.map(node => 
      node.id === editingNode.id
        ? { ...node, name: editNodeName, color: editNodeColor, group: editNodeGroup }
        : node
    ))

    setShowEditDialog(false)
    setEditingNode(null)
    setEditNodeName('')
    setEditNodeColor(NODE_COLORS.location)
    setEditNodeGroup(0)
  }, [editingNode, editNodeName, editNodeColor, editNodeGroup])

  // Handle deleting node
  const handleDeleteNode = useCallback(() => {
    if (!editingNode) return

    setGraphNodes(prev => prev.filter(node => node.id !== editingNode.id))
    setGraphLinks(prev => prev.filter(
      link => link.source !== editingNode.id && link.target !== editingNode.id
    ))

    setShowEditDialog(false)
    setEditingNode(null)
    setEditNodeName('')
    setEditNodeColor(NODE_COLORS.location)
  }, [editingNode])

  // Handle deleting link
  const handleDeleteLink = useCallback(() => {
    if (!editingLink) return

    setGraphLinks(prev => prev.filter(
      link => !(link.source === editingLink.source && link.target === editingLink.target)
    ))

    setShowEditLinkDialog(false)
    setEditingLink(null)
  }, [editingLink])

  const graphRef = useRef<any>()

  // Configure D3 forces for grouping using the d3Force method
  useEffect(() => {
    if (!graphRef.current) return

    // Configure forceX to pull nodes toward their group center
    const forceX = graphRef.current.d3Force('x')
    if (forceX) {
      forceX.x((d: any) => {
        // Calculate group center dynamically on each access
        const sim = (graphRef.current as any).d3Force?.()
        if (!sim) return 0
        const nodes = sim.nodes() as any[]
        const group = d.group || 0
        let sumX = 0
        let count = 0
        
        nodes.forEach((node: any) => {
          if ((node.group || 0) === group && node.x !== undefined) {
            sumX += node.x
            count += 1
          }
        })
        
        return count > 0 ? sumX / count : 0
      }).strength(0.3)
    }

    // Configure forceY to pull nodes toward their group center
    const forceY = graphRef.current.d3Force('y')
    if (forceY) {
      forceY.y((d: any) => {
        // Calculate group center dynamically on each access
        const sim = (graphRef.current as any).d3Force?.()
        if (!sim) return 0
        const nodes = sim.nodes() as any[]
        const group = d.group || 0
        let sumY = 0
        let count = 0
        
        nodes.forEach((node: any) => {
          if ((node.group || 0) === group && node.y !== undefined) {
            sumY += node.y
            count += 1
          }
        })
        
        return count > 0 ? sumY / count : 0
      }).strength(0.3)
    }

    // Configure charge force - MUCH STRONGER to push different groups far apart
    const charge = graphRef.current.d3Force('charge')
    if (charge) {
      charge.strength((d: any) => {
        // Even stronger repulsion to separate groups
        return -2000
      })
      charge.distanceMax(2000) // Much larger distance
    }

    // Configure link force - MUCH LARGER distance for links between different groups
    const link = graphRef.current.d3Force('link')
    if (link) {
      link.distance((link: any) => {
        // Get source and target nodes
        const source = typeof link.source === 'object' ? link.source : null
        const target = typeof link.target === 'object' ? link.target : null
        
        if (source && target) {
          const sourceGroup = source.group || 0
          const targetGroup = target.group || 0
          
          // If nodes are in different groups, make the link distance MUCH larger
          if (sourceGroup !== targetGroup) {
            return 500 // Very far apart for cross-group links
          }
        }
        
        // Same group links stay close
        return 80
      })
      // Lower strength for cross-group links so they don't pull groups together
      link.strength((link: any) => {
        const source = typeof link.source === 'object' ? link.source : null
        const target = typeof link.target === 'object' ? link.target : null
        
        if (source && target) {
          const sourceGroup = source.group || 0
          const targetGroup = target.group || 0
          
          // Much weaker strength for cross-group links
          if (sourceGroup !== targetGroup) {
            return 0.1 // Very weak spring
          }
        }
        
        return 0.6 // Normal strength for same-group links
      })
    }

    // Restart simulation to apply changes
    const sim = (graphRef.current as any).d3Force?.()
    if (sim) {
      sim.alpha(1).restart()
    }
  }, [graphNodes, graphLinks])

  // Memoize graphData to ensure proper re-renders
  // Convert link source/target from string IDs to node objects for proper arrow rendering
  const graphData = useMemo(() => {
    const nodeMap = new Map(graphNodes.map(n => [n.id, n]))
    const linksWithNodes = graphLinks.map(link => ({
      ...link,
      source: typeof link.source === 'string' ? nodeMap.get(link.source) || link.source : link.source,
      target: typeof link.target === 'string' ? nodeMap.get(link.target) || link.target : link.target,
    }))
    return { nodes: graphNodes, links: linksWithNodes }
  }, [graphNodes, graphLinks])


  if (!campaignId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold mb-2">No campaign selected</p>
          <p className="text-muted-foreground">
            Add ?campaignId=YOUR_CAMPAIGN_ID to the URL to view the graph.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 w-full h-full">
      {/* Fixed header overlay */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-background/95 backdrop-blur-sm border-b p-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-bold">Relationship Graph</h1>
            <p className="text-sm text-muted-foreground">
              Click empty space to add a node, left-click node to view info, double-click node to connect, right-click node/link to edit
            </p>
          </div>
        </div>
      </div>

      {/* Full page canvas */}
      <div className="absolute inset-0 w-full h-full">
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          nodeLabel={(node: GraphNode) => `${node.name} (${node.type})`}
          nodeColor={(node: GraphNode) => node.color}
          nodeVal={(node: GraphNode) => node.size}
          nodeCanvasObject={(node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
              const label = node.name
              const fontSize = 12 / globalScale
              const nodeRadius = node.size / globalScale
              
              // Draw node circle
              ctx.fillStyle = node.color
              ctx.beginPath()
              ctx.arc(node.x!, node.y!, nodeRadius, 0, 2 * Math.PI, false)
              ctx.fill()
              
              // Draw label below the node
              ctx.font = `${fontSize}px Sans-Serif`
              ctx.fillStyle = '#ffffff'
              ctx.textAlign = 'center'
              ctx.textBaseline = 'middle'
              
              // Add text stroke for better visibility
              ctx.strokeStyle = '#000000'
              ctx.lineWidth = 2 / globalScale
              
              const labelY = (node.y || 0) + nodeRadius + (fontSize * 1.2)
              ctx.strokeText(label, node.x || 0, labelY)
              ctx.fillText(label, node.x || 0, labelY)
            }}
            linkDirectionalArrowLength={6}
            linkDirectionalArrowRelPos={1}
            nodeAutoColorBy="group"
            onBackgroundClick={handleBackgroundClick}
            onNodeClick={handleNodeClick}
            onNodeDoubleClick={handleNodeDoubleClick}
            onNodeRightClick={(node: any, event: MouseEvent) => {
              event.preventDefault()
              // Look up the node from our graphNodes array to ensure we have the correct structure
              const actualNode = graphNodes.find(n => n.id === node.id || String(n.id) === String(node.id))
              if (actualNode) {
                setEditingNode(actualNode)
                setEditNodeName(actualNode.name)
                setEditNodeColor(actualNode.color)
                setEditNodeGroup(actualNode.group)
                setShowEditDialog(true)
              }
            }}
            onLinkRightClick={(link: GraphLink, event: MouseEvent) => {
              event.preventDefault()
              setEditingLink(link)
              setShowEditLinkDialog(true)
            }}
            cooldownTicks={100}
            width={dimensions.width}
            height={dimensions.height}
          />
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {sourceNode ? `Connect Node to ${sourceNode.name}` : 'Add Node to Graph'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {sourceNode && (
              <>
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm text-muted-foreground">
                    Connecting from: <span className="font-semibold">{sourceNode.name}</span>
                  </p>
                </div>
                <div>
                  <Label>Group Assignment</Label>
                  <p className="text-xs text-muted-foreground mt-1 mb-2">
                    New node will be assigned to the same group as the source node (Group {sourceNode.group})
                  </p>
                </div>
              </>
            )}
            <div>
              <Label htmlFor="node-type">Type</Label>
              <Select
                value={selectedType}
                onValueChange={(value: NodeType) => {
                  setSelectedType(value)
                  setSelectedItemId('') // Reset selection when type changes
                  // Update color to default type color if no source node
                  if (!sourceNode) {
                    setNodeColor(NODE_COLORS[value])
                  }
                }}
              >
                <SelectTrigger id="node-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="location">Location</SelectItem>
                  <SelectItem value="npc">NPC</SelectItem>
                  <SelectItem value="faction">Faction</SelectItem>
                  <SelectItem value="pantheon">Pantheon</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="node-item">Select {selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}</Label>
              <Select
                value={selectedItemId}
                onValueChange={setSelectedItemId}
              >
                <SelectTrigger id="node-item">
                  <SelectValue placeholder={`Select a ${selectedType}...`} />
                </SelectTrigger>
                <SelectContent>
                  {getItemsForType(selectedType).length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      No {selectedType}s found in campaign
                    </div>
                  ) : (
                    getItemsForType(selectedType).map(item => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="node-color">Node Color</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  id="node-color"
                  value={nodeColor}
                  onChange={(e) => setNodeColor(e.target.value)}
                  className="h-10 w-20 cursor-pointer rounded border"
                />
                <Input
                  value={nodeColor}
                  onChange={(e) => setNodeColor(e.target.value)}
                  placeholder="#000000"
                  className="flex-1"
                />
              </div>
              {sourceNode && (
                <p className="text-xs text-muted-foreground mt-1">
                  Defaults to parent node color ({sourceNode.color})
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddDialog(false)
              setSelectedItemId('')
              setNodeColor(NODE_COLORS.location)
              setSourceNode(null)
            }}>
              Cancel
            </Button>
            <Button onClick={handleAddNode} disabled={!selectedItemId}>
              Add Node
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Node</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-node-name">Node Name</Label>
              <Input
                id="edit-node-name"
                value={editNodeName}
                onChange={(e) => setEditNodeName(e.target.value)}
                placeholder="Enter node name"
              />
            </div>

            <div>
              <Label htmlFor="edit-node-color">Node Color</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  id="edit-node-color"
                  value={editNodeColor}
                  onChange={(e) => setEditNodeColor(e.target.value)}
                  className="h-10 w-20 cursor-pointer rounded border"
                />
                <Input
                  value={editNodeColor}
                  onChange={(e) => setEditNodeColor(e.target.value)}
                  placeholder="#000000"
                  className="flex-1"
                />
              </div>
            </div>

            {editingNode && (
              <>
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm text-muted-foreground">
                    Type: <span className="font-semibold">{editingNode.type}</span>
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="edit-node-group">Group</Label>
                  <Input
                    id="edit-node-group"
                    type="number"
                    value={editNodeGroup}
                    onChange={(e) => setEditNodeGroup(Number(e.target.value))}
                    placeholder="0"
                    min={0}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Nodes in the same group will cluster together
                  </p>
                </div>
                
                  <div className="space-y-3">
                  <Label className="text-sm font-semibold">Connections</Label>
                  {(() => {
                    // Filter links connected to this node
                    // Helper function to extract ID from link source/target (handles both string and object)
                    const extractId = (value: string | any): string => {
                      if (typeof value === 'string') return value
                      if (typeof value === 'object' && value !== null) {
                        // If it's a node object, try to get the id
                        if ('id' in value) return String(value.id)
                        // If it's already a string somehow, return it
                        return String(value)
                      }
                      return String(value)
                    }
                    
                    const editingNodeId = String(editingNode.id)
                    const nodeConnections = graphLinks.filter(link => {
                      const sourceId = extractId(link.source)
                      const targetId = extractId(link.target)
                      return sourceId === editingNodeId || targetId === editingNodeId
                    })
                    
                    if (nodeConnections.length === 0) {
                      return (
                        <p className="text-sm text-muted-foreground p-3 bg-muted rounded-md">
                          No connections yet. Connect this node to another node.
                        </p>
                      )
                    }
                    
                    return (
                      <div className="space-y-2">
                        {nodeConnections.map((link, index) => {
                          // Determine which node this link connects to
                          const editingNodeId = String(editingNode.id)
                          const sourceId = extractId(link.source)
                          const targetId = extractId(link.target)
                          const connectedNodeId = sourceId === editingNodeId ? targetId : sourceId
                          const connectedNode = graphNodes.find(n => String(n.id) === connectedNodeId)
                          if (!connectedNode) return null
                          
                          return (
                            <div key={`${sourceId}-${targetId}-${index}`} className="p-2 border rounded-md">
                              <span className="text-sm font-medium">{connectedNode.name}</span>
                              <span className="text-xs text-muted-foreground ml-2">
                                (Group {connectedNode.group})
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()}
                </div>
              </>
            )}
          </div>

          <DialogFooter className="flex justify-between">
            <Button 
              variant="destructive" 
              onClick={handleDeleteNode}
            >
              Delete Node
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => {
                setShowEditDialog(false)
                setEditingNode(null)
                setEditNodeName('')
                setEditNodeColor(NODE_COLORS.location)
                setEditNodeGroup(0)
              }}>
                Cancel
              </Button>
              <Button onClick={handleEditNode} disabled={!editNodeName.trim()}>
                Save Changes
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Information Sheet */}
      <Sheet open={showInfoSheet} onOpenChange={setShowInfoSheet}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedNodeForInfo?.name || 'Node Information'}</SheetTitle>
            <SheetDescription>
              {selectedNodeForInfo && `${selectedNodeForInfo.type.charAt(0).toUpperCase() + selectedNodeForInfo.type.slice(1)} Details`}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {entityData ? (
              <>
                {selectedNodeForInfo?.type === 'location' && (
                  <div className="space-y-4">
                    {(entityData as WorldLocation).image_url && (
                      <img 
                        src={(entityData as WorldLocation).image_url!} 
                        alt={(entityData as WorldLocation).name}
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    )}
                    <div>
                      <h3 className="font-semibold mb-2">Type</h3>
                      <p className="text-sm text-muted-foreground">{(entityData as WorldLocation).type}</p>
                    </div>
                    {(entityData as WorldLocation).description && (
                      <div>
                        <h3 className="font-semibold mb-2">Description</h3>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{(entityData as WorldLocation).description}</p>
                      </div>
                    )}
                    {(entityData as WorldLocation).metadata && Object.keys((entityData as WorldLocation).metadata).length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-2">Metadata</h3>
                        <pre className="text-xs bg-muted p-3 rounded overflow-auto">
                          {JSON.stringify((entityData as WorldLocation).metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}

                {selectedNodeForInfo?.type === 'npc' && (
                  <div className="space-y-4">
                    {(entityData as NPC).image_url && (
                      <img 
                        src={(entityData as NPC).image_url!} 
                        alt={(entityData as NPC).name}
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    )}
                    {(entityData as NPC).description && (
                      <div>
                        <h3 className="font-semibold mb-2">Description</h3>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{(entityData as NPC).description}</p>
                      </div>
                    )}
                    {(entityData as NPC).appearance && (
                      <div>
                        <h3 className="font-semibold mb-2">Appearance</h3>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{(entityData as NPC).appearance}</p>
                      </div>
                    )}
                    {(entityData as NPC).personality && (
                      <div>
                        <h3 className="font-semibold mb-2">Personality</h3>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{(entityData as NPC).personality}</p>
                      </div>
                    )}
                    {(entityData as NPC).background && (
                      <div>
                        <h3 className="font-semibold mb-2">Background</h3>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{(entityData as NPC).background}</p>
                      </div>
                    )}
                    {(entityData as NPC).location && (
                      <div>
                        <h3 className="font-semibold mb-2">Location</h3>
                        <p className="text-sm text-muted-foreground">{(entityData as NPC).location}</p>
                      </div>
                    )}
                    {((entityData as NPC).class_source || (entityData as NPC).custom_class) && (
                      <div>
                        <h3 className="font-semibold mb-2">Class</h3>
                        <p className="text-sm text-muted-foreground">
                          {(entityData as NPC).custom_class || (entityData as NPC).class_index}
                        </p>
                      </div>
                    )}
                    {((entityData as NPC).species_source || (entityData as NPC).custom_species) && (
                      <div>
                        <h3 className="font-semibold mb-2">Species</h3>
                        <p className="text-sm text-muted-foreground">
                          {(entityData as NPC).custom_species || (entityData as NPC).species_index}
                        </p>
                      </div>
                    )}
                    {(entityData as NPC).notes && (
                      <div>
                        <h3 className="font-semibold mb-2">Notes</h3>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{(entityData as NPC).notes}</p>
                      </div>
                    )}
                  </div>
                )}

                {selectedNodeForInfo?.type === 'faction' && (
                  <div className="space-y-4">
                    {(entityData as Faction).emblem_sigil_url && (
                      <img 
                        src={(entityData as Faction).emblem_sigil_url!} 
                        alt={(entityData as Faction).name}
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    )}
                    {(entityData as Faction).description && (
                      <div>
                        <h3 className="font-semibold mb-2">Description</h3>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{(entityData as Faction).description}</p>
                      </div>
                    )}
                    {(entityData as Faction).type && (
                      <div>
                        <h3 className="font-semibold mb-2">Type</h3>
                        <p className="text-sm text-muted-foreground">{(entityData as Faction).type}</p>
                      </div>
                    )}
                    {(entityData as Faction).alignment && (
                      <div>
                        <h3 className="font-semibold mb-2">Alignment</h3>
                        <p className="text-sm text-muted-foreground">{(entityData as Faction).alignment}</p>
                      </div>
                    )}
                    {(entityData as Faction).influence_level && (
                      <div>
                        <h3 className="font-semibold mb-2">Influence Level</h3>
                        <p className="text-sm text-muted-foreground">{(entityData as Faction).influence_level}</p>
                      </div>
                    )}
                    {(entityData as Faction).leader_name && (
                      <div>
                        <h3 className="font-semibold mb-2">Leader</h3>
                        <p className="text-sm text-muted-foreground">{(entityData as Faction).leader_name}</p>
                      </div>
                    )}
                    {(entityData as Faction).motto_creed && (
                      <div>
                        <h3 className="font-semibold mb-2">Motto/Creed</h3>
                        <p className="text-sm text-muted-foreground italic">{(entityData as Faction).motto_creed}</p>
                      </div>
                    )}
                    {(entityData as Faction).goals && (entityData as Faction).goals.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-2">Goals</h3>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                          {(entityData as Faction).goals.map((goal, idx) => (
                            <li key={idx}>{goal}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {(entityData as Faction).resources && (entityData as Faction).resources.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-2">Resources</h3>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                          {(entityData as Faction).resources.map((resource, idx) => (
                            <li key={idx}>{resource}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {(entityData as Faction).public_agenda && (
                      <div>
                        <h3 className="font-semibold mb-2">Public Agenda</h3>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{(entityData as Faction).public_agenda}</p>
                      </div>
                    )}
                    {(entityData as Faction).secret_agenda && (
                      <div>
                        <h3 className="font-semibold mb-2">Secret Agenda</h3>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{(entityData as Faction).secret_agenda}</p>
                      </div>
                    )}
                  </div>
                )}

                {selectedNodeForInfo?.type === 'pantheon' && (
                  <div className="space-y-4">
                    {(entityData as PantheonDeity).image_url && (
                      <img 
                        src={(entityData as PantheonDeity).image_url!} 
                        alt={(entityData as PantheonDeity).name}
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    )}
                    {(entityData as PantheonDeity).description && (
                      <div>
                        <h3 className="font-semibold mb-2">Description</h3>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{(entityData as PantheonDeity).description}</p>
                      </div>
                    )}
                    {(entityData as PantheonDeity).domain && (entityData as PantheonDeity).domain.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-2">Domain</h3>
                        <p className="text-sm text-muted-foreground">{(entityData as PantheonDeity).domain.join(', ')}</p>
                      </div>
                    )}
                    {(entityData as PantheonDeity).title && (
                      <div>
                        <h3 className="font-semibold mb-2">Title</h3>
                        <p className="text-sm text-muted-foreground">{(entityData as PantheonDeity).title}</p>
                      </div>
                    )}
                    {(entityData as PantheonDeity).alignment && (
                      <div>
                        <h3 className="font-semibold mb-2">Alignment</h3>
                        <p className="text-sm text-muted-foreground">{(entityData as PantheonDeity).alignment}</p>
                      </div>
                    )}
                    {(entityData as PantheonDeity).symbol && (
                      <div>
                        <h3 className="font-semibold mb-2">Symbol</h3>
                        <p className="text-sm text-muted-foreground">{(entityData as PantheonDeity).symbol}</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading information...</p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={showEditLinkDialog} onOpenChange={setShowEditLinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Connection</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {editingLink && (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">
                  Connection between nodes
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="flex justify-between">
            <Button 
              variant="destructive" 
              onClick={handleDeleteLink}
            >
              Delete Connection
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => {
                setShowEditLinkDialog(false)
                setEditingLink(null)
              }}>
                Close
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
