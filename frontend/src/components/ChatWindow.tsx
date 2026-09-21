import React, { useEffect, useRef } from 'react';
import { ChatMessage as ChatMessageType } from '../types/chat';
import ChatMessage from './ChatMessage';
import LoadingIndicator from './LoadingIndicator';
import ChatInput from './ChatInput';

interface ChatWindowProps {
  messages: ChatMessageType[];
  isLoading: boolean;
  onSendMessage: (content: string) => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  isLoading,
  onSendMessage,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Smooth scroll to bottom whenever messages change or loading state changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-slate-50/50">
      {/* Scrollable conversation area */}
      <div 
        className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 space-y-4 max-w-4xl w-full mx-auto"
        role="log"
        aria-label="Conversation history"
        aria-live="polite"
      >
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}

        {isLoading && <LoadingIndicator />}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} aria-hidden="true" />
      </div>

      {/* Fixed/Sticky input at the bottom */}
      <ChatInput onSendMessage={onSendMessage} isLoading={isLoading} />
    </div>
  );
};

export default ChatWindow;
