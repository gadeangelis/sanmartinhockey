import React, { useState } from 'react';
import {
  Menu,
  Database,
  LogOut,
  User,
  ChevronDown,
  Shield,
  Sparkles,
  Users
} from 'lucide-react';
import { DEMO_ROLES } from '../lib/mockData';

export const Navbar = ({
  currentModuleTitle,
  currentUser,
  onLogout,
  onSwitchUser,
  onOpenSupabaseModal,
  isSupabaseConnected,
  onExportExcel,
  onExportPdf,
  onToggleMobileMenu
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);

  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case 'admin':
        return { bg: 'rgba(229, 37, 42, 0.2)', color: 'var(--club-red)', border: '1px solid rgba(229, 37, 42, 0.4)', label: 'ADMINISTRADOR' };
      case 'tesorero':
        return { bg: 'rgba(16, 185, 129, 0.2)', color: 'var(--color-success)', border: '1px solid rgba(16, 185, 129, 0.4)', label: 'TESORERO' };
      case 'delegado':
        return { bg: 'rgba(56, 189, 248, 0.2)', color: 'var(--color-info)', border: '1px solid rgba(56, 189, 248, 0.4)', label: 'DELEGADO (SOLO LECTURA)' };
      default:
        return { bg: 'rgba(148, 163, 184, 0.2)', color: 'var(--text-secondary)', border: '1px solid rgba(148, 163, 184, 0.4)', label: 'PADRE (SOLO LECTURA)' };
    }
  };

  const roleStyle = getRoleBadgeStyle(currentUser?.role);

  return (
    <header className="top-header">
      <div className="header-left">
        <button className="mobile-menu-toggle" onClick={onToggleMobileMenu} title="Abrir Menú">
          <Menu size={20} />
        </button>

        {/* Escudo y Breadcrumbs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img
            src="/escudo-sanmartin.png"
            alt="Escudo San Martín"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              objectFit: 'cover',
              padding: '1px'
            }}
          />
          <div className="breadcrumbs">
            <span>Hockey San Martín</span>
            <span>&gt;</span>
            <span className="breadcrumb-active">{currentModuleTitle}</span>
          </div>
        </div>
      </div>

      <div className="header-actions">
        {/* Conexión Supabase 
        <button 
          onClick={onOpenSupabaseModal}
          className="btn btn-secondary" 
          style={{ fontSize: '0.78rem', padding: '6px 12px' }}
          title="Configurar Supabase"
        >
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: isSupabaseConnected ? 'var(--color-success)' : 'var(--color-warning)',
            boxShadow: `0 0 8px ${isSupabaseConnected ? 'var(--color-success)' : 'var(--color-warning)'}`
          }} />
          <Database size={15} />
          <span className="hide-on-mobile">
            {isSupabaseConnected ? 'Supabase Conectado' : 'Modo Demo Local'}
          </span>
        </button>*/}

        {/* Selector de Rol y Perfil */}
        <div style={{ position: 'relative' }}>
          <button
            className="btn btn-secondary"
            onClick={() => setShowUserMenu(!showUserMenu)}
            style={{
              padding: '6px 12px',
              gap: '10px',
              background: 'var(--bg-card)',
              borderColor: 'var(--border-subtle)'
            }}
          >
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: 'var(--club-red-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '0.8rem',
              color: '#ffffff'
            }}>
              {currentUser?.full_name?.charAt(0) || 'U'}
            </div>

            <div style={{ textAlign: 'left', lineHeight: '1.2' }} className="hide-on-mobile">
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffffff' }}>
                {currentUser?.full_name?.split(' ')[0]}
              </div>
              <span style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                color: roleStyle.color,
                letterSpacing: '0.04em'
              }}>
                {roleStyle.label}
              </span>
            </div>

            <ChevronDown size={14} color="var(--text-muted)" />
          </button>

          {/* Menú Desplegable de Usuario y Selector de Roles */}
          {showUserMenu && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: '115%',
                width: '270px',
                background: 'var(--bg-card-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '16px',
                padding: '12px',
                boxShadow: '0 15px 35px rgba(0,0,0,0.6)',
                zIndex: 100,
                animation: 'slideUp 0.15s ease-out'
              }}
              onMouseLeave={() => setShowUserMenu(false)}
            >
              <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '8px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff' }}>{currentUser?.full_name}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{currentUser?.email}</div>
                <div style={{
                  display: 'inline-block',
                  marginTop: '6px',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: roleStyle.bg,
                  color: roleStyle.color,
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  border: roleStyle.border
                }}>
                  {roleStyle.label}
                </div>
              </div>

              {/* Selector de Roles para Pruebas Inmediatas */}
              <div style={{ padding: '6px 10px 4px' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Simular Rol (Pruebas de Permisos):
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                  {DEMO_ROLES.map(demo => (
                    <button
                      key={demo.id}
                      onClick={() => {
                        onSwitchUser(demo);
                        setShowUserMenu(false);
                      }}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        background: currentUser?.id === demo.id ? 'rgba(229, 37, 42, 0.15)' : 'transparent',
                        border: 'none',
                        color: currentUser?.id === demo.id ? 'var(--club-red)' : 'var(--text-secondary)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <span>{demo.full_name}</span>
                      <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', opacity: 0.8 }}>
                        {demo.role}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '8px 0' }} />

              <button
                onClick={() => {
                  setShowUserMenu(false);
                  onLogout();
                }}
                className="btn btn-danger"
                style={{ width: '100%', fontSize: '0.78rem', padding: '7px 12px' }}
              >
                <LogOut size={14} /> Cerrar Sesión
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .hide-on-mobile {
            display: none !important;
          }
        }
      `}</style>
    </header>
  );
};
