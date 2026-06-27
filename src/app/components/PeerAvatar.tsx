import { useUserProfile } from '../hooks/useUserProfile';
import { initialFromName, initialFromUserId } from '../lib/avatarMeta';
import { Avatar } from './Avatar';

type PeerAvatarProps = {
  userId: string;
  size?: number;
  online?: boolean;
  className?: string;
};

/** Avatar for a user we only have the id for — fetches their profile and shows the real name's initial once loaded. */
export function PeerAvatar({ userId, size = 40, online, className }: PeerAvatarProps) {
  const profile = useUserProfile(userId);
  const initial = profile.data?.displayName
    ? initialFromName(profile.data.displayName)
    : initialFromUserId(userId);

  return <Avatar seed={userId} initial={initial} size={size} online={online} className={className} />;
}

type PeerGroupAvatarProps = {
  userIds: string[];
  size?: number;
};

/** Stacked avatars for up to 2 group members, each resolved to their real name's initial. */
export function PeerGroupAvatar({ userIds, size = 40 }: PeerGroupAvatarProps) {
  const top2 = userIds.slice(0, 2);
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      {top2.map((id, i) => (
        <div
          key={id}
          className="absolute"
          style={{
            top: i === 0 ? 0 : undefined,
            bottom: i === 1 ? 0 : undefined,
            left: i === 0 ? 0 : undefined,
            right: i === 1 ? 0 : undefined,
          }}
        >
          <PeerAvatar userId={id} size={size * 0.65} />
        </div>
      ))}
    </div>
  );
}
