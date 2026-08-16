/**
 * Privon Vault Shared UI Components
 * 
 * Standardized, reusable components following the DESIGN_SYSTEM.md guidelines.
 * Import these components instead of duplicating code.
 */

import React from 'react';
import { motion } from 'framer-motion';

/**
 * ============================================
 * ICONS
 * ============================================
 * Always use lucide-react as the primary icon source
 */
import { 
  X, Check, ArrowLeft, ArrowRight, Loader2, Eye, EyeOff,
  Shield, ShieldCheck, Lock, Key, AlertTriangle, Info
} from 'lucide-react';

/**
 * ============================================
 * BUTTONS
 * ============================================
 */

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses = 'font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2';
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-[10px] rounded-lg',
    md: 'px-5 py-2.5 text-xs rounded-xl',
    lg: 'px-6 py-3 text-sm rounded-xl'
  };
  
  const variantClasses = {
    primary: 'bg-neon-green text-black shadow-[0_0_20px_rgba(228,228,231,0.3)]',
    secondary: 'bg-surface border border-border text-primary hover:border-neon-green hover:bg-surface/80',
    ghost: 'bg-transparent text-muted hover:text-primary hover:bg-surface',
    danger: 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white',
    outline: 'bg-transparent border border-primary text-primary hover:bg-primary hover:text-background'
  };
  
  return (
    <motion.button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className} disabled:opacity-50 disabled:cursor-not-allowed`}
      disabled={disabled || isLoading}
      whileHover={!disabled && !isLoading ? { scale: 1.02, y: -1 } : undefined}
      whileTap={!disabled && !isLoading ? { scale: 0.96 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      {...(props as any)}
    >
      {isLoading ? (
        <>
          <Loader2 size={size === 'sm' ? 14 : 18} className="animate-spin" />
          {children}
        </>
      ) : (
        <>
          {leftIcon}
          {children}
          {rightIcon}
        </>
      )}
    </motion.button>
  );
};

/**
 * ============================================
 * TOGGLE SWITCH
 * ============================================
 */

interface ToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  color?: 'green' | 'red' | 'blue';
  size?: 'sm' | 'md';
}

export const Toggle: React.FC<ToggleProps> = ({ 
  enabled, 
  onChange, 
  color = 'green',
  size = 'md' 
}) => {
  const colorClasses = {
    green: enabled ? 'bg-neon-green' : 'bg-surface border border-border',
    red: enabled ? 'bg-red-500' : 'bg-surface border border-border',
    blue: enabled ? 'bg-blue-500' : 'bg-surface border border-border'
  };
  
  const sizeClasses = {
    sm: { wrapper: 'w-10 h-5', knob: 'w-4 h-4', translate: enabled ? 16 : 2 },
    md: { wrapper: 'w-12 h-7', knob: 'w-5 h-5', translate: enabled ? 18 : 0 }
  };
  
  return (
    <button 
      onClick={() => onChange(!enabled)}
      className={`${sizeClasses[size].wrapper} rounded-full transition-colors flex items-center px-1 ${colorClasses[color]}`}
    >
      <motion.div 
        layout 
        className={`${sizeClasses[size].knob} rounded-full bg-white shadow-sm`} 
        animate={{ x: sizeClasses[size].translate }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </button>
  );
};

/**
 * ============================================
 * INPUT FIELDS
 * ============================================
 */

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  leftIcon,
  rightElement,
  className = '',
  ...props
}) => {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-sm text-muted font-medium ml-1 block">{label}</label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
            {leftIcon}
          </div>
        )}
        <input
          className={`
            w-full bg-surface border ${error ? 'border-red-500' : 'border-border'} 
            text-primary rounded-xl pl-4 pr-4 py-3 
            focus:outline-none focus:border-primary transition-all 
            placeholder:text-muted
            ${leftIcon ? 'pl-10' : ''} 
            ${rightElement ? 'pr-12' : ''}
            ${className}
          `}
          {...props}
        />
        {rightElement && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {rightElement}
          </div>
        )}
      </div>
      {error && (
        <p className="text-xs text-red-500 ml-1">{error}</p>
      )}
    </div>
  );
};

/**
 * Password Input with visibility toggle
 */
interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
  value,
  onChange,
  placeholder,
  label,
  error,
  disabled
}) => {
  const [showPassword, setShowPassword] = React.useState(false);
  
  return (
    <Input
      type={showPassword ? 'text' : 'password'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      label={label}
      error={error}
      disabled={disabled}
      rightElement={
        <button 
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="hover:text-primary transition-colors"
        >
          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      }
    />
  );
};

/**
 * ============================================
 * RANGE SLIDER
 * ============================================
 */

interface RangeSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  showValue?: boolean;
  unit?: string;
  accentColor?: 'green' | 'red' | 'blue';
}

export const RangeSlider: React.FC<RangeSliderProps> = ({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  showValue = true,
  unit = '',
  accentColor = 'green'
}) => {
  const accentClass = accentColor === 'green' ? 'accent-neon-green' : accentColor === 'red' ? 'accent-red-500' : 'accent-blue-500';
  
  return (
    <div className="space-y-3">
      {(label || showValue) && (
        <div className="flex justify-between items-center">
          {label && <label className="text-sm font-bold uppercase tracking-wider text-primary">{label}</label>}
          {showValue && (
            <span className={`text-xs font-mono font-bold ${accentColor === 'green' ? 'text-neon-green' : accentColor === 'red' ? 'text-red-500' : 'text-blue-500'}`}>
              {value}{unit}
            </span>
          )}
        </div>
      )}
      <input 
        type="range" 
        min={min} 
        max={max} 
        step={step} 
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className={`w-full ${accentClass} h-1.5 bg-surface rounded-lg appearance-none cursor-pointer`} 
      />
    </div>
  );
};

/**
 * ============================================
 * BADGES & LABELS
 * ============================================
 */

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'accent';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ 
  children, 
  variant = 'default',
  size = 'md' 
}) => {
  const sizeClasses = {
    sm: 'text-[8px] px-1.5 py-0.5',
    md: 'text-xs px-3 py-1'
  };
  
  const variantClasses = {
    default: 'bg-surface text-muted border border-border',
    success: 'bg-neon-green text-black',
    warning: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
    error: 'bg-red-500/10 text-red-500 border border-red-500/20',
    accent: 'bg-neon-green/10 text-neon-green border border-neon-green/20'
  };
  
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-bold uppercase tracking-wide ${sizeClasses[size]} ${variantClasses[variant]}`}>
      {children}
    </span>
  );
};

/**
 * Encryption Badge
 */
interface EncryptionBadgeProps {
  algorithm: string;
  compact?: boolean;
}

export const EncryptionBadge: React.FC<EncryptionBadgeProps> = ({ algorithm, compact = false }) => {
  const displayAlgo = algorithm.replace('-Poly1305', '').replace('ChaCha20', 'CHACHA').replace('Salsa20', 'SALSA');
  
  if (compact) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[9px] font-mono text-neon-green">
        <Lock size={8} />
        {displayAlgo}
      </span>
    );
  }
  
  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-black border border-neon-green/30 shadow-[0_0_10px_rgba(var(--accent-rgb),0.15)]">
      <ShieldCheck size={10} className="text-neon-green" />
      <span className="text-[9px] font-black text-neon-green font-mono uppercase tracking-widest">
        {displayAlgo}
      </span>
    </div>
  );
};

/**
 * ============================================
 * SECTION HEADER
 * ============================================
 */

interface SectionHeaderProps {
  title: string;
  icon?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, icon }) => (
  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2 text-muted">
    {icon}
    {title}
  </h3>
);

/**
 * ============================================
 * CARD COMPONENTS
 * ============================================
 */

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className = '',
  onClick,
  hoverable = false 
}) => (
  <div 
    className={`
      p-5 rounded-[24px] border border-border bg-card shadow-xl
      ${hoverable ? 'cursor-pointer hover:border-neon-green/50 transition-all hover:shadow-2xl' : ''}
      ${className}
    `}
    onClick={onClick}
  >
    {children}
  </div>
);

/**
 * Compact Card for settings/items
 */
interface CompactCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const CompactCard: React.FC<CompactCardProps> = ({ children, className = '', onClick }) => (
  <div 
    className={`p-4 rounded-2xl border border-border bg-card ${onClick ? 'cursor-pointer hover:border-primary transition-all' : ''} ${className}`}
    onClick={onClick}
  >
    {children}
  </div>
);

/**
 * ============================================
 * MODAL / DIALOG
 * ============================================
 */

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  size = 'md'
}) => {
  if (!isOpen) return null;
  
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl'
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
          className={`relative w-full ${sizeClasses[size]} bg-zinc-950 border border-zinc-800 rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[85vh]`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              {icon && (
                <div className="w-10 h-10 rounded-xl bg-neon-green/10 flex items-center justify-center border border-neon-green/20 text-neon-green">
                  {icon}
                </div>
              )}
              <div>
                <h3 className="text-lg font-bold text-white leading-tight">{title}</h3>
                {subtitle && (
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wider">{subtitle}</p>
                )}
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            {children}
          </div>
          
          {/* Footer */}
          {footer && (
            <div className="p-6 border-t border-zinc-800 bg-zinc-900/30 shrink-0">
              {footer}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

/**
 * ============================================
 * ANIMATE PRESENCE (re-export for convenience)
 * ============================================
 */
import { AnimatePresence } from 'framer-motion';

/**
 * ============================================
 * ALERT / TOAST COMPONENTS
 * ============================================
 */

interface AlertProps {
  type?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export const Alert: React.FC<AlertProps> = ({ 
  type = 'info', 
  title, 
  children,
  icon 
}) => {
  const typeClasses = {
    info: 'bg-blue-500/10 border-blue-500/20 text-blue-500',
    success: 'bg-neon-green/10 border-neon-green/20 text-neon-green',
    warning: 'bg-amber-500/10 border-amber-500/20 text-amber-500',
    error: 'bg-red-500/10 border-red-500/20 text-red-500'
  };
  
  const defaultIcons = {
    info: <Info size={14} />,
    success: <Check size={14} />,
    warning: <AlertTriangle size={14} />,
    error: <AlertTriangle size={14} />
  };
  
  return (
    <div className={`p-3 rounded-xl border ${typeClasses[type]}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon || defaultIcons[type]}
        {title && <span className="text-[10px] font-bold">{title}</span>}
      </div>
      <div className="text-[10px] opacity-80">{children}</div>
    </div>
  );
};

/**
 * ============================================
 * DIVIDER
 * ============================================
 */

interface DividerProps {
  className?: string;
}

export const Divider: React.FC<DividerProps> = ({ className = '' }) => (
  <div className={`h-px bg-border mx-4 opacity-50 ${className}`} />
);

/**
 * ============================================
 * FULL SCREEN VIEW WRAPPER
 * ============================================
 */

interface ViewWrapperProps {
  title: string;
  onBack?: () => void;
  actions?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const ViewWrapper: React.FC<ViewWrapperProps> = ({
  title,
  onBack,
  actions,
  children,
  footer
}) => (
  <motion.div 
    initial={{ opacity: 0, x: 50 }} 
    animate={{ opacity: 1, x: 0 }} 
    exit={{ opacity: 0, x: 50 }}
    className="absolute inset-0 z-50 flex flex-col bg-background"
  >
    <div className="px-5 pt-6 pb-4 border-b border-border flex items-center justify-between">
      <div className="flex items-center gap-4">
        {onBack && (
          <button 
            onClick={onBack} 
            className="p-2 -ml-2 rounded-full hover:bg-surface transition-colors glass-button"
          >
            <ArrowLeft size={24} className="text-primary" />
          </button>
        )}
        <h2 className="text-xl font-bold tracking-wide text-primary">{title}</h2>
      </div>
      {actions}
    </div>
    
    <div className="flex-1 overflow-y-auto px-5 py-6">
      {children}
    </div>
    
    {footer && (
      <div className="px-5 py-4 border-t border-border">
        {footer}
      </div>
    )}
  </motion.div>
);

/**
 * ============================================
 * NAVIGATION BUTTON (Bottom Nav)
 * ============================================
 */

interface NavButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

export const NavButton: React.FC<NavButtonProps> = ({ 
  active, 
  onClick, 
  icon, 
  label 
}) => (
  <button 
    onClick={onClick}
    className="flex flex-col items-center gap-1 p-2 transition-all duration-300 w-1/4"
  >
    <div className={`
      w-16 h-8 rounded-xl flex items-center justify-center transition-all duration-300
      ${active ? 'bg-neon-green shadow-[0_0_15px_rgba(var(--accent-rgb),0.4)]' : 'bg-transparent'}
    `}>
      {React.cloneElement(icon as React.ReactElement<any>, { 
        size: 20, 
        className: active ? 'text-black' : 'text-muted',
        strokeWidth: active ? 2.5 : 2
      })}
    </div>
    <span className={`text-[10px] font-medium tracking-wide ${active ? 'text-neon-green' : 'text-muted'}`}>
      {label}
    </span>
  </button>
);
