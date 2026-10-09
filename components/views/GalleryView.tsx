import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Image as ImageIcon, Video, Heart, X, Info,
  Share2, Trash2, Lock, Play, ChevronLeft, ChevronRight, Check,
} from 'lucide-react';
import { FileSystemItem, AppTheme } from '../../types';
import { sanitize_url as sanitizeUrl } from '../../crypto-core/index';
import { useI18n } from '../../locales/i18nContext';

type GallerySubTab = 'all' | 'photos' | 'videos' | 'favorites';

interface GalleryViewProps {
  items: FileSystemItem[];
  onNavigate: (item: FileSystemItem) => void;
  theme: AppTheme;
  onDecrypt: (item: FileSystemItem) => Promise<string | null>;
  decryptedUrls: Record<string, string>;
  onAction: (action: string, item: FileSystemItem) => void;
}

const GAP = 2;
const COLS = 3;

const SkeletonGrid: React.FC = () => (
  <div className="grid grid-cols-3 gap-[2px]">
    {Array.from({ length: 18 }).map((_, i) => (
      <div key={i} className="aspect-square bg-surface overflow-hidden">
        <div className="w-full h-full glass-shimmer-light" />
      </div>
    ))}
  </div>
);

export const GalleryView: React.FC<GalleryViewProps> = ({ items, onNavigate, theme, onDecrypt, decryptedUrls, onAction }) => {
  const { t } = useI18n();
  const [subTab, setSubTab] = useState<GallerySubTab>('all');
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [decryptingIds, setDecryptingIds] = useState<Set<string>>(new Set());
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [gridWidth, setGridWidth] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const touchX = useRef<number | null>(null);
  const panning = useRef<{ x: number; y: number } | null>(null);

  void onNavigate;
  void theme;

  // Auto-decrypt items that were auto-encrypted during import (no salt, no password needed)
  useEffect(() => {
    const toDecrypt = items.filter(
      item => item.isEncrypted && !item.salt && item.rawBlob && !decryptedUrls[item.id]
    );
    if (toDecrypt.length === 0) return;
    setDecryptingIds(prev => new Set([...prev, ...toDecrypt.map(i => i.id)]));
    Promise.all(toDecrypt.map(item => onDecrypt(item))).then(() => {
      setDecryptingIds(prev => {
        const next = new Set(prev);
        toDecrypt.forEach(i => next.delete(i.id));
        return next;
      });
    });
  }, [items, onDecrypt]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const isMedia = item.category === 'image' || item.category === 'video';
      if (!isMedia) return false;
      if (subTab === 'all') return true;
      if (subTab === 'photos') return item.category === 'image';
      if (subTab === 'videos') return item.category === 'video';
      if (subTab === 'favorites') return item.isFavorite;
      return true;
    });
  }, [items, subTab]);

  useEffect(() => {
    if (filteredItems.length > 0 && isInitialLoading) {
      setIsInitialLoading(false);
    }
  }, [filteredItems]);

  // Keep the viewer index valid when the list changes underneath it
  useEffect(() => {
    if (viewerIndex !== null && viewerIndex >= filteredItems.length) {
      if (filteredItems.length === 0) {
        setViewerIndex(null);
      } else {
        setViewerIndex(filteredItems.length - 1);
      }
    }
  }, [filteredItems.length, viewerIndex]);

  // Measure grid width for square virtualized rows
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => setGridWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const rowHeight = gridWidth > 0 ? (gridWidth - GAP * (COLS - 1)) / COLS : 120;

  const rows = useMemo(() => {
    const r: FileSystemItem[][] = [];
    for (let i = 0; i < filteredItems.length; i += COLS) {
      r.push(filteredItems.slice(i, i + COLS));
    }
    return r;
  }, [filteredItems]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: 4,
  });

  useEffect(() => {
    virtualizer.measure();
  }, [rowHeight, virtualizer]);

  const openViewer = async (index: number) => {
    const item = filteredItems[index];
    if (!item) return;
    if (item.isEncrypted && !decryptedUrls[item.id]) {
      const url = await onDecrypt(item);
      if (!url) return;
    }
    setViewerIndex(index);
    setChromeVisible(true);
    setShowDetails(false);
    setZoomed(false);
    setPan({ x: 0, y: 0 });
  };

  const stepViewer = (dir: 1 | -1) => {
    if (viewerIndex === null) return;
    const next = (viewerIndex + dir + filteredItems.length) % filteredItems.length;
    setZoomed(false);
    setPan({ x: 0, y: 0 });
    setShowDetails(false);
    const item = filteredItems[next];
    if (item?.isEncrypted && !decryptedUrls[item.id]) {
      void onDecrypt(item);
    }
    setViewerIndex(next);
  };

  const viewerItem = viewerIndex !== null ? filteredItems[viewerIndex] : null;
  const viewerSrc = viewerItem
    ? sanitizeUrl(decryptedUrls[viewerItem.id] || viewerItem.url || viewerItem.customIcon || '', '')
    : '';

  const handleShare = async () => {
    if (!viewerItem) return;
    const shareData = { title: (viewerItem as any).decryptedName || viewerItem.name, url: viewerSrc };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(viewerSrc);
      }
    } catch {}
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current === null || zoomed) {
      touchX.current = null;
      return;
    }
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) > 60) {
      stepViewer(dx < 0 ? 1 : -1);
    }
  };

  const handlePanStart = (e: React.PointerEvent) => {
    if (!zoomed) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    panning.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handlePanMove = (e: React.PointerEvent) => {
    if (!zoomed || !panning.current) return;
    setPan({ x: e.clientX - panning.current.x, y: e.clientY - panning.current.y });
  };

  const handlePanEnd = () => {
    panning.current = null;
  };

  const renderTile = (item: FileSystemItem) => {
    if (decryptedUrls[item.id]) {
      if (item.category === 'video') {
        return <video src={decryptedUrls[item.id]} className="absolute inset-0 w-full h-full object-cover" muted playsInline preload="metadata" />;
      }
      return <img src={decryptedUrls[item.id]} className="absolute inset-0 w-full h-full object-cover" alt="" draggable={false} />;
    }
    if (decryptingIds.has(item.id)) {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-surface">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2" style={{ borderColor: 'var(--accent-color)' }} />
        </div>
      );
    }
    if (item.isEncrypted && item.salt) {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-surface">
          <Lock size={20} className="text-muted" />
        </div>
      );
    }
    if (item.url) {
      if (item.category === 'video') {
        return <video src={item.url} className="absolute inset-0 w-full h-full object-cover" muted playsInline preload="metadata" />;
      }
      return <img src={item.url} className="absolute inset-0 w-full h-full object-cover" alt="" draggable={false} />;
    }
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-surface">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2" style={{ borderColor: 'var(--accent-color)' }} />
      </div>
    );
  };

  const tabs: { id: GallerySubTab; label: string }[] = [
    { id: 'all', label: t('all') },
    { id: 'photos', label: t('photos') },
    { id: 'videos', label: t('videos') },
    { id: 'favorites', label: t('favorites') },
  ];

  return (
    <div className="flex flex-col relative font-sans" style={{ height: 'calc(100vh - 320px)' }}>
      <AnimatePresence>
        {viewerItem && viewerIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black flex flex-col"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* Top chrome */}
            <AnimatePresence>
              {chromeVisible && (
                <motion.div
                  initial={{ opacity: 0, y: -16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 pt-12 pb-4 bg-gradient-to-b from-black/70 to-transparent"
                >
                  <button
                    onClick={() => setViewerIndex(null)}
                    aria-label={t('close')}
                    className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white active:scale-90 transition-transform"
                  >
                    <X size={20} />
                  </button>
                  <span className="text-[15px] font-semibold text-white tabular-nums">
                    {viewerIndex + 1} / {filteredItems.length}
                  </span>
                  <button
                    onClick={() => setShowDetails(v => !v)}
                    aria-label="Info"
                    className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white active:scale-90 transition-transform"
                  >
                    <Info size={20} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Media */}
            <div
              className="flex-1 flex items-center justify-center relative overflow-hidden"
              onClick={() => {
                if (!showDetails) setChromeVisible(v => !v);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                setZoomed(z => !z);
                setPan({ x: 0, y: 0 });
              }}
            >
              {viewerItem.category === 'video' ? (
                <video
                  key={viewerItem.id}
                  src={viewerSrc}
                  controls
                  autoPlay
                  playsInline
                  className="max-w-full max-h-full"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <motion.div
                  key={viewerItem.id}
                  className={zoomed ? 'w-full h-full overflow-hidden cursor-grab active:cursor-grabbing' : 'max-w-full max-h-full'}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  onPointerDown={handlePanStart}
                  onPointerMove={handlePanMove}
                  onPointerUp={handlePanEnd}
                  onPointerCancel={handlePanEnd}
                >
                  <img
                    src={viewerSrc}
                    alt={(viewerItem as any).decryptedName || viewerItem.name}
                    draggable={false}
                    className={zoomed ? 'w-full h-full object-contain max-w-none select-none' : 'max-w-full max-h-full object-contain select-none'}
                    style={zoomed ? { transform: `scale(2.2) translate(${pan.x / 2.2}px, ${pan.y / 2.2}px)` } : undefined}
                  />
                </motion.div>
              )}

              {/* Prev / next */}
              {chromeVisible && filteredItems.length > 1 && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); stepViewer(-1); }}
                    aria-label="Previous"
                    className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white active:scale-90 transition-transform"
                  >
                    <ChevronLeft size={22} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); stepViewer(1); }}
                    aria-label="Next"
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white active:scale-90 transition-transform"
                  >
                    <ChevronRight size={22} />
                  </button>
                </>
              )}
            </div>

            {/* Details panel */}
            <AnimatePresence>
              {showDetails && (
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 24 }}
                  className="absolute bottom-24 left-4 right-4 z-20 rounded-2xl bg-zinc-900/95 backdrop-blur-xl border border-white/10 p-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className="text-[16px] font-semibold text-white truncate">
                    {(viewerItem as any).decryptedName || viewerItem.name}
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-[13px] text-zinc-400">
                    <span>{viewerItem.date || '—'}</span>
                    <span>•</span>
                    <span>{viewerItem.size || '—'}</span>
                    {viewerItem.isEncrypted && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-[12px] font-bold uppercase tracking-wide" style={{ color: 'var(--accent-color)' }}>
                          <Lock size={11} /> {t('encryptedFile')}
                        </span>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bottom toolbar */}
            <AnimatePresence>
              {chromeVisible && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 16 }}
                  className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-around px-8 pb-10 pt-4 bg-gradient-to-t from-black/70 to-transparent"
                >
                  <button onClick={handleShare} className="flex flex-col items-center gap-1.5 text-white active:scale-90 transition-transform">
                    <Share2 size={22} />
                    <span className="text-[10px] font-semibold">{t('share')}</span>
                  </button>
                  <button
                    onClick={() => onAction('favorite', viewerItem)}
                    className="flex flex-col items-center gap-1.5 text-white active:scale-90 transition-transform"
                  >
                    <Heart size={22} className={viewerItem.isFavorite ? 'fill-white' : ''} />
                    <span className="text-[10px] font-semibold">{t('favorite')}</span>
                  </button>
                  <button
                    onClick={() => {
                      onAction('delete', viewerItem);
                      setViewerIndex(null);
                    }}
                    className="flex flex-col items-center gap-1.5 text-red-400 active:scale-90 transition-transform"
                  >
                    <Trash2 size={22} />
                    <span className="text-[10px] font-semibold">{t('delete')}</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Segmented filter */}
      <div className="shrink-0 px-5 pb-2">
        <div className="flex rounded-full p-1" style={{ backgroundColor: 'var(--onb-surface)' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setSubTab(tab.id);
                setIsInitialLoading(true);
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
        <p className="pt-2 text-center text-[12px] text-muted tabular-nums">
          {filteredItems.length} {t('items')}
        </p>
      </div>

      {filteredItems.length === 0 && !isInitialLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
            style={{ backgroundColor: 'var(--onb-surface-strong)', color: 'var(--accent-color)' }}
          >
            {subTab === 'favorites' ? <Heart size={36} /> : <ImageIcon size={36} />}
          </div>
          <p className="text-[17px] font-semibold text-primary">{t('noMediaFound')}</p>
          <p className="mt-1 text-[14px] text-muted">{t('libraryEmpty')}</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto" ref={scrollRef}>
          {isInitialLoading ? (
            <SkeletonGrid />
          ) : (
            <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
              {virtualizer.getVirtualItems().map(virtualRow => {
                const rowItems = rows[virtualRow.index];
                return (
                  <div
                    key={virtualRow.index}
                    className="gallery-row"
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${virtualRow.start}px)` }}
                  >
                    <div className="grid grid-cols-3 gap-[2px]">
                      {rowItems.map(item => (
                        <motion.button
                          key={item.id}
                          type="button"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.25 }}
                          onClick={() => openViewer(filteredItems.indexOf(item))}
                          className="relative aspect-square overflow-hidden bg-surface cursor-pointer active:opacity-70 transition-opacity"
                        >
                          {renderTile(item)}
                          {item.category === 'video' && (decryptedUrls[item.id] || item.url) && (
                            <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <span className="w-9 h-9 rounded-full bg-black/45 backdrop-blur-sm flex items-center justify-center">
                                <Play size={16} fill="white" className="text-white ml-0.5" />
                              </span>
                            </span>
                          )}
                          {!!item.isFavorite && (
                            <span className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/45 backdrop-blur-sm flex items-center justify-center pointer-events-none">
                              <Heart size={12} fill="white" className="text-white" />
                            </span>
                          )}
                          {item.isEncrypted && !decryptedUrls[item.id] && !decryptingIds.has(item.id) && (
                            <span className="absolute bottom-1.5 left-1.5 w-6 h-6 rounded-full bg-black/45 backdrop-blur-sm flex items-center justify-center pointer-events-none">
                              <Lock size={12} className="text-white" />
                            </span>
                          )}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
