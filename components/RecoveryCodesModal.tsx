import React from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Download, X, KeyRound } from 'lucide-react';
import { useI18n } from '../locales/i18nContext';

interface RecoveryCodesModalProps {
  codes: string[];
  onDownload: () => void;
  onDismiss: () => void;
}

export const RecoveryCodesModal: React.FC<RecoveryCodesModalProps> = ({ codes, onDownload, onDismiss }) => {
  const { t } = useI18n();
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-lg glass-card rounded-[40px] p-8 relative overflow-hidden"
      >
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 text-yellow-500 flex items-center justify-center mb-4">
            <KeyRound size={32} />
          </div>
          <h2 className="text-xl font-bold text-white mb-1">{t('recoveryCodesTitle')}</h2>
          <p className="text-xs text-zinc-500 text-center px-4">
            {t('recoveryCodesDescription')}
          </p>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 mb-4">
          <p className="text-[11px] text-yellow-500 font-bold text-center flex items-center justify-center gap-2">
            <ShieldAlert size={14} />
            {t('recoveryCodesWarning')}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-6">
          {codes.map((code, idx) => (
            <div
              key={idx}
              className="px-3 py-2 rounded-xl bg-black/50 text-xs font-mono text-zinc-300 text-center border border-zinc-800 tracking-wider"
            >
              {code}
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onDownload}
            className="flex-1 py-3 rounded-2xl bg-neon-green text-black text-xs font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <Download size={16} />
            {t('downloadAction')}
          </button>
          <button
            onClick={onDismiss}
            className="flex-1 py-3 rounded-2xl border border-zinc-700 text-zinc-400 text-xs font-bold hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
          >
            <X size={16} />
            {t('dismissAction')}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
