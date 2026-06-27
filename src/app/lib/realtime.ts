export type RealtimeMessageCreated = {
  messageId: string;
  conversationId: string;
  senderId: string;
  bodyPreview: string;
  occurredAt: string;
};

export type RealtimeMessageReceiptUpdated = {
  messageIds: string[];
  conversationId: string;
  recipientUserId: string;
  receiptStatus: 'delivered' | 'read';
  occurredAt: string;
};

export function getRealtimeUrl(): string | null {
  const url = import.meta.env.VITE_REALTIME_URL?.replace(/\/$/, '');
  return url || null;
}
