import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, FolderPlus, Settings, Trash2, Upload } from 'lucide-react';
import { useI18n } from '../locales/i18nContext';
import { SettingsRow } from './views/SettingsView';
import type { ViewState } from '../types';

const Sheet: React.FC<{ open: boolean; onClose: () => void; children: React.ReactNode }> = ({ open, onClose, children }) => (
  <AnimatePresence>
    {open && (
      <motion.div
        key="home-sheet"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[150] flex items-end justify-center bg-black/60"
        onClick={onClose}
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
          <div className="px-4 pt-1 pb-6 custom-scrollbar">{children}</div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

export const ProfileSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  onNavigate: (view: ViewState) => void;
}> = ({ open, onClose, onNavigate }) => {
  const { t } = useI18n();
  const go = (view: ViewState) => {
    onClose();
    onNavigate(view);
  };
  return (
    <Sheet open={open} onClose={onClose}>
      <div className="pt-1 pb-4 flex items-center gap-4 px-2">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-semibold text-primary shrink-0"
          style={{ backgroundColor: 'var(--onb-surface-strong)' }}
        >
          P
        </div>
        <div className="min-w-0">
          <p className="text-[19px] font-bold tracking-tight text-primary truncate">
            {t('crytoPrefix')} {t('toolSuffix')}
          </p>
          <p className="text-[13px] text-muted truncate">{t('allInOnePrivacyTagline')}</p>
        </div>
      </div>
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--onb-surface-strong)' }}>
        <SettingsRow icon={<Settings size={19} />} label={t('settings')} onClick={() => go('settings')} />
        <SettingsRow icon={<Database size={19} />} label={t('storage')} onClick={() => go('storage')} />
        <SettingsRow icon={<Trash2 size={19} />} label={t('trash')} onClick={() => go('trash')} />
      </div>
    </Sheet>
  );
};

export const AddSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  onAddFile: () => void;
  onNewFolder: () => void;
}> = ({ open, onClose, onAddFile, onNewFolder }) => {
  const { t } = useI18n();
  return (
    <Sheet open={open} onClose={onClose}>
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--onb-surface-strong)' }}>
        <SettingsRow
          icon={<Upload size={19} />}
          label={t('addFile')}
          onClick={() => {
            onClose();
            onAddFile();
          }}
        />
        <SettingsRow
          icon={<FolderPlus size={19} />}
          label={t('addFolder')}
          onClick={() => {
            onClose();
            onNewFolder();
          }}
        />
      </div>
    </Sheet>
  );
};
