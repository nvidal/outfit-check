import { forwardRef } from 'react';

interface ShareCardProps {
  image: string;
  score: number;
  highlights: {
    type: 'good' | 'bad';
    label: string;
    box_2d: [number, number, number, number];
  }[];
}

export const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(({ image, score, highlights }, ref) => {
  const brandBlue = '#0a428d';
  const amber300 = '#fcd34d';
  const white = '#ffffff';
  const white20 = 'rgba(255, 255, 255, 0.2)';

  const font = '"Space Grotesk", sans-serif';
  const scoreText = `${score}/10`;
  const scoreWidth = 160;

  return (
    <div 
      ref={ref}
      style={{ 
        position: 'absolute', 
        left: '-2000px', 
        top: '0',
        width: '720px',
        height: '1280px',
        backgroundColor: brandBlue,
        color: white,
        zIndex: -100,
        padding: '40px 50px',
        boxSizing: 'border-box',
        fontFamily: font,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}
    >
      {/* Header with Manual SVG implementation for perfect alignment and scale */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '35px', height: '90px', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img 
            src="/logo.svg" 
            alt="Logo" 
            style={{ height: '60px', width: '60px', objectFit: 'contain' }} 
          />
          <svg width="365" height="80" style={{ display: 'block' }}>
            <text 
              x="0" 
              y="57" 
              fontFamily={font} 
              fontWeight="900" 
              fontSize="45" 
              fill="white"
              letterSpacing="-2"
            >
              OUTFIT CHECK
            </text>
          </svg>
        </div>

        <svg width={scoreWidth} height="87" style={{ display: 'block' }}>
          <rect width={scoreWidth} height="87" rx="21" fill={amber300} />
          <text 
            x={scoreWidth / 2} 
            y="61" 
            textAnchor="middle" 
            fontFamily={font} 
            fontWeight="900" 
            fontSize="48" 
            fill={brandBlue}
          >
            {scoreText}
          </text>
        </svg>
      </div>

      {/* Image Container - Strictly 3:4 Ratio (600x800) */}
      <div 
        style={{ 
          position: 'relative',
          width: '600px', 
          height: '800px',
          borderRadius: '47px',
          borderColor: white20, 
          borderWidth: '8px', 
          borderStyle: 'solid',
          backgroundColor: '#000',
          overflow: 'hidden',
          marginBottom: '35px',
          flexShrink: 0 
        }}
      >
        <img 
          src={image} 
          alt="Outfit" 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          crossOrigin="anonymous" 
        />
        
        {/* Render Highlights (Only Boxes) */}
        {highlights?.map((h, i) => {
          const [ymin, xmin, ymax, xmax] = h.box_2d;
          const color = h.type === 'good' ? '#4ade80' : '#f87171';
          
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                border: '4px solid',
                borderColor: color,
                backgroundColor: h.type === 'good' ? 'rgba(74, 222, 128, 0.15)' : 'rgba(248, 113, 113, 0.15)',
                borderRadius: '13px',
                top: `${ymin / 10}%`,
                left: `${xmin / 10}%`,
                width: `${(xmax - xmin) / 10}%`,
                height: `${(ymax - ymin) / 10}%`,
              }}
            />
          );
        })}
      </div>

      {/* Analysis Highlights List - One per line using SVG rows for absolute centering */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '600px' }}>
        {highlights?.slice(0, 5).map((h, i) => {
          const dotColor = h.type === 'good' ? '#4ade80' : '#f87171';
          
          return (
            <div 
              key={i}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: `2px solid ${white20}`,
                borderRadius: '13px',
                height: '50px',
                width: '100%',
                overflow: 'hidden'
              }}
            >
              <svg width="600" height="50">
                <circle cx="23" cy="25" r="5" fill={dotColor} />
                <circle cx="23" cy="25" r="9" fill="none" stroke={dotColor} strokeWidth="1.5" opacity="0.3" />
                
                <text 
                  x="47" 
                  y="31" 
                  fontFamily={font} 
                  fontWeight="700" 
                  fontSize="19" 
                  fill="white"
                  opacity="0.9"
                >
                  {h.label.toUpperCase()}
                </text>
              </svg>
            </div>
          );
        })}
      </div>
    </div>
  );
});