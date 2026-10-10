import React, { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, Loader2, ShieldCheck, Timer, Copy, Check, ChevronLeft, ChevronRight, Target, ShieldAlert, FolderOpen, RefreshCw, Download, Settings, CheckCircle, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '../locales/i18nContext';
import { QuickSettingsSheet } from './QuickSettingsSheet';
const threatModelVideo = undefined;
import { AutoDestructCountdown } from './AutoDestructCountdown';
import { generatePassphrase, normalizePassphrase } from '../utils/passphrase';

import type { AutoDestructCountdownHandle } from './AutoDestructCountdown';
import {
  derive_key,
  derive_master_key,
  wrap_raw_key,
  unwrap_raw_key,
  base64_decode,
  base64_encode,
  generate_recovery_codes,
  generate_vault_key,
  backup_decrypt,
  decrypt,
  get_argon_params,
} from '../crypto-core/index';
import { db, setVaultKey } from '../crypto-core/db';
import type { CryptoMetadata, VaultWrappers } from '../types';

interface AuthScreenProps {
  onUnlock: () => void;
  isSetup: boolean;
  lockUntil: number | null;
  onFailedAttempt: () => void;
  recoverySettings?: {
    count: number;
  };
  onResetWithRecovery: (code: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  onNewCodes?: (codes: string[]) => void;
  onStoreMasterKey?: (key: Uint8Array) => void;
  onApplyThreatModel?: (config: { autoBlurSeconds: number; autoLockSeconds: number; failedAttemptsThreshold: number; progressiveLockSeconds: number; vaultPinAllowed?: boolean }) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onUnlock, isSetup, lockUntil, onFailedAttempt, recoverySettings, onResetWithRecovery, onNewCodes, onStoreMasterKey, onApplyThreatModel }) => {
  const { t } = useI18n();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [setupStep, setSetupStep] = useState<'welcome' | 'create' | 'restore'>('welcome');
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const [infoTier, setInfoTier] = useState<number | null>(null);
  const [confirmTier, setConfirmTier] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [showLangSheet, setShowLangSheet] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreForm, setRestoreForm] = useState(false);
  const [restoreKey, setRestoreKey] = useState('');
  const [showRestoreKey, setShowRestoreKey] = useState(false);
  const [restoreError, setRestoreError] = useState('');
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [restoreDone, setRestoreDone] = useState(false);
  const restoreFileRef = useRef<HTMLInputElement | null>(null);

  const [setupProgress, setSetupProgress] = useState(0);
  const [setupProgressLabel, setSetupProgressLabel] = useState('');

  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState<1 | 2>(1);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newRecoveryPassword, setNewRecoveryPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const accentColor = localStorage.getItem('theme_accent') || '#E8E8E8';
  const accentRgb = (() => {
    const c = accentColor.replace('#', '');
    return `${parseInt(c.slice(0, 2), 16)}, ${parseInt(c.slice(2, 4), 16)}, ${parseInt(c.slice(4, 6), 16)}`;
  })();



  useEffect(() => {
    if (!lockUntil) {
      setTimeLeft(0);
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(0, Math.ceil((lockUntil - Date.now()) / 1000));
      setTimeLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [lockUntil]);

  const isLocked = timeLeft > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;
    setError(null);
    setIsProcessing(true);
    await new Promise(r => setTimeout(r, 16));

    try {
      if (isSetup) return;

      const wrappersRaw = localStorage.getItem('privon_vault_wrappers');
        if (wrappersRaw) {
          const metadataRaw = localStorage.getItem('privon_crypto_metadata');
          if (!metadataRaw) {
            setError(t('missingData'));
            setIsProcessing(false);
            return;
          }

          const wrappers: VaultWrappers = JSON.parse(wrappersRaw);
          const meta: CryptoMetadata = JSON.parse(metadataRaw);
          const masterSalt = base64_decode(meta.master_salt);
          const ap = meta.argon || { iterations: 2, memoryKib: 19456, parallelism: 1 };

        const masterKey = derive_key(new TextEncoder().encode(normalizePassphrase(password)), masterSalt, ap.iterations, ap.memoryKib, ap.parallelism, 32);

          try {
            const mvkBytes = await unwrap_raw_key(JSON.stringify(wrappers.master), masterKey);
            setVaultKey(mvkBytes);
            mvkBytes.fill(0);
            onStoreMasterKey?.(masterKey);
            onUnlock();
          } catch (err) {
            setError(t('wrongPassword'));
            setPassword('');
            onFailedAttempt();
          }
        } else {
          const saltB64 = localStorage.getItem('privon_salt');
          const ivB64 = localStorage.getItem('privon_iv');
          const vaultB64 = localStorage.getItem('privon_vault_blob');

          if (!saltB64 || !ivB64 || !vaultB64) {
            setError(t('missingData'));
            setIsProcessing(false);
            return;
          }

          const salt = base64_decode(saltB64);
          const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

          const masterKey = derive_master_key(normalizePassphrase(password), salt, isMobile);

          try {
            const rawVaultKey = decrypt(vaultB64, ivB64, masterKey);
            setVaultKey(rawVaultKey);
            onStoreMasterKey?.(masterKey);
            onUnlock();
          } catch (err) {
            setError(t('wrongPassword'));
            setPassword('');
            onFailedAttempt();
          }
        }
    } catch (err) {
      console.error(err);
      setError(t('cryptoError'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitCreate();
  };

  const submitCreate = () => {
    setError(null);
    const pw = normalizePassphrase(password);
    if (!passphraseGenerated && pw.length < 30) {
      setError(t('passwordTooShort'));
      return;
    }
    if (pw !== normalizePassphrase(confirmPassword)) {
      setError(t('passwordsDoNotMatch'));
      return;
    }
    const tierId = confirmTier ?? 1;
    const tier = TIERS.find(t => t.id === tierId);
    if (!tier) return;
    completeSetup(tier.config.argon, tierId, pw);
  };

  const completeSetup = async (argonParams: { iterations: number; memoryKib: number; parallelism: number }, tierId: number, passphrase: string) => {
    setIsProcessing(true);
    setError(null);

    const yieldToReact = () => new Promise(r => setTimeout(r, 16));

    try {
      setSetupProgress(2);
      setSetupProgressLabel('Generating encryption keys...');
      await yieldToReact();
      const mvkBytes = await generate_vault_key();
      const codes = generate_recovery_codes();

      const masterSalt = window.crypto.getRandomValues(new Uint8Array(16));
      let masterWrapper: { ciphertext: string; iv: string } | null = null;

      setSetupProgress(10);
      setSetupProgressLabel('Deriving master key...');
      await yieldToReact();
      const masterKey = derive_key(new TextEncoder().encode(passphrase), masterSalt, argonParams.iterations, argonParams.memoryKib, argonParams.parallelism, 32);

      setSetupProgress(30);
      setSetupProgressLabel('Wrapping master key...');
      await yieldToReact();
      masterWrapper = JSON.parse(await wrap_raw_key(mvkBytes, masterKey));

      setSetupProgress(35);
      setSetupProgressLabel('Generating recovery codes...');
      await yieldToReact();
      const recoverySalts: string[] = [];
      const recoveryWrappers: Record<string, { ciphertext: string; iv: string }> = {};

      const recoveryParams = JSON.parse(get_argon_params('recovery', tierId));
      let codesDone = 0;
      const batchSize = 3;
      for (let b = 0; b < codes.length; b += batchSize) {
        const batch = codes.slice(b, b + batchSize);
        const results = await Promise.all(batch.map(async (code, bi) => {
          const i = b + bi;
          const salt = window.crypto.getRandomValues(new Uint8Array(16));
          const key = await derive_key(new TextEncoder().encode(code), salt, recoveryParams.iterations, recoveryParams.memorySize, recoveryParams.parallelism, 32);
          const paddedIdx = String(i + 1).padStart(2, '0');
          const wrapper = JSON.parse(await wrap_raw_key(mvkBytes, key));
          return { salt: base64_encode(salt), paddedIdx, wrapper };
        }));
        for (const r of results) {
          recoverySalts.push(r.salt);
          recoveryWrappers[r.paddedIdx] = r.wrapper;
        }
        codesDone += batch.length;
        setSetupProgress(35 + Math.round((codesDone / codes.length) * 55));
        setSetupProgressLabel(`Generating recovery codes (${codesDone}/${codes.length})...`);
        await yieldToReact();
      }

      setSetupProgress(92);
      setSetupProgressLabel('Finalizing setup...');
      await yieldToReact();
      const meta: CryptoMetadata = {
        master_salt: base64_encode(masterSalt),
        recovery_salts: recoverySalts,
        argon: argonParams,
        tier: tierId,
      };
      const wrappers: VaultWrappers = {
        master: masterWrapper!,
        recovery: recoveryWrappers,
      };

      localStorage.setItem('privon_crypto_metadata', JSON.stringify(meta));
      localStorage.setItem('privon_vault_wrappers', JSON.stringify(wrappers));

      setVaultKey(mvkBytes);
      mvkBytes.fill(0);
      onNewCodes?.(codes);
      setSetupProgress(100);
      setSetupProgressLabel('Done!');
      await yieldToReact();
      onUnlock();
    } catch (err) {
      console.error(err);
      setError(t('cryptoError'));
      setIsProcessing(false);
    }
  };

  const THREAT_MODEL_TIER1 = {
    autoBlurSeconds: 20,
    autoLockSeconds: 25,
    failedAttemptsThreshold: 3,
    progressiveLockSeconds: 60,
    autoDestructEnabled: false,
    autoDestructAttempts: 5,
    autoDestructInactivity: 0,
    destructCountdownSeconds: 30,
    minPasswordLength: 30,
    settingsPasswordRequired: false,
    vaultPinAllowed: true,
    backupFilenameRandom: false,
    recoveryFilenameRandom: false,
    argon: { iterations: 2, memoryKib: 19456, parallelism: 1 },
    argonRecovery: { iterations: 2, memoryKib: 19456, parallelism: 1 },
    argonPin: { iterations: 2, memoryKib: 32768, parallelism: 1 },
  };

  const THREAT_MODEL_TIER2 = {
    autoBlurSeconds: 10,
    autoLockSeconds: 15,
    failedAttemptsThreshold: 3,
    progressiveLockSeconds: 120,
    autoDestructEnabled: false,
    autoDestructAttempts: 5,
    autoDestructInactivity: 0,
    destructCountdownSeconds: 30,
    minPasswordLength: 30,
    settingsPasswordRequired: false,
    vaultPinAllowed: true,
    backupFilenameRandom: true,
    recoveryFilenameRandom: true,
    argon: { iterations: 3, memoryKib: 65536, parallelism: 1 },
    argonRecovery: { iterations: 3, memoryKib: 65536, parallelism: 1 },
    argonPin: { iterations: 3, memoryKib: 65536, parallelism: 1 },
  };

  const THREAT_MODEL_TIER3 = {
    autoBlurSeconds: 5,
    autoLockSeconds: 10,
    failedAttemptsThreshold: 2,
    progressiveLockSeconds: 300,
    autoDestructEnabled: true,
    autoDestructAttempts: 5,
    autoDestructInactivity: 86400,
    destructCountdownSeconds: 30,
    minPasswordLength: 40,
    settingsPasswordRequired: true,
    vaultPinAllowed: false,
    backupFilenameRandom: true,
    recoveryFilenameRandom: true,
    argon: { iterations: 10, memoryKib: 131072, parallelism: 1 },
    argonRecovery: { iterations: 10, memoryKib: 131072, parallelism: 1 },
    argonPin: { iterations: 10, memoryKib: 131072, parallelism: 1 },
  };

  const THREAT_MODEL_TIER4 = {
    autoBlurSeconds: 2,
    autoLockSeconds: 5,
    failedAttemptsThreshold: 2,
    progressiveLockSeconds: 0,
    autoDestructEnabled: true,
    autoDestructAttempts: 3,
    autoDestructInactivity: 43200,
    destructCountdownSeconds: 15,
    minPasswordLength: 50,
    settingsPasswordRequired: true,
    vaultPinAllowed: false,
    backupFilenameRandom: true,
    recoveryFilenameRandom: true,
    argon: { iterations: 19, memoryKib: 262144, parallelism: 1 },
    argonRecovery: { iterations: 19, memoryKib: 262144, parallelism: 1 },
    argonPin: { iterations: 19, memoryKib: 262144, parallelism: 1 },
  };

  const THREAT_MODEL_TIER5 = {
    autoBlurSeconds: 1,
    autoLockSeconds: 3,
    failedAttemptsThreshold: 2,
    progressiveLockSeconds: 0,
    autoDestructEnabled: true,
    autoDestructAttempts: 3,
    autoDestructInactivity: 21600,
    destructCountdownSeconds: 10,
    minPasswordLength: 64,
    settingsPasswordRequired: true,
    vaultPinAllowed: false,
    backupFilenameRandom: true,
    recoveryFilenameRandom: true,
    argon: { iterations: 19, memoryKib: 262144, parallelism: 1 },
    argonRecovery: { iterations: 19, memoryKib: 262144, parallelism: 1 },
    argonPin: { iterations: 19, memoryKib: 262144, parallelism: 1 },
  };

  const TIERS = [
    { id: 1, icon: Target, nameKey: 'tier1Name', descKey: 'tier1Desc', blocked: false, config: THREAT_MODEL_TIER1 },
    { id: 5, icon: ShieldAlert, nameKey: 'advancedProtection', descKey: 'advancedProtectionDesc', blocked: true, config: THREAT_MODEL_TIER5 },
  ] as const;


  const [passphraseGenerated, setPassphraseGenerated] = useState(false);

  useEffect(() => {
    if (isSetup && setupStep === 'create' && !passphraseGenerated) {
      const phrase = generatePassphrase();
      setPassword(phrase);
      setConfirmPassword(phrase);
      setPassphraseGenerated(true);
      setError(null);
    }
  }, [isSetup, setupStep, passphraseGenerated]);

  const [phraseRevealed, setPhraseRevealed] = useState(false);

  const handleRegeneratePassphrase = () => {
    const phrase = generatePassphrase();
    setPassword(phrase);
    setConfirmPassword(phrase);
    setPhraseRevealed(false);
    setError(null);
  };

  const handleDownloadPassphrase = () => {
    try {
      const blob = new Blob([password], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'privon-vault-passphrase.txt';
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
  };

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const resetRestore = () => {
    setRestoreFile(null);
    setRestoreForm(false);
    setRestoreKey('');
    setShowRestoreKey(false);
    setRestoreError('');
    setRestoreBusy(false);
    setRestoreDone(false);
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setRestoreFile(e.target.files[0]);
      setRestoreError('');
    }
  };

  const startFreshVault = () => {
    setSelectedTier(1);
    setConfirmTier(1);
    const tier = TIERS.find(t => t.id === 1);
    if (tier) onApplyThreatModel?.(tier.config);
    setSetupStep('create');
  };

  const executeSetupRestore = async () => {
    if (!restoreFile || !restoreKey) {
      setRestoreError(t('selectFileAndKey'));
      return;
    }
    setRestoreBusy(true);
    setRestoreError('');
    try {
      const fileBytes = new Uint8Array(await restoreFile.arrayBuffer());
      const jsonBytes = await backup_decrypt(fileBytes, restoreKey, 3, 65536, 4);
      const data = JSON.parse(new TextDecoder().decode(jsonBytes));
      if (!data.db || !data.localStorage) throw new Error('Format invalid');
      const allowedKeys = new Set([
        'privon_salt', 'privon_iv', 'privon_vault_blob',
        'privon_crypto_metadata', 'privon_vault_wrappers',
        'privon_vault_pin_hash', 'privon_vault_enabled',
        'privon_vault_cats', 'privon_vault_keys',
        'privon_devcreds', 'privon_devcreds_meta', 'privon_devcreds_cats',
        'privon_ad_enabled', 'privon_ad_attempts', 'privon_ad_inactivity', 'privon_ad_countdown',
        'privon_blur_time', 'privon_lock_time',
        'privon_prog_lock_time', 'privon_prog_attempts',
        'privon_destruct_time',
        'theme_accent', 'app_language', 'app_region',
      ]);
      Object.entries(data.localStorage).forEach(([k, v]) => {
        if (v && allowedKeys.has(k)) localStorage.setItem(k, v as string);
      });
      await db.importDatabase(data.db);
      setRestoreDone(true);
    } catch (e) {
      console.error(e);
      setRestoreError(t('wrongKeyOrCorrupt'));
    } finally {
      setRestoreBusy(false);
    }
  };

  const Logo = () => (
    <div className={`relative flex items-center justify-center px-10 py-6 transition-all duration-700`}>
      <div className={`absolute -inset-4 md:-inset-6 blur-[80px] md:blur-[120px] rounded-full animate-pulse transition-all duration-700 ${isLocked ? 'bg-red-500/20' : ''}`} style={{ backgroundColor: isLocked ? undefined : `rgba(${accentRgb}, 0.3)` }} />
      <span
        className={`relative z-10 text-6xl md:text-7xl font-black tracking-tighter font-mono transition-all duration-500 ${isLocked ? 'opacity-50 grayscale' : ''}`}
        style={{ color: 'var(--accent-color)', filter: isLocked ? 'none' : `drop-shadow(0 0 40px rgba(${accentRgb}, 0.6)) drop-shadow(0 0 80px rgba(${accentRgb}, 0.3))` }}
      >
        P
      </span>
    </div>
  );

  if (isSetup) {
    return (
      <div className="bg-background h-screen h-dvh overflow-hidden">
        <AnimatePresence mode="wait">
          {setupStep === 'welcome' ? (
            <motion.div
              key="welcome"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="absolute inset-0 overflow-hidden bg-background"
            >
              {/* Content — Anytype style: wordmark top, headline middle, actions bottom */}
              <div className="relative z-10 flex flex-col items-center h-full w-full max-w-md mx-auto px-6 pt-6 pb-8">

                {/* Top bar — wordmark center, settings right */}
                <div className="w-full flex items-center justify-between h-11 shrink-0">
                  <div className="w-11" />
                  <span className="text-[17px] font-semibold tracking-tight text-primary lowercase">
                    {t('crytoPrefix')} {t('toolSuffix')}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowLangSheet(true)}
                    aria-label={t('languageInterface')}
                    className="w-11 h-11 rounded-full flex items-center justify-center text-muted hover:text-primary active:scale-90 transition-all"
                  >
                    <Settings size={22} />
                  </button>
                </div>

                {/* Headline */}
                <div className="flex-1 w-full flex flex-col items-center justify-center text-center px-2">
                  <motion.h1
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  >
                    <span className="block text-[38px] md:text-[52px] font-semibold tracking-[-0.02em] leading-[1.1] text-primary">
                      {t('welcomeHeroLine1')}
                    </span>
                    <span
                      className="block text-[38px] md:text-[52px] leading-[1.15] text-muted italic"
                      style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                    >
                      {t('welcomeHeroLine2')}
                    </span>
                  </motion.h1>
                </div>

                {/* Actions */}
                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, delay: 0.15, ease: 'easeOut' }}
                  className="w-full flex flex-col items-center gap-3"
                >
                  <button
                    type="button"
                    onClick={startFreshVault}
                    className="w-full py-4 rounded-full font-semibold text-[17px] transition-all active:scale-[0.98]"
                    style={{ backgroundColor: 'var(--accent-color)', color: 'var(--accent-contrast)' }}
                  >
                    {t('welcomeNewHere')}
                  </button>
                  <button
                    type="button"
                    onClick={() => { resetRestore(); setSetupStep('restore'); }}
                    className="w-full py-4 rounded-full font-semibold text-[17px] text-primary border transition-all active:scale-[0.98]"
                    style={{ backgroundColor: 'var(--onb-surface-strong)', borderColor: 'var(--onb-border)' }}
                  >
                    {t('welcomeHaveKey')}
                  </button>
                  <p
                    className="text-[12px] leading-relaxed text-center max-w-[300px] mt-1"
                    style={{ color: 'var(--onb-text-faint)' }}
                  >
                    {t('welcomeConsent')}
                  </p>
                </motion.div>
              </div>

              {/* Quick settings sheet — appearance + language */}
              <QuickSettingsSheet open={showLangSheet} onClose={() => setShowLangSheet(false)} />
            </motion.div>
          ) : setupStep === 'restore' ? (
            <motion.div
              key="restore"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="absolute inset-0 overflow-hidden bg-background"
            >
              <div className="relative z-10 flex flex-col h-full w-full max-w-md mx-auto px-6 pt-6 pb-8 overflow-y-auto">

                {/* Top bar — back only */}
                <div className="w-full flex items-center h-11 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (restoreDone || !restoreForm) {
                        resetRestore();
                        setSetupStep('welcome');
                      } else {
                        setRestoreForm(false);
                        setRestoreError('');
                      }
                    }}
                    aria-label={t('backButton')}
                    className="w-11 h-11 -ml-2 rounded-full flex items-center justify-center text-muted hover:text-primary active:scale-90 transition-all"
                  >
                    <ChevronLeft size={24} />
                  </button>
                </div>

                {!restoreDone ? (
                  !restoreForm ? (
                    <>
                      <motion.div
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        className="mt-6 mb-7"
                      >
                        <h1 className="text-[34px] font-semibold tracking-tight leading-[1.12] text-primary">
                          {t('restoreTitle')}
                        </h1>
                        <p className="mt-3 text-[16px] leading-relaxed text-muted">
                          {t('restoreSubtitle')}
                        </p>
                      </motion.div>

                      <div className="w-full flex flex-col gap-3">
                        <button
                          type="button"
                          onClick={() => setRestoreForm(true)}
                          className="w-full flex items-center gap-5 p-5 rounded-[22px] text-left transition-all active:scale-[0.98]"
                          style={{ backgroundColor: 'var(--onb-surface-strong)' }}
                        >
                          <FolderOpen size={42} strokeWidth={1.5} className="shrink-0" style={{ color: 'var(--accent-color)' }} />
                          <span className="min-w-0">
                            <span className="block text-[19px] font-semibold text-primary">
                              {t('restoreFromFile')}
                            </span>
                            <span className="block mt-1 text-[15px] leading-snug text-muted">
                              {t('restoreFromFileDesc')}
                            </span>
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={startFreshVault}
                          className="w-full flex items-center gap-5 p-5 rounded-[22px] text-left transition-all active:scale-[0.98]"
                          style={{ backgroundColor: 'var(--onb-surface-strong)' }}
                        >
                          <Plus size={42} strokeWidth={1.5} className="shrink-0" style={{ color: 'var(--accent-color)' }} />
                          <span className="min-w-0">
                            <span className="block text-[19px] font-semibold text-primary">
                              {t('restoreStartFresh')}
                            </span>
                            <span className="block mt-1 text-[15px] leading-snug text-muted">
                              {t('restoreStartFreshDesc')}
                            </span>
                          </span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                    <motion.div
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className="mt-6 mb-6"
                    >
                      <h1 className="text-[26px] font-bold tracking-tight text-primary">
                        {t('restoreFromFile')}
                      </h1>
                      <p className="mt-2 text-[14px] leading-relaxed text-muted">
                        {t('restoreFromFileDesc')}
                      </p>
                    </motion.div>

                    <div className="w-full flex flex-col gap-3">
                      <input
                        ref={restoreFileRef}
                        type="file"
                        accept=".enc"
                        className="hidden"
                        onChange={handleRestoreFile}
                      />
                      <button
                        type="button"
                        onClick={() => restoreFileRef.current?.click()}
                        className="w-full flex items-center gap-4 p-4 rounded-[24px] border-2 border-dashed text-left transition-all active:scale-[0.98]"
                        style={{ borderColor: restoreFile ? 'var(--accent-color)' : 'var(--onb-border)', backgroundColor: 'var(--onb-surface)' }}
                      >
                        <span
                          className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                          style={{ backgroundColor: 'var(--onb-surface-strong)', color: 'var(--accent-color)' }}
                        >
                          <FolderOpen size={22} />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[15px] font-semibold text-primary truncate">
                            {restoreFile ? restoreFile.name : t('backupFile')}
                          </span>
                          <span className="block text-[12px] text-muted">
                            {restoreFile ? `${(restoreFile.size / 1024).toFixed(1)} KB` : '.enc'}
                          </span>
                        </span>
                      </button>

                      <div
                        className="w-full flex items-center gap-3 px-4 rounded-[24px] border"
                        style={{ backgroundColor: 'var(--onb-surface)', borderColor: 'var(--onb-border)' }}
                      >
                        <input
                          type={showRestoreKey ? 'text' : 'password'}
                          value={restoreKey}
                          onChange={(e) => { setRestoreKey(e.target.value); setRestoreError(''); }}
                          placeholder={t('decryptionKey')}
                          autoComplete="off"
                          className="flex-1 min-w-0 bg-transparent py-4 text-[15px] text-primary placeholder:text-muted focus:outline-none font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRestoreKey(v => !v)}
                          className="p-2 -mr-2 rounded-full text-muted hover:text-primary transition-colors"
                        >
                          {showRestoreKey ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>

                      {restoreError && (
                        <p className="text-red-400 text-[13px] font-medium bg-red-500/10 px-4 py-3 rounded-2xl border border-red-500/20 text-center">
                          {restoreError}
                        </p>
                      )}

                      <p
                        className="text-[12px] leading-relaxed text-center px-2"
                        style={{ color: 'var(--onb-text-faint)' }}
                      >
                        {t('restoreWarning')}
                      </p>
                    </div>

                    <div className="mt-auto pt-8 w-full">
                      <button
                        type="button"
                        onClick={executeSetupRestore}
                        disabled={restoreBusy}
                        className="w-full py-4 rounded-full font-semibold text-[17px] flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60"
                        style={{ backgroundColor: 'var(--accent-color)', color: 'var(--accent-contrast)' }}
                      >
                        {restoreBusy && <Loader2 size={18} className="animate-spin" />}
                        {restoreBusy ? t('restoring') : t('restoreAll')}
                      </button>
                    </div>
                    </>
                  )
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex-1 w-full flex flex-col items-center justify-center text-center gap-4"
                  >
                    <span
                      className="w-20 h-20 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: 'var(--accent-color)', color: 'var(--accent-contrast)' }}
                    >
                      <CheckCircle size={40} />
                    </span>
                    <h1 className="text-[26px] font-bold tracking-tight text-primary">
                      {t('restoreSuccess')}
                    </h1>
                    <p className="text-[14px] text-muted">{t('appReload')}</p>
                    <button
                      type="button"
                      onClick={() => window.location.reload()}
                      className="mt-2 w-full py-4 rounded-full font-semibold text-[17px] transition-all active:scale-[0.98]"
                      style={{ backgroundColor: 'var(--accent-color)', color: 'var(--accent-contrast)' }}
                    >
                      {t('reload')}
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          ) : setupStep === 'create' ? (
            <motion.div
              key="create"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="absolute inset-0 overflow-hidden bg-background"
            >
              {/* Solid background — deep black in dark mode, clean white in light mode */}
              <div className="absolute inset-0 bg-background" />
              <div className="absolute w-96 h-96 opacity-[0.07]" style={{ top: '-12%', left: '-8%', background: 'radial-gradient(circle, var(--accent-color) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(70px)' }} />

              <div className="relative z-10 flex flex-col items-center h-full px-6 pt-4 pb-8 overflow-y-auto">

              {/* Header — Anytype style: back chevron left, wordmark center */}
              <div className="w-full flex items-center justify-between h-10 shrink-0">
                <button
                  type="button"
                  onClick={() => { setSetupStep('welcome'); setPassword(''); setConfirmPassword(''); setPassphraseGenerated(false); setPhraseRevealed(false); setError(null); }}
                  aria-label={t('backButton')}
                  className="-ml-2 w-10 h-10 rounded-full flex items-center justify-center text-muted hover:text-primary hover:bg-[var(--onb-surface)] transition-all active:scale-90"
                >
                  <ChevronLeft size={22} />
                </button>

                <span className="text-[15px] font-bold tracking-tight text-primary">
                  {t('crytoPrefix')} {t('toolSuffix')}
                </span>

                <div className="w-10" />
              </div>

              {/* Headline — large, bold, centered */}
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, ease: 'easeOut' }}
                className="text-center mt-8 md:mt-14 mb-7 md:mb-10 max-w-md"
              >
                <h1 className="text-[30px] md:text-[44px] font-black tracking-[-0.02em] leading-[1.08] text-primary">
                  {t('thisIsYourKey')}
                </h1>
                <p className="mt-4 md:mt-5 text-[13px] md:text-[15px] leading-relaxed text-muted">
                  {t('setupCopyWarning1')}
                </p>
                <p className="mt-2.5 text-[12px] md:text-[13px] leading-relaxed" style={{ color: 'var(--onb-text-faint)' }}>
                  {t('setupCopyWarning2')}
                </p>
              </motion.div>

              {/* Phrase card — blurred until revealed */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.1, ease: 'easeOut' }}
                className="w-full max-w-2xl rounded-[28px] md:rounded-[36px] p-4 md:p-7 border bg-[var(--onb-surface)] backdrop-blur-2xl"
                style={{ borderColor: 'var(--onb-border)' }}
              >
                <div className="grid grid-cols-3 md:grid-cols-5 gap-2 md:gap-2.5">
                  {passphraseGenerated && password.split(' ').filter(Boolean).map((word, i) => (
                    <motion.div
                      key={`${word}-${i}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.02 * i, duration: 0.3, ease: 'easeOut' }}
                      className="flex items-center justify-center gap-1.5 px-2 py-2.5 md:py-3 rounded-2xl border min-w-0"
                      style={{ backgroundColor: 'var(--onb-surface-strong)', borderColor: 'var(--onb-border)' }}
                    >
                      <span className="text-[9px] md:text-[10px] text-muted font-bold w-3.5 shrink-0 text-right tabular-nums">{i + 1}</span>
                      <span
                        className={`text-[11px] sm:text-xs md:text-sm font-bold text-primary truncate transition-all duration-500 select-none ${phraseRevealed ? '' : 'blur-[7px]'}`}
                        aria-hidden={!phraseRevealed}
                      >
                        {word}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Actions row */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="flex items-center justify-center gap-1 md:gap-2 mt-5 md:mt-6"
              >
                <button
                  type="button"
                  onClick={() => { setPhraseRevealed(true); handleCopyPassword(); }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px] md:text-[13px] font-semibold text-muted hover:text-primary hover:bg-[var(--onb-surface)] transition-all active:scale-95"
                >
                  {copied ? <Check size={15} style={{ color: 'var(--accent-color)' }} /> : <Copy size={15} />}
                  {copied ? t('copied') : t('copyKey')}
                </button>
                <button
                  type="button"
                  onClick={() => { setPhraseRevealed(true); handleDownloadPassphrase(); }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px] md:text-[13px] font-semibold text-muted hover:text-primary hover:bg-[var(--onb-surface)] transition-all active:scale-95"
                >
                  <Download size={15} /> {t('downloadPhrase')}
                </button>
                <button
                  type="button"
                  onClick={handleRegeneratePassphrase}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px] md:text-[13px] font-semibold text-muted hover:text-primary hover:bg-[var(--onb-surface)] transition-all active:scale-95"
                >
                  <RefreshCw size={15} /> {t('regenerate')}
                </button>
              </motion.div>

              {/* Primary + secondary actions */}
              <div className="mt-auto pt-8 md:pt-12 w-full flex flex-col items-center">
                <form onSubmit={handleCreateFormSubmit} className="w-full max-w-md flex flex-col items-center">
                {error && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="text-red-400 text-xs font-medium bg-red-500/10 p-2.5 rounded-xl border border-red-500/20 text-center w-full mb-3">
                    {error}
                  </motion.div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (!phraseRevealed) {
                      setPhraseRevealed(true);
                      handleCopyPassword();
                    } else {
                      submitCreate();
                    }
                  }}
                  className="w-full py-4 md:py-[18px] rounded-full font-bold text-[15px] md:text-base flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-[0.98]"
                  style={{ backgroundColor: accentColor, color: 'var(--accent-contrast)' }}
                >
                  {!phraseRevealed && !copied ? t('revealAndCopy') : !phraseRevealed ? t('copied') : t('continueButton')}
                  <ChevronRight size={18} />
                </button>
                </form>
              </div>
              </div>
            </motion.div>
          ) : null}
          </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center bg-background px-4 pt-12 md:pt-24 pb-6 font-sans text-primary min-h-screen min-h-dvh overflow-y-auto">
      <div className="flex flex-col items-center space-y-3 md:space-y-5">
        <Logo />
        <div className="text-2xl md:text-3xl font-bold tracking-tight">
          <span className={`font-bold tracking-tight ${isLocked ? 'text-red-500' : 'text-primary'}`}>{t('crytoPrefix')}</span>
          {' '}
          <span className={isLocked ? 'text-red-500' : 'text-primary'}>{t('toolSuffix')}</span>
        </div>
        <p className="text-sm tracking-wide text-muted">{t('allInOnePrivacyTagline')}</p>
      </div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={`w-full max-w-md glass-card border ${isLocked ? 'border-red-500/50' : 'border-white/10'} rounded-3xl p-5 relative mt-6 md:mt-10 overflow-hidden`}
      >
        <div className="relative z-10">
        <AnimatePresence mode="wait">
          {isRecoveryMode ? (
            recoveryStep === 1 ? (
              <motion.div
                key="recovery-code"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="mb-6">
                  <h1 className="text-xl font-bold mb-2 text-primary">{t('resetWithRecoveryCode')}</h1>
                  <p className="text-muted text-sm leading-relaxed">{t('recoveryCodesDescription')}</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-muted font-medium ml-1">{t('recoveryCodeLabel')}</label>
                    <input
                      type="text"
                      value={recoveryCode}
                      onChange={(e) => setRecoveryCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))}
                      placeholder={t('recoveryCodePlaceholder')}
                      className="w-full bg-surface border border-border text-primary rounded-xl px-4 py-3 mt-1 focus:outline-none focus:border-primary transition-all placeholder:text-muted font-mono tracking-wider"
                      maxLength={23}
                      autoFocus
                    />
                  </div>

                  {error && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-red-500 text-sm font-medium bg-red-500/10 p-2.5 rounded-lg border border-red-500/20 text-center">
                      {error}
                    </motion.div>
                  )}

                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={() => {
                        setIsRecoveryMode(false);
                        setRecoveryStep(1);
                        setRecoveryCode('');
                        setNewRecoveryPassword('');
                        setConfirmNewPassword('');
                        setError(null);
                      }}
                      className="flex-1 py-3 rounded-xl border border-zinc-700 text-zinc-400 text-sm font-medium hover:bg-zinc-800 transition-colors active:scale-[0.99]"
                    >
                      {t('cancel')}
                    </button>
                    <button
                      onClick={() => {
                        const trimmed = recoveryCode.trim();
                        if (!trimmed || trimmed.length < 23) {
                          setError(t('invalidRecoveryCode'));
                          return;
                        }
                        setError(null);
                        setRecoveryStep(2);
                      }}
                      disabled={isProcessing || recoveryCode.trim().length < 23}
                      className="flex-1 py-3 rounded-xl text-black text-sm font-bold disabled:opacity-50 active:scale-[0.99] transition-all"
                      style={{ backgroundColor: accentColor }}
                    >
                      {t('continueButton')}
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="recovery-password"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="mb-6">
                  <h1 className="text-xl font-bold mb-2 text-primary">{t('setupPassword')}</h1>
                  <p className="text-muted text-sm leading-relaxed">{t('min30Chars')}</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-muted font-medium ml-1">{t('newPasswordMin30')}</label>
                    <input
                      type="password"
                      value={newRecoveryPassword}
                      onChange={(e) => setNewRecoveryPassword(e.target.value)}
                      placeholder={t('newPasswordPlaceholder')}
                      className="w-full bg-surface border border-border text-primary rounded-xl px-4 py-3 mt-1 focus:outline-none focus:border-primary transition-all placeholder:text-muted"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="text-xs text-muted font-medium ml-1">{t('confirmPassword')}</label>
                    <input
                      type="password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder={t('confirmPasswordPlaceholder')}
                      className="w-full bg-surface border border-border text-primary rounded-xl px-4 py-3 mt-1 focus:outline-none focus:border-primary transition-all placeholder:text-muted"
                    />
                  </div>

                  {error && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-red-500 text-sm font-medium bg-red-500/10 p-2.5 rounded-lg border border-red-500/20 text-center">
                      {error}
                    </motion.div>
                  )}

                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={() => {
                        setRecoveryStep(1);
                        setError(null);
                      }}
                      className="flex-1 py-3 rounded-xl border border-zinc-700 text-zinc-400 text-sm font-medium hover:bg-zinc-800 transition-colors active:scale-[0.99]"
                    >
                      {t('backButton')}
                    </button>
                    <button
                      onClick={async () => {
                        if (newRecoveryPassword.length < 30) {
                          setError(t('passwordTooShort'));
                          return;
                        }
                        if (newRecoveryPassword !== confirmNewPassword) {
                          setError(t('passwordsDoNotMatch'));
                          return;
                        }
                        setIsProcessing(true);
                        const result = await onResetWithRecovery(recoveryCode, newRecoveryPassword);
                        setIsProcessing(false);
                        if (result.success) {
                          window.location.reload();
                        } else {
                          setError(result.error || t('resetErrorLabel'));
                        }
                      }}
                      disabled={isProcessing || !newRecoveryPassword || !confirmNewPassword}
                      className="flex-1 py-3 rounded-xl text-black text-sm font-bold disabled:opacity-50 active:scale-[0.99] transition-all"
                      style={{ backgroundColor: accentColor }}
                    >
                      {isProcessing ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 size={16} className="animate-spin" />
                          {t('processing')}
                        </span>
                      ) : t('resetButton')}
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          ) : (
            <motion.div
              key="unlock"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.25 }}
            >
              <div className="mb-6">
                <h1 className={`text-xl font-bold mb-2 ${isLocked ? 'text-red-500' : 'text-primary'}`}>
                  {isLocked ? t('lockedOut') : (isSetup ? t('setupPassword') : t('unlock'))}
                </h1>
                <p className="text-muted text-sm leading-relaxed">
                  {isLocked
                    ? `${t('securityLockout')} ${t('tryAgainIn')} ${timeLeft} ${t('processing')}`
                    : (isSetup
                        ? `${t('argon2idAES')} ${t('min30Chars')}`
                        : t('enterMasterPassword')
                      )
                  }
                </p>
              </div>

              {isLocked && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center p-6 bg-red-500/5 rounded-2xl border border-red-500/10 mb-4"
                >
                  <Timer className="text-red-500 mb-3 animate-pulse" size={36} />
                  <div className="text-3xl font-black font-mono text-red-500">{timeLeft}s</div>
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className={`space-y-4 ${isLocked ? 'opacity-30 pointer-events-none grayscale' : ''}`}>
                <div className="space-y-1.5">
                  <label className="text-sm text-muted font-medium ml-1">{t('masterPassword')}</label>
                  <div className="relative group">
                    <input
                      disabled={isProcessing || isLocked}
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t('enterPasswordField')}
                      className={`w-full bg-surface border ${false ? 'border-red-500/50 focus:border-red-500' : 'border-border focus:border-primary'} text-primary rounded-xl pl-4 pr-20 py-3 focus:outline-none transition-all placeholder:text-muted disabled:opacity-50`}
                      autoFocus
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-3 text-muted">
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="hover:text-primary transition-colors"
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>
                </div>

                {isSetup && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-1.5">
                    <label className="text-sm text-muted font-medium ml-1">{t('confirmPassword')}</label>
                    <input
                      disabled={isProcessing || isLocked}
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={t('confirmYourPassword')}
                      className="w-full bg-surface border border-border text-primary rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-all placeholder:text-muted"
                    />
                  </motion.div>
                )}

                {error && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-red-500 text-sm font-medium bg-red-500/10 p-2.5 rounded-lg border border-red-500/20 text-center">
                    {error}
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={isProcessing || isLocked}
                  className={`w-full text-black font-bold text-base py-3 rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:grayscale disabled:opacity-50 ${false ? 'bg-red-500 hover:bg-red-400' : isLocked ? 'bg-zinc-800' : ''}`}
                  style={{ backgroundColor: false ? undefined : (isLocked ? undefined : accentColor), boxShadow: false ? '0 0 20px rgba(239,68,68,0.4)' : (isLocked ? undefined : `0 0 15px rgba(${accentRgb}, 0.3)`) }}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      <span>{t('processing')}</span>
                    </>
                  ) : (
                    <>
                      {isSetup ? t('saveAndContinue') : t('unlockVault')}
                      {!isSetup && <ShieldCheck size={20} />}
                    </>
                  )}
                </button>
              </form>

              {!isSetup && !isLocked && recoverySettings && recoverySettings.count > 0 && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRecoveryMode(true);
                      setRecoveryStep(1);
                    }}
                    className="w-full py-2 text-xs text-zinc-500 hover:text-white transition-colors"
                  >
                    {t('forgotPasswordLink')}
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
