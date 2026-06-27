import { MessageCircle } from 'lucide-react';

export function EmptyChatState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 select-none opacity-25">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(124,92,191,0.2)' }}>
        <MessageCircle size={28} style={{ color: '#7c5cbf' }} />
      </div>
      <div className="text-center">
        <p className="font-semibold" style={{ color: '#f0eeff', fontFamily: 'var(--font-family-display)' }}>
          Select a conversation
        </p>
        <p className="text-sm mt-1" style={{ color: '#7a7a9a' }}>or find new people to chat with</p>
      </div>
    </div>
  );
}
