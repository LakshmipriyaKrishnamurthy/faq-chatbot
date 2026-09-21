import React, { useState, useRef, useEffect } from 'react';
import { SendHorizontal } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (content: string) => void;
  isLoading: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading }) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea height as user types
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      // Cap maximum height around 140px (~5 lines)
      textareaRef.current.style.height = `${Math.min(scrollHeight, 140)}px`;
    }
  }, [text]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    const trimmed = text.trim();
    if (!trimmed || isLoading) {
      return;
    }

    onSendMessage(trimmed);
    setText('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isSendDisabled = isLoading || text.trim().length === 0;

  return (
    <div className="w-full bg-white border-t border-gray-200 px-4 py-3 sm:px-6 shadow-sm">
      <form
        onSubmit={handleSubmit}
        className="max-w-4xl mx-auto flex items-end gap-2 sm:gap-3"
      >
        <div className="relative flex-1 bg-gray-50 border border-gray-300 rounded-2xl focus-within:border-bank-600 focus-within:ring-2 focus-within:ring-bank-100 transition-all duration-150">
          <label htmlFor="chat-message-input" className="sr-only">
            Ask a question about your policy
          </label>
          <textarea
            id="chat-message-input"
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your policy..."
            disabled={isLoading}
            rows={1}
            className="w-full resize-none bg-transparent py-3 px-4 text-sm sm:text-base text-gray-900 placeholder:text-gray-400 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed max-h-[140px]"
          />
        </div>

        <button
          type="submit"
          disabled={isSendDisabled}
          aria-label="Send message"
          className={`flex items-center justify-center p-3 rounded-full flex-shrink-0 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-bank-500 focus:ring-offset-2 ${
            isSendDisabled
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-bank-600 text-white hover:bg-bank-700 active:scale-95 shadow-sm'
          }`}
        >
          <SendHorizontal size={20} />
        </button>
      </form>
    </div>
  );
};

export default ChatInput;
