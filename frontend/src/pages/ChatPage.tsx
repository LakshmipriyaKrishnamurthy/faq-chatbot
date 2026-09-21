import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Building2, PlusCircle } from 'lucide-react';
import { ChatMessage } from '../types/chat';
import { sendMessageStream } from '../services/chatService';
import ChatWindow from '../components/ChatWindow';

const INITIAL_WELCOME_CONTENT = "Hi! I'm the XYZ Bank FAQ Assistant. How can I help you today?";

export const ChatPage: React.FC = () => {
  const [sessionId, setSessionId] = useState<string>(() => crypto.randomUUID());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: INITIAL_WELCOME_CONTENT,
      timestamp: Date.now(),
    },
  ]);

  const handleNewChat = useCallback(() => {
    setSessionId(crypto.randomUUID());
    setIsLoading(false);
    setMessages([
      {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: INITIAL_WELCOME_CONTENT,
        timestamp: Date.now(),
      },
    ]);
  }, []);

  const handleSendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || isLoading) return;

      const userMsgId = crypto.randomUUID();
      const botMsgId = crypto.randomUUID();

      const userMessage: ChatMessage = {
        id: userMsgId,
        role: 'user',
        content: trimmed,
        timestamp: Date.now(),
      };

      // 1. Display ONLY the user message. Let isLoading show the typing indicator bubble.
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      let isFirstChunk = true;

      try {
        await sendMessageStream(sessionId, trimmed, (chunk: string) => {
          if (!chunk) return;

          // 2. On the first arriving chunk: turn off the typing bubble and insert the real bot message
          if (isFirstChunk) {
            isFirstChunk = false;
            setIsLoading(false);

            setMessages((prev) => [
              ...prev,
              {
                id: botMsgId,
                role: 'assistant',
                content: chunk,
                timestamp: Date.now(),
              },
            ]);
          } else {
            // Subsequent chunks: append text to the existing bot message
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === botMsgId
                  ? { ...msg, content: msg.content + chunk }
                  : msg
              )
            );
          }
        });
      } catch (error: unknown) {
        const fallbackText =
          error instanceof Error
            ? error.message
            : "Sorry, I couldn't connect to the FAQ assistant. Please try again.";

        // If an error occurred before any text streamed, append the error bubble now
        if (isFirstChunk) {
          setMessages((prev) => [
            ...prev,
            {
              id: botMsgId,
              role: 'assistant',
              content: fallbackText,
              timestamp: Date.now(),
              isError: true,
            },
          ]);
        } else {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === botMsgId
                ? { ...msg, content: fallbackText, isError: true }
                : msg
            )
          );
        }
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId, isLoading]
  );

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-white text-gray-900 font-sans">
      {/* Top Navigation Bar */}
      <header className="h-16 border-b border-gray-200 bg-white px-4 sm:px-6 flex items-center justify-between flex-shrink-0 z-10 shadow-sm">
        <Link
          to="/"
          className="flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-bank-500 rounded-lg p-1 group"
          title="Return to home page"
        >
          <div className="w-9 h-9 rounded-lg bg-bank-600 text-white flex items-center justify-center shadow-sm group-hover:bg-bank-700 transition-colors">
            <Building2 size={20} />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base text-gray-900 leading-tight">XYZ Bank</span>
            <span className="text-xs font-semibold text-bank-600 leading-none">FAQ Assistant</span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <button
            onClick={handleNewChat}
            type="button"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-gray-700 hover:text-bank-700 bg-gray-50 hover:bg-bank-50 border border-gray-300 hover:border-bank-200 rounded-lg shadow-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-bank-500 focus:ring-offset-1 active:scale-95"
            aria-label="Start a new chat conversation"
          >
            <PlusCircle size={16} className="text-bank-600" />
            <span className="hidden xs:inline">New Chat</span>
          </button>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <ChatWindow
          messages={messages}
          isLoading={isLoading}
          onSendMessage={handleSendMessage}
        />
      </main>
    </div>
  );
};

export default ChatPage;