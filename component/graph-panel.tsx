'use client';

import type { GraphNode } from '@/lib/chat-store';
import { Background, Controls, ReactFlow, type Edge, type Node } from '@xyflow/react';
import { useMemo } from 'react';

function buildFlow(graph: GraphNode[]) {
  const byStep = new Map<number, GraphNode[]>();
  for (const item of graph) {
    const stepNum = Number(item.step);
    if (isNaN(stepNum)) continue;
    
    const list = byStep.get(stepNum) ?? [];
    list.push(item);
    byStep.set(stepNum, list);
  }

  const steps = Array.from(byStep.keys()).sort((a, b) => a - b);
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const stepToNodeIds = new Map<number, string[]>();

  for (const step of steps) {
    const list = byStep.get(step) ?? [];
    const ids: string[] = [];
    const count = list.length;
    
    list.forEach((g, index) => {
      const id = `${step}:${g.agent}:${index}`;
      ids.push(id);
      
      // Center the nodes: (index - (count - 1) / 2) * spacing
      const x = (index - (count - 1) / 2) * 320;
      
      nodes.push({
        id,
        position: { x, y: (step - 1) * 180 },
        data: {
          label: (
            <div className="text-xs leading-4">
              <div className="font-semibold text-gray-900 mb-1">Step {g.step}: {g.agent}</div>
              <div className="text-gray-600 mb-2 line-clamp-3">{g.task}</div>
              <div className="flex items-center">
                <span
                  className={
                    g.status === 'completed'
                      ? 'text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full text-[10px] font-medium'
                      : g.status === 'in_progress'
                        ? 'text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full text-[10px] font-medium'
                        : 'text-gray-600 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full text-[10px] font-medium'
                  }
                >
                  {g.status}
                </span>
              </div>
            </div>
          ),
        },
        style: {
          width: 280,
          borderRadius: 12,
          border: '1px solid rgb(229 231 235)',
          background: 'white',
          padding: 12,
          boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        },
      });
    });
    stepToNodeIds.set(step, ids);
  }

  for (let i = 0; i < steps.length - 1; i++) {
    const fromStep = steps[i];
    const toStep = steps[i + 1];
    const fromIds = stepToNodeIds.get(fromStep) ?? [];
    const toIds = stepToNodeIds.get(toStep) ?? [];
    for (const from of fromIds) {
      for (const to of toIds) {
        edges.push({
          id: `${from}->${to}`,
          source: from,
          target: to,
          markerEnd: { type: 'arrowclosed' },
          type: 'smoothstep',
        });
      }
    }
  }

  return { nodes, edges };
}

export default function GraphPanel({ graph }: { graph: GraphNode[] }) {
  const { nodes, edges } = useMemo(() => buildFlow(graph ?? []), [graph]);

  return (
    <div className="h-[520px] w-full bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-2 border-b border-gray-100 text-sm font-semibold text-gray-800">
        子Agent逻辑图
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
