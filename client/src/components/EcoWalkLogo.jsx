import React from 'react';

/**
 * EcoWalk Logo Component
 * Uses the official eco.png emblem while maintaining original 
 * image proportions, transparent background, and typography.
 */
export function LeafShoeIcon({ size = 40, className = '', style = {} }) {
  return (
    <img 
      src="/eco.png" 
      alt="EcoWalk Emblem" 
      width={size} 
      height={size} 
      className={className}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
        width: `${size}px`,
        height: `${size}px`,
        objectFit: 'contain',
        backgroundColor: 'transparent',
        ...style
      }} 
    />
  );
}

export default function EcoWalkLogo({ 
  size = 40, 
  variant = 'light', // 'light' (on dark background), 'dark' (on light background), or 'hero'
  showText = true,
  subtitle = null,
  onClick = null
}) {
  const isLight = variant === 'light';
  const isHero = variant === 'hero';

  return (
    <div 
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: isHero ? '16px' : '10px',
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none'
      }}
    >
      <LeafShoeIcon size={size} />

      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{
            display: 'flex',
            alignItems: 'baseline',
            fontFamily: 'var(--font-heading, "Plus Jakarta Sans", sans-serif)',
            fontSize: isHero ? '2.4rem' : '1.35rem',
            fontWeight: '800',
            letterSpacing: '-0.5px',
            lineHeight: '1.1',
            color: isLight ? '#FFFFFF' : '#0F172A',
            position: 'relative'
          }}>
            <span>Eco</span>
            <span style={{ color: isLight ? '#34D399' : '#059669' }}>Walk</span>
          </div>

          {/* Underline accent under Eco */}
          <div style={{
            width: isHero ? '48px' : '26px',
            height: isHero ? '4px' : '2.5px',
            backgroundColor: '#10B981',
            borderRadius: '2px',
            marginTop: '2px'
          }} />

          {subtitle && (
            <span style={{
              fontSize: isHero ? '0.95rem' : '0.72rem',
              color: isLight ? '#94A3B8' : '#64748B',
              marginTop: '4px',
              fontWeight: '500'
            }}>
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
