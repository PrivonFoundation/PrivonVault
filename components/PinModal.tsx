
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Delete, Lock, ShieldAlert, CheckCircle, X } from 'lucide-react';
import { validate_pin, get_backoff_time, pin_verify, get_argon_params } from '../crypto-core/index';
import { useI18n } from '../locales/i18nContext';

interface PinModalProps {
  mode: 'setup' | 'unlock' | 'disable';
  onSuccess: (pin: string) => void;
  onClose: () => void;
  savedPin?: string | null;
  tier?: number;
}

export const PinModal: React.FC<PinModalProps> = ({ mode, onSuccess, onClose, savedPin, tier }) => {
  const { t } = useI18n();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'enter' | 'confirm'>(mode === 'setup' ? 'enter' : 'confirm'); // 'confirm' here is reused for single entry in unlock
  const [error, setError] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  // Progressive lock timer
  useEffect(() => {
    if (!lockUntil) return;
    const interval = setInterval(() => {
      const remaining = Math.ceil((lockUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockUntil(null);
        setTimeLeft(0);
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockUntil]);

  const handlePress = (digit: string) => {
    if (lockUntil) return;
    if (error) setError(null);

    const currentVal = step === 'enter' ? pin : (mode === 'setup' ? confirmPin : pin);
    if (currentVal.length < 6) {
      if (step === 'enter') setPin(prev => prev + digit);
      else if (mode === 'setup') setConfirmPin(prev => prev + digit);
      else setPin(prev => prev + digit); // Unlock mode uses pin state
    }
  };

  const handleDelete = () => {
    if (lockUntil) return;
    if (step === 'enter') setPin(prev => prev.slice(0, -1));
    else if (mode === 'setup') setConfirmPin(prev => prev.slice(0, -1));
    else setPin(prev => prev.slice(0, -1));
  };

  const handleSubmit = async () => {
    if (lockUntil) return;

    // --- SETUP MODE ---
    if (mode === 'setup') {
      if (step === 'enter') {
        if (pin.length !== 6) { setError(t('pinIncomplete')); return; }
        
        try { validate_pin(pin); } catch (e: any) { setError(e.message || t('pinInvalid')); return; }
        
        setStep('confirm');
      } else {
        if (confirmPin.length !== 6) { setError(t('confirmIncomplete')); return; }
        if (pin !== confirmPin) {
          setError(t('pinsDoNotMatch'));
          setPin('');
          setConfirmPin('');
          setStep('enter');
          return;
        }
        onSuccess(pin);
      }
    } 
    // --- UNLOCK / DISABLE MODE ---
    else {
      if (pin.length !== 6) { setError(t('pinIncomplete')); return; }
      
      if (savedPin && typeof savedPin === 'string' && savedPin.length === 64) {
        const tierId = tier || 1;
        const pinParams = JSON.parse(get_argon_params('pin', tierId));
        const isValid = await pin_verify(pin, savedPin, pinParams.iterations, pinParams.memorySize, pinParams.parallelism);
        if (isValid) {
          onSuccess(pin);
        } else {
          const newFail = failedAttempts + 1;
          setFailedAttempts(newFail);
          const backoff = get_backoff_time(newFail);
          
          if (backoff > 0) {
            setLockUntil(Date.now() + backoff * 1000);
            setError(`${t('wrongPin')}. ${backoff}s.`);
          } else {
            setError(t('wrongPin'));
          }
          setPin('');
        }
      } else if (pin === (savedPin || '')) {
        onSuccess(pin);
      } else {
        const newFail = failedAttempts + 1;
        setFailedAttempts(newFail);
        const backoff = get_backoff_time(newFail);
        
        if (backoff > 0) {
          setLockUntil(Date.now() + backoff * 1000);
          setError(`${t('wrongPin')}. ${backoff}s.`);
        } else {
          setError(t('wrongPin'));
        }
        setPin('');
      }
    }
  };

  // Auto-submit at 6 digits (optional but good for UX)
  useEffect(() => {
    if (mode !== 'setup' && pin.length === 6 && !lockUntil) handleSubmit();
    if (mode === 'setup' && step === 'enter' && pin.length === 6) handleSubmit();
    if (mode === 'setup' && step === 'confirm' && confirmPin.length === 6) handleSubmit();
  }, [pin, confirmPin]);

  const getDisplayPin = () => {
    if (mode === 'setup' && step === 'confirm') return confirmPin;
    return pin;
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-sm glass-card rounded-[40px] p-8 relative overflow-hidden"
      >
        <div className="flex flex-col items-center mb-8">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${lockUntil ? 'bg-red-500/10 text-red-500 animate-pulse' : 'bg-neon-green/10 text-neon-green'}`}>
            {lockUntil ? <ShieldAlert size={32} /> : <Lock size={32} />}
          </div>
          <h2 className="text-xl font-bold text-white mb-1">
            {lockUntil ? `${t('vaultLocked')} (${timeLeft}s)` : (mode === 'setup' ? (step === 'enter' ? t('setNewPin') : t('confirmPin')) : t('vaultAccess'))}
          </h2>
          <p className="text-xs text-zinc-500 text-center px-4">
            {lockUntil ? t('tooManyAttempts') : t('securityDescription')}
          </p>
        </div>

        {/* PIN Display */}
        <div className="flex justify-center gap-4 mb-8">
          {[...Array(6)].map((_, i) => (
            <div 
              key={i} 
              className={`w-4 h-4 rounded-full transition-all duration-300 ${i < getDisplayPin().length ? (lockUntil ? 'bg-red-500' : 'bg-neon-green scale-110') : 'bg-zinc-800'}`}
            />
          ))}
        </div>

        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center text-red-500 text-xs font-bold mb-6 bg-red-500/10 py-2 rounded-lg">
            {error}
          </motion.div>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button
              key={num}
              onClick={() => handlePress(num.toString())}
              disabled={!!lockUntil}
              className="h-16 rounded-2xl bg-zinc-800/50 hover:bg-zinc-800 text-2xl font-bold text-white transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {num}
            </button>
          ))}
          <div className="flex items-center justify-center pointer-events-none opacity-0"></div>
          <button
              onClick={() => handlePress('0')}
              disabled={!!lockUntil}
              className="h-16 rounded-2xl bg-zinc-800/50 hover:bg-zinc-800 text-2xl font-bold text-white transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              0
            </button>
          <button
              onClick={handleDelete}
              disabled={!!lockUntil}
              className="h-16 rounded-2xl hover:bg-red-500/20 text-zinc-400 hover:text-red-500 flex items-center justify-center transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Delete size={24} />
            </button>
        </div>
      </motion.div>
    </div>
  );
};
