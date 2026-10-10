import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Disc, User, Play, Shuffle, Heart, MoreHorizontal, Trash2, X, ChevronLeft } from 'lucide-react';
import { FileSystemItem, AppTheme } from '../../types';
import { is_safe_image_url as isSafeImageUrl } from '../../crypto-core/index';
import { useI18n } from '../../locales/i18nContext';
import { SettingsRow } from './SettingsView';
import { Virtuoso } from 'react-virtuoso';

interface MusicViewProps {
  items: FileSystemItem[];
  onPlay: (item: FileSystemItem, list?: FileSystemItem[]) => void;
  currentSong: FileSystemItem | null;
  isPlaying: boolean;
  theme: AppTheme;
  onAction: (action: string, item: FileSystemItem) => void;
}

// Cache sanitize results per URL — avoids a WASM call for every song on every render.
const urlCache = new Map<string, string | null>();
const coverSrc = (item: FileSystemItem): string | null => {
  const src = (item as any).decryptedCustomIcon || (item as any).decryptedCoverUrl || item.customIcon || item.coverUrl;
  if (!src) return null;
  if (urlCache.has(src)) return urlCache.get(src) || null;
  const safe = isSafeImageUrl(src) ? src : null;
  urlCache.set(src, safe);
  return safe;
};

const songName = (item: FileSystemItem): string => (item as any).decryptedName || item.name;
const songArtist = (item: FileSystemItem, fallback: string): string =>
  (item as any).decryptedArtist || item.artist || fallback;
const songAlbum = (item: FileSystemItem, fallback: string): string =>
  (item as any).decryptedAlbum || item.album || fallback;

const Equalizer: React.FC = () => (
  <span className="flex items-end gap-[2px] h-3.5">
    <motion.span animate={{ height: [4, 12, 6, 14, 8] }} transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }} className="w-[3px] rounded-full" style={{ backgroundColor: 'var(--accent-color)' }} />
    <motion.span animate={{ height: [8, 14, 8, 4, 12] }} transition={{ duration: 0.4, repeat: Infinity, repeatType: 'reverse', delay: 0.1 }} className="w-[3px] rounded-full" style={{ backgroundColor: 'var(--accent-color)' }} />
    <motion.span animate={{ height: [6, 10, 14, 6, 10] }} transition={{ duration: 0.6, repeat: Infinity, repeatType: 'reverse', delay: 0.2 }} className="w-[3px] rounded-full" style={{ backgroundColor: 'var(--accent-color)' }} />
  </span>
);

const BigCard: React.FC<{
  title: string;
  subtitle: string;
  art: string | null;
  playing?: boolean;
  fallbackIcon?: React.ReactNode;
  onPress: () => void;
  onMore?: () => void;
}> = ({ title, subtitle, art, playing, fallbackIcon, onPress, onMore }) => (
  <div className="min-w-[168px] max-w-[168px] shrink-0 cursor-pointer active:opacity-80 transition-opacity" onClick={onPress}>
    <div className="relative w-[168px] h-[168px] rounded-[22px] overflow-hidden" style={{ backgroundColor: 'var(--onb-surface-strong)' }}>
      {art ? (
        <img src={art} className="w-full h-full object-cover" alt="" draggable={false} />
      ) : (
        <span className="w-full h-full flex items-center justify-center text-muted">{fallbackIcon}</span>
      )}
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/75 to-transparent pointer-events-none" />
      {playing && (
        <span className="absolute bottom-2.5 left-2.5 rounded-full bg-black/55 backdrop-blur-sm px-2 py-1.5">
          <Equalizer />
        </span>
      )}
      {onMore && (
        <button
          type="button"
          aria-label="More"
          onClick={(e) => {
            e.stopPropagation();
            onMore();
          }}
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/45 backdrop-blur-sm text-white flex items-center justify-center active:scale-90 transition-transform"
        >
          <MoreHorizontal size={16} />
        </button>
      )}
    </div>
    <p className="mt-2 px-1 text-[15px] font-bold text-primary truncate">{title}</p>
    <p className="px-1 text-[13px] text-muted truncate">{subtitle}</p>
  </div>
);

export const MusicView: React.FC<MusicViewProps> = ({ items, onPlay, currentSong, isPlaying, theme, onAction }) => {
  const { t } = useI18n();
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

  const quickPicks = useMemo(() => songs.slice(0, 8), [songs]);

  const shufflePlay = () => {
    if (songs.length === 0) return;
    const pick = songs[Math.floor(Math.random() * songs.length)];
    onPlay(pick, songs);
  };

  const playAlbum = (list: FileSystemItem[]) => {
    if (list.length > 0) onPlay(list[0], list);
  };

  const renderSongRow = (item: FileSystemItem) => {
    const isCurrent = currentSong?.id === item.id;
    const src = coverSrc(item);
    return (
      <div
        key={item.id}
        onClick={() => onPlay(item, songs)}
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
              <Equalizer />
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

  const renderHeader = () => (
    <div className="mx-auto w-full max-w-xl">
      {/* Quick picks */}
      {quickPicks.length > 1 && (
        <section className="mt-4">
          <div className="px-5 mb-3 flex items-center justify-between">
            <h3 className="text-[20px] font-bold tracking-tight text-primary">{t('quickPicksLabel')}</h3>
            <button
              type="button"
              onClick={shufflePlay}
              aria-label={t('playerShuffle')}
              className="w-10 h-10 rounded-full flex items-center justify-center text-primary transition-all active:scale-90"
              style={{ backgroundColor: 'var(--onb-surface-strong)' }}
            >
              <Shuffle size={18} />
            </button>
          </div>
          <div className="flex gap-4 overflow-x-auto no-scrollbar px-5 pb-2">
            {quickPicks.map((item) => (
              <BigCard
                key={item.id}
                title={songName(item)}
                subtitle={songArtist(item, t('unknownArtist'))}
                art={coverSrc(item)}
                playing={currentSong?.id === item.id && isPlaying}
                fallbackIcon={<Music size={44} />}
                onPress={() => onPlay(item, songs)}
                onMore={() => setSheetItem(item)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Albums */}
      {albums.length > 0 && (
        <section className="mt-7">
          <h3 className="px-5 mb-3 text-[20px] font-bold tracking-tight text-primary capitalize">{t('albums')}</h3>
          <div className="flex gap-4 overflow-x-auto no-scrollbar px-5 pb-2">
            {albums.map(([name, list]) => {
              const art = list.find(s => coverSrc(s));
              return (
                <BigCard
                  key={name}
                  title={name}
                  subtitle={`${list.length} ${t('songs')} · ${songArtist(list[0], t('unknownArtist'))}`}
                  art={art ? coverSrc(art) : null}
                  fallbackIcon={<Disc size={44} />}
                  onPress={() => playAlbum(list)}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Artists */}
      {artists.length > 1 && (
        <section className="mt-7">
          <h3 className="px-5 mb-3 text-[20px] font-bold tracking-tight text-primary capitalize">{t('artists')}</h3>
          <div className="flex gap-5 overflow-x-auto no-scrollbar px-5 pb-2">
            {artists.map(([name, list]) => {
              const art = list.find(s => coverSrc(s));
              const artSrc = art ? coverSrc(art) : null;
              return (
                <div
                  key={name}
                  onClick={() => playAlbum(list)}
                  className="flex flex-col items-center gap-2 shrink-0 w-20 cursor-pointer active:opacity-70 transition-opacity"
                >
                  {artSrc ? (
                    <img src={artSrc} className="w-20 h-20 rounded-full object-cover" alt="" draggable={false} />
                  ) : (
                    <span
                      className="w-20 h-20 rounded-full flex items-center justify-center text-muted"
                      style={{ backgroundColor: 'var(--onb-surface-strong)' }}
                    >
                      <User size={30} />
                    </span>
                  )}
                  <p className="text-[13px] font-semibold text-primary text-center leading-tight line-clamp-2">{name}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Favorites */}
      {favorites.length > 0 && (
        <section className="mt-7">
          <h3 className="px-5 mb-3 text-[20px] font-bold tracking-tight text-primary capitalize">{t('favorites')}</h3>
          <div className="flex gap-4 overflow-x-auto no-scrollbar px-5 pb-2">
            {favorites.map((item) => (
              <BigCard
                key={item.id}
                title={songName(item)}
                subtitle={songArtist(item, t('unknownArtist'))}
                art={coverSrc(item)}
                playing={currentSong?.id === item.id && isPlaying}
                fallbackIcon={<Heart size={40} />}
                onPress={() => onPlay(item, favorites)}
                onMore={() => setSheetItem(item)}
              />
            ))}
          </div>
        </section>
      )}

      {/* All songs */}
      <section className="mt-7 px-3">
        <h3 className="px-2 mb-2 text-[20px] font-bold tracking-tight text-primary">{t('allSongs')}</h3>
      </section>
    </div>
  );

  if (songs.length === 0) {
    return (
      <div className="flex-1 flex flex-col min-h-0 relative">
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
            style={{ backgroundColor: 'var(--onb-surface-strong)', color: 'var(--accent-color)' }}
          >
            <Music size={36} />
          </div>
          <p className="text-[17px] font-semibold text-primary">{t('noMediaFound')}</p>
          <p className="mt-1 text-[14px] text-muted">{t('libraryEmpty')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      <Virtuoso
        style={{ flex: 1 }}
        className="no-scrollbar pt-12 pb-28"
        totalCount={songs.length}
        overscan={14}
        components={{ Header: renderHeader }}
        itemContent={(index) => renderSongRow(songs[index])}
      />

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
                {coverSrc(sheetItem) ? (
                  <img src={coverSrc(sheetItem)!} alt="" className="w-12 h-12 rounded-xl object-cover" />
                ) : (
                  <span
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-muted"
                    style={{ backgroundColor: 'var(--onb-surface)' }}
                  >
                    <Music size={20} />
                  </span>
                )}
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
                      onPlay(sheetItem, songs);
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
