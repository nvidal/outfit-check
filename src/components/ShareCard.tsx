import { forwardRef } from 'react';

interface ShareCardProps {
  image: string;
  score?: number;
  highlights?: {
    type: 'good' | 'bad';
    label: string;
    box_2d?: [number, number, number, number];
    point_2d?: [number, number];
  }[];
  items?: string[];
  title?: string;
  mode?: 'scan' | 'style';
}

export const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(({ image, score, highlights, items, title, mode = 'scan' }, ref) => {
  const brandBlue = '#0a428d';
  const amber300 = '#fcd34d';
  const white = '#ffffff';
  const white20 = 'rgba(255, 255, 255, 0.2)';

  const font = '"Space Grotesk", sans-serif';
  const badgeText = mode === 'scan' ? `${score}/10` : (title || 'STYLE ME');
  const badgeWidth = mode === 'scan' ? 240 : 380;

  return (
    <div 
      ref={ref}
      style={{ 
        position: 'absolute', 
        left: '-2000px', 
        top: '0',
        width: '1080px',
        height: '1920px',
        backgroundColor: brandBlue,
        color: white,
        zIndex: -100,
        padding: '60px 80px',
        boxSizing: 'border-box',
        fontFamily: font,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}
    >
      {/* Header with Manual SVG implementation for perfect alignment and scale */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '50px', height: '140px', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <img 
            src="/logo.svg" 
            alt="Logo" 
            style={{ height: '90px', width: '90px', objectFit: 'contain' }} 
          />
          <svg width="550" height="120" style={{ display: 'block' }}>
            <text 
              x="0" 
              y="85" 
              fontFamily={font} 
              fontWeight="900" 
              fontSize="68" 
              fill="white"
              letterSpacing="-2"
            >
              OUTFIT CHECK
            </text>
          </svg>
        </div>

        <svg width={badgeWidth} height="130" style={{ display: 'block' }}>
          <rect width={badgeWidth} height="130" rx="32" fill={amber300} />
          <text 
            x={badgeWidth / 2} 
            y="92" 
            textAnchor="middle" 
            fontFamily={font} 
            fontWeight="900" 
            fontSize={mode === 'scan' ? "72" : "56"} 
            fill={brandBlue}
            letterSpacing={mode === 'scan' ? "0" : "-1"}
          >
            {badgeText}
          </text>
        </svg>
      </div>

      {/* Image Container - Strictly 3:4 Ratio (900x1200) */}
      <div 
        style={{ 
          position: 'relative',
          width: '900px', 
          height: '1200px',
          borderRadius: '70px',
          borderColor: white20, 
          borderWidth: '12px', 
          borderStyle: 'solid',
          backgroundColor: '#000',
          overflow: 'hidden',
          marginBottom: '50px',
          flexShrink: 0 
        }}
      >
        <img 
          src={image} 
          alt="Outfit" 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          crossOrigin="anonymous" 
        />
        
        {/* Render Highlights (Scan Mode Only) */}
        {mode === 'scan' && highlights?.map((h, i) => {
          const color = h.type === 'good' ? '#4ade80' : '#f87171';
          
          if (h.point_2d) {
            const [y, x] = h.point_2d;
            const transparentColor = h.type === 'good' ? 'rgba(52, 211, 153, 0.7)' : 'rgba(248, 113, 113, 0.7)';
            const shadowColor = h.type === 'good' ? 'rgba(52, 211, 153, 0.5)' : 'rgba(248, 113, 113, 0.5)';
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  backgroundColor: transparentColor,
                  borderRadius: '50%',
                  top: `${y / 10}%`,
                  left: `${x / 10}%`,
                  width: '108px', 
                  height: '108px',
                  transform: 'translate(-50%, -50%)',
                  boxShadow: `0 0 20px ${shadowColor}`
                }}
              />
            );
          }

          if (h.box_2d) {
            const [ymin, xmin, ymax, xmax] = h.box_2d;
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  border: '6px solid',
                  borderColor: color,
                  backgroundColor: h.type === 'good' ? 'rgba(74, 222, 128, 0.15)' : 'rgba(248, 113, 113, 0.15)',
                  borderRadius: '20px',
                  top: `${ymin / 10}%`,
                  left: `${xmin / 10}%`,
                  width: `${(xmax - xmin) / 10}%`,
                  height: `${(ymax - ymin) / 10}%`,
                }}
              />
            );
          }
          return null;
        })}
      </div>

      {/* Highlights or Items List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '900px' }}>
        {mode === 'scan' && highlights?.slice(0, 5).map((h, i) => {
          const dotColor = h.type === 'good' ? '#4ade80' : '#f87171';
          
          return (
            <div 
              key={i}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: `2px solid ${white20}`,
                borderRadius: '20px',
                height: '76px',
                width: '100%',
                overflow: 'hidden'
              }}
            >
              <svg width="900" height="76">
                <circle cx="35" cy="38" r="8" fill={dotColor} />
                <circle cx="35" cy="38" r="14" fill="none" stroke={dotColor} strokeWidth="2" opacity="0.3" />
                
                <text 
                  x="70" 
                  y="46" 
                  fontFamily={font} 
                  fontWeight="700" 
                  fontSize="28" 
                  fill="white"
                  opacity="0.9"
                >
                  {h.label.toUpperCase()}
                </text>
              </svg>
            </div>
          );
        })}

        {mode === 'style' && items?.slice(0, 5).map((item, i) => (
            <div 
              key={i}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: `2px solid ${white20}`,
                borderRadius: '20px',
                height: '76px',
                width: '100%',
                overflow: 'hidden'
              }}
            >
              <svg width="900" height="76">
                <circle cx="35" cy="38" r="8" fill={amber300} />
                <circle cx="35" cy="38" r="14" fill="none" stroke={amber300} strokeWidth="2" opacity="0.3" />
                
                <text 
                  x="70" 
                  y="46" 
                  fontFamily={font} 
                  fontWeight="700" 
                  fontSize="28" 
                  fill="white"
                  opacity="0.9"
                >
                  {item.toUpperCase()}
                </text>
              </svg>
            </div>
        ))}
      </div>
    </div>
  );
});