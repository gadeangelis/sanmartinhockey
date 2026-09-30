import React from 'react';
import { Clock, ShieldAlert, RefreshCw, LogOut, CheckCircle2, UserCheck } from 'lucide-react';

export const PendingApprovalScreen = ({ currentUser, onRefresh, onLogout, onSwitchToAdmin }) => {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      background: 'radial-gradient(circle at top, #1a202c 0%, #0b0e12 100%)'
    }}>
      <div style={{
        maxWidth: '520px',
        width: '100%',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '24px',
        padding: '36px 28px',
        textAlign: 'center',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Franja Superior Institucional */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '6px',
          background: 'var(--club-red-gradient)'
        }} />

        {/* Escudo del Club */}
        <div style={{ marginBottom: '20px' }}>
          <img 
            src="/escudo.png" 
            alt="Escudo Hockey Club San Martín" 
            style={{
              width: '84px',
              height: '84px',
              borderRadius: '20px',
              objectFit: 'cover',
              padding: '3px',
              background: '#ffffff',
              boxShadow: '0 8px 24px rgba(229, 37, 42, 0.35)',
              margin: '0 auto'
            }}
          />
        </div>

        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 16px',
          borderRadius: '9999px',
          background: 'rgba(245, 158, 11, 0.15)',
          color: 'var(--color-warning)',
          fontSize: '0.8rem',
          fontWeight: 700,
          marginBottom: '16px',
          border: '1px solid rgba(245, 158, 11, 0.3)'
        }}>
          <Clock size={16} /> SOLICITUD EN REVISIÓN
        </div>

        <h2 style={{
          fontSize: '1.4rem',
          fontWeight: 800,
          color: '#ffffff',
          marginBottom: '12px',
          letterSpacing: '-0.02em'
        }}>
          Cuenta Pendiente de Aprobación
        </h2>

        <p style={{
          fontSize: '0.88rem',
          color: 'var(--text-secondary)',
          lineHeight: '1.6',
          marginBottom: '24px'
        }}>
          Bienvenido/a <strong>{currentUser?.full_name}</strong>. Para salvaguardar los fondos y la información financiera del <strong>HOCKEY CLUB SAN MARTIN</strong>, ningún usuario ingresa automáticamente.
        </p>

        {/* Ficha de datos cargados */}
        <div style={{
          background: 'var(--bg-input)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '16px',
          padding: '16px',
          textAlign: 'left',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Correo registrado:</span>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#ffffff' }}>{currentUser?.email}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Rol solicitado:</span>
            <span style={{ 
              fontSize: '0.82rem', 
              fontWeight: 700, 
              color: 'var(--club-red)', 
              textTransform: 'uppercase' 
            }}>
              {currentUser?.role === 'padre' ? 'PADRE (Solo Lectura Partidos)' : 'DELEGADO (Solo Lectura Completo)'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Estado:</span>
            <span style={{ 
              fontSize: '0.78rem', 
              fontWeight: 700, 
              color: 'var(--color-warning)'
            }}>
              ⏳ Esperando autorización del Administrador
            </span>
          </div>
        </div>

        {/* Botones de Acción */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '12px' }}
            onClick={onRefresh}
          >
            <RefreshCw size={16} /> Comprobar si ya fue aprobada
          </button>

          <button 
            className="btn btn-secondary" 
            style={{ width: '100%', padding: '12px' }}
            onClick={onLogout}
          >
            <LogOut size={16} /> Cerrar Sesión / Salir
          </button>

          {/* Acceso para pruebas y evaluación directa */}
          <div style={{
            marginTop: '12px',
            paddingTop: '16px',
            borderTop: '1px dashed var(--border-subtle)'
          }}>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
              ¿Eres el Administrador del Club? Puedes ingresar directamente para autorizar esta cuenta:
            </p>
            <button 
              className="btn btn-secondary"
              style={{
                width: '100%',
                fontSize: '0.78rem',
                padding: '8px',
                borderColor: 'rgba(229, 37, 42, 0.4)',
                color: 'var(--club-red)'
              }}
              onClick={onSwitchToAdmin}
            >
              <UserCheck size={14} /> Entrar como Administrador y Aprobar Cuentas
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
