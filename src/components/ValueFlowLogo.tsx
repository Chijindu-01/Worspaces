import React from 'react';

interface ValueFlowLogoProps {
  className?: string;
  iconOnly?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'custom';
  customSizeClass?: string;
  variant?: 'color' | 'light' | 'dark';
}

export const ValueFlowLogo: React.FC<ValueFlowLogoProps> = ({
  className = '',
  iconOnly = false,
  size = 'md',
  customSizeClass = '',
  variant = 'color',
}) => {
  // Determine color variables based on variant and the exact brand guidelines
  const textColor = variant === 'light' ? 'text-white' : variant === 'dark' ? 'text-slate-100' : 'text-slate-900 dark:text-white';

  if (iconOnly) {
    return null;
  }

  return (
    <div className={`flex items-center select-none ${className}`} id="valueflow-brand-identity">
      <span 
        className={`font-black tracking-normal uppercase font-display ${textColor} ${
          size === 'xs' ? 'text-xs' :
          size === 'sm' ? 'text-lg md:text-xl' :
          size === 'md' ? 'text-2xl' :
          size === 'lg' ? 'text-3.5xl md:text-4.5xl' :
          size === 'xl' ? 'text-5xl md:text-6xl' : ''
        }`}
        style={{ letterSpacing: '-0.02em', fontFamily: '"Orbitron", sans-serif' }}
        id="valueflow-text-heading"
      >
        VFT WORKSPACE
      </span>
    </div>
  );
};
