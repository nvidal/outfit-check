import React from 'react';
import { HighlightOverlay } from './HighlightOverlay';
import { getOptimizedImageUrl } from '../lib/supabase';

interface Highlight {
  type: 'good' | 'bad';
  label: string;
  box_2d?: [number, number, number, number];
  point_2d?: [number, number];
}

interface OutfitImageProps {
  image: string;
  highlights?: Highlight[];
  activeHighlight?: number | null;
  score?: number;
  showScore?: boolean;
  className?: string;
  aspectRatio?: string;
}

export const OutfitImage: React.FC<OutfitImageProps> = ({ 
  image, 
  highlights = [], 
  activeHighlight = null, 
  score, 
  showScore = false,
  className = "",
  aspectRatio = "aspect-[3/4]"
}) => {
  return (
    <div className={`relative ${aspectRatio} w-full overflow-hidden rounded-2xl shadow-xl shrink-0 bg-black ${className}`}>
      <img 
        src={getOptimizedImageUrl(image, 1080)} 
        alt="Outfit" 
        className="h-full w-full object-cover" 
        // removed loading="lazy" to improve LCP
      />
      
      {highlights && highlights.length > 0 && (
        <HighlightOverlay 
          highlights={highlights} 
          activeHighlight={activeHighlight} 
        />
      )}

      {showScore && score !== undefined && (
        <div className="absolute bottom-3 right-3 flex items-center gap-2 rounded-xl bg-black/60 px-3 py-1 backdrop-blur-md border border-white/10 z-10">
          <span className="text-xl font-black">{score}/10</span>
        </div>
      )}
    </div>
  );
};