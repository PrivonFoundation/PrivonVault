
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '../locales/i18nContext';

// HSL to Hex Helper for Color Picker
const hslToHex = (h: number, s: number, l: number) => {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

export const CustomColorPicker: React.FC<{
  color: string;
  onChange: (color: string) => void;
  compact?: boolean;
}> = ({ color, onChange, compact }) => {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [localColor, setLocalColor] = useState(color);
  const [hue, setHue] = useState(120);

  const variants = useMemo(() => [
      { s: 100, l: 50 }, { s: 100, l: 60 }, { s: 100, l: 70 }, { s: 100, l: 80 },
      { s: 100, l: 40 }, { s: 100, l: 30 }, { s: 80, l: 50 }, { s: 50, l: 50 }
  ], []);

  const generatedColors = useMemo(() => variants.map(v => hslToHex(hue, v.s, v.l)), [hue, variants]);

  useEffect(() => { setLocalColor(color); }, [color]);

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalColor(e.target.value);
    if (/^#[0-9A-F]{6}$/i.test(e.target.value)) onChange(e.target.value);
  };

  const handleHueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHue = parseInt(e.target.value);
    setHue(newHue);
    const newHex = hslToHex(newHue, 100, 50);
    setLocalColor(newHex);
    onChange(newHex);
  };

  return (
    <>
      <div 
        onClick={() => setIsOpen(true)}
        className={`rounded-xl border border-border cursor-pointer flex items-center justify-between bg-surface hover:border-primary transition-all group ${compact ? 'w-10 h-10 p-0 justify-center' : 'w-full h-12 px-4'}`}
      >
        {compact ? (
           <div className="w-6 h-6 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: color }}></div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: color }}></div>
              <span className="text-xs font-bold text-primary font-mono uppercase">{color}</span>
            </div>
            <div className="text-[10px] font-black uppercase tracking-widest text-muted group-hover:text-primary transition-colors">{t('change') || 'Change'}</div>
          </>
        )}
      </div>

      {isOpen && createPortal(
        <AnimatePresence>
          <div className="fixed inset-0 z-[99999] flex items-center justify-center px-4" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
             <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm glass-card rounded-[32px] overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
               <div className="p-5 border-b border-border bg-black/30 flex justify-between items-center">
                  <h3 className="text-lg font-bold text-primary">{t('colorSelector') || 'Selector Culoare'}</h3>
               </div>
               
               <div className="p-6 space-y-6">
                  <div>
                    <div className="flex justify-between mb-3">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted">{t('chooseShade') || 'Choose Shade'}</span>
                      <span className="text-[10px] font-mono font-bold text-primary">{hue}°</span>
                    </div>
                    <div className="h-6 rounded-full w-full relative overflow-hidden ring-2 ring-border">
                        <input type="range" min="0" max="360" value={hue} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" onChange={handleHueChange} />
                        <div className="absolute inset-0 z-10" style={{ background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)' }} />
                        <div className="absolute top-0 bottom-0 w-2 bg-white border-2 border-black rounded-full pointer-events-none z-30 shadow-lg transform -translate-x-1/2" style={{ left: `${(hue / 360) * 100}%` }} />
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted mb-3 block">{t('generatedVariants') || 'Variante Generate'}</span>
                    <div className="grid grid-cols-4 gap-3">
                      {generatedColors.map((c) => (
                        <button key={c} onClick={() => { onChange(c); setLocalColor(c); }} className={`w-full aspect-square rounded-xl border-2 transition-transform hover:scale-105 shadow-sm bg-black/30 ${localColor.toLowerCase() === c.toLowerCase() ? 'border-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'border-white/10'}`} style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </div>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted font-bold text-xs">#</div>
                    <input type="text" value={localColor.replace('#', '')} onChange={handleHexChange} maxLength={6} className="w-full bg-black/50 border border-border rounded-xl py-3 pl-7 pr-3 text-sm font-mono font-bold text-primary focus:outline-none focus:border-neon-green transition-colors uppercase text-center tracking-widest" />
                  </div>
               </div>
               <div className="p-4 border-t border-border bg-black/30">
                  <button onClick={() => setIsOpen(false)} className="w-full py-3 rounded-xl bg-neon-green text-black text-xs font-black uppercase tracking-widest shadow-[0_0_15px_rgba(var(--accent-rgb),0.3)] hover:scale-[1.02] transition-transform">{t('done') || 'Gata'}</button>
               </div>
            </motion.div>
          </div>
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};
