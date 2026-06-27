import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';

import { useAuth } from '../context/AuthContext';
import { deletePresence, getApiConfig, postPresence, listConversations } from '../lib/api';
import { conversationsQueryKey } from '../lib/queryKeys';
import { conversationHasUnread } from '../lib/readAckStorage';
import { openDirectConversation } from '../lib/openConversation';
import type { UserProfile } from '../lib/types';
import { IconRail, type SidebarTab } from './IconRail';
import { ChatListPanel } from './ChatListPanel';
import { PeopleFinder } from './PeopleFinder';
import { ProfilePanel } from './ProfilePanel';
import { CreateGroupModal } from './CreateGroupModal';

export function ChatShell() {
  const { userId, accessToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<SidebarTab>('chats');
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  const isThread = /^\/c\//.test(location.pathname);

  const api = useMemo(() => getApiConfig(), []);
  const ctx = api && accessToken && userId ? { baseUrl: api.baseUrl, accessToken, userId } : null;

  useEffect(() => {
    if (!ctx) return;
    const run = () => void postPresence(ctx).catch(() => {});
    run();
    const id = window.setInterval(run, 25_000);
    return () => {
      window.clearInterval(id);
      void deletePresence(ctx).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, accessToken, userId]);

  const convosQ = useQuery({
    queryKey: conversationsQueryKey(userId),
    queryFn: () => listConversations(ctx!),
    enabled: Boolean(ctx),
  });
  const unreadCount = userId
    ? (convosQ.data?.filter((c) => conversationHasUnread(userId, c)).length ?? 0)
    : 0;

  const startDm = async (peer: UserProfile) => {
    if (!ctx) return;
    try {
      const conv = await openDirectConversation(ctx, peer.id, queryClient);
      setTab('chats');
      navigate(`/c/${conv.id}`);
    } catch {
      /* surfaced via list error state on retry */
    }
  };

  return (
    <div className="size-full flex overflow-hidden" style={{ background: '#0d0d1a' }}>
      <IconRail tab={tab} onTabChange={setTab} unreadCount={unreadCount} />

      <div
        className={`flex-col flex-shrink-0 overflow-hidden ${isThread ? 'hidden md:flex' : 'flex'}`}
        style={{ width: 280, borderRight: '1px solid rgba(124,92,191,0.1)', background: '#12121e' }}
      >
        {tab === 'chats' && (
          <ChatListPanel onCreateGroup={() => setShowCreateGroup(true)} onFindPeople={() => setTab('people')} />
        )}
        {tab === 'people' && <PeopleFinder onStartChat={startDm} />}
        {tab === 'profile' && <ProfilePanel />}
      </div>

      <div className={`flex-1 flex flex-col overflow-hidden ${isThread ? 'flex' : 'hidden md:flex'}`} style={{ background: '#0d0d1a' }}>
        <Outlet />
      </div>

      {showCreateGroup && <CreateGroupModal onClose={() => setShowCreateGroup(false)} />}
    </div>
  );
}
