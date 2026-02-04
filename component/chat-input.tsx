import { useState, useRef, useEffect } from 'react';
import { Send, Square } from 'lucide-react';

export default function ChatInput({
  status,
  onSubmit,
  stop,
}: {
  status: string;
  onSubmit: (text: string) => void;
  stop?: () => void;
}) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [text]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (text.trim() === '') return;
    onSubmit(text);
    setText('');
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full bg-white border-t border-gray-200 pt-4 pb-6">
      <div className="max-w-3xl mx-auto relative flex items-end gap-2 p-2 border border-gray-300 rounded-xl bg-white shadow-sm focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
        <textarea
          ref={textareaRef}
          className="flex-1 max-h-[200px] min-h-[24px] bg-transparent outline-none resize-none py-2 px-1 text-sm md:text-base"
          placeholder="Send a message..."
          disabled={status !== 'ready'}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
        />
        
        {status === 'streaming' || status === 'submitted' ? (
          <button
            onClick={stop}
            className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
            title="Stop generating"
          >
            <Square size={20} fill="currentColor" />
          </button>
        ) : (
          <button
            onClick={() => handleSubmit()}
            disabled={!text.trim() || status !== 'ready'}
            className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Send message"
          >
            <Send size={20} />
          </button>
        )}
      </div>
      <div className="text-center text-xs text-gray-400 mt-2">
        Agent Orchestrator can make mistakes. Please verify important information.
      </div>
    </div>
  );
}
