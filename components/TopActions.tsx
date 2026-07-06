
import React from 'react';
import { Plus, FolderPlus, Database, Search, Trash2, Settings } from 'lucide-react';
import { ViewState } from '../types';
import { useI18n } from '../locales/i18nContext';
import crytoLogo from '../assets/PrivonVault.png';

interface TopActionsProps {
  activeTab: string;
  isCreatingFolder: boolean;
  newFolderName: string;
  folderInputRef: React.MutableRefObject<HTMLInputElement | null>;
  onAddFile: () => void;
  onStartFolderCreation: () => void;
  onNewFolderNameChange: (val: string) => void;
  onConfirmFolderCreation: () => void;
  onCancelFolderCreation: () => void;
  onNavigateView: (view: ViewState) => void;
}

export const TopActions: React.FC<TopActionsProps> = ({
  activeTab,
  isCreatingFolder,
  newFolderName,
  folderInputRef,
  onAddFile,
  onStartFolderCreation,
  onNewFolderNameChange,
  onConfirmFolderCreation,
  onCancelFolderCreation,
  onNavigateView,
}) => {
  const { t } = useI18n();
  
  if (activeTab !== 'files') {
    return (
      <header className="px-5 pt-8 pb-4 bg-background">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-16 h-16 flex items-center justify-center">
            <img src={crytoLogo} alt="Privon Vault" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">{t('crytoPrefix')}<span className="bg-gradient-to-r from-zinc-300 via-zinc-400 to-zinc-500 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(212,212,216,0.3)]">{t('toolSuffix')}</span></h1>
        </div>
      </header>
    );
  }

  return (
    <header className="px-5 pt-8 pb-4 space-y-6 bg-background">
      {/* LOGO & NAME */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-16 h-16 flex items-center justify-center">
          <img src={crytoLogo} alt="Privon Vault" className="w-full h-full object-contain" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">{t('crytoPrefix')}<span className="bg-gradient-to-r from-zinc-300 via-zinc-400 to-zinc-500 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(212,212,216,0.3)]">{t('toolSuffix')}</span></h1>
      </div>

        <div className="space-y-2.5">
          {/* First row: Add File, Add Folder, Storage */}
          <div className="flex items-center gap-2">
            <button 
              onClick={onAddFile} 
              className="flex-[2.5] font-bold py-2.5 px-3 rounded-2xl flex items-center justify-center gap-2 text-white transition-all active:scale-95 text-sm relative overflow-hidden border border-neon-green/30"
              style={{
                background: 'linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 100%)',
                backdropFilter: 'blur(12px) saturate(180%)',
                WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
              }}
            >
              <Plus size={18} strokeWidth={3} className="relative z-10 drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
              <span className="relative z-10 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">{t('addFile')}</span>
            </button>
             
            <button 
              onClick={!isCreatingFolder ? onStartFolderCreation : undefined} 
              className="flex-[2.5] font-bold py-2.5 px-3 rounded-2xl flex items-center justify-center gap-2 text-primary transition-all active:scale-95 text-sm relative overflow-hidden border border-white/10"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
                backdropFilter: 'blur(12px) saturate(180%)',
                WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)',
              }}
            >
              <FolderPlus size={18} className="relative z-10" />
              <span className="relative z-10">
                {isCreatingFolder ? (
                  <input 
                    ref={folderInputRef} 
                    value={newFolderName}
                    onChange={(e) => onNewFolderNameChange(e.target.value)}
                    onKeyDown={(e) => { 
                      if (e.key === 'Enter') onConfirmFolderCreation(); 
                      if (e.key === 'Escape') onCancelFolderCreation(); 
                    }}
                    onBlur={onCancelFolderCreation}
                    className="bg-transparent border-none outline-none text-primary w-full min-w-[60px] font-bold text-sm"
                    placeholder={t('folderName')}
                  />
                ) : (
                  t('addFolder')
                )}
              </span>
            </button>

            <button 
              onClick={() => onNavigateView('storage')} 
              className="w-11 h-11 flex items-center justify-center rounded-2xl text-primary transition-all active:scale-95 shrink-0 relative overflow-hidden border border-white/10"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
                backdropFilter: 'blur(12px) saturate(180%)',
                WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)',
              }}
            >
              <Database size={18} className="relative z-10" />
            </button>
          </div>

          {/* Second row: Search, Trash, Settings */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => onNavigateView('search')} 
              className="w-12 h-12 flex items-center justify-center rounded-2xl text-primary transition-all active:scale-95 relative overflow-hidden border border-white/10"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
                backdropFilter: 'blur(12px) saturate(180%)',
                WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)',
              }}
            >
              <Search size={18} className="relative z-10" />
            </button>
            <button 
              onClick={() => onNavigateView('trash')} 
              className="w-12 h-12 flex items-center justify-center rounded-2xl text-primary transition-all active:scale-95 relative overflow-hidden border border-white/10"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
                backdropFilter: 'blur(12px) saturate(180%)',
                WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)',
              }}
            >
              <Trash2 size={18} className="relative z-10" />
            </button>
            <button 
              onClick={() => onNavigateView('settings')} 
              className="w-12 h-12 flex items-center justify-center rounded-2xl text-primary transition-all active:scale-95 relative overflow-hidden border border-white/10"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
                backdropFilter: 'blur(12px) saturate(180%)',
                WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)',
              }}
            >
              <Settings size={18} className="relative z-10" />
            </button>
          </div>

        <p className="text-xs text-muted font-medium pt-1 opacity-80">{t('browseAndManage')}</p>
      </div>
    </header>
  );
};
