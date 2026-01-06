import React, { useEffect, useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { BottomNav } from '../components/BottomNav';
import { Logo } from '../components/Logo';
import { ShareCard } from '../components/ShareCard';
import { Share2, Sparkles } from 'lucide-react';
import html2canvas from 'html2canvas';
import type { HistoryItem } from '../types';

export const HistoryPage: React.FC = () => {
  const { t } = useTranslation();
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  
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

  const generateAndShare = useCallback(async () => {
    if (!shareCardRef.current || !shareItem) return;

    try {
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(shareCardRef.current, {
        scale: 1,
        backgroundColor: '#0a428d',
        useCORS: true
      });

      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
      if (!blob) return;

      const file = new File([blob], 'outfit-check.jpg', { type: 'image/jpeg' });
      const bestResult = shareItem.ai_results[0];

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Outfit Check Result',
          text: `I got a ${bestResult.score}/10!`,
        });
      } else {
        const link = document.createElement('a');
        link.download = 'outfit-check.jpg';
        link.href = canvas.toDataURL('image/jpeg', 0.9);
        link.click();
      }
    } catch (err) {
      console.error('Sharing failed', err);
      alert(t('share_error', 'Could not generate share image'));
    } finally {
      setShareItem(null);
    }
  }, [shareItem, t]);

  useEffect(() => {
    if (shareItem && shareCardRef.current) {
      generateAndShare();
    }
  }, [shareItem, generateAndShare]);

  const handleShareClick = (e: React.MouseEvent, item: HistoryItem) => {
    e.stopPropagation();
    setShareItem(item);
  };

  return (
    <div className="flex h-dvh flex-col bg-[#0a428d] text-white font-sans overflow-hidden relative">
      {shareItem && (
        <ShareCard 
          ref={shareCardRef}
          image={shareItem.image_url}
          score={shareItem.ai_results[0].score}
          title={shareItem.ai_results[0].title}
          improvement_tip={shareItem.ai_results[0].improvement_tip}
        />
      )}

      <header className="relative flex items-center justify-center shrink-0 p-6 pb-2">
        <Logo size="md" />
      </header>

      <main className="flex-1 overflow-y-auto px-6 pb-24">
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
              const bestResult = item.ai_results.reduce((prev, current) => 
                (prev.score > current.score) ? prev : current
              , item.ai_results[0]);

              return (
                <div 
                  key={item.id}
                  onClick={() => {
                    navigate('/scan', { state: { result: item.ai_results, image: item.image_url } });
                  }}
                  className="bg-white/10 border border-white/10 rounded-2xl p-3 flex gap-4 items-center active:scale-98 transition cursor-pointer"
                >
                  <div className="h-16 w-16 shrink-0 rounded-xl overflow-hidden bg-black/20">
                    <img src={item.image_url} alt="Outfit" className="h-full w-full object-cover" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm truncate">{bestResult.title}</h3>
                    <div className="flex items-center gap-2 text-xs opacity-70 mt-1">
                      <span className="font-black text-amber-300 text-sm">{bestResult.score}/10</span>
                      <span>•</span>
                      <span className="capitalize">{item.occasion}</span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleShareClick(e, item)}
                    className="p-3 rounded-full hover:bg-white/10 transition"
                  >
                    <Share2 size={20} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};