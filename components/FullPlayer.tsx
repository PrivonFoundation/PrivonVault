import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SkipBack, SkipForward, Play, Pause, Music, MoreHorizontal,
  Volume1, Volume2, Shuffle, Repeat, ListMusic, Heart, Trash2, X,
} from 'lucide-react';
import { FileSystemItem } from '../types';
import { is_safe_image_url as isSafeImageUrl } from '../crypto-core/index';
import { useI18n } from '../locales/i18nContext';
import { SettingsRow } from './views/SettingsView';

interface FullPlayerProps {
  currentPlayingItem: FileSystemItem | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  shuffleOn: boolean;
  repeatMode: 'off' | 'all' | 'one';
  queue: FileSystemItem[];
  queueIndex: number;
  sourceName: string;
  onClose: () => void;
  onTogglePlay: () => void;
  onSeekTime: (t: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onVolumeChange: (v: number) => void;
  onToggleShuffle: () => void;
  onCycleRepeat: () => void;
  onSelectQueueItem: (index: number) => void;
  onAction: (action: string, item: FileSystemItem) => void;
}

const fmt = (sec: number): string => {
  const s = Math.max(0, Math.floor(sec || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const coverSrc = (item: FileSystemItem): string | null => {
  const src =
    (item as any).decryptedCoverUrl ||
    (item as any).decryptedCustomIcon ||
    item.customIcon ||
    item.coverUrl;
  return src && isSafeImageUrl(src) ? src : null;
};

const WhiteEq: React.FC = () => (
  <span className="flex items-end gap-[2px] h-3.5">
    <motion.span animate={{ height: [4, 12, 6, 14, 8] }} transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }} className="w-[3px] bg-white rounded-full" />
    <motion.span animate={{ height: [8, 14, 8, 4, 12] }} transition={{ duration: 0.4, repeat: Infinity, repeatType: 'reverse', delay: 0.1 }} className="w-[3px] bg-white rounded-full" />
    <motion.span animate={{ height: [6, 10, 14, 6, 10] }} transition={{ duration: 0.6, repeat: Infinity, repeatType: 'reverse', delay: 0.2 }} className="w-[3px] bg-white rounded-full" />
  </span>
);

export const FullPlayer: React.FC<FullPlayerProps> = ({
  currentPlayingItem,
  isPlaying,
  currentTime,
  duration,
  volume,
  shuffleOn,
  repeatMode,
  queue,
  queueIndex,
  sourceName,
  onClose,
  onTogglePlay,
  onSeekTime,
  onPrev,
  onNext,
  onVolumeChange,
  onToggleShuffle,
  onCycleRepeat,
  onSelectQueueItem,
  onAction,
}) => {
  const { t } = useI18n();
  const [queueOpen, setQueueOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const swipeY = useRef<number | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const volRef = useRef<HTMLDivElement | null>(null);
  const scrubbing = useRef(false);

  if (!currentPlayingItem) return null;

  const title = (currentPlayingItem as any).decryptedName || currentPlayingItem.name;
  const artist =
    (currentPlayingItem as any).decryptedArtist || currentPlayingItem.artist || t('unknownArtist');
  const art = coverSrc(currentPlayingItem);
  const pct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  const ratioFromEvent = (ref: React.RefObject<HTMLDivElement | null>, clientX: number): number => {
    const el = ref.current;
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - r.left) / r.width));
  };

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 220 }}
      className="fixed inset-0 z-[100] bg-black text-white flex flex-col"
      onTouchStart={(e) => {
        const el = e.target as HTMLElement;
        if (el.closest('input,button')) {
          swipeY.current = null;
          return;
        }
        swipeY.current = e.touches[0].clientY;
      }}
      onTouchEnd={(e) => {
        if (swipeY.current === null) return;
        const dy = e.changedTouches[0].clientY - swipeY.current;
        swipeY.current = null;
        if (dy > 90) onClose();
      }}
    >
      {/* Blurred cover as background */}
      <div className="absolute inset-0 overflow-hidden bg-black">
        {art ? (
          <img
            src={art}
            alt=""
            aria-hidden="true"
            draggable={false}
            className="absolute inset-0 w-full h-full object-cover blur-[60px] scale-125 opacity-80 select-none"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 via-black to-black" />
        )}
        <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-black/70 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-black via-black/70 to-transparent" />
      </div>

      {/* Grab handle + source */}
      <div className="relative z-10 pt-10 pb-1 flex flex-col items-center shrink-0">
        <div className="w-10 h-1 rounded-full bg-white/30" />
        <p className="mt-2 px-8 text-[13px] font-semibold text-white truncate max-w-full">
          {t('nowPlayingFrom').replace('{{source}}', sourceName)}
        </p>
      </div>

      {/* Cover */}
      <div className="relative z-10 w-full flex-1 min-h-0 mt-1">
        {art ? (
          <img src={art} alt="" draggable={false} className="absolute inset-0 w-full h-full object-cover select-none" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-zinc-900 to-black">
            <Music size={110} className="text-white/15" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black to-transparent pointer-events-none" />
      </div>

      {/* Bottom section */}
      <div className="relative z-10 shrink-0 px-6 pt-4 pb-8" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 16px))' }}>
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-[22px] font-bold tracking-tight truncate">{title}</h2>
            <p className="text-[17px] text-white/60 truncate">{artist}</p>
          </div>
          <button
            type="button"
            aria-label="More"
            onClick={() => setMenuOpen(true)}
            className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white active:scale-90 transition-transform shrink-0"
          >
            <MoreHorizontal size={24} />
          </button>
        </div>

        {/* Progress */}
        <div className="mt-4">
          <div
            ref={barRef}
            className="h-7 flex items-center cursor-pointer touch-none"
            onPointerDown={(e) => {
              scrubbing.current = true;
              (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
              onSeekTime(ratioFromEvent(barRef, e.clientX) * (duration || 0));
            }}
            onPointerMove={(e) => {
              if (scrubbing.current) onSeekTime(ratioFromEvent(barRef, e.clientX) * (duration || 0));
            }}
            onPointerUp={() => {
              scrubbing.current = false;
            }}
            onPointerCancel={() => {
              scrubbing.current = false;
            }}
          >
            <div className="relative h-1 flex-1 rounded-full bg-white/20">
              <div className="absolute left-0 top-0 bottom-0 rounded-full bg-white" style={{ width: `${pct}%` }} />
              <div
                className="absolute top-1/2 w-3 h-3 rounded-full bg-white shadow"
                style={{ left: `calc(${pct}% - 6px)`, transform: 'translateY(-50%)' }}
              />
            </div>
          </div>
          <div className="flex justify-between text-[13px] text-white/60 tabular-nums">
            <span>{fmt(currentTime)}</span>
            <span>-{fmt(duration - currentTime)}</span>
          </div>
        </div>

        {/* Transport */}
        <div className="mt-3 flex items-center justify-between px-10">
          <button type="button" onClick={onPrev} aria-label="Previous" className="text-white active:scale-90 transition-transform">
            <SkipBack size={44} fill="currentColor" />
          </button>
          <button
            type="button"
            onClick={onTogglePlay}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="text-white active:scale-90 transition-transform"
          >
            {isPlaying ? <Pause size={64} fill="currentColor" /> : <Play size={64} fill="currentColor" className="ml-1" />}
          </button>
          <button type="button" onClick={onNext} aria-label="Next" className="text-white active:scale-90 transition-transform">
            <SkipForward size={44} fill="currentColor" />
          </button>
        </div>

        {/* Volume */}
        <div className="mt-4 flex items-center gap-3">
          <Volume1 size={20} className="text-white/70 shrink-0" />
          <div
            ref={volRef}
            className="h-6 flex-1 flex items-center cursor-pointer touch-none"
            onPointerDown={(e) => {
              (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
              onVolumeChange(ratioFromEvent(volRef, e.clientX));
            }}
            onPointerMove={(e) => {
              if (e.buttons > 0) onVolumeChange(ratioFromEvent(volRef, e.clientX));
            }}
          >
            <div className="relative h-1 flex-1 rounded-full bg-white/20">
              <div className="absolute left-0 top-0 bottom-0 rounded-full bg-white" style={{ width: `${volume * 100}%` }} />
            </div>
          </div>
          <Volume2 size={20} className="text-white/70 shrink-0" />
        </div>

        {/* Modes + queue */}
        <div className="mt-4 flex items-center justify-between px-10">
          <button
            type="button"
            onClick={onToggleShuffle}
            aria-label={t('playerShuffle')}
            className={`active:scale-90 transition-all ${shuffleOn ? '' : 'text-white/50'}`}
            style={shuffleOn ? { color: 'var(--accent-color)' } : undefined}
          >
            <Shuffle size={24} />
          </button>
          <button
            type="button"
            onClick={onCycleRepeat}
            aria-label={t('playerRepeat')}
            className={`relative active:scale-90 transition-all ${repeatMode === 'off' ? 'text-white/50' : ''}`}
            style={repeatMode === 'off' ? undefined : { color: 'var(--accent-color)' }}
          >
            <Repeat size={24} />
            {repeatMode === 'one' && (
              <span className="absolute -top-1 -right-2 text-[10px] font-bold">1</span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setQueueOpen(true)}
            aria-label={t('playerQueue')}
            className="text-white/70 active:scale-90 transition-transform"
          >
            <ListMusic size={26} />
          </button>
        </div>
        <p className="mt-3 text-center text-[13px] text-white/50">{t('nowPlayingDevice')}</p>
      </div>

      {/* Song menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="song-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-end justify-center bg-black/60"
            onClick={() => setMenuOpen(false)}
          >
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-t-[28px] bg-zinc-900 overflow-hidden"
            >
              <div className="px-6 pt-4 pb-2 flex items-center justify-center">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>
              <div className="px-5 pb-3 flex items-center gap-3">
                {art ? (
                  <img src={art} alt="" className="w-12 h-12 rounded-xl object-cover" />
                ) : (
                  <span className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                    <Music size={20} className="text-white/60" />
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[16px] font-semibold text-white truncate">{title}</p>
                  <p className="text-[13px] text-white/60 truncate">{artist}</p>
                </div>
              </div>
              <div className="px-4 pb-6">
                <div className="rounded-2xl overflow-hidden bg-white/5">
                  <SettingsRow
                    icon={<Heart size={19} />}
                    label={t('favorite')}
                    value={currentPlayingItem.isFavorite ? '✓' : undefined}
                    onClick={() => {
                      onAction('favorite', currentPlayingItem);
                      setMenuOpen(false);
                    }}
                  />
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      onAction('delete', currentPlayingItem);
                      setMenuOpen(false);
                      onClose();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        onAction('delete', currentPlayingItem);
                        setMenuOpen(false);
                        onClose();
                      }
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all active:opacity-60 border-t border-white/10"
                  >
                    <span className="text-red-400 shrink-0"><Trash2 size={19} /></span>
                    <span className="flex-1 text-[16px] text-red-400">{t('delete')}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Queue */}
      <AnimatePresence>
        {queueOpen && (
          <motion.div
            key="queue-sheet"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-end justify-center bg-black/60"
            onClick={() => setQueueOpen(false)}
          >
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-t-[28px] bg-zinc-900 overflow-hidden flex flex-col"
              style={{ maxHeight: '70%' }}
            >
              <div className="px-6 pt-4 pb-1 flex items-center justify-center shrink-0">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>
              <p className="pb-3 text-center text-[17px] font-semibold text-white shrink-0">{t('upNext')}</p>
              <div className="overflow-y-auto px-4 pb-6 custom-scrollbar">
                {queue.map((item, i) => {
                  const isCurrent = i === queueIndex;
                  const qArt = coverSrc(item);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onSelectQueueItem(i);
                        setQueueOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-2 py-2 rounded-xl text-left active:bg-white/5 transition-colors"
                    >
                      {qArt ? (
                        <img src={qArt} alt="" className="w-11 h-11 rounded-lg object-cover shrink-0" />
                      ) : (
                        <span className="w-11 h-11 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                          <Music size={18} className="text-white/50" />
                        </span>
                      )}
                      <span className="flex-1 min-w-0">
                        <span className="block text-[15px] font-semibold text-white truncate">
                          {(item as any).decryptedName || item.name}
                        </span>
                        <span className="block text-[13px] text-white/50 truncate">
                          {(item as any).decryptedArtist || item.artist || t('unknownArtist')}
                        </span>
                      </span>
                      {isCurrent && isPlaying && <WhiteEq />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
