import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Logo } from '../components/Logo';
import { Sparkles, ScanEye, Flame, Flower2, ChevronsDown, Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { OutfitImage } from '../components/OutfitImage';
import { ShareCard } from '../components/ShareCard';
import type { HistoryItem, Mode, StyleHistoryItem, ScanHistoryItem } from '../types';

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
  
  const shareCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchScan = async () => {
      try {
        const response = await axios.post('/.netlify/functions/get-scan', { id });
        const scanData = response.data as HistoryItem;
        setData(scanData);
        
        if (scanData.type === 'scan') {
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

  // --- STYLE RENDER ---
  if (data.type === 'style') {
      const styleItem = data as StyleHistoryItem;
      const result = styleItem.data;
      const imageUrl = styleItem.generated_image_url || styleItem.image_url;

      return (
        <div className="flex h-dvh flex-col bg-[#0a428d] text-white font-sans overflow-hidden">
          <ShareCard 
            ref={shareCardRef}
            mode="style"
            image={imageUrl}
            items={result.items}
            title={t('style_button')}
          />

          <div className="flex-1 flex flex-col overflow-y-auto p-6 pb-8">
            <header className="relative mb-6 text-center shrink-0 flex items-center justify-center z-20 max-w-lg mx-auto w-full">
              <Logo size="md" />
            </header>

            <main className="flex flex-col gap-4 max-w-lg mx-auto w-full">
              <div className="animate-in slide-in-from-bottom duration-500 pb-4">
                <div className="text-center mb-6">
                  <h2 className="text-3xl font-black tracking-tight text-white mb-2">{result.outfit_name}</h2>
                  <p className="text-sm text-white/80 italic">"{result.reasoning}"</p>
                </div>

                <div className="rounded-2xl overflow-hidden mb-6 shadow-xl relative animate-in fade-in duration-700">
                    <img src={imageUrl} className="w-full h-auto object-cover" alt="Generated Outfit" />
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-5 pt-20">
                      <h3 className="text-xs font-black uppercase tracking-widest text-amber-300 mb-2 drop-shadow-md">{t('the_look')}</h3>
                      <ul className="space-y-1.5">
                        {result.items.map((item, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <div className="h-1 w-1 rounded-full bg-white mt-1.5 shrink-0 shadow-[0_0_5px_white]" />
                            <span className="text-xs font-bold text-white leading-relaxed drop-shadow-md">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                </div>

                {((result.dos?.length ?? 0) > 0 || (result.donts?.length ?? 0) > 0) && (
                  <div className="grid grid-cols-2 gap-3 mb-6">
                      {result.dos && result.dos.length > 0 && (
                        <div className="bg-emerald-500/10 rounded-2xl p-4 shadow-lg">
                          <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-300 mb-3">
                            <Check size={12} strokeWidth={4} /> {t('dos') || 'DOS'}
                          </h3>
                          <ul className="space-y-2">
                            {result.dos.map((item, i) => (
                              <li key={i} className="text-xs text-emerald-100/90 leading-tight">• {item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {result.donts && result.donts.length > 0 && (
                        <div className="bg-rose-500/10 rounded-2xl p-4 shadow-lg">
                          <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-rose-300 mb-3">
                            <X size={12} strokeWidth={4} /> {t('donts') || 'DONTS'}
                          </h3>
                          <ul className="space-y-2">
                            {result.donts.map((item, i) => (
                              <li key={i} className="text-xs text-rose-100/90 leading-tight">• {item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                  </div>
                )}

                <button 
                  onClick={() => navigate('/')}
                  className="w-full mt-4 rounded-2xl bg-white py-4 text-xl font-black uppercase tracking-widest text-[#0a428d] shadow-2xl transition hover:scale-[1.02] active:scale-95"
                >
                  {t('landing_cta_primary', 'Check your outfit now!')}
                </button>
              </div>
            </main>
          </div>
        </div>
      );
  }

  // --- SCAN RENDER ---
  const scanItem = data as ScanHistoryItem;
  const result = scanItem.data.find(r => r.persona === selectedPersona) || scanItem.data[0];

  const handlePersonaSelect = (persona: Mode) => {
    setSelectedPersona(persona);
    setActiveHighlight(null);
    setPersonaDropdownOpen(false);
  };

  return (
    <div className="flex h-dvh flex-col bg-[#0a428d] text-white p-6 font-sans overflow-y-auto">
      <ShareCard 
        ref={shareCardRef}
        image={scanItem.image_url}
        score={result.score}
        highlights={result.highlights}
      />

      <header className="relative mb-8 flex flex-col items-center gap-4 z-50 max-w-lg mx-auto w-full">
        <Logo size="md" />

        <div className="relative flex flex-col items-center gap-1.5">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">{t('persona_label')}</span>
          <button
            onClick={() => setPersonaDropdownOpen(!personaDropdownOpen)}
            className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-black uppercase tracking-wide text-white shadow-sm transition hover:bg-white/10"
          >
            <span className="flex items-center gap-2.5">
              {selectedPersona === 'editor' && <ScanEye size={18} className="text-amber-300" />}
              {selectedPersona === 'hypebeast' && <Flame size={18} className="text-amber-300" />}
              {selectedPersona === 'boho' && <Flower2 size={18} className="text-amber-300" />}
              <span className="text-xs font-black uppercase tracking-[0.2em]">
                {t(`mode_${selectedPersona}`)}
              </span>
            </span>
            <Check size={16} className="opacity-0 w-0" /> {/* Hidden Check to maintain spacing logic if needed, actually just keep icon only */}
            <ChevronsDown size={16} className="opacity-50" />
          </button>

          {personaDropdownOpen && (
            <div className="absolute top-full mt-2 w-56 bg-[#0a428d] border border-white/20 rounded-2xl shadow-2xl overflow-hidden z-[60] backdrop-blur-md">
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
      </header>

      <main className="flex flex-1 flex-col gap-6 max-w-lg mx-auto w-full pb-8">
        <OutfitImage 
          image={scanItem.image_url} 
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
          
          <div className="bg-white/10 rounded-2xl p-6 shadow-xl">
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

          <div className="rounded-2xl bg-amber-400/15 p-6 shadow-lg">
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
