import { useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { ModeSelector } from './components/ModeSelector';
import type { Mode } from './components/ModeSelector';
import { CameraCapture } from './components/CameraCapture';
import './i18n';
import { Sparkles } from 'lucide-react';

interface AnalysisResult {
  score: number;
  title: string;
  critique: string;
  improvement_tip: string;
  highlights: {
    type: 'good' | 'bad';
    label: string;
    box_2d: [number, number, number, number];
  }[];
}

function App() {
  const { t, i18n } = useTranslation();
  
  const [mode, setMode] = useState<Mode>('editor');
  const [image, setImage] = useState<string | null>(null);
  const [occasion, setOccasion] = useState<string>('casual');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeHighlight, setActiveHighlight] = useState<number | null>(null);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'es' : 'en';
    i18n.changeLanguage(newLang);
  };

  const handleCapture = (base64: string) => {
    setImage(base64);
    setError(null);
  };

  const handleCaptureError = (message: string) => {
    setImage(null);
    setError(message || null);
  };

  const handleAnalyze = async () => {
    if (!image) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post('/.netlify/functions/analyze', {
        image,
        mode,
        language: i18n.language,
        occasion
      });

      setResult(response.data);
    } catch (err) {
      console.error(err);
      const message = axios.isAxiosError(err) && err.response?.data?.error
        ? err.response.data.error
        : 'Failed to analyze outfit. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const occasionOptions = ['casual', 'work', 'date'];
  const flag = i18n.language === 'en' ? '🇬🇧' : '🇪🇸';

  if (result) {
    return (
      <div className="flex h-screen flex-col bg-[#0a428d] text-white p-6 font-sans overflow-y-auto">
        <header className="relative mb-4 shrink-0 flex items-center justify-between">
          <button
            onClick={() => {
              setResult(null);
              setImage(null);
              setActiveHighlight(null);
            }}
            className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest opacity-70 hover:opacity-100 transition-opacity"
          >
            ← {t('another_try')}
          </button>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">
            {t(`mode_${mode}`)} • {t(`occasion_${occasion}`)}
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-6 max-w-lg mx-auto w-full pb-8">
          <div className="relative aspect-3/4 w-full max-h-[50vh] mx-auto overflow-hidden rounded-3xl border-4 border-white/10 shadow-2xl shrink-0">
            <img src={image!} alt="Outfit" className="h-full w-full object-cover" />
            
            {/* Visual Highlights Overlay */}
            {result.highlights.map((h, i) => {
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

            <div className="absolute bottom-3 right-3 flex items-center gap-2 rounded-xl bg-black/60 px-3 py-1 backdrop-blur-md border border-white/10">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-70">{t('score')}</span>
              <span className="text-xl font-black">{result.score}/10</span>
            </div>
          </div>

          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h2 className="text-2xl font-black tracking-tight">{result.title}</h2>

            <p className="text-lg leading-snug opacity-90">{result.critique}</p>

            {/* Highlights List */}
            <div className="grid gap-2">
              {result.highlights.map((h, i) => (
                <button 
                  key={i} 
                  onClick={() => setActiveHighlight(activeHighlight === i ? null : i)}
                  className={`flex items-center gap-3 rounded-2xl p-3 border transition-all text-left
                    ${activeHighlight === i 
                      ? 'bg-white/20 border-white shadow-lg scale-[1.02]' 
                      : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                >
                  <div className={`h-3 w-3 shrink-0 rounded-full ${h.type === 'good' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-rose-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]'}`} />
                  <span className="text-sm font-bold opacity-90">{h.label}</span>
                </button>
              ))}
            </div>

            <div className="rounded-2xl bg-white/5 p-4 border border-white/10">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50 mb-1">{t('improvement_tip')}</p>
              <p className="font-medium">{result.improvement_tip}</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-[#0a428d] text-white p-6 font-sans overflow-hidden">
      {isLoading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <Sparkles className="h-12 w-12 animate-spin text-white mb-4" />
          <p className="text-xl font-black uppercase tracking-widest">{t('analyzing')}</p>
        </div>
      )}

      <header className="relative mb-6 text-center">
        <h1 className="text-4xl font-black tracking-tighter sm:text-5xl title-font">OUTFIT CHECK</h1>
        <button
          onClick={toggleLanguage}
          className="absolute right-0 top-1/2 -translate-y-1/2 text-2xl transition hover:scale-110 active:scale-90"
          title={i18n.language === 'en' ? 'Switch to Spanish' : 'Cambiar a Inglés'}
        >
          {flag}
        </button>
      </header>

      <main className="flex flex-1 flex-col gap-4 max-w-lg mx-auto w-full">
        <div className="flex-1 min-h-0">
          <CameraCapture onCapture={handleCapture} onError={handleCaptureError} />
        </div>

        <div className="space-y-4">
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

          <ModeSelector selectedMode={mode} onSelectMode={setMode} />

          <button
            onClick={handleAnalyze}
            disabled={!image || isLoading}
            className="w-full rounded-2xl bg-white py-4 text-xl font-black uppercase tracking-widest text-[#0a428d] shadow-2xl transition enabled:hover:scale-[1.02] enabled:active:scale-95 disabled:opacity-30"
          >
            {t('judgment')}
          </button>

          {error && (
            <p className="text-center text-xs font-bold text-rose-300 animate-pulse">{error}</p>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;