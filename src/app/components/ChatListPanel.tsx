import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Plus, Search, UserPlus, MessageCircle } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';
import { useUserProfile } from '../hooks/useUserProfile';
import { getApiConfig, listConversations } from '../lib/api';
import { isDirectConversation, getPeerId } from '../lib/conversationDisplay';
import { conversationsQueryKey } from '../lib/queryKeys';
import { isValidUserId } from '../lib/userId';
import { conversationHasUnread, READ_ACK_EVENT } from '../lib/readAckStorage';
import { refetchIntervalWithBackgroundBackup } from '../lib/polling';
import { initialFromUserId } from '../lib/avatarMeta';
import type { Conversation } from '../lib/types';
import { Avatar } from './Avatar';
import { PeerAvatar, PeerGroupAvatar } from './PeerAvatar';

type ChatListPanelProps = {
  onCreateGroup: () => void;
  onFindPeople: () => void;
};

export function ChatListPanel({ onCreateGroup, onFindPeople }: ChatListPanelProps) {
  const { userId, accessToken } = useAuth();
  const { connected: realtimeConnected, pushSeq } = useRealtime();
  const { id: activeId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [, setTick] = useState(0);

  useEffect(() => {
    const onAck = () => setTick((n) => n + 1);
    window.addEventListener(READ_ACK_EVENT, onAck);
    return () => window.removeEventListener(READ_ACK_EVENT, onAck);
  }, []);

  const api = getApiConfig();
  const ctx = api && accessToken && userId ? { baseUrl: api.baseUrl, accessToken, userId } : null;

  const q = useQuery({
    queryKey: conversationsQueryKey(userId),
    queryFn: () => listConversations(ctx!),
    enabled: Boolean(ctx),
    refetchInterval: () => refetchIntervalWithBackgroundBackup(realtimeConnected, 8000, 4000),
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: 'always',
  });

  const sorted = useMemo(() => {
    const rows = q.data ?? [];
    return [...rows].sort((a, b) => {
      const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return tb - ta;
    });
  }, [q.data, pushSeq]);

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return sorted;
    return sorted.filter((c) => {
      const title = (c.title ?? '').toLowerCase();
      const prev = (c.lastMessagePreview ?? '').toLowerCase();
      return title.includes(t) || prev.includes(t);
    });
  }, [sorted, search]);

  const groupConvos = filtered.filter((c) => !isDirectConversation(c));
  const dmConvos = filtered.filter((c) => isDirectConversation(c));

  return (
    <>
      <div className="px-4 pt-4 pb-2 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold" style={{ color: '#f0eeff', fontFamily: 'var(--font-family-display)' }}>
            Messages
          </h2>
          <button
            type="button"
            onClick={onCreateGroup}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors"
            style={{ color: '#7a7a9a' }}
            aria-label="New group"
          >
            <Plus size={16} />
          </button>
        </div>
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#7a7a9a' }} />
          <input
            type="text"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-4 py-2 rounded-xl text-sm outline-none"
            style={{ background: '#1e1e38', color: '#f0eeff', border: '1px solid rgba(124,92,191,0.15)' }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5" style={{ scrollbarWidth: 'none' }}>
        {q.isError && (
          <p className="px-3 py-3 text-center text-sm" style={{ color: '#e53e3e' }}>
            {(q.error as Error).message}
          </p>
        )}
        {groupConvos.length > 0 && <SectionLabel>Groups</SectionLabel>}
        {groupConvos.map((c) => (
          <ConvoRow key={c.id} c={c} userId={userId} active={activeId === c.id} onOpen={() => navigate(`/c/${c.id}`)} />
        ))}
        {dmConvos.length > 0 && <SectionLabel>Direct Messages</SectionLabel>}
        {dmConvos.map((c) => (
          <ConvoRow key={c.id} c={c} userId={userId} active={activeId === c.id} onOpen={() => navigate(`/c/${c.id}`)} />
        ))}
        {!q.isLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center py-10 opacity-40">
            <MessageCircle size={24} style={{ color: '#7a7a9a' }} />
            <p className="mt-2 text-sm" style={{ color: '#7a7a9a' }}>No conversations yet</p>
          </div>
        )}
      </div>

      <div className="px-4 pb-4 flex-shrink-0">
        <button
          type="button"
          onClick={onFindPeople}
          className="w-full py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all duration-150"
          style={{ background: 'rgba(124,92,191,0.15)', color: '#c4b8f0', fontFamily: 'var(--font-family-display)' }}
        >
          <UserPlus size={14} /> Find people
        </button>
      </div>
    </>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="px-3 pt-2 pb-1">
      <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#4a4a6a', fontFamily: 'var(--font-family-display)' }}>
        {children}
      </span>
    </div>
  );
}

function ConvoRow({
  c,
  userId,
  active,
  onOpen,
}: {
  c: Conversation;
  userId: string | null;
  active: boolean;
  onOpen: () => void;
}) {
  const peerId = userId && isValidUserId(userId) ? getPeerId(c, userId) : null;
  const peerProfile = useUserProfile(peerId);
  const isGroup = !isDirectConversation(c);

  const displayName = isGroup ? c.title?.trim() || 'Group chat' : peerProfile.data?.displayName ?? 'Loading…';
  const unread = Boolean(userId) && conversationHasUnread(userId!, c);
  const lastText = c.lastMessagePreview || 'Start chatting!';

  return (
    <div
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onOpen()}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150"
      style={{ background: active ? 'rgba(124,92,191,0.18)' : 'transparent' }}
    >
      {isGroup ? (
        <PeerGroupAvatar userIds={c.participantIds} size={42} />
      ) : peerId ? (
        <PeerAvatar userId={peerId} size={42} />
      ) : (
        <Avatar seed={c.id} initial={initialFromUserId(c.id)} size={42} />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span
            className="font-semibold text-sm truncate"
            style={{ color: unread ? '#f0eeff' : '#e4d9ff', fontFamily: 'var(--font-family-display)' }}
          >
            {displayName}
          </span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-xs truncate" style={{ color: unread ? '#c4b8f0' : '#5a5a7a', maxWidth: '85%' }}>
            {lastText}
          </span>
          {unread && <span className="flex-shrink-0 w-2 h-2 rounded-full" style={{ background: '#7c5cbf' }} />}
        </div>
      </div>
    </div>
  );
}
