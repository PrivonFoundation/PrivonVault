import React from 'react';
import { motion } from 'framer-motion';
import { useI18n } from '../locales/i18nContext';
import welcomeMp4 from '../assets/welcome.mp4';
import welcomeWebm from '../assets/welcome.webm';

interface LandingPageProps {
  onGetStarted: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  const { t } = useI18n();
  return (
    <div className="fixed inset-0 bg-black overflow-hidden z-[9999]">
      {/* Video Background */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-full h-full max-w-[720px] max-h-[544px] mx-auto">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-contain opacity-80"
          >
            <source src={welcomeWebm} type="video/webm" />
            <source src={welcomeMp4} type="video/mp4" />
          </video>
        </div>
      </div>

      {/* Overlay gradient at bottom for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-24 px-6">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <p className="text-zinc-400 text-sm tracking-widest uppercase mb-2 font-mono">
            {t('allInOnePrivacy')}
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-10 tracking-tight">
            {t('setupWelcomeTitle')}
          </h1>

          <motion.button
            onClick={onGetStarted}
            className="px-12 py-4 rounded-xl font-bold text-lg tracking-wide transition-all duration-300 active:scale-[0.97]"
            style={{
              backgroundColor: localStorage.getItem('theme_accent') || '#E8E8E8',
              color: '#000',
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            {t('landingCtaPrimary')}
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
};
