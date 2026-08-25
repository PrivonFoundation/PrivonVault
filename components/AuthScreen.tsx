import React, { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, Loader2, ShieldCheck, Timer, Copy, Check, ChevronRight, Target, ShieldAlert, FolderOpen, RefreshCw, Code2, Download, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '../locales/i18nContext';
import logoImg from '../assets/logo.png';
import welcomeImg from '../assets/welcome.png';
import snowBenefitsImg from '../assets/snow-benefits.png';
const threatModelVideo = undefined;
import { AutoDestructCountdown } from './AutoDestructCountdown';
import { generatePassphrase } from '../utils/passphrase';

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
  decrypt,
  get_argon_params,
} from '../crypto-core/index';
import { setVaultKey } from '../crypto-core/db';
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
  const [setupStep, setSetupStep] = useState<'welcome' | 'intro' | 'create'>('welcome');
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const [infoTier, setInfoTier] = useState<number | null>(null);
  const [confirmTier, setConfirmTier] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

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
    if (isLocked && !false) return;
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

        const masterKey = derive_key(new TextEncoder().encode(password), masterSalt, ap.iterations, ap.memoryKib, ap.parallelism, 32);

          try {
            const mvkBytes = await unwrap_raw_key(JSON.stringify(wrappers.master), masterKey);
            setVaultKey(mvkBytes);
            mvkBytes.fill(0);
            onStoreMasterKey?.(masterKey);
            onUnlock();
          } catch (err) {
            setError(t('wrongPassword'));
            setPassword('');
            if (!false) onFailedAttempt();
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

          const masterKey = derive_master_key(password, salt, isMobile);

          try {
            const rawVaultKey = decrypt(vaultB64, ivB64, masterKey);
            setVaultKey(rawVaultKey);
            onStoreMasterKey?.(masterKey);
            onUnlock();
          } catch (err) {
            setError(t('wrongPassword'));
            setPassword('');
            if (!false) onFailedAttempt();
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
    setError(null);
    if (!passphraseGenerated && password.length < 30) {
      setError(t('passwordTooShort'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('passwordsDoNotMatch'));
      return;
    }
    const tierId = confirmTier ?? 1;
    const tier = TIERS.find(t => t.id === tierId);
    if (!tier) return;
    completeSetup(tier.config.argon, tierId);
  };

  const completeSetup = async (argonParams: { iterations: number; memoryKib: number; parallelism: number }, tierId: number) => {
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
      const masterKey = derive_key(new TextEncoder().encode(password), masterSalt, argonParams.iterations, argonParams.memoryKib, argonParams.parallelism, 32);

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

  const handleRegeneratePassphrase = () => {
    const phrase = generatePassphrase();
    setPassword(phrase);
    setConfirmPassword(phrase);
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

  const Logo = () => (
    <div className={`relative w-48 h-48 md:w-64 md:h-64 flex items-center justify-center transition-all duration-700`}>
      <div className={`absolute -inset-4 md:-inset-6 blur-[80px] md:blur-[120px] rounded-full animate-pulse transition-all duration-700 ${isLocked ? 'bg-red-500/20' : ''}`} style={{ backgroundColor: isLocked ? undefined : `rgba(${accentRgb}, 0.3)` }} />
      <div className={`absolute inset-0 md:inset-2 blur-2xl md:blur-3xl rounded-full ${isLocked ? 'bg-red-500/10' : ''}`} style={{ backgroundColor: isLocked ? undefined : `rgba(${accentRgb}, 0.2)` }} />
      <img
        src={logoImg}
        alt="Privon Vault"
        className={`w-full h-full object-contain transition-all duration-500 ${isLocked ? 'opacity-50 grayscale' : ''}`}
        style={{ filter: isLocked ? 'none' : `drop-shadow(0 0 40px rgba(${accentRgb}, 0.6)) drop-shadow(0 0 80px rgba(${accentRgb}, 0.3)) drop-shadow(0 0 120px rgba(${accentRgb}, 0.15))` }}
      />
    </div>
  );

  if (isSetup) {
    return (
      <div className="bg-black h-screen h-dvh overflow-hidden">
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
              {/* Gradient base — silver/white top, black bottom */}
              <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #ffffff 0%, #e8e8e8 15%, #b0b0b0 30%, #505050 50%, #1a1a1a 70%, #0a0a0a 85%, #000000 100%)' }} />

              {/* Metal reflections — soft blurred light streaks */}
              <div className="absolute pointer-events-none" style={{ top: '-20%', left: '10%', width: '120px', height: '180%', background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.25) 20%, rgba(0,0,0,0.4) 35%, rgba(0,0,0,0.15) 60%, rgba(0,0,0,0) 100%)', transform: 'rotate(12deg)', filter: 'blur(18px)' }} />
              <div className="absolute pointer-events-none" style={{ top: '-15%', left: '35%', width: '80px', height: '170%', background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.15) 25%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.1) 65%, rgba(0,0,0,0) 100%)', transform: 'rotate(8deg)', filter: 'blur(22px)' }} />
              <div className="absolute pointer-events-none" style={{ top: '-25%', left: '58%', width: '100px', height: '190%', background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.2) 18%, rgba(0,0,0,0.35) 32%, rgba(0,0,0,0.12) 55%, rgba(0,0,0,0) 100%)', transform: 'rotate(15deg)', filter: 'blur(15px)' }} />
              <div className="absolute pointer-events-none" style={{ top: '-10%', left: '78%', width: '90px', height: '160%', background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.18) 22%, rgba(0,0,0,0.28) 38%, rgba(0,0,0,0.08) 62%, rgba(0,0,0,0) 100%)', transform: 'rotate(10deg)', filter: 'blur(20px)' }} />

              {/* Metallic blobs — top zone */}
              <div className="absolute w-96 h-96 opacity-40" style={{ top: '-15%', left: '-10%', background: 'radial-gradient(circle, #d4d4d4 0%, transparent 70%)', borderRadius: '60% 40% 70% 30% / 50% 60% 40% 50%', animation: 'blobFloat1 20s ease-in-out infinite', filter: 'blur(60px)' }} />
              <div className="absolute w-80 h-80 opacity-35" style={{ top: '-5%', right: '-5%', background: 'radial-gradient(circle, #c0c0c0 0%, transparent 70%)', borderRadius: '40% 60% 50% 50% / 50% 40% 60% 50%', animation: 'blobFloat2 25s ease-in-out infinite', filter: 'blur(50px)' }} />
              <div className="absolute w-64 h-64 opacity-30" style={{ top: '10%', left: '25%', background: 'radial-gradient(circle, #e0e0e0 0%, transparent 70%)', borderRadius: '50% 60% 40% 60% / 60% 40% 60% 40%', animation: 'blobFloat3 18s ease-in-out infinite', filter: 'blur(45px)' }} />

              {/* Dark blobs — bottom zone */}
              <div className="absolute w-80 h-80 opacity-30" style={{ bottom: '-10%', right: '-10%', background: 'radial-gradient(circle, #1a1a1a 0%, transparent 70%)', borderRadius: '55% 45% 60% 40% / 45% 55% 45% 55%', animation: 'blobFloat2 28s ease-in-out infinite', filter: 'blur(50px)' }} />
              <div className="absolute w-64 h-64 opacity-20" style={{ bottom: '5%', left: '-5%', background: 'radial-gradient(circle, #2a2a2a 0%, transparent 70%)', borderRadius: '45% 55% 35% 65% / 55% 45% 55% 45%', animation: 'blobFloat3 22s ease-in-out infinite', filter: 'blur(40px)' }} />

              {/* Noise texture — premium grain */}
              <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'1\'/%3E%3C/svg%3E")', backgroundRepeat: 'repeat', backgroundSize: '128px 128px' }} />

              {/* Content */}
              <div className="relative z-10 flex flex-col items-center h-full px-6 pt-12 pb-8">

                {/* Paw icon */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.15 }}
                  className="glass-card w-12 h-12 rounded-full flex items-center justify-center mb-4"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--accent-color)">
                    <ellipse cx="8" cy="7" rx="2.5" ry="3" />
                    <ellipse cx="16" cy="7" rx="2.5" ry="3" />
                    <ellipse cx="4.5" cy="12" rx="2" ry="2.5" />
                    <ellipse cx="19.5" cy="12" rx="2" ry="2.5" />
                    <path d="M12 22c-4 0-7-3-7-6 0-2 1.5-3.5 3-4 1-.3 2.5-.5 4-.5s3 .2 4 .5c1.5.5 3 2 3 4 0 3-3 6-7 6z" />
                  </svg>
                </motion.div>

                {/* Title */}
                <motion.h1
                  className="text-3xl md:text-4xl font-black tracking-tight text-center mb-1"
                  style={{ color: '#ffffff' }}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.25 }}
                >
                  {t('setupWelcomeTitle')}
                </motion.h1>

                {/* Subtitle */}
                <motion.p
                  className="text-sm md:text-base text-center max-w-sm leading-relaxed glass-card rounded-2xl px-5 py-3"
                  style={{ color: '#ffffff' }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.35 }}
                >
                  Hi! I'm Snow. Welcome to Privon Vault! I'll help keep your files private. Everything you store stays encrypted on your device, and only you hold the key.
                </motion.p>

                {/* Mascot - video, centered */}
                <motion.div
                  className="flex-1 flex items-center justify-center w-full"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.7, delay: 0.3 }}
                >
                  <div className="relative w-full max-w-[800px]">
                    <img src={welcomeImg} alt="Welcome" className="w-full h-auto object-contain rounded-2xl" />
                  </div>
                </motion.div>

                {/* Button */}
                <motion.button
                  onClick={() => setSetupStep('intro')}
                  className="w-full max-w-xs flex items-center justify-center gap-3 py-4 rounded-[28px] font-bold text-sm transition-all duration-300 active:scale-[0.97]"
                  style={{ backgroundColor: 'var(--accent-color)', color: 'var(--bg-main)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                  whileHover={{ scale: 1.02, boxShadow: '0 12px 40px rgba(0,0,0,0.18)' }}
                  whileTap={{ scale: 0.97 }}
                >
                  {t('welcomeLetsStart')}
                  <span className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 8h10M9 4l4 4-4 4" />
                    </svg>
                  </span>
                </motion.button>

                {/* Pagination dots */}
                <motion.div
                  className="flex items-center gap-2 mt-5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.7 }}
                >
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--accent-color)' }} />
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--border-color)' }} />
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--border-color)' }} />
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--border-color)' }} />
                </motion.div>
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
              {/* Gradient base — silver/white top, black bottom */}
              <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #ffffff 0%, #e8e8e8 15%, #b0b0b0 30%, #505050 50%, #1a1a1a 70%, #0a0a0a 85%, #000000 100%)' }} />

              {/* Metal reflections — soft blurred light streaks */}
              <div className="absolute pointer-events-none" style={{ top: '-20%', left: '10%', width: '120px', height: '180%', background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.25) 20%, rgba(0,0,0,0.4) 35%, rgba(0,0,0,0.15) 60%, rgba(0,0,0,0) 100%)', transform: 'rotate(12deg)', filter: 'blur(18px)' }} />
              <div className="absolute pointer-events-none" style={{ top: '-15%', left: '35%', width: '80px', height: '170%', background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.15) 25%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.1) 65%, rgba(0,0,0,0) 100%)', transform: 'rotate(8deg)', filter: 'blur(22px)' }} />
              <div className="absolute pointer-events-none" style={{ top: '-25%', left: '58%', width: '100px', height: '190%', background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.2) 18%, rgba(0,0,0,0.35) 32%, rgba(0,0,0,0.12) 55%, rgba(0,0,0,0) 100%)', transform: 'rotate(15deg)', filter: 'blur(15px)' }} />
              <div className="absolute pointer-events-none" style={{ top: '-10%', left: '78%', width: '90px', height: '160%', background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.18) 22%, rgba(0,0,0,0.28) 38%, rgba(0,0,0,0.08) 62%, rgba(0,0,0,0) 100%)', transform: 'rotate(10deg)', filter: 'blur(20px)' }} />

              {/* Metallic blobs — top zone */}
              <div className="absolute w-96 h-96 opacity-40" style={{ top: '-15%', left: '-10%', background: 'radial-gradient(circle, #d4d4d4 0%, transparent 70%)', borderRadius: '60% 40% 70% 30% / 50% 60% 40% 50%', animation: 'blobFloat1 20s ease-in-out infinite', filter: 'blur(60px)' }} />
              <div className="absolute w-80 h-80 opacity-35" style={{ top: '-5%', right: '-5%', background: 'radial-gradient(circle, #c0c0c0 0%, transparent 70%)', borderRadius: '40% 60% 50% 50% / 50% 40% 60% 50%', animation: 'blobFloat2 25s ease-in-out infinite', filter: 'blur(50px)' }} />
              <div className="absolute w-64 h-64 opacity-30" style={{ top: '10%', left: '25%', background: 'radial-gradient(circle, #e0e0e0 0%, transparent 70%)', borderRadius: '50% 60% 40% 60% / 60% 40% 60% 40%', animation: 'blobFloat3 18s ease-in-out infinite', filter: 'blur(45px)' }} />

              {/* Dark blobs — bottom zone */}
              <div className="absolute w-80 h-80 opacity-30" style={{ bottom: '-10%', right: '-10%', background: 'radial-gradient(circle, #1a1a1a 0%, transparent 70%)', borderRadius: '55% 45% 60% 40% / 45% 55% 45% 55%', animation: 'blobFloat2 28s ease-in-out infinite', filter: 'blur(50px)' }} />
              <div className="absolute w-64 h-64 opacity-20" style={{ bottom: '5%', left: '-5%', background: 'radial-gradient(circle, #2a2a2a 0%, transparent 70%)', borderRadius: '45% 55% 35% 65% / 55% 45% 55% 45%', animation: 'blobFloat3 22s ease-in-out infinite', filter: 'blur(40px)' }} />

              {/* Noise texture — premium grain */}
              <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'1\'/%3E%3C/svg%3E")', backgroundRepeat: 'repeat', backgroundSize: '128px 128px' }} />

              <div className="relative z-10 flex flex-col items-center h-full px-6 pt-8 pb-8 overflow-y-auto">

              <button type="button" onClick={() => { setSetupStep('intro'); setPassword(''); setConfirmPassword(''); setError(null); }}
                className="absolute left-6 top-8 text-[11px] text-white/50 hover:text-white transition-colors"
              >← {t('backButton')}</button>

              <motion.img
                src={logoImg}
                alt="Privon Vault"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="w-20 h-20 md:w-40 md:h-40 object-contain"
                style={{ filter: `drop-shadow(0 0 40px rgba(${accentRgb}, 0.55)) drop-shadow(0 0 90px rgba(${accentRgb}, 0.25))` }}
              />

              <div className="text-lg md:text-2xl font-bold tracking-tight mt-3 mb-4 md:mt-4 md:mb-8">
                <span className="text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]">{t('crytoPrefix')}</span>
                {' '}
                <span className="text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]">{t('toolSuffix')}</span>
              </div>

              <div className="flex-1 flex items-center justify-center w-full min-h-0">
                <div className="relative w-full max-w-3xl px-4 md:px-10 py-5 md:py-8 rounded-3xl border border-white/20 bg-transparent">
                  <div className="flex flex-col md:flex-row gap-5 md:gap-8">
                    <div className="flex-1 min-w-0 flex flex-col items-center gap-4 md:gap-6">
                      <div className="flex items-start gap-2.5 md:gap-3 w-full max-w-xl px-3 md:px-4 py-2.5 md:py-3.5 rounded-xl md:rounded-2xl bg-yellow-400/[0.07] border border-yellow-400/25">
                        <AlertTriangle size={16} className="text-yellow-500 shrink-0 mt-0.5 md:w-5 md:h-5" />
                        <div className="flex flex-col gap-1 md:gap-2 min-w-0">
                          <p className="text-white/90 text-xs md:text-base font-medium text-left leading-relaxed">{t('setupCopyWarning1')}</p>
                          <p className="text-white/90 text-xs md:text-base font-medium text-left leading-relaxed">{t('setupCopyWarning2')}</p>
                        </div>
                      </div>
                      <div className="w-16 h-px bg-white/20" />
                      <div className="w-full max-w-md">
                        <div className="grid grid-cols-3 gap-1.5 md:gap-2">
                          {passphraseGenerated && password.split(' ').filter(Boolean).map((word, i) => (
                            <motion.div
                              key={`${word}-${i}`}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.03 * i, duration: 0.35, ease: 'easeOut' }}
                              className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-2 md:py-2.5 rounded-xl bg-white/[0.06] border border-white/10 min-w-0"
                            >
                              <span className="text-[10px] md:text-xs text-white/40 font-bold w-4 shrink-0 text-right tabular-nums">{i + 1}</span>
                              <span className="text-xs sm:text-sm md:text-base font-bold text-white truncate">{word}</span>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 md:flex md:flex-col gap-2 md:justify-center md:shrink-0 md:w-44">
                      <button type="button" onClick={handleCopyPassword}
                        className="flex items-center justify-center gap-1.5 md:gap-2 w-full px-2 md:px-5 py-2.5 md:py-3 rounded-xl md:rounded-2xl bg-white/10 border border-white/15 hover:bg-white/20 text-white text-[11px] md:text-xs font-bold tracking-wide transition-all active:scale-[0.96]"
                      >
                        {copied ? <Check size={14} className="text-neon-green md:w-4 md:h-4" /> : <Copy size={14} className="md:w-4 md:h-4" />}
                        {copied ? t('copied') : t('copyKey')}
                      </button>
                      <button type="button" onClick={handleDownloadPassphrase}
                        className="flex items-center justify-center gap-1.5 md:gap-2 w-full px-2 md:px-5 py-2.5 md:py-3 rounded-xl md:rounded-2xl bg-white/10 border border-white/15 hover:bg-white/20 text-white text-[11px] md:text-xs font-bold tracking-wide transition-all active:scale-[0.96]"
                      >
                        <Download size={14} className="md:w-4 md:h-4" /> {t('downloadPhrase')}
                      </button>
                      <button type="button" onClick={handleRegeneratePassphrase}
                        className="flex items-center justify-center gap-1.5 md:gap-2 w-full px-2 md:px-5 py-2.5 md:py-3 rounded-xl md:rounded-2xl bg-white/10 border border-white/15 hover:bg-white/20 text-white text-[11px] md:text-xs font-bold tracking-wide transition-all active:scale-[0.96]"
                      >
                        <RefreshCw size={14} className="md:w-4 md:h-4" /> {t('regenerate')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 md:pt-5 flex flex-col items-center gap-3 w-full">
                <form onSubmit={handleCreateFormSubmit} className="w-full flex flex-col items-center gap-3">
                {error && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="text-red-500 text-xs font-medium bg-red-500/10 p-2 rounded-lg border border-red-500/20 text-center w-full max-w-sm">
                    {error}
                  </motion.div>
                )}
                <button type="submit"
                  className="w-full max-w-sm py-3 md:py-3.5 rounded-2xl text-black font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-[0.98]"
                  style={{ backgroundColor: accentColor }}
                >
                  {t('saveAndContinue')} <ChevronRight size={18} />
                </button>
                </form>
              </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="intro"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="absolute inset-0 overflow-hidden bg-background"
            >
              <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #ffffff 0%, #e8e8e8 15%, #b0b0b0 30%, #505050 50%, #1a1a1a 70%, #0a0a0a 85%, #000000 100%)' }} />
              <div className="absolute pointer-events-none" style={{ top: '-20%', left: '10%', width: '120px', height: '180%', background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.25) 20%, rgba(0,0,0,0.4) 35%, rgba(0,0,0,0.15) 60%, rgba(0,0,0,0) 100%)', transform: 'rotate(12deg)', filter: 'blur(18px)' }} />
              <div className="absolute pointer-events-none" style={{ top: '-15%', left: '35%', width: '80px', height: '170%', background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.15) 25%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.1) 65%, rgba(0,0,0,0) 100%)', transform: 'rotate(8deg)', filter: 'blur(22px)' }} />
              <div className="absolute pointer-events-none" style={{ top: '-25%', left: '58%', width: '100px', height: '190%', background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.2) 18%, rgba(0,0,0,0.35) 32%, rgba(0,0,0,0.12) 55%, rgba(0,0,0,0) 100%)', transform: 'rotate(15deg)', filter: 'blur(15px)' }} />
              <div className="absolute pointer-events-none" style={{ top: '-10%', left: '78%', width: '90px', height: '160%', background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.18) 22%, rgba(0,0,0,0.28) 38%, rgba(0,0,0,0.08) 62%, rgba(0,0,0,0) 100%)', transform: 'rotate(10deg)', filter: 'blur(20px)' }} />
              <div className="absolute w-96 h-96 opacity-40" style={{ top: '-15%', left: '-10%', background: 'radial-gradient(circle, #d4d4d4 0%, transparent 70%)', borderRadius: '60% 40% 70% 30% / 50% 60% 40% 50%', animation: 'blobFloat1 20s ease-in-out infinite', filter: 'blur(60px)' }} />
              <div className="absolute w-80 h-80 opacity-35" style={{ top: '-5%', right: '-5%', background: 'radial-gradient(circle, #c0c0c0 0%, transparent 70%)', borderRadius: '40% 60% 50% 50% / 50% 40% 60% 50%', animation: 'blobFloat2 25s ease-in-out infinite', filter: 'blur(50px)' }} />
              <div className="absolute w-64 h-64 opacity-30" style={{ top: '10%', left: '25%', background: 'radial-gradient(circle, #e0e0e0 0%, transparent 70%)', borderRadius: '50% 60% 40% 60% / 60% 40% 60% 40%', animation: 'blobFloat3 18s ease-in-out infinite', filter: 'blur(45px)' }} />
              <div className="absolute w-80 h-80 opacity-30" style={{ bottom: '-10%', right: '-10%', background: 'radial-gradient(circle, #1a1a1a 0%, transparent 70%)', borderRadius: '55% 45% 60% 40% / 45% 55% 45% 55%', animation: 'blobFloat2 28s ease-in-out infinite', filter: 'blur(50px)' }} />
              <div className="absolute w-64 h-64 opacity-20" style={{ bottom: '5%', left: '-5%', background: 'radial-gradient(circle, #2a2a2a 0%, transparent 70%)', borderRadius: '45% 55% 35% 65% / 55% 45% 55% 45%', animation: 'blobFloat3 22s ease-in-out infinite', filter: 'blur(40px)' }} />
              <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'1\'/%3E%3C/svg%3E")', backgroundRepeat: 'repeat', backgroundSize: '128px 128px' }} />

              <div className="relative z-10 flex flex-col items-center h-full px-6 pt-16 pb-8 overflow-y-auto">
                <motion.div
                  className="w-full max-w-sm space-y-3 mb-6"
                  variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.15 } } }}
                  initial="hidden"
                  animate="visible"
                >
                  {([
                    { icon: null, image: snowBenefitsImg, title: 'Total Privacy', desc: 'Everything you store stays encrypted on your device. Nobody — not even us — can see your files.' },
                    { icon: Code2, image: null, title: 'Open Source', desc: 'Privon Vault is a free, open-source project. The source code is public, auditable, and licensed under AGPL-3.0.' },
                    { icon: FolderOpen, image: null, title: 'All-in-One Vault', desc: 'Secure vault, file manager, photo gallery, music player, and document viewer — all in one place.' },
                    { icon: RefreshCw, image: null, title: 'Backup & Restore', desc: 'Encrypted backups — your data stays safe even if you lose access.' },
                  ] as const).map((item, i) => (
                    <motion.div
                      key={i}
                      variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
                      className="glass-card rounded-[16px] p-3.5 flex flex-col gap-3"
                    >
                      {item.image && (
                        <img src={item.image} alt={item.title} className="w-full h-auto rounded-xl scale-105" />
                      )}
                      <div className="flex items-start gap-3">
                        {item.icon && (
                          <span className="shrink-0 mt-0.5" style={{ color: 'var(--accent-color)' }}><item.icon size={20} /></span>
                        )}
                        <div>
                          <p className="text-sm font-semibold text-white">{item.title}</p>
                          <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>{item.desc}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>

                <motion.button
                  onClick={() => {
                    setSelectedTier(1);
                    setConfirmTier(1);
                    const tier = TIERS.find(t => t.id === 1);
                    if (tier) onApplyThreatModel?.(tier.config);
                    setSetupStep('create');
                  }}
                  className="w-full max-w-xs flex items-center justify-center gap-3 py-4 rounded-[28px] font-bold text-sm transition-all duration-300 active:scale-[0.97]"
                  style={{ backgroundColor: 'var(--accent-color)', color: 'var(--bg-main)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.7 }}
                  whileHover={{ scale: 1.02, boxShadow: '0 12px 40px rgba(0,0,0,0.18)' }}
                  whileTap={{ scale: 0.97 }}
                >
                  {t('continueButton')}
                  <span className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 8h10M9 4l4 4-4 4" />
                    </svg>
                  </span>
                </motion.button>

                <motion.div
                  className="flex items-center gap-2 mt-5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.8 }}
                >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--border-color)' }} />
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--accent-color)' }} />
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--border-color)' }} />
                </motion.div>
              </div>
            </motion.div>
          )}
          </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center bg-black px-4 pt-12 md:pt-24 pb-6 font-sans text-primary min-h-screen min-h-dvh overflow-y-auto">
      <div className="flex flex-col items-center space-y-3 md:space-y-5">
        <Logo />
        <div className="text-2xl md:text-3xl font-bold tracking-tight">
          <span className={`font-bold tracking-tight ${isLocked ? 'text-red-500' : 'text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]'}`}>{t('crytoPrefix')}</span>
          {' '}
          <span className={isLocked ? 'text-red-500' : 'text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]'}>{t('toolSuffix')}</span>
        </div>
        <p className={`text-sm tracking-wide ${isLocked ? 'text-muted' : 'text-zinc-400 drop-shadow-[0_0_8px_rgba(161,161,170,0.3)]'}`}>{t('allInOnePrivacyTagline')}</p>
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

              {isLocked && !false && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center p-6 bg-red-500/5 rounded-2xl border border-red-500/10 mb-4"
                >
                  <Timer className="text-red-500 mb-3 animate-pulse" size={36} />
                  <div className="text-3xl font-black font-mono text-red-500">{timeLeft}s</div>
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className={`space-y-4 ${isLocked && !false ? 'opacity-30 pointer-events-none grayscale' : ''}`}>
                <div className="space-y-1.5">
                  <label className="text-sm text-muted font-medium ml-1">{t('masterPassword')}</label>
                  <div className="relative group">
                    <input
                      disabled={isProcessing || (isLocked && !false)}
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
                      disabled={isProcessing || (isLocked && !false)}
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
                  disabled={isProcessing || (isLocked && !false)}
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

              {!isSetup && !isLocked && !false && recoverySettings && recoverySettings.count > 0 && (
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
