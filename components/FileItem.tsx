import React, { useState, useRef, useEffect } from 'react';
import { File as FileIcon, Image as ImageIcon, Video as VideoIcon, Music as MusicIcon, FileText as FileTextIcon, Lock, Check, MoreVertical, ShieldCheck } from 'lucide-react';
import { FolderIcon } from './FolderIcon';
import { motion } from 'framer-motion';
import { FileSystemItem, AppTheme } from '../types';
import { is_safe_image_url as isSafeImageUrl } from '../crypto-core/index';
import { useI18n } from '../locales/i18nContext';
import { loadIconPack } from '../utils/iconPacks';

export const FileItem: React.FC<{
  item: FileSystemItem;
  onAction: (action: string) => void;
  onClick: () => void;
  theme: AppTheme;
  minimal?: boolean;
  onOpenMenu?: () => void;
  isRenaming?: boolean;
  renameValue?: string;
  onRenameChange?: (val: string) => void;
  onRenameConfirm?: () => void;
  onRenameCancel?: () => void;
  isSelected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
  layout?: 'list' | 'grid';
  thumbnailUrl?: string;
}> = ({
    item, onAction, onClick, theme, minimal, onOpenMenu,
    isRenaming, renameValue, onRenameChange, onRenameConfirm, onRenameCancel,
    isSelected, onSelect, layout = 'list', thumbnailUrl
}) => {

  const { t } = useI18n();
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Custom icon state: resolved lazily (icon packs load on demand, not in the bundle).
  const [RenderedIcon, setRenderedIcon] = useState<React.ReactNode | null>(null);
  const [customIconBg, setCustomIconBg] = useState<string | null>(null);

  useEffect(() => {
    if (isRenaming) {
        renameInputRef.current?.focus();
        renameInputRef.current?.select();
    }
  }, [isRenaming]);

  useEffect(() => {
    let alive = true;
    const iconStr = item.customIcon || '';
    if (!iconStr) {
      setRenderedIcon(null);
      setCustomIconBg(null);
      return;
    }

    // 1. Image URL (sanitized)
    if (isSafeImageUrl(iconStr)) {
      setRenderedIcon(<img src={iconStr} className="w-full h-full object-cover" />);
      setCustomIconBg('border border-border bg-surface p-0 overflow-hidden');
      return;
    }
    // 2. Emoji
    if (iconStr.startsWith('emoji:')) {
      const emojiChar = iconStr.replace('emoji:', '');
      setRenderedIcon(<span className="text-2xl leading-none flex items-center justify-center h-full pb-1">{emojiChar}</span>);
      setCustomIconBg('border border-border bg-surface/50');
      return;
    }
    // 3. Dynamic Icon Packs (prefix:name) — lazy chunk; legacy bare names map to lucide
    const hasColon = iconStr.includes(':');
    const [prefix, name] = hasColon ? iconStr.split(':') : ['lucide', iconStr];
    const packKey = prefix || 'lucide';
    loadIconPack(packKey)
      .then((pack) => {
        if (!alive) return;
        const IconComp = pack[name];
        if (IconComp && typeof IconComp === 'function') {
          setRenderedIcon(<IconComp className={`w-full h-full ${packKey === 'lucide' ? '' : 'p-0.5'} text-black`} size={packKey === 'lucide' ? 24 : '100%'} />);
          setCustomIconBg('bg-neon-green border-none');
        } else {
          setRenderedIcon(null);
          setCustomIconBg(null);
        }
      })
      .catch(() => {
        if (!alive) return;
        setRenderedIcon(null);
        setCustomIconBg(null);
      });
    return () => { alive = false; };
  }, [item.customIcon]);

  // Helper to shorten algo name for display
  const getAlgoDisplay = (algo?: string) => {
      if (!algo) return 'AES-GCM';
      return algo.replace('-Poly1305', '').replace('ChaCha20', 'CHACHA').replace('Salsa20', 'SALSA');
  };

  // Default fallback
  let DefaultIcon = FileIcon;
  let iconColorClass = "text-muted";
  let iconBgClass = RenderedIcon
    ? (customIconBg ?? "bg-transparent border border-border")
    : "bg-[var(--onb-surface-strong)] border-none";

  if (!RenderedIcon) {
    if (item.type === 'system' || item.type === 'folder') {
        DefaultIcon = FolderIcon as unknown as typeof FileIcon; iconColorClass = "text-[var(--accent-color)]";
    } else {
        if (item.category === 'image') { DefaultIcon = ImageIcon; iconColorClass = "text-[var(--accent-color)]"; }
        else if (item.category === 'video') { DefaultIcon = VideoIcon; iconColorClass = "text-[var(--accent-color)]"; }
        else if (item.category === 'audio') { DefaultIcon = MusicIcon; iconColorClass = "text-[var(--accent-color)]"; }
        else if (item.category === 'doc') { DefaultIcon = FileTextIcon; iconColorClass = "text-[var(--accent-color)]"; }
    }
  }

  const isBareFolder = !RenderedIcon && (item.type === 'folder' || item.type === 'system');

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenMenu && item.type !== 'system') {
        onOpenMenu();
    }
  };

  if (minimal) {
    return (
      <motion.div 
        onClick={onClick}
        className="group flex items-center px-2 py-2 rounded-xl cursor-pointer file-item transition-colors active:bg-white/5"
        whileTap={{ scale: 0.99 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      >
        {isBareFolder ? (
          <div className="w-10 h-10 flex items-center justify-center mr-4 shrink-0" style={{ color: 'var(--accent-color)' }}>
            <FolderIcon size={36} />
          </div>
        ) : (
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-4 bg-surface shrink-0 overflow-hidden`}>
          {RenderedIcon || <DefaultIcon size={20} className={iconColorClass} />}
        </div>
        )}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold truncate text-primary">{(item as any).decryptedName || item.name}</h4>
          {item.isEncrypted && item.salt && (
              <div className="flex items-center gap-1 mt-0.5">
                  <Lock size={8} className="text-neon-green" />
                  <span className="text-[8px] font-mono text-neon-green">{getAlgoDisplay(item.algorithm)}</span>
              </div>
          )}
        </div>
      </motion.div>
    );
  }

  if (layout === 'grid') {
    const thumb = thumbnailUrl || (!item.isEncrypted ? item.url : undefined);
    const showThumb = !!thumb && (item.category === 'image' || item.category === 'video');
    const isGridDefault = !RenderedIcon && !showThumb;
    const displayName = (item as any).decryptedName || item.name;
    return (
      <motion.div
        onClick={!isRenaming ? onClick : undefined}
        className="relative flex flex-col items-center px-1 py-3 rounded-2xl cursor-pointer transition-colors active:bg-white/5"
        style={isSelected ? { backgroundColor: 'rgba(var(--accent-rgb), 0.12)' } : undefined}
        whileTap={!isRenaming && !isSelected ? { scale: 0.97 } : undefined}
      >
        <div className="relative">
          {(item.type === 'folder' || item.type === 'system') && !RenderedIcon && !showThumb ? (
            <div className="w-16 h-16 flex items-center justify-center" style={{ color: 'var(--accent-color)' }}>
              <FolderIcon size={58} />
            </div>
          ) : (
          <div
            className={`w-16 h-16 rounded-[20px] flex items-center justify-center overflow-hidden ${showThumb ? 'border border-border' : isGridDefault ? '' : iconBgClass}`}
            style={isGridDefault ? { backgroundColor: 'var(--onb-surface-strong)' } : undefined}
          >
            {showThumb ? (
              item.category === 'video' ? (
                <video src={thumb} className="w-full h-full object-cover" muted playsInline preload="metadata" />
              ) : (
                <img src={thumb} className="w-full h-full object-cover" alt="" draggable={false} />
              )
            ) : RenderedIcon ? (
              RenderedIcon
            ) : (
              <DefaultIcon
                size={30}
                strokeWidth={1.75}
                className={isGridDefault ? undefined : iconColorClass}
                style={isGridDefault ? { color: 'var(--accent-color)' } : undefined}
              />
            )}
          </div>
          )}
          {item.isEncrypted && item.salt && (
            <span className="absolute bottom-1 left-1 w-5 h-5 rounded-full bg-black/55 backdrop-blur-sm flex items-center justify-center pointer-events-none">
              <Lock size={10} className="text-white" />
            </span>
          )}
          {isSelected ? (
            <span className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--accent-color)' }}>
              <Check size={13} strokeWidth={3} style={{ color: 'var(--accent-contrast)' }} />
            </span>
          ) : !isRenaming && item.type !== 'system' && (
            <button
              onClick={handleMenuClick}
              aria-label="More"
              className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-black/45 backdrop-blur-sm text-white flex items-center justify-center active:scale-90 transition-transform"
            >
              <MoreVertical size={13} />
            </button>
          )}
        </div>
        {isRenaming ? (
          <input
            ref={renameInputRef}
            value={renameValue}
            onChange={(e) => onRenameChange?.(e.target.value)}
            onBlur={onRenameConfirm}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onRenameConfirm?.();
              if (e.key === 'Escape') onRenameCancel?.();
            }}
            className="mt-2 w-full bg-transparent border-none outline-none text-center text-[13px] font-semibold text-primary p-0"
          />
        ) : (
          <p className="mt-2 h-8 text-[13px] font-semibold text-center leading-4 text-primary line-clamp-2 px-0.5">{displayName}</p>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      onClick={!isRenaming ? onClick : undefined}
      className="relative w-full px-2 py-2 rounded-xl transition-colors cursor-pointer active:bg-white/5"
      style={isSelected ? { backgroundColor: 'rgba(var(--accent-rgb), 0.1)' } : undefined}
      whileTap={!isRenaming && !isSelected ? { scale: 0.99 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <div className="flex items-center gap-3">
        {isBareFolder ? (
          <div className="w-11 h-11 flex items-center justify-center shrink-0" style={{ color: 'var(--accent-color)' }}>
            <FolderIcon size={40} />
          </div>
        ) : (
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center overflow-hidden shrink-0 ${iconBgClass}`}>
           {RenderedIcon || <DefaultIcon size={22} className={iconColorClass} strokeWidth={2} />}
        </div>
        )}
        <div className="min-w-0 flex-1">
          {isRenaming ? (
            <input
                ref={renameInputRef}
                value={renameValue}
                onChange={(e) => onRenameChange?.(e.target.value)}
                onBlur={onRenameConfirm}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') onRenameConfirm?.();
                    if (e.key === 'Escape') onRenameCancel?.();
                }}
                className="w-full bg-transparent border-none outline-none text-[16px] font-semibold text-primary p-0 truncate"
            />
          ) : (
            <h4 className="text-[16px] font-semibold text-primary truncate">{(item as any).decryptedName || item.name}</h4>
          )}

          {!isRenaming && ((item as any).decryptedTags || item.tags) && ((item as any).decryptedTags || item.tags).length > 0 && (
            <div className="flex gap-1 flex-wrap mt-0.5">
                {((item as any).decryptedTags || item.tags).map((t: any) => (
                    <span key={t.id} className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide text-black" style={{ backgroundColor: t.color }}>
                        {t.label}
                    </span>
                ))}
            </div>
          )}

          {!isRenaming && (
            <div className="flex items-center gap-1.5 mt-0.5 text-[12px] text-muted">
              {item.status ? (
                <span className={`font-bold ${item.status === 'Active' ? '' : ''}`} style={item.status === 'Active' ? { color: 'var(--accent-color)' } : undefined}>
                  {item.status}
                </span>
              ) : (
                <>
                  <span className="truncate">{item.date}</span>
                  <span>•</span>
                  <span className="shrink-0">{item.size || t('folder')}</span>
                </>
              )}
              {item.isEncrypted && item.salt && (
                <span className="flex items-center gap-1 font-mono font-bold uppercase tracking-widest shrink-0" style={{ color: 'var(--accent-color)', fontSize: '10px' }}>
                  <ShieldCheck size={10} />
                  {getAlgoDisplay(item.algorithm)}
                </span>
              )}
            </div>
          )}
        </div>

        {isSelected ? (
          <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--accent-color)' }}>
            <Check size={13} strokeWidth={3} style={{ color: 'var(--accent-contrast)' }} />
          </div>
        ) : !isRenaming && item.type !== 'system' && (
          <button
              onClick={handleMenuClick}
              aria-label="More"
              className="p-2 -mr-2 rounded-full transition-colors text-muted active:opacity-60"
          >
              <MoreVertical size={19} />
          </button>
        )}
      </div>
    </motion.div>
  );
};