import { forwardRef } from 'react';
import { Logo } from './Logo';
import { Sparkles } from 'lucide-react';

interface ShareCardProps {
  image: string;
  score: number;
  title: string;
  improvement_tip: string;
}

export const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(({ image, score, title, improvement_tip }, ref) => {
  const brandBlue = '#0a428d';
  const amber300 = '#fcd34d';
  const white = '#ffffff';
  const white20 = 'rgba(255, 255, 255, 0.2)';
  const white10 = 'rgba(255, 255, 255, 0.1)';

  return (
    <div 
      ref={ref}
      className="absolute top-0 left-0 w-[1080px] h-[1920px] flex flex-col p-24 font-sans pointer-events-none opacity-0"
      style={{ 
        transform: 'scale(0.2)', 
        transformOrigin: 'top left', 
        zIndex: -100,
        backgroundColor: brandBlue,
        color: white
      }}
    >
      <header className="flex justify-between items-center mb-16">
        <Logo size="lg" className="scale-[2.5] origin-left" />
        <div 
          className="font-black text-6xl px-8 py-4 rounded-3xl uppercase tracking-widest"
          style={{ backgroundColor: amber300, color: brandBlue }}
        >
          {score}/10
        </div>
      </header>

      <div 
        className="flex-1 relative rounded-[60px] overflow-hidden shadow-2xl mb-16"
        style={{ borderColor: white20, borderWidth: '8px', borderStyle: 'solid' }}
      >
        <img src={image} alt="Outfit" className="w-full h-full object-cover" />
        
        <div 
          className="absolute inset-0"
          style={{ background: `linear-gradient(to top, ${brandBlue}, transparent)` }} 
        />
        
        <div className="absolute bottom-16 left-16 right-16">
          <h2 className="text-8xl font-black uppercase tracking-tight leading-none mb-8 drop-shadow-lg">
            {title}
          </h2>
        </div>
      </div>

      <div 
        className="p-12 rounded-[50px] flex items-start gap-8"
        style={{ 
          backgroundColor: white10, 
          borderColor: white20, 
          borderWidth: '4px', 
          borderStyle: 'solid' 
        }}
      >
        <Sparkles size={64} style={{ color: amber300, marginTop: '0.5rem', flexShrink: 0 }} />
        <div>
          <p className="text-4xl font-bold uppercase tracking-widest opacity-70 mb-4">Improvement Tip</p>
          <p className="text-5xl font-medium leading-tight">{improvement_tip}</p>
        </div>
      </div>

      <footer className="mt-16 text-center text-4xl font-medium opacity-50 uppercase tracking-[0.2em]">
        outfit-check.app
      </footer>
    </div>
  );
});