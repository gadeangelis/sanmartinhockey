import React, { useState } from 'react';
import { X, Database, CheckCircle2, AlertCircle, Copy, Check, ShieldAlert, RefreshCw } from 'lucide-react';
import { clubApi } from '../lib/supabase';

const SQL_SCRIPT_TO_COPY = `-- HOCKEY CLUB SAN MARTIN - HABILITAR ACCESO REAL PERSISTENTE
ALTER TABLE public.entradas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cantina DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsors DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.gastos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

ALTER TABLE public.gastos ADD COLUMN IF NOT EXISTS rival TEXT;
ALTER TABLE public.gastos ADD COLUMN IF NOT EXISTS division TEXT;
ALTER TABLE public.gastos DROP CONSTRAINT IF EXISTS gastos_motivo_categoria_check;
ALTER TABLE public.gastos DROP CONSTRAINT IF EXISTS gastos_medio_pago_check;
ALTER TABLE public.gastos ADD CONSTRAINT gastos_medio_pago_check 
    CHECK (medio_pago IN ('Efectivo', 'Efectivo de Caja', 'Efectivo de Sponsor', 'Transferencia'));

ALTER TABLE public.entradas ALTER COLUMN created_by_id DROP NOT NULL;
ALTER TABLE public.cantina ALTER COLUMN created_by_id DROP NOT NULL;
ALTER TABLE public.sponsors ALTER COLUMN created_by_id DROP NOT NULL;
ALTER TABLE public.gastos ALTER COLUMN created_by_id DROP NOT NULL;

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;`;

export const SupabaseSettingsModal = ({ isOpen, onClose, onConfigSaved }) => {
  const currentConfig = clubApi.getConfig();
  const [url, setUrl] = useState(currentConfig.url);
  const [key, setKey] = useState(currentConfig.key);
  const [copied, setCopied] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [isTesting, setIsTesting] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    clubApi.saveConfig(url, key);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      if (onConfigSaved) onConfigSaved();
      onClose();
      window.location.reload();
    }, 1200);
  };

  const handleCopySQL = () => {
    navigator.clipboard.writeText(SQL_SCRIPT_TO_COPY);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await clubApi.testConnection();
      setTestResult(res);
    } catch (err) {
      setTestResult({ success: false, message: err.message });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ 
              width: '36px', 
              height: '36px', 
              borderRadius: '10px', 
              background: 'rgba(16, 185, 129, 0.15)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'var(--color-success)'
            }}>
              <Database size={20} />
            </div>
            <div>
              <h3 className="modal-title">Conexión con Supabase (Nube)</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Base de Datos PostgreSQL y Almacenamiento Persistente
              </p>
            </div>
          </div>
          <button className="btn-icon-only" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className="modal-body">
            {/* Estado actual de la conexión */}
            <div style={{ 
              padding: '12px 16px', 
              borderRadius: '12px', 
              background: currentConfig.isConfigured ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
              border: `1px solid ${currentConfig.isConfigured ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {currentConfig.isConfigured ? (
                  <>
                    <CheckCircle2 size={22} color="var(--color-success)" style={{ flexShrink: 0 }} />
                    <div>
                      <strong style={{ color: 'var(--color-success)', fontSize: '0.85rem' }}>Supabase Configurado</strong>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                        Conectado a: {currentConfig.url}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle size={22} color="var(--color-warning)" style={{ flexShrink: 0 }} />
                    <div>
                      <strong style={{ color: 'var(--color-warning)', fontSize: '0.85rem' }}>Modo Local / Demo Activo</strong>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                        Ingresa tus credenciales para enlazar con Supabase en la nube.
                      </p>
                    </div>
                  </>
                )}
              </div>

              {currentConfig.isConfigured && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  style={{ fontSize: '0.75rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <RefreshCw size={13} className={isTesting ? 'spin' : ''} />
                  {isTesting ? 'Verificando...' : 'Test Permisos'}
                </button>
              )}
            </div>

            {/* Resultado del test de conexión */}
            {testResult && (
              <div style={{
                padding: '12px 14px',
                borderRadius: '10px',
                marginBottom: '16px',
                background: testResult.success ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)',
                border: `1px solid ${testResult.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
                fontSize: '0.8rem',
                color: testResult.success ? 'var(--color-success)' : 'var(--color-danger)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
                  {testResult.success ? <Check size={16} /> : <ShieldAlert size={16} />}
                  <span>{testResult.success ? '¡Escritura y lectura 100% habilitadas!' : 'Atención con permisos de escritura'}</span>
                </div>
                <div style={{ marginTop: '4px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {testResult.message}
                </div>
                {testResult.isRlsBlocked && (
                  <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#ffffff' }}>
                    💡 <strong>Solución:</strong> Las políticas de seguridad (RLS) están bloqueando la inserción. Copia el script de abajo y ejecútalo en el <strong>SQL Editor</strong> de Supabase.
                  </div>
                )}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Project URL de Supabase</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="https://xyzabcdefgh.supabase.co" 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">API Anon Public Key</label>
              <input 
                type="password" 
                className="form-input" 
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." 
                value={key}
                onChange={(e) => setKey(e.target.value)}
              />
            </div>

            {/* Script SQL para habilitar persistencia total */}
            <div style={{ 
              marginTop: '16px', 
              padding: '14px', 
              borderRadius: '12px', 
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffffff' }}>
                  Habilitar Persistencia Real en Supabase (1-Click)
                </span>
                <button
                  type="button"
                  onClick={handleCopySQL}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.72rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {copied ? <Check size={13} color="var(--color-success)" /> : <Copy size={13} />}
                  {copied ? '¡Copiado!' : 'Copiar Script SQL'}
                </button>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 8px 0', lineHeight: 1.4 }}>
                Para que Supabase acepte operaciones reales de guardado sin bloqueos por RLS y soporte gastos por partido, pega y corre este script en el <strong>SQL Editor</strong> de tu proyecto Supabase:
              </p>
              <pre style={{
                background: 'rgba(0,0,0,0.4)',
                padding: '8px 10px',
                borderRadius: '8px',
                fontSize: '0.68rem',
                color: '#94a3b8',
                overflowX: 'auto',
                margin: 0,
                maxHeight: '90px'
              }}>
                {SQL_SCRIPT_TO_COPY}
              </pre>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cerrar
            </button>
            <button type="submit" className="btn btn-primary">
              {savedSuccess ? (
                <>
                  <Check size={16} /> ¡Guardado!
                </>
              ) : (
                'Guardar y Conectar'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
