import React, { useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import CausalServiceNode from "./CausalServiceNode";

const nodeTypes = {
  serviceNode: CausalServiceNode,
};

export default function CausalGraphFlow({
  graph,
  onNodeClick,
  height = "480px",
}) {
  const { rfNodes, rfEdges } = useMemo(() => {
    if (!graph || !graph.nodes || graph.nodes.length === 0) {
      return { rfNodes: [], rfEdges: [] };
    }

    // Topological tier assignment
    const tiers = {};
    const inDegree = {};
    graph.nodes.forEach((n) => {
      inDegree[n.id] = 0;
    });
    graph.edges.forEach((e) => {
      if (inDegree[e.target] !== undefined) {
        inDegree[e.target] += 1;
      }
    });

    // Roots / Gateways have inDegree = 0
    const queue = [];
    graph.nodes.forEach((n) => {
      if (inDegree[n.id] === 0 || n.status === "ROOT_CAUSE") {
        tiers[n.id] = 0;
        queue.push(n.id);
      }
    });

    // BFS tier assignment
    while (queue.length > 0) {
      const curr = queue.shift();
      const currTier = tiers[curr] || 0;
      graph.edges.forEach((e) => {
        if (e.source === curr) {
          const nextTier = currTier + 1;
          if (tiers[e.target] === undefined || tiers[e.target] < nextTier) {
            tiers[e.target] = nextTier;
            queue.push(e.target);
          }
        }
      });
    }

    // Fallback for remaining unassigned nodes
    graph.nodes.forEach((n) => {
      if (tiers[n.id] === undefined) {
        tiers[n.id] = 1;
      }
    });

    // Group nodes by tier for X-coordinates
    const tierGroups = {};
    graph.nodes.forEach((n) => {
      const t = tiers[n.id] || 0;
      if (!tierGroups[t]) tierGroups[t] = [];
      tierGroups[t].push(n);
    });

    const nodes = [];
    Object.keys(tierGroups).forEach((tierStr) => {
      const tier = parseInt(tierStr, 10);
      const group = tierGroups[tier];
      const spacingX = 230;
      const totalWidth = (group.length - 1) * spacingX;
      const startX = Math.max(40, 400 - totalWidth / 2);

      group.forEach((nodeData, idx) => {
        nodes.push({
          id: nodeData.id,
          type: "serviceNode",
          position: {
            x: startX + idx * spacingX,
            y: 40 + tier * 140,
          },
          data: {
            id: nodeData.id,
            label: nodeData.label || nodeData.id,
            status: nodeData.status,
            error_count: nodeData.error_count || 0,
            anomaly_score: nodeData.anomaly_score || 0.0,
            first_error_time: nodeData.first_error_time,
          },
        });
      });
    });

    // Edges
    const edges = graph.edges.map((e) => {
      const isCritical = e.is_critical_path;
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        animated: isCritical,
        style: {
          stroke: isCritical ? "var(--severity-error)" : "var(--border-subtle)",
          strokeWidth: isCritical ? 2.5 : 1.5,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isCritical ? "var(--severity-error)" : "var(--border-subtle)",
          width: 14,
          height: 14,
        },
      };
    });

    return { rfNodes: nodes, rfEdges: edges };
  }, [graph]);

  if (!graph || !graph.nodes || graph.nodes.length === 0) {
    return (
      <div
        style={{
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "var(--bg-secondary)",
          borderRadius: "var(--radius-md)",
          color: "var(--text-muted)",
          fontSize: "13px",
        }}
      >
        No causal graph available. Run Root Cause Analysis to generate topological graph.
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        height,
        backgroundColor: "var(--bg-secondary)",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border-subtle)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        fitView
        onNodeClick={(_, node) => onNodeClick && onNodeClick(node.id)}
      >
        <Background color="var(--border-subtle)" gap={16} size={1} />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={(n) => {
            if (n.data?.status === "ROOT_CAUSE") return "#ef4444";
            if (n.data?.status === "PROPAGATING") return "#f59e0b";
            return "#64748b";
          }}
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "6px",
          }}
        />
      </ReactFlow>
    </div>
  );
}
