
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { 
  Image as ImageIcon, Video, Heart, Image, Play, X, 
  Grid3X3, Share2, Trash2, Info, Lock, Unlock
} from 'lucide-react';
import { FileSystemItem, AppTheme } from '../../types';
import { sanitize_url as sanitizeUrl } from '../../crypto-core/index';
import { useI18n } from '../../locales/i18nContext';
import snowGalleryImg from '../../assets/snow-gallery.png';

type GallerySubTab = 'all' | 'photos' | 'videos' | 'favorites' | 'albums';

interface GalleryViewProps {
  items: FileSystemItem[];
  onNavigate: (item: FileSystemItem) => void;
  theme: AppTheme;
  onDecrypt: (item: FileSystemItem) => Promise<string | null>;
  decryptedUrls: Record<string, string>;
}

const ROW_HEIGHT = 280;

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.05 },
  },
};

const fadeUpItem = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: 'easeOut' as const },
  },
};

const cardHover = {
  rest: { scale: 1, y: 0 },
  hover: {
    scale: 1.02,
    y: -4,
    boxShadow: '0 16px 40px rgba(var(--accent-rgb), 0.18)',
    transition: { type: 'spring' as const, stiffness: 300, damping: 18 },
  },
};

const SkeletonGrid: React.FC<{ count: number }> = ({ count }) => {
  const rows = Math.min(count, 8);
  return (
    <div className="p-3">
      {Array.from({ length: rows }).map((_, ri) => (
        <div key={ri} className="grid grid-cols-2 gap-3 mb-3">
          {[0, 1].map(ci => (
            <div key={ci} className="aspect-[4/5] bg-surface rounded-2xl overflow-hidden">
              <div className="w-full h-full glass-shimmer-light" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export const GalleryView: React.FC<GalleryViewProps> = ({ items, onNavigate, theme, onDecrypt, decryptedUrls }) => {
  const { t } = useI18n();
  const [subTab, setSubTab] = useState<GallerySubTab>('all');
  const [lightboxItem, setLightboxItem] = useState<FileSystemItem | null>(null);
  const [decryptingIds, setDecryptingIds] = useState<Set<string>>(new Set());
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  const rows = useMemo(() => {
    const r: FileSystemItem[][] = [];
    for (let i = 0; i < filteredItems.length; i += 2) {
      r.push([filteredItems[i], filteredItems[i + 1]]);
    }
    return r;
  }, [filteredItems]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 3,
  });

  const handleItemClick = async (item: FileSystemItem) => {
    if (item.isEncrypted && !decryptedUrls[item.id]) {
      const url = await onDecrypt(item);
      if (!url) return;
    }
    setLightboxItem(item);
  };

  return (
    <div className="flex flex-col relative font-sans" style={{ height: 'calc(100vh - 320px)' }}>
      <AnimatePresence>
        {lightboxItem && (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-xl flex flex-col"
                onClick={() => setLightboxItem(null)}
            >
                <div 
                    className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-black/80 to-transparent z-50 flex items-center justify-end px-6 pt-4"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center gap-4">
                        <button className="p-2 rounded-full text-white hover:text-neon-green transition-colors"><Info size={24} /></button>
                        <button className="p-2 rounded-full text-white hover:text-red-500 transition-colors"><Trash2 size={24} /></button>
                    </div>
                </div>

                <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
                    {lightboxItem.category === 'video' ? (
                        <video 
                            src={decryptedUrls[lightboxItem.id] || lightboxItem.url} 
                            controls 
                            autoPlay 
                            className="max-w-full max-h-full rounded-lg shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <img 
                            src={sanitizeUrl(decryptedUrls[lightboxItem.id] || lightboxItem.url || lightboxItem.customIcon || '', '')} 
                            alt={(lightboxItem as any).decryptedName || lightboxItem.name} 
                            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        />
                    )}
                </div>

                <div 
                    className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/90 to-transparent z-50 flex items-center justify-center pb-6 gap-6"
                    onClick={(e) => e.stopPropagation()}
                >
                    <button className="flex flex-col items-center gap-1 text-zinc-400 hover:text-white transition-colors">
                        <Share2 size={20} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">{t('share') || 'Distribuie'}</span>
                    </button>
                    <button className="flex flex-col items-center gap-1 text-zinc-400 hover:text-white transition-colors">
                        <Heart size={20} className={lightboxItem.isFavorite ? "fill-neon-green text-neon-green" : ""} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">{t('favorite') || 'Favorit'}</span>
                    </button>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar px-1 border-b border-border mb-1 shrink-0">
        {[
          { id: 'all', label: t('all') || 'Toate', icon: <Grid3X3 size={12} /> },
          { id: 'photos', label: t('photos') || 'Poze', icon: <ImageIcon size={12} /> },
          { id: 'videos', label: t('videos') || 'Video', icon: <Video size={12} /> },
          { id: 'favorites', label: t('favorites') || 'Favorite', icon: <Heart size={12} /> },
          { id: 'albums', label: t('albums') || 'Albume', icon: <Image size={12} /> },
        ].map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setSubTab(tab.id as GallerySubTab)}
            className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap border ${subTab === tab.id ? 'bg-neon-green text-black border-neon-green' : 'bg-surface text-muted border-border hover:text-primary hover:border-primary'}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {filteredItems.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-8">
          <div className="glass-card rounded-[24px] p-4 max-w-xs w-full flex flex-col items-center">
            <div className="w-40 h-40 rounded-2xl overflow-hidden -mt-10 mb-4 shadow-xl glass-snow-float">
              <img src={snowGalleryImg} alt="Snow" className="w-full h-full object-cover" />
            </div>
            <div className="text-center px-2 pb-2">
              <h4 className="text-sm font-bold text-white text-center mb-2">Snow is preparing the gallery</h4>
              <p className="text-xs text-zinc-300 text-center leading-relaxed">I'm working on photo editing, video editing and more. Thanks for exploring this beta with me!</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-1" ref={scrollRef}>
          {isInitialLoading ? (
            <SkeletonGrid count={rows.length} />
          ) : (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              style={{ height: virtualizer.getTotalSize(), position: 'relative' }}
            >
              {virtualizer.getVirtualItems().map(virtualRow => {
                const rowItems = rows[virtualRow.index];
                return (
                  <div
                    key={virtualRow.index}
                    className="gallery-row"
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${virtualRow.start}px)` }}
                  >
                    <div className="grid grid-cols-2 gap-3 p-3">
                      {[0, 1].map(ci => {
                        const item = rowItems[ci];
                        if (!item) return <div key={`empty-${ci}`} className="aspect-[4/5]" />;
                        return (
                          <motion.div
                            key={item.id}
                            variants={fadeUpItem}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: '-50px' }}
                            custom={virtualRow.index * 2 + ci}
                          >
                            <motion.div
                              variants={cardHover}
                              onClick={() => handleItemClick(item)}
                              className="relative aspect-[4/5] bg-surface rounded-2xl overflow-hidden cursor-pointer group shadow-lg border border-border hover:border-neon-green/50 transition-colors"
                              style={{ perspective: 800 }}
                              whileHover={{ rotateX: 3, rotateY: -2 }}
                              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                            >
                            {decryptedUrls[item.id] ? (
                              item.category === 'video' ? (
                                <video src={decryptedUrls[item.id]} className="w-full h-full object-cover" muted />
                              ) : (
                                <img src={decryptedUrls[item.id]} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={(item as any).decryptedName || item.name} />
                              )
                            ) : decryptingIds.has(item.id) ? (
                              <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900/80">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-neon-green mb-2"></div>
                                <p className="text-[10px] text-zinc-400 font-bold text-center px-2">{t('decrypting')}</p>
                              </div>
                            ) : item.isEncrypted && item.salt ? (
                              <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900/80">
                                <Lock size={32} className="text-neon-green mb-2" />
                                <p className="text-[10px] text-zinc-400 font-bold text-center px-2">{t('clickToDecrypt')}</p>
                              </div>
                            ) : item.url ? (
                              item.category === 'video' ? (
                                <video src={item.url} className="w-full h-full object-cover" muted />
                              ) : (
                                <img src={item.url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={item.name} />
                              )
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-neon-green"></div>
                              </div>
                            )}

                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300" />
                            
                            {item.category === 'video' && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-lg group-hover:scale-110 transition-transform">
                                        <Play fill="white" className="text-white ml-1" />
                                    </div>
                                </div>
                            )}

                            <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                                <p className="text-xs font-bold text-white truncate">{(item as any).decryptedName || item.name}</p>
                                <p className="text-[10px] text-zinc-400">{item.size}</p>
                            </div>
                          </motion.div>
                        </motion.div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </motion.div>
          )}
        </div>
      )}
    </div>
  );
};
