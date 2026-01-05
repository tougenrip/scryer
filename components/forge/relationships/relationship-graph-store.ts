import { create } from 'zustand';
import { shallow } from 'zustand/shallow';
import { Node, Edge, applyNodeChanges, applyEdgeChanges, NodeChange, EdgeChange } from 'reactflow';
import { NodeData } from './custom-nodes';
import { RelationshipEdgeData } from './affinity-edge';

interface RelationshipGraphStore {
  nodes: Node<NodeData>[];
  edges: Edge<RelationshipEdgeData>[];
  setNodes: (nodes: Node<NodeData>[]) => void;
  setEdges: (edges: Edge<RelationshipEdgeData>[]) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  updateEdgeStrength: (edgeId: string, strength: number) => void;
}

export const useRelationshipGraphStore = create<RelationshipGraphStore>((set, get) => ({
  nodes: [],
  edges: [],
  
  setNodes: (nodes) => set({ nodes }),
  
  setEdges: (edges) => set({ edges }),
  
  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },
  
  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },
  
  updateEdgeStrength: (edgeId, strength) => {
    set({
      edges: get().edges.map((edge) =>
        edge.id === edgeId
          ? {
              ...edge,
              data: {
                ...edge.data,
                strength,
              },
            }
          : edge
      ),
    });
  },
}));
