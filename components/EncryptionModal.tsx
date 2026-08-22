
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Zap, Cpu, Lock, Key, Copy, Check, ArrowRight, ArrowLeft, Loader2, HelpCircle, Smartphone, Monitor, Server, AlertTriangle } from 'lucide-react';
import { FileSystemItem } from '../types';
import { db, DBItem, getVaultKey } from '../crypto-core/db';
import type { CryptoAlgorithm } from '../types';
import { useI18n } from '../locales/i18nContext';
import snowEncryptionImg from '../assets/snow-encryption.png';
import {
  encrypt_with_passphrase,
  decrypt,
  stream_encrypt,
  base64_decode, base64_encode,
  vault_encrypt_keys, vault_decrypt_keys,
  random_bytes,
} from '../crypto-core/index';

type TierKey = 'low' | 'mid' | 'flagship';
type AlgoEntry = { id: CryptoAlgorithm; name: string; desc: string; badge: string };
type AlgoInfo = { title: string; subtitle: string; body: string; analogy: string; useCase: string; strength: string };
type TierLimits = { type: string; max: string }[];
type TierInfo = {
  label: string;
  subtitle: string;
  icon: typeof Smartphone;
  ram: string;
  cpu: string;
  limits: TierLimits;
  warning: string;
  time: string;
};

const buildAlgorithms = (t: (key: any) => string): AlgoEntry[] => [
  { id: 'AES-GCM-Stream', name: t('algoAesGcmStreamTitle'), desc: t('streamingDesc'), badge: t('streamBadge') },
  { id: 'AES-GCM', name: t('algoAesGcmTitle'), desc: t('industryStandardDesc'), badge: t('nistBadge') },
  { id: 'XChaCha20-Poly1305', name: t('algoXChaCha20Title'), desc: t('modernExtendedNonceDesc'), badge: t('modernBadge') },
  { id: 'ChaCha20-Poly1305', name: t('algoChaCha20Title'), desc: t('fastMobileDesc'), badge: t('fastBadge') },
  { id: 'AES-CTR', name: t('algoAesCtrTitle'), desc: t('classicHmacDesc'), badge: t('hmacBadge') },
  { id: 'Salsa20-Poly1305', name: t('algoSalsa20Title'), desc: t('salsa20Desc'), badge: t('classicBadge') },
];

const buildAlgoInfo = (t: (key: any) => string): Record<CryptoAlgorithm, AlgoInfo> => ({
  'AES-GCM-Stream': {
    title: t('algoAesGcmStreamTitle'),
    subtitle: t('algoAesGcmStreamSubtitle'),
    body: t('algoAesGcmStreamBody'),
    analogy: t('algoAesGcmStreamAnalogy'),
    useCase: t('algoAesGcmStreamUseCase'),
    strength: t('algoAesGcmStreamStrength'),
  },
  'AES-GCM': {
    title: t('algoAesGcmTitle'),
    subtitle: t('algoAesGcmSubtitle'),
    body: t('algoAesGcmBody'),
    analogy: t('algoAesGcmAnalogy'),
    useCase: t('algoAesGcmUseCase'),
    strength: t('algoAesGcmStrength'),
  },
  'XChaCha20-Poly1305': {
    title: t('algoXChaCha20Title'),
    subtitle: t('algoXChaCha20Subtitle'),
    body: t('algoXChaCha20Body'),
    analogy: t('algoXChaCha20Analogy'),
    useCase: t('algoXChaCha20UseCase'),
    strength: t('algoXChaCha20Strength'),
  },
  'ChaCha20-Poly1305': {
    title: t('algoChaCha20Title'),
    subtitle: t('algoChaCha20Subtitle'),
    body: t('algoChaCha20Body'),
    analogy: t('algoChaCha20Analogy'),
    useCase: t('algoChaCha20UseCase'),
    strength: t('algoChaCha20Strength'),
  },
  'AES-CTR': {
    title: t('algoAesCtrTitle'),
    subtitle: t('algoAesCtrSubtitle'),
    body: t('algoAesCtrBody'),
    analogy: t('algoAesCtrAnalogy'),
    useCase: t('algoAesCtrUseCase'),
    strength: t('algoAesCtrStrength'),
  },
  'Salsa20-Poly1305': {
    title: t('algoSalsa20Title'),
    subtitle: t('algoSalsa20Subtitle'),
    body: t('algoSalsa20Body'),
    analogy: t('algoSalsa20Analogy'),
    useCase: t('algoSalsa20UseCase'),
    strength: t('algoSalsa20Strength'),
  },
});

const buildHardwareTiers = (t: (key: any) => string): Record<TierKey, TierInfo> => ({
  low: {
    label: t('tierLowLabel'),
    subtitle: t('tierLowSubtitle'),
    icon: Smartphone,
    ram: t('tierLowRam'),
    cpu: t('tierLowCpu'),
    limits: [
      { type: '🖼️ ' + t('limitPhotos'), max: t('limit50mbPerFile') },
      { type: '🎵 ' + t('limitAudio'), max: t('limit200mbPerFile') },
      { type: '🎬 ' + t('limitVideo'), max: t('limit500mbPerFile') },
      { type: '📁 ' + t('limitFolders'), max: t('limitFoldersLow') },
    ],
    warning: t('tierWarning'),
    time: t('tierLowTime'),
  },
  mid: {
    label: t('tierMidLabel'),
    subtitle: t('tierMidSubtitle'),
    icon: Monitor,
    ram: t('tierMidRam'),
    cpu: t('tierMidCpu'),
    limits: [
      { type: '🖼️ ' + t('limitPhotos'), max: t('limitNoPractical') },
      { type: '🎵 ' + t('limitAudio'), max: t('limit500mbPerFile') },
      { type: '🎬 ' + t('limitVideo'), max: t('limit1gbPerFile') },
      { type: '📁 ' + t('limitFolders'), max: t('limitFoldersMid') },
    ],
    warning: t('tierWarning'),
    time: t('tierMidTime'),
  },
  flagship: {
    label: t('tierFlagshipLabel'),
    subtitle: t('tierFlagshipSubtitle'),
    icon: Server,
    ram: t('tierFlagshipRam'),
    cpu: t('tierFlagshipCpu'),
    limits: [
      { type: '🖼️ ' + t('limitPhotos'), max: t('limitNoPractical') },
      { type: '🎵 ' + t('limitAudio'), max: t('limitNoPractical') },
      { type: '🎬 ' + t('limitVideo'), max: t('limit4gbPerFile') },
      { type: '📁 ' + t('limitFolders'), max: t('limitFoldersFlagship') },
    ],
    warning: t('tierWarning'),
    time: t('tierFlagshipTime'),
  },
});

interface EncryptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  item: FileSystemItem;
  vaultPin?: string | null;
  onRequestPinSetup?: () => Promise<string | null>;
}

export const EncryptionModal: React.FC<EncryptionModalProps> = ({ isOpen, onClose, onRefresh, item, vaultPin, onRequestPinSetup }) => {
  const { t } = useI18n();
  const [step, setStep] = useState<'algo' | 'key' | 'processing'>('algo');
  const [selectedAlgo, setSelectedAlgo] = useState<CryptoAlgorithm>('AES-GCM-Stream');
  const [selectedTier] = useState<TierKey>('mid');
  const [generatedKey, setGeneratedKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [infoAlgo, setInfoAlgo] = useState<CryptoAlgorithm | null>(null);
  const [saveToVault, setSaveToVault] = useState(false);
  const [selectedVaultCategory, setSelectedVaultCategory] = useState<string>('');
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [pinSetupComplete, setPinSetupComplete] = useState(false);

  const ALGORITHMS = useMemo(() => buildAlgorithms(t), [t]);
  const ALGO_INFO = useMemo(() => buildAlgoInfo(t), [t]);
  const HARDWARE_TIERS = useMemo(() => buildHardwareTiers(t), [t]);

  const handleToggleSaveToVault = async () => {
    if (!saveToVault && !vaultPin) {
        setShowPinSetup(true);
        if (onRequestPinSetup) {
            const newPin = await onRequestPinSetup();
            if (newPin) {
                setSaveToVault(true);
                setPinSetupComplete(true);
            }
        }
        setShowPinSetup(false);
    } else {
        setSaveToVault(!saveToVault);
    }
  };

  useEffect(() => {
    if (isOpen) {
        setStep('algo');
        setInfoAlgo(null);
        setSaveToVault(false);
        setSelectedVaultCategory('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (step === 'key' && !generatedKey) {
        const randomValues = new Uint8Array(32);
        window.crypto.getRandomValues(randomValues);
        const hex = Array.from(randomValues).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
        setGeneratedKey(hex.match(/.{1,4}/g)?.join('-') || hex);
    }
  }, [step]);

  const handleCopy = () => {
      navigator.clipboard.writeText(generatedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  const handleEncrypt = async () => {
      if (!item.rawBlob) {
          alert(t('fileNoData'));
          return;
      }
      setIsProcessing(true);
      setStep('processing');

      try {
          let rawData: Uint8Array;
          
          if (item.isEncrypted && item.iv && !item.salt) {
              const encryptedData = new Uint8Array(await item.rawBlob.arrayBuffer());
              const key = getVaultKey();
              if (!key) throw new Error('no vault key');
              const decryptedData = await decrypt(base64_encode(encryptedData), item.iv, key);
              rawData = decryptedData;
          } else {
              rawData = new Uint8Array(await item.rawBlob.arrayBuffer());
          }
          
          let result: { ciphertext: Uint8Array; salt: Uint8Array; iv: Uint8Array; algorithm: string };
          
          if (selectedAlgo === 'AES-GCM-Stream') {
              const streamResult = await stream_encrypt(rawData, generatedKey, 3, 65536, 4);
              result = {
                ciphertext: streamResult,
                salt: random_bytes(16),
                iv: random_bytes(12),
                algorithm: 'AES-GCM-Stream',
              };
          } else {
              const encStr = await encrypt_with_passphrase(rawData, generatedKey, selectedAlgo, 3, 65536, 4);
              const parsed = JSON.parse(encStr);
              result = {
                ciphertext: base64_decode(parsed.ciphertext),
                salt: base64_decode(parsed.salt),
                iv: base64_decode(parsed.iv),
                algorithm: selectedAlgo,
              };
          }

          const updatedItem: DBItem = {
              ...item,
              fileData: new Blob([result.ciphertext as any]),
              iv: base64_encode(result.iv),
              salt: base64_encode(result.salt),
              algorithm: result.algorithm as CryptoAlgorithm,
              isEncrypted: true,
          };
          
          delete (updatedItem as any).url;
          delete (updatedItem as any).rawBlob;

          await db.updateItem(updatedItem);

          if (saveToVault && selectedVaultCategory) {
              const existingRaw = localStorage.getItem('privon_vault_keys');
              let existingKeys: any[] = [];
              const vk = getVaultKey();
              if (existingRaw && vk) {
                try { existingKeys = JSON.parse(vault_decrypt_keys(existingRaw, vk)); } catch {}
              }
              existingKeys.push({ id: Date.now().toString(), key: generatedKey, algorithm: result.algorithm, fileName: item.name, categoryId: selectedVaultCategory, fileId: item.id.toString(), date: new Date().toISOString() });
              if (vk) {
                localStorage.setItem('privon_vault_keys', vault_encrypt_keys(JSON.stringify(existingKeys), vk));
              }
          }
          
          setTimeout(() => {
              setIsProcessing(false);
              onRefresh();
              onClose();
          }, 1500);

      } catch (e) {
          console.error(e);
          alert(t('encryptionError'));
          setIsProcessing(false);
          setStep('key');
      }
  };

  if (!isOpen) return null;

  const tier = HARDWARE_TIERS[selectedTier];
  const TierIcon = tier.icon;

  const getHeaderTitle = () => {
    if (infoAlgo) return ALGO_INFO[infoAlgo].title;
    if (step === 'key') return t('encryptionKeyHeader');
    if (step === 'processing') return t('encrypting');
    return t('manualEncryption');
  };

  const getHeaderSubtitle = () => {
    if (infoAlgo) return ALGO_INFO[infoAlgo].subtitle;
    if (step === 'key') return selectedAlgo;
    return item.name;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
        <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
        />
        
        <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-[95vw] md:max-w-lg glass-card rounded-lg md:rounded-2xl overflow-hidden flex flex-col max-h-[95vh] md:max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
        >
            {/* Header */}
            <div className="px-3 py-2 md:px-6 md:py-4 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-6 h-6 md:w-10 md:h-10 rounded md:rounded-xl bg-neon-green/10 flex items-center justify-center text-neon-green">
                        <Shield size={10} className="md:size-5" />
                    </div>
                    <h3 className="text-xs md:text-lg font-bold text-white">{getHeaderTitle()}</h3>
                </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-2.5 md:p-6 custom-scrollbar">
                <AnimatePresence mode="wait">
                    
                    {/* ALGORITHM INFO PAGE */}
                    {infoAlgo && step === 'algo' && (
                        <motion.div
                            key="algo-info"
                            initial={{ opacity: 0, x: 40 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 40 }}
                            className="space-y-2 md:space-y-4 overflow-y-auto max-h-[60vh] md:max-h-[50vh] custom-scrollbar pr-1 md:pr-2"
                        >
                             <button
                                 onClick={() => setInfoAlgo(null)}
                                 className="text-[9px] md:text-sm font-bold text-zinc-500 hover:text-neon-green uppercase flex items-center gap-1"
                             >
                                 ← {t('backButton')}
                             </button>

                             <div className="p-2 md:p-4 rounded-lg md:rounded-xl bg-zinc-900/80 border border-zinc-800">
                                 <h4 className="text-[10px] md:text-base font-bold text-white mb-1">{t('whatIsThis')}</h4>
                                 <p className="text-[9px] md:text-sm text-zinc-400 leading-tight">{ALGO_INFO[infoAlgo].body}</p>
                             </div>

                             <div className="p-2 md:p-4 rounded-lg md:rounded-xl bg-neon-green/5 border border-neon-green/20">
                                 <h4 className="text-[10px] md:text-base font-bold text-neon-green mb-1">💡 {t('analogyLabel')}</h4>
                                 <p className="text-[9px] md:text-sm text-zinc-300 leading-tight italic">{ALGO_INFO[infoAlgo].analogy}</p>
                             </div>

                             <div className="p-2 md:p-4 rounded-lg md:rounded-xl bg-zinc-800/50 border border-zinc-700">
                                 <h4 className="text-[10px] md:text-base font-bold text-zinc-300 mb-1">{t('whenToUse')}</h4>
                                 <p className="text-[9px] md:text-sm text-zinc-400 leading-tight">{ALGO_INFO[infoAlgo].useCase}</p>
                             </div>

                             <div className="p-2 md:p-4 rounded-lg md:rounded-xl bg-zinc-800/30 border border-zinc-700/50">
                                 <h4 className="text-[10px] md:text-base font-bold text-zinc-400 mb-1">{t('securityLevel')}</h4>
                                 <p className="text-[9px] md:text-sm text-zinc-500 leading-tight">{ALGO_INFO[infoAlgo].strength}</p>
                             </div>
                        </motion.div>
                    )}

                    {/* STEP 1: ALGORITHM SELECTION */}
                    {!infoAlgo && step === 'algo' && (
                        <motion.div 
                            key="algo-step"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-2"
                        >
                             <h4 className="text-[8px] font-black uppercase text-zinc-500">{t('algorithmsSection')}</h4>

                             <button
                                 onClick={() => setSelectedAlgo('AES-GCM-Stream')}
                                 className={`w-full p-2 md:p-4 rounded border md:rounded-xl text-left relative overflow-hidden ${selectedAlgo === 'AES-GCM-Stream' ? 'bg-neon-green/10 border-neon-green' : 'bg-zinc-900/50 border-zinc-800'}`}
                             >
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-2">
                                         <div className={`w-5 h-5 md:w-10 md:h-10 rounded md:rounded-xl flex items-center justify-center ${selectedAlgo === 'AES-GCM-Stream' ? 'bg-neon-green/20 text-neon-green' : 'bg-zinc-800 text-zinc-500'}`}>
                                             <Zap size={8} className="md:size-[18px]" />
                                         </div>
                                         <div className="flex-1">
                                             <span className="text-[10px] md:text-base font-bold text-white">AES-GCM Stream</span>
                                         </div>
                                         <div className="flex items-center gap-1 md:gap-2">
                                              <span
                                                  onClick={(e) => { e.stopPropagation(); setInfoAlgo('AES-GCM-Stream'); }}
                                                  className="text-zinc-600 hover:text-neon-green cursor-pointer"
                                              >
                                                   <HelpCircle size={8} className="md:size-4" />
                                               </span>
                                              <span className="text-[7px] md:text-xs px-1.5 md:px-3 py-0.5 md:py-1.5 rounded md:rounded-full bg-neon-green/20 text-neon-green font-bold">{t('recommendedBadge')}</span>
                                          </div>
                                      </div>
                                      <p className="text-[7px] md:text-sm text-zinc-500 mt-1 md:mt-2">{t('streamingDesc')}</p>
                                  </div>
                              </button>

                              <div className="flex items-center gap-2 md:gap-4 my-2 md:my-4">
                                 <div className="flex-1 h-px bg-zinc-800" />
                                 <span className="text-[7px] md:text-xs font-black uppercase text-zinc-700">{t('otherAlgorithms')}</span>
                                 <div className="flex-1 h-px bg-zinc-800" />
                             </div>

                             <div className="grid grid-cols-2 md:grid-cols-2 gap-1.5 md:gap-3">
                                  {ALGORITHMS.filter(a => a.id !== 'AES-GCM-Stream').map((algo) => (
                                      <button
                                          key={algo.id}
                                          onClick={() => setSelectedAlgo(algo.id)}
                                          className={`p-2 md:p-4 rounded border md:rounded-xl text-left relative overflow-hidden ${selectedAlgo === algo.id ? 'bg-neon-green/5 border-neon-green' : 'bg-zinc-900 border-zinc-800'}`}
                                      >
                                        <div className="relative z-10">
                                            <div className="flex justify-between items-start mb-0.5 md:mb-2">
                                                  <span className="text-[9px] md:text-sm font-bold text-zinc-300">{algo.name}</span>
                                                   <div className="flex items-center gap-1 md:gap-2">
                                                       <span
                                                           onClick={(e) => { e.stopPropagation(); setInfoAlgo(algo.id); }}
                                                           className="text-zinc-600 hover:text-neon-green cursor-pointer"
                                                       >
                                                           <HelpCircle size={8} className="md:size-4" />
                                                        </span>
                                                       <span className="text-[6px] md:text-[9px] px-1 md:px-2.5 py-0.5 md:py-1 rounded bg-black text-zinc-500 font-mono">{algo.badge}</span>
                                                   </div>
                                               </div>
                                               <p className="text-[7px] md:text-xs text-zinc-500 leading-relaxed">{algo.desc}</p>
                                          </div>
                                       </button>
                                  ))}
                              </div>
                         </motion.div>
                     )}

                     {/* STEP 2: KEY GENERATION */}
                     {step === 'key' && (
                         <motion.div 
                             key="key-step"
                             initial={{ opacity: 0, x: 20 }}
                             animate={{ opacity: 1, x: 0 }}
                             exit={{ opacity: 0, x: 20 }}
                             className="space-y-2 md:space-y-6"
                         >
                             <div className="flex items-center gap-1.5 md:gap-3">
                                 <Key size={8} className="text-neon-green md:size-4" />
                                 <h4 className="text-[8px] md:text-sm font-black text-zinc-300">{t('uniqueKey')}</h4>
                             </div>
                             <div className="relative bg-black border border-zinc-800 rounded md:rounded-xl p-2 md:p-4 font-mono text-[8px] md:text-xs text-neon-green break-all">
                                 {generatedKey}
                                 <button 
                                     onClick={handleCopy}
                                     className="absolute top-1 right-1 p-1 md:p-2 bg-zinc-900 rounded"
                                 >
                                     {copied ? <Check size={8} className="md:size-4" /> : <Copy size={8} className="md:size-4" />}
                                 </button>
                             </div>
                             <div className="p-2 md:p-4 bg-zinc-800/50 border border-zinc-700 rounded md:rounded-xl">
                                  <p className="text-[7px] md:text-xs text-zinc-400">{t('saveKeyToVaultOrCopy')}</p>
                             </div>

                             <button
                                 onClick={handleToggleSaveToVault}
                                 className={`w-full flex items-center justify-between p-2 md:p-4 rounded border md:rounded-xl ${saveToVault ? 'bg-neon-green/5 border-neon-green/30' : 'bg-black/50 border-zinc-800'}`}
                             >
                                 <div className="flex items-center gap-2 md:gap-3">
                                     <div className={`w-5 h-5 md:w-8 md:h-8 rounded md:rounded-xl flex items-center justify-center ${saveToVault ? 'bg-neon-green/20' : 'bg-zinc-800'}`}>
                                         <Shield size={8} className="md:size-4" />
                                     </div>
                                      <span className="text-[9px] md:text-sm font-bold text-zinc-400">{t('saveToVaultToggle')}</span>
                                 </div>
                                 <div className={`w-6 h-3 md:w-9 md:h-5 rounded-full flex items-center ${saveToVault ? 'bg-neon-green' : 'bg-zinc-700'}`}>
                                     <div className={`w-2.5 h-2.5 md:w-3.5 md:h-3.5 rounded-full bg-white transition-transform ${saveToVault ? 'translate-x-3 md:translate-x-4' : 'translate-x-0.5'}`} />
                                 </div>
                             </button>
                         </motion.div>
                     )}

                      {/* STEP 4: PROCESSING */}
                      {step === 'processing' && (
                          <motion.div 
                              key="processing"
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="flex flex-col items-center justify-center py-10 space-y-6"
                          >
                              <div className="relative">
                                  <div className="absolute inset-0 bg-neon-green/20 blur-xl rounded-full" />
                                  <motion.img
                                    src={snowEncryptionImg}
                                    alt="Encrypting"
                                    className="w-48 h-48 object-contain relative z-10"
                                    animate={{ scale: [1, 1.05, 1] }}
                                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                                  />
                              </div>
                              <div className="text-center">
                                   <h4 className="text-xl font-bold text-white">Snow is encrypting your file</h4>
                                   <p className="text-zinc-400 text-xs mt-2">Your data is being locked with strong encryption. This will only take a moment!</p>
                              </div>
                          </motion.div>
                      )}

                </AnimatePresence>
            </div>

            {/* Footer Actions */}
            {step !== 'processing' && (
                <div className="p-3 md:p-6 border-t border-zinc-800 bg-zinc-900/30 flex justify-between items-center gap-3 md:gap-6 shrink-0">
                     {step === 'key' ? (
                          <button
                              onClick={() => setStep('algo')}
                              className="text-[9px] md:text-xs font-bold text-zinc-500 hover:text-white uppercase flex items-center gap-1"
                          >
                              ← {t('backButton')}
                          </button>
                     ) : (
                         <div /> 
                     )}

                       {step === 'algo' ? (
                           <button
                               onClick={() => setStep('key')}
                               className="px-5 md:px-10 py-2.5 md:py-3 rounded-lg md:rounded-xl bg-white text-black text-[10px] md:text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 relative overflow-hidden"
                           >
                                <span className="relative z-10">{t('continueButton')} →</span>
                           </button>
                       ) : (
                           <button
                               onClick={handleEncrypt}
                               className="px-5 md:px-10 py-2.5 md:py-3 rounded-lg md:rounded-xl bg-white text-black text-[10px] md:text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 relative overflow-hidden"
                           >
                                <span className="relative z-10">{t('encrypt')} →</span>
                           </button>
                       )}
                </div>
            )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
