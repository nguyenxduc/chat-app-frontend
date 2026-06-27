export interface MultimediaMeta {
  id: string;
  conversationId: string;
  mimeType: string;
  size: number;
  originalFilename: string;
  ownerUserId: string | null;
  createdAt: string;
}

export function getMultimediaConfig(): { baseUrl: string } | null {
  const gatewayUrl = import.meta.env.VITE_GATEWAY_URL?.replace(/\/$/, '');
  if (!gatewayUrl) {
    return null;
  }
  return { baseUrl: `${gatewayUrl}/api/media` };
}

export async function uploadMedia(
  ctx: { baseUrl: string; accessToken: string },
  conversationId: string,
  file: File,
): Promise<MultimediaMeta> {
  const form = new FormData();
  form.append('file', file, file.name);

  const res = await fetch(ctx.baseUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ctx.accessToken}`,
      'x-conversation-id': conversationId,
    },
    body: form,
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = (await res.json()) as { message?: string };
      if (body.message) {
        detail = body.message;
      }
    } catch {
      /* ignore */
    }
    throw new Error(detail || `Upload failed (${res.status})`);
  }

  const json = (await res.json()) as { data: MultimediaMeta };
  return json.data;
}

export async function fetchMediaBlob(
  ctx: { baseUrl: string; accessToken: string },
  mediaId: string,
): Promise<Blob> {
  const res = await fetch(`${ctx.baseUrl}/${mediaId}`, {
    headers: { Authorization: `Bearer ${ctx.accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Failed to load media (${res.status})`);
  }
  return res.blob();
}
