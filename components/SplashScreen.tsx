
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import logoImg from '../assets/logo.png';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [showText, setShowText] = useState(false);
  
  const accentColor = '#E8E8E8';
  const rgb = (() => {
    const c = accentColor.replace('#', '');
    return `${parseInt(c.slice(0, 2), 16)}, ${parseInt(c.slice(2, 4), 16)}, ${parseInt(c.slice(4, 6), 16)}`;
  })();

  useEffect(() => {
    const textTimer = setTimeout(() => setShowText(true), 600);
    const completeTimer = setTimeout(onComplete, 2600);

    return () => {
      clearTimeout(textTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <motion.div 
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black overflow-hidden font-sans"
      exit={{ opacity: 0, scale: 1.1, filter: "blur(20px)" }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
    >
      {/* Background Ambient Glow (Subtle) */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(circle_at_center, rgba(${rgb}, 0.06) 0%, transparent 70%)` }} />

      <div className="relative z-10 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="relative w-72 h-72 flex items-center justify-center mb-10"
        >
            <div className="absolute inset-0 blur-[100px] rounded-full" style={{ backgroundColor: `rgba(${rgb}, 0.2)` }} />
            <div className="absolute inset-8 blur-3xl rounded-full" style={{ backgroundColor: `rgba(${rgb}, 0.15)` }} />
            <motion.img
              src={logoImg}
              alt="Privon Vault"
              className="w-full h-full object-contain relative z-10"
              style={{ filter: `drop-shadow(0 0 40px rgba(${rgb}, 0.6)) drop-shadow(0 0 80px rgba(${rgb}, 0.3))` }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
            />
        </motion.div>

        {/* Text Animation */}
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: showText ? 1 : 0, y: showText ? 0 : 20 }}
            transition={{ duration: 0.8 }}
            className="text-center"
        >
            <h1 className="text-5xl font-black tracking-tighter text-white mb-2 font-mono">
                CRYTO<span className="bg-gradient-to-r from-zinc-300 via-zinc-400 to-zinc-500 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(212,212,216,0.4)]">TOOL</span>
            </h1>
            <motion.div 
                className="h-0.5 mx-auto opacity-50"
                style={{ background: `linear-gradient(to right, transparent, ${accentColor}, transparent)` }}
                initial={{ width: 0 }}
                animate={{ width: showText ? "100%" : 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
            />
            <p className="mt-4 text-[10px] font-bold tracking-[0.4em] text-zinc-500 uppercase">
                Secure Vault Access
            </p>
        </motion.div>
      </div>
    </motion.div>
  );
};
