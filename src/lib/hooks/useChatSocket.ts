'use client';

import { useEffect, useRef } from 'react';

import { STATIC_BASE } from '@/lib/api/client';
import { useAuthStore } from '@/lib/stores/auth-store';
import type { Message } from '@/lib/api/messages';

/**
 * Wire format of server → client events. Mirrors the spec in
 * backend/app/routes/messages.py.
 */
export type ChatEvent =
  | { type: 'hello'; user_id: number }
  | { type: 'message:new'; conversation_id: number; message: Message }
  | { type: 'message:updated'; conversation_id: number; message: Message }
  | { type: 'message:deleted'; conversation_id: number; message: Message }
  | { type: 'message:read'; conversation_id: number; reader_id: number }
  | { type: 'conversation:new'; conversation_id: number }
  | { type: 'conversation:updated'; conversation_id: number }
  | { type: 'notification:new' };

interface ChatSocketOptions {
  /** Called for every event. Stable reference recommended (useCallback). */
  onEvent: (event: ChatEvent) => void;
  /** Set false to keep the socket closed (e.g. logged out). */
  enabled?: boolean;
}

/**
 * Maintains a single WebSocket to /api/messages/ws for the current user
 * with auto-reconnect on disconnect. The hook accepts an onEvent callback
 * so callers can dispatch into their own state without us touching the
 * query cache directly.
 *
 * Reconnect strategy is intentionally simple: exponential backoff capped
 * at 30s. Page navigation closes the socket via the cleanup, and the next
 * mount opens a fresh one.
 */
export function useChatSocket({ onEvent, enabled = true }: ChatSocketOptions) {
  // Latest callback in a ref so the effect doesn't tear down on every
  // re-render of the component that owns the handler.
  const handlerRef = useRef(onEvent);
  useEffect(() => {
    handlerRef.current = onEvent;
  }, [onEvent]);

  const token = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!enabled || !token) return;

    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let backoff = 1000; // ms
    let closedByUs = false;

    // STATIC_BASE is http(s)://host; flip to ws(s)://host for the URL.
    const wsBase = STATIC_BASE.replace(/^http/, 'ws');
    const url = `${wsBase}/api/messages/ws?token=${encodeURIComponent(token)}`;

    const connect = () => {
      ws = new WebSocket(url);

      ws.onopen = () => {
        backoff = 1000; // Reset on successful connect.
      };

      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data) as ChatEvent;
          handlerRef.current(data);
        } catch {
          // Malformed payload — server bug, not the client's problem.
        }
      };

      ws.onclose = () => {
        if (closedByUs) return;
        reconnectTimer = setTimeout(connect, backoff);
        backoff = Math.min(backoff * 2, 30_000);
      };

      ws.onerror = () => {
        // onclose will fire next and handle reconnect.
      };
    };

    connect();

    return () => {
      closedByUs = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [enabled, token]);
}
