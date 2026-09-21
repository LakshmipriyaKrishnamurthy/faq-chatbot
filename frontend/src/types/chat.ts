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
  message: string;
}

export interface ChatResponse {
  session_id: string;
  response: string;
}

export interface BackendHistoryMessage {
  id: number | string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface ChatHistoryResponse {
  session_id: string;
  messages: BackendHistoryMessage[];
}
