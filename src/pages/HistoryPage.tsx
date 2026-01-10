import React, { useEffect, useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { BottomNav } from '../components/BottomNav';
import { Logo } from '../components/Logo';
import { ShareCard } from '../components/ShareCard';
import { Share2, Sparkles, Trash2 } from 'lucide-react';
import { shareOutfit } from '../lib/share';
import type { HistoryItem, PersonaAnalysisResult, StyleResult } from '../types';

export const HistoryPage: React.FC = () => {
  const { t } = useTranslation();
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  
  const [shareItem, setShareItem] = useState<HistoryItem | null>(null);
  const shareCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    const fetchHistory = async () => {
      try {
        const headers = session ? { Authorization: `Bearer ${session.access_token}` } : {};
        const response = await axios.post('/.netlify/functions/get-history', {
          limit: 20
        }, { headers });
        setHistory(response.data);
      } catch (error) {
        console.error('Failed to fetch history', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [user, navigate, session]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setIsDeleting(id);
    try {
      const headers = session ? { Authorization: `Bearer ${session.access_token}` } : {};
      await axios.post('/.netlify/functions/delete-scan', { id }, { headers });
      setHistory(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error('Delete failed', err);
      alert(t('delete_error', 'Failed to delete scan'));
    } finally {
      setIsDeleting(null);
    }
  };

  const generateAndShare = useCallback(async () => {
    if (!shareCardRef.current || !shareItem) return;

    let fullItem: HistoryItem = shareItem;

    // Check if we need to fetch full data (if simplified version is present)
    const isScanSimplified = shareItem.type === 'scan' && !shareItem.data[0].highlights;
    const isStyleSimplified = shareItem.type === 'style' && !(shareItem.data as StyleResult).items;

    if (isScanSimplified || isStyleSimplified) {
        setIsSharing(true);
        try {
            const headers = session ? { Authorization: `Bearer ${session.access_token}` } : {};
            const res = await axios.post('/.netlify/functions/get-scan', { id: shareItem.id }, { headers });
            fullItem = res.data;
        } catch (error) {
            console.error('Failed to fetch full scan details', error);
            setIsSharing(false);
            return;
        }
    }

    if (fullItem.type === 'scan') {
      const bestResult = fullItem.data.reduce((prev: PersonaAnalysisResult, current: PersonaAnalysisResult) => 
        (prev.score > current.score) ? prev : current
      , fullItem.data[0]);

      await shareOutfit({
        element: shareCardRef.current,
        t,
        score: bestResult.score,
        scanId: fullItem.id,
        onLoading: setIsSharing
      });
    } else {
      await shareOutfit({
        element: shareCardRef.current,
        t,
        mode: 'style',
        scanId: fullItem.id,
        onLoading: setIsSharing
      });
    }
    
    setShareItem(null);
  }, [shareItem, t, session]);

  useEffect(() => {
    if (shareItem && shareCardRef.current) {
      generateAndShare();
    }
  }, [shareItem, generateAndShare]);

  const handleShareClick = (e: React.MouseEvent, item: HistoryItem) => {
    e.stopPropagation();
    setShareItem(item);
  };

  const currentBestResult = (shareItem && shareItem.type === 'scan') 
    ? shareItem.data.reduce((prev, current) => (prev.score > current.score) ? prev : current, shareItem.data[0]) 
    : null;

  return (
    <div className="flex h-dvh flex-col bg-[#0a428d] text-white font-sans overflow-hidden relative">
      {isSharing && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <Sparkles className="h-12 w-12 animate-spin text-white mb-4" />
          <p className="text-xl font-black uppercase tracking-widest">{t('generating_share', 'Preparing Outfit...')}</p>
        </div>
      )}
      
      {/* Hidden Share Card for Generation */}
      {shareItem && (
        shareItem.type === 'scan' && currentBestResult ? (
          <ShareCard 
            ref={shareCardRef}
            image={shareItem.image_url}
            score={currentBestResult.score}
            highlights={currentBestResult.highlights || []} // Handle missing highlights safely before fetch
          />
        ) : shareItem.type === 'style' ? (
          <ShareCard 
            ref={shareCardRef}
            mode="style"
            image={shareItem.generated_image_url || shareItem.image_url}
            items={(shareItem.data as StyleResult).items || []} // Handle missing items safely
            title={t('style_button')}
          />
        ) : null
      )}

      <header className="relative flex items-center justify-center shrink-0 p-6 pb-2 max-w-lg mx-auto w-full">
        <Logo size="md" />
      </header>

      <main className="flex-1 overflow-y-auto px-6 pb-24">
        <div className="max-w-lg mx-auto w-full">
          <h1 className="text-xl font-black uppercase tracking-widest mb-6 opacity-80">{t('my_outfits', 'My Outfits')}</h1>

          {loading ? (
            <div className="flex justify-center py-12">
              <Sparkles className="animate-spin text-white/50" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 opacity-50 space-y-4">
              <p>{t('no_history', 'No outfits yet.')}</p>
              <button 
                onClick={() => navigate('/scan')}
                className="text-sm font-bold underline"
              >
                {t('start_scanning', 'Check your first look')}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {history.map((item) => {
                if (item.type === 'scan') {
                  const bestResult = item.data.reduce((prev: PersonaAnalysisResult, current: PersonaAnalysisResult) => 
                    (prev.score > current.score) ? prev : current
                  , item.data[0]);

                  return (
                    <div 
                      key={item.id}
                      onClick={() => {
                        navigate('/scan', { state: { result: item.data, image: item.image_url, id: item.id } });
                      }}
                      className="bg-white/10 border border-white/10 rounded-2xl p-3 flex gap-4 items-center active:scale-98 transition cursor-pointer"
                    >
                      <div className="h-16 w-16 shrink-0 rounded-xl overflow-hidden bg-black/20">
                        <img src={item.image_url} alt="Outfit" className="h-full w-full object-cover" />
                      </div>
                      
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-black text-amber-300 text-[10px] uppercase tracking-wider">
                            {bestResult.score}/10
                          </span>
                          <span className="text-[10px] opacity-40">•</span>
                          <span className="capitalize text-[10px] font-bold opacity-60 truncate">{item.occasion}</span>
                        </div>
                        <h3 className="font-bold text-sm truncate text-white/90">{bestResult.title}</h3>
                      </div>

                      <div className="flex flex-col gap-2">
                        <button
                          onClick={(e) => handleShareClick(e, item)}
                          className="p-3 rounded-full hover:bg-white/10 transition"
                        >
                          <Share2 size={20} />
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, item.id)}
                          disabled={isDeleting === item.id}
                          className={`p-3 rounded-full hover:bg-rose-500/20 transition text-rose-400/70 hover:text-rose-400 ${isDeleting === item.id ? 'animate-pulse' : ''}`}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  );
                } else {
                  // Style Item
                  return (
                    <div 
                      key={item.id}
                      onClick={() => {
                        // Pass result data and images to RecommendPage via location state
                        navigate('/recommend', { 
                          state: { 
                            result: { 
                              ...item.data, 
                              image: item.generated_image_url 
                            }, 
                            image: item.image_url, 
                            id: item.id 
                          } 
                        });
                      }}
                      className="bg-white/10 border border-white/10 rounded-2xl p-3 flex gap-4 items-center active:scale-98 transition cursor-pointer"
                    >
                      <div className="h-16 w-16 shrink-0 rounded-xl overflow-hidden bg-black/20 relative group">
                        <img 
                          src={item.generated_image_url || item.image_url} 
                          alt="Style" 
                          className="h-full w-full object-cover" 
                        />
                        {item.generated_image_url && (
                          <div className="absolute top-1 right-1">
                            <Sparkles size={10} className="text-amber-300 drop-shadow-md" fill="currentColor" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Sparkles size={10} style={{ color: '#fcd34d' }} fill="#fcd34d" />
                          <span className="font-black text-[9px] uppercase tracking-[0.15em]" style={{ color: '#fcd34d' }}>
                            {t('style_button')}
                          </span>
                        </div>
                        <h3 className="font-bold text-sm truncate text-white/90">{item.data.outfit_name}</h3>
                      </div>

                      <div className="flex flex-col gap-2">
                        <button
                          onClick={(e) => handleShareClick(e, item)}
                          className="p-3 rounded-full hover:bg-white/10 transition"
                        >
                          <Share2 size={20} />
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, item.id)}
                          disabled={isDeleting === item.id}
                          className={`p-3 rounded-full hover:bg-rose-500/20 transition text-rose-400/70 hover:text-rose-400 ${isDeleting === item.id ? 'animate-pulse' : ''}`}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};