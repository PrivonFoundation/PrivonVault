
import React, { useState, useRef, useEffect } from 'react';
import * as LucideIcons from 'lucide-react';
import * as HeroIcons from '@heroicons/react/24/solid';
import * as FaIcons from 'react-icons/fa';
import * as MdIcons from 'react-icons/md';
import * as BsIcons from 'react-icons/bs';
import * as BiIcons from 'react-icons/bi';
import * as IoIcons from 'react-icons/io5';
import * as RiIcons from 'react-icons/ri';
import * as TbIcons from 'react-icons/tb';

import { motion, AnimatePresence } from 'framer-motion';
import { FileSystemItem, AppTheme } from '../types';
import { is_safe_image_url as isSafeImageUrl } from '../crypto-core/index';
import { useI18n } from '../locales/i18nContext';

// Map namespaces
const ICON_PACKS: Record<string, any> = {
    'lucide': LucideIcons,
    'hero': HeroIcons,
    'fa': FaIcons,
    'md': MdIcons,
    'bs': BsIcons,
    'bi': BiIcons,
    'io': IoIcons,
    'ri': RiIcons,
    'tb': TbIcons
};

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
}> = ({
    item, onAction, onClick, theme, minimal, onOpenMenu,
    isRenaming, renameValue, onRenameChange, onRenameConfirm, onRenameCancel,
    isSelected, onSelect
}) => {

  const { t } = useI18n();
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming) {
        renameInputRef.current?.focus();
        renameInputRef.current?.select();
    }
  }, [isRenaming]);

  // Helper to shorten algo name for display
  const getAlgoDisplay = (algo?: string) => {
      if (!algo) return 'AES-GCM';
      return algo.replace('-Poly1305', '').replace('ChaCha20', 'CHACHA').replace('Salsa20', 'SALSA');
  };

  // Default fallback
  let DefaultIcon = LucideIcons.File;
  let iconColorClass = "text-muted";
  let iconBgClass = "bg-transparent border border-border";
  
  // Determine if Custom Icon exists
  const hasCustomIcon = !!item.customIcon;
  let RenderedIcon = null;

  if (hasCustomIcon) {
     const iconStr = item.customIcon || '';

      // 1. Image URL (sanitized)
       if (isSafeImageUrl(iconStr)) {
          RenderedIcon = <img src={iconStr} className="w-full h-full object-cover" />;
          iconBgClass = "border border-border bg-surface p-0 overflow-hidden";
      } 
     // 2. Emoji
     else if (iconStr.startsWith('emoji:')) {
         const emojiChar = iconStr.replace('emoji:', '');
         RenderedIcon = <span className="text-2xl leading-none flex items-center justify-center h-full pb-1">{emojiChar}</span>;
         iconBgClass = "border border-border bg-surface/50";
     }
     // 3. Dynamic Icon Packs (prefix:name)
      else if (iconStr.includes(':')) {
          const [prefix, name] = iconStr.split(':');
          const pack = ICON_PACKS[prefix];
          if (pack) {
              const IconComp = pack[name];
              if (IconComp && (typeof IconComp === 'function' || typeof IconComp === 'object')) {
                  RenderedIcon = <IconComp className={`w-full h-full ${prefix === 'lucide' ? '' : 'p-0.5'} text-black`} size={prefix === 'lucide' ? 24 : '100%'} />;
                  iconBgClass = "bg-neon-green border-none";
              }
          }
      }
      // 4. Legacy Lucide (Fallback)
      else if (LucideIcons[iconStr as keyof typeof LucideIcons]) {
          const LucideComp = LucideIcons[iconStr as keyof typeof LucideIcons] as React.ElementType;
          if (LucideComp && (typeof LucideComp === 'function' || typeof LucideComp === 'object')) {
             RenderedIcon = <LucideComp size={24} className="text-black" />;
             iconBgClass = "bg-neon-green border-none";
          }
      }
  }

  // Fallback Logic if no custom icon
  if (!RenderedIcon) {
    if (item.name === t('systemFolderVault' as any)) {
        DefaultIcon = LucideIcons.Vault; iconColorClass = "text-black"; iconBgClass = "bg-neon-green border-none";
    } else if (item.name === t('systemFolderBackup' as any)) {
        DefaultIcon = LucideIcons.RefreshCcw; iconColorClass = "text-black"; iconBgClass = "bg-neon-green border-none"; 
    } else if (item.type === 'folder') {
        DefaultIcon = LucideIcons.Folder; iconColorClass = "text-black"; iconBgClass = "bg-neon-green border-none";
    } else {
        if (item.category === 'image') { DefaultIcon = LucideIcons.Image; iconColorClass = "text-black"; }
        else if (item.category === 'video') { DefaultIcon = LucideIcons.Video; iconColorClass = "text-black"; }
        else if (item.category === 'audio') { DefaultIcon = LucideIcons.Music; iconColorClass = "text-black"; }
        else if (item.category === 'doc') { DefaultIcon = LucideIcons.FileText; iconColorClass = "text-black"; }
        iconBgClass = "bg-neon-green border-none";
    }
  }

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenMenu && item.type !== 'system') {
        onOpenMenu();
    }
  };

  if (minimal) {
    return (
      <div 
        onClick={onClick}
        className="group flex items-center p-3 rounded-xl glass-card transition-all cursor-pointer active:scale-[0.98] hover:border-neon-green hover:shadow-md"
      >
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-4 bg-surface shrink-0 overflow-hidden`}>
          {RenderedIcon || <DefaultIcon size={20} className={iconColorClass} />}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold truncate text-primary">{(item as any).decryptedName || item.name}</h4>
          {item.isEncrypted && item.salt && (
              <div className="flex items-center gap-1 mt-0.5">
                  <LucideIcons.Lock size={8} className="text-neon-green" />
                  <span className="text-[8px] font-mono text-neon-green">{getAlgoDisplay(item.algorithm)}</span>
              </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={!isRenaming ? onClick : undefined}
      className={`relative w-full p-4 rounded-2xl transition-all duration-200 cursor-pointer mb-4 glass-card overflow-hidden hover:-translate-y-1 ${isRenaming ? 'border-neon-green ring-1 ring-neon-green' : isSelected ? 'border-neon-green ring-2 ring-neon-green' : 'active:scale-[0.98]'}`}
    >
      {isSelected && (
        <div className="absolute top-2 right-2 w-5 h-5 bg-neon-green rounded-full flex items-center justify-center">
          <LucideIcons.Check size={12} className="text-black" />
        </div>
      )}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden shrink-0 ${iconBgClass}`}>
             {RenderedIcon || <DefaultIcon size={24} className={iconColorClass} strokeWidth={2} />}
          </div>
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
                    className="w-full bg-transparent border-none outline-none text-lg font-bold text-neon-green p-0 truncate"
                />
            ) : (
                <h4 className="text-lg font-bold text-primary mb-1 truncate">{(item as any).decryptedName || item.name}</h4>
            )}
            
            {!isRenaming && ((item as any).decryptedTags || item.tags) && ((item as any).decryptedTags || item.tags).length > 0 && (
                <div className="flex gap-1 flex-wrap">
                    {((item as any).decryptedTags || item.tags).map((t: any) => (
                        <span key={t.id} className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide text-black" style={{ backgroundColor: t.color }}>
                            {t.label}
                        </span>
                    ))}
                </div>
            )}
          </div>
        </div>
        
        {!isRenaming && item.type !== 'system' && (
            <div className="relative">
                <button 
                    onClick={handleMenuClick}
                    className="p-2 rounded-full transition-colors hover:bg-surface text-muted"
                >
                    <LucideIcons.MoreVertical size={20} />
                </button>
            </div>
        )}
      </div>
      <div>
        {item.status ? (
          <span className={`inline-block px-4 py-1.5 rounded-full text-xs font-bold tracking-wide ${
            item.status === 'Active' 
              ? 'bg-neon-green text-black' 
              : 'bg-surface text-muted'
          }`}>
            {item.status}
          </span>
        ) : (
          <div className={`flex items-center justify-between mt-1 ${isRenaming ? 'opacity-0' : 'pl-16'}`}>
             <div className="flex items-center gap-2 text-xs text-muted font-mono">
                 <span>{item.date}</span>
                 <span>•</span>
                 <span>{item.size || t('folder')}</span>
             </div>

              {/* ENCRYPTION BADGE - Only show for manual encryption (has salt) */}
              {item.isEncrypted && item.salt && (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-black border border-neon-green/30 shadow-[0_0_10px_rgba(var(--accent-rgb),0.15)]">
                      <LucideIcons.ShieldCheck size={10} className="text-neon-green" />
                      <span className="text-[9px] font-black text-neon-green font-mono uppercase tracking-widest">
                         {getAlgoDisplay(item.algorithm)}
                      </span>
                  </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
};
