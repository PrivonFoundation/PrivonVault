
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Monitor, LayoutGrid, Palette, PaintBucket, Moon, Sun, Shield, Terminal, 
  FileLock2, EyeOff, Heart, CheckCircle, Globe, Languages, KeyRound, Smartphone, Mail, 
  Info, CodeXml, MessageSquare, AtSign, ExternalLink, Ghost, Calendar, MapPin, 
  Type, CaseUpper, ShieldAlert, Power, ShieldCheck, Lock, Check, Key, Sparkles, ChevronRight,
  Target
} from 'lucide-react';
import logoImg from '../../assets/logo.png';
import { AppTheme } from '../../types';
import { CustomColorPicker } from '../CustomColorPicker';
import { LANGUAGES } from '../../locales';
import { useI18n } from '../../locales/i18nContext';

interface SettingsViewProps {
  onBack: () => void;
  appTheme: AppTheme;
  setAppTheme: (t: AppTheme) => void;
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
        <motion.div key="settings-view" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }} className="absolute inset-0 z-50 flex flex-col bg-background">
        <div className="px-5 pt-6 pb-4 bg-background">
            <div className="flex items-center gap-4"><button onClick={props.onBack} className="p-2 -ml-2 rounded-full hover:bg-surface transition-colors glass-button"><ArrowLeft size={24} className="text-primary" /></button><h2 className="text-xl font-bold tracking-wide text-primary light:text-zinc-800">{t('settings')}</h2></div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-8 space-y-10">
            
            {/* SECTION 1: APPEARANCE */}
            <section>
                <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2 text-muted`}><Monitor size={14} />{t('themes')}</h3>
                <div className="grid grid-cols-3 gap-3">
                <button onClick={() => props.setAppTheme('dark')} className={`rounded-2xl p-4 flex flex-col items-center gap-3 transition-all active:scale-[0.97] ${props.appTheme === 'dark' ? 'glass-card border border-white/20' : 'glass-card opacity-70 hover:opacity-100'}`}>
                  <div className="w-full h-16 rounded-xl overflow-hidden flex flex-col" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div className="flex-1" style={{ backgroundColor: '#000000' }} />
                    <div className="h-3" style={{ backgroundColor: '#18181b' }} />
                    <div className="h-2" style={{ backgroundColor: '#27272a' }} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5"><Moon size={12} />{t('darkMode')}</span>
                </button>
                <button onClick={() => props.setAppTheme('light')} className={`rounded-2xl p-4 flex flex-col items-center gap-3 transition-all active:scale-[0.97] ${props.appTheme === 'light' ? 'glass-card border border-white/20' : 'glass-card opacity-70 hover:opacity-100'}`}>
                  <div className="w-full h-16 rounded-xl overflow-hidden flex flex-col" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div className="flex-1" style={{ backgroundColor: '#ffffff' }} />
                    <div className="h-3" style={{ backgroundColor: '#f4f4f5' }} />
                    <div className="h-2" style={{ backgroundColor: '#e4e4e7' }} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5"><Sun size={12} />{t('lightMode')}</span>
                </button>
                <button onClick={() => props.setAppTheme('system')} className={`rounded-2xl p-4 flex flex-col items-center gap-3 transition-all active:scale-[0.97] ${props.appTheme === 'system' ? 'glass-card border border-white/20' : 'glass-card opacity-70 hover:opacity-100'}`}>
                  <div className="w-full h-16 rounded-xl overflow-hidden flex" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div className="flex-1" style={{ backgroundColor: '#ffffff' }} />
                    <div className="w-[2px]" style={{ backgroundColor: '#a1a1aa' }} />
                    <div className="flex-1" style={{ backgroundColor: '#000000' }} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5"><Monitor size={12} />{t('systemButton')}</span>
                </button>
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

                 {/* PROGRESSIVE LOCK UI */}
                <div className="space-y-6 pt-2">
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
                       <img src={logoImg} alt="Privon Vault" className="w-full h-full object-cover relative z-10 drop-shadow-[0_0_30px_rgba(var(--accent-rgb),0.5)]" />
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
