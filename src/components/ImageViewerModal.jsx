import React from 'react';
import { X, Download, ExternalLink } from 'lucide-react';

export const ImageViewerModal = ({ isOpen, imageUrl, title, onClose }) => {
  if (!isOpen || !imageUrl) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 200 }}>
      <div 
        className="modal-content" 
        style={{ maxWidth: '800px', padding: 0, overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 className="modal-title">{title || 'Comprobante / Talonario Adjunto'}</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <a 
              href={imageUrl} 
              download="comprobante_san_martin.jpg" 
              className="btn btn-secondary" 
              style={{ padding: '6px 12px', fontSize: '0.78rem' }}
            >
              <Download size={14} /> Descargar
            </a>
            <button className="btn-icon-only" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>
        <div style={{ padding: '20px', display: 'flex', justifyContent: 'center', background: '#0a0d12' }}>
          <img 
            src={imageUrl} 
            alt="Respaldo fotográfico" 
            style={{ 
              maxWidth: '100%', 
              maxHeight: '70vh', 
              borderRadius: '8px', 
              objectFit: 'contain',
              boxShadow: '0 8px 30px rgba(0,0,0,0.6)'
            }} 
          />
        </div>
      </div>
    </div>
  );
};
