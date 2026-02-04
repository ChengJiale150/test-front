'use client';

import type { SubAgentRecord } from '@/lib/chat-store';
import { ChevronDown, ChevronRight, UserRound, FoldVertical, UnfoldVertical } from 'lucide-react';
import { useState } from 'react';

export default function SubAgentsPanel({ subAgents }: { subAgents: SubAgentRecord[] }) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const allOpen = subAgents.length > 0 && subAgents.every(a => open[a.name]);

  return (
    <div className="w-full bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-gray-800">子Agent</div>
          <div className="text-xs text-gray-500">{subAgents?.length ?? 0} 个</div>
        </div>
        <button
          type="button"
          className="shrink-0 inline-flex items-center gap-2 text-xs text-gray-600 border border-gray-200 bg-white hover:bg-gray-50 px-2.5 py-1.5 rounded-lg"
          onClick={() => {
            setOpen(prev => {
              if (!subAgents || subAgents.length === 0) return prev;
              const next: Record<string, boolean> = {};
              if (!allOpen) {
                for (const a of subAgents) next[a.name] = true;
              } else {
                for (const a of subAgents) next[a.name] = false;
              }
              return next;
            });
          }}
        >
          {allOpen ? <FoldVertical size={14} /> : <UnfoldVertical size={14} />}
          {allOpen ? '全部收起' : '全部展开'}
        </button>
      </div>
      {(!subAgents || subAgents.length === 0) ? (
        <div className="p-8 text-sm text-gray-400 text-center">暂无子Agent</div>
      ) : (
        <div className="p-3 space-y-2 bg-gray-50">
          {subAgents.map(agent => {
            const isOpen = open[agent.name] ?? false;
            return (
              <div key={agent.name} className="bg-white border border-gray-200 rounded-xl shadow-sm">
                <button
                  className="w-full flex items-center justify-between gap-3 text-left px-3.5 py-3"
                  onClick={() => setOpen(prev => ({ ...prev, [agent.name]: !isOpen }))}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                      <UserRound size={16} className="text-indigo-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-gray-900 truncate">{agent.name}</div>
                      <div className="text-xs text-gray-500 truncate">
                        {(agent.system_prompt || '').trim() ? '已配置 system prompt' : '未配置 system prompt'}
                      </div>
                    </div>
                  </div>
                  {isOpen ? (
                    <ChevronDown size={16} className="text-gray-400 shrink-0" />
                  ) : (
                    <ChevronRight size={16} className="text-gray-400 shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-3.5 pb-3.5">
                    <div className="text-xs text-gray-600 font-mono whitespace-pre-wrap bg-gray-50 border border-gray-200 rounded-lg p-3">
                      {agent.system_prompt || ''}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
