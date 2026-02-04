'use client';

import { useChat } from '@ai-sdk/react';
import ChatInput from '@/component/chat-input';
import Sidebar from '@/component/sidebar';
import ToolView from '@/component/tool-view';
import GraphPanel from '@/component/graph-panel';
import SubAgentsPanel from '@/component/subagents-panel';
import type { OrchestratorAgentUIMessage } from '@/agent/orchestrator-agent';
import type { GraphNode, SubAgentRecord } from '@/lib/chat-store';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, BrainCircuit, ChevronDown, ChevronRight } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import ReactMarkdown from 'react-markdown';

// --- Types ---

interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
}

// --- API Helpers ---

async function fetchChats(): Promise<ChatSession[]> {
  const res = await fetch('/api/history');
  if (!res.ok) return [];
  return res.json();
}

async function fetchChat(id: string) {
  const res = await fetch(`/api/history?id=${id}`);
  if (!res.ok) return null;
  return res.json();
}

async function saveChatToApi(chat: {
  id: string;
  title?: string;
  messages?: any[];
  graph?: GraphNode[];
  subAgents?: SubAgentRecord[];
}) {
  await fetch('/api/history', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(chat),
  });
}

async function deleteChatFromApi(id: string) {
  await fetch(`/api/history?id=${id}`, { method: 'DELETE' });
}

// --- Components ---

function ThinkingBlock({ content }: { content: string }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden my-2 bg-gray-50">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 p-2 bg-gray-100 hover:bg-gray-200 transition-colors text-xs font-medium text-gray-600"
      >
        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <BrainCircuit size={14} />
        <span>Thinking Process</span>
      </button>
      
      {isOpen && (
        <div className="p-3 text-sm text-gray-600 font-mono whitespace-pre-wrap border-t border-gray-200 bg-gray-50/50">
          {content}
        </div>
      )}
    </div>
  );
}

// --- Chat Interface Component ---

function ChatInterface({ 
  chatId, 
  initialMessages, 
  initialGraph,
  initialSubAgents,
  onChatUpdate 
}: { 
  chatId: string; 
  initialMessages: any[];
  initialGraph: GraphNode[];
  initialSubAgents: SubAgentRecord[];
  onChatUpdate: (chat: any) => void;
}) {
  const { status, sendMessage, messages, stop, setMessages } = useChat<OrchestratorAgentUIMessage>({
    id: chatId,
  });

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages, setMessages]); // Added dependencies

  const [graph, setGraph] = useState<GraphNode[]>(initialGraph ?? []);
  const [subAgents, setSubAgents] = useState<SubAgentRecord[]>(initialSubAgents ?? []);

  useEffect(() => {
    setGraph(initialGraph ?? []);
  }, [initialGraph]);

  useEffect(() => {
    setSubAgents(initialSubAgents ?? []);
  }, [initialSubAgents]);

  useEffect(() => {
    const fromMessages = new Map<string, string>();
    for (const message of initialMessages ?? []) {
      const parts = (message as any)?.parts;
      if (!Array.isArray(parts)) continue;
      for (const part of parts) {
        if (part?.type !== 'tool-create_subagent') continue;
        const args = part?.args || part?.toolInvocation?.args || part?.input || part?.toolInvocation?.input;
        const name = args?.name;
        const system_prompt = args?.system_prompt;
        if (typeof name !== 'string' || typeof system_prompt !== 'string') continue;
        const incoming = system_prompt.trim();
        if (!incoming) continue;
        if (!fromMessages.has(name)) fromMessages.set(name, system_prompt);
      }
    }

    if (fromMessages.size === 0) return;

    setSubAgents(prev => {
      let changed = false;
      const next = [...(prev ?? [])];
      for (const [name, system_prompt] of fromMessages.entries()) {
        const idx = next.findIndex(a => a.name === name);
        if (idx < 0) {
          next.push({ name, system_prompt });
          changed = true;
          continue;
        }
        const current = (next[idx]?.system_prompt ?? '').trim();
        const incoming = system_prompt.trim();
        if (!current && incoming) {
          next[idx] = { name, system_prompt };
          changed = true;
        }
      }
      if (changed) {
        void saveChatToApi({ id: chatId, subAgents: next });
        onChatUpdate({ id: chatId, subAgents: next });
        return next;
      }
      return prev;
    });
  }, [chatId, initialMessages, onChatUpdate]);

  const processedToolCallIds = useRef<Set<string>>(new Set());

  const [prevStatus, setPrevStatus] = useState(status);

  useEffect(() => {
    // Auto-save when status changes to ready (meaning streaming finished)
    if (prevStatus !== 'ready' && status === 'ready' && messages.length > 0) {
        const save = async () => {
            const title = (messages[0] as any)?.content?.slice(0, 30) || 'New Chat';
            const chatData = {
                id: chatId,
                title,
                messages,
            };
            await saveChatToApi(chatData);
            onChatUpdate(chatData);
        };
        save();
    }
    setPrevStatus(status);
  }, [status, messages, chatId, onChatUpdate, prevStatus, graph, subAgents]);

  useEffect(() => {
    if (!chatId) return;
    if (status !== 'streaming' && status !== 'submitted') return;

    let cancelled = false;
    const intervalId = setInterval(async () => {
      try {
        const serverChat = await fetchChat(chatId);
        if (cancelled || !serverChat) return;

        const nextGraph = (serverChat.graph ?? []) as GraphNode[];
        const nextSubAgents = (serverChat.subAgents ?? []) as SubAgentRecord[];

        setGraph(prev => {
          if (prev.length === nextGraph.length && prev.every((n, i) => {
            const m = nextGraph[i];
            return m && n.agent === m.agent && n.task === m.task && n.step === m.step && n.status === m.status;
          })) {
            return prev;
          }
          return nextGraph;
        });

        setSubAgents(prev => {
          if (prev.length === nextSubAgents.length && prev.every((a, i) => {
            const b = nextSubAgents[i];
            return b && a.name === b.name && a.system_prompt === b.system_prompt;
          })) {
            return prev;
          }
          return nextSubAgents;
        });
      } catch {
      }
    }, 2000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [chatId, status]);

  useEffect(() => {
    for (const message of messages) {
      const parts = (message as any).parts;
      if (!Array.isArray(parts)) continue;

      for (const part of parts) {
        const type = part?.type;
        if (type !== 'tool-create_subagent' && type !== 'tool-plan_subagent_graph') continue;

        const toolCallId =
          part?.toolCallId || part?.toolInvocation?.toolCallId || part?.toolInvocation?.toolCallID || 'unknown';
        if (processedToolCallIds.current.has(toolCallId)) continue;

        if (type === 'tool-create_subagent') {
          const args = part?.args || part?.toolInvocation?.args || part?.input || part?.toolInvocation?.input;
          const name = args?.name;
          const system_prompt = args?.system_prompt;
          if (typeof name !== 'string' || typeof system_prompt !== 'string') continue;

          processedToolCallIds.current.add(toolCallId);
          if (typeof name === 'string' && typeof system_prompt === 'string') {
            setSubAgents(prev => {
              const incoming = system_prompt.trim();
              const existingIndex = prev.findIndex(a => a.name === name);
              if (existingIndex >= 0) {
                const current = (prev[existingIndex]?.system_prompt ?? '').trim();
                if (!incoming || incoming === current) return prev;
                const next = [...prev];
                next[existingIndex] = { name, system_prompt };
                void saveChatToApi({ id: chatId, subAgents: next });
                onChatUpdate({ id: chatId, subAgents: next });
                return next;
              }

              const next = [...prev, { name, system_prompt }];
              void saveChatToApi({ id: chatId, subAgents: next });
              onChatUpdate({ id: chatId, subAgents: next });
              return next;
            });
          }
        }

        if (type === 'tool-plan_subagent_graph') {
          const args = part?.args || part?.toolInvocation?.args || part?.input || part?.toolInvocation?.input;
          const nodes = args?.nodes;
          if (!Array.isArray(nodes)) continue;

          processedToolCallIds.current.add(toolCallId);
          setGraph(() => {
            void saveChatToApi({ id: chatId, graph: nodes as GraphNode[] });
            onChatUpdate({ id: chatId, graph: nodes as GraphNode[] });
            return nodes as GraphNode[];
          });
        }
      }
    }
  }, [messages, chatId, onChatUpdate]);

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-gray-50">
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 scroll-smooth">
          {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <BrainCircuit size={48} className="mb-4 opacity-50" />
                  <h2 className="text-xl font-semibold mb-2">Orchestrator Agent</h2>
                  <p className="text-sm">Ready to help you plan and execute tasks.</p>
              </div>
          )}

          <div className="space-y-6 max-w-3xl mx-auto">
              {messages.map(message => (
              <div key={message.id} className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`
                      px-4 py-3 rounded-2xl max-w-[90%] lg:max-w-[80%]
                      ${message.role === 'user' 
                          ? 'bg-blue-600 text-white rounded-br-none' 
                          : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'}
                  `}>
                  <div className={`font-bold text-xs mb-1 ${message.role === 'user' ? 'text-blue-100' : 'text-gray-400'}`}>
                      {message.role === 'user' ? 'You' : 'Agent'}
                  </div>
                  
                  <div className="space-y-2 overflow-hidden">
                      {message.parts?.map((part, index) => {
                          switch (part.type) {
                          case 'text':
                              return (
                                  <div key={index} className="prose prose-sm max-w-none dark:prose-invert">
                                      <ReactMarkdown>{part.text}</ReactMarkdown>
                                  </div>
                              );

                          case 'reasoning': 
                              return <ThinkingBlock key={index} content={part.text} />;

                          case 'step-start':
                              return (
                                  <div key={index} className="flex items-center gap-2 text-xs text-gray-400 my-1 animate-pulse">
                                      <BrainCircuit size={12} />
                                      <span>Thinking...</span>
                                  </div>
                              );
                          
                          case 'tool-create_subagent': {
                               const p = part as any;
                               return <ToolView key={index} invocation={{ 
                                   toolName: 'create_subagent', 
                                 args: p.args || p.toolInvocation?.args || p.input || p.toolInvocation?.input, 
                                 result: p.result || p.toolInvocation?.result || p.output || p.toolInvocation?.output,
                                   state: 'result',
                                   toolCallId: p.toolCallId || p.toolInvocation?.toolCallId || 'unknown'
                               }} />;
                          }

                          case 'tool-plan_subagent_graph': {
                               const p = part as any;
                               return <ToolView key={index} invocation={{ 
                                   toolName: 'plan_subagent_graph', 
                                 args: p.args || p.toolInvocation?.args || p.input || p.toolInvocation?.input, 
                                 result: p.result || p.toolInvocation?.result || p.output || p.toolInvocation?.output,
                                   state: 'result',
                                   toolCallId: p.toolCallId || p.toolInvocation?.toolCallId || 'unknown'
                               }} />;
                          }

                          default:
                               return null;
                          }
                      })}
                      {!message.parts && (message as any).content && (
                          <div className="prose prose-sm max-w-none dark:prose-invert">
                               <ReactMarkdown>{(message as any).content}</ReactMarkdown>
                          </div>
                      )}
                  </div>
                  </div>
              </div>
              ))}
              
              {status === 'streaming' && (
                  <div className="flex items-center gap-2 text-gray-400 text-sm ml-4">
                      <Loader2 size={14} className="animate-spin" />
                      <span>Agent is working...</span>
                  </div>
              )}
          </div>
        </div>

        <div className="border-t border-gray-200 bg-gray-50">
          <div className="w-full max-w-3xl mx-auto px-4 py-4">
            <ChatInput
              status={status}
              onSubmit={text => sendMessage({ text }, { body: { id: chatId } })}
              stop={stop}
            />
          </div>
        </div>
      </div>

      <aside className="w-full lg:w-[420px] shrink-0 border-t lg:border-t-0 lg:border-l border-gray-200 bg-gray-50">
        <div className="h-full overflow-y-auto p-4 space-y-4">
          <GraphPanel graph={graph} />
          <SubAgentsPanel subAgents={subAgents} />
        </div>
      </aside>
    </div>
  );
}

// --- Main Page Component ---

export default function ChatPage() {
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<any[]>([]);
  const [initialGraph, setInitialGraph] = useState<GraphNode[]>([]);
  const [initialSubAgents, setInitialSubAgents] = useState<SubAgentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChats();
  }, []);

  const loadChats = async () => {
    const data = await fetchChats();
    setChats(data);
    setLoading(false);
  };

  const handleSelectChat = async (id: string) => {
    // If selecting same chat, do nothing (optional optimization)
    if (id === currentChatId) return;

    // Reset messages first to avoid flash of old content
    setInitialMessages([]); 
    setInitialGraph([]);
    setInitialSubAgents([]);
    setCurrentChatId(id);

    const chat = await fetchChat(id);
    if (chat) {
      setInitialMessages(chat.messages || []);
      setInitialGraph(chat.graph || []);
      setInitialSubAgents(chat.subAgents || []);
    }
  };

  const handleNewChat = () => {
    const newId = uuidv4();
    setCurrentChatId(newId);
    setInitialMessages([]);
    setInitialGraph([]);
    setInitialSubAgents([]);
  };

  const handleDeleteChat = async (id: string) => {
    await deleteChatFromApi(id);
    if (currentChatId === id) {
        setCurrentChatId(null);
        setInitialMessages([]);
        setInitialGraph([]);
        setInitialSubAgents([]);
    }
    await loadChats();
  };

  const handleRenameChat = async (id: string, newTitle: string) => {
      // Optimistic update
      setChats(prev => prev.map(c => c.id === id ? { ...c, title: newTitle } : c));
      
      await saveChatToApi({ id, title: newTitle });
      await loadChats(); // Sync with server to be safe
  };

  const handleChatUpdate = useCallback(async (updatedChat: any) => {
      await loadChats();
  }, []);

  useEffect(() => {
    if (!loading && !currentChatId && chats.length === 0) {
        handleNewChat();
    }
  }, [loading, chats.length]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar 
        chats={chats} 
        currentChatId={currentChatId} 
        onSelect={handleSelectChat} 
        onNew={handleNewChat}
        onDelete={handleDeleteChat}
        onRename={handleRenameChat}
      />
      
      <main className="flex-1 relative">
        {currentChatId ? (
            <ChatInterface 
                key={currentChatId}
                chatId={currentChatId}
                initialMessages={initialMessages}
                initialGraph={initialGraph}
                initialSubAgents={initialSubAgents}
                onChatUpdate={handleChatUpdate}
            />
        ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
                <Loader2 className="animate-spin mr-2" /> Loading...
            </div>
        )}
      </main>
    </div>
  );
}
