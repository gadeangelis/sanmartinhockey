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

import { clubApi, isSupabaseConfigured } from './lib/supabase';
import { DEFAULT_ADMIN_USER } from './lib/mockData';
import { exportToExcel, exportToPdf } from './lib/exportUtils';

export function App() {
  // Estado de Autenticación
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('hc_current_user');
    return saved ? JSON.parse(saved) : DEFAULT_ADMIN_USER;
  });

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

  // Cargar datos
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
        const found = profs.find(p => p.id === currentUser.id);
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
    loadAllData();
  }, []);

  // Guardar usuario en LocalStorage
  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    localStorage.setItem('hc_current_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('hc_current_user');
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

  // Si no hay usuario logueado -> Pantalla de Inicio / Registro
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
