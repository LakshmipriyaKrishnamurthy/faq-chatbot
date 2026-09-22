import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, MessageSquare, PlusCircle } from 'lucide-react';
import { ChatMessage, Conversation } from '../types/chat';
import {
  createConversation,
  createSession,
  fetchChatHistory,
  fetchConversations,
  sendMessageStream,
} from '../services/chatService';
import ChatWindow from '../components/ChatWindow';

const SESSION_STORAGE_KEY = 'xyz_bank_chat_session_id';
const ACTIVE_CONVERSATION_STORAGE_KEY = 'xyz_bank_active_conversation_id';

function readStoredValue(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storeValue(key: string, value: string | null): void {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    // The chat still works when browser storage is unavailable.
  }
}

function toChatMessages(history: Awaited<ReturnType<typeof fetchChatHistory>>): ChatMessage[] {
  return history.map((message) => ({
    id: message.id,
    role: message.role,
    content: message.content,
    timestamp: message.created_at ? new Date(message.created_at).getTime() : Date.now(),
  }));
}

export const ChatPage: React.FC = () => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Create a backend session once; page refreshes reuse the stored ID.
  useEffect(() => {
    let isCurrent = true;
    const storedSessionId = readStoredValue(SESSION_STORAGE_KEY);

    if (storedSessionId) {
      setSessionId(storedSessionId);
      return () => { isCurrent = false; };
    }

    createSession()
      .then((newSessionId) => {
        if (!isCurrent) return;
        storeValue(SESSION_STORAGE_KEY, newSessionId);
        setSessionId(newSessionId);
      })
      .catch((error: unknown) => {
        if (!isCurrent) return;
        console.warn('[ChatPage] Failed to create session:', error);
        setHistoryError("Couldn't start a chat session. Please refresh and try again.");
        setIsHistoryLoading(false);
      });

    return () => { isCurrent = false; };
  }, []);

  // Populate the history panel, restore the saved conversation, or select the newest.
  useEffect(() => {
    if (!sessionId) return;

    let isCurrent = true;
    fetchConversations(sessionId)
      .then((nextConversations) => {
        if (!isCurrent) return;
        setConversations(nextConversations);
        if (nextConversations.length === 0) setIsHistoryLoading(false);
        setActiveConversationId((currentId) => {
          if (currentId && nextConversations.some((item) => item.conversation_id === currentId)) return currentId;
          const storedConversationId = readStoredValue(ACTIVE_CONVERSATION_STORAGE_KEY);
          if (storedConversationId && nextConversations.some((item) => item.conversation_id === storedConversationId)) return storedConversationId;
          return nextConversations[0]?.conversation_id ?? null;
        });
      })
      .catch((error: unknown) => {
        if (!isCurrent) return;
        console.warn('[ChatPage] Failed to load conversations:', error);
        setHistoryError("Couldn't load your conversations. Please refresh and try again.");
        setIsHistoryLoading(false);
      });

    return () => { isCurrent = false; };
  }, [sessionId]);

  useEffect(() => {
    storeValue(ACTIVE_CONVERSATION_STORAGE_KEY, activeConversationId);
  }, [activeConversationId]);

  // Selecting a conversation only loads messages; it does not send a chat request.
  useEffect(() => {
    if (!sessionId || !activeConversationId) {
      setMessages([]);
      setIsHistoryLoading(false);
      return;
    }

    let isCurrent = true;
    setIsHistoryLoading(true);
    setHistoryError(null);

    fetchChatHistory(sessionId, activeConversationId)
      .then((history) => {
        if (isCurrent) setMessages(toChatMessages(history));
      })
      .catch((error: unknown) => {
        if (!isCurrent) return;
        console.warn('[ChatPage] Failed to load conversation messages:', error);
        setMessages([]);
        setHistoryError("Couldn't load this conversation. Please try another one.");
      })
      .finally(() => {
        if (isCurrent) setIsHistoryLoading(false);
      });

    return () => { isCurrent = false; };
  }, [sessionId, activeConversationId]);

  const refreshConversations = useCallback(async () => {
    if (!sessionId) return;
    setConversations(await fetchConversations(sessionId));
  }, [sessionId]);

  const handleNewChat = useCallback(async () => {
    if (!sessionId || isLoading || isCreatingConversation) return;

    setIsCreatingConversation(true);
    setHistoryError(null);
    try {
      const conversation = await createConversation(sessionId);
      setMessages([]);
      setActiveConversationId(conversation.conversation_id);
      await refreshConversations();
    } catch (error: unknown) {
      console.warn('[ChatPage] Failed to create conversation:', error);
      setHistoryError("Couldn't create a new chat. Please try again.");
    } finally {
      setIsCreatingConversation(false);
    }
  }, [isCreatingConversation, isLoading, refreshConversations, sessionId]);

  const handleSelectConversation = useCallback((conversationId: string) => {
    if (isLoading || conversationId === activeConversationId) return;
    setMessages([]);
    setHistoryError(null);
    setActiveConversationId(conversationId);
  }, [activeConversationId, isLoading]);

  const handleSendMessage = useCallback(async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || isLoading || !sessionId || !activeConversationId) return;

    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: trimmed, timestamp: Date.now() };
    const assistantMessageId = crypto.randomUUID();
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    };

    setMessages((current) => [...current, userMessage, assistantMessage]);
    setIsLoading(true);

    try {
      await sendMessageStream(sessionId, activeConversationId, trimmed, (chunk) => {
        if (!chunk) return;
        setMessages((current) => current.map((message) => (
          message.id === assistantMessageId ? { ...message, content: message.content + chunk } : message
        )));
      });
      setMessages((current) => current.map((message) => (
        message.id === assistantMessageId ? { ...message, isStreaming: false } : message
      )));
    } catch (error: unknown) {
      const fallbackText = error instanceof Error ? error.message : "Sorry, I couldn't connect to the FAQ assistant. Please try again.";
      setMessages((current) => current.map((message) => (
        message.id === assistantMessageId
          ? { ...message, content: message.content || fallbackText, isError: true, isStreaming: false }
          : message
      )));
    } finally {
      setIsLoading(false);
      refreshConversations().catch((error: unknown) => console.warn('[ChatPage] Failed to refresh conversations:', error));
    }
  }, [activeConversationId, isLoading, refreshConversations, sessionId]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white text-gray-900 font-sans">
      <aside className="hidden w-64 flex-shrink-0 flex-col border-r border-gray-200 bg-gray-50/80 md:flex">
        <div className="flex h-16 items-center border-b border-gray-200 px-4">
          <Link to="/" className="flex items-center gap-3 rounded-lg p-1 focus:outline-none focus:ring-2 focus:ring-bank-500" title="Return to home page">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-bank-600 text-white shadow-sm"><Building2 size={20} /></div>
            <div className="flex flex-col"><span className="text-base font-bold leading-tight text-gray-900">XYZ Bank</span><span className="text-xs font-semibold leading-none text-bank-600">FAQ Assistant</span></div>
          </Link>
        </div>
        <div className="p-3">
          <button onClick={handleNewChat} type="button" disabled={!sessionId || isLoading || isCreatingConversation} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-bank-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:border-bank-300 hover:bg-bank-50 hover:text-bank-700 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-bank-500">
            <PlusCircle size={16} className="text-bank-600" />{isCreatingConversation ? 'Creating...' : 'New Chat'}
          </button>
        </div>
        <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-4" aria-label="Recent conversations">
          <p className="px-2 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Recent</p>
          <div className="space-y-1">
            {conversations.map((conversation) => (
              <button key={conversation.conversation_id} type="button" onClick={() => handleSelectConversation(conversation.conversation_id)} disabled={isLoading} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed ${activeConversationId === conversation.conversation_id ? 'bg-bank-100 font-medium text-bank-800' : 'text-gray-700 hover:bg-gray-100'}`} title={conversation.title}>
                <MessageSquare size={15} className="flex-shrink-0 text-bank-600" /><span className="truncate">{conversation.title}</span>
              </button>
            ))}
          </div>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm md:hidden">
          <Link to="/" className="flex items-center gap-3 rounded-lg p-1 focus:outline-none focus:ring-2 focus:ring-bank-500" title="Return to home page">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-bank-600 text-white shadow-sm"><Building2 size={20} /></div>
            <div className="flex flex-col"><span className="text-base font-bold leading-tight text-gray-900">XYZ Bank</span><span className="text-xs font-semibold leading-none text-bank-600">FAQ Assistant</span></div>
          </Link>
          <button onClick={handleNewChat} type="button" disabled={!sessionId || isLoading || isCreatingConversation} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-gray-50 px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-bank-50 disabled:cursor-not-allowed disabled:opacity-50">
            <PlusCircle size={16} className="text-bank-600" /><span>New Chat</span>
          </button>
        </header>
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <ChatWindow messages={messages} isLoading={isLoading} isHistoryLoading={isHistoryLoading} historyError={historyError} isInputDisabled={!sessionId || !activeConversationId || isCreatingConversation} onSendMessage={handleSendMessage} />
        </main>
      </div>
    </div>
  );
};

export default ChatPage;
