import { useState } from 'react';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { CameraCapture } from '../components/CameraCapture';
import { Logo } from '../components/Logo';
import { BottomNav } from '../components/BottomNav';
import { SettingsMenu } from '../components/SettingsMenu';
import { OutfitImage } from '../components/OutfitImage';
import { Sparkles, Shirt, RotateCcw, Check, X, Download } from 'lucide-react';

interface RecommendationResult {
  user_analysis: string;
  outfit_name: string;
  items: string[];
  reasoning: string;
  visual_prompt: string;
  image?: string; // Base64 or URL if generated
  dos?: string[];
  donts?: string[];
}

export const RecommendPage = () => {
  const { t, i18n } = useTranslation();
  const { session } = useAuth();
  const location = useLocation();
  const locationState = location.state as { image?: string; result?: RecommendationResult } | null;

  const [image, setImage] = useState<string | null>(locationState?.image || null);
  const [userRequest, setUserRequest] = useState('');
  const [step, setStep] = useState<'capture' | 'details' | 'result'>(
    locationState?.result ? 'result' : (locationState?.image ? 'details' : 'capture')
  );
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<RecommendationResult | null>(locationState?.result || null);
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
      const headers = session ? { Authorization: `Bearer ${session.access_token}` } : {};
      const response = await axios.post('/.netlify/functions/recommend', {
        image,
        text: userRequest,
        language: i18n.language
      }, { headers });

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

  const handleDownload = () => {
    if (!result?.image) return;
    const link = document.createElement('a');
    link.href = result.image;
    link.download = `outfit-check-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex h-dvh flex-col bg-[#0a428d] text-white font-sans overflow-hidden">
      {isLoading && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 p-6">
          <Sparkles className="h-12 w-12 animate-spin text-white mb-4" />
          <p className="text-xl font-black uppercase tracking-widest text-center">{t('analyzing')}</p>
        </div>
      )}

      <div className={`flex-1 flex flex-col ${step === 'result' ? 'overflow-y-auto' : 'min-h-0'} p-6 pb-24`}>
        <header className="relative mb-6 text-center shrink-0 flex items-center justify-between z-20 max-w-lg mx-auto w-full">
          <div className="w-10" />
          <Logo size="md" />
          <SettingsMenu />
        </header>

        <main className={`flex flex-col gap-4 max-w-lg mx-auto w-full ${step !== 'result' ? 'flex-1 min-h-0' : ''}`}>
          
          {step === 'capture' && (
            <>
              <div className="text-center mb-2">
                <p className="text-white/60 text-sm">{t('style_me_subtitle')}</p>
              </div>
              <div className="relative w-full flex-1 min-h-0 mx-auto">
                <CameraCapture 
                  onCapture={handleCapture} 
                  onError={handleCaptureError} 
                  uploadText={t('style_upload_btn')}
                />
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
                    {t('occasion_question')}
                  </label>
                  <textarea
                    value={userRequest}
                    onChange={(e) => setUserRequest(e.target.value)}
                    placeholder={t('occasion_placeholder')}
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
                    {t('style_button')}
                  </button>
                  <button
                    onClick={() => setStep('capture')}
                    className="w-full mt-4 text-xs font-bold uppercase tracking-widest opacity-60"
                  >
                    {t('back_to_photo')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 'result' && result && (
            <div className="animate-in slide-in-from-bottom duration-500 pb-4">
               {/* Result Header */}
               <div className="text-center mb-6">
                 <h2 className="text-3xl font-black tracking-tight text-white mb-2">{result.outfit_name}</h2>
                 <p className="text-sm text-white/80 italic">"{result.reasoning}"</p>
               </div>

               {/* Visual Prompt / Image Placeholder */}
               {result.image ? (
                 <div className="rounded-2xl overflow-hidden mb-6 shadow-xl relative animate-in fade-in duration-700 group">
                    <img src={result.image} className="w-full h-auto object-cover" alt="Generated Outfit" />
                    
                    <button 
                       onClick={handleDownload}
                       className="absolute top-4 right-4 p-2.5 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-black/60 transition active:scale-95 z-10"
                       title={t('download_image')}
                    >
                       <Download size={20} />
                    </button>

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
               ) : (
                 <div className="bg-black/20 rounded-2xl p-6 mb-6 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20" />
                    <Shirt className="h-12 w-12 text-white/20 absolute top-4 right-4" />
                    
                    <h3 className="text-xs font-black uppercase tracking-widest text-amber-300 mb-3 relative z-10">{t('the_look')}</h3>
                    <ul className="space-y-3 relative z-10">
                      {result.items.map((item, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <div className="h-1.5 w-1.5 rounded-full bg-white mt-2 shrink-0" />
                          <span className="text-sm font-medium leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                 </div>
               )}

               {/* Dos and Donts */}
               {((result.dos?.length ?? 0) > 0 || (result.donts?.length ?? 0) > 0) && (
                 <div className="grid grid-cols-2 gap-3 mb-6">
                    {result.dos && result.dos.length > 0 && (
                      <div className="bg-emerald-500/10 rounded-2xl p-4 shadow-lg">
                        <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-300 mb-3">
                          <Check size={12} strokeWidth={4} /> {t('dos') || 'DOS'}
                        </h3>
                        <ul className="space-y-2">
                          {result.dos.map((item, i) => (
                            <li key={i} className="text-xs text-emerald-100/90 leading-tight">
                              • {item}
                            </li>
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
                            <li key={i} className="text-xs text-rose-100/90 leading-tight">
                              • {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                 </div>
               )}

               <button
                 onClick={handleReset}
                 className="w-full flex items-center justify-center gap-2 rounded-2xl bg-white/10 border border-white/20 py-4 text-sm font-black uppercase tracking-widest text-white hover:bg-white/20 transition active:scale-95"
               >
                 <RotateCcw size={16} />
                 {t('style_another')}
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
