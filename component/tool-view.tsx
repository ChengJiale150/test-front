import { CheckCircle2, Circle, Clock } from 'lucide-react';

interface ToolInvocation {
  toolCallId: string;
  toolName: string;
  args: any;
  result?: any;
  state?: 'result' | 'partial-call' | 'call';
}

export default function ToolView({ invocation }: { invocation: ToolInvocation }) {
  const { toolName, args, result, state } = invocation;
  const isComplete = state === 'result';

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
        <div className="flex items-center gap-2 font-medium text-indigo-700 mb-1">
          <CheckCircle2 size={16} />
          Created Sub-Agent: {args.name}
        </div>
        <div className="text-gray-600 pl-6 text-xs font-mono bg-white p-2 rounded border border-indigo-50 mt-1">
          {args.system_prompt}
        </div>
        {isComplete && result && (
             <div className="pl-6 mt-1 text-xs text-green-600">
                Result: {JSON.stringify(result)}
             </div>
        )}
      </div>
    );
  }

  if (toolName === 'plan_subagent_graph') {
    return (
      <div className="my-2 p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-sm">
        <div className="font-medium text-emerald-700 mb-2 flex items-center gap-2">
            <Clock size={16} />
            Execution Plan
        </div>
        <div className="space-y-2">
            {args.nodes?.map((node: any, i: number) => (
                <div key={i} className="flex items-start gap-2 bg-white p-2 rounded border border-emerald-50">
                    <div className="mt-0.5">
                        {node.status === 'completed' ? (
                            <CheckCircle2 size={14} className="text-green-500" />
                        ) : node.status === 'in_progress' ? (
                            <Clock size={14} className="text-blue-500 animate-pulse" />
                        ) : (
                            <Circle size={14} className="text-gray-300" />
                        )}
                    </div>
                    <div>
                        <div className="font-medium text-gray-800 text-xs">
                            Step {node.step}: {node.agent}
                        </div>
                        <div className="text-gray-600 text-xs">
                            {node.task}
                        </div>
                    </div>
                </div>
            ))}
        </div>
        {isComplete && result && (
            <div className="mt-2 text-xs text-gray-500 italic">
                {typeof result === 'string' ? result : 'Plan updated successfully.'}
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
