import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { useTranslation } from 'react-i18next';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="flex h-dvh flex-col bg-[#0a428d] text-white p-6 font-sans items-center justify-center relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-amber-300/10 rounded-full blur-3xl pointer-events-none" />

      <div className="z-10 flex flex-col items-center gap-12 w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="text-center space-y-4">
          <Logo size="lg" />
          <p className="text-lg opacity-80 font-medium max-w-[80%] mx-auto">
            {t('landing_subtitle', 'Your AI-powered fashion coach. Instant feedback, brutal honesty.')}
          </p>
        </div>

        <div className="w-full space-y-4">
          <button
            onClick={() => navigate('/scan')}
            className="w-full rounded-2xl bg-white py-4 text-xl font-black uppercase tracking-widest text-[#0a428d] shadow-[0_0_40px_rgba(255,255,255,0.3)] transition hover:scale-[1.02] active:scale-95"
          >
            {t('landing_cta_primary', 'Check your outfit now!')}
          </button>
          
          <button
            onClick={() => navigate('/login')}
            className="block w-full max-w-[50%] mx-auto rounded-xl border border-white/20 bg-white/5 py-3 text-xs font-bold uppercase tracking-widest text-white/80 backdrop-blur-sm transition hover:bg-white/10 active:scale-95"
          >
            {t('landing_cta_login', 'Login')}
          </button>
        </div>
      </div>
    </div>
  );
};
