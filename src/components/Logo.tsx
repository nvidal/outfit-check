import React from 'react';
import { Sparkles } from 'lucide-react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 'md' }) => {
  const sizeClasses = {
    sm: 'text-xl',
    md: 'text-3xl',
    lg: 'text-5xl'
  };

  const iconSizes = {
    sm: 20,
    md: 32,
    lg: 48
  };

  return (
    <div className={`font-black tracking-tighter title-font inline-flex items-center justify-center gap-3 ${sizeClasses[size]} ${className}`}>
      <Sparkles size={iconSizes[size]} style={{ color: '#fcd34d' }} />
      <span>OUTFIT CHECK</span>
    </div>
  );
};
