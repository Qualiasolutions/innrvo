import React, { memo } from 'react';

type GlassCardVariant = 'default' | 'elevated' | 'bordered' | 'magic';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
  variant?: GlassCardVariant;
}

const GlassCard: React.FC<GlassCardProps> = memo(({
  children,
  className = "",
  onClick,
  hover = true,
  variant = 'default'
}) => {
  const variantStyles: Record<GlassCardVariant, string> = {
    default: 'glass',
    elevated: 'glass-elevated',
    bordered: 'bg-transparent border border-white/10 backdrop-blur-xl',
    magic: 'glass-elevated border-gradient-animated'
  };

  return (
    <div
      onClick={onClick}
      className={`
        ${variantStyles[variant]}
        rounded-3xl p-6 transition-all duration-300 ease-out
        ${hover ? 'hover:scale-[1.01] hover:bg-white/5 cursor-pointer hover:border-cyan-500/30 hover-lift btn-press' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
});

GlassCard.displayName = 'GlassCard';

export default GlassCard;
