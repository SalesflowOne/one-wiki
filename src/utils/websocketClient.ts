/**
 * One Wiki streaming client — HTTP/SSE based (Vercel-compatible).
 * Preserves the WebSocket-shaped API used by Ask.tsx.
 */

export const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
};

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  mode?: 'normal' | 'deep_research';
}

export interface ChatCompletionRequest {
  repo_url: string;
  messages: ChatMessage[];
  token?: string;
  type?: string;
  provider?: string;
  model?: string;
  language?: string;
  research_iteration?: number;
  excluded_dirs?: string;
  excluded_files?: string;
  owner?: string;
  repo?: string;
}

export interface CodemapCitation {
  file_path: string;
  start_line: number | null;
  end_line: number | null;
  snippet: string;
}

export interface CodemapStep {
  id: string;
  label: string;
  code: string;
  citation: CodemapCitation | null;
}

export interface CodemapSection {
  id: string;
  title: string;
  guide: string;
  diagram: string;
  steps: CodemapStep[];
}

export interface CodemapData {
  title: string;
  summary: string;
  sections: CodemapSection[];
}

export interface CodemapRequest {
  repo_url: string;
  question: string;
  token?: string;
  type?: string;
  provider?: string;
  model?: string;
  language?: string;
  excluded_dirs?: string;
  excluded_files?: string;
  owner?: string;
  repo?: string;
}

export type CodemapPhase = 'analyzing' | 'initial_codemap' | 'diagrams';

export type CodemapEvent =
  | { type: 'phase'; phase: CodemapPhase; status: 'start' | 'done'; [k: string]: unknown }
  | { type: 'codemap'; data: CodemapData }
  | { type: 'error'; message: string; stage?: string }
  | { type: 'done' };

export interface CodemapHandlers {
  onEvent: (event: CodemapEvent) => void;
  onError: (error: Event) => void;
  onClose: () => void;
}

type Handler = {
  onMessage?: (message: string) => void;
  onError?: (error: Event) => void;
  onClose?: () => void;
};

function createHttpStreamSocket(
  url: string,
  body: Record<string, unknown>,
  handlers: Handler,
): WebSocket {
  let closed = false;
  const socket = {
    get readyState() {
      return closed ? 3 : 1;
    },
    close: () => {
      closed = true;
      handlers.onClose?.();
    },
  } as unknown as WebSocket;

  (async () => {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok || !response.body) {
        throw new Error(`Stream failed (${response.status})`);
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (!closed) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (chunk) handlers.onMessage?.(chunk);
      }
      closed = true;
      handlers.onClose?.();
    } catch (err) {
      handlers.onError?.(err as Event);
      closed = true;
      handlers.onClose?.();
    }
  })();

  return socket;
}

export const createChatWebSocket = (
  request: ChatCompletionRequest,
  onMessage: (message: string) => void,
  onError: (error: Event) => void,
  onClose: () => void,
): WebSocket => {
  return createHttpStreamSocket('/api/chat/stream', request as unknown as Record<string, unknown>, {
    onMessage,
    onError,
    onClose,
  });
};

export const closeWebSocket = (ws: WebSocket | null): void => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.close();
  }
};

export const createCodemapWebSocket = (
  request: CodemapRequest,
  { onEvent, onError, onClose }: CodemapHandlers,
): WebSocket => {
  let buffer = '';
  const flush = (chunk: string, final = false) => {
    buffer += chunk;
    let idx: number;
    while ((idx = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!line) continue;
      try {
        onEvent(JSON.parse(line) as CodemapEvent);
      } catch (e) {
        console.error('Failed to parse codemap event', line, e);
      }
    }
    if (final && buffer.trim()) {
      try {
        onEvent(JSON.parse(buffer.trim()) as CodemapEvent);
      } catch {
        /* ignore */
      }
      buffer = '';
    }
  };

  return createHttpStreamSocket('/api/codemap/stream', request as unknown as Record<string, unknown>, {
    onMessage: (chunk) => flush(chunk),
    onError,
    onClose: () => {
      flush('', true);
      onClose();
    },
  });
};
