
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, LayoutGrid, PaintBucket, Terminal, 
  FileLock2, EyeOff, Heart, CheckCircle, Globe, Languages, KeyRound, Mail, 
  Info, CodeXml, MessageSquare, AtSign, ExternalLink, Ghost, Calendar, MapPin, 
  Type, CaseUpper, ShieldAlert, Power, ShieldCheck, Lock, Check, Key, Sparkles, ChevronRight,
  Target
} from 'lucide-react';
import { AppTheme, ThemeMode } from '../../types';
import { CustomColorPicker } from '../CustomColorPicker';
import { LANGUAGES } from '../../locales';
import { useI18n } from '../../locales/i18nContext';

interface SettingsViewProps {
  onBack: () => void;
  appTheme: AppTheme;
  themeMode: ThemeMode;
  setAppTheme: (t: ThemeMode) => void;
  accentColor: string;
  setManualAccent: (c: string) => void;
  clearManualAccent: () => void;
  autoBlurSettings: { value: number; setValue: (val: number) => void; };
  autoLockSettings: { value: number; setValue: (val: number) => void; };
  progressiveLockSettings: {
    lockTime: number;
    setLockTime: (val: number) => void;
    attempts: number;
    setAttempts: (val: number) => void;
  };
  recoverySettings: {
    codes: string[] | null;
    count: number;
    regenerate: () => void;
    dismissCodes: () => void;
  };
  vaultSettings: {
    enabled: boolean;
    pin: string | null;
    openVault: () => void;
    disableVault: () => void;
    vaultPinAllowed?: boolean;
  };
  onOpenAbout: () => void;
  onOpenDevCreds: () => void;
}

export const SettingsRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  sub?: string;
  value?: string;
  expanded?: boolean;
  action?: React.ReactNode;
  onClick?: () => void;
}> = ({ icon, label, sub, value, expanded, action, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all active:opacity-60 border-t first:border-t-0"
    style={{ borderTopColor: 'var(--onb-border)' }}
  >
    <span className="text-muted shrink-0">{icon}</span>
    <span className="flex-1 min-w-0">
      <span className="block text-[16px] leading-snug text-primary truncate">{label}</span>
      {sub && <span className="block text-[13px] leading-snug text-muted truncate">{sub}</span>}
    </span>
    {value && <span className="text-[15px] text-muted shrink-0 truncate max-w-[40%]">{value}</span>}
    {action ? action : onClick ? (
      <ChevronRight size={18} className={`text-muted shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`} />
    ) : null}
  </button>
);

export const SettingsView: React.FC<SettingsViewProps> = (props) => {
    const { t, language, setLanguage, languageOptions } = useI18n();
    const [region, setRegion] = useState(() => {
        const langCode = (typeof window !== 'undefined' && localStorage.getItem('app_language')) || 'en';
        const foundLang = LANGUAGES.find(l => l.code === langCode);
        return foundLang ? foundLang.capital : 'Bucharest';
    });
    const [lockedLang, setLockedLang] = useState<string | null>(null);
    const [openSection, setOpenSection] = useState<string | null>(null);
    const toggleSection = (s: string) => setOpenSection(cur => cur === s ? null : s);
    const [subSheet, setSubSheet] = useState<null | 'appearance' | 'language' | 'region'>(null);
    // Glass intensity state
    const [glassIntensity, setGlassIntensity] = useState(() => parseInt(localStorage.getItem('app_glass_intensity') || '100'));

    const applyGlassIntensity = (val: number) => {
      const v = Math.max(0, Math.min(100, val));
      const gm = v / 100;
      const root = document.documentElement;
      root.style.setProperty('--glass-blur-light', `${12 * gm}px`);
      root.style.setProperty('--glass-blur-medium', `${20 * gm}px`);
      root.style.setProperty('--glass-blur-heavy', `${32 * gm}px`);
      root.style.setProperty('--glass-blur-xl', `${40 * gm}px`);
      root.style.setProperty('--glass-bg-ultra-light', `rgba(255,255,255,${0.03 * gm})`);
      root.style.setProperty('--glass-bg-light', `rgba(255,255,255,${0.06 * gm})`);
      root.style.setProperty('--glass-bg-medium', `rgba(255,255,255,${0.1 * gm})`);
      root.style.setProperty('--glass-bg-heavy', `rgba(255,255,255,${0.15 * gm})`);
      root.style.setProperty('--glass-border-subtle', `rgba(255,255,255,${0.05 * gm})`);
      root.style.setProperty('--glass-border-light', `rgba(255,255,255,${0.1 * gm})`);
      root.style.setProperty('--glass-border-medium', `rgba(255,255,255,${0.15 * gm})`);
      root.style.setProperty('--glass-border-strong', `rgba(255,255,255,${0.2 * gm})`);
      root.style.setProperty('--glass-accent-glow', `rgba(var(--accent-rgb),${0.15 * gm})`);
      root.style.setProperty('--glass-card-bg', `linear-gradient(135deg, rgba(255,255,255,${0.12 * gm}) 0%, rgba(255,255,255,${0.03 * gm}) 100%)`);
      root.style.setProperty('--glass-card-border-top', `rgba(255,255,255,${0.18 * gm})`);
      root.style.setProperty('--glass-card-border-left', `rgba(255,255,255,${0.12 * gm})`);
      root.style.setProperty('--glass-card-border-bottom', `rgba(255,255,255,${0.06 * gm})`);
      root.style.setProperty('--glass-card-border-right', `rgba(255,255,255,${0.06 * gm})`);
      root.style.setProperty('--glass-modal-bg', `linear-gradient(180deg, rgba(20,20,20,${0.85 * gm}) 0%, rgba(10,10,10,${0.95 * gm}) 100%)`);
      root.style.setProperty('--glass-modal-border-top', `rgba(255,255,255,${0.12 * gm})`);
      localStorage.setItem('app_glass_intensity', String(v));
    };

    // Apply glass intensity on mount
    useEffect(() => { applyGlassIntensity(glassIntensity); }, []);

    const regionOptions = LANGUAGES.map(lang => ({
        label: lang.capital,
        value: lang.capital,
        desc: lang.country
    }));

    const handleLanguageChange = (val: string) => {
        const foundLang = languageOptions.find(l => l.value === val);
        if (foundLang?.locked) return;
        setLanguage(val);
        if (foundLang) {
            setRegion(foundLang.capital);
        }
    };

    const renderLockedDialog = () => {
      if (!lockedLang) return null;
      return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div
            onClick={() => setLockedLang(null)}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-sm glass-card rounded-[32px] overflow-hidden p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg">
                <Lock size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-primary">{t('translationLocked')}</h3>
                <p className="text-[11px] text-muted">{lockedLang}</p>
              </div>
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed">
              {t('translationLockedDesc')}
            </p>
            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => setLockedLang(null)}
                className="px-5 py-2.5 rounded-xl bg-neon-green text-black font-bold text-sm hover:bg-neon-green/90 transition-all"
              >
                {t('close')}
              </button>
            </div>
          </div>
        </div>
      );
    };

    return (
        <motion.div key="settings-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] bg-black/60" onClick={props.onBack}>
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-0 left-0 right-0 max-w-md mx-auto rounded-t-[28px] border-t border-x bg-background overflow-hidden flex flex-col"
          style={{ borderColor: 'var(--onb-border)', maxHeight: '88vh' }}
        >
        <div className="px-6 pt-4 pb-1 flex items-center justify-center shrink-0">
          <div className="w-10 h-1 rounded-full bg-[var(--onb-border)]" />
        </div>
        <div className="px-5 pb-2 flex items-center justify-between shrink-0">
            <div className="w-16" />
            <h2 className="text-[17px] font-semibold tracking-tight text-primary">{t('settings')}</h2>
            <button onClick={props.onBack} className="w-16 text-right text-[17px] transition-colors" style={{ color: 'var(--accent-color)' }}>{t('done')}</button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pt-2 pb-8 space-y-5 custom-scrollbar">
            
            {/* Profile */}
            <div className="pt-3 pb-1 flex flex-col items-center text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'var(--onb-surface-strong)' }}
              >
                <span className="text-3xl font-semibold text-primary">P</span>
              </div>
              <p className="mt-3 text-[13px] text-muted">{t('settingsProfileName')}</p>
              <p className="text-[22px] font-bold tracking-tight text-primary">{t('crytoPrefix')} {t('toolSuffix')}</p>
            </div>

            {/* GROUP: APPLICATION */}
            <section>
                <p className="px-2 pb-2 text-[12px] font-semibold uppercase tracking-widest text-muted">{t('settingsGroupApplication')}</p>
                <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--onb-surface-strong)' }}>
                <SettingsRow
                  icon={<PaintBucket size={19} />}
                  label={t('settingsAppearance')}
                  value={props.themeMode === 'system' ? t('systemButton') : props.themeMode === 'dark' ? t('darkMode') : t('lightMode')}
                  onClick={() => setSubSheet('appearance')}
                />

                <SettingsRow
                  icon={<Languages size={19} />}
                  label={t('languageInterface')}
                  value={languageOptions.find(l => l.value === language)?.label}
                  onClick={() => setSubSheet('language')}
                />
                <SettingsRow
                  icon={<MapPin size={19} />}
                  label={t('region')}
                  value={regionOptions.find(r => r.value === region)?.label}
                  onClick={() => setSubSheet('region')}
                />
                </div>
            </section>

            {/* GROUP: SECURITY */}
            <section>
                <p className="px-2 pt-5 pb-2 text-[12px] font-semibold uppercase tracking-widest text-muted">{t('settingsGroupSecurity')}</p>
                <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--onb-surface-strong)' }}>


{props.vaultSettings.vaultPinAllowed !== false && (
<SettingsRow
  icon={<Key size={19} />}
  label={t('vaultKeys')}
  sub={t('vaultKeysDesc')}
  action={(
    <button
      type="button"
      onClick={props.vaultSettings.enabled ? props.vaultSettings.disableVault : props.vaultSettings.openVault}
      aria-label={t('vaultKeys')}
      className={`w-12 h-7 rounded-full transition-colors flex items-center px-1 shrink-0 ${props.vaultSettings.enabled ? '' : 'border border-border'}`}
      style={props.vaultSettings.enabled ? { backgroundColor: 'var(--accent-color)' } : { backgroundColor: 'var(--onb-surface-strong)' }}
    >
      <motion.div
        layout
        className="w-5 h-5 rounded-full bg-white shadow-sm"
        animate={{ x: props.vaultSettings.enabled ? 18 : 0 }}
      />
    </button>
  )}
/>
)}

                 <SettingsRow
                   icon={<ShieldAlert size={19} />}
                   label={t('progressiveBlocking')}
                   expanded={openSection === 'progressive'}
                   onClick={() => toggleSection('progressive')}
                 />
                 <AnimatePresence>
                 {openSection === 'progressive' && (
                 <motion.div
                   initial={{ opacity: 0, height: 0 }}
                   animate={{ opacity: 1, height: 'auto' }}
                   exit={{ opacity: 0, height: 0 }}
                   className="overflow-hidden"
                 >
                 <div className="px-5 py-4 space-y-6">
                    
                    <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-bold uppercase tracking-wider text-primary">{t('failedAttempts')}</label>
                        <span className="text-xs font-mono text-neon-green font-bold">{props.progressiveLockSettings.attempts}</span>
                    </div>
                    <input 
                        type="range" min="1" max="10" step="1" 
                        value={props.progressiveLockSettings.attempts} 
                        onChange={(e) => props.progressiveLockSettings.setAttempts(parseInt(e.target.value))} 
                        className="w-full accent-neon-green h-1.5 bg-surface rounded-lg appearance-none cursor-pointer" 
                    />
                    <p className="text-[10px] text-muted">{t('failedAttempts')}</p>
                    </div>

                    <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-bold uppercase tracking-wider text-primary">{t('lockDuration')}</label>
                        <span className="text-xs font-mono text-neon-green font-bold">{props.progressiveLockSettings.lockTime}s</span>
                    </div>
                    <input 
                        type="range" min="60" max="3600" step="60" 
                        value={props.progressiveLockSettings.lockTime} 
                        onChange={(e) => props.progressiveLockSettings.setLockTime(parseInt(e.target.value))} 
                        className="w-full accent-neon-green h-1.5 bg-surface rounded-lg appearance-none cursor-pointer" 
                    />
                    <p className="text-[10px] text-muted">{t('lockDurationDesc')}</p>
                    </div>
                 </div>
                 </motion.div>
                 )}
                 </AnimatePresence>

                    <SettingsRow
                      icon={<KeyRound size={19} />}
                      label={t('recoverySectionTitle')}
                      value={String(props.recoverySettings.count)}
                      expanded={openSection === 'recovery'}
                      onClick={() => toggleSection('recovery')}
                    />
                    <AnimatePresence>
                    {openSection === 'recovery' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                    <div className="px-5 pb-4">

                    <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 mb-4">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <p className="text-xs font-bold text-white">{t('recoveryCodesTitle')}</p>
                                <p className="text-[10px] text-zinc-500">{t('recoveryCodesAvailable').replace('{{count}}', String(props.recoverySettings.count))}</p>
                            </div>
                            <button
                                onClick={() => {
                                    props.recoverySettings.regenerate();
                                }}
                                className="px-3 py-1.5 rounded-lg bg-neon-green/10 border border-neon-green/30 text-neon-green text-[10px] font-bold hover:bg-neon-green/20 transition-colors"
                            >
                                {props.recoverySettings.count === 0 ? t('generateCode') : t('regenerateCode')}
                            </button>
                        </div>

                        <p className="text-[10px] text-zinc-500 text-center py-2">
                            {props.recoverySettings.count > 0
                                ? t('recoveryCodesRemaining').replace('{{count}}', String(props.recoverySettings.count))
                                : t('recoveryCodesNone')}
                        </p>
                    </div>

                    <p className="text-[9px] text-zinc-600 leading-relaxed">
                        {t('recoveryCodesSaveWarning')}
                    </p>
                    </div>
                    </motion.div>
                    )}
                    </AnimatePresence>
                </div>

                <p className="px-2 pt-5 pb-2 text-[12px] font-semibold uppercase tracking-widest text-muted">{t('settingsGroupMore')}</p>
                <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--onb-surface-strong)' }}>
                <SettingsRow
                  icon={<Terminal size={19} />}
                  label={t('devCredsTitle')}
                  sub={t('devCredsDesc')}
                  onClick={props.onOpenDevCreds}
                />
                <SettingsRow
                  icon={<Info size={19} />}
                  label={t('aboutUs')}
                  sub={t('obscuritySecurity')}
                  onClick={props.onOpenAbout}
                />
                </div>

                <div className="pt-6 pb-2 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border">
                        <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--accent-color)' }}></span>
                        <span className="text-[10px] font-mono text-muted">{t('versionLabel')}</span>
                    </div>
                </div>
            </section>
        </div>
        </motion.div>

      {/* Sub-sheet for option picking — appearance, language, region */}
      <AnimatePresence>
      {subSheet && (
        <motion.div
          key="settings-subsheet"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-[160] flex items-end bg-black/40"
          onClick={() => setSubSheet(null)}
        >
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="w-full rounded-t-[28px] border-t border-x bg-background overflow-hidden flex flex-col"
            style={{ borderColor: 'var(--onb-border)', maxHeight: '78%' }}
          >
            <div className="px-6 pt-4 pb-1 flex items-center justify-center shrink-0">
              <div className="w-10 h-1 rounded-full bg-[var(--onb-border)]" />
            </div>
            <p className="pb-3 text-center text-[17px] font-semibold tracking-tight text-primary shrink-0">
              {subSheet === 'appearance' ? t('settingsAppearance') : subSheet === 'language' ? t('languageInterface') : t('region')}
            </p>
            <div className="overflow-y-auto px-4 pb-6 custom-scrollbar">
              {subSheet === 'appearance' && (
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="px-2 pb-2 text-center text-[15px] text-muted">{t('settingsModeLabel')}</p>
                    <div className="grid grid-cols-3 gap-3">
                      {([
                        { mode: 'light' as const, label: t('lightMode') },
                        { mode: 'dark' as const, label: t('darkMode') },
                        { mode: 'system' as const, label: t('systemButton') },
                      ]).map((item) => {
                        const selected = props.themeMode === item.mode;
                        return (
                          <button
                            key={item.mode}
                            type="button"
                            onClick={() => props.setAppTheme(item.mode)}
                            className="flex flex-col items-center gap-2 transition-all active:scale-[0.97]"
                          >
                            <span
                              className="w-20 h-20 rounded-2xl overflow-hidden flex"
                              style={selected ? { border: '2px solid var(--accent-color)' } : { border: '1px solid var(--onb-border)' }}
                            >
                              {item.mode === 'system' ? (
                                <>
                                  <span className="flex-1 flex items-center justify-center text-[26px] font-bold bg-white text-black">A</span>
                                  <span className="flex-1 flex items-center justify-center text-[26px] font-bold bg-black text-white">a</span>
                                </>
                              ) : (
                                <span
                                  className="flex-1 flex items-center justify-center text-[28px] font-bold"
                                  style={item.mode === 'light' ? { backgroundColor: '#ffffff', color: '#000000' } : { backgroundColor: '#000000', color: '#ffffff' }}
                                >
                                  Aa
                                </span>
                              )}
                            </span>
                            <span className="text-[13px] text-muted">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--onb-surface-strong)' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <PaintBucket size={14} className="text-muted" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted">{t('accentManual')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <CustomColorPicker color={props.accentColor} onChange={props.setManualAccent} />
                      </div>
                      <button
                        onClick={props.clearManualAccent}
                        className="px-4 py-3 rounded-xl border border-border text-[10px] font-black uppercase tracking-widest text-muted hover:text-white hover:border-red-500/50 hover:bg-red-500/10 transition-all shrink-0"
                        title={t('resetAccentTitle')}
                      >
                        {t('reset')}
                      </button>
                    </div>
                  </div>
                  <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--onb-surface-strong)' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles size={14} className="text-muted" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted">{t('glassIntensity' as any)}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={glassIntensity}
                      onChange={e => {
                        const val = parseInt(e.target.value);
                        setGlassIntensity(val);
                        applyGlassIntensity(val);
                      }}
                      className="w-full h-1 appearance-none bg-zinc-800 rounded-full cursor-pointer accent-[var(--accent-color)] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer"
                    />
                  </div>
                </div>
              )}
              {subSheet === 'language' && (
                <div className="flex flex-col gap-2">
                  {languageOptions.map((lang) => (
                    <button
                      key={lang.value}
                      type="button"
                      onClick={() => { if (lang.locked) { setLockedLang(lang.label); } else { handleLanguageChange(lang.value); setSubSheet(null); } }}
                      className={`w-full p-3 rounded-2xl border flex items-center justify-between transition-all active:opacity-60 ${
                        lang.locked ? 'opacity-40' : ''
                      }`}
                      style={language === lang.value ? { borderColor: 'var(--accent-color)', backgroundColor: 'var(--onb-surface-strong)' } : { borderColor: 'var(--onb-border)', backgroundColor: 'var(--onb-surface)' }}
                    >
                      <span className="flex items-center gap-3 min-w-0">
                        <span
                          className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                          style={language === lang.value ? { backgroundColor: 'var(--accent-color)', color: 'var(--accent-contrast)' } : { backgroundColor: 'var(--onb-surface-strong)', color: 'var(--accent-color)' }}
                        >
                          {lang.value.toUpperCase()}
                        </span>
                        <span className="text-left min-w-0">
                          <span className="block text-[16px] text-primary truncate">{lang.label}</span>
                          <span className="block text-[12px] text-muted truncate">{lang.desc} · {lang.completion}%</span>
                        </span>
                      </span>
                      {language === lang.value && !lang.locked && <Check size={18} className="shrink-0" style={{ color: 'var(--accent-color)' }} />}
                      {lang.locked && <Lock size={16} className="text-muted shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
              {subSheet === 'region' && (
                <div className="flex flex-col gap-2">
                  {regionOptions.map((reg) => (
                    <button
                      key={reg.value}
                      type="button"
                      onClick={() => { setRegion(reg.value); setSubSheet(null); }}
                      className="w-full p-3 rounded-2xl border flex items-center justify-between transition-all active:opacity-60"
                      style={region === reg.value ? { borderColor: 'var(--accent-color)', backgroundColor: 'var(--onb-surface-strong)' } : { borderColor: 'var(--onb-border)', backgroundColor: 'var(--onb-surface)' }}
                    >
                      <span className="flex items-center gap-3 min-w-0">
                        <span
                          className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                          style={region === reg.value ? { backgroundColor: 'var(--accent-color)', color: 'var(--accent-contrast)' } : { backgroundColor: 'var(--onb-surface-strong)', color: 'var(--accent-color)' }}
                        >
                          {reg.value.substring(0, 2).toUpperCase()}
                        </span>
                        <span className="text-left min-w-0">
                          <span className="block text-[16px] text-primary truncate">{reg.label}</span>
                          <span className="block text-[12px] text-muted truncate">{reg.desc}</span>
                        </span>
                      </span>
                      {region === reg.value && <Check size={18} className="shrink-0" style={{ color: 'var(--accent-color)' }} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {renderLockedDialog()}
    </motion.div>
    );
};

export const AboutView: React.FC<{
  onBack: () => void;
  accentColor?: string;
}> = ({ onBack, accentColor = '#E8E8E8' }) => {
  const { t } = useI18n();
  return (
    <motion.div key="about-view" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="absolute inset-0 z-50 flex flex-col bg-background">
      <div className="px-5 pt-6 pb-4 border-b border-border flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-surface transition-colors glass-button"><ArrowLeft size={24} className="text-primary" /></button>
          <h2 className="text-xl font-bold tracking-wide text-primary">{t('about')}</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto px-5 py-6 custom-scrollbar">
          {/* Hero Section */}
          <div className="flex flex-col items-center mb-10">
              <div className="relative mb-6">
                  <div className="absolute inset-0 blur-3xl rounded-full" style={{ backgroundColor: `${accentColor}20` }}></div>
                   <div className="relative w-48 h-48 rounded-[32px] bg-gradient-to-br from-zinc-900 to-black border-2 flex items-center justify-center overflow-hidden" style={{ borderColor: `${accentColor}50`, boxShadow: `0_0_80px_${accentColor}40, 0_0_160px_${accentColor}20` }}>
                       <div className="absolute inset-0 blur-[80px] rounded-full" style={{ backgroundColor: `${accentColor}15` }} />
                       <span className="font-mono font-black relative z-10" style={{ fontSize: '6rem', lineHeight: 1, color: accentColor }}>P</span>
                   </div>
              </div>
              <h1 className="text-4xl font-black text-primary mb-3 tracking-tight">
                  <span className="text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]">{t('crytoPrefix')}</span>
                  {' '}
                  <span className="text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]">{t('toolSuffix')}</span>
              </h1>
              <p className="text-xs text-zinc-500 font-medium mb-4">{t('privacyFirstVault')}</p>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/80 border border-zinc-800">
                  <span className="text-neon-green text-[10px] font-black uppercase tracking-widest">{t('versionLabel')}</span>
                  <span className="text-zinc-600 text-[8px]">•</span>
                  <span className="text-zinc-500 text-[10px]">Build 2026.04.07</span>
              </div>
          </div>

          {/* Made in Romania Badge */}
          <div className="flex justify-center mb-8">
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-red-600 via-yellow-500 to-blue-600 text-white text-xs font-bold shadow-lg">
                  <span className="text-lg">🇷🇴</span>
                  <span>{t('madeInRomania')}</span>
              </div>
          </div>

          <div className="space-y-6">
              {/* Mission */}
              <section className="p-5 rounded-2xl bg-gradient-to-br from-zinc-900/50 to-black border border-zinc-800/50">
                  <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-neon-green/10 flex items-center justify-center">
                          <Target size={16} className="text-neon-green" />
                      </div>
                       <h4 className="text-xs font-black uppercase tracking-[0.2em] text-neon-green">{t('ourMission')}</h4>
                   </div>
                   <p className="text-sm text-zinc-300 leading-relaxed">
                       {t('missionStatement')}
                   </p>
              </section>

              {/* Features Grid */}
              <section>
                   <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-4">{t('mainFeatures')}</h4>
                  <div className="grid grid-cols-2 gap-3">
                      <div className="p-4 bg-zinc-900/60 border border-zinc-800/50 rounded-xl hover:border-neon-green/30 transition-colors">
                          <Lock size={20} className="text-neon-green mb-2" />
                          <div className="text-white font-bold text-xs mb-1">{t('endToEndEncryption')}</div>
                           <div className="text-[10px] text-zinc-500">{t('sixModernAlgorithms')}</div>
                      </div>
                      <div className="p-4 bg-zinc-900/60 border border-zinc-800/50 rounded-xl hover:border-neon-green/30 transition-colors">
                          <EyeOff size={20} className="text-neon-green mb-2" />
                          <div className="text-white font-bold text-xs mb-1">{t('zeroDataCollection')}</div>
                           <div className="text-[10px] text-zinc-500">{t('localPrivate')}</div>
                      </div>
                      <div className="p-4 bg-zinc-900/60 border border-zinc-800/50 rounded-xl hover:border-neon-green/30 transition-colors">
                          <Globe size={20} className="text-neon-green mb-2" />
                          <div className="text-white font-bold text-xs mb-1">{t('languages25Plus')}</div>
                           <div className="text-[10px] text-zinc-500">{t('multilingualSupport')}</div>
                      </div>
                      <div className="p-4 bg-zinc-900/60 border border-zinc-800/50 rounded-xl hover:border-neon-green/30 transition-colors">
                          <CodeXml size={20} className="text-neon-green mb-2" />
                          <div className="text-white font-bold text-xs mb-1">{t('openSourceLabel')}</div>
                           <div className="text-[10px] text-zinc-500">{t('transparentVerifiable')}</div>
                      </div>
                  </div>
              </section>

              {/* Tech Stack */}
              <section>
                   <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-4">{t('technologiesLabel')}</h4>
                  <div className="flex flex-wrap gap-2">
                      {[t('techReact'), t('techTypeScript'), t('techFramerMotion'), t('techWebCryptoApi'), t('techIndexedDb'), t('techTailwind')].map((tech) => (
                          <span key={tech} className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-full text-[10px] text-zinc-400 font-medium">
                              {tech}
                          </span>
                      ))}
                  </div>
              </section>

              {/* Developer */}
              <section className="p-5 rounded-2xl bg-gradient-to-br from-zinc-900/80 to-black border border-zinc-800/50">
                  <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neon-green/20 to-transparent border border-neon-green/30 flex items-center justify-center">
                              <span className="text-neon-green font-black text-sm">OS</span>
                          </div>
                          <div>
                              <h5 className="text-sm font-bold text-white">{t('obscuritySecurity')}</h5>
                               <p className="text-[10px] text-zinc-500">{t('founderDeveloper')}</p>
                          </div>
                      </div>
                      <button className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white hover:text-neon-green hover:border-neon-green transition-all">
                          <ExternalLink size={20} />
                      </button>
                  </div>
              </section>

               {/* Footer */}
              <div className="pt-6 text-center">
                  <p className="text-[9px] text-zinc-700">
                      {t('openSourceFooter')}
                  </p>
               </div>
          </div>
      </div>
    </motion.div>
  );
};
