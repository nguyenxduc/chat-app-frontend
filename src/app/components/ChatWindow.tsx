import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  Check,
  CheckCheck,
  ChevronLeft,
  Download,
  FileText,
  Image as ImageIcon,
  Paperclip,
  Search,
  Send,
  Smile,
  X,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';
import { useUserProfile } from '../hooks/useUserProfile';
import { getApiConfig, getConversation, listMessages, markMessagesRead, sendMessage } from '../lib/api';
import { getMultimediaConfig, uploadMedia, fetchMediaBlob } from '../lib/media';
import { getPeerId, isDirectConversation } from '../lib/conversationDisplay';
import { conversationsQueryKey, messagesQueryKey } from '../lib/queryKeys';
import { readAckCreatedAtForSync, saveReadAck } from '../lib/readAckStorage';
import { refetchIntervalWithBackgroundBackup } from '../lib/polling';
import type { Message, MessageAttachment } from '../lib/types';
import { PeerAvatar, PeerGroupAvatar } from './PeerAvatar';

const EMOJI_QUICK = ['👍', '❤️', '😂', '🔥', '🎉', '👏', '✅', '🤔'];

export function ChatWindow() {
  const { id: conversationId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userId, accessToken } = useAuth();
  const { connected: realtimeConnected, pushSeq } = useRealtime();
  const queryClient = useQueryClient();

  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<MessageAttachment | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const readAckUpToRef = useRef<string | null>(null);

  const api = getApiConfig();
  const mediaApi = getMultimediaConfig();
  const ctx = useMemo(
    () => (api && accessToken && userId ? { baseUrl: api.baseUrl, accessToken, userId } : null),
    [api, accessToken, userId],
  );

  const convoQ = useQuery({
    queryKey: ['conversation', conversationId, userId],
    queryFn: () => getConversation(ctx!, conversationId!),
    enabled: Boolean(ctx && conversationId),
  });
  const conversation = convoQ.data;

  const messagesQ = useQuery({
    queryKey: messagesQueryKey(conversationId, userId),
    queryFn: () => listMessages(ctx!, conversationId!, { limit: 100 }),
    enabled: Boolean(ctx && conversationId),
    refetchInterval: () => refetchIntervalWithBackgroundBackup(realtimeConnected, 3000, 4000),
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: 'always',
  });

  const isGroup = conversation ? !isDirectConversation(conversation) : false;
  const peerId = conversation && userId ? getPeerId(conversation, userId) : null;
  const peerProfile = useUserProfile(peerId);
  const displayName = isGroup ? conversation?.title?.trim() || 'Group chat' : peerProfile.data?.displayName ?? '…';

  useEffect(() => {
    setText('');
    setPendingAttachment(null);
    setUploadError(null);
    setShowEmoji(false);
    readAckUpToRef.current = null;
  }, [conversationId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messagesQ.data?.length, pushSeq]);

  const messages = useMemo(() => [...(messagesQ.data ?? [])].reverse(), [messagesQ.data]);

  const firstUnread = messages[messages.length - 1];
  const flushReadAck = useCallback(() => {
    if (!ctx || !conversationId || !firstUnread) return;
    if (readAckUpToRef.current === firstUnread.id) return;
    void markMessagesRead(ctx, conversationId, firstUnread.id)
      .then(() => {
        readAckUpToRef.current = firstUnread.id;
        saveReadAck(userId, conversationId, {
          messageId: firstUnread.id,
          createdAt: readAckCreatedAtForSync(firstUnread.createdAt, conversation?.lastMessageAt),
        });
        void queryClient.invalidateQueries({ queryKey: conversationsQueryKey(userId) });
      })
      .catch(() => {});
  }, [ctx, conversationId, firstUnread, userId, conversation?.lastMessageAt, queryClient]);

  useEffect(() => {
    flushReadAck();
  }, [flushReadAck]);

  const sendMut = useMutation({
    mutationFn: async (input: { body: string; attachment?: MessageAttachment | null }) => {
      if (!ctx || !conversationId) throw new Error('Not ready');
      if (input.attachment) {
        await sendMessage(ctx, conversationId, { body: '', attachments: [input.attachment] });
      }
      const t = input.body.trim();
      if (t) {
        await sendMessage(ctx, conversationId, { body: t });
      }
    },
    onSuccess: () => {
      setText('');
      setPendingAttachment(null);
      setUploadError(null);
      setShowEmoji(false);
      void queryClient.invalidateQueries({ queryKey: messagesQueryKey(conversationId, userId) });
      void queryClient.invalidateQueries({ queryKey: conversationsQueryKey(userId) });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !conversationId || !mediaApi || !ctx) {
      setUploadError('Multimedia service is not configured.');
      return;
    }
    setUploadError(null);
    setUploading(true);
    void uploadMedia({ baseUrl: mediaApi.baseUrl, accessToken: ctx.accessToken }, conversationId, file)
      .then((meta) => {
        setPendingAttachment({ mediaId: meta.id, mimeType: meta.mimeType, filename: meta.originalFilename });
      })
      .catch((err: unknown) => {
        setUploadError(err instanceof Error ? err.message : 'Upload failed');
      })
      .finally(() => setUploading(false));
  };

  const canSend = !sendMut.isPending && !uploading && (text.trim().length > 0 || Boolean(pendingAttachment));
  const send = () => {
    if (!canSend) return;
    sendMut.mutate({ body: text, attachment: pendingAttachment });
  };

  if (!conversationId) {
    return null;
  }

  return (
    <div className="flex flex-col h-full">
      <div
        className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0"
        style={{ borderColor: 'rgba(124,92,191,0.15)', background: '#16162a' }}
      >
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center md:hidden hover:bg-white/5 transition-colors"
          style={{ color: '#c4b8f0' }}
        >
          <ChevronLeft size={18} />
        </button>
        {isGroup && conversation ? (
          <PeerGroupAvatar userIds={conversation.participantIds} size={38} />
        ) : peerId ? (
          <PeerAvatar userId={peerId} size={38} />
        ) : null}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm" style={{ color: '#f0eeff', fontFamily: 'var(--font-family-display)' }}>
            {displayName}
          </div>
          <div className="text-xs" style={{ color: '#7a7a9a' }}>
            {isGroup ? `${conversation?.participantIds.length ?? 0} members` : ' '}
          </div>
        </div>
        <button type="button" className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors" style={{ color: '#7a7a9a' }}>
          <Search size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2" style={{ background: '#0d0d1a', scrollbarWidth: 'none' }}>
        {messagesQ.isError && (
          <p className="text-center text-sm" style={{ color: '#e53e3e' }}>{(messagesQ.error as Error).message}</p>
        )}
        {messages.map((msg, i) => {
          const isMe = msg.senderId === userId;
          const prevSender = i > 0 ? messages[i - 1].senderId : null;
          const showSenderInfo = !isMe && prevSender !== msg.senderId && isGroup;
          const isLast = i === messages.length - 1;
          const showReceipt = isMe && isLast;
          return (
            <MessageRow
              key={msg.id}
              message={msg}
              isMe={isMe}
              showSenderInfo={showSenderInfo}
              showAvatar={!isMe}
              showReceipt={showReceipt}
              mediaCtx={mediaApi && ctx ? { baseUrl: mediaApi.baseUrl, accessToken: ctx.accessToken } : null}
            />
          );
        })}
        <div ref={scrollRef} />
      </div>

      {pendingAttachment && (
        <div
          className="flex items-center gap-2 px-4 py-2 border-t"
          style={{ borderColor: 'rgba(124,92,191,0.12)', background: '#16162a' }}
        >
          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(124,92,191,0.2)' }}>
            <FileText size={18} style={{ color: '#c4b8f0' }} />
          </div>
          <span className="flex-1 truncate text-xs" style={{ color: '#e4d9ff' }}>
            {uploading ? 'Uploading…' : pendingAttachment.filename ?? 'Attachment ready'}
          </span>
          {!uploading && (
            <button type="button" onClick={() => setPendingAttachment(null)} className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: '#e53e3e' }}>
              <X size={11} color="white" />
            </button>
          )}
        </div>
      )}

      {showEmoji && (
        <div className="flex items-center gap-2 px-4 py-2 border-t" style={{ borderColor: 'rgba(124,92,191,0.12)', background: '#16162a' }}>
          {EMOJI_QUICK.map((e) => (
            <button key={e} type="button" onClick={() => setText((p) => p + e)} className="text-lg hover:scale-125 transition-transform">
              {e}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 px-4 py-3 border-t flex-shrink-0" style={{ borderColor: 'rgba(124,92,191,0.15)', background: '#16162a' }}>
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} disabled={uploading} />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors hover:bg-white/5"
          style={{ color: pendingAttachment ? '#ff8906' : '#7a7a9a' }}
        >
          <Paperclip size={18} />
        </button>
        <button
          type="button"
          onClick={() => setShowEmoji((p) => !p)}
          className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors hover:bg-white/5"
          style={{ color: showEmoji ? '#ff8906' : '#7a7a9a' }}
        >
          <Smile size={18} />
        </button>
        <div className="flex-1">
          <input
            type="text"
            placeholder={`Message ${displayName.split(' ')[0]}…`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: '#1e1e38', color: '#f0eeff', border: '1px solid rgba(124,92,191,0.2)' }}
          />
        </div>
        <button
          type="button"
          onClick={send}
          disabled={!canSend}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150 flex-shrink-0"
          style={{ background: canSend ? '#7c5cbf' : 'rgba(124,92,191,0.2)', color: canSend ? 'white' : '#4a4a6a' }}
        >
          <Send size={15} />
        </button>
      </div>
      {uploadError && (
        <p className="px-3 py-1 text-center text-xs" style={{ background: '#1e1e38', color: '#fbbf24' }}>{uploadError}</p>
      )}
      {sendMut.isError && (
        <p className="px-3 py-1 text-center text-xs" style={{ background: '#1e1e38', color: '#e53e3e' }}>
          {(sendMut.error as Error).message}
        </p>
      )}
    </div>
  );
}

function MessageRow({
  message,
  isMe,
  showSenderInfo,
  showAvatar,
  showReceipt,
  mediaCtx,
}: {
  message: Message;
  isMe: boolean;
  showSenderInfo: boolean;
  showAvatar: boolean;
  showReceipt: boolean;
  mediaCtx: { baseUrl: string; accessToken: string } | null;
}) {
  const senderProfile = useUserProfile(showSenderInfo ? message.senderId : null);
  const receipt = message.receiptStatus ?? 'sent';
  const attachment = message.attachments?.[0];

  return (
    <div className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isMe && (
        <div className="w-7 flex-shrink-0">
          {showAvatar ? <PeerAvatar userId={message.senderId} size={26} /> : null}
        </div>
      )}
      <div className={`max-w-[72%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
        {showSenderInfo && (
          <span className="text-[11px] mb-1 px-1" style={{ color: '#7a7a9a', fontFamily: 'var(--font-family-display)' }}>
            {senderProfile.data?.displayName ?? '…'}
          </span>
        )}
        {message.body && (
          <div
            className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${isMe ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
            style={{ background: isMe ? '#7c5cbf' : '#1e1e38', color: isMe ? '#fff' : '#e4d9ff' }}
          >
            {message.body}
          </div>
        )}
        {attachment && mediaCtx && <AttachmentBubble attachment={attachment} isMe={isMe} ctx={mediaCtx} />}
        <div className={`text-[10px] mt-1 flex items-center gap-1 px-1 ${isMe ? 'justify-end' : 'justify-start'}`} style={{ color: '#4a4a6a' }}>
          {new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(message.createdAt))}
          {isMe && showReceipt && (receipt === 'read' ? <CheckCheck size={11} style={{ color: '#34C759' }} /> : receipt === 'delivered' ? <CheckCheck size={11} /> : <Check size={11} />)}
        </div>
      </div>
      {isMe && (
        <div className="w-7 flex-shrink-0" />
      )}
    </div>
  );
}

function AttachmentBubble({
  attachment,
  isMe,
  ctx,
}: {
  attachment: MessageAttachment;
  isMe: boolean;
  ctx: { baseUrl: string; accessToken: string };
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const isImage = attachment.mimeType?.startsWith('image/');

  useEffect(() => {
    let cancelled = false;
    void fetchMediaBlob(ctx, attachment.mediaId)
      .then((blob) => {
        if (cancelled) return;
        setObjectUrl(URL.createObjectURL(blob));
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachment.mediaId]);

  if (failed) {
    return (
      <p className="mt-2 text-xs opacity-70" style={{ color: isMe ? '#fff' : '#e4d9ff' }}>
        {attachment.filename ?? 'Attachment unavailable'}
      </p>
    );
  }

  if (isImage) {
    return (
      <div className="mt-2 rounded-xl overflow-hidden" style={{ maxWidth: 220 }}>
        {objectUrl ? (
          <img src={objectUrl} alt={attachment.filename ?? 'Image'} className="w-full block" />
        ) : (
          <div className="w-full h-32 animate-pulse" style={{ background: 'rgba(124,92,191,0.2)' }} />
        )}
        <div className="flex items-center gap-2 px-2 py-1.5 text-xs" style={{ background: 'rgba(0,0,0,0.3)', color: 'rgba(255,255,255,0.7)' }}>
          <ImageIcon size={11} />
          <span className="flex-1 truncate">{attachment.filename}</span>
          {objectUrl && (
            <a href={objectUrl} download={attachment.filename}>
              <Download size={11} className="opacity-60 hover:opacity-100" />
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="mt-2 flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
      style={{ background: isMe ? 'rgba(255,255,255,0.1)' : 'rgba(124,92,191,0.15)', maxWidth: 220 }}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: isMe ? 'rgba(255,255,255,0.15)' : 'rgba(124,92,191,0.2)' }}>
        <FileText size={16} style={{ color: isMe ? 'white' : '#c4b8f0' }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium truncate" style={{ color: isMe ? 'white' : '#e4d9ff' }}>{attachment.filename}</div>
      </div>
      {objectUrl && (
        <a href={objectUrl} download={attachment.filename}>
          <Download size={14} style={{ color: isMe ? 'white' : '#c4b8f0' }} />
        </a>
      )}
    </div>
  );
}
