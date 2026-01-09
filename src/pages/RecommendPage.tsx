import { useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { CameraCapture } from '../components/CameraCapture';
import { Logo } from '../components/Logo';
import { BottomNav } from '../components/BottomNav';
import { SettingsMenu } from '../components/SettingsMenu';
import { OutfitImage } from '../components/OutfitImage';
import { Sparkles, Shirt, RotateCcw } from 'lucide-react';

interface RecommendationResult {
  user_analysis: string;
  outfit_name: string;
  items: string[];
  reasoning: string;
  visual_prompt: string;
  image?: string; // Base64 or URL if generated
}

export const RecommendPage = () => {
  const { t, i18n } = useTranslation();
  const [image, setImage] = useState<string | null>(null);
  const [userRequest, setUserRequest] = useState('');
  const [step, setStep] = useState<'capture' | 'details' | 'result'>('capture');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCapture = (base64: string) => {
    setImage(base64);
    setStep('details');
    setError(null);
  };

  const handleCaptureError = (msg: string) => {
    setError(msg);
  };

  const handleAnalyze = async () => {
    if (!image || !userRequest.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post('/.netlify/functions/recommend', {
        image,
        text: userRequest,
        language: i18n.language
      });

      setResult(response.data);
      setStep('result');
    } catch (err) {
      console.error(err);
      setError(t('analysis_error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setImage(null);
    setUserRequest('');
    setResult(null);
    setStep('capture');
    setError(null);
  };

  return (
    <div className="flex h-dvh flex-col bg-[#0a428d] text-white font-sans overflow-hidden">
      {isLoading && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <Sparkles className="h-12 w-12 animate-spin text-white mb-4" />
          <p className="text-xl font-black uppercase tracking-widest">{t('analyzing')}</p>
        </div>
      )}

      <div className="flex-1 flex flex-col p-6 pb-24 min-h-0">
        <header className="relative mb-6 text-center shrink-0 flex items-center justify-between z-20">
          <div className="w-10" />
          <Logo size="md" />
          <SettingsMenu />
        </header>

        <main className="flex flex-1 flex-col gap-4 max-w-lg mx-auto w-full min-h-0">
          
          {step === 'capture' && (
            <>
              <div className="text-center mb-2">
                <h2 className="text-2xl font-black uppercase tracking-tight">Style Me</h2>
                <p className="text-white/60 text-sm">Upload a photo so we can see your vibe.</p>
              </div>
              <div className="relative w-full flex-1 min-h-0 mx-auto">
                <CameraCapture onCapture={handleCapture} onError={handleCaptureError} />
              </div>
            </>
          )}

          {step === 'details' && image && (
            <div className="flex flex-col h-full animate-in slide-in-from-right duration-300">
              <div className="w-32 mx-auto mb-6 shrink-0">
                <OutfitImage image={image} className="border-2 border-white/20" />
              </div>

              <div className="flex-1 flex flex-col gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-black uppercase tracking-widest text-amber-300">
                    Where are you going?
                  </label>
                  <textarea
                    value={userRequest}
                    onChange={(e) => setUserRequest(e.target.value)}
                    placeholder="E.g. Summer wedding in Italy, avoid black..."
                    className="w-full bg-white/10 border-2 border-white/20 rounded-2xl p-4 text-white placeholder-white/40 focus:border-white focus:outline-none focus:ring-0 transition resize-none h-32"
                  />
                </div>

                <div className="mt-auto">
                  <button
                    onClick={handleAnalyze}
                    disabled={!userRequest.trim() || isLoading}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-white py-4 text-xl font-black uppercase tracking-widest text-[#0a428d] shadow-2xl transition enabled:hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                  >
                    <Sparkles size={20} />
                    Style Me
                  </button>
                  <button
                    onClick={() => setStep('capture')}
                    className="w-full mt-4 text-xs font-bold uppercase tracking-widest opacity-60"
                  >
                    Back to Photo
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 'result' && result && (
            <div className="flex-1 overflow-y-auto animate-in slide-in-from-bottom duration-500 pb-4">
               {/* Result Header */}
               <div className="text-center mb-6">
                 <h2 className="text-3xl font-black tracking-tight text-white mb-2">{result.outfit_name}</h2>
                 <p className="text-sm text-white/80 italic">"{result.reasoning}"</p>
               </div>

               {/* Visual Prompt / Image Placeholder */}
               <div className="bg-black/20 rounded-2xl p-6 border border-white/10 mb-6 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20" />
                  <Shirt className="h-12 w-12 text-white/20 absolute top-4 right-4" />
                  
                  <h3 className="text-xs font-black uppercase tracking-widest text-amber-300 mb-3 relative z-10">The Look</h3>
                  <ul className="space-y-3 relative z-10">
                    {result.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className="h-1.5 w-1.5 rounded-full bg-white mt-2 shrink-0" />
                        <span className="text-sm font-medium leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
               </div>

               <div className="bg-white/5 rounded-2xl p-5 border border-white/10 mb-6">
                 <h3 className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-2">Your Vibe</h3>
                 <p className="text-sm text-white/90">{result.user_analysis}</p>
               </div>

               <button
                 onClick={handleReset}
                 className="w-full flex items-center justify-center gap-2 rounded-2xl bg-white/10 border border-white/20 py-4 text-sm font-black uppercase tracking-widest text-white hover:bg-white/20 transition active:scale-95"
               >
                 <RotateCcw size={16} />
                 Style Another
               </button>
            </div>
          )}

          {error && (
            <p className="text-center text-xs font-bold text-rose-300 animate-pulse mt-4">{error}</p>
          )}

        </main>
      </div>

      <BottomNav />
    </div>
  );
};
