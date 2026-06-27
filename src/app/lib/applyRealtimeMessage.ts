import type { QueryClient } from '@tanstack/react-query';

import type { RealtimeMessageCreated } from './realtime';
import { conversationsQueryKey, messagesQueryKey } from './queryKeys';
import type { Conversation, Message } from './types';

/** Patch React Query cache immediately from a WebSocket push (no fetch round-trip). */
export function applyRealtimeMessage(
  queryClient: QueryClient,
  userId: string,
  payload: RealtimeMessageCreated,
): boolean {
  const { conversationId, messageId, senderId, bodyPreview, occurredAt } = payload;

  const optimistic: Message = {
    id: messageId,
    conversationId,
    senderId,
    body: bodyPreview,
    createdAt: occurredAt,
    reactions: [],
  };

  let messagesPatched = false;
  queryClient.setQueryData<Message[]>(messagesQueryKey(conversationId, userId), (prev) => {
    if (prev?.some((m) => m.id === messageId)) {
      messagesPatched = true;
      return prev;
    }
    messagesPatched = true;
    return [optimistic, ...(prev ?? [])];
  });

  let conversationsPatched = false;
  queryClient.setQueryData<Conversation[]>(conversationsQueryKey(userId), (prev) => {
    if (!prev) {
      return prev;
    }
    conversationsPatched = true;
    return prev.map((c) =>
      c.id === conversationId
        ? { ...c, lastMessageAt: occurredAt, lastMessagePreview: bodyPreview, updatedAt: occurredAt }
        : c,
    );
  });

  return messagesPatched || conversationsPatched;
}
