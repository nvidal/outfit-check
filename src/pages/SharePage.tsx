import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Logo } from '../components/Logo';
import { Sparkles, ScanEye, Flame, Flower2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const SharePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchScan = async () => {
      try {
        const response = await axios.post('/.netlify/functions/get-scan', { id });
        setData(response.data);
      } catch (err) {
        console.error(err);
        setError('Outfit check not found.');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchScan();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-dvh flex-col bg-[#0a428d] text-white p-6 font-sans items-center justify-center">
        <Sparkles className="animate-spin mb-4" />
        <p className="uppercase tracking-widest text-sm">Loading Outfit...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-dvh flex-col bg-[#0a428d] text-white p-6 font-sans items-center justify-center text-center gap-4">
        <Logo size="lg" />
        <p className="text-white/60">{error || 'Something went wrong.'}</p>
        <button 
          onClick={() => navigate('/')}
          className="bg-white text-[#0a428d] px-6 py-3 rounded-xl font-bold uppercase tracking-wide"
        >
          Check your own outfit
        </button>
      </div>
    );
  }

  // Use the best result (highest score) or default to first
  const result = data.ai_results.reduce((prev: any, current: any) => 
    (prev.score > current.score) ? prev : current
  , data.ai_results[0]);

  return (
    <div className="flex h-dvh flex-col bg-[#0a428d] text-white p-6 font-sans overflow-y-auto">
      <header className="relative mb-6 text-center shrink-0">
        <Logo size="md" />
      </header>

      <main className="flex flex-1 flex-col gap-6 max-w-lg mx-auto w-full pb-8">
        <div className="relative aspect-3/4 w-full max-h-[60vh] mx-auto overflow-hidden rounded-3xl border-4 border-blue-400/40 shadow-2xl shrink-0">
          <img src={data.image_url} alt="Outfit" className="h-full w-full object-cover" />
          
          <div className="absolute bottom-3 right-3 flex items-center gap-2 rounded-xl bg-black/60 px-3 py-1 backdrop-blur-md border border-white/10">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-70">{t('score')}</span>
            <span className="text-xl font-black">{result.score}/10</span>
          </div>
        </div>

        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex items-center gap-2 text-amber-300">
            {result.persona === 'editor' && <ScanEye size={20} />}
            {result.persona === 'hypebeast' && <Flame size={20} />}
            {result.persona === 'boho' && <Flower2 size={20} />}
            <span className="text-xs font-black uppercase tracking-[0.2em]">{t(`mode_${result.persona}`)}</span>
          </div>

          <h2 className="text-2xl font-black tracking-tight">{result.title}</h2>
          <p className="text-lg leading-snug opacity-90">{result.critique}</p>

          <div className="rounded-2xl bg-white/10 p-5 border border-white/20 shadow-lg">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={16} className="text-amber-300" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-90">{t('improvement_tip')}</p>
            </div>
            <p className="font-medium">{result.improvement_tip}</p>
          </div>
        </div>

        <button 
          onClick={() => navigate('/')}
          className="w-full mt-4 rounded-2xl bg-white py-4 text-xl font-black uppercase tracking-widest text-[#0a428d] shadow-2xl transition hover:scale-[1.02] active:scale-95"
        >
          {t('landing_cta_primary', 'Check your outfit now!')}
        </button>
      </main>
    </div>
  );
};
