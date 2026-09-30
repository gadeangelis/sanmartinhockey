import React, { useState } from 'react';
import { Shield } from 'lucide-react';
import { getRivalInfo } from '../lib/rivales';

export const RivalItem = ({ rival, subtitle = null, size = 28 }) => {
  const [imgError, setImgError] = useState(false);
  const rivalInfo = getRivalInfo(rival);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      {/* Escudo del Rival (28x28 píxeles compacto) */}
      <div style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '6px',
        background: 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        flexShrink: 0
      }}>
        {!imgError && rivalInfo.image ? (
          <img 
            src={rivalInfo.image} 
            alt={rivalInfo.name}
            onError={() => setImgError(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              padding: '1px'
            }}
          />
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            background: 'var(--club-red-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff'
          }}>
            <Shield size={Math.max(14, size - 14)} />
          </div>
        )}
      </div>

      {/* Nombre del Rival */}
      <div>
        <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.88rem', lineHeight: '1.2' }}>
          {rivalInfo.name}
        </div>
        {subtitle && (
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
};
