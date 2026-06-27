import { MessageCircle, Users, type LucideIcon } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { initialFromName } from '../lib/avatarMeta';
import { Avatar } from './Avatar';

export type SidebarTab = 'chats' | 'people' | 'profile';

function RailButton({
  icon: Icon,
  active,
  badge,
  onClick,
}: {
  icon: LucideIcon;
  active?: boolean;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-10 h-10 rounded-xl flex items-center justify-center relative transition-all duration-150"
      style={{ background: active ? 'rgba(124,92,191,0.2)' : 'transparent', color: active ? '#c4b8f0' : '#4a4a6a' }}
    >
      <Icon size={18} />
      {badge != null && badge > 0 && (
        <span
          className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
          style={{ background: '#ff8906', color: 'white' }}
        >
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </button>
  );
}

type IconRailProps = {
  tab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  unreadCount: number;
};

export function IconRail({ tab, onTabChange, unreadCount }: IconRailProps) {
  const { user } = useAuth();

  return (
    <div
      className="flex flex-col items-center py-4 gap-2 flex-shrink-0"
      style={{ width: 60, background: '#0a0a14', borderRight: '1px solid rgba(124,92,191,0.1)' }}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2" style={{ background: '#7c5cbf' }}>
        <MessageCircle size={17} color="white" fill="white" />
      </div>
      <RailButton icon={MessageCircle} active={tab === 'chats'} badge={unreadCount} onClick={() => onTabChange('chats')} />
      <RailButton icon={Users} active={tab === 'people'} onClick={() => onTabChange('people')} />
      <div className="flex-1" />
      <button type="button" onClick={() => onTabChange('profile')} className="cursor-pointer">
        <div className="relative">
          <Avatar seed={user?.id ?? ''} initial={user ? initialFromName(user.displayName) : '?'} size={32} />
          {tab === 'profile' && (
            <div className="absolute inset-0 rounded-full" style={{ border: '2px solid #7c5cbf' }} />
          )}
        </div>
      </button>
    </div>
  );
}
