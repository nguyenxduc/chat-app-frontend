import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';

import { applyRealtimeReceipt, mergeReceiptStatus } from './applyRealtimeReceipt';
import type { Message } from './types';

describe('mergeReceiptStatus', () => {
  it('upgrades sent to delivered', () => {
    expect(mergeReceiptStatus('sent', 'delivered')).toBe('delivered');
  });

  it('upgrades delivered to read', () => {
    expect(mergeReceiptStatus('delivered', 'read')).toBe('read');
  });

  it('never downgrades read to delivered', () => {
    expect(mergeReceiptStatus('read', 'delivered')).toBe('read');
  });
});

describe('applyRealtimeReceipt', () => {
  it('patches receiptStatus on outgoing messages only', () => {
    const queryClient = new QueryClient();
    const userId = 'alice';
    const convId = 'conv-1';
    const messages: Message[] = [
      {
        id: 'm1',
        conversationId: convId,
        senderId: userId,
        body: 'hi',
        createdAt: '2026-01-01T00:00:00.000Z',
        reactions: [],
        receiptStatus: 'sent',
      },
      {
        id: 'm2',
        conversationId: convId,
        senderId: 'bob',
        body: 'hey',
        createdAt: '2026-01-01T00:01:00.000Z',
        reactions: [],
      },
    ];
    queryClient.setQueryData(['messages', convId, userId], messages);

    const patched = applyRealtimeReceipt(queryClient, userId, {
      messageIds: ['m1'],
      conversationId: convId,
      recipientUserId: 'bob',
      receiptStatus: 'read',
      occurredAt: '2026-01-01T00:02:00.000Z',
    });

    expect(patched).toBe(true);
    const updated = queryClient.getQueryData<Message[]>(['messages', convId, userId]);
    expect(updated?.[0]?.receiptStatus).toBe('read');
    expect(updated?.[1]?.receiptStatus).toBeUndefined();
  });

  it('returns false when cache is empty', () => {
    const queryClient = new QueryClient();
    const patched = applyRealtimeReceipt(queryClient, 'alice', {
      messageIds: ['m1'],
      conversationId: 'conv-1',
      recipientUserId: 'bob',
      receiptStatus: 'delivered',
      occurredAt: '2026-01-01T00:00:00.000Z',
    });
    expect(patched).toBe(false);
  });
});
