export interface ChatMessage {
  id: string | number;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
  isError?: boolean;
  isStreaming?: boolean;
}

export interface ChatRequest {
  session_id: string;
  conversation_id: string;
  message: string;
}

export interface ChatResponse {
  session_id: string;
  response: string;
}

export interface BackendHistoryMessage {
  id: number | string;
  conversation_id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface ChatHistoryResponse {
  session_id: string;
  conversation_id: string;
  messages: BackendHistoryMessage[];
}

export interface Conversation {
  conversation_id: string;
  session_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationListResponse {
  session_id: string;
  conversations: Conversation[];
}
