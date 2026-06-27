import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Check, X } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { createConversation, getApiConfig } from '../lib/api';
import { getUserServiceConfig, searchUsers } from '../lib/userApi';
import { conversationsQueryKey } from '../lib/queryKeys';
import { initialFromName } from '../lib/avatarMeta';
import type { UserProfile } from '../lib/types';
import { Avatar } from './Avatar';

type CreateGroupModalProps = {
  onClose: () => void;
};

export function CreateGroupModal({ onClose }: CreateGroupModalProps) {
  const { userId, accessToken } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [groupName, setGroupName] = useState('');
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [selected, setSelected] = useState<UserProfile[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), 300);
    return () => window.clearTimeout(t);
  }, [query]);

  const api = getApiConfig();
  const ctx = api && accessToken && userId ? { baseUrl: api.baseUrl, accessToken, userId } : null;
  const userSvcBase = getUserServiceConfig();
  const userSvc = userSvcBase && accessToken ? { baseUrl: userSvcBase.baseUrl, accessToken } : null;

  const searchQ = useQuery({
    queryKey: ['user-search', debounced, userId],
    queryFn: () => searchUsers(userSvc!, { query: debounced, limit: 20, exclude: userId ? [userId] : [] }),
    enabled: Boolean(userSvc && debounced.length >= 3),
  });

  const toggle = (user: UserProfile) => {
    setSelected((prev) => {
      const exists = prev.some((u) => u.id === user.id);
      return exists ? prev.filter((u) => u.id !== user.id) : [...prev, user];
    });
  };

  const createGroup = useMutation({
    mutationFn: async () => {
      if (!ctx) throw new Error('Not signed in');
      if (selected.length < 2) throw new Error('Select at least two people for a group.');
      const title = groupName.trim();
      if (!title) throw new Error('Enter a group name.');
      return createConversation(ctx, { type: 'group', title, participantIds: selected.map((u) => u.id) });
    },
    onSuccess: (conv) => {
      void queryClient.invalidateQueries({ queryKey: conversationsQueryKey(userId) });
      onClose();
      navigate(`/c/${conv.id}`);
    },
    onError: (e: Error) => setError(e.message),
  });

  const canCreate = groupName.trim().length > 0 && selected.length >= 2;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm mx-4 rounded-2xl overflow-hidden flex flex-col max-h-[85vh]"
        style={{ background: '#1a1a30', border: '1px solid rgba(124,92,191,0.2)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor: 'rgba(124,92,191,0.15)' }}>
          <h3 className="font-bold text-base" style={{ color: '#f0eeff', fontFamily: 'var(--font-family-display)' }}>
            New Group Chat
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors"
            style={{ color: '#7a7a9a' }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 pt-4 pb-2 flex-shrink-0">
          <input
            type="text"
            placeholder="Group name…"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: '#1e1e38', color: '#f0eeff', border: '1px solid rgba(124,92,191,0.2)' }}
          />
        </div>

        <div className="px-5 pb-2 flex-shrink-0">
          <input
            type="text"
            placeholder="Search people to add…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: '#1e1e38', color: '#f0eeff', border: '1px solid rgba(124,92,191,0.2)' }}
          />
        </div>

        {selected.length > 0 && (
          <div className="px-5 pb-2 flex flex-wrap gap-1.5 flex-shrink-0">
            {selected.map((user) => (
              <span
                key={user.id}
                className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs"
                style={{ background: 'rgba(124,92,191,0.2)', color: '#c4b8f0' }}
              >
                {user.displayName}
                <button type="button" onClick={() => toggle(user)} className="font-bold leading-none">
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="px-3 pb-2 flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
          {(searchQ.data ?? []).map((user) => {
            const on = selected.some((u) => u.id === user.id);
            return (
              <div
                key={user.id}
                onClick={() => toggle(user)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && toggle(user)}
                className="flex items-center gap-3 px-2 py-2.5 rounded-xl cursor-pointer transition-all duration-150"
                style={{ background: on ? 'rgba(124,92,191,0.15)' : 'transparent' }}
              >
                <Avatar seed={user.id} initial={initialFromName(user.displayName)} size={34} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate" style={{ color: '#f0eeff', fontFamily: 'var(--font-family-display)' }}>
                    {user.displayName}
                  </div>
                  <div className="text-xs truncate" style={{ color: '#7a7a9a' }}>{user.email}</div>
                </div>
                <div
                  className="w-5 h-5 rounded-md flex items-center justify-center transition-all duration-150 flex-shrink-0"
                  style={{ background: on ? '#7c5cbf' : 'rgba(124,92,191,0.15)', border: on ? 'none' : '1px solid rgba(124,92,191,0.3)' }}
                >
                  {on && <Check size={12} color="white" />}
                </div>
              </div>
            );
          })}
          {debounced.length >= 3 && searchQ.isSuccess && (searchQ.data?.length ?? 0) === 0 && (
            <p className="px-2 py-3 text-center text-sm" style={{ color: '#7a7a9a' }}>No people found</p>
          )}
        </div>

        <div className="px-5 py-4 border-t flex-shrink-0" style={{ borderColor: 'rgba(124,92,191,0.15)' }}>
          {error && <p className="mb-2 text-xs" style={{ color: '#e53e3e' }}>{error}</p>}
          <button
            type="button"
            onClick={() => createGroup.mutate()}
            disabled={!canCreate || createGroup.isPending}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-150"
            style={{
              background: canCreate ? '#7c5cbf' : 'rgba(124,92,191,0.2)',
              color: canCreate ? 'white' : '#4a4a6a',
              fontFamily: 'var(--font-family-display)',
            }}
          >
            {createGroup.isPending ? 'Creating…' : `Create Group${selected.length > 0 ? ` (${selected.length} members)` : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
