import React from 'react';

interface Highlight {
  type: 'good' | 'bad';
  label: string;
  box_2d?: [number, number, number, number];
  point_2d?: [number, number];
}

interface HighlightOverlayProps {
  highlights: Highlight[];
  activeHighlight: number | null;
}

export const HighlightOverlay: React.FC<HighlightOverlayProps> = ({ highlights, activeHighlight }) => {
  return (
    <>
      {highlights.map((h, i) => {
        const isActive = activeHighlight === null || activeHighlight === i;
        
        // Point-based Rendering
        if (h.point_2d) {
          const [y, x] = h.point_2d;
          const top = y / 10;
          const left = x / 10;
          
          return (
            <div
              key={i}
              className={`absolute rounded-full transition-all duration-500
                ${h.type === 'good' ? 'shadow-[0_0_20px_rgba(52,211,153,0.5)]' : 'shadow-[0_0_20px_rgba(248,113,113,0.5)]'}
                ${isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'}`}
              style={{
                top: `${top}%`,
                left: `${left}%`,
                width: '12%', 
                paddingBottom: '12%', 
                transform: 'translate(-50%, -50%)',
                backgroundColor: h.type === 'good' ? 'rgba(52, 211, 153, 0.7)' : 'rgba(248, 113, 113, 0.7)',
              }}
            >
              <div className={`absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded px-1.5 py-0.5 text-[8px] font-black uppercase tracking-tighter text-white
                ${h.type === 'good' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                {h.label}
              </div>
            </div>
          );
        }

        // Fallback: Box Rendering
        if (h.box_2d) {
          const [ymin, xmin, ymax, xmax] = h.box_2d;
          const top = ymin / 10;
          const left = xmin / 10;
          const width = (xmax - xmin) / 10;
          const height = (ymax - ymin) / 10;
          
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
        }
        return null;
      })}
    </>
  );
};
