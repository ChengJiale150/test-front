import { MessageSquare, Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { useState } from 'react';

interface ChatSummary {
  id: string;
  title: string;
  createdAt: number;
}

interface SidebarProps {
  chats: ChatSummary[];
  currentChatId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newTitle: string) => void;
}

export default function Sidebar({ chats, currentChatId, onSelect, onNew, onDelete, onRename }: SidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const startEditing = (chat: ChatSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(chat.id);
    setEditTitle(chat.title);
  };

  const saveEdit = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (editingId && editTitle.trim()) {
      onRename(editingId, editTitle.trim());
    }
    setEditingId(null);
    setEditTitle('');
  };

  const cancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
    setEditTitle('');
  };

  return (
    <div className="w-64 bg-gray-900 text-white flex flex-col h-screen border-r border-gray-800">
      <div className="p-4 border-b border-gray-800">
        <button
          onClick={onNew}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded transition-colors"
        >
          <Plus size={16} />
          New Chat
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {chats.length === 0 && (
            <div className="text-gray-500 text-sm text-center mt-4">No chats yet</div>
        )}
        {[...chats].sort((a, b) => b.createdAt - a.createdAt).map(chat => (
          <div
            key={chat.id}
            className={`
              group flex items-center justify-between p-3 rounded cursor-pointer transition-colors
              ${currentChatId === chat.id ? 'bg-gray-800' : 'hover:bg-gray-800/50'}
            `}
            onClick={() => onSelect(chat.id)}
          >
            <div className="flex items-center gap-3 overflow-hidden flex-1">
              <MessageSquare size={16} className="text-gray-400 shrink-0" />
              
              {editingId === chat.id ? (
                <div className="flex items-center gap-1 flex-1" onClick={e => e.stopPropagation()}>
                    <input 
                        className="bg-gray-700 text-white text-xs p-1 rounded w-full outline-none border border-blue-500"
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        autoFocus
                        onKeyDown={e => {
                            if (e.key === 'Enter') saveEdit();
                            if (e.key === 'Escape') setEditingId(null);
                        }}
                    />
                    <button onClick={saveEdit} className="text-green-400 hover:text-green-300"><Check size={14} /></button>
                    <button onClick={cancelEdit} className="text-red-400 hover:text-red-300"><X size={14} /></button>
                </div>
              ) : (
                <div className="flex flex-col overflow-hidden flex-1">
                    <span className="text-sm truncate text-gray-200" title={chat.title}>
                    {chat.title || 'Untitled Chat'}
                    </span>
                    <span className="text-xs text-gray-500">
                    {new Date(chat.createdAt).toLocaleDateString()}
                    </span>
                </div>
              )}
            </div>
            
            {!editingId && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => startEditing(chat, e)}
                        className="p-1 hover:text-blue-400 text-gray-500"
                        title="Rename chat"
                    >
                        <Edit2 size={14} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(chat.id);
                        }}
                        className="p-1 hover:text-red-400 text-gray-500"
                        title="Delete chat"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            )}
          </div>
        ))}
      </div>
      
      <div className="p-4 border-t border-gray-800 text-xs text-gray-500 text-center">
        Agent Orchestrator
      </div>
    </div>
  );
}
