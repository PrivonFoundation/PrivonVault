import React from 'react';
import { FolderPlus, Plus, Search } from 'lucide-react';
import type { ViewState } from '../types';
import { useI18n } from '../locales/i18nContext';
import type { TranslationKey } from '../locales';

interface TopActionsProps {
  activeTab: string;
  isCreatingFolder: boolean;
  newFolderName: string;
  folderInputRef: React.MutableRefObject<HTMLInputElement | null>;
  onNewFolderNameChange: (val: string) => void;
  onConfirmFolderCreation: () => void;
  onCancelFolderCreation: () => void;
  onNavigateView: (view: ViewState) => void;
  onOpenProfileMenu: () => void;
  onOpenAddMenu: () => void;
}

const TITLES: Record<string, TranslationKey> = {
  files: 'files',
  gallery: 'gallery',
  music: 'music',
  docs: 'documentsTab',
};

export const TopActions: React.FC<TopActionsProps> = ({
  activeTab,
  isCreatingFolder,
  newFolderName,
  folderInputRef,
  onNewFolderNameChange,
  onConfirmFolderCreation,
  onCancelFolderCreation,
  onNavigateView,
  onOpenProfileMenu,
  onOpenAddMenu,
}) => {
  const { t } = useI18n();

  return (
    <header className="px-5 pt-8 pb-3 bg-transparent shrink-0">
      <div className="flex items-center justify-between h-12 mb-3">
        <button
          type="button"
          onClick={onOpenProfileMenu}
          aria-label={t('settings')}
          className="w-11 h-11 rounded-full flex items-center justify-center text-lg font-semibold text-primary transition-all active:scale-90"
          style={{ backgroundColor: 'var(--onb-surface-strong)' }}
        >
          P
        </button>
        <h1 className="text-[22px] font-bold tracking-tight text-primary">
          {t(TITLES[activeTab] ?? 'files')}
        </h1>
        <button
          type="button"
          onClick={onOpenAddMenu}
          aria-label={t('addFile')}
          className="w-11 h-11 rounded-full flex items-center justify-center text-primary transition-all active:scale-90"
          style={{ backgroundColor: 'var(--onb-surface-strong)' }}
        >
          <Plus size={22} />
        </button>
      </div>

      <button
        type="button"
        onClick={() => onNavigateView('search')}
        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left transition-all active:opacity-70"
        style={{ backgroundColor: 'var(--onb-surface)' }}
      >
        <Search size={20} className="text-muted shrink-0" />
        <span className="text-[17px] text-muted truncate">{t('searchFiles')}</span>
      </button>

      {isCreatingFolder && (
        <div
          className="mt-3 flex items-center gap-3 px-4 py-3 rounded-2xl"
          style={{ backgroundColor: 'var(--onb-surface)' }}
        >
          <FolderPlus size={18} className="text-muted shrink-0" />
          <input
            ref={folderInputRef}
            value={newFolderName}
            onChange={(e) => onNewFolderNameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onConfirmFolderCreation();
              if (e.key === 'Escape') onCancelFolderCreation();
            }}
            onBlur={onCancelFolderCreation}
            className="flex-1 min-w-0 bg-transparent border-none outline-none text-primary text-[16px] placeholder:text-muted"
            placeholder={t('folderName')}
          />
        </div>
      )}
    </header>
  );
};
