import React, { memo } from 'react';

type GlassCardVariant = 'default' | 'elevated' | 'bordered' | 'magic';
type GlowType = 'none' | 'subtle' | 'hover' | 'pulse' | 'breathe' | 'border' | 'shimmer' | 'gradient';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
  glow?: boolean | GlowType;
  variant?: GlassCardVariant;
}

const GlassCard: React.FC<GlassCardProps> = memo(({
  children,
  className = "",
  onClick,
  hover = true,
  glow = false,
  variant = 'default'
}) => {
  const variantStyles: Record<GlassCardVariant, string> = {
    default: 'glass glow-hover',
    elevated: 'glass-elevated glow-ambient',
    bordered: 'bg-transparent border border-white/10 backdrop-blur-xl glow-hover',
    magic: 'glass-elevated glow-gradient-border glow-shimmer'
  };

  // Determine glow class based on type
  const getGlowClass = () => {
    if (glow === false || glow === 'none') return '';
    if (glow === true || glow === 'subtle') return 'glow-ambient';
    if (glow === 'hover') return 'glow-hover';
    if (glow === 'pulse') return 'glow-pulse';
    if (glow === 'breathe') return 'glow-breathe';
    if (glow === 'border') return 'glow-border';
    if (glow === 'shimmer') return 'glow-shimmer';
    if (glow === 'gradient') return 'glow-gradient-border';
    return '';
  };

  return (
    <div
      onClick={onClick}
      className={`
        ${variantStyles[variant]}
        rounded-3xl p-6 transition-all duration-500 ease-out
        ${hover ? 'hover:scale-[1.02] hover:bg-white/5 cursor-pointer hover:shadow-2xl hover:shadow-indigo-500/20 hover-lift btn-press' : ''}
        ${getGlowClass()}
        ${className}
      `}
    >
      {children}
    </div>
  );
});

GlassCard.displayName = 'GlassCard';

export default GlassCard;
