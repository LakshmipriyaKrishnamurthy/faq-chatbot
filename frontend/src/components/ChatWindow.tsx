import React, { useEffect, useRef } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { ChatMessage as ChatMessageType } from '../types/chat';
import ChatMessage from './ChatMessage';
import LoadingIndicator from './LoadingIndicator';
import ChatInput from './ChatInput';

interface ChatWindowProps {
  messages: ChatMessageType[];
  isLoading: boolean;
  isHistoryLoading?: boolean;
  historyError?: string | null;
  isInputDisabled?: boolean;
  onSendMessage: (content: string) => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  isLoading,
  isHistoryLoading = false,
  historyError = null,
  isInputDisabled = false,
  onSendMessage,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Smooth scroll to bottom whenever messages change or loading state changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const hasActiveStreamingMessage = messages.some(
    (m) => m.role === 'assistant' && m.isStreaming
  );

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-slate-50/50">
      {/* Non-blocking history load warning banner */}
      {historyError && (
        <div
          role="alert"
          className="bg-amber-50 border-b border-amber-200 text-amber-800 px-4 py-2 text-xs sm:text-sm flex items-center justify-center gap-2"
        >
          <AlertTriangle size={15} className="text-amber-600 flex-shrink-0" />
          <span>{historyError}</span>
        </div>
      )}

      {/* Scrollable conversation area */}
      <div 
        className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 space-y-4 max-w-4xl w-full mx-auto"
        role="log"
        aria-label="Conversation history"
        aria-live="polite"
      >
        {isHistoryLoading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-gray-500 text-sm">
            <Loader2 size={18} className="animate-spin text-bank-600" />
            <span>Loading conversation history...</span>
          </div>
        ) : (
          messages.length > 0 ? messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            )) : (
              <div className="flex min-h-full items-center justify-center text-center text-sm text-gray-500">
                <p>Choose a conversation or start a new chat to begin.</p>
              </div>
            )
        )}

        {/* Show fallback loading indicator if loading but no streaming message placeholder exists */}
        {isLoading && !hasActiveStreamingMessage && !isHistoryLoading && <LoadingIndicator />}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} aria-hidden="true" />
      </div>

      {/* Fixed/Sticky input at the bottom */}
      <ChatInput onSendMessage={onSendMessage} isLoading={isLoading || isHistoryLoading || isInputDisabled} />
    </div>
  );
};

export default ChatWindow;
