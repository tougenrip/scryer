"use client";

import { useState } from "react";
import { NodeCanvas, type Node, type Connection } from "@/components/shared/node-canvas";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function CanvasDemoPage() {
  const [nodes, setNodes] = useState<Node[]>([
    {
      id: "node-1",
      x: 200,
      y: 200,
      label: "Start",
      color: "#6366f1",
      size: 70,
    },
    {
      id: "node-2",
      x: 400,
      y: 200,
      label: "Process",
      color: "#10b981",
      size: 70,
    },
    {
      id: "node-3",
      x: 600,
      y: 200,
      label: "End",
      color: "#f59e0b",
      size: 70,
    },
  ]);
  
  const [connections, setConnections] = useState<Connection[]>([
    {
      id: "conn-1",
      fromNodeId: "node-1",
      toNodeId: "node-2",
    },
    {
      id: "conn-2",
      fromNodeId: "node-2",
      toNodeId: "node-3",
    },
  ]);
  
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Node Canvas Demo</CardTitle>
          <CardDescription>
            A visual node-based canvas for creating diagrams and flowcharts.
            Click anywhere to create nodes, double-click a node to start a connection.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong>How to use:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Click:</strong> Create a new node</li>
                <li><strong>Drag:</strong> Move nodes around</li>
                <li><strong>Double-click node:</strong> Start connecting to another node</li>
                <li><strong>Click another node:</strong> Complete the connection</li>
                <li><strong>Space + Drag:</strong> Pan the canvas</li>
                <li><strong>Mouse Wheel:</strong> Zoom in/out</li>
                <li><strong>Delete:</strong> Remove selected node</li>
              </ul>
            </div>

            <div className="border rounded-lg overflow-hidden" style={{ height: "600px" }}>
              <NodeCanvas
                width={800}
                height={600}
                nodes={nodes}
                connections={connections}
                onNodesChange={setNodes}
                onConnectionsChange={setConnections}
                selectedNodeId={selectedId}
                onNodeSelect={setSelectedId}
                showControls={true}
              />
            </div>

            <div className="text-sm text-muted-foreground flex gap-4">
              <p>
                <strong>Nodes:</strong> {nodes.length}
              </p>
              <p>
                <strong>Connections:</strong> {connections.length}
              </p>
              <p>
                <strong>Selected:</strong> {selectedId || "None"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

