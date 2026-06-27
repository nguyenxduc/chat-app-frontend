import { describe, expect, it } from 'vitest';

import { findDirectConversationId, getPeerId, isDirectConversation } from './conversationDisplay';
import type { Conversation } from './types';

const conv = (overrides: Partial<Conversation> = {}): Conversation => ({
  id: 'conv-1',
  title: null,
  participantIds: ['me', 'peer'],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  lastMessageAt: null,
  lastMessagePreview: null,
  ...overrides,
});

describe('conversationDisplay', () => {
  it('detects direct conversations', () => {
    expect(isDirectConversation(conv({ type: 'direct' }))).toBe(true);
    expect(isDirectConversation(conv({ type: 'group', participantIds: ['a', 'b', 'c'] }))).toBe(false);
  });

  it('finds peer id in a direct conversation', () => {
    expect(getPeerId(conv({ participantIds: ['me', 'peer'] }), 'me')).toBe('peer');
  });

  it('finds existing direct conversation id from cache', () => {
    const rows = [
      conv({ id: 'c1', participantIds: ['me', 'peer'] }),
      conv({ id: 'c2', type: 'group', participantIds: ['me', 'a', 'b'] }),
    ];
    expect(findDirectConversationId(rows, 'me', 'peer')).toBe('c1');
    expect(findDirectConversationId(rows, 'me', 'unknown')).toBeNull();
  });
});
