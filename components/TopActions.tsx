
import React from 'react';
import { Search, Trash2, Settings } from 'lucide-react';
import { ViewState } from '../types';
import { LiquidGlassOverlay } from './LiquidGlassOverlay';

interface TopActionsProps {
  activeTab: string;
  onNavigateView: (view: ViewState) => void;
}

export const TopActions: React.FC<TopActionsProps> = ({
  activeTab,
  onNavigateView,
}) => {
  if (activeTab !== 'files') {
    return null;
  }

  return (
    <header className="px-5 pt-8 pb-4 bg-background">
      <div className="flex items-center gap-2">
        <button
          onClick={() => onNavigateView('search')}
          className="w-12 h-12 flex items-center justify-center rounded-2xl text-primary transition-all active:scale-95 relative overflow-hidden border border-white/10"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
            backdropFilter: 'blur(12px) saturate(180%)',
            WebkitBackdropFilter: 'blur(12px) saturate(180%)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)',
          }}
        >
          <LiquidGlassOverlay intensity="subtle" />
          <Search size={18} className="relative z-10" />
        </button>
        <button
          onClick={() => onNavigateView('trash')}
          className="w-12 h-12 flex items-center justify-center rounded-2xl text-primary transition-all active:scale-95 relative overflow-hidden border border-white/10"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
            backdropFilter: 'blur(12px) saturate(180%)',
            WebkitBackdropFilter: 'blur(12px) saturate(180%)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)',
          }}
        >
          <LiquidGlassOverlay intensity="subtle" />
          <Trash2 size={18} className="relative z-10" />
        </button>
        <button
          onClick={() => onNavigateView('settings')}
          className="w-12 h-12 flex items-center justify-center rounded-2xl text-primary transition-all active:scale-95 relative overflow-hidden border border-white/10"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
            backdropFilter: 'blur(12px) saturate(180%)',
            WebkitBackdropFilter: 'blur(12px) saturate(180%)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)',
          }}
        >
          <LiquidGlassOverlay intensity="subtle" />
          <Settings size={18} className="relative z-10" />
        </button>
      </div>
    </header>
  );
};
