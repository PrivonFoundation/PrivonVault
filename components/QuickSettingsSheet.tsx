import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronRight, Monitor, Moon, Settings, Sun } from 'lucide-react';
import { useI18n } from '../locales/i18nContext';
import { LANGUAGES } from '../locales';
import { applyThemeMode, getSavedThemeMode } from '../utils/theme';
import type { ThemeMode } from '../types';

interface QuickSettingsSheetProps {
  open: boolean;
  onClose: () => void;
  onOpenFullSettings?: () => void;
}

export const QuickSettingsSheet: React.FC<QuickSettingsSheetProps> = ({ open, onClose, onOpenFullSettings }) => {
  const { t, language, setLanguage, languages } = useI18n();
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => getSavedThemeMode());

  const handleThemeMode = (mode: ThemeMode) => {
    applyThemeMode(mode);
    setThemeModeState(mode);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="quick-settings-sheet"
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
            <div className="px-4 pt-1 pb-6 flex flex-col gap-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div>
                <p className="px-2 pb-2 text-[12px] font-semibold uppercase tracking-widest text-muted">
                  {t('style')}
                </p>
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{ backgroundColor: 'var(--onb-surface-strong)' }}
                >
                  {([
                    { mode: 'light' as ThemeMode, icon: Sun, label: t('lightMode') },
                    { mode: 'dark' as ThemeMode, icon: Moon, label: t('darkMode') },
                    { mode: 'system' as ThemeMode, icon: Monitor, label: t('systemButton') },
                  ]).map((item, idx) => (
                    <button
                      key={item.mode}
                      type="button"
                      onClick={() => handleThemeMode(item.mode)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all active:opacity-60 ${idx > 0 ? 'border-t' : ''}`}
                      style={{ borderTopColor: 'var(--onb-border)' }}
                    >
                      <item.icon size={19} className="text-muted shrink-0" />
                      <span className="flex-1 text-[16px] text-primary">{item.label}</span>
                      {themeMode === item.mode && <Check size={18} style={{ color: 'var(--accent-color)' }} />}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="px-2 pb-2 text-[12px] font-semibold uppercase tracking-widest text-muted">
                  {t('languageInterface')}
                </p>
                <div
                  className="rounded-2xl overflow-hidden overflow-y-auto custom-scrollbar"
                  style={{ backgroundColor: 'var(--onb-surface-strong)', maxHeight: '34vh' }}
                >
                  {(languages?.length ? languages : LANGUAGES).map((lang, idx) => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => { setLanguage(lang.code); onClose(); }}
                      className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-all active:opacity-60 ${idx > 0 ? 'border-t' : ''}`}
                      style={{ borderTopColor: 'var(--onb-border)' }}
                    >
                      <span className="min-w-0">
                        <span className="block text-[16px] text-primary truncate">{lang.nativeName}</span>
                        <span className="block text-[13px] text-muted truncate">{lang.name}</span>
                      </span>
                      {language === lang.code && <Check size={18} className="shrink-0" style={{ color: 'var(--accent-color)' }} />}
                    </button>
                  ))}
                </div>
              </div>
              {onOpenFullSettings && (
                <button
                  type="button"
                  onClick={onOpenFullSettings}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left transition-all active:opacity-60"
                  style={{ backgroundColor: 'var(--onb-surface-strong)' }}
                >
                  <Settings size={19} className="text-muted shrink-0" />
                  <span className="flex-1 text-[16px] text-primary">{t('settings')}</span>
                  <ChevronRight size={18} className="text-muted" />
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
