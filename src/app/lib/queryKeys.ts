export const conversationsQueryKey = (userId: string | null) => ['conversations', userId] as const;

export const messagesQueryKey = (conversationId: string | undefined, userId: string | null) =>
  ['messages', conversationId, userId] as const;

export const userProfileQueryKey = (userId: string) => ['user-profile', userId] as const;
