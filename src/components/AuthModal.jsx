import React, { useState } from 'react';
import { LogIn, UserPlus, Shield, Sparkles, Check, AlertCircle } from 'lucide-react';
import { DEMO_ROLES, DEFAULT_ADMIN_USER } from '../lib/mockData';
import { getLocalData, setLocalData } from '../lib/supabase';

export const AuthModal = ({ onLoginSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('padre'); // 'padre' o 'delegado' por defecto
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    setErrorMsg('');

    const profiles = getLocalData('hc_profiles', [DEFAULT_ADMIN_USER]);
    const found = profiles.find(p => p.email.toLowerCase() === email.trim().toLowerCase());

    if (!found) {
      setErrorMsg('No se encontró ninguna cuenta registrada con este correo electrónico.');
      return;
    }

    onLoginSuccess(found);
  };

  const handleRegister = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!fullName.trim() || !email.trim() || !password) {
      setErrorMsg('Por favor completa todos los campos.');
      return;
    }

    const profiles = getLocalData('hc_profiles', [DEFAULT_ADMIN_USER]);
    const exists = profiles.some(p => p.email.toLowerCase() === email.trim().toLowerCase());

    if (exists) {
      setErrorMsg('Este correo ya se encuentra registrado en el sistema.');
      return;
    }

    const newProfile = {
      id: 'usr-' + Date.now(),
      email: email.trim(),
      full_name: fullName.trim(),
      role: role, // 'padre' o 'delegado'
      status: 'pending', // CRÍTICO: Estado pendiente de aprobación por el Admin
      created_at: new Date().toISOString()
    };

    const updated = [newProfile, ...profiles];
    setLocalData('hc_profiles', updated);

    // Ingresar al estado pendiente
    onLoginSuccess(newProfile);
  };

  const handleGoogleLogin = () => {
    // Simular o iniciar autenticación Google
    const demoGoogleUser = {
      id: 'usr-google-' + Date.now(),
      email: 'usuario.google@hockeysanmartin.com',
      full_name: 'Usuario Google',
      role: 'padre',
      status: 'pending', // Requiere aprobación
      created_at: new Date().toISOString()
    };

    const profiles = getLocalData('hc_profiles', [DEFAULT_ADMIN_USER]);
    const updated = [demoGoogleUser, ...profiles];
    setLocalData('hc_profiles', updated);
    onLoginSuccess(demoGoogleUser);
  };

  // Selector directo de usuarios de prueba para evaluar los 4 roles
  const handleQuickDemoSelect = (demoUser) => {
    onLoginSuccess(demoUser);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      background: 'radial-gradient(ellipse at center top, #1e2430 0%, #0b0e12 100%)'
    }}>
      <div style={{
        maxWidth: '480px',
        width: '100%',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '24px',
        padding: '36px 32px',
        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8)',
        position: 'relative'
      }}>
        {/* Cabecera con Escudo y Título Oficial */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: '14px' }}>
            <img 
              src="/escudo.jpg" 
              alt="Escudo San Martín" 
              style={{
                width: '90px',
                height: '90px',
                borderRadius: '22px',
                objectFit: 'cover',
                background: '#ffffff',
                padding: '3px',
                boxShadow: '0 10px 25px rgba(229, 37, 42, 0.4)'
              }}
            />
          </div>
          <h1 style={{
            fontSize: '1.25rem',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: '#ffffff',
            textTransform: 'uppercase',
            lineHeight: '1.3'
          }}>
            BIENVENIDOS HOCKEY CLUB SAN MARTIN
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--club-red)', fontWeight: 700, marginTop: '4px' }}>
            PORTAL FINANCIERO Y CONTABLE
          </p>
        </div>

        {/* Pestañas de Login o Registro */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          background: 'var(--bg-input)',
          padding: '4px',
          borderRadius: '12px',
          marginBottom: '22px',
          border: '1px solid var(--border-subtle)'
        }}>
          <button
            type="button"
            onClick={() => { setIsRegister(false); setErrorMsg(''); }}
            style={{
              padding: '9px',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              background: !isRegister ? 'var(--club-red-gradient)' : 'transparent',
              color: !isRegister ? '#ffffff' : 'var(--text-secondary)',
              transition: 'all 0.2s ease'
            }}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => { setIsRegister(true); setErrorMsg(''); }}
            style={{
              padding: '9px',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              background: isRegister ? 'var(--club-red-gradient)' : 'transparent',
              color: isRegister ? '#ffffff' : 'var(--text-secondary)',
              transition: 'all 0.2s ease'
            }}
          >
            Registrarse
          </button>
        </div>

        {errorMsg && (
          <div style={{
            padding: '10px 14px',
            borderRadius: '8px',
            background: 'var(--color-danger-bg)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            color: 'var(--color-danger)',
            fontSize: '0.78rem',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} /> {errorMsg}
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={isRegister ? handleRegister : handleLogin}>
          {isRegister && (
            <div className="form-group">
              <label className="form-label">Nombre y Apellido Completo</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Ej. Juan Pérez"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Correo Electrónico</label>
            <input 
              type="email" 
              className="form-input" 
              placeholder="nombre@ejemplo.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <input 
              type="password" 
              className="form-input" 
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          {/* Selección obligatoria de Rol en Registro */}
          {isRegister && (
            <div className="form-group">
              <label className="form-label">Indica tu Rol en el Club</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setRole('padre')}
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    background: role === 'padre' ? 'rgba(229, 37, 42, 0.15)' : 'var(--bg-input)',
                    border: `2px solid ${role === 'padre' ? 'var(--club-red)' : 'var(--border-subtle)'}`,
                    color: '#ffffff',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>PADRE</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Solo lectura de informes
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('delegado')}
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    background: role === 'delegado' ? 'rgba(229, 37, 42, 0.15)' : 'var(--bg-input)',
                    border: `2px solid ${role === 'delegado' ? 'var(--club-red)' : 'var(--border-subtle)'}`,
                    color: '#ffffff',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>DELEGADO</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Carga Entradas & Cantina
                  </div>
                </button>
              </div>

              <div style={{
                marginTop: '10px',
                padding: '10px 12px',
                borderRadius: '8px',
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                fontSize: '0.72rem',
                color: 'var(--color-warning)',
                lineHeight: '1.4'
              }}>
                ℹ️ <strong>Nota de Seguridad:</strong> Tu cuenta no ingresará automáticamente. Deberá ser aprobada manualmente por el Administrador.
              </div>
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '12px', marginTop: '6px', fontSize: '0.9rem' }}
          >
            {isRegister ? <UserPlus size={18} /> : <LogIn size={18} />}
            {isRegister ? 'Solicitar Registro' : 'Ingresar al Sistema'}
          </button>
        </form>

        {/* Separador */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          margin: '20px 0 16px',
          color: 'var(--text-muted)',
          fontSize: '0.72rem'
        }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
          <span>O ACCEDE CON</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
        </div>

        {/* Botón de Google */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          className="btn btn-secondary"
          style={{ width: '100%', padding: '10px', fontSize: '0.82rem' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          Continuar con Google
        </button>

        {/* Acceso Rápido para Demostración y Evaluación de los 4 Roles */}
        <div style={{
          marginTop: '22px',
          padding: '14px',
          borderRadius: '12px',
          background: 'var(--bg-input)',
          border: '1px solid var(--border-subtle)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <Sparkles size={14} color="var(--club-red)" />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ffffff' }}>
              Acceso Rápido por Rol (Demostración)
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.72rem', padding: '6px 8px', justifyContent: 'flex-start' }}
              onClick={() => handleQuickDemoSelect(DEMO_ROLES[0])}
            >
              👑 Administrador
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.72rem', padding: '6px 8px', justifyContent: 'flex-start' }}
              onClick={() => handleQuickDemoSelect(DEMO_ROLES[1])}
            >
              💼 Tesorero
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.72rem', padding: '6px 8px', justifyContent: 'flex-start' }}
              onClick={() => handleQuickDemoSelect(DEMO_ROLES[2])}
            >
              📋 Delegado
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.72rem', padding: '6px 8px', justifyContent: 'flex-start' }}
              onClick={() => handleQuickDemoSelect(DEMO_ROLES[3])}
            >
              👀 Padre (Solo Lectura)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
