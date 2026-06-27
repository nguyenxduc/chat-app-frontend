import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { MessageCircle, Search, Users } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { getUserServiceConfig, searchUsers } from '../lib/userApi';
import { initialFromName } from '../lib/avatarMeta';
import type { UserProfile } from '../lib/types';
import { Avatar } from './Avatar';

type PeopleFinderProps = {
  onStartChat: (user: UserProfile) => void;
};

export function PeopleFinder({ onStartChat }: PeopleFinderProps) {
  const { userId, accessToken } = useAuth();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), 300);
    return () => window.clearTimeout(t);
  }, [query]);

  const userSvcBase = getUserServiceConfig();
  const userSvc = userSvcBase && accessToken ? { baseUrl: userSvcBase.baseUrl, accessToken } : null;

  const searchQ = useQuery({
    queryKey: ['user-search', debounced, userId],
    queryFn: () => searchUsers(userSvc!, { query: debounced, limit: 20, exclude: userId ? [userId] : [] }),
    enabled: Boolean(userSvc && debounced.length >= 3),
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 pt-4 pb-2 flex-shrink-0">
        <h2 className="text-base font-bold flex-1" style={{ color: '#f0eeff', fontFamily: 'var(--font-family-display)' }}>
          Find People
        </h2>
      </div>
      <div className="px-4 pt-2 pb-3 flex-shrink-0">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#7a7a9a' }} />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: '#1e1e38', color: '#f0eeff', border: '1px solid rgba(124,92,191,0.2)' }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1.5" style={{ scrollbarWidth: 'none' }}>
        {debounced.length > 0 && debounced.length < 3 && (
          <p className="px-2 py-3 text-center text-sm" style={{ color: '#7a7a9a' }}>
            Type at least 3 characters
          </p>
        )}
        {searchQ.isError && (
          <p className="px-2 py-3 text-center text-sm" style={{ color: '#e53e3e' }}>
            {(searchQ.error as Error).message}
          </p>
        )}
        {(searchQ.data ?? []).map((user) => (
          <div
            key={user.id}
            className="flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-150"
            style={{ background: 'rgba(30,30,56,0.4)' }}
          >
            <Avatar seed={user.id} initial={initialFromName(user.displayName)} size={44} />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate" style={{ color: '#f0eeff', fontFamily: 'var(--font-family-display)' }}>
                {user.displayName}
              </div>
              <div className="text-xs mt-0.5 truncate" style={{ color: '#7a7a9a' }}>{user.email}</div>
            </div>
            <button
              type="button"
              onClick={() => onStartChat(user)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 flex-shrink-0"
              style={{ background: 'rgba(124,92,191,0.2)', color: '#c4b8f0' }}
            >
              <MessageCircle size={13} /> Message
            </button>
          </div>
        ))}
        {searchQ.isSuccess && debounced.length >= 3 && (searchQ.data?.length ?? 0) === 0 && (
          <div className="flex flex-col items-center py-12 opacity-40">
            <Users size={28} style={{ color: '#7a7a9a' }} />
            <p className="mt-3 text-sm" style={{ color: '#7a7a9a' }}>No people found</p>
          </div>
        )}
        {debounced.length === 0 && (
          <div className="flex flex-col items-center py-12 opacity-40">
            <Users size={28} style={{ color: '#7a7a9a' }} />
            <p className="mt-3 text-sm" style={{ color: '#7a7a9a' }}>Search for people to message</p>
          </div>
        )}
      </div>
    </div>
  );
}
