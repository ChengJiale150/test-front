'use client';

import type { GraphNode } from '@/lib/chat-store';
import { Background, Controls, ReactFlow, type Edge, type Node } from '@xyflow/react';
import { useMemo } from 'react';

function buildFlow(graph: GraphNode[]) {
  // 1. Calculate levels based on dependencies
  const taskLevels = new Map<string, number>();
  const taskToNode = new Map(graph.map(n => [n.task, n]));

  function getLevel(task: string, visited = new Set<string>()): number {
    if (taskLevels.has(task)) return taskLevels.get(task)!;
    if (visited.has(task)) return 0; // Cycle detected
    
    visited.add(task);
    const node = taskToNode.get(task);
    if (!node || !node.dependencies || node.dependencies.length === 0) {
      taskLevels.set(task, 1);
      return 1;
    }

    let maxDepLevel = 0;
    for (const dep of node.dependencies) {
      maxDepLevel = Math.max(maxDepLevel, getLevel(dep, visited));
    }
    
    const level = maxDepLevel + 1;
    taskLevels.set(task, level);
    return level;
  }

  graph.forEach(n => getLevel(n.task));

  // 2. Group by level
  const byLevel = new Map<number, GraphNode[]>();
  taskLevels.forEach((level, task) => {
    const list = byLevel.get(level) ?? [];
    const node = taskToNode.get(task);
    if (node) {
      list.push(node);
      byLevel.set(level, list);
    }
  });

  const levels = Array.from(byLevel.keys()).sort((a, b) => a - b);
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const taskToNodeId = new Map<string, string>();

  for (const level of levels) {
    const list = byLevel.get(level) ?? [];
    const count = list.length;
    
    list.forEach((g, index) => {
      // Use index in level to create unique ID, but we need to map task to ID for edges
      const id = `${level}:${index}`; 
      taskToNodeId.set(g.task, id);
      
      // Center the nodes: (index - (count - 1) / 2) * spacing
      const x = (index - (count - 1) / 2) * 320;
      
      // Determine styles based on status
      const nodeStyle: Record<string, string | number> = {
        width: 280,
        borderRadius: 12,
        padding: 12,
        boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        background: 'white',
      };

      let badgeClass = 'px-2 py-0.5 rounded-full text-[10px] font-medium border ';

      if (g.status === 'completed') {
        nodeStyle.border = '2px solid #22c55e'; // green-500
        nodeStyle.background = '#f0fdf4'; // green-50
        badgeClass += 'text-green-700 bg-green-100 border-green-200';
      } else if (g.status === 'in_progress') {
        nodeStyle.border = '2px solid #eab308'; // yellow-500
        nodeStyle.background = '#fefce8'; // yellow-50
        badgeClass += 'text-yellow-700 bg-yellow-100 border-yellow-200';
      } else {
        nodeStyle.border = '2px dashed #9ca3af'; // gray-400
        nodeStyle.background = '#f9fafb'; // gray-50
        badgeClass += 'text-gray-600 bg-gray-100 border-gray-200';
      }

      nodes.push({
        id,
        position: { x, y: (level - 1) * 180 },
        data: {
          label: (
            <div className="text-xs leading-4">
              <div className="font-semibold text-gray-900 mb-1">Level {level}</div>
              <div className="text-gray-600 mb-2 line-clamp-3">{g.task}</div>
              <div className="flex items-center">
                <span className={badgeClass}>
                  {g.status}
                </span>
              </div>
            </div>
          ),
        },
        style: nodeStyle,
      });
    });
  }

  // Create edges
  graph.forEach(node => {
    const targetId = taskToNodeId.get(node.task);
    if (!targetId) return;

    if (node.dependencies) {
      node.dependencies.forEach(depTask => {
        const sourceId = taskToNodeId.get(depTask);
        if (sourceId) {
          edges.push({
            id: `${sourceId}->${targetId}`,
            source: sourceId,
            target: targetId,
            markerEnd: { type: 'arrowclosed' },
            type: 'smoothstep',
          });
        }
      });
    }
  });

  return { nodes, edges };
}

export default function GraphPanel({ graph }: { graph: GraphNode[] }) {
  const { nodes, edges } = useMemo(() => buildFlow(graph ?? []), [graph]);

  return (
    <div className="h-[520px] w-full bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-2 border-b border-gray-100 text-sm font-semibold text-gray-800">
        子Task逻辑图
      </div>
      {nodes.length === 0 ? (
        <div className="h-[calc(520px-41px)] flex items-center justify-center text-sm text-gray-400">
          暂无逻辑图
        </div>
      ) : (
        <div className="h-[calc(520px-41px)]">
          <ReactFlow nodes={nodes} edges={edges} fitView>
            <Background />
            <Controls />
          </ReactFlow>
        </div>
      )}
    </div>
  );
}
