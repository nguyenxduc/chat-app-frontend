import type { ApiClientContext, Conversation, Message, MessageAttachment } from './types';

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = (await res.json()) as {
        message?: string;
        details?: { issues?: { path: string; message: string }[] };
      };
      if (body.details?.issues?.length) {
        detail = body.details.issues.map((i) => `${i.path}: ${i.message}`).join('; ');
      } else if (typeof body?.message === 'string') {
        detail = body.message;
      }
    } catch {
      /* ignore */
    }
    throw new Error(detail || `Request failed (${res.status})`);
  }
  return parseJson<T>(res);
}

async function handleNoContent(res: Response): Promise<void> {
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = (await res.json()) as { message?: string };
      if (typeof body?.message === 'string') {
        detail = body.message;
      }
    } catch {
      /* ignore */
    }
    throw new Error(detail || `Request failed (${res.status})`);
  }
}

function authHeaders(ctx: ApiClientContext): Record<string, string> {
  return { Authorization: `Bearer ${ctx.accessToken}` };
}

function getGatewayUrl(): string | null {
  const url = import.meta.env.VITE_GATEWAY_URL?.replace(/\/$/, '');
  return url || null;
}

// ctx.baseUrl points at `${gateway}/api/conversations` (see getApiConfig below)
// — paths here are relative to that. Do not prepend "conversations" again or
// the gateway forwards "/conversations/conversations" to chat-service, which
// misreads the extra segment as a conversation id.
export async function listConversations(ctx: ApiClientContext): Promise<Conversation[]> {
  const res = await fetch(ctx.baseUrl, { headers: authHeaders(ctx) });
  const json = await handle<{ data: Conversation[] }>(res);
  return json.data;
}

export async function getConversation(ctx: ApiClientContext, id: string): Promise<Conversation> {
  const res = await fetch(`${ctx.baseUrl}/${id}`, { headers: authHeaders(ctx) });
  const json = await handle<{ data: Conversation }>(res);
  return json.data;
}

export async function createConversation(
  ctx: ApiClientContext,
  input: { title?: string; participantIds: string[]; type?: 'direct' | 'group' },
): Promise<Conversation> {
  const res = await fetch(ctx.baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(ctx) },
    body: JSON.stringify(input),
  });
  const json = await handle<{ data: Conversation }>(res);
  return json.data;
}

export async function listMessages(
  ctx: ApiClientContext,
  conversationId: string,
  options: { limit?: number } = {},
): Promise<Message[]> {
  const qs = new URLSearchParams();
  if (options.limit != null) {
    qs.set('limit', String(options.limit));
  }
  const q = qs.toString();
  const res = await fetch(`${ctx.baseUrl}/${conversationId}/messages${q ? `?${q}` : ''}`, {
    headers: authHeaders(ctx),
  });
  const json = await handle<{ data: Message[] }>(res);
  return json.data;
}

export async function sendMessage(
  ctx: ApiClientContext,
  conversationId: string,
  input: { body: string; attachments?: MessageAttachment[] },
): Promise<Message> {
  const res = await fetch(`${ctx.baseUrl}/${conversationId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(ctx) },
    body: JSON.stringify({
      body: input.body,
      ...(input.attachments?.length ? { attachments: input.attachments } : {}),
    }),
  });
  const json = await handle<{ data: Message }>(res);
  return json.data;
}

// Presence is a sibling top-level route on chat-service (not nested under
// /conversations), proxied separately by the gateway at /api/presence.
export async function postPresence(ctx: ApiClientContext): Promise<void> {
  const gatewayUrl = getGatewayUrl();
  if (!gatewayUrl) {
    return;
  }
  const res = await fetch(`${gatewayUrl}/api/presence`, {
    method: 'POST',
    headers: authHeaders(ctx),
  });
  await handleNoContent(res);
}

export async function deletePresence(ctx: ApiClientContext): Promise<void> {
  const gatewayUrl = getGatewayUrl();
  if (!gatewayUrl) {
    return;
  }
  const res = await fetch(`${gatewayUrl}/api/presence`, {
    method: 'DELETE',
    headers: authHeaders(ctx),
  });
  await handleNoContent(res);
}

export async function markMessagesDelivered(
  ctx: ApiClientContext,
  conversationId: string,
  messageIds: string[],
): Promise<void> {
  const res = await fetch(`${ctx.baseUrl}/${conversationId}/receipts/delivered`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(ctx) },
    body: JSON.stringify({ messageIds }),
  });
  await handleNoContent(res);
}

export async function markMessagesNotifyReceived(
  ctx: ApiClientContext,
  conversationId: string,
  messageIds: string[],
): Promise<void> {
  const res = await fetch(`${ctx.baseUrl}/${conversationId}/receipts/notify-received`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(ctx) },
    body: JSON.stringify({ messageIds }),
  });
  await handleNoContent(res);
}

export async function markMessagesRead(
  ctx: ApiClientContext,
  conversationId: string,
  lastReadMessageId: string,
): Promise<void> {
  const res = await fetch(`${ctx.baseUrl}/${conversationId}/receipts/read`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(ctx) },
    body: JSON.stringify({ lastReadMessageId }),
  });
  await handleNoContent(res);
}

export function getApiConfig(): { baseUrl: string } | null {
  const gatewayUrl = getGatewayUrl();
  if (!gatewayUrl) {
    return null;
  }
  return { baseUrl: `${gatewayUrl}/api/conversations` };
}
