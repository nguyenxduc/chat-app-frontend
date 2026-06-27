import type { Conversation } from './types';

const PREFIX = 'chatapp.readAck.v1';

export const READ_ACK_EVENT = 'chatapp:read-ack';

export type ReadAck = {
  messageId: string;
  createdAt: string;
};

export function readAckKey(userId: string, conversationId: string): string {
  return `${PREFIX}:${userId}:${conversationId}`;
}

export function loadReadAck(userId: string, conversationId: string): ReadAck | null {
  try {
    const raw = sessionStorage.getItem(readAckKey(userId, conversationId));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as ReadAck;
    if (typeof parsed?.messageId === 'string' && typeof parsed?.createdAt === 'string') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveReadAck(userId: string, conversationId: string, ack: ReadAck): void {
  try {
    sessionStorage.setItem(readAckKey(userId, conversationId), JSON.stringify(ack));
  } catch {
    /* ignore quota / private mode */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(READ_ACK_EVENT, { detail: { userId, conversationId } }));
  }
}

function lastActivityMs(iso: string | null): number {
  if (!iso) {
    return 0;
  }
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : 0;
}

/** Use max(message, conversation.lastMessageAt) so list unread matches after server touched conv with same instant as message. */
export function readAckCreatedAtForSync(
  messageCreatedAt: string,
  conversationLastMessageAt: string | null | undefined,
): string {
  const m = lastActivityMs(messageCreatedAt);
  const c = lastActivityMs(conversationLastMessageAt ?? null);
  return new Date(Math.max(m, c)).toISOString();
}

/** Legacy rows may have `lastMessageAt` a few ms after the message `createdAt` because touch used `new Date()`. */
const READ_ACK_SLACK_MS = 2_000;

/** True when the thread has activity newer than the last time we marked read while viewing it. */
export function conversationHasUnread(
  viewerId: string,
  conversation: Pick<Conversation, 'id' | 'lastMessageAt'>,
): boolean {
  if (!conversation.lastMessageAt) {
    return false;
  }
  const ack = loadReadAck(viewerId, conversation.id);
  if (!ack) {
    return true;
  }
  return lastActivityMs(conversation.lastMessageAt) > lastActivityMs(ack.createdAt) + READ_ACK_SLACK_MS;
}
