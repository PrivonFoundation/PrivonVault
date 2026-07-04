import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Loader2, ShieldCheck, Timer, Key, Sparkles, Edit3, Copy, Check, ChevronRight, Target, Shield, ShieldAlert, Skull, Lock, Fingerprint } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '../locales/i18nContext';
import crytoLogo from '../assets/PrivonVault.png';
import welcomeVideo from '../assets/welcome.webm';
import threatModelVideo from '../assets/threat-model.webm';
import { AutoDestructCountdown } from './AutoDestructCountdown';

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
  destructRef: React.RefObject<AutoDestructCountdownHandle | null>;
  onDestructComplete: () => void;
  onNewCodes?: (codes: string[]) => void;
  onStoreMasterKey?: (key: Uint8Array) => void;
  onApplyThreatModel?: (config: { autoBlurSeconds: number; autoLockSeconds: number; failedAttemptsThreshold: number; progressiveLockSeconds: number; autoDestructEnabled: boolean; autoDestructAttempts: number; autoDestructInactivity: number; destructCountdownSeconds: number; minPasswordLength?: number; settingsPasswordRequired?: boolean; vaultPinAllowed?: boolean }) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onUnlock, isSetup, lockUntil, onFailedAttempt, recoverySettings, onResetWithRecovery, destructRef, onDestructComplete, onNewCodes, onStoreMasterKey, onApplyThreatModel }) => {
  const { t } = useI18n();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isDestructing, setIsDestructing] = useState(false);
  const [setupStep, setSetupStep] = useState<'welcome' | 'create' | 'threat'>('welcome');
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

  const themeConfig = (() => {
    try {
      const saved = localStorage.getItem('app_theme_config');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  })();
  const bgMain = themeConfig?.['--bg-main'] || '#000000';

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
    if (isLocked && !isDestructing) return;
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
            if (!isDestructing) onFailedAttempt();
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
            if (!isDestructing) onFailedAttempt();
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
    if (password.length < 30) {
      setError(t('passwordTooShort'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('passwordsDoNotMatch'));
      return;
    }
    const tierId = confirmTier;
    if (tierId === null) return;
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

      setSetupProgress(10);
      setSetupProgressLabel('Deriving master key...');
      await yieldToReact();
      const masterSalt = window.crypto.getRandomValues(new Uint8Array(16));
      const masterKey = derive_key(new TextEncoder().encode(password), masterSalt, argonParams.iterations, argonParams.memoryKib, argonParams.parallelism, 32);

      setSetupProgress(30);
      setSetupProgressLabel('Wrapping master key...');
      await yieldToReact();
      const masterWrapper = JSON.parse(await wrap_raw_key(mvkBytes, masterKey));

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
        master: masterWrapper,
        recovery: recoveryWrappers,
      };

      localStorage.setItem('privon_crypto_metadata', JSON.stringify(meta));
      localStorage.setItem('privon_vault_wrappers', JSON.stringify(wrappers));

      setVaultKey(mvkBytes);
      mvkBytes.fill(0);
      onStoreMasterKey?.(masterKey);
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

  const WORD_LIST = [
    'apple','autumn','basin','batch','beach','beard','bench','birth','black','blank',
    'blast','blend','bless','blind','block','bloom','board','boast','bonus','boost',
    'brain','brand','brave','bread','break','breed','brief','bring','broad','brook',
    'brown','brush','build','bunch','burst','cabin','cable','calm','camel','candy',
    'cargo','carve','catch','cause','cedar','chain','chair','chalk','charm','chart',
    'chase','cheap','check','cheek','cheer','chess','chest','chief','child','chill',
    'choir','civic','civil','claim','clash','class','clean','clear','clerk','cliff',
    'climb','cling','clock','close','cloth','cloud','coach','coast','coral','couch',
    'count','court','cover','crack','craft','crane','crash','crawl','cream','crest',
    'crime','crisp','cross','crowd','crown','crush','curve','cycle','daily','dance',
    'debut','decay','delay','delta','dense','depth','derby','diary','donor','doubt',
    'draft','drain','drama','dress','drift','drill','drink','drive','drone','eager',
    'eagle','early','earth','eight','elder','elect','elite','empty','enjoy','enter',
    'entry','equal','equip','error','essay','event','exact','exist','extra','fable',
    'faith','false','fancy','fatal','fault','feast','fence','ferry','fetch','fever',
    'fiber','field','fierce','fifth','fifty','fight','final','first','flame','flash',
    'fleet','flesh','float','flock','flood','floor','flora','flour','fluid','flush',
    'focus','force','forge','forth','forum','found','frame','frank','fraud','fresh',
    'front','frost','fruit','gauge','ghost','giant','given','glad','glare','glass',
    'glide','globe','gloom','glory','glove','glow','grace','grade','grain','grand',
    'grant','grape','graph','grasp','grass','grave','great','green','greet','grief',
    'grill','grind','gross','group','grove','guard','guess','guest','guide','guild',
    'guilt','habit','happy','harsh','haven','heart','heavy','hedge','height','helmet',
    'herald','herd','hike','honey','honor','horse','hotel','house','hover','human',
    'humor','hurry','ideal','image','imply','index','inner','input','irony','ivory',
    'jewel','joint','judge','juice','kebab','kernel','kettle','keypad','knock','label',
    'labor','ladder','lance','large','laser','later','launch','layer','layout','leader',
    'leaf','league','learn','leave','ledge','legal','lemon','level','light','limit',
    'linen','links','liver','lobby','local','lodge','logic','loose','lover','lower',
    'loyal','lucky','lunar','lunch','luxury','magic','major','maker','manor','maple',
    'marble','march','margin','marker','market','marsh','mask','match','maxim','mayor',
    'meadow','media','melon','melt','member','memory','mercy','merge','merit','metal',
    'meter','might','minor','minus','mirror','mixed','mobile','model','money','month',
    'moral','motor','mount','mouse','mouth','movie','museum','music','naive','narrow',
    'naval','nerve','never','night','noble','noise','north','noted','novel','nurse',
    'nylon','oasis','ocean','offer','often','olive','opera','orbit','order','organ',
    'other','outer','output','oval','oven','owner','oxide','ozone','panel','panic',
    'paper','pardon','parish','parrot','party','patch','pause','peace','pearl','phase',
    'phone','photo','piano','piece','pilot','pinch','pixel','place','plain','plane',
    'plant','plate','plaza','pluck','plumb','plume','point','polar','polish','polite',
    'porch','pork','port','post','potato','pound','power','press','price','pride',
    'prime','print','prior','prism','prize','probe','proof','pulse','punch','pupil',
    'purple','purse','quest','queue','quick','quiet','quite','quote','radar','radio',
    'raise','rally','ranch','range','rapid','ratio','reach','react','ready','realm',
    'rebel','refer','reign','relax','relay','renew','reply','resin','reward','rhythm',
    'rifle','right','rigid','ruler','rural','saber','safari','salad','salmon','salon',
    'salute','satin','sauce','scale','scalp','scene','scent','scope','score','scrub',
    'search','second','secret','sense','sensor','setup','seven','shade','shadow','shape',
    'share','shark','sharp','shawl','sheep','sheet','shelf','shell','shift','shine',
    'shirt','shock','shore','short','shout','sight','sigma','silly','since','sketch',
    'skill','skull','slate','slave','sleep','slice','slide','slope','smart','smell',
    'smile','smoke','snack','snake','solar','solid','solve','sorry','sound','south',
    'space','spare','spark','speak','spear','speed','spell','spend','spice','spill',
    'spine','spirit','split','spoil','spoon','sport','spray','spread','spring','square',
    'stable','stair','stamp','stand','stark','start','state','steam','steel','steep',
    'steer','stern','stick','stiff','still','stock','stone','stood','stool','store',
    'storm','story','stove','strap','straw','strip','stuck','study','stuff','style',
    'sugar','suite','sunny','super','surge','swamp','swan','swap','sweet','swift',
    'swing','sword','table','tablet','taste','teach','teeth','temple','theme','thick',
    'thief','thing','think','third','thorn','three','throw','thumb','tiger','tight',
    'timer','tired','title','token','total','touch','towel','tower','trace','track',
    'trade','trail','train','trait','trash','treat','trend','trial','tribe','trick',
    'troop','truck','truly','trump','trunk','trust','truth','twice','twist','ultra',
    'uncle','under','union','unite','unity','upper','upset','urban','usage','usual',
    'valid','value','valve','vault','venue','verse','video','vigor','vinyl','viral',
    'virus','visit','vista','vital','vivid','vocal','voice','voter','waist','waste',
    'watch','water','weave','wheat','wheel','white','whole','woman','world','worry',
    'worse','worst','worth','wound','write','wrong','yacht','yield','young','youth',
    'zebra','zone',
  ];

  const generatePassword = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*';
    const bytes = new Uint32Array(32);
    window.crypto.getRandomValues(bytes);
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars[bytes[i] % chars.length];
    }
    return result;
  };

  const generatePassphrase = (): string => {
    const indices = new Uint32Array(6);
    window.crypto.getRandomValues(indices);
    return Array.from(indices).map(i => WORD_LIST[i % WORD_LIST.length]).join('-');
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
        src={crytoLogo}
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
              <div className="relative z-10 flex flex-col items-center h-full px-6 pt-20 pb-8">

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
                  className="text-sm md:text-base text-center max-w-[280px] leading-relaxed"
                  style={{ color: '#ffffff', opacity: 0.7 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.35 }}
                >
                  {t('welcomeSubtitleText')}
                </motion.p>

                {/* Mascot - video, centered */}
                <motion.div
                  className="flex-1 flex items-center justify-center w-full"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.7, delay: 0.3 }}
                >
                  <div className="relative w-full max-w-[528px]">
                    <video src={welcomeVideo} autoPlay loop muted playsInline className="w-full h-auto object-contain" />
                  </div>
                </motion.div>

                {/* Button */}
                <motion.button
                  onClick={() => setSetupStep('threat')}
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
              className="flex flex-col items-center justify-center px-6 h-full"
            >
              <div className="flex flex-col items-center space-y-2 md:space-y-3 mb-4">
                <div className="relative w-36 h-36 md:w-48 md:h-48">
                  <div className="absolute -inset-4 md:-inset-6 blur-[80px] md:blur-[120px] rounded-full animate-pulse" style={{ backgroundColor: `rgba(${accentRgb}, 0.3)` }} />
                  <img src={crytoLogo} alt="Privon Vault" className="w-full h-full object-contain" style={{ filter: `drop-shadow(0 0 40px rgba(${accentRgb}, 0.6)) drop-shadow(0 0 80px rgba(${accentRgb}, 0.3))` }} />
                </div>
                <div className="text-xl md:text-2xl font-bold tracking-tight">
                  <span className="text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]">{t('crytoPrefix')}</span>
                  <span className="drop-shadow-[0_0_12px_rgba(212,212,216,0.5)]" style={{ color: accentColor }}>{t('toolSuffix')}</span>
                </div>
                <p className="text-zinc-400 text-xs text-center">{t('setupCreateTitle')}</p>
              </div>

              <div className="w-full max-w-sm glass-card border border-white/10 rounded-2xl p-4 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => { const pwd = generatePassword(); setPassword(pwd); setConfirmPassword(pwd); setError(null); }}
                    className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-600 transition-all active:scale-[0.96]"
                  ><Key size={18} className="text-neon-green" /><span className="text-[10px] text-zinc-300 font-medium text-center leading-tight">{t('setupGeneratePwd')}</span></button>
                  <button type="button" onClick={() => { const phrase = generatePassphrase(); setPassword(phrase); setConfirmPassword(phrase); setError(null); }}
                    className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-600 transition-all active:scale-[0.96]"
                  ><Sparkles size={18} className="text-neon-green" /><span className="text-[10px] text-zinc-300 font-medium text-center leading-tight">{t('setupCreatePhrase')}</span></button>
                  <button type="button" onClick={() => { setPassword(''); setConfirmPassword(''); setError(null); }}
                    className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-600 transition-all active:scale-[0.96]"
                  ><Edit3 size={18} className="text-neon-green" /><span className="text-[10px] text-zinc-300 font-medium text-center leading-tight">{t('setupTypeManual')}</span></button>
                </div>

                {(password || confirmPassword) && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-amber-400 text-[10px] text-center leading-relaxed">⚠️ {t('setupCopyWarning')}</p>
                  </motion.div>
                )}

                <button type="button" onClick={() => { setSetupStep('threat'); setPassword(''); setConfirmPassword(''); setError(null); }}
                  className="text-[10px] text-zinc-500 hover:text-white transition-colors block"
                >← {t('backButton')}</button>

                <form onSubmit={handleCreateFormSubmit} className="space-y-2.5">
                  <div className="space-y-1">
                    <label className="text-xs text-muted font-medium ml-1">{t('masterPassword')}</label>
                    <div className="relative">
                      <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                        placeholder={t('enterPasswordField')}
                        className="w-full bg-surface border border-border text-primary rounded-xl pl-3 pr-14 py-2.5 text-sm focus:outline-none focus:border-primary transition-all placeholder:text-muted font-mono tracking-wider" autoFocus
                      />
                      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                        {password && (
                          <button type="button" onClick={handleCopyPassword} className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors">
                            {copied ? <Check size={14} className="text-neon-green" /> : <Copy size={14} className="text-zinc-400" />}
                          </button>
                        )}
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors">
                          {showPassword ? <EyeOff size={14} className="text-zinc-400" /> : <Eye size={14} className="text-zinc-400" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted font-medium ml-1">{t('confirmPassword')}</label>
                    <input type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={t('confirmYourPassword')}
                      className="w-full bg-surface border border-border text-primary rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-all placeholder:text-muted"
                    />
                  </div>
                  {error && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="text-red-500 text-xs font-medium bg-red-500/10 p-2 rounded-lg border border-red-500/20 text-center">
                      {error}
                    </motion.div>
                  )}
                  <button type="submit"
                    className="w-full py-2.5 rounded-xl text-black font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-[0.98]"
                    style={{ backgroundColor: accentColor }}
                  >
                    {t('saveAndContinue')} <ChevronRight size={18} />
                  </button>
                </form>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="threat"
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
              <div className="relative z-10 flex flex-col items-center h-full px-6 pt-16 pb-8 overflow-y-auto">

                {/* Threat model video */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.7, delay: 0.2 }}
                  className="w-full max-w-[200px] mb-3"
                >
                  <video src={threatModelVideo} autoPlay loop muted playsInline className="w-full h-auto object-contain" />
                </motion.div>

                {/* Title */}
                <motion.h1
                  className="text-2xl md:text-3xl font-black tracking-tight text-center mb-1"
                  style={{ color: 'var(--text-main)' }}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                >
                  {t('threatModelTitle')}
                </motion.h1>

                {/* Subtitle */}
                <motion.p
                  className="text-xs text-center max-w-[280px] leading-relaxed mb-5"
                  style={{ color: 'var(--text-main)', opacity: 0.5 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                >
                  {t('threatModelDesc')}
                </motion.p>

                {/* Tier cards */}
                <motion.div
                  className="w-full max-w-sm space-y-4 mb-4"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                >
                  {/* Everyday Privacy - recommended */}
                  <div
                    onClick={() => { setSelectedTier(1); setInfoTier(null); }}
                    className="glass-card w-full rounded-[24px] p-5 transition-all cursor-pointer active:scale-[0.98]"
                    style={{
                      borderColor: selectedTier === 1 ? 'var(--accent-color)' : undefined,
                      boxShadow: selectedTier === 1 ? '0 8px 32px rgba(var(--accent-rgb), 0.12), 0 2px 8px rgba(0,0,0,0.06)' : undefined,
                    }}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="p-3 rounded-[16px] shrink-0" style={{
                        backgroundColor: selectedTier === 1 ? 'rgba(var(--accent-rgb), 0.15)' : 'rgba(255,255,255,0.08)',
                        color: selectedTier === 1 ? 'var(--accent-color)' : '#ffffff',
                      }}>
                        <Target size={22} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[15px] font-bold" style={{
                            color: selectedTier === 1 ? 'var(--accent-color)' : '#ffffff',
                          }}>{t('tier1Name')}</span>
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full font-semibold tracking-wide" style={{
                            backgroundColor: 'rgba(var(--accent-rgb), 0.15)',
                            color: 'var(--accent-color)',
                          }}>{t('tierRecommended')}</span>
                        </div>
                        <p className="text-[12px] mt-1.5 leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>{t('tier1Desc')}</p>
                      </div>
                    </div>
                  </div>

                  {/* Hardened - blocked */}
                  <a
                    href="https://github.com/privonn/PrivonVault/blob/main/docs%2FSECURITY.md"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="glass-card w-full rounded-[24px] p-5 transition-all cursor-pointer active:scale-[0.98] opacity-60 block"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="p-3 rounded-[16px] shrink-0" style={{
                        backgroundColor: 'rgba(255,255,255,0.08)',
                        color: 'rgba(255,255,255,0.5)',
                      }}>
                        <ShieldAlert size={22} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[15px] font-bold" style={{ color: '#ffffff' }}>{t('advancedProtection')}</span>
                          <span className="text-[9px] px-2 py-0.5 rounded-full font-medium" style={{
                            backgroundColor: 'rgba(255,255,255,0.08)',
                            color: 'rgba(255,255,255,0.5)',
                          }}>{t('tierNotAvailable')}</span>
                        </div>
                        <p className="text-[12px] mt-1.5 leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>{t('advancedProtectionDesc')}</p>
                      </div>
                    </div>
                  </a>
                </motion.div>

                {/* Back button */}
                <motion.button
                  type="button"
                  onClick={() => { setSetupStep('welcome'); setSelectedTier(null); }}
                  className="text-[11px] mb-3 transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                >
                  ← {t('backButton')}
                </motion.button>

                {/* Continue button */}
                <motion.button
                  onClick={() => { if (!selectedTier) return; setConfirmTier(selectedTier); }}
                  disabled={!selectedTier}
                  className="w-full max-w-xs flex items-center justify-center gap-3 py-4 rounded-[28px] font-bold text-sm transition-all duration-300 active:scale-[0.97] disabled:grayscale disabled:opacity-50"
                  style={{ backgroundColor: 'var(--accent-color)', color: 'var(--bg-main)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.65 }}
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

                {/* Pagination dots */}
                <motion.div
                  className="flex items-center gap-2 mt-5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.8 }}
                >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--border-color)' }} />
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--accent-color)' }} />
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--border-color)' }} />
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--border-color)' }} />
                </motion.div>
              </div>

              {infoTier !== null && (() => {
                const tier = TIERS.find(t => t.id === infoTier);
                if (!tier) return null;
                const cfg = tier.config;
                const fmtInactivity = (s: number) => {
                  if (s === 0) return t('inactivityOff');
                  if (s < 60) return `${s}s`;
                  if (s < 3600) return `${Math.floor(s / 60)}m`;
                  if (s < 86400) return `${Math.floor(s / 3600)}h`;
                  return `${Math.floor(s / 86400)}d`;
                };
                return (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                    onClick={() => setInfoTier(null)}
                  >
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      onClick={(e) => e.stopPropagation()}
                      className="relative w-full max-w-xs glass-card border border-white/10 rounded-2xl p-5"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-xl bg-neon-green/20 text-neon-green">
                          <tier.icon size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-white">{t(tier.nameKey as any)}</p>
                          <p className="text-[9px] text-zinc-500">{t('tierInfoTitle')}</p>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-zinc-400">{t('modelBlur')}</span>
                          <span className="text-white font-medium">{cfg.autoBlurSeconds}s</span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-zinc-400">{t('modelLock')}</span>
                          <span className="text-white font-medium">{cfg.autoLockSeconds}s</span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-zinc-400">{t('modelAttempts')}</span>
                          <span className="text-white font-medium">{cfg.failedAttemptsThreshold}</span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-zinc-400">{t('modelLockDur')}</span>
                          <span className="text-white font-medium">{cfg.progressiveLockSeconds === 0 ? t('recoveryOnly') : `${cfg.progressiveLockSeconds}s`}</span>
                        </div>
                        <div className="border-t border-white/5 my-1.5" />
                        <div className="flex justify-between text-[10px]">
                          <span className="text-zinc-400">{t('modelDestruct')}</span>
                          <span className={`font-medium ${cfg.autoDestructEnabled ? 'text-red-400' : 'text-zinc-500'}`}>{cfg.autoDestructEnabled ? t('on') : t('off')}</span>
                        </div>
                        {cfg.autoDestructEnabled && (
                          <>
                            <div className="flex justify-between text-[10px]">
                              <span className="text-zinc-400">{t('modelDestructAtt')}</span>
                              <span className="text-white font-medium">{cfg.autoDestructAttempts}</span>
                            </div>
                            <div className="flex justify-between text-[10px]">
                              <span className="text-zinc-400">{t('modelDestructIn')}</span>
                              <span className="text-white font-medium">{fmtInactivity(cfg.autoDestructInactivity)}</span>
                            </div>
                            <div className="flex justify-between text-[10px]">
                              <span className="text-zinc-400">{t('modelDestructCount')}</span>
                              <span className="text-white font-medium">{cfg.destructCountdownSeconds}s</span>
                            </div>
                          </>
                        )}
                        <div className="border-t border-white/5 my-1.5" />
                        <div className="space-y-0.5">
                          <div className="grid grid-cols-4 gap-x-2 text-[8px] text-zinc-600 font-mono mb-0.5">
                            <span />
                            <span className="text-right">t</span>
                            <span className="text-right">m</span>
                            <span className="text-right">p</span>
                          </div>
                          {([
                            { label: 'master', params: cfg.argon },
                            { label: 'recovery', params: cfg.argonRecovery },
                            { label: 'PIN', params: cfg.argonPin },
                          ] as const).map(({ label, params }) => {
                            const mem = (params.memoryKib / 1024).toFixed(0);
                            return (
                              <div key={label} className="grid grid-cols-4 gap-x-2 text-[9px] font-mono">
                                <span className="text-zinc-500">{label}</span>
                                <span className="text-zinc-300 text-right">{params.iterations}</span>
                                <span className="text-zinc-300 text-right">{mem}M</span>
                                <span className="text-zinc-300 text-right">{params.parallelism}</span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="border-t border-white/5 my-1.5" />
                        <div className="space-y-0.5">
                          {([
                            { label: 'min pwd', value: `${cfg.minPasswordLength} chars` },
                            { label: 'settings pwd', value: cfg.settingsPasswordRequired ? 'required' : 'optional' },
                            { label: 'vault PIN', value: cfg.vaultPinAllowed ? 'allowed' : 'disabled' },
                            { label: 'backup name', value: cfg.backupFilenameRandom ? 'random' : 'descriptive' },
                            { label: 'recovery file', value: cfg.recoveryFilenameRandom ? 'random' : 'descriptive' },
                          ] as const).map(({ label, value }) => (
                            <div key={label} className="flex justify-between text-[9px]">
                              <span className="text-zinc-500">{label}</span>
                              <span className="text-zinc-300">{value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-white/5">
                        {cfg.autoDestructEnabled ? (
                          <span className="text-[9px] text-red-400/70">{t('warning')}: {t('auditLimitationTitle')}</span>
                        ) : (
                          <span className="text-[9px] text-zinc-600">{t('auditLimitationTitle')}</span>
                        )}
                      </div>
                    </motion.div>
                  </motion.div>
                );
              })()}

              {confirmTier !== null && (() => {
                const tier = TIERS.find(t => t.id === confirmTier);
                if (!tier) return null;
                const cfg = tier.config;
                const Icon = tier.icon;
                const fmtInactivity = (s: number) => {
                  if (s === 0) return t('inactivityOff');
                  if (s < 60) return `${s}s`;
                  if (s < 3600) return `${Math.floor(s / 60)}m`;
                  if (s < 86400) return `${Math.floor(s / 3600)}h`;
                  return `${Math.floor(s / 86400)}d`;
                };
                return (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                    onClick={() => setConfirmTier(null)}
                  >
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      onClick={(e) => e.stopPropagation()}
                      className="relative w-full max-w-xs glass-card border border-white/10 rounded-2xl p-5"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-xl bg-neon-green/20 text-neon-green">
                          <Icon size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-white">{t(tier.nameKey as any)}</p>
                          <p className="text-[9px] text-zinc-500">{t('tierInfoTitle')}</p>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-zinc-400">{t('modelBlur')}</span>
                          <span className="text-white font-medium">{cfg.autoBlurSeconds}s</span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-zinc-400">{t('modelLock')}</span>
                          <span className="text-white font-medium">{cfg.autoLockSeconds}s</span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-zinc-400">{t('modelAttempts')}</span>
                          <span className="text-white font-medium">{cfg.failedAttemptsThreshold}</span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-zinc-400">{t('modelLockDur')}</span>
                          <span className="text-white font-medium">{cfg.progressiveLockSeconds === 0 ? t('recoveryOnly') : `${cfg.progressiveLockSeconds}s`}</span>
                        </div>
                        <div className="border-t border-white/5 my-1.5" />
                        <div className="flex justify-between text-[10px]">
                          <span className="text-zinc-400">{t('modelDestruct')}</span>
                          <span className={`font-medium ${cfg.autoDestructEnabled ? 'text-red-400' : 'text-zinc-500'}`}>{cfg.autoDestructEnabled ? t('on') : t('off')}</span>
                        </div>
                        {cfg.autoDestructEnabled && (
                          <>
                            <div className="flex justify-between text-[10px]">
                              <span className="text-zinc-400">{t('modelDestructAtt')}</span>
                              <span className="text-white font-medium">{cfg.autoDestructAttempts}</span>
                            </div>
                            <div className="flex justify-between text-[10px]">
                              <span className="text-zinc-400">{t('modelDestructIn')}</span>
                              <span className="text-white font-medium">{fmtInactivity(cfg.autoDestructInactivity)}</span>
                            </div>
                            <div className="flex justify-between text-[10px]">
                              <span className="text-zinc-400">{t('modelDestructCount')}</span>
                              <span className="text-white font-medium">{cfg.destructCountdownSeconds}s</span>
                            </div>
                          </>
                        )}
                      </div>
                      <div className="border-t border-white/5 my-1.5" />
                      <div className="space-y-0.5">
                        <div className="grid grid-cols-4 gap-x-2 text-[8px] text-zinc-600 font-mono mb-0.5">
                          <span />
                          <span className="text-right">t</span>
                          <span className="text-right">m</span>
                          <span className="text-right">p</span>
                        </div>
                        {([
                          { label: 'master', params: cfg.argon },
                          { label: 'recovery', params: cfg.argonRecovery },
                          { label: 'PIN', params: cfg.argonPin },
                        ] as const).map(({ label, params }) => {
                          const mem = (params.memoryKib / 1024).toFixed(0);
                          return (
                            <div key={label} className="grid grid-cols-4 gap-x-2 text-[9px] font-mono">
                              <span className="text-zinc-500">{label}</span>
                              <span className="text-zinc-300 text-right">{params.iterations}</span>
                              <span className="text-zinc-300 text-right">{mem}M</span>
                              <span className="text-zinc-300 text-right">{params.parallelism}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="border-t border-white/5 my-1.5" />
                      <div className="space-y-0.5">
                        {([
                          { label: 'min pwd', value: `${cfg.minPasswordLength} chars` },
                          { label: 'settings pwd', value: cfg.settingsPasswordRequired ? 'required' : 'optional' },
                          { label: 'vault PIN', value: cfg.vaultPinAllowed ? 'allowed' : 'disabled' },
                          { label: 'backup name', value: cfg.backupFilenameRandom ? 'random' : 'descriptive' },
                          { label: 'recovery file', value: cfg.recoveryFilenameRandom ? 'random' : 'descriptive' },
                        ] as const).map(({ label, value }) => (
                          <div key={label} className="flex justify-between text-[9px]">
                            <span className="text-zinc-500">{label}</span>
                            <span className="text-zinc-300">{value}</span>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => {
                          if (tier) onApplyThreatModel?.(cfg);
                          setSetupStep('create');
                        }}
                        className="mt-3 text-[10px] text-zinc-400 hover:text-white transition-colors flex items-center justify-center gap-1 w-full"
                      >
                        {t('continueButton')} <ChevronRight size={12} />
                      </button>
                    </motion.div>
                  </motion.div>
                );
              })()}
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
          <span className={isLocked ? '' : 'drop-shadow-[0_0_12px_rgba(212,212,216,0.5)]'} style={{ color: isLocked ? '#ef4444' : accentColor }}>{t('toolSuffix')}</span>
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

              <AutoDestructCountdown ref={destructRef} onComplete={onDestructComplete} onStateChange={setIsDestructing} />

              {isLocked && !isDestructing && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center p-6 bg-red-500/5 rounded-2xl border border-red-500/10 mb-4"
                >
                  <Timer className="text-red-500 mb-3 animate-pulse" size={36} />
                  <div className="text-3xl font-black font-mono text-red-500">{timeLeft}s</div>
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className={`space-y-4 ${isLocked && !isDestructing ? 'opacity-30 pointer-events-none grayscale' : ''}`}>
                <div className="space-y-1.5">
                  <label className="text-sm text-muted font-medium ml-1">{t('masterPassword')}</label>
                  <div className="relative group">
                    <input
                      disabled={isProcessing || (isLocked && !isDestructing)}
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t('enterPasswordField')}
                      className={`w-full bg-surface border ${isDestructing ? 'border-red-500/50 focus:border-red-500' : 'border-border focus:border-primary'} text-primary rounded-xl pl-4 pr-20 py-3 focus:outline-none transition-all placeholder:text-muted disabled:opacity-50`}
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
                      disabled={isProcessing || (isLocked && !isDestructing)}
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
                  disabled={isProcessing || (isLocked && !isDestructing)}
                  className={`w-full text-black font-bold text-base py-3 rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:grayscale disabled:opacity-50 ${isDestructing ? 'bg-red-500 hover:bg-red-400' : isLocked ? 'bg-zinc-800' : ''}`}
                  style={{ backgroundColor: isDestructing ? undefined : (isLocked ? undefined : accentColor), boxShadow: isDestructing ? '0 0 20px rgba(239,68,68,0.4)' : (isLocked ? undefined : `0 0 15px rgba(${accentRgb}, 0.3)`) }}
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

              {!isSetup && !isLocked && !isDestructing && recoverySettings && recoverySettings.count > 0 && (
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
