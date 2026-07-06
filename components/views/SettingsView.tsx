
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Monitor, LayoutGrid, Palette, PaintBucket, Moon, Sun, Shield, Terminal, 
  FileLock2, EyeOff, Heart, CheckCircle, Globe, Languages, KeyRound, Smartphone, Mail, 
  Info, CodeXml, MessageSquare, AtSign, ExternalLink, Ghost, Calendar, MapPin, 
  Type, CaseUpper, ShieldAlert, Skull, Power, ShieldCheck, Lock, Check, Key, Sparkles, ChevronRight,
  Target
} from 'lucide-react';
import crytoLogo from '../../assets/PrivonVault.png';
import { AppTheme, ThemeConfig, ThemeCategory, FontCategory, FontConfig } from '../../types';
import { CustomColorPicker } from '../CustomColorPicker';
import { CustomSelect } from '../CustomSelect';

import { THEME_COLLECTIONS, CATEGORY_KEYS, getAllThemes } from '../../styles/themes';
import { FONT_LIST, FONT_CATEGORIES, getFontsByCategory } from '../../styles/fonts';
import { LANGUAGES } from '../../locales';
import { useI18n } from '../../locales/i18nContext';

interface SettingsViewProps {
  onBack: () => void;
  appTheme: AppTheme;
  setAppTheme: (t: AppTheme) => void;
  accentColor: string;
  setManualAccent: (c: string) => void;
  clearManualAccent: () => void;
  applyFullTheme: (theme: ThemeConfig) => void;
  autoBlurSettings: { value: number; setValue: (val: number) => void; };
  autoLockSettings: { value: number; setValue: (val: number) => void; };
  progressiveLockSettings: {
    lockTime: number;
    setLockTime: (val: number) => void;
    attempts: number;
    setAttempts: (val: number) => void;
  };
  autoDestructSettings: {
    enabled: boolean;
    setEnabled: (val: boolean) => void;
    attempts: number;
    setAttempts: (val: number) => void;
    inactivitySeconds: number;
    setInactivitySeconds: (val: number) => void;
    countdownSeconds: number;
    setCountdownSeconds: (val: number) => void;
  };
  settingsLock: {
    password: string | null;
    setPassword: (pwd: string | null) => void;
    required?: boolean;
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
  openThemes: () => void;
  openFonts: () => void;
  onOpenAbout: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = (props) => {
    const { t, language, setLanguage, languageOptions } = useI18n();
    const [region, setRegion] = useState(() => {
        const langCode = (typeof window !== 'undefined' && localStorage.getItem('app_language')) || 'en';
        const foundLang = LANGUAGES.find(l => l.code === langCode);
        return foundLang ? foundLang.capital : 'Bucharest';
    });
    const [isLangOpen, setIsLangOpen] = useState(false);
    const [isRegionOpen, setIsRegionOpen] = useState(false);
    const [lockedLang, setLockedLang] = useState<string | null>(null);
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

    // State for settings password modification
    const [isSettingPassword, setIsSettingPassword] = useState(false);
    const [newSettingsPwd, setNewSettingsPwd] = useState('');
    const [confirmSettingsPwd, setConfirmSettingsPwd] = useState('');
    const [currentSettingsPwd, setCurrentSettingsPwd] = useState(''); // For disabling
    const [settingsPwdError, setSettingsPwdError] = useState('');

    // Local state for autodestruct time unit
    const [inactivityUnit, setInactivityUnit] = useState<'sec' | 'min' | 'hour' | 'day'>('day');
    const [inactivityValue, setInactivityValue] = useState(0);

    // Initialize unit/value from seconds
    useEffect(() => {
        const totalSecs = props.autoDestructSettings.inactivitySeconds;
        if (totalSecs === 0) {
            setInactivityValue(0);
            return;
        }
        if (totalSecs % 86400 === 0) { setInactivityUnit('day'); setInactivityValue(totalSecs / 86400); }
        else if (totalSecs % 3600 === 0) { setInactivityUnit('hour'); setInactivityValue(totalSecs / 3600); }
        else if (totalSecs % 60 === 0) { setInactivityUnit('min'); setInactivityValue(totalSecs / 60); }
        else { setInactivityUnit('sec'); setInactivityValue(totalSecs); }
    }, []);

    // Apply glass intensity on mount
    useEffect(() => { applyGlassIntensity(glassIntensity); }, []);

    // Handler pentru schimbarea timpului de autodistrugere
    const handleInactivityChange = (val: number, unit: 'sec' | 'min' | 'hour' | 'day') => {
        setInactivityValue(val);
        setInactivityUnit(unit);
        
        let multiplier = 1;
        if (unit === 'min') multiplier = 60;
        if (unit === 'hour') multiplier = 3600;
        if (unit === 'day') multiplier = 86400;
        
        props.autoDestructSettings.setInactivitySeconds(val * multiplier);
    };

    const handleSaveSettingsPassword = () => {
        setSettingsPwdError('');
        if (newSettingsPwd.length < 30) {
            setSettingsPwdError(t('passwordMin30Error'));
            return;
        }
        if (newSettingsPwd !== confirmSettingsPwd) {
            setSettingsPwdError(t('passwordsDoNotMatch'));
            return;
        }
        props.settingsLock.setPassword(newSettingsPwd);
        setIsSettingPassword(false);
        setNewSettingsPwd('');
        setConfirmSettingsPwd('');
    };

    const handleRemoveSettingsPassword = () => {
        setSettingsPwdError('');
        if (currentSettingsPwd !== props.settingsLock.password) {
            setSettingsPwdError(t('incorrectPassword'));
            return;
        }
        props.settingsLock.setPassword(null);
        setCurrentSettingsPwd('');
    };

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
        <motion.div key="settings-view" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }} className="absolute inset-0 z-50 flex flex-col bg-background">
        <div className="px-5 pt-6 pb-4 bg-background">
            <div className="flex items-center gap-4"><button onClick={props.onBack} className="p-2 -ml-2 rounded-full hover:bg-surface transition-colors glass-button"><ArrowLeft size={24} className="text-primary" /></button><h2 className="text-xl font-bold tracking-wide text-primary light:text-zinc-800">{t('settings')}</h2></div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-8 space-y-10">
            
            {/* SECTION 1: APPEARANCE */}
            <section>
                <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2 text-muted`}><Monitor size={14} />{t('themes')}</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div onClick={props.openThemes} className="p-5 rounded-[24px] glass-card cursor-pointer hover:border-neon-green/50 transition-all group relative overflow-hidden flex flex-col justify-between h-40">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <LayoutGrid size={64} className="text-primary" />
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-green to-blue-500 flex items-center justify-center text-black shadow-lg">
                            <Palette size={20} />
                        </div>
                        <div>
                            <h4 className="font-bold text-primary text-sm">{t('themes')}</h4>
                            <p className="text-[10px] text-muted leading-tight mt-1">{t('themes')}</p>
                        </div>
                    </div>
                    <div onClick={props.openFonts} className="p-5 rounded-[24px] glass-card cursor-pointer hover:border-neon-green/50 transition-all group relative overflow-hidden flex flex-col justify-between h-40">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Type size={64} className="text-primary" />
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg">
                            <CaseUpper size={20} />
                        </div>
                        <div>
                            <h4 className="font-bold text-primary text-sm">{t('fonts')}</h4>
                            <p className="text-[10px] text-muted leading-tight mt-1">{t('fonts')}</p>
                        </div>
                    </div>
                </div>
                <div className="p-1 rounded-xl glass-card grid grid-cols-3 gap-1">
                <button onClick={() => {
                  const darkTheme = THEME_COLLECTIONS.Dark[0];
                  props.applyFullTheme(darkTheme);
                }} className={`py-2.5 rounded-lg flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-all relative overflow-hidden ${props.appTheme === 'dark' ? 'glass-pressed text-primary' : 'text-muted hover:text-primary'}`}><span className="relative z-10 flex items-center justify-center gap-1.5"><Moon size={12} />{t('darkMode')}</span></button>
                <button onClick={() => {
                  const lightTheme = THEME_COLLECTIONS.Light[0];
                  props.applyFullTheme(lightTheme);
                }} className={`py-2.5 rounded-lg flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-all relative overflow-hidden ${props.appTheme === 'light' ? 'glass-pressed text-primary' : 'text-muted hover:text-primary'}`}><span className="relative z-10 flex items-center justify-center gap-1.5"><Sun size={12} />{t('lightMode')}</span></button>
                <button onClick={() => props.setAppTheme('system')} className={`py-2.5 rounded-lg flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-all relative overflow-hidden ${props.appTheme === 'system' ? 'glass-pressed text-primary' : 'text-muted hover:text-primary'}`}><span className="relative z-10 flex items-center justify-center gap-1.5"><Monitor size={12} />{t('systemButton')}</span></button>
                </div>
                <div className="relative mt-4 p-4 rounded-2xl glass-card overflow-hidden">
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

                <div className="relative mt-4 p-4 rounded-2xl glass-card overflow-hidden">
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
            </section>

                {/* SECTION 2: LANGUAGE & REGION */}
            <section>
                <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2 text-muted`}><Globe size={14} /> {t('languageAndRegion')}</h3>
                <div className={`p-5 rounded-[32px] glass-card space-y-4 relative overflow-hidden ${isLangOpen || isRegionOpen ? 'z-50' : ''}`}>
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                        <Globe size={120} className="text-primary" />
                    </div>
                    
                    {/* Language Trigger */}
                    <div 
                        onClick={() => { setIsLangOpen(!isLangOpen); setIsRegionOpen(false); }}
                        className="w-full h-16 px-4 rounded-2xl border border-border cursor-pointer flex items-center justify-between bg-surface hover:border-neon-green/50 hover:bg-surface/80 transition-all group shadow-sm relative overflow-hidden"
                    >
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-8 h-8 rounded-lg bg-black border border-border flex items-center justify-center text-muted group-hover:text-neon-green group-hover:border-neon-green transition-colors">
                                <Languages size={18} />
                            </div>
                            <div className="flex flex-col items-start">
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted group-hover:text-primary transition-colors">{t('languageInterface')}</span>
                                <span className="text-sm font-bold text-primary">{languageOptions.find(l => l.value === language)?.label}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 relative z-10">
                            <div className="px-3 py-1 rounded-full bg-black border border-border text-[10px] font-mono text-neon-green">
                                {language.toUpperCase()}
                            </div>
                            <ChevronRight size={16} className={`text-muted group-hover:text-neon-green transition-all ${isLangOpen ? 'rotate-90' : ''}`} />
                        </div>
                    </div>
                    
                    {/* Language Dropdown */}
                    <AnimatePresence>
                        {isLangOpen && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden z-50 relative"
                            >
                                <div className="max-h-40 overflow-y-auto space-y-1 custom-scrollbar pr-2 pb-2">
                                    {languageOptions.map((lang) => (
                                        <button
                                            key={lang.value}
                                            onClick={() => { if (lang.locked) { setLockedLang(lang.label); setIsLangOpen(false); } else { handleLanguageChange(lang.value); setIsLangOpen(false); } }}
                                            className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all ${
                                                lang.locked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                                            } ${
                                                language === lang.value 
                                                ? 'bg-neon-green/10 border-neon-green' 
                                                : 'bg-surface/50 border-border hover:bg-surface hover:border-zinc-600'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border ${
                                                    language === lang.value 
                                                    ? 'bg-neon-green text-black border-neon-green' 
                                                    : 'bg-black text-muted border-border'
                                                }`}>
                                                    {lang.value.toUpperCase()}
                                                </div>
                                                <div className="text-left">
                                                    <div className={`text-sm font-bold ${language === lang.value ? 'text-white' : 'text-primary'}`}>{lang.label}</div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] text-muted">{lang.desc}</span>
                                                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full ${
                                                            lang.locked ? 'bg-zinc-800 text-zinc-500' : 'bg-neon-green/20 text-neon-green'
                                                        }`}>
                                                            {lang.completion}%
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            {!lang.locked && language === lang.value && (
                                                <motion.div 
                                                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                                                    className="w-5 h-5 rounded-full bg-neon-green flex items-center justify-center text-black"
                                                >
                                                    <Check size={12} strokeWidth={3} />
                                                </motion.div>
                                            )}
                                            {lang.locked && (
                                                <div className="w-5 h-5 flex items-center justify-center text-zinc-600">
                                                    <Lock size={12} />
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="h-px bg-border mx-4 opacity-50" />
                    
                    {/* Region Trigger */}
                    <div 
                        onClick={() => { setIsRegionOpen(!isRegionOpen); setIsLangOpen(false); }}
                        className="w-full h-16 px-4 rounded-2xl border border-border cursor-pointer flex items-center justify-between bg-surface hover:border-neon-green/50 hover:bg-surface/80 transition-all group shadow-sm relative overflow-hidden"
                    >
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-8 h-8 rounded-lg bg-black border border-border flex items-center justify-center text-muted group-hover:text-neon-green group-hover:border-neon-green transition-colors">
                                <MapPin size={18} />
                            </div>
                            <div className="flex flex-col items-start">
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted group-hover:text-primary transition-colors">{t('region')}</span>
                                <span className="text-sm font-bold text-primary">{regionOptions.find(r => r.value === region)?.label}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 relative z-10">
                            <div className="px-3 py-1 rounded-full bg-black border border-border text-[10px] font-mono text-neon-green">
                                {region.substring(0, 2).toUpperCase()}
                            </div>
                            <ChevronRight size={16} className={`text-muted group-hover:text-neon-green transition-all ${isRegionOpen ? 'rotate-90' : ''}`} />
                        </div>
                    </div>
                    
                    {/* Region Dropdown */}
                    <AnimatePresence>
                        {isRegionOpen && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden z-50 relative"
                            >
                                <div className="max-h-40 overflow-y-auto space-y-1 custom-scrollbar pr-2 pb-2">
                                    {regionOptions.map((reg) => (
                                        <button
                                            key={reg.value}
                                            onClick={() => { setRegion(reg.value); setIsRegionOpen(false); }}
                                            className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all ${
                                                region === reg.value 
                                                ? 'bg-neon-green/10 border-neon-green' 
                                                : 'bg-surface/50 border-border hover:bg-surface hover:border-zinc-600'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border ${
                                                    region === reg.value 
                                                    ? 'bg-neon-green text-black border-neon-green' 
                                                    : 'bg-black text-muted border-border'
                                                }`}>
                                                    {reg.value.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div className="text-left">
                                                    <div className={`text-sm font-bold ${region === reg.value ? 'text-white' : 'text-primary'}`}>{reg.label}</div>
                                                </div>
                                            </div>
                                            {region === reg.value && (
                                                <motion.div 
                                                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                                                    className="w-5 h-5 rounded-full bg-neon-green flex items-center justify-center text-black"
                                                >
                                                    <Check size={12} strokeWidth={3} />
                                                </motion.div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </section>

            {/* SECTION 3: SECURITY */}
            <section>
                <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2 text-muted`}><Shield size={14} /> {t('securityAndInfo')}</h3>
                <div className="relative p-6 rounded-[32px] glass-card space-y-8 overflow-hidden">


{/* --- VAULT (NEW) --- */}
{props.vaultSettings.vaultPinAllowed !== false && (
<div className="pb-6 border-b border-border">
    <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
             <Key size={16} className={props.vaultSettings.enabled ? "text-neon-green" : "text-muted"} />
             <label className="text-sm font-bold uppercase tracking-wider text-primary">{t('vaultKeys')}</label>
        </div>
        <div className="flex items-center gap-2">
<button
                                 onClick={props.vaultSettings.enabled ? props.vaultSettings.disableVault : props.vaultSettings.openVault}
                                 className={`w-12 h-7 rounded-full transition-colors flex items-center px-1 ${props.vaultSettings.enabled ? 'bg-neon-green' : 'bg-surface border border-border'}`}
                            >
                                <motion.div
                                    layout
                                    className={`w-5 h-5 rounded-full bg-white shadow-sm`}
                                    animate={{ x: props.vaultSettings.enabled ? 18 : 0 }}
                                />
                            </button>
                        </div>
                    </div>
                    <p className="text-[10px] text-muted mb-3">{t('vaultKeysDesc')}</p>
                </div>
)}

                   {/* === ZONA DE PERICOL: AUTODISTRUGERE === */}
                  <div className="border-t border-border pt-6 bg-red-500/5 -mx-6 px-6 pb-6 mt-6 border-b">
                      <div className="flex items-center justify-between mb-6">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-red-500 flex items-center gap-2">
                          <Skull size={14} /> {t('autoDestructLabel')}
                          </h4>
                          <button
                              onClick={() => props.autoDestructSettings.setEnabled(!props.autoDestructSettings.enabled)}
                              className={`w-12 h-7 rounded-full transition-colors flex items-center px-1 ${props.autoDestructSettings.enabled ? 'bg-red-500' : 'bg-surface border border-border'}`}
                          >
                              <motion.div
                                  layout
                                  className={`w-5 h-5 rounded-full bg-white shadow-sm`}
                                  animate={{ x: props.autoDestructSettings.enabled ? 18 : 0 }}
                              />
                          </button>
                      </div>

                      {props.autoDestructSettings.enabled && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-6">
                              <p className="text-[10px] text-red-500/80 leading-relaxed bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                                  <span className="font-bold">{t('warningAttention')}</span> {t('autoDestructWarning')}
                              </p>

                              {/* Trigger 1: Failed Attempts */}
                              <div className="space-y-4">
                                  <div className="flex justify-between items-center">
                                      <label className="text-sm font-bold uppercase tracking-wider text-primary">{t('attemptThreshold')}</label>
                                      <span className="text-xs font-mono text-red-500 font-bold">{props.autoDestructSettings.attempts}</span>
                                  </div>
                                  <input
                                      type="range" min="1" max="10" step="1"
                                      value={props.autoDestructSettings.attempts}
                                      onChange={(e) => props.autoDestructSettings.setAttempts(parseInt(e.target.value))}
                                      className="w-full accent-red-500 h-1.5 bg-surface rounded-lg appearance-none cursor-pointer"
                                  />
                                  <p className="text-[10px] text-muted">{t('deleteAfterXAttempts')}</p>
                              </div>

                              {/* Countdown Duration */}
                              <div className="space-y-4">
                                  <div className="flex justify-between items-center">
                                      <label className="text-sm font-bold uppercase tracking-wider text-primary">{t('countdownSeconds')}</label>
                                      <span className="text-xs font-mono text-red-500 font-bold">{props.autoDestructSettings.countdownSeconds}s</span>
                                  </div>
                                  <input
                                      type="range" min="5" max="120" step="5"
                                      value={props.autoDestructSettings.countdownSeconds}
                                      onChange={(e) => props.autoDestructSettings.setCountdownSeconds(parseInt(e.target.value))}
                                      className="w-full accent-red-500 h-1.5 bg-surface rounded-lg appearance-none cursor-pointer"
                                  />
                                  <p className="text-[10px] text-muted">{t('destructCountdownDesc')}</p>
                              </div>

                              {/* Trigger 2: Inactivitate (Dead Man's Switch) */}
                              <div className="space-y-4 border-t border-red-500/20 pt-4">
                                  <div className="flex justify-between items-center">
                                      <label className="text-sm font-bold uppercase tracking-wider text-primary">{t('inactivityDeadMan')}</label>
                                      <span className="text-xs font-mono text-red-500 font-bold">
                                          {inactivityValue === 0 ? 'OFF' : `${inactivityValue} ${inactivityUnit}`}
                                      </span>
                                  </div>
                                  <div className="flex gap-2">
                                      <input
                                          type="number"
                                          min="0"
                                          value={inactivityValue}
                                          onChange={(e) => handleInactivityChange(parseInt(e.target.value) || 0, inactivityUnit)}
                                          className="w-20 bg-surface border border-border rounded-lg px-3 py-2 text-sm font-bold text-center outline-none focus:border-red-500"
                                      />
                                      <div className="flex-1 flex bg-surface border border-border rounded-lg p-1">
                                          {(['sec', 'min', 'hour', 'day'] as const).map(u => (
                                              <button
                                                  key={u}
                                                  onClick={() => handleInactivityChange(inactivityValue, u)}
                                                  className={`flex-1 text-[10px] font-bold uppercase rounded-md transition-colors ${inactivityUnit === u ? 'bg-red-500 text-white' : 'text-muted hover:text-primary'}`}
                                              >
                                                  {u}
                                              </button>
                                          ))}
                                      </div>
                                  </div>
                                  <p className="text-[10px] text-muted">{t('deleteIfNotOpened')}</p>
                              </div>
                          </motion.div>
                      )}
                  </div>

                 {/* SETTINGS LOCK CONFIG */}
                <div className="pb-6 border-b border-border">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                             <Lock size={16} className={props.settingsLock.password ? "text-neon-green" : "text-muted"} />
                             <label className="text-sm font-bold uppercase tracking-wider text-primary">{t('settingsLock')}</label>
                        </div>
                        <button 
                            onClick={() => {
                                if (props.settingsLock.required) return;
                                if (props.settingsLock.password) {
                                    setIsSettingPassword(!isSettingPassword); 
                                    setNewSettingsPwd(''); 
                                    setSettingsPwdError('');
                                } else {
                                    setIsSettingPassword(!isSettingPassword);
                                }
                            }}
                            className={`w-12 h-7 rounded-full transition-colors flex items-center px-1 ${props.settingsLock.password || props.settingsLock.required ? 'bg-neon-green' : 'bg-surface border border-border'} ${props.settingsLock.required ? 'opacity-100 cursor-not-allowed' : ''}`}
                        >
                            <motion.div 
                                layout 
                                className={`w-5 h-5 rounded-full bg-white shadow-sm`} 
                                animate={{ x: props.settingsLock.password ? 18 : 0 }}
                            />
                        </button>
                    </div>
                    
                    {/* Expandable Password UI */}
                    {isSettingPassword && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="overflow-hidden">
                            <div className="bg-surface/50 p-4 rounded-xl border border-border space-y-3">
                                {props.settingsLock.password ? (
                                    <>
                                        <p className="text-[10px] text-muted mb-2">{t('enterCurrentPassword')}</p>
                                        <input 
                                            type="password" 
                                            placeholder={t('currentPassword')} 
                                            value={currentSettingsPwd}
                                            onChange={(e) => setCurrentSettingsPwd(e.target.value)}
                                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-primary"
                                        />
                                        {!props.settingsLock.required && (
                                        <button onClick={handleRemoveSettingsPassword} className="w-full py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg text-xs font-bold uppercase hover:bg-red-500 hover:text-white transition-colors">{t('disableProtection')}</button>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <p className="text-[10px] text-muted mb-2">{t('setPasswordDesc')}</p>
                                        <input 
                                            type="password" 
                                            placeholder={t('newPassword30')} 
                                            value={newSettingsPwd}
                                            onChange={(e) => setNewSettingsPwd(e.target.value)}
                                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-primary"
                                        />
                                        <input 
                                            type="password" 
                                            placeholder={t('confirmPasswordPlaceholder')} 
                                            value={confirmSettingsPwd}
                                            onChange={(e) => setConfirmSettingsPwd(e.target.value)}
                                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-primary"
                                        />
                                        <button onClick={handleSaveSettingsPassword} className="w-full py-2 bg-neon-green text-black rounded-lg text-xs font-bold uppercase hover:opacity-90 transition-opacity">{t('enableProtection')}</button>
                                    </>
                                )}
                                {settingsPwdError && <p className="text-xs text-red-500 font-bold">{settingsPwdError}</p>}
                            </div>
                        </motion.div>
                    )}
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between items-center"><label className="text-sm font-bold uppercase tracking-wider text-primary">{t('autoBlurLabel')}</label><span className="text-xs font-mono text-neon-green font-bold">{props.autoBlurSettings.value}s</span></div>
                    <input type="range" min="5" max="60" step="5" value={props.autoBlurSettings.value} onChange={(e) => props.autoBlurSettings.setValue(parseInt(e.target.value))} className="w-full accent-neon-green h-1.5 bg-surface rounded-lg appearance-none cursor-pointer" />
                    <p className="text-[10px] text-muted">{t('autoBlurDesc')}</p>
                </div>
                <div className="space-y-4 border-t border-border pt-6">
                    <div className="flex justify-between items-center"><label className="text-sm font-bold uppercase tracking-wider text-primary">{t('autoLockLabel')}</label><span className="text-xs font-mono text-neon-green font-bold">{props.autoLockSettings.value}s</span></div>
                    <input type="range" min="5" max="120" step="5" value={props.autoLockSettings.value} onChange={(e) => props.autoLockSettings.setValue(parseInt(e.target.value))} className="w-full accent-neon-green h-1.5 bg-surface rounded-lg appearance-none cursor-pointer" />
                    <p className="text-[10px] text-muted">{t('autoLockDesc')}</p>
                </div>

                {/* PROGRESSIVE LOCK UI - DISABLED IF AUTO DESTRUCT ON */}
                <div className={`space-y-6 pt-2 transition-opacity duration-300 ${props.autoDestructSettings.enabled ? 'opacity-30 pointer-events-none grayscale' : ''}`}>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-neon-green flex items-center gap-2">
                    <ShieldAlert size={14} /> {t('progressiveBlocking')}
                    </h4>
                    
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

                    {/* RECOVERY CODES SECTION */}
                <div className="border-t border-border pt-6 mt-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-neon-green flex items-center gap-2 mb-4">
                        <KeyRound size={14} /> {t('recoverySectionTitle')}
                    </h4>

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

                <div className="grid grid-cols-2 gap-4 border-t border-border pt-6">
                    <div className="p-3 rounded-2xl border border-border bg-surface/50">
                        <Terminal size={16} className="text-neon-green mb-2" />
                        <h4 className="font-bold text-[10px] uppercase tracking-wide mb-1 text-primary">{t('openSource')}</h4>
                        <p className="text-[10px] text-muted">{t('transparency')}</p>
                    </div>
                    <div className="p-3 rounded-2xl border border-border bg-surface/50">
                        <FileLock2 size={16} className="text-neon-green mb-2" />
                        <h4 className="font-bold text-[10px] uppercase tracking-wide mb-1 text-primary">{t('clientSide')}</h4>
                        <p className="text-[10px] text-muted">{t('localEncryption')}</p>
                    </div>
                </div>

                <div className="border-t border-border pt-2">
                    <button 
                        onClick={props.onOpenAbout}
                        className="w-full py-4 mt-2 rounded-xl bg-surface border border-border flex items-center justify-between px-6 hover:border-neon-green hover:bg-surface/80 group transition-all relative overflow-hidden"
                    >
                        <span className="relative z-10 flex items-center justify-between w-full">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-black rounded-full border border-border text-neon-green group-hover:scale-110 transition-transform">
                                    <Info size={20} />
                                </div>
                                <div className="text-left">
                                    <h4 className="text-sm font-bold text-primary">{t('aboutUs')}</h4>
                                    <p className="text-[10px] text-muted">{t('obscuritySecurity')}</p>
                                </div>
                            </div>
                            <ArrowLeft className="rotate-180 text-muted group-hover:text-neon-green transition-colors" size={18} />
                        </span>
                    </button>
                </div>

                <div className="pt-2 text-center space-y-2">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface border border-border">
                        <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse"></span>
                        <span className="text-[10px] font-mono text-muted">{t('versionLabel')}</span>
                    </div>
                </div>
                </div>
            </section>
        </div>

      {renderLockedDialog()}
    </motion.div>
    );
};

export const ThemesGalleryView: React.FC<{
  onBack: () => void;
  activeCategory: ThemeCategory;
  setActiveCategory: (cat: ThemeCategory) => void;
  accentColor: string;
  applyFullTheme: (theme: ThemeConfig) => void;
}> = ({ onBack, activeCategory, setActiveCategory, accentColor, applyFullTheme }) => {
  const { t } = useI18n();
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const allThemes = getAllThemes();
  const isAll = activeCategory === ('All' as ThemeCategory);
  const displayThemes = isAll ? allThemes : THEME_COLLECTIONS[activeCategory];

  const LockPreview = ({ accent, isLight }: { accent: string; isLight: boolean }) => {
    const rgb = (() => {
      const c = accent.replace('#', '');
      return `${parseInt(c.slice(0, 2), 16)}, ${parseInt(c.slice(2, 4), 16)}, ${parseInt(c.slice(4, 6), 16)}`;
    })();
    return (
      <svg viewBox="0 0 100 100" width="18" height="18" fill="none">
        <path d="M30 40 V25 A20 20 0 0 1 70 25 V40" stroke={accent} strokeWidth="10" strokeLinecap="round" />
        <rect x="15" y="40" width="70" height="45" rx="10" stroke={accent} strokeWidth="8" fill="none" />
        <path d="M42 61 L50 69 L62 53" stroke={accent} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  };

  return (
    <motion.div key="themes-view" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }} className="absolute inset-0 z-50 flex flex-col bg-background">
      <div className="px-5 pt-6 pb-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-4">
              <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-surface transition-colors glass-button"><ArrowLeft size={24} className="text-primary" /></button>
              <h2 className="text-xl font-bold tracking-wide text-primary">{t('themes')}</h2>
          </div>
          <div className="text-[10px] font-black uppercase tracking-widest text-muted">{displayThemes.length} {t('themes')}</div>
      </div>
      
      {/* Category Tabs */}
      <div className="px-5 py-4 border-b border-border overflow-x-auto no-scrollbar">
          <div className="flex gap-2">
             <button 
                onClick={() => setActiveCategory('All' as ThemeCategory)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap border ${isAll ? 'bg-primary text-background border-primary' : 'bg-surface text-muted border-border hover:border-primary hover:text-primary'}`}
             >
                All ({allThemes.length})
             </button>
             {CATEGORY_KEYS.map(cat => (
                 <button 
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap border ${activeCategory === cat ? 'bg-primary text-background border-primary' : 'bg-surface text-muted border-border hover:border-primary hover:text-primary'}`}
                 >
                    {cat}
                 </button>
             ))}
          </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {displayThemes.map(theme => {
                  const isActive = selectedThemeId === theme.id || (selectedThemeId === null && localStorage.getItem('theme_accent') === theme.accent && 
                                   getComputedStyle(document.documentElement).getPropertyValue('--bg-main').trim() === theme.bgMain);
                  const isLight = theme.textMain === '#09090b';
                  
                  return (
                      <motion.button 
                        key={theme.id}
                        onClick={() => {
                          setSelectedThemeId(theme.id);
                          applyFullTheme(theme);
                        }}
                        whileHover={{ scale: 1.02, y: -4 }}
                        whileTap={{ scale: 0.98 }}
                        className={`relative rounded-[24px] border overflow-hidden group transition-all text-left ${isActive ? 'border-neon-green ring-2 ring-neon-green/30' : 'border-border hover:border-primary/50'}`}
                        style={{ backgroundColor: theme.bgMain }}
                      >
                         {/* Full App Preview */}
                         <div className="relative aspect-[4/3] overflow-hidden">
                             {/* Top Bar */}
                             <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: `1px solid ${theme.border}` }}>
                                 <div className="flex items-center gap-2">
                                     <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ backgroundColor: theme.accent }}>
                                         <svg viewBox="0 0 100 100" width="12" height="12" fill="none">
                                             <path d="M30 40 V25 A20 20 0 0 1 70 25 V40" stroke={isLight ? theme.bgMain : '#000'} strokeWidth="12" strokeLinecap="round"/>
                                             <rect x="15" y="40" width="70" height="45" rx="10" stroke={isLight ? theme.bgMain : '#000'} strokeWidth="10" fill="none"/>
                                             <path d="M42 61 L50 69 L62 53" stroke={isLight ? theme.bgMain : '#000'} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
                                         </svg>
                                     </div>
                                     <span className="text-[9px] font-bold tracking-wide" style={{ color: theme.textMain }}>Cryto<span className="bg-gradient-to-r from-zinc-300 to-zinc-500 bg-clip-text text-transparent">Tool</span></span>
                                 </div>
                                 <div className="flex items-center gap-1.5">
                                     <div className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.accent, opacity: 0.3 }} />
                                     <div className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.accent, opacity: 0.6 }} />
                                     <div className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.accent }} />
                                 </div>
                             </div>
                             
                             {/* Content Area */}
                             <div className="p-3 space-y-2.5">
                                 {/* File Cards */}
                                 <div className="rounded-xl p-2.5 flex items-center gap-2" style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.border}` }}>
                                     <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: theme.bgSurface }}>
                                         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={theme.accent} strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                                     </div>
                                     <div className="flex-1 space-y-1.5">
                                         <div className="h-1.5 rounded-full w-3/4" style={{ backgroundColor: theme.textMain, opacity: 0.15 }} />
                                         <div className="h-1 rounded-full w-1/2" style={{ backgroundColor: theme.textMuted, opacity: 0.1 }} />
                                     </div>
                                     <div className="px-1.5 py-0.5 rounded text-[6px] font-bold" style={{ backgroundColor: theme.accent + '20', color: theme.accent }}>AES</div>
                                 </div>
                                 
                                 <div className="rounded-xl p-2.5 flex items-center gap-2" style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.border}` }}>
                                     <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: theme.bgSurface }}>
                                         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={theme.accent} strokeWidth="2" strokeLinecap="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                                     </div>
                                     <div className="flex-1 space-y-1.5">
                                         <div className="h-1.5 rounded-full w-2/3" style={{ backgroundColor: theme.textMain, opacity: 0.15 }} />
                                         <div className="h-1 rounded-full w-1/3" style={{ backgroundColor: theme.textMuted, opacity: 0.1 }} />
                                     </div>
                                     <div className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.accent, opacity: 0.2 }} />
                                 </div>

                                 {/* Bottom Bar */}
                                 <div className="flex items-center gap-1.5 pt-0.5">
                                     <div className="h-5 flex-1 rounded-lg flex items-center justify-center gap-1" style={{ backgroundColor: theme.accent }}>
                                         <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke={isLight ? theme.bgMain : '#000'} strokeWidth="3" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                                          <span className="text-[6px] font-bold" style={{ color: isLight ? theme.bgMain : '#000' }}>{t('upload')}</span>
                                     </div>
                                     <div className="h-5 w-5 rounded-lg flex items-center justify-center" style={{ backgroundColor: theme.bgSurface, border: `1px solid ${theme.border}` }}>
                                         <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke={theme.textMuted} strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                                     </div>
                                     <div className="h-5 w-5 rounded-lg flex items-center justify-center" style={{ backgroundColor: theme.bgSurface, border: `1px solid ${theme.border}` }}>
                                         <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke={theme.textMuted} strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                                     </div>
                                 </div>
                             </div>
                             
                             {/* Active Indicator */}
                             {isActive && (
                                 <motion.div 
                                     initial={{ scale: 0 }}
                                     animate={{ scale: 1 }}
                                     className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center shadow-lg"
                                     style={{ backgroundColor: theme.accent }}
                                 >
                                     <Check size={14} strokeWidth={3} color={isLight ? theme.bgMain : '#000'} />
                                 </motion.div>
                             )}
                         </div>
                         
                         {/* Label */}
                         <div className="px-4 py-3 flex items-center justify-between" style={{ borderTop: `1px solid ${theme.border}` }}>
                             <div>
                                 <h4 className="text-xs font-bold" style={{ color: theme.textMain }}>{theme.name}</h4>
                                 <p className="text-[9px] font-medium" style={{ color: theme.textMuted }}>{theme.id.split('-')[0].charAt(0).toUpperCase() + theme.id.split('-')[0].slice(1)} Collection</p>
                             </div>
                             <div className="flex items-center gap-1">
                                 <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.border}` }} />
                                 <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.accent }} />
                             </div>
                         </div>
                      </motion.button>
                  );
              })}
          </div>
      </div>
    </motion.div>
  );
};

export const FontsGalleryView: React.FC<{
  onBack: () => void;
}> = ({ onBack }) => {
  const { t } = useI18n();
  const [activeFont, setActiveFont] = useState(localStorage.getItem('app_font_id') || 'system');
  const [activeCat, setActiveCat] = useState<FontCategory>('Modern');

  const handleFontSelect = (font: FontConfig) => {
      setActiveFont(font.id);
      document.documentElement.style.setProperty('--app-font', font.family);
      localStorage.setItem('app_font_id', font.id);
      localStorage.setItem('app_font_family', font.family);
  };

  return (
    <motion.div key="fonts-view" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }} className="absolute inset-0 z-50 flex flex-col bg-background">
      <div className="px-5 pt-6 pb-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-4">
              <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-surface transition-colors glass-button"><ArrowLeft size={24} className="text-primary" /></button>
              <h2 className="text-xl font-bold tracking-wide text-primary">{t('fonts')}</h2>
          </div>
          <div className="text-[10px] font-black uppercase tracking-widest text-muted">{getFontsByCategory(activeCat).length} {t('fonts')}</div>
      </div>

      <div className="px-5 py-4 border-b border-border overflow-x-auto no-scrollbar">
          <div className="flex gap-2">
             {FONT_CATEGORIES.map(cat => (
                 <button 
                    key={cat}
                    onClick={() => setActiveCat(cat)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap border ${activeCat === cat ? 'bg-primary text-background border-primary' : 'bg-surface text-muted border-border hover:border-primary hover:text-primary'}`}
                 >
                    {cat}
                 </button>
             ))}
          </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {getFontsByCategory(activeCat).map(font => {
                  const isActive = activeFont === font.id;
                  return (
                      <motion.button 
                        key={font.id}
                        onClick={() => handleFontSelect(font)}
                        whileHover={{ scale: 1.02, y: -4 }}
                        whileTap={{ scale: 0.98 }}
                        className={`relative rounded-[24px] border overflow-hidden text-left transition-all ${isActive ? 'border-neon-green ring-2 ring-neon-green/30' : 'border-border hover:border-primary/50'}`}
                        style={{ backgroundColor: 'var(--bg-card)' }}
                      >
                          {/* Live Preview */}
                          <div className="relative aspect-[4/3] p-5 flex flex-col justify-between" style={{ fontFamily: font.family }}>
                              {/* Top Bar */}
                              <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                      <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ backgroundColor: 'var(--accent-color)' }}>
                                          <svg viewBox="0 0 100 100" width="12" height="12" fill="none">
                                              <path d="M30 40 V25 A20 20 0 0 1 70 25 V40" stroke="var(--bg-card)" strokeWidth="12" strokeLinecap="round"/>
                                              <rect x="15" y="40" width="70" height="45" rx="10" stroke="var(--bg-card)" strokeWidth="10" fill="none"/>
                                              <path d="M42 61 L50 69 L62 53" stroke="var(--bg-card)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
                                          </svg>
                                      </div>
                                      <span className="text-[9px] font-bold tracking-wide" style={{ color: 'var(--text-main)' }}>Cryto<span className="bg-gradient-to-r from-zinc-300 to-zinc-500 bg-clip-text text-transparent">Tool</span></span>
                                  </div>
                                  {isActive && (
                                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--accent-color)' }}>
                                          <Check size={12} strokeWidth={3} color="var(--bg-card)" />
                                      </motion.div>
                                  )}
                              </div>
                              
                              {/* Font Sample */}
                              <div className="space-y-3">
                                  <div className="text-2xl font-bold leading-tight" style={{ color: 'var(--text-main)' }}>
                                      {font.name}
                                  </div>
                                  <div className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                                      The quick brown fox jumps over the lazy dog.
                                  </div>
                                  <div className="text-[10px] font-mono" style={{ color: 'var(--accent-color)', opacity: 0.7 }}>
                                      0123456789 !@#$%&*()
                                  </div>
                              </div>
                          </div>
                          
                          {/* Label */}
                          <div className="px-4 py-3 flex items-center justify-between" style={{ borderTop: '1px solid var(--border-color)' }}>
                              <div>
                                  <h4 className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>{font.name}</h4>
                                  <p className="text-[9px] font-medium" style={{ color: 'var(--text-muted)' }}>{font.category}</p>
                              </div>
                              <div className="px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider" style={{ backgroundColor: 'var(--accent-color)', color: 'var(--bg-main)' }}>
                                  {isActive ? 'Active' : font.category}
                              </div>
                          </div>
                      </motion.button>
                  );
              })}
          </div>
      </div>
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
                       <img src={crytoLogo} alt="Privon Vault" className="w-full h-full object-cover relative z-10 drop-shadow-[0_0_30px_rgba(var(--accent-rgb),0.5)]" />
                   </div>
              </div>
              <h1 className="text-4xl font-black text-primary mb-3 tracking-tight">
                  Cryto<span className="bg-gradient-to-r from-zinc-300 via-zinc-400 to-zinc-500 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(212,212,216,0.3)]">Tool</span>
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
