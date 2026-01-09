import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Camera, Shirt, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#0a428d]/95 backdrop-blur-md border-t border-white/10 pb-safe pt-2 px-6 z-50">
      <div className="flex justify-around items-center max-w-md mx-auto h-16">
        <button
          onClick={() => navigate('/scan')}
          className={`flex flex-col items-center gap-1 transition ${isActive('/scan') ? 'text-white opacity-100' : 'text-white/50 hover:text-white/80'}`}
        >
          <Camera size={24} strokeWidth={isActive('/scan') ? 3 : 2} />
          <span className="text-[10px] font-black uppercase tracking-widest">{t('nav_scan', 'Scan')}</span>
        </button>

        <button
          onClick={() => navigate('/recommend')}
          className={`flex flex-col items-center gap-1 transition ${isActive('/recommend') ? 'text-white opacity-100' : 'text-white/50 hover:text-white/80'}`}
        >
          <Sparkles size={24} strokeWidth={isActive('/recommend') ? 3 : 2} />
          <span className="text-[10px] font-black uppercase tracking-widest">{t('nav_style', 'Style')}</span>
        </button>

        <button
          onClick={() => navigate('/history')}
          className={`flex flex-col items-center gap-1 transition ${isActive('/history') ? 'text-white opacity-100' : 'text-white/50 hover:text-white/80'}`}
        >
          <Shirt size={24} strokeWidth={isActive('/history') ? 3 : 2} />
          <span className="text-[10px] font-black uppercase tracking-widest">{t('nav_closet', 'Closet')}</span>
        </button>
      </div>
    </div>
  );
};
