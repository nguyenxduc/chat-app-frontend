import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';

import { applyRealtimeMessage } from './applyRealtimeMessage';
import { conversationsQueryKey } from './queryKeys';
import type { Conversation, Message } from './types';

describe('applyRealtimeMessage', () => {
  it('prepends a message and updates conversation preview', () => {
    const queryClient = new QueryClient();
    const userId = 'user-a';
    const convId = 'conv-1';
    const existing: Message = {
      id: 'm1',
      conversationId: convId,
      senderId: 'user-b',
      body: 'old',
      createdAt: '2026-01-01T00:00:00.000Z',
      reactions: [],
    };
    queryClient.setQueryData(['messages', convId, userId], [existing]);
    queryClient.setQueryData<Conversation[]>(conversationsQueryKey(userId), [
      {
        id: convId,
        title: null,
        participantIds: [userId, 'user-b'],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        lastMessageAt: existing.createdAt,
        lastMessagePreview: existing.body,
      },
    ]);

    applyRealtimeMessage(queryClient, userId, {
      messageId: 'm2',
      conversationId: convId,
      senderId: 'user-b',
      bodyPreview: 'new',
      occurredAt: '2026-01-02T00:00:00.000Z',
    });

    const messages = queryClient.getQueryData<Message[]>(['messages', convId, userId]);
    expect(messages?.map((m) => m.id)).toEqual(['m2', 'm1']);
    expect(messages?.[0]?.body).toBe('new');

    const conversations = queryClient.getQueryData<Conversation[]>(conversationsQueryKey(userId));
    expect(conversations?.[0]?.lastMessagePreview).toBe('new');
  });

  it('seeds messages cache when empty', () => {
    const queryClient = new QueryClient();
    const userId = 'user-a';
    const convId = 'conv-1';

    const patched = applyRealtimeMessage(queryClient, userId, {
      messageId: 'm1',
      conversationId: convId,
      senderId: 'user-b',
      bodyPreview: 'hi',
      occurredAt: '2026-01-01T00:00:00.000Z',
    });

    expect(patched).toBe(true);
    expect(queryClient.getQueryData<Message[]>(['messages', convId, userId])).toHaveLength(1);
  });
});
