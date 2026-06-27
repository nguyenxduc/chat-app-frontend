import type { QueryClient } from '@tanstack/react-query';

import { createConversation, getConversation } from './api';
import { findDirectConversationId } from './conversationDisplay';
import { conversationsQueryKey } from './queryKeys';
import type { ApiClientContext, Conversation } from './types';

export async function openDirectConversation(
  ctx: ApiClientContext,
  peerId: string,
  queryClient: QueryClient,
): Promise<Conversation> {
  const cached = queryClient.getQueryData<Conversation[]>(conversationsQueryKey(ctx.userId));
  const existingId = findDirectConversationId(cached, ctx.userId, peerId);
  if (existingId) {
    return getConversation(ctx, existingId);
  }

  const conversation = await createConversation(ctx, {
    type: 'direct',
    participantIds: [peerId],
  });
  void queryClient.invalidateQueries({ queryKey: conversationsQueryKey(ctx.userId) });
  return conversation;
}
