import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 'md' }) => {
  const heights = {
    sm: 'h-6',
    md: 'h-8',
    lg: 'h-12',
    xl: 'h-20'
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
    xl: 'text-6xl'
  };

  return (
    <div className={`inline-flex items-center justify-center gap-3 whitespace-nowrap font-black tracking-tighter title-font ${textSizes[size]} ${className}`}>
      <img 
        src="/logo.svg" 
        alt="Logo" 
        className={`${heights[size]} w-auto object-contain`} 
      />
      <span>OUTFIT CHECK</span>
    </div>
  );
};
