import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { LogOut } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { getApiConfig, listConversations } from '../lib/api';
import { isDirectConversation } from '../lib/conversationDisplay';
import { conversationsQueryKey } from '../lib/queryKeys';
import { initialFromName } from '../lib/avatarMeta';
import { Avatar } from './Avatar';

export function ProfilePanel() {
  const { user, userId, accessToken, logout } = useAuth();
  const navigate = useNavigate();

  const api = getApiConfig();
  const ctx = api && accessToken && userId ? { baseUrl: api.baseUrl, accessToken, userId } : null;
  const q = useQuery({
    queryKey: conversationsQueryKey(userId),
    queryFn: () => listConversations(ctx!),
    enabled: Boolean(ctx),
  });

  const chatCount = q.data?.filter((c) => isDirectConversation(c)).length ?? 0;
  const groupCount = q.data?.filter((c) => !isDirectConversation(c)).length ?? 0;

  if (!user) {
    return null;
  }

  const onSignOut = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
      <div className="relative h-28 flex-shrink-0" style={{ background: 'linear-gradient(135deg, #7c5cbf 0%, #38bdf8 100%)' }} />

      <div className="px-5 pb-5">
        <div className="flex items-end justify-between -mt-7 mb-4">
          <Avatar seed={user.id} initial={initialFromName(user.displayName)} size={54} />
        </div>

        <h2 className="font-bold text-xl leading-tight" style={{ color: '#f0eeff', fontFamily: 'var(--font-family-display)' }}>
          {user.displayName}
        </h2>
        <p className="text-sm mt-0.5" style={{ color: '#7a7a9a' }}>{user.email}</p>

        <div className="grid grid-cols-2 gap-2 mt-5">
          {[[String(chatCount), 'Chats'], [String(groupCount), 'Groups']].map(([n, l]) => (
            <div key={l} className="rounded-xl py-3 text-center" style={{ background: 'rgba(124,92,191,0.1)' }}>
              <div className="font-bold text-lg" style={{ color: '#f0eeff', fontFamily: 'var(--font-family-display)' }}>{n}</div>
              <div className="text-xs" style={{ color: '#7a7a9a' }}>{l}</div>
            </div>
          ))}
        </div>

        <div className="mt-5 pt-4 border-t" style={{ borderColor: 'rgba(124,92,191,0.1)' }}>
          <button
            type="button"
            onClick={onSignOut}
            className="w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all duration-150"
            style={{ background: 'rgba(229,62,62,0.1)', color: '#e53e3e', fontFamily: 'var(--font-family-display)' }}
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
