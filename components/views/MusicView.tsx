import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, ListMusic, Play, Shuffle, Heart, MoreHorizontal, Trash2, X } from 'lucide-react';
import { FileSystemItem, AppTheme } from '../../types';
import { is_safe_image_url as isSafeImageUrl } from '../../crypto-core/index';
import { useI18n } from '../../locales/i18nContext';
import { SettingsRow } from './SettingsView';

type MusicSubTab = 'songs' | 'albums' | 'artists' | 'favorites';

interface MusicViewProps {
  items: FileSystemItem[];
  onPlay: (item: FileSystemItem) => void;
  currentSong: FileSystemItem | null;
  isPlaying: boolean;
  theme: AppTheme;
  onAction: (action: string, item: FileSystemItem) => void;
}

const coverSrc = (item: FileSystemItem): string | null => {
  const src = (item as any).decryptedCustomIcon || (item as any).decryptedCoverUrl || item.customIcon || item.coverUrl;
  return src && isSafeImageUrl(src) ? src : null;
};

const songName = (item: FileSystemItem): string => (item as any).decryptedName || item.name;
const songArtist = (item: FileSystemItem, fallback: string): string =>
  (item as any).decryptedArtist || item.artist || fallback;
const songAlbum = (item: FileSystemItem, fallback: string): string =>
  (item as any).decryptedAlbum || item.album || fallback;

// Animated Equalizer Component
const Equalizer: React.FC<{ size?: 'sm' | 'md' }> = ({ size = 'md' }) => {
  const h = size === 'sm' ? 'h-3' : 'h-4';
  return (
    <div className={`flex items-end gap-[2px] ${h}`}>
      <motion.div animate={{ height: [4, 12, 6, 16, 8] }} transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }} className="w-1 rounded-full" style={{ backgroundColor: 'var(--accent-color)' }} />
      <motion.div animate={{ height: [8, 16, 8, 4, 12] }} transition={{ duration: 0.4, repeat: Infinity, repeatType: 'reverse', delay: 0.1 }} className="w-1 rounded-full" style={{ backgroundColor: 'var(--accent-color)' }} />
      <motion.div animate={{ height: [6, 10, 16, 6, 10] }} transition={{ duration: 0.6, repeat: Infinity, repeatType: 'reverse', delay: 0.2 }} className="w-1 rounded-full" style={{ backgroundColor: 'var(--accent-color)' }} />
    </div>
  );
};

const Artwork: React.FC<{ item?: FileSystemItem; size: string; iconSize: number; dimmed?: boolean; overlay?: React.ReactNode }> = ({ item, size, iconSize, dimmed, overlay }) => {
  const src = item ? coverSrc(item) : null;
  return (
    <div className={`${size} rounded-xl overflow-hidden relative shrink-0 flex items-center justify-center`} style={{ backgroundColor: 'var(--onb-surface-strong)' }}>
      {src ? (
        <img src={src} className={`w-full h-full object-cover ${dimmed ? 'opacity-40' : ''}`} alt="" draggable={false} />
      ) : (
        <Music size={iconSize} className="text-muted" />
      )}
      {overlay}
    </div>
  );
};

export const MusicView: React.FC<MusicViewProps> = ({ items, onPlay, currentSong, isPlaying, theme, onAction }) => {
  const { t } = useI18n();
  const [subTab, setSubTab] = useState<MusicSubTab>('songs');
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [sheetItem, setSheetItem] = useState<FileSystemItem | null>(null);

  void theme;

  const songs = useMemo(() => items.filter(item => item.category === 'audio'), [items]);

  const favorites = useMemo(() => songs.filter(s => s.isFavorite), [songs]);

  const albums = useMemo(() => {
    const map = new Map<string, FileSystemItem[]>();
    for (const s of songs) {
      const key = songAlbum(s, t('unknown'));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [songs, t]);

  const artists = useMemo(() => {
    const map = new Map<string, FileSystemItem[]>();
    for (const s of songs) {
      const key = songArtist(s, t('unknownArtist'));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [songs, t]);

  const quickPicks = useMemo(() => songs.slice(0, 5), [songs]);

  const shufflePlay = () => {
    if (songs.length === 0) return;
    onPlay(songs[Math.floor(Math.random() * songs.length)]);
  };

  const renderSongRow = (item: FileSystemItem) => {
    const isCurrent = currentSong?.id === item.id;
    const src = coverSrc(item);
    return (
      <div
        key={item.id}
        onClick={() => onPlay(item)}
        className="flex items-center gap-3 px-2 py-2 rounded-2xl cursor-pointer transition-all active:opacity-60 hover:bg-[var(--onb-surface)]"
      >
        <div className="w-[52px] h-[52px] rounded-xl overflow-hidden relative shrink-0 flex items-center justify-center" style={{ backgroundColor: 'var(--onb-surface-strong)' }}>
          {src ? (
            <img src={src} className={`w-full h-full object-cover ${isCurrent && isPlaying ? 'opacity-40' : ''}`} alt="" draggable={false} />
          ) : (
            <Music size={22} className="text-muted" />
          )}
          {isCurrent && isPlaying && (
            <span className="absolute inset-0 flex items-center justify-center">
              <Equalizer size="sm" />
            </span>
          )}
          {isCurrent && !isPlaying && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/30">
              <Play size={18} fill="white" className="text-white ml-0.5" />
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[16px] font-semibold truncate" style={isCurrent ? { color: 'var(--accent-color)' } : undefined}>
            <span className={isCurrent ? '' : 'text-primary'}>{songName(item)}</span>
          </p>
          <p className="text-[13px] text-muted truncate">{songArtist(item, t('unknownArtist'))}</p>
        </div>
        {item.isFavorite && <Heart size={15} className="text-muted shrink-0" fill="currentColor" />}
        <button
          type="button"
          aria-label="More"
          onClick={(e) => {
            e.stopPropagation();
            setSheetItem(item);
          }}
          className="p-2 -mr-2 rounded-full text-muted active:opacity-60 transition-opacity"
        >
          <MoreHorizontal size={20} />
        </button>
      </div>
    );
  };

  const renderGroupRow = (
    key: string,
    kind: 'album' | 'artist',
    title: string,
    list: FileSystemItem[],
  ) => {
    const art = list.find(s => coverSrc(s));
    const expanded = expandedGroup === `${kind}:${key}`;
    return (
      <div key={`${kind}:${key}`}>
        <div
          onClick={() => setExpandedGroup(expanded ? null : `${kind}:${key}`)}
          className="flex items-center gap-3 px-2 py-2 rounded-2xl cursor-pointer transition-all active:opacity-60 hover:bg-[var(--onb-surface)]"
        >
          <Artwork item={art} size="w-[52px] h-[52px]" iconSize={22} />
          <div className="flex-1 min-w-0">
            <p className="text-[16px] font-semibold text-primary truncate">{title}</p>
            <p className="text-[13px] text-muted truncate">
              {list.length} {t('songs')} {kind === 'album' ? `· ${songArtist(list[0], t('unknownArtist'))}` : ''}
            </p>
          </div>
          <motion.span animate={{ rotate: expanded ? 90 : 0 }} className="text-muted shrink-0 pr-1">
            <ListMusic size={18} />
          </motion.span>
        </div>
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="pl-4 pb-2">{list.map(renderSongRow)}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const tabs: { id: MusicSubTab; label: string }[] = [
    { id: 'songs', label: t('songs') },
    { id: 'albums', label: t('albums') },
    { id: 'artists', label: t('artists') },
    { id: 'favorites', label: t('favorites') },
  ];

  const emptyIcon = subTab === 'favorites' ? <Heart size={36} /> : <Music size={36} />;
  const isEmpty =
    subTab === 'songs' ? songs.length === 0 :
    subTab === 'albums' ? albums.length === 0 :
    subTab === 'artists' ? artists.length === 0 :
    favorites.length === 0;

  return (
    <div className="flex flex-col relative font-sans" style={{ height: 'calc(100vh - 320px)' }}>
      {/* Segmented filter */}
      <div className="shrink-0 px-5 pb-3">
        <div className="flex rounded-full p-1" style={{ backgroundColor: 'var(--onb-surface)' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setSubTab(tab.id);
                setExpandedGroup(null);
              }}
              className={`flex-1 py-1.5 rounded-full text-[13px] font-semibold transition-all active:scale-[0.97] truncate ${
                subTab === tab.id ? 'text-primary shadow' : 'text-muted'
              }`}
              style={subTab === tab.id ? { backgroundColor: 'var(--onb-surface-strong)' } : undefined}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {isEmpty ? (
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
            style={{ backgroundColor: 'var(--onb-surface-strong)', color: 'var(--accent-color)' }}
          >
            {emptyIcon}
          </div>
          <p className="text-[17px] font-semibold text-primary">{t('noMediaFound')}</p>
          <p className="mt-1 text-[14px] text-muted">{t('libraryEmpty')}</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-3 pb-32 no-scrollbar">
          {subTab === 'songs' && quickPicks.length > 1 && (
            <div className="mb-6 pt-1">
              <div className="flex items-center justify-between mb-3 px-2">
                <h3 className="text-[20px] font-bold tracking-tight text-primary">{t('quickPicksLabel')}</h3>
                <button
                  type="button"
                  onClick={shufflePlay}
                  aria-label="Shuffle"
                  className="w-10 h-10 rounded-full flex items-center justify-center text-primary transition-all active:scale-90"
                  style={{ backgroundColor: 'var(--onb-surface-strong)' }}
                >
                  <Shuffle size={18} />
                </button>
              </div>
              <div className="flex gap-4 overflow-x-auto no-scrollbar px-2 pb-2">
                {quickPicks.map((item) => {
                  const isCurrent = currentSong?.id === item.id;
                  const src = coverSrc(item);
                  return (
                    <div
                      key={item.id}
                      onClick={() => onPlay(item)}
                      className="min-w-[148px] max-w-[148px] flex flex-col gap-2 cursor-pointer active:opacity-70 transition-opacity"
                    >
                      <div className="w-[148px] h-[148px] rounded-2xl overflow-hidden relative" style={{ backgroundColor: 'var(--onb-surface-strong)' }}>
                        {src ? (
                          <img src={src} className="w-full h-full object-cover" alt="" draggable={false} />
                        ) : (
                          <span className="w-full h-full flex items-center justify-center">
                            <Music size={44} className="text-muted" />
                          </span>
                        )}
                        {isCurrent && isPlaying && (
                          <span className="absolute bottom-2 left-2 rounded-full bg-black/50 backdrop-blur-sm px-2 py-1.5">
                            <Equalizer size="sm" />
                          </span>
                        )}
                      </div>
                      <div className="px-0.5">
                        <p className="text-[14px] font-semibold truncate" style={isCurrent ? { color: 'var(--accent-color)' } : undefined}>
                          <span className={isCurrent ? '' : 'text-primary'}>{songName(item)}</span>
                        </p>
                        <p className="text-[12px] text-muted truncate">{songArtist(item, t('unknownArtist'))}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {subTab === 'songs' && (
            <div className="px-2 pb-2 flex items-center justify-between">
              <h3 className="text-[20px] font-bold tracking-tight text-primary">{t('keepListening')}</h3>
            </div>
          )}

          <div className="flex flex-col">
            {subTab === 'songs' && songs.map(renderSongRow)}
            {subTab === 'albums' && albums.map(([name, list]) => renderGroupRow(name, 'album', name, list))}
            {subTab === 'artists' && artists.map(([name, list]) => renderGroupRow(name, 'artist', name, list))}
            {subTab === 'favorites' && favorites.map(renderSongRow)}
          </div>
        </div>
      )}

      {/* Song action sheet */}
      <AnimatePresence>
        {sheetItem && (
          <motion.div
            key="song-sheet"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-end justify-center bg-black/60"
            onClick={() => setSheetItem(null)}
          >
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-t-[28px] border-t border-x bg-background overflow-hidden"
              style={{ borderColor: 'var(--onb-border)' }}
            >
              <div className="px-6 pt-4 pb-2 flex items-center justify-center">
                <div className="w-10 h-1 rounded-full bg-[var(--onb-border)]" />
              </div>
              <div className="px-5 pb-3 flex items-center gap-3">
                <Artwork item={sheetItem} size="w-12 h-12" iconSize={20} />
                <div className="flex-1 min-w-0">
                  <p className="text-[16px] font-semibold text-primary truncate">{songName(sheetItem)}</p>
                  <p className="text-[13px] text-muted truncate">{songArtist(sheetItem, t('unknownArtist'))}</p>
                </div>
                <button
                  type="button"
                  aria-label={t('close')}
                  onClick={() => setSheetItem(null)}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-muted"
                  style={{ backgroundColor: 'var(--onb-surface)' }}
                >
                  <X size={17} />
                </button>
              </div>
              <div className="px-4 pb-6">
                <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--onb-surface-strong)' }}>
                  <SettingsRow
                    icon={<Play size={19} />}
                    label={t('keepListening')}
                    onClick={() => {
                      onPlay(sheetItem);
                      setSheetItem(null);
                    }}
                  />
                  <SettingsRow
                    icon={<Heart size={19} />}
                    label={t('favorite')}
                    value={sheetItem.isFavorite ? '✓' : undefined}
                    onClick={() => {
                      onAction('favorite', sheetItem);
                      setSheetItem(null);
                    }}
                  />
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      onAction('delete', sheetItem);
                      setSheetItem(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        onAction('delete', sheetItem);
                        setSheetItem(null);
                      }
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all active:opacity-60 border-t"
                    style={{ borderTopColor: 'var(--onb-border)' }}
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
    </div>
  );
};
