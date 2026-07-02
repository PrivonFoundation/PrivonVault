import React, { useState } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { HardDrive, Search, Trash2, Clock, ArrowRight } from 'lucide-react';
import { useI18n } from '../locales/i18nContext';
import { FileSystemItem } from '../types';
import { LiquidGlassOverlay } from './LiquidGlassOverlay';

interface StorageStats {
  used: number;
  limit: number;
  breakdown: { image: number; video: number; audio: number; doc: number; other: number };
}

interface WidgetCarouselProps {
  storageStats: StorageStats;
  formatBytes: (bytes: number) => string;
  trashItems: FileSystemItem[];
  recentItems: FileSystemItem[];
  onNavigateView: (view: 'storage' | 'search' | 'trash') => void;
  onNavigateItem: (item: FileSystemItem) => void;
}

const SWIPE_THRESHOLD = 50;

export const WidgetCarousel: React.FC<WidgetCarouselProps> = ({
  storageStats,
  formatBytes,
  trashItems,
  recentItems,
  onNavigateView,
  onNavigateItem,
}) => {
  const { t } = useI18n();
  const [page, setPage] = useState(0);

  const widgets = [
    { key: 'storage', icon: <HardDrive size={14} /> },
    { key: 'search', icon: <Search size={14} /> },
    { key: 'trash', icon: <Trash2 size={14} /> },
    { key: 'activity', icon: <Clock size={14} /> },
  ];

  const totalPages = widgets.length;

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x < -SWIPE_THRESHOLD && page < totalPages - 1) {
      setPage(p => p + 1);
    } else if (info.offset.x > SWIPE_THRESHOLD && page > 0) {
      setPage(p => p - 1);
    }
  };

  const slideVariants = {
    enter: (direction: number) => ({ x: direction > 0 ? 200 : -200, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({ x: direction > 0 ? -200 : 200, opacity: 0 }),
  };

  const [direction, setDirection] = useState(0);

  const goTo = (newPage: number) => {
    setDirection(newPage > page ? 1 : -1);
    setPage(newPage);
  };

  const renderWidget = () => {
    switch (widgets[page].key) {
      case 'storage':
        return (
          <div key="storage" className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <HardDrive size={16} className="text-muted shrink-0" />
              <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{t('storage')}</span>
              <span className="ml-auto text-xs font-bold" style={{ color: 'var(--text-main)' }}>
                {formatBytes(storageStats.used)} / {formatBytes(storageStats.limit)}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden mb-3">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min((storageStats.used / storageStats.limit) * 100, 100)}%`,
                  backgroundColor: 'var(--accent-color)',
                }}
              />
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {(['image', 'video', 'audio', 'doc', 'other'] as const).map(cat => (
                <div key={cat} className="text-center">
                  <div className="text-[10px] font-bold" style={{ color: 'var(--text-main)' }}>
                    {storageStats.breakdown[cat]}
                  </div>
                  <div className="text-[8px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    {cat === 'doc' ? 'docs' : cat}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => onNavigateView('storage')}
              className="mt-3 w-full flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-widest py-2 rounded-xl transition-all active:scale-[0.97] border border-white/5"
              style={{ color: 'var(--text-muted)' }}
            >
              {t('storage')} <ArrowRight size={10} />
            </button>
          </div>
        );

      case 'search':
        return (
          <div key="search" className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Search size={16} className="text-muted shrink-0" />
              <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{t('search')}</span>
            </div>
            <button
              onClick={() => onNavigateView('search')}
              className="w-full flex items-center gap-3 p-3 rounded-xl transition-all active:scale-[0.97] border border-white/5"
              style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)' }}
            >
              <Search size={14} className="text-muted" />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('search')}...</span>
            </button>
            <button
              onClick={() => onNavigateView('search')}
              className="mt-2 w-full flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-widest py-2 rounded-xl transition-all active:scale-[0.97] border border-white/5"
              style={{ color: 'var(--text-muted)' }}
            >
              {t('search')} <ArrowRight size={10} />
            </button>
          </div>
        );

      case 'trash':
        return (
          <div key="trash" className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Trash2 size={16} className="text-muted shrink-0" />
              <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{t('trash')}</span>
              <span className="ml-auto text-[10px] font-bold" style={{ color: 'var(--text-main)' }}>
                {trashItems.length}
              </span>
            </div>
            {trashItems.length === 0 ? (
              <p className="text-[11px] text-center py-4" style={{ color: 'var(--text-muted)' }}>
                {t('trashEmpty')}
              </p>
            ) : (
              <div className="space-y-1.5">
                {trashItems.slice(0, 3).map(item => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2.5 p-2 rounded-lg"
                    style={{ background: 'rgba(255,255,255,0.03)' }}
                  >
                    <div className="w-7 h-7 rounded-lg bg-surface flex items-center justify-center shrink-0">
                      <Trash2 size={12} className="text-muted" />
                    </div>
                    <span className="text-[11px] truncate flex-1" style={{ color: 'var(--text-main)' }}>
                      {item.name}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => onNavigateView('trash')}
              className="mt-3 w-full flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-widest py-2 rounded-xl transition-all active:scale-[0.97] border border-white/5"
              style={{ color: 'var(--text-muted)' }}
            >
              {t('trash')} <ArrowRight size={10} />
            </button>
          </div>
        );

      case 'activity':
        return (
          <div key="activity" className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Clock size={16} className="text-muted shrink-0" />
              <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{t('recentFiles')}</span>
            </div>
            {recentItems.length === 0 ? (
              <p className="text-[11px] text-center py-4" style={{ color: 'var(--text-muted)' }}>
                {t('noFilesYet')}
              </p>
            ) : (
              <div className="space-y-1.5">
                {recentItems.slice(0, 3).map(item => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-all active:scale-[0.98]"
                    style={{ background: 'rgba(255,255,255,0.03)' }}
                    onClick={() => onNavigateItem(item)}
                  >
                    <div className="w-7 h-7 rounded-lg bg-surface flex items-center justify-center shrink-0">
                      <Clock size={12} className="text-muted" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[11px] truncate block" style={{ color: 'var(--text-main)' }}>
                        {item.name}
                      </span>
                      <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                        {item.date}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="mt-4">
      <div className="glass-card rounded-2xl overflow-hidden relative">
        <LiquidGlassOverlay intensity="subtle" />
        <div className="relative z-10 overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={page}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEnd}
            >
              {renderWidget()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Page indicators */}
      <div className="flex items-center justify-center gap-1.5 mt-2.5">
        {widgets.map((w, i) => (
          <button
            key={w.key}
            onClick={() => goTo(i)}
            className={`transition-all duration-300 rounded-full ${
              i === page
                ? 'w-5 h-1.5'
                : 'w-1.5 h-1.5'
            }`}
            style={{
              backgroundColor: i === page ? 'var(--accent-color)' : 'rgba(255,255,255,0.15)',
            }}
          />
        ))}
      </div>
    </div>
  );
};
