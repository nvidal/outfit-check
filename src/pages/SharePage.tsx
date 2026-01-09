import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Logo } from '../components/Logo';
import { Sparkles, ScanEye, Flame, Flower2, ChevronsDown, Share2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { OutfitImage } from '../components/OutfitImage';
import { ShareCard } from '../components/ShareCard';
import { shareOutfit } from '../lib/share';
import type { HistoryItem, Mode, ScanHistoryItem } from '../types';

export const SharePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [data, setData] = useState<HistoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Scan specific state
  const [selectedPersona, setSelectedPersona] = useState<Mode>('editor');
  const [personaDropdownOpen, setPersonaDropdownOpen] = useState(false);
  const [activeHighlight, setActiveHighlight] = useState<number | null>(null);
  
  const [isSharing, setIsSharing] = useState(false);
  const shareCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchScan = async () => {
      try {
        const response = await axios.post('/.netlify/functions/get-scan', { id });
        const scanData = response.data as HistoryItem;
        setData(scanData);
        
        if (scanData.type === 'scan') {
          // Auto-select the best persona initially
          const best = scanData.data.reduce((prev, current) => 
            (prev.score > current.score) ? prev : current
          , scanData.data[0]);
          setSelectedPersona(best.persona);
        }
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

  const handleShare = async () => {
    if (!shareCardRef.current) return;

    if (data.type === 'scan') {
        const result = (data as ScanHistoryItem).data.find(r => r.persona === selectedPersona);
        if (!result) return;
        await shareOutfit({
            element: shareCardRef.current,
            t,
            score: result.score,
            scanId: id,
            onLoading: setIsSharing
        });
    } else {
        await shareOutfit({
            element: shareCardRef.current,
            t,
            mode: 'style',
            scanId: id,
            onLoading: setIsSharing
        });
    }
  };

  // --- STYLE RENDER ---
  if (data.type === 'style') {
      const styleData = data.data;
      const imageUrl = data.generated_image_url || data.image_url;

      return (
        <div className="flex h-dvh flex-col bg-[#0a428d] text-white p-6 font-sans overflow-y-auto">
          {isSharing && (
            <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
              <Sparkles className="h-12 w-12 animate-spin text-white mb-4" />
              <p className="text-xl font-black uppercase tracking-widest">{t('generating_share', 'Preparing Outfit...')}</p>
            </div>
          )}

          <ShareCard 
            ref={shareCardRef}
            mode="style"
            image={imageUrl}
            items={styleData.items}
            title={t('style_button')}
          />

          <header className="relative mb-6 text-center shrink-0 flex items-center justify-between z-50">
            <div className="w-10" /> {/* Spacer */}
            <Logo size="md" />
            <button 
              onClick={handleShare}
              className="p-2.5 bg-white/10 rounded-full hover:bg-white/20 transition active:scale-95"
              title={t('share', 'Share')}
            >
              <Share2 size={20} />
            </button>
          </header>

          <main className="flex flex-1 flex-col gap-6 max-w-lg mx-auto w-full pb-8">
            <div className="rounded-2xl overflow-hidden shadow-xl border border-white/10 relative group">
                <img src={imageUrl} className="w-full h-auto object-cover max-h-[60vh]" alt="Generated Outfit" />
            </div>

            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="flex items-center gap-2 text-amber-300">
                <Sparkles size={20} />
                <span className="text-xs font-black uppercase tracking-[0.2em]">{t('style_button')}</span>
              </div>

              <h2 className="text-3xl font-black tracking-tight text-white">{styleData.outfit_name}</h2>
              
              <div className="bg-white/10 rounded-2xl p-6 border border-white/20 shadow-xl">
                <p className="text-xl leading-relaxed text-white italic font-medium">"{styleData.reasoning}"</p>
              </div>

              <div className="grid gap-2 mt-2">
                {styleData.items.map((item, i) => (
                  <div 
                    key={i} 
                    className="flex items-center gap-3 rounded-xl p-3 border border-white/10 bg-white/5"
                  >
                    <div className="h-2 w-2 shrink-0 rounded-full bg-amber-300" />
                    <span className="text-sm font-bold text-white">{item}</span>
                  </div>
                ))}
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
  }

  // --- SCAN RENDER (Existing Logic) ---
  const result = data.data.find(r => r.persona === selectedPersona) || data.data[0];

  const handlePersonaSelect = (persona: Mode) => {
    setSelectedPersona(persona);
    setActiveHighlight(null);
    setPersonaDropdownOpen(false);
  };

  return (
    <div className="flex h-dvh flex-col bg-[#0a428d] text-white p-6 font-sans overflow-y-auto">
      {(isSharing) && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <Sparkles className="h-12 w-12 animate-spin text-white mb-4" />
          <p className="text-xl font-black uppercase tracking-widest">
            {t('generating_share', 'Preparing Outfit...')}
          </p>
        </div>
      )}

      <ShareCard 
        ref={shareCardRef}
        image={data.image_url}
        score={result.score}
        highlights={result.highlights}
      />

      <header className="relative mb-6 text-center shrink-0 flex items-center justify-between z-50">
        <div className="relative">
          <button
            onClick={() => setPersonaDropdownOpen(!personaDropdownOpen)}
            className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition flex items-center gap-1"
          >
            {selectedPersona === 'editor' && <ScanEye size={20} className="text-amber-300" />}
            {selectedPersona === 'hypebeast' && <Flame size={20} className="text-amber-300" />}
            {selectedPersona === 'boho' && <Flower2 size={20} className="text-amber-300" />}
            <ChevronsDown size={14} className="opacity-50 text-white" />
          </button>

          {personaDropdownOpen && (
            <div className="absolute left-0 mt-2 w-48 bg-[#0a428d] border border-white/20 rounded-2xl shadow-2xl overflow-hidden z-[60] backdrop-blur-md">
              {(['editor', 'hypebeast', 'boho'] as Mode[]).map((persona) => {
                const Icon = persona === 'editor' ? ScanEye : persona === 'hypebeast' ? Flame : Flower2;
                return (
                  <button
                    key={persona}
                    onClick={() => handlePersonaSelect(persona)}
                    className="flex w-full items-center gap-3 px-5 py-4 text-left text-xs font-black uppercase tracking-widest text-white hover:bg-white/10 transition border-b border-white/5 last:border-0"
                  >
                    <Icon size={18} className="text-amber-300" />
                    {t(`mode_${persona}`)}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <Logo size="md" />

        <button 
          onClick={handleShare}
          className="p-2.5 bg-white/10 rounded-full hover:bg-white/20 transition active:scale-95"
          title={t('share', 'Share')}
        >
          <Share2 size={20} />
        </button>
      </header>

      <main className="flex flex-1 flex-col gap-6 max-w-lg mx-auto w-full pb-8">
        <OutfitImage 
          image={data.image_url} 
          highlights={result.highlights}
          activeHighlight={activeHighlight}
          score={result.score}
          showScore={true}
          className="max-h-[60vh]"
        />

        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex items-center gap-2 text-amber-300">
            {result.persona === 'editor' && <ScanEye size={20} />}
            {result.persona === 'hypebeast' && <Flame size={20} />}
            {result.persona === 'boho' && <Flower2 size={20} />}
            <span className="text-xs font-black uppercase tracking-[0.2em]">{t(`mode_${result.persona}`)}</span>
          </div>

          <h2 className="text-3xl font-black tracking-tight text-white">{result.title}</h2>
          
          <div className="bg-white/10 rounded-2xl p-6 border border-white/20 shadow-xl">
            <p className="text-xl leading-relaxed text-white italic font-medium">"{result.critique}"</p>
          </div>

          {/* Highlights List */}
          <div className="grid gap-2 mt-2">
            {result.highlights.map((h, i) => (
              <button 
                key={i} 
                onClick={() => setActiveHighlight(activeHighlight === i ? null : i)}
                className={`flex items-center gap-3 rounded-xl p-3 border transition-all text-left
                  ${activeHighlight === i 
                    ? 'bg-white/30 border-white shadow-lg scale-[1.01]' 
                    : 'bg-white/10 border-white/20 hover:bg-white/15'}`}
              >
                <div className={`h-3 w-3 shrink-0 rounded-full ${h.type === 'good' ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]' : 'bg-rose-400 shadow-[0_0_10px_rgba(248,113,113,0.8)]'}`} />
                <span className="text-sm font-bold text-white">{h.label}</span>
              </button>
            ))}
          </div>

          <div className="rounded-2xl bg-amber-400/15 p-6 border border-amber-400/30 shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={18} className="text-amber-300" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-200">{t('improvement_tip')}</p>
            </div>
            <p className="text-base font-bold text-white leading-snug">{result.improvement_tip}</p>
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