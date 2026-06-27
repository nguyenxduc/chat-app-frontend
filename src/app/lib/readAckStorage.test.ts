import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  conversationHasUnread,
  loadReadAck,
  readAckCreatedAtForSync,
  readAckKey,
  saveReadAck,
} from './readAckStorage';

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const CONV_ID = '660e8400-e29b-41d4-a716-446655440001';

describe('readAckKey', () => {
  it('scopes storage by user and conversation', () => {
    expect(readAckKey(USER_ID, CONV_ID)).toContain(USER_ID);
    expect(readAckKey(USER_ID, CONV_ID)).toContain(CONV_ID);
  });
});

describe('loadReadAck / saveReadAck', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('round-trips a valid ack', () => {
    const ack = { messageId: 'msg-1', createdAt: '2026-01-01T00:00:00.000Z' };
    saveReadAck(USER_ID, CONV_ID, ack);
    expect(loadReadAck(USER_ID, CONV_ID)).toEqual(ack);
  });

  it('returns null for corrupted storage', () => {
    sessionStorage.setItem(readAckKey(USER_ID, CONV_ID), '{bad json');
    expect(loadReadAck(USER_ID, CONV_ID)).toBeNull();
  });
});

describe('readAckCreatedAtForSync', () => {
  it('uses the later of message and conversation activity', () => {
    const messageAt = '2026-01-01T00:00:00.000Z';
    const convAt = '2026-01-01T00:00:01.000Z';
    expect(readAckCreatedAtForSync(messageAt, convAt)).toBe(convAt);
    expect(readAckCreatedAtForSync(convAt, messageAt)).toBe(convAt);
  });
});

describe('conversationHasUnread', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('returns false when there is no last activity', () => {
    expect(conversationHasUnread(USER_ID, { id: CONV_ID, lastMessageAt: null })).toBe(false);
  });

  it('returns true when conversation is newer than saved ack', () => {
    saveReadAck(USER_ID, CONV_ID, {
      messageId: 'old',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    expect(
      conversationHasUnread(USER_ID, {
        id: CONV_ID,
        lastMessageAt: '2026-01-02T00:00:00.000Z',
      }),
    ).toBe(true);
  });

  it('returns false when ack covers recent activity within slack', () => {
    saveReadAck(USER_ID, CONV_ID, {
      messageId: 'm1',
      createdAt: '2026-01-01T00:00:01.500Z',
    });
    expect(
      conversationHasUnread(USER_ID, {
        id: CONV_ID,
        lastMessageAt: '2026-01-01T00:00:01.000Z',
      }),
    ).toBe(false);
  });
});
