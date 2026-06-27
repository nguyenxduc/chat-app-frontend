export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
}

export type ConversationType = 'direct' | 'group';

export interface Conversation {
  id: string;
  type?: ConversationType;
  title: string | null;
  participantIds: string[];
  createdBy?: string;
  directKey?: string | null;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
}

/**
 * Outgoing bubbles only (API-computed).
 * - `sent`: no recipient has `notifiedAt` yet.
 * - `delivered`: at least one recipient has `notifiedAt`, none has `readAt` yet.
 * - `read`: at least one recipient has `readAt`.
 */
export type MessageReceiptStatus = 'sent' | 'delivered' | 'read';

export interface MessageAttachment {
  mediaId: string;
  mimeType?: string;
  filename?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  attachments?: MessageAttachment[];
  reactions: {
    emoji: string;
    userId: string;
    createdAt: string;
  }[];
  receiptStatus?: MessageReceiptStatus;
}

export interface ApiClientContext {
  baseUrl: string;
  accessToken: string;
  userId: string;
}

export type UserServiceContext = {
  baseUrl: string;
  accessToken: string;
};

export type OpenDmLocationState = {
  pendingPeer: UserProfile;
};
