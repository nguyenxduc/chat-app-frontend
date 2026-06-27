import type { UserProfile, UserServiceContext } from './types';

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
      } else if (typeof body.message === 'string') {
        detail = body.message;
      }
    } catch {
      /* ignore */
    }
    throw new Error(detail || `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

export function getUserServiceConfig(): { baseUrl: string } | null {
  const gatewayUrl = import.meta.env.VITE_GATEWAY_URL?.replace(/\/$/, '');
  if (!gatewayUrl) {
    return null;
  }
  return { baseUrl: `${gatewayUrl}/api/users` };
}

export async function searchUsers(
  ctx: UserServiceContext,
  params: { query: string; limit?: number; exclude?: string[] },
): Promise<UserProfile[]> {
  const qs = new URLSearchParams({ query: params.query });
  if (params.limit != null) {
    qs.set('limit', String(params.limit));
  }
  for (const id of params.exclude ?? []) {
    qs.append('exclude', id);
  }

  const res = await fetch(`${ctx.baseUrl}/search?${qs.toString()}`, {
    headers: { Authorization: `Bearer ${ctx.accessToken}` },
  });
  const json = await handle<{ data: UserProfile[] }>(res);
  return json.data;
}

export async function getUser(ctx: UserServiceContext, id: string): Promise<UserProfile> {
  const res = await fetch(`${ctx.baseUrl}/${id}`, {
    headers: { Authorization: `Bearer ${ctx.accessToken}` },
  });
  const json = await handle<{ data: UserProfile }>(res);
  return json.data;
}
