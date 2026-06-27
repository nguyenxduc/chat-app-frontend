import type { QueryClient } from '@tanstack/react-query';

import type { RealtimeMessageReceiptUpdated } from './realtime';
import { messagesQueryKey } from './queryKeys';
import type { Message, MessageReceiptStatus } from './types';

const mergeReceiptStatus = (
  current: MessageReceiptStatus | undefined,
  update: 'delivered' | 'read',
): MessageReceiptStatus => {
  if (update === 'read') {
    return 'read';
  }
  if (current === 'read') {
    return 'read';
  }
  if (update === 'delivered') {
    return 'delivered';
  }
  return current ?? 'sent';
};

/** Patch outgoing message ticks from a WebSocket push (no fetch round-trip). */
export function applyRealtimeReceipt(
  queryClient: QueryClient,
  userId: string,
  payload: RealtimeMessageReceiptUpdated,
): boolean {
  const { conversationId, messageIds, receiptStatus } = payload;
  const idSet = new Set(messageIds);
  let patched = false;

  queryClient.setQueryData<Message[]>(messagesQueryKey(conversationId, userId), (prev) => {
    if (!prev?.length) {
      return prev;
    }
    let changed = false;
    const next = prev.map((m) => {
      if (m.senderId !== userId || !idSet.has(m.id)) {
        return m;
      }
      const nextStatus = mergeReceiptStatus(m.receiptStatus, receiptStatus);
      if (nextStatus === m.receiptStatus) {
        return m;
      }
      changed = true;
      return { ...m, receiptStatus: nextStatus };
    });
    if (changed) {
      patched = true;
      return next;
    }
    return prev;
  });

  return patched;
}

export { mergeReceiptStatus };
