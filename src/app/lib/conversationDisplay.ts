import type { Conversation } from './types';

export function isDirectConversation(c: Conversation): boolean {
  if (c.type === 'group') {
    return false;
  }
  if (c.type === 'direct') {
    return true;
  }
  return c.participantIds.length === 2;
}

export function getPeerId(c: Conversation, selfId: string): string | null {
  if (!isDirectConversation(c)) {
    return null;
  }
  const others = c.participantIds.filter((id) => id !== selfId);
  return others.length === 1 ? others[0]! : null;
}

export function findDirectConversationId(
  conversations: Conversation[] | undefined,
  selfId: string,
  peerId: string,
): string | null {
  if (!conversations) {
    return null;
  }
  for (const c of conversations) {
    if (!isDirectConversation(c)) {
      continue;
    }
    const ids = new Set(c.participantIds);
    if (ids.size === 2 && ids.has(selfId) && ids.has(peerId)) {
      return c.id;
    }
  }
  return null;
}
