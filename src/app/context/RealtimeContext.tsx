import { focusManager, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';

import { useAuth } from './AuthContext';
import { applyRealtimeMessage } from '../lib/applyRealtimeMessage';
import { applyRealtimeReceipt } from '../lib/applyRealtimeReceipt';
import { getApiConfig, listConversations, listMessages, markMessagesNotifyReceived } from '../lib/api';
import { getRealtimeUrl, type RealtimeMessageCreated, type RealtimeMessageReceiptUpdated } from '../lib/realtime';
import { conversationsQueryKey, messagesQueryKey } from '../lib/queryKeys';
import { isValidUserId } from '../lib/userId';

type RealtimeContextValue = {
  connected: boolean;
  /** Bumps on each push so hooks re-render even if the browser defers query notifications. */
  pushSeq: number;
};

const RealtimeContext = createContext<RealtimeContextValue>({ connected: false, pushSeq: 0 });

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { userId, accessToken } = useAuth();
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);
  const [pushSeq, setPushSeq] = useState(0);
  const syncTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const realtimeUrl = useMemo(() => getRealtimeUrl(), []);

  useEffect(() => {
    if (!realtimeUrl || !userId || !isValidUserId(userId)) {
      setConnected(false);
      return;
    }

    let cancelled = false;

    const socket: Socket = io(realtimeUrl, {
      path: '/events',
      auth: { userId },
      transports: ['websocket'],
    });

    const scheduleFullSync = (conversationId: string) => {
      const timers = syncTimersRef.current;
      const existing = timers.get(conversationId);
      if (existing) {
        clearTimeout(existing);
      }
      timers.set(
        conversationId,
        setTimeout(() => {
          timers.delete(conversationId);
          void fullSync(conversationId);
        }, 1500),
      );
    };

    const fullSync = async (conversationId: string) => {
      const api = getApiConfig();
      if (!api || !accessToken || !isValidUserId(userId)) {
        return;
      }
      const ctx = { baseUrl: api.baseUrl, accessToken, userId };
      try {
        const [messages, conversations] = await Promise.all([
          listMessages(ctx, conversationId, { limit: 80 }),
          listConversations(ctx),
        ]);
        queryClient.setQueryData(messagesQueryKey(conversationId, userId), messages);
        queryClient.setQueryData(conversationsQueryKey(userId), conversations);
      } catch {
        /* optimistic patch already shown */
      }
    };

    const onMessageCreated = (payload: RealtimeMessageCreated) => {
      const patched = applyRealtimeMessage(queryClient, userId, payload);
      setPushSeq((n) => n + 1);

      const api = getApiConfig();
      if (api && accessToken && isValidUserId(userId) && payload.senderId !== userId) {
        void markMessagesNotifyReceived(
          { baseUrl: api.baseUrl, accessToken, userId },
          payload.conversationId,
          [payload.messageId],
        ).catch(() => {});
      }

      if (!patched) {
        void fullSync(payload.conversationId);
      } else {
        scheduleFullSync(payload.conversationId);
      }
    };

    const onMessageReceiptUpdated = (payload: RealtimeMessageReceiptUpdated) => {
      const patched = applyRealtimeReceipt(queryClient, userId, payload);
      if (patched) {
        setPushSeq((n) => n + 1);
      }
    };

    const onConnect = () => {
      if (cancelled) {
        socket.disconnect();
        return;
      }
      setConnected(true);
    };
    const onDisconnect = () => setConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('message.created', onMessageCreated);
    socket.on('message.receipt.updated', onMessageReceiptUpdated);

    return () => {
      cancelled = true;
      for (const timer of syncTimersRef.current.values()) {
        clearTimeout(timer);
      }
      syncTimersRef.current.clear();
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('message.created', onMessageCreated);
      socket.off('message.receipt.updated', onMessageReceiptUpdated);
      socket.disconnect();
      setConnected(false);
    };
  }, [realtimeUrl, userId, accessToken, queryClient]);

  const value = useMemo(() => ({ connected, pushSeq }), [connected, pushSeq]);

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime(): RealtimeContextValue {
  return useContext(RealtimeContext);
}

/** Keep TanStack Query active in background tabs (Messenger-style). */
export function configureChatFocusManager(): void {
  focusManager.setEventListener((setFocused) => {
    const markFocused = () => setFocused(true);
    if (typeof window === 'undefined') {
      setFocused(true);
      return;
    }
    window.addEventListener('visibilitychange', markFocused, true);
    window.addEventListener('focus', markFocused, true);
    window.addEventListener('blur', markFocused, true);
    markFocused();
    return () => {
      window.removeEventListener('visibilitychange', markFocused, true);
      window.removeEventListener('focus', markFocused, true);
      window.removeEventListener('blur', markFocused, true);
    };
  });
}
