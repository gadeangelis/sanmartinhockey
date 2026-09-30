import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { EntradasModule } from './components/EntradasModule';
import { CantinaModule } from './components/CantinaModule';
import { SponsorsModule } from './components/SponsorsModule';
import { RendicionClubModule } from './components/RendicionClubModule';
import { GastosModule } from './components/GastosModule';
import { GastosPartidoModule } from './components/GastosPartidoModule';
import { PartidosModule } from './components/PartidosModule';
import { UserManagementModule } from './components/UserManagementModule';
import { AuthModal } from './components/AuthModal';
import { PendingApprovalScreen } from './components/PendingApprovalScreen';
import { SupabaseSettingsModal } from './components/SupabaseSettingsModal';
import { ImageViewerModal } from './components/ImageViewerModal';

import { clubApi, isSupabaseConfigured, supabase } from './lib/supabase';
import { DEFAULT_ADMIN_USER } from './lib/mockData';
import { exportToExcel, exportToPdf } from './lib/exportUtils';

export function App() {
  // Estado de Autenticación - Por defecto null (requiere Login obligatorio)
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Estado de Navegación
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Modales
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState({ isOpen: false, url: '', title: '' });

  // Colecciones de Datos
  const [profiles, setProfiles] = useState([]);
  const [entradas, setEntradas] = useState([]);
  const [cantina, setCantina] = useState([]);
  const [sponsors, setSponsors] = useState([]);
  const [gastos, setGastos] = useState([]);

  // Resuelve el perfil del usuario de Supabase Auth
  const resolveProfileForUser = async (sessionUser) => {
    if (!sessionUser) return null;
    const cleanEmail = (sessionUser.email || '').trim().toLowerCase();

    try {
      if (isSupabaseConfigured() && supabase) {
        // 1. Buscar en la tabla profiles por UUID de Auth
        const { data: profileById } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', sessionUser.id)
          .maybeSingle();

        if (profileById) return profileById;

        // 2. Si no coincide el ID, buscar por email
        if (cleanEmail) {
          const { data: profileByEmail } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', cleanEmail)
            .maybeSingle();

          if (profileByEmail) return profileByEmail;
        }

        // 3. Crear fila en profiles si es un nuevo ingreso
        const newProfile = {
          id: sessionUser.id,
          email: cleanEmail,
          full_name: sessionUser.user_metadata?.full_name || sessionUser.user_metadata?.name || cleanEmail.split('@')[0] || 'Usuario',
          role: sessionUser.user_metadata?.role || 'padre',
          status: sessionUser.user_metadata?.role === 'admin' ? 'approved' : 'pending',
          created_at: new Date().toISOString()
        };

        const { data: createdProfile } = await supabase
          .from('profiles')
          .insert([newProfile])
          .select()
          .maybeSingle();

        return createdProfile || newProfile;
      }
    } catch (err) {
      console.warn('Error resolviendo perfil en Supabase:', err);
    }

    return {
      id: sessionUser.id,
      email: cleanEmail,
      full_name: sessionUser.user_metadata?.full_name || cleanEmail.split('@')[0] || 'Usuario',
      role: sessionUser.user_metadata?.role || 'padre',
      status: 'pending',
      created_at: new Date().toISOString()
    };
  };

  // 1. Verificación inicial de sesión con getSession() y listener onAuthStateChange()
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        if (isSupabaseConfigured() && supabase) {
          const { data: { session }, error } = await supabase.auth.getSession();
          if (error) {
            console.warn('Error al obtener sesión en Supabase:', error);
          }

          if (session?.user && isMounted) {
            const profile = await resolveProfileForUser(session.user);
            if (isMounted && profile) {
              setCurrentUser(profile);
              localStorage.setItem('hc_current_user', JSON.stringify(profile));
            }
          } else if (isMounted) {
            // Sin sesión activa -> Obligar pantalla de Login
            setCurrentUser(null);
            localStorage.removeItem('hc_current_user');
          }
        } else {
          // Si Supabase no está conectado, verificar si había un usuario demo guardado
          const saved = localStorage.getItem('hc_current_user');
          if (saved && isMounted) {
            try {
              setCurrentUser(JSON.parse(saved));
            } catch (e) {
              setCurrentUser(null);
            }
          } else if (isMounted) {
            setCurrentUser(null);
          }
        }
      } catch (err) {
        console.error('Error inicializando autenticación:', err);
        if (isMounted) setCurrentUser(null);
      } finally {
        if (isMounted) setAuthLoading(false);
      }
    };

    initializeAuth();

    // Listener reactivo a cambios de sesión de Supabase
    let authSubscription = null;
    if (isSupabaseConfigured() && supabase) {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!isMounted) return;

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          if (session?.user) {
            const profile = await resolveProfileForUser(session.user);
            if (isMounted && profile) {
              setCurrentUser(profile);
              localStorage.setItem('hc_current_user', JSON.stringify(profile));
            }
          }
        } else if (event === 'SIGNED_OUT') {
          if (isMounted) {
            setCurrentUser(null);
            localStorage.removeItem('hc_current_user');
            setActiveTab('dashboard');
          }
        }
      });
      authSubscription = data?.subscription;
    }

    return () => {
      isMounted = false;
      if (authSubscription) authSubscription.unsubscribe();
    };
  }, []);

  // Cargar datos solo cuando el usuario está autenticado y aprobado
  const loadAllData = async () => {
    try {
      const [profs, ents, cants, sps, gsts] = await Promise.all([
        clubApi.getProfiles(),
        clubApi.getEntradas(),
        clubApi.getCantina(),
        clubApi.getSponsors(),
        clubApi.getGastos()
      ]);

      setProfiles(profs);
      setEntradas(ents);
      setCantina(cants);
      setSponsors(sps);
      setGastos(gsts);

      // Si el usuario actual está en la lista de perfiles, sincronizar su estado
      if (currentUser) {
        const found = profs.find(p => p.id === currentUser.id || p.email?.toLowerCase() === currentUser.email?.toLowerCase());
        if (found) {
          setCurrentUser(found);
          localStorage.setItem('hc_current_user', JSON.stringify(found));
        }
      }
    } catch (e) {
      console.error('Error cargando datos:', e);
    }
  };

  useEffect(() => {
    if (currentUser && currentUser.status === 'approved') {
      loadAllData();
    }
  }, [currentUser?.id, currentUser?.status]);

  // Guardar usuario al autenticarse con éxito
  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    localStorage.setItem('hc_current_user', JSON.stringify(user));
  };

  // Cerrar Sesión: desloguea de Supabase, limpia caché y vuelve a la pantalla de login
  const handleLogout = async () => {
    try {
      if (isSupabaseConfigured() && supabase) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn('Error al cerrar sesión en Supabase:', err);
    } finally {
      setCurrentUser(null);
      localStorage.removeItem('hc_current_user');
      setActiveTab('dashboard');
    }
  };

  const handleSwitchUser = (demoUser) => {
    setCurrentUser(demoUser);
    localStorage.setItem('hc_current_user', JSON.stringify(demoUser));
  };

  // Cómputo de Rendición al Club San Martín
  // Agrupa entradas y cantina por jornada (fecha + rival + division)
  const computeRendiciones = () => {
    const map = new Map();

    entradas.forEach(e => {
      const key = `${e.fecha}_${e.rival}_${e.division}`;
      if (!map.has(key)) {
        map.set(key, {
          fecha: e.fecha,
          rival: e.rival,
          division: e.division,
          transferencia_entradas: 0,
          transferencia_cantina: 0,
          total_rendido_club: 0
        });
      }
      const item = map.get(key);
      item.transferencia_entradas += (e.transferencia || 0);
      item.total_rendido_club += (e.transferencia || 0);
    });

    cantina.forEach(c => {
      const key = `${c.fecha}_${c.rival}_${c.division}`;
      if (!map.has(key)) {
        map.set(key, {
          fecha: c.fecha,
          rival: c.rival,
          division: c.division,
          transferencia_entradas: 0,
          transferencia_cantina: 0,
          total_rendido_club: 0
        });
      }
      const item = map.get(key);
      item.transferencia_cantina += (c.transferencia || 0);
      item.total_rendido_club += (c.transferencia || 0);
    });

    return Array.from(map.values()).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  };

  const rendiciones = computeRendiciones();

  // Cómputo del Balance Financiero en Tiempo Real
  const computeBalance = () => {
    const ingresosEntradas = entradas.reduce((sum, e) => sum + (e.subtotal || 0), 0);
    const ingresosCantina = cantina.reduce((sum, c) => sum + (c.total_ventas || 0), 0);
    const ingresosSponsors = sponsors.reduce((sum, s) => sum + (s.monto || 0), 0);
    const totalIngresos = ingresosEntradas + ingresosCantina + ingresosSponsors;

    const totalGastos = gastos.reduce((sum, g) => sum + (g.monto || 0), 0);

    // Desglose de Efectivo (Caja operativa: solo Entradas + Cantina)
    const efectivoEntradas = entradas.reduce((sum, e) => sum + (e.efectivo || 0), 0);
    const efectivoCantina = cantina.reduce((sum, c) => sum + (c.efectivo || 0), 0);
    // Gastos en efectivo de caja (solo "Efectivo" o "Efectivo de Caja", excluye "Efectivo de Sponsor")
    const efectivoGastosCaja = gastos
      .filter(g => g.medio_pago === 'Efectivo' || g.medio_pago === 'Efectivo de Caja')
      .reduce((sum, g) => sum + (g.monto || 0), 0);

    // Caja en Mano = solo efectivo de Entradas + Cantina (NO sponsors)
    const cajaEfectivo = Math.max(0, (efectivoEntradas + efectivoCantina) - efectivoGastosCaja);

    // Fondo de Sponsors (acumulativo histórico, independiente de la caja operativa)
    // Disminuye únicamente cuando se registra un gasto con medio_pago === 'Efectivo de Sponsor'
    const gastosSponsor = gastos
      .filter(g => g.medio_pago === 'Efectivo de Sponsor')
      .reduce((sum, g) => sum + (g.monto || 0), 0);
    const fondoSponsors = Math.max(0, ingresosSponsors - gastosSponsor);

    // Desglose de Transferencias (Cuenta Club San Martín)
    const transferenciaEntradas = entradas.reduce((sum, e) => sum + (e.transferencia || 0), 0);
    const transferenciaCantina = cantina.reduce((sum, c) => sum + (c.transferencia || 0), 0);
    const transferenciaSponsors = sponsors.filter(s => s.medio_pago === 'Transferencia').reduce((sum, s) => sum + (s.monto || 0), 0);
    const transferenciaGastos = gastos.filter(g => g.medio_pago === 'Transferencia').reduce((sum, g) => sum + (g.monto || 0), 0);

    const cuentaBancoClub = (transferenciaEntradas + transferenciaCantina + transferenciaSponsors) - transferenciaGastos;

    const totalDisponible = cajaEfectivo;
    const saldoNeto = totalIngresos - totalGastos;

    return {
      totalDisponible,
      cajaEfectivo,
      fondoSponsors,
      cuentaBancoClub,
      totalIngresos,
      totalGastos,
      saldoNeto,
      ingresosEntradas,
      ingresosCantina,
      ingresosSponsors
    };
  };

  const balanceData = computeBalance();

  // Acciones de Negocio
  const handleAddEntrada = async (record) => {
    const created = await clubApi.addEntrada(record, currentUser);
    setEntradas(prev => [created, ...prev]);
  };

  const handleDeleteEntrada = async (id) => {
    const updated = await clubApi.deleteEntrada(id);
    setEntradas(updated);
  };

  const handleAddCantina = async (record) => {
    const created = await clubApi.addCantina(record, currentUser);
    setCantina(prev => [created, ...prev]);
  };

  const handleDeleteCantina = async (id) => {
    const updated = await clubApi.deleteCantina(id);
    setCantina(updated);
  };

  const handleAddSponsor = async (record) => {
    const created = await clubApi.addSponsor(record, currentUser);
    setSponsors(prev => [created, ...prev]);
  };

  const handleDeleteSponsor = async (id) => {
    const updated = await clubApi.deleteSponsor(id);
    setSponsors(updated);
  };

  const handleAddGasto = async (record) => {
    const created = await clubApi.addGasto(record, currentUser);
    setGastos(prev => [created, ...prev]);
  };

  const handleDeleteGasto = async (id) => {
    const updated = await clubApi.deleteGasto(id);
    setGastos(updated);
  };

  // Gestión de Usuarios (Admin)
  const handleApproveUser = async (userId, targetRole) => {
    const updated = await clubApi.approveUser(userId, targetRole);
    setProfiles(updated);
  };

  const handleRejectUser = async (userId) => {
    const updated = await clubApi.rejectUser(userId);
    setProfiles(updated);
  };

  const handleUpdateRole = async (userId, role) => {
    const updated = await clubApi.updateUserRole(userId, role);
    setProfiles(updated);
  };

  // Exportaciones
  const handleExportExcel = () => {
    exportToExcel({
      balanceData,
      entradas,
      cantina,
      sponsors,
      gastos,
      rendiciones
    });
  };

  const handleExportPdf = () => {
    exportToPdf({
      balanceData,
      entradas,
      cantina,
      gastos,
      rendiciones
    });
  };

  // Visualizador de Imagen
  const handlePreviewImage = (url, title) => {
    setPreviewImage({ isOpen: true, url, title });
  };

  // 1. Pantalla de carga mientras se verifica la sesión en Supabase
  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse at center top, #1e2430 0%, #0b0e12 100%)',
        color: '#ffffff',
        gap: '16px'
      }}>
        <div style={{
          width: '74px',
          height: '74px',
          borderRadius: '20px',
          background: '#ffffff',
          padding: '3px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 10px 30px rgba(229, 37, 42, 0.45)',
          marginBottom: '6px'
        }}>
          <img 
            src="/escudo.jpg" 
            alt="San Martín" 
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '17px' }} 
          />
        </div>
        <div style={{
          width: '32px',
          height: '32px',
          border: '3px solid rgba(229, 37, 42, 0.2)',
          borderTopColor: 'var(--club-red, #e5252a)',
          borderRadius: '50%',
          animation: 'spinAuth 0.8s linear infinite'
        }} />
        <style>{`@keyframes spinAuth { to { transform: rotate(360deg); } }`}</style>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #94a3b8)', fontWeight: 600 }}>
          Verificando sesión...
        </span>
      </div>
    );
  }

  // 2. Si no hay usuario logueado -> Pantalla de Inicio / Registro OBLIGATORIA (bloqueo total)
  if (!currentUser) {
    return <AuthModal onLoginSuccess={handleLoginSuccess} />;
  }

  // Si el usuario está registrado pero en estado PENDIENTE -> Pantalla de Aprobación
  if (currentUser.status === 'pending') {
    return (
      <PendingApprovalScreen 
        currentUser={currentUser}
        onRefresh={loadAllData}
        onLogout={handleLogout}
        onSwitchToAdmin={() => handleSwitchUser(DEFAULT_ADMIN_USER)}
      />
    );
  }

  // Conteo de solicitudes pendientes para el badge del Admin
  const pendingCount = profiles.filter(p => p.status === 'pending').length;

  const getModuleTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Tablero General';
      case 'entradas': return 'Entradas de Jornada';
      case 'cantina': return 'Cantina y Buffet';
      case 'gastos_partido': return 'Gastos del Partido';
      case 'partidos': return 'Detalle de Partidos';
      case 'sponsors': return 'Sponsors y Patrocinios';
      case 'rendicion': return 'Rendición al Club San Martín';
      case 'gastos': return 'Gastos y Salidas del Club';
      case 'usuarios': return 'Aprobación de Usuarios';
      default: return 'Tablero General';
    }
  };

  return (
    <div className="app-container">
      {/* Barra Lateral */}
      <Sidebar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingCount={pendingCount}
        currentUser={currentUser}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        onLogout={handleLogout}
      />

      {/* Contenido Principal */}
      <div className="main-wrapper">
        <Navbar 
          currentModuleTitle={getModuleTitle()}
          currentUser={currentUser}
          onLogout={handleLogout}
          onSwitchUser={handleSwitchUser}
          onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
          isSupabaseConnected={isSupabaseConfigured()}
          onExportExcel={handleExportExcel}
          onExportPdf={handleExportPdf}
          onToggleMobileMenu={() => setIsMobileOpen(true)}
        />

        <main>
          {activeTab === 'dashboard' && (
            <Dashboard 
              balanceData={balanceData}
              entradas={entradas}
              cantina={cantina}
              sponsors={sponsors}
              gastos={gastos}
              rendiciones={rendiciones}
              onExportExcel={handleExportExcel}
              onExportPdf={handleExportPdf}
              onNavigateToModule={setActiveTab}
            />
          )}

          {activeTab === 'entradas' && (
            <EntradasModule 
              entradas={entradas}
              currentUser={currentUser}
              onAddEntrada={handleAddEntrada}
              onDeleteEntrada={handleDeleteEntrada}
              onPreviewImage={handlePreviewImage}
            />
          )}

          {activeTab === 'cantina' && (
            <CantinaModule 
              cantina={cantina}
              currentUser={currentUser}
              onAddCantina={handleAddCantina}
              onDeleteCantina={handleDeleteCantina}
              onPreviewImage={handlePreviewImage}
            />
          )}

          {activeTab === 'gastos_partido' && (
            <GastosPartidoModule 
              gastos={gastos}
              currentUser={currentUser}
              onAddGasto={handleAddGasto}
              onDeleteGasto={handleDeleteGasto}
              onPreviewImage={handlePreviewImage}
            />
          )}

          {activeTab === 'sponsors' && (
            <SponsorsModule 
              sponsors={sponsors}
              currentUser={currentUser}
              onAddSponsor={handleAddSponsor}
              onDeleteSponsor={handleDeleteSponsor}
            />
          )}

          {activeTab === 'rendicion' && (
            <RendicionClubModule 
              rendiciones={rendiciones}
              onExportExcel={handleExportExcel}
            />
          )}

          {activeTab === 'gastos' && (
            <GastosModule 
              gastos={gastos}
              fondoSponsors={balanceData.fondoSponsors}
              currentUser={currentUser}
              onAddGasto={handleAddGasto}
              onDeleteGasto={handleDeleteGasto}
              onPreviewImage={handlePreviewImage}
            />
          )}

          {activeTab === 'partidos' && (
            <PartidosModule
              entradas={entradas}
              cantina={cantina}
              gastos={gastos}
              currentUser={currentUser}
              onAddGasto={handleAddGasto}
              onDeleteGasto={handleDeleteGasto}
              onNavigateToModule={setActiveTab}
            />
          )}

          {activeTab === 'usuarios' && (
            <UserManagementModule 
              profiles={profiles}
              onApproveUser={handleApproveUser}
              onRejectUser={handleRejectUser}
              onUpdateRole={handleUpdateRole}
            />
          )}
        </main>
      </div>

      {/* Modal de Configuración Supabase */}
      <SupabaseSettingsModal 
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        onConfigSaved={loadAllData}
      />

      {/* Modal de Zoom de Imágenes (Talonarios y Comprobantes) */}
      <ImageViewerModal 
        isOpen={previewImage.isOpen}
        imageUrl={previewImage.url}
        title={previewImage.title}
        onClose={() => setPreviewImage({ isOpen: false, url: '', title: '' })}
      />
    </div>
  );
}
