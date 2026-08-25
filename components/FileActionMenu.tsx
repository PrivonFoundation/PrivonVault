
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Settings, Edit, Trash2,
  Copy, FolderOpen, Lock, Unlock, ShieldCheck,
  MoreHorizontal, Archive, Move, Square
} from 'lucide-react';
import { FileSystemItem } from '../types';
import { is_safe_image_url as isSafeImageUrl } from '../crypto-core/index';
import { useI18n } from '../locales/i18nContext';

interface FileActionMenuProps {
  isOpen: boolean;
  onClose: () => void;
  item: FileSystemItem | null;
  onAction: (action: string, item: FileSystemItem) => void;
}

export const FileActionMenu: React.FC<FileActionMenuProps> = ({ isOpen, onClose, item, onAction }) => {
  const { t } = useI18n();
  if (!item) return null;

  const handleAction = (action: string) => {
    onAction(action, item);
    onClose();
  };

  const ActionBtn: React.FC<{
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    variant?: 'default' | 'danger';
  }> = ({ icon, label, onClick, variant = 'default' }) => {
    const isDanger = variant === 'danger';
    
    return (
      <motion.button 
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        className={`
          flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl border transition-all relative overflow-hidden
          ${isDanger ? 'bg-red-500/10 border-red-500/30 hover:border-red-500' : 'bg-surface/30 border-border hover:bg-surface/60 hover:border-neon-green/50'}
        `}
      >
        <span className="relative z-10 flex flex-col items-center justify-center gap-1">
          <div className={`
            p-1.5 rounded-lg bg-surface/30 
            ${isDanger ? 'text-red-500' : 'text-muted'}
          `}>
            {React.cloneElement(icon as React.ReactElement<any>, { size: 16 })}
          </div>
          <span className={`text-[7px] font-bold uppercase tracking-wider ${isDanger ? 'text-red-500' : 'text-primary'}`}>{label}</span>
        </span>
      </motion.button>
    );
  };

  const ListBtn: React.FC<{
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    variant?: 'default' | 'danger';
  }> = ({ icon, label, onClick, variant = 'default' }) => {
    const isDanger = variant === 'danger';
    return (
      <motion.button 
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className={`
          w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left relative overflow-hidden
          ${isDanger ? 'hover:bg-red-500/10' : 'hover:bg-surface/50 hover:border-neon-green/20'}
        `}
      >
        <span className="relative z-10 flex items-center gap-3">
          <div className={`p-1.5 rounded-lg bg-surface/30 ${isDanger ? 'text-red-500' : 'text-muted'}`}>
            {React.cloneElement(icon as React.ReactElement<any>, { size: 16 })}
          </div>
          <span className={`text-sm font-medium ${isDanger ? 'text-red-500' : 'text-primary'}`}>{label}</span>
        </span>
      </motion.button>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-md"
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 350 }}
            className="fixed bottom-0 left-0 right-0 z-[120] rounded-t-[28px] overflow-hidden shadow-[0_-5px_40px_rgba(0,0,0,0.4)] max-h-[75vh] flex flex-col"
            style={{ background: 'var(--bg-surface)' }}
          >
            <div className="w-full flex justify-center pt-3 pb-2" onClick={onClose}>
                <div className="w-10 h-1 rounded-full bg-muted/30" />
            </div>

            <div className="px-5 pb-3">
                <div className="flex items-center gap-3 p-3 rounded-2xl glass-card">
                    <div className="w-12 h-12 rounded-xl glass-card border border-border flex items-center justify-center shrink-0 overflow-hidden">
                     {item.customIcon && isSafeImageUrl(item.customIcon) ? (
                              <img src={item.customIcon} className="w-full h-full object-cover" />
                         ) : (
                             <FolderOpen size={22} className="text-neon-green" />
                         )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-base font-bold text-primary truncate">{item.name}</h3>
                        <p className="text-[10px] text-muted font-mono">{item.size || 'Folder'} • {item.date}</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-4 custom-scrollbar">
                <div className="grid grid-cols-3 gap-2">
                    <ActionBtn icon={<Lock />} label={t('encrypt')} onClick={() => handleAction('encrypt')} />
                    <ActionBtn icon={<Unlock />} label={t('decrypt')} onClick={() => handleAction('decrypt')} />
                    <ActionBtn icon={<Settings />} label={t('style')} onClick={() => handleAction('customize')} />
                </div>

                <div className="rounded-2xl glass-card border border-border overflow-hidden">
                    <ListBtn icon={<Edit />} label={t('rename')} onClick={() => handleAction('rename')} />
                    <ListBtn icon={<Copy />} label={t('duplicateAction')} onClick={() => handleAction('duplicate')} />
                    <ListBtn icon={<Square />} label={t('select')} onClick={() => handleAction('select')} />
                    <ListBtn icon={<Move />} label={t('moveAction')} onClick={() => handleAction('move')} />
                    <ListBtn icon={<Archive />} label={t('copyFile')} onClick={() => handleAction('copy')} />
                </div>

                <motion.button 
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleAction('delete')}
                    className="w-full py-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-500 font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 hover:bg-red-500/20 hover:border-red-500/50 transition-all relative overflow-hidden"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <Trash2 size={14} />
                    {t('deleteFile')}
                  </span>
                </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
