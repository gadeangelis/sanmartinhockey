import React, { useState } from 'react';
import { LogIn, UserPlus, Shield, Sparkles, Check, AlertCircle, Loader2 } from 'lucide-react';
import { DEMO_ROLES, DEFAULT_ADMIN_USER } from '../lib/mockData';
import { supabase, isSupabaseConfigured, getLocalData, setLocalData } from '../lib/supabase';

export const AuthModal = ({ onLoginSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('padre'); // 'padre' o 'delegado' por defecto
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    const cleanEmail = email.trim().toLowerCase();

    try {
      if (isSupabaseConfigured() && supabase) {
        // 1. Intentar inicio de sesión mediante Supabase Auth
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: password
        });

        if (!error && data?.user) {
          // Buscar perfil en tabla 'profiles'
          let foundProfile = null;
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.user.id)
              .maybeSingle();

            if (profile) {
              foundProfile = profile;
            } else {
              const { data: profileByEmail } = await supabase
                .from('profiles')
                .select('*')
                .eq('email', cleanEmail)
                .maybeSingle();

              if (profileByEmail) foundProfile = profileByEmail;
            }
          } catch (pErr) {
            console.warn('Error consultando tabla profiles:', pErr);
          }

          if (!foundProfile) {
            foundProfile = {
              id: data.user.id,
              email: cleanEmail,
              full_name: data.user.user_metadata?.full_name || cleanEmail.split('@')[0],
              role: data.user.user_metadata?.role || 'padre',
              status: 'pending',
              created_at: new Date().toISOString()
            };
            try {
              await supabase.from('profiles').insert([foundProfile]);
            } catch (insErr) {
              console.warn('Error creando perfil en tabla:', insErr);
            }
          }

          onLoginSuccess(foundProfile);
          return;
        }

        // 2. Si falló Supabase Auth (ej. usuario demo para evaluación rápida)
        const demoProfiles = [DEFAULT_ADMIN_USER, ...DEMO_ROLES];
        const demoFound = demoProfiles.find(p => p.email.toLowerCase() === cleanEmail);
        if (demoFound) {
          onLoginSuccess(demoFound);
          return;
        }

        const localProfiles = getLocalData('hc_profiles', []);
        const localFound = localProfiles.find(p => p.email.toLowerCase() === cleanEmail);
        if (localFound) {
          onLoginSuccess(localFound);
          return;
        }

        // Traducir o formatear mensaje de error de Supabase
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            setErrorMsg('Credenciales inválidas. Verifica tu correo y contraseña.');
          } else {
            setErrorMsg(error.message);
          }
          return;
        }
      }

      // 3. Fallback modo local (sin Supabase conectado)
      const profiles = getLocalData('hc_profiles', [DEFAULT_ADMIN_USER, ...DEMO_ROLES]);
      const found = profiles.find(p => p.email.toLowerCase() === cleanEmail);

      if (!found) {
        setErrorMsg('No se encontró ninguna cuenta registrada con este correo electrónico.');
        return;
      }

      onLoginSuccess(found);
    } catch (err) {
      setErrorMsg('Error al iniciar sesión: ' + (err.message || 'Error inesperado'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!fullName.trim() || !email.trim() || !password) {
      setErrorMsg('Por favor completa todos los campos.');
      return;
    }

    setIsSubmitting(true);
    const cleanEmail = email.trim().toLowerCase();

    try {
      if (isSupabaseConfigured() && supabase) {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: password,
          options: {
            data: {
              full_name: fullName.trim(),
              role: role
            }
          }
        });

        if (error) {
          setErrorMsg('Error en el registro: ' + error.message);
          return;
        }

        const newProfile = {
          id: data.user?.id || crypto.randomUUID(),
          email: cleanEmail,
          full_name: fullName.trim(),
          role: role,
          status: 'pending', // Requiere aprobación del administrador
          created_at: new Date().toISOString()
        };

        try {
          await supabase.from('profiles').insert([newProfile]);
        } catch (dbErr) {
          console.warn('Error insertando en profiles de Supabase:', dbErr);
        }

        const profiles = getLocalData('hc_profiles', [DEFAULT_ADMIN_USER]);
        setLocalData('hc_profiles', [newProfile, ...profiles]);

        onLoginSuccess(newProfile);
        return;
      }

      // Modo local
      const profiles = getLocalData('hc_profiles', [DEFAULT_ADMIN_USER]);
      const exists = profiles.some(p => p.email.toLowerCase() === cleanEmail);

      if (exists) {
        setErrorMsg('Este correo ya se encuentra registrado en el sistema.');
        return;
      }

      const newProfile = {
        id: 'usr-' + Date.now(),
        email: cleanEmail,
        full_name: fullName.trim(),
        role: role,
        status: 'pending',
        created_at: new Date().toISOString()
      };

      const updated = [newProfile, ...profiles];
      setLocalData('hc_profiles', updated);
      onLoginSuccess(newProfile);
    } catch (err) {
      setErrorMsg('Error al registrar usuario: ' + (err.message || 'Error inesperado'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setErrorMsg('');
      if (!isSupabaseConfigured() || !supabase) {
        setErrorMsg('Supabase no está configurado. Conecta tu proyecto en la configuración.');
        return;
      }
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });

      if (error) {
        setErrorMsg('Error al iniciar sesión con Google: ' + error.message);
      }
    } catch (err) {
      setErrorMsg('Ocurrió un error inesperado al conectar con Google.');
      console.error(err);
    }
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
            disabled={isSubmitting}
            style={{ 
              width: '100%', 
              padding: '12px', 
              marginTop: '6px', 
              fontSize: '0.9rem',
              opacity: isSubmitting ? 0.75 : 1,
              cursor: isSubmitting ? 'not-allowed' : 'pointer'
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Procesando...</span>
              </>
            ) : (
              <>
                {isRegister ? <UserPlus size={18} /> : <LogIn size={18} />}
                <span>{isRegister ? 'Solicitar Registro' : 'Ingresar al Sistema'}</span>
              </>
            )}
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
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          Continuar con Google
        </button>

        {/* Acceso Rápido para Demostración y Evaluación de los 4 Roles */}
        {import.meta.env.DEV && (
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
        )}
      </div>
    </div>
  );
};
