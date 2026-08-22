
import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ImageIcon, Video, FileAudio, FileText } from 'lucide-react';
import { AppTheme } from '../../types';
import { useI18n } from '../../locales/i18nContext';

// Helper to format bytes (could be moved to utils)
const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const StorageItem: React.FC<{
  label: string;
  size: number;
  total: number;
  color: string;
  icon: React.ReactNode;
}> = ({ label, size, total, color, icon }) => {
  const percent = total > 0 ? (size / total) * 100 : 0;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-surface" style={{ color: color === 'var(--accent-color)' ? color : color }}>
            {icon}
          </div>
          <div>
            <h5 className="text-sm font-bold text-primary">{label}</h5>
            <p className="text-xs text-muted font-mono">{percent.toFixed(1)}%</p>
          </div>
        </div>
        <span className="text-sm font-mono font-bold text-muted">
          {formatBytes(size)}
        </span>
      </div>
      <div className="h-2 w-full rounded-full overflow-hidden bg-surface">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
};

export const StorageView: React.FC<{
  onBack: () => void;
  storageStats: { used: number; limit: number; breakdown: any };
  appTheme: AppTheme;
}> = ({ onBack, storageStats, appTheme }) => {
  const { t } = useI18n();
  
  return (
    <motion.div key="storage-view" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }} className="absolute inset-0 z-50 flex flex-col bg-background">
      <div className="px-5 pt-6 pb-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-4"><button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-surface transition-colors glass-button"><ArrowLeft size={24} className="text-primary" /></button><h2 className="text-xl font-bold tracking-wide text-primary">{t('storage')}</h2></div>
          
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-6">
        <div className="rounded-[40px] p-8 mb-10 flex flex-col items-center relative overflow-hidden glass-card">
            <div className="relative w-56 h-56 mb-8 flex items-center justify-center">
              <svg viewBox="0 0 36 36" className="w-full h-full rotate-[-90deg] drop-shadow-[0_0_15px_rgba(var(--accent-rgb),0.2)]">
                <path className="text-surface" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="2.5" />
                <motion.path initial={{ pathLength: 0 }} animate={{ pathLength: storageStats.used / storageStats.limit }} transition={{ duration: 2, ease: "circOut" }} className="text-neon-green" strokeDasharray="100, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-black font-mono tracking-tighter text-primary">{Math.round((storageStats.used / storageStats.limit) * 100)}%</span>
                <span className="text-[10px] text-muted uppercase font-black tracking-[0.2em] mt-2">{t('used') || 'Utilizat'}</span>
              </div>
            </div>
            <div className="w-full text-center z-10 space-y-2 border-t border-dashed border-border pt-6">
              <p className="text-xs text-muted uppercase font-black tracking-widest">{t('totalSpaceUsed') || 'Total space used'}</p>
              <p className="text-2xl font-black font-mono text-neon-green">{formatBytes(storageStats.used)}</p>
            </div>
        </div>
        <div className="space-y-6">
            <h4 className={`text-[10px] font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2 text-muted`}>{t('categoryDetails') || 'Detaliere categorii'}</h4>
            <StorageItem label={t('pictures') || "Poze"} size={storageStats.breakdown.image} total={storageStats.used} color="var(--accent-color)" icon={<ImageIcon size={18} />} />
            <StorageItem label={t('videoLabel') || "Video"} size={storageStats.breakdown.video} total={storageStats.used} color="#a855f7" icon={<Video size={18} />} />
            <StorageItem label={t('musicLabel') || "Music"} size={storageStats.breakdown.audio} total={storageStats.used} color="#eab308" icon={<FileAudio size={18} />} />
            <StorageItem label={t('documentsLabel') || "Documente"} size={storageStats.breakdown.doc} total={storageStats.used} color="#3b82f6" icon={<FileText size={18} />} />
        </div>
      </div>
    </motion.div>
  );
};
