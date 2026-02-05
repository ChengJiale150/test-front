'use client';

import { CheckCircle2, Circle, Clock, ChevronDown, ChevronRight, PlayCircle } from 'lucide-react';
import mermaid from 'mermaid';
import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
  suppressErrorRendering: true,
});

function Mermaid({ chart }: { chart: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
      mermaid.parse(chart)
        .then(() => mermaid.render(id, chart))
        .then(({ svg }) => {
          if (ref.current) {
            ref.current.innerHTML = svg;
          }
        })
        .catch(() => {
          // Ignore parsing errors during streaming updates to prevent user disruption
        });
    }
  }, [chart]);

  return <div ref={ref} className="overflow-x-auto" />;
}

interface ToolInvocation {
  toolCallId: string;
  toolName: string;
  args: any;
  result?: any;
  state?:
    | 'result'
    | 'partial-call'
    | 'call'
    | 'input-available'
    | 'output-available'
    | 'output-error'
    | 'output-denied'
    | 'approval-requested'
    | 'approval-responded';
  approval?: {
    id: string;
    approved?: boolean;
    reason?: string;
  };
}

export default function ToolView({
  invocation,
  onApprove,
  onReject,
  onAutoApproveAfter,
}: {
  invocation: ToolInvocation;
  onApprove?: (approvalId: string) => void;
  onReject?: (approvalId: string, reason: string) => void;
  onAutoApproveAfter?: (approvalId: string) => void;
}) {
  const { toolName, args, result, state, approval } = invocation;
  const isComplete =
    state === 'result' ||
    state === 'output-available' ||
    state === 'output-error' ||
    state === 'output-denied';
  const [isExpanded, setIsExpanded] = useState(!isComplete);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Auto-collapse when complete
  useEffect(() => {
    if (isComplete) {
      setIsExpanded(false);
    }
  }, [isComplete]);

  useEffect(() => {
    if (state !== 'approval-requested') {
      setShowRejectInput(false);
      setRejectReason('');
    }
  }, [state]);

  if (!args) {
    return (
        <div className="my-2 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono text-gray-500">
            Loading tool {toolName}...
        </div>
    );
  }

  if (toolName === 'create_subagent') {
    return (
      <div className="my-2 p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-sm">
        <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between font-medium text-indigo-700 mb-1 hover:text-indigo-900 transition-colors"
        >
            <div className="flex items-center gap-2">
                <CheckCircle2 size={16} />
                Created Sub-Agent: {args.name}
            </div>
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        
        {isExpanded && (
            <div className="mt-2 pl-6 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="text-gray-600 text-xs bg-white p-2 rounded border border-indigo-50 mb-2 prose prose-xs max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{args.system_prompt}</ReactMarkdown>
                </div>
                {/* Result hidden as requested */}
            </div>
        )}
      </div>
    );
  }

  if (toolName === 'plan_subtask_graph') {
    const rawNodes = Array.isArray(args.nodes) ? args.nodes : [];
    const nodes = rawNodes.filter((n: any) => n && typeof n.task === 'string');
    let chart = 'graph TD\n';
    
    // Nodes
    const taskToId = new Map(nodes.map((n: any, i: number) => [n.task, `node${i}`]));
    
    nodes.forEach((node: any, i: number) => {
        const safeTaskName = node.task.replace(/["\n]/g, '');
        const id = `node${i}`;
        // Style based on status
        let style = '';
        if (node.status === 'completed') style = ':::completed';
        else if (node.status === 'in_progress') style = ':::inprogress';
        else style = ':::pending';
        
        chart += `    ${id}["${safeTaskName}"]${style}\n`;
    });

    // Edges
    nodes.forEach((node: any) => {
        if (node.dependencies) {
            node.dependencies.forEach((dep: string) => {
                const fromId = taskToId.get(dep);
                const toId = taskToId.get(node.task);
                if (fromId && toId) {
                    chart += `    ${fromId} --> ${toId}\n`;
                }
            });
        }
    });

    // Styles
    chart += '    classDef completed fill:#f0fdf4,stroke:#22c55e,stroke-width:2px;\n';
    chart += '    classDef inprogress fill:#fefce8,stroke:#eab308,stroke-width:2px,stroke-dasharray: 5 5;\n';
    chart += '    classDef pending fill:#f9fafb,stroke:#9ca3af,stroke-width:2px;\n';

    return (
      <div className="my-2 p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-sm">
        <div className="font-medium text-emerald-700 mb-2 flex items-center gap-2">
            <Clock size={16} />
            Execution Plan
        </div>
        <div className="bg-white p-2 rounded border border-emerald-50">
            <Mermaid chart={chart} />
        </div>
        {state === 'approval-requested' && approval?.id && (
          <div className="mt-3 rounded-lg border border-emerald-100 bg-white p-3 text-xs text-emerald-700">
            <div className="font-medium mb-2">Need Human Approval</div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onApprove?.(approval.id)}
                className="px-3 py-1 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
              >
                Approve
              </button>
              <button
                onClick={() => setShowRejectInput(true)}
                className="px-3 py-1 rounded-md bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors"
              >
                Reject
              </button>
              <button
                onClick={() => onAutoApproveAfter?.(approval.id)}
                className="px-3 py-1 rounded-md bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 transition-colors"
              >
                Auto Approve After
              </button>
            </div>
            {showRejectInput && (
              <div className="mt-3">
                <div className="text-gray-600 mb-2">Please provide a reason for rejecting the task:</div>
                <textarea
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  className="w-full rounded-md border border-gray-200 p-2 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  rows={3}
                  placeholder="e.g. Merge similar tasks, reduce hierarchy, sort by priority"
                />
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (!rejectReason.trim()) return;
                      onReject?.(approval.id, rejectReason.trim());
                      setShowRejectInput(false);
                      setRejectReason('');
                    }}
                    className="px-3 py-1 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors"
                  >
                    Reject Task
                  </button>
                  <button
                    onClick={() => {
                      setShowRejectInput(false);
                      setRejectReason('');
                    }}
                    className="px-3 py-1 rounded-md text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {/* Tool output hidden as requested */}
      </div>
    );
  }

  if (toolName === 'assign_task') {
      return (
          <div className="my-2 p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm">
              <button 
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="w-full flex items-center justify-between font-medium text-blue-700 mb-1 hover:text-blue-900 transition-colors"
              >
                  <div className="flex items-center gap-2">
                      <PlayCircle size={16} />
                      Assigning Task: {args.task} → {args.agent}
                  </div>
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>

              {isExpanded && (
                  <div className="mt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="text-gray-600 text-xs bg-white p-2 rounded border border-blue-50 prose prose-xs max-w-none">
                          <strong className="block mb-1">Prompt:</strong>
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{args.prompt}</ReactMarkdown>
                      </div>
                  </div>
              )}
              
              {isComplete && result && (
                   <div className="mt-2 pt-2 border-t border-blue-100 text-xs text-green-700 prose prose-xs max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {typeof result === 'object' && result.result ? result.result : JSON.stringify(result)}
                      </ReactMarkdown>
                   </div>
              )}
          </div>
      );
  }

  // Fallback generic tool view
  return (
    <div className="my-2 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono">
      <div className="font-bold text-gray-700 text-xs mb-1">TOOL: {toolName}</div>
      <div className="bg-white p-2 rounded border border-gray-100 overflow-x-auto text-xs">
        {JSON.stringify(args, null, 2)}
      </div>
      {isComplete && (
        <div className="mt-1 pt-1 border-t border-gray-200 text-gray-500 text-xs">
           → {JSON.stringify(result)}
        </div>
      )}
    </div>
  );
}
