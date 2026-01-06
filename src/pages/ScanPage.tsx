import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import type { Mode, PersonaAnalysisResult } from '../types';
import { CameraCapture } from '../components/CameraCapture';
import { Logo } from '../components/Logo';
import { BottomNav } from '../components/BottomNav';
import { SettingsMenu } from '../components/SettingsMenu';
import { ShareCard } from '../components/ShareCard';
import { useAuth } from '../hooks/useAuth';
import { Sparkles, Lock, Share2, ScanEye, Flame, Flower2, ChevronsDown } from 'lucide-react';
import { shareOutfit } from '../lib/share';

const MAX_FREE_SCANS = 3;

interface LocationState {
  image?: string;
  result?: PersonaAnalysisResult[];
  id?: string;
  language?: string;
}

export const ScanPage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LocationState | null;
  const { user, session } = useAuth();
  const shareCardRef = useRef<HTMLDivElement>(null);
  
  const [image, setImage] = useState<string | null>(locationState?.image || null);
  const [occasion, setOccasion] = useState<string>('casual');
  const [isLoading, setIsLoading] = useState(false);
  const [personaResults, setPersonaResults] = useState<PersonaAnalysisResult[] | null>(locationState?.result || null);
  const [selectedPersona, setSelectedPersona] = useState<Mode>('editor');
  const [personaDropdownOpen, setPersonaDropdownOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeHighlight, setActiveHighlight] = useState<number | null>(null);
  const [loadingCoords, setLoadingCoords] = useState<Set<number>>(new Set());
  const [resultLanguage, setResultLanguage] = useState<string>(locationState?.language || i18n.language);
  const [currentScanId, setCurrentScanId] = useState<string | null>(locationState?.id || null);
  const [isSharing, setIsSharing] = useState(false);
  
  const [scanCount, setScanCount] = useState<number>(0);

  useEffect(() => {
    const saved = localStorage.getItem('outfit_check_guest_scans');
    setScanCount(saved ? parseInt(saved, 10) : 0);
  }, []);

  useEffect(() => {
    if (!location.state) {
      setImage(null);
      setPersonaResults(null);
    }
  }, [location.state]);

  const handleCapture = (base64: string) => {
    setImage(base64);
    setError(null);
  };

  const handleCaptureError = (message: string) => {
    if (message) setImage(null);
    setError(message || null);
  };

  const handlePersonaSelect = (persona: Mode) => {
    setSelectedPersona(persona);
    setActiveHighlight(null);
    setLoadingCoords(new Set());
    setPersonaDropdownOpen(false);
  };

  const loadHighlightCoords = async (persona: Mode, highlightIndex: number) => {
    if (!image || !personaResults) return;

    setLoadingCoords(prev => new Set(prev).add(highlightIndex));

    try {
      const headers = session ? { Authorization: `Bearer ${session.access_token}` } : {};
      const response = await axios.post('/.netlify/functions/analyze', {
        image,
        language: i18n.language,
        occasion,
        persona,
        highlight_index: highlightIndex
      }, { headers });

      const coords = response.data.point as [number, number];

      setPersonaResults(prev => {
        if (!prev) return null;
        return prev.map(p =>
          p.persona === persona
            ? {
                ...p,
                highlights: p.highlights.map((h, i) =>
                  i === highlightIndex ? { ...h, point: coords } : h
                )
              }
            : p
        );
      });
    } catch (err) {
      console.error('Failed to load coordinates:', err);
    } finally {
      setLoadingCoords(prev => {
        const next = new Set(prev);
        next.delete(highlightIndex);
        return next;
      });
    }
  };

  const handleAnalyze = async () => {
    if (!image) return;
    
    if (!user && scanCount >= MAX_FREE_SCANS) {
      setError(t('limit_reached_signup', 'You used your free scans! Sign up to continue.'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const currentLang = i18n.language;
      const headers = session ? { Authorization: `Bearer ${session.access_token}` } : {};
      const response = await axios.post('/.netlify/functions/analyze', {
        image,
        language: currentLang,
        occasion
      }, { headers });

      if (!user) {
        const newCount = scanCount + 1;
        setScanCount(newCount);
        localStorage.setItem('outfit_check_guest_scans', newCount.toString());
      }

      const results = response.data.results as PersonaAnalysisResult[];
      const scanId = response.data.id;
      
      setCurrentScanId(scanId);
      setResultLanguage(currentLang);
      setPersonaResults(results);
      navigate('/scan', { state: { result: results, image, id: scanId, language: currentLang }, replace: true });

      const best = results.length > 0
        ? results.reduce<PersonaAnalysisResult | null>((bestSoFar, current) => {
            if (!bestSoFar || current.score > bestSoFar.score) {
              return current;
            }
            return bestSoFar;
          }, results[0])
        : null;
      if (best) {
        setSelectedPersona(best.persona);
      }
      setActiveHighlight(null);
    } catch (err) {
      console.error(err);
      const message = axios.isAxiosError(err) && err.response?.data?.error
        ? err.response.data.error
        : t('analysis_error');
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    if (!shareCardRef.current || !displayResult) return;

    await shareOutfit({
      element: shareCardRef.current,
      t,
      score: displayResult.score,
      scanId: currentScanId || undefined,
      language: resultLanguage,
      onLoading: setIsSharing
    });
  };

  const occasionOptions = ['casual', 'work', 'date'];

  const displayResult = personaResults?.find((res) => res.persona === selectedPersona) ?? personaResults?.[0] ?? null;

  if (personaResults && displayResult) {
    return (
      <div className="flex h-dvh flex-col bg-[#0a428d] text-white font-sans overflow-hidden relative">
        {image && (
          <ShareCard 
            ref={shareCardRef}
            image={image}
            score={displayResult.score}
            title={displayResult.title}
            critique={displayResult.critique}
            highlights={displayResult.highlights}
          />
        )}

        <div className="flex-1 overflow-y-auto p-6 pb-24">
          <header className="relative mb-8 shrink-0 flex items-center justify-center z-20 min-h-[48px]">
            {/* Centered Persona Selector */}
            <div className="relative flex flex-col items-center gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">{t('persona_label')}</span>
              <button
                type="button"
                onClick={() => setPersonaDropdownOpen((open) => !open)}
                className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-black uppercase tracking-wide text-white shadow-sm transition hover:bg-white/10"
              >
                <span className="flex items-center gap-2.5">
                  {(() => {
                    const Icon = selectedPersona === 'editor'
                      ? ScanEye
                      : selectedPersona === 'hypebeast'
                        ? Flame
                        : Flower2;
                    return <Icon size={18} />;
                  })()}
                  <span className="text-xs font-black uppercase tracking-[0.2em]">
                    {t(`mode_${selectedPersona}`)}
                  </span>
                </span>
                <ChevronsDown size={16} className="opacity-50" />
              </button>

              {personaDropdownOpen && (
                <div className="absolute top-full mt-2 w-56 bg-[#0a428d] border border-white/20 rounded-2xl shadow-2xl overflow-hidden z-50 backdrop-blur-md">
                  {(['editor', 'hypebeast', 'boho'] as Mode[]).map((persona) => {
                    const Icon = persona === 'editor'
                      ? ScanEye
                      : persona === 'hypebeast'
                        ? Flame
                        : Flower2;
                    return (
                      <button
                        key={persona}
                        type="button"
                        onClick={() => handlePersonaSelect(persona)}
                        className={`flex w-full items-center gap-3 px-5 py-4 text-left text-xs font-black uppercase tracking-widest text-white hover:bg-white/10 transition ${persona === 'boho' ? '' : 'border-b border-white/5'}`}
                      >
                        <Icon size={18} />
                        {t(`mode_${persona}`)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right-aligned Share Button */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2">
              <button 
                onClick={handleShare}
                className="p-2.5 bg-white/10 rounded-full hover:bg-white/20 transition active:scale-95"
                title={t('share', 'Share')}
              >
                <Share2 size={20} />
              </button>
            </div>
          </header>

          <main className="flex flex-col gap-4 max-w-lg mx-auto w-full">
            <div className="relative aspect-[3/4] w-3/4 mx-auto max-h-[40vh] overflow-hidden rounded-2xl border-4 border-blue-400/40 shadow-xl shrink-0">
              <img src={image!} alt="Outfit" className="h-full w-full object-cover" />
              
              {/* Visual Highlights Overlay */}
              {displayResult.highlights.map((h, i) => {
                const [ymin, xmin, ymax, xmax] = h.box_2d;
                const top = ymin / 10;
                const left = xmin / 10;
                const width = (xmax - xmin) / 10;
                const height = (ymax - ymin) / 10;
                const isActive = activeHighlight === null || activeHighlight === i;
                
                return (
                  <div
                    key={i}
                    className={`absolute border-2 rounded-lg transition-all duration-500 
                      ${h.type === 'good' ? 'border-emerald-400 bg-emerald-400/10' : 'border-rose-400 bg-rose-400/10'}
                      ${isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
                    style={{
                      top: `${top}%`,
                      left: `${left}%`,
                      width: `${width}%`,
                      height: `${height}%`,
                    }}
                  >
                    <div className={`absolute -top-6 left-0 whitespace-nowrap rounded px-1.5 py-0.5 text-[8px] font-black uppercase tracking-tighter text-white
                      ${h.type === 'good' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                      {h.label}
                    </div>
                  </div>
                );
              })}

              <div className="absolute bottom-2 right-2 flex items-center gap-2 rounded-lg bg-black/60 px-2 py-1 backdrop-blur-md border border-white/10">
                <span className="text-lg font-black">{displayResult.score}/10</span>
              </div>
            </div>

            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <h2 className="text-xl font-black tracking-tight text-center">{displayResult.title}</h2>

              <div className="bg-white/5 rounded-2xl p-4 border border-white/10 shadow-inner">
                <p className="text-sm leading-relaxed opacity-90 text-center italic">"{displayResult.critique}"</p>
              </div>

              {/* Highlights List */}
              <div className="grid gap-2 mt-2">
                {displayResult.highlights.map((h, i) => (
                  <button 
                    key={i} 
                    onClick={() => {
                      setActiveHighlight(activeHighlight === i ? null : i);
                      if (!h.point && !loadingCoords.has(i)) {
                        loadHighlightCoords(selectedPersona, i);
                      }
                    }}
                    className={`flex items-center gap-3 rounded-xl p-2.5 border transition-all text-left
                      ${activeHighlight === i 
                        ? 'bg-white/20 border-white shadow-lg scale-[1.01]' 
                        : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                  >
                    <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${h.type === 'good' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-rose-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]'}`} />
                    <span className="text-xs font-bold opacity-90">{h.label}</span>
                  </button>
                ))}
              </div>

              <div className="rounded-xl bg-white/10 p-4 border border-white/20 shadow-lg mt-2">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles size={14} className="text-amber-300" />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-90">{t('improvement_tip')}</p>
                </div>
                <p className="text-sm font-medium">{displayResult.improvement_tip}</p>
              </div>

              <button
                onClick={() => {
                  setPersonaResults(null);
                  setImage(null);
                  setActiveHighlight(null);
                  setSelectedPersona('editor');
                  navigate('/scan', { replace: true, state: null });
                }}
                className="w-full mt-4 py-3 text-xs font-bold uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity"
              >
                ← {t('another_try')}
              </button>
            </div>
          </main>
        </div>
        
        <BottomNav />
      </div>
    );
  }

  const isLimitReached = !user && scanCount >= MAX_FREE_SCANS;

  return (
    <div className="flex h-dvh flex-col bg-[#0a428d] text-white font-sans overflow-hidden">
      {(isLoading || isSharing) && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <Sparkles className="h-12 w-12 animate-spin text-white mb-4" />
          <p className="text-xl font-black uppercase tracking-widest">
            {isLoading ? t('analyzing') : t('generating_share', 'Preparing Outfit...')}
          </p>
        </div>
      )}

      <div className="flex-1 flex flex-col p-6 pb-24 min-h-0">
        <header className="relative mb-6 text-center shrink-0 flex items-center justify-between z-20">
          <div className="w-10" /> 
          <Logo size="md" />
          <SettingsMenu />
        </header>

        <main className="flex flex-1 flex-col gap-4 max-w-lg mx-auto w-full min-h-0">
          <div className="relative w-full flex-1 min-h-0 mx-auto">
            <CameraCapture onCapture={handleCapture} onError={handleCaptureError} />
          </div>

          <div className="space-y-4 shrink-0 pb-2">
            <div className="flex gap-2">
              {occasionOptions.map((occ) => (
                <button
                  key={occ}
                  onClick={() => setOccasion(occ)}
                  className={`flex-1 rounded-xl border-2 py-2 text-xs font-black uppercase tracking-widest transition
                    ${occasion === occ
                      ? 'border-white bg-white text-[#0a428d]'
                      : 'border-white/20 bg-white/5 text-white hover:border-white/40'}`}
                >
                  {t(`occasion_${occ}`)}
                </button>
              ))}
            </div>
            
            {isLimitReached ? (
              <button
                onClick={() => navigate('/login')}
                className="w-full rounded-2xl bg-gradient-to-r from-amber-300 to-orange-400 py-4 text-xl font-black uppercase tracking-widest text-[#0a428d] shadow-2xl transition hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3"
              >
                <Lock size={20} />
                {t('login_to_continue_short', 'Sign Up (Free!)')}
              </button>
            ) : (
              <button
                onClick={handleAnalyze}
                disabled={!image || isLoading}
                className="w-full rounded-2xl bg-white py-4 text-xl font-black uppercase tracking-widest text-[#0a428d] shadow-2xl transition enabled:hover:scale-[1.02] enabled:active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {t('judgment')}
              </button>
            )}

            {error && (
              <p className="text-center text-xs font-bold text-rose-300 animate-pulse">{error}</p>
            )}
          </div>
        </main>
      </div>

      <BottomNav />
    </div>
  );
};
