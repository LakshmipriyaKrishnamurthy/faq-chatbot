import { BackendHistoryMessage, ChatHistoryResponse } from '../types/chat';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/+$/, '');
const DEFAULT_ERROR_MESSAGE = "Sorry, I couldn't connect to the FAQ assistant. Please try again.";

export interface ChatRequestPayload {
  session_id: string;
  message: string;
}

/**
 * Parses raw SSE content and extracts the clean display string.
 */
function extractCleanText(rawContent: string): string {
  try {
    const parsed = JSON.parse(rawContent);

    // 1. Check for server-sent errors
    if (parsed.error) {
      throw new Error(parsed.error);
    }

    // 2. Matches {"text": "Fund switching is..."}
    if (typeof parsed.text === 'string') {
      return parsed.text;
    }

    // 3. Matches {"response": {"text": "Fund switching is..."}}
    if (parsed.response && typeof parsed.response.text === 'string') {
      return parsed.response.text;
    }
  } catch (err: unknown) {
    // If it's an explicit error we rethrow it
    if (err instanceof Error && err.message !== DEFAULT_ERROR_MESSAGE && !err.message.includes('JSON')) {
      throw err;
    }
  }

  // If not valid JSON, return as plain text
  return rawContent;
}

/**
 * Sends a chat message to POST /chat and consumes the SSE stream via response.body.getReader().
 */
export async function sendMessageStream(
  sessionId: string,
  message: string,
  onChunk: (chunk: string) => void
): Promise<string> {
  const endpoint = `${API_BASE_URL}/chat`;

  const payload: ChatRequestPayload = {
    session_id: sessionId,
    message: message.trim(),
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok || !response.body) {
    const errorBody = await response.text().catch(() => '');
    console.error(`[chatService] HTTP ${response.status} from ${endpoint}:`, errorBody);
    throw new Error(DEFAULT_ERROR_MESSAGE);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let fullResponse = '';
  let streamBuffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      streamBuffer += decoder.decode(value, { stream: true });

      // Split SSE events separated by double newlines (\n\n or \r\n\r\n)
      const frames = streamBuffer.split(/\r?\n\r?\n/);
      streamBuffer = frames.pop() ?? '';

      for (const frame of frames) {
        const trimmed = frame.trim();
        if (!trimmed || trimmed.startsWith(':')) continue;

        // An SSE event may contain one or multiple lines
        const lines = trimmed.split(/\r?\n/);
        for (const line of lines) {
          const lineTrimmed = line.trim();
          if (!lineTrimmed || lineTrimmed.startsWith(':')) continue;

          if (lineTrimmed.startsWith('data:')) {
            const rawContent = lineTrimmed.slice(5).trim();

            if (rawContent === '[DONE]') {
              return fullResponse;
            }

            const displayText = extractCleanText(rawContent);

            if (displayText) {
              fullResponse += displayText;
              onChunk(displayText);
            }
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (!fullResponse.trim()) {
    throw new Error(DEFAULT_ERROR_MESSAGE);
  }

  return fullResponse;
}

/**
 * Fetches conversation history for a given session ID from GET /chat/history/{session_id}.
 */
export async function fetchChatHistory(sessionId: string): Promise<BackendHistoryMessage[]> {
  const endpoint = `${API_BASE_URL}/chat/history/${encodeURIComponent(sessionId)}`;

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load chat history (HTTP ${response.status})`);
  }

  const data: ChatHistoryResponse = await response.json();
  return data.messages || [];
}

/**
 * Deletes conversation on the backend for a given session ID via DELETE /chat/{session_id}.
 */
export async function deleteChatSession(sessionId: string): Promise<void> {
  const endpoint = `${API_BASE_URL}/chat/${encodeURIComponent(sessionId)}`;

  const response = await fetch(endpoint, {
    method: 'DELETE',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    console.warn(`[chatService] Failed to delete session ${sessionId}: HTTP ${response.status}`);
  }
}