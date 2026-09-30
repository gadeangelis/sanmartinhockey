import React from 'react';
import { 
  LayoutGrid, 
  Ticket, 
  UtensilsCrossed, 
  Award, 
  Landmark, 
  Receipt, 
  UserCheck, 
  Search,
  X,
  LogOut,
  ShieldCheck,
  Trophy,
  Building2
} from 'lucide-react';

export const Sidebar = ({ 
  activeTab, 
  setActiveTab, 
  pendingCount = 0, 
  currentUser, 
  isMobileOpen, 
  setIsMobileOpen,
  onLogout 
}) => {
  const isAdmin = currentUser?.role === 'admin';
  const isPadre = currentUser?.role === 'padre';

  let menuItems = [
    { id: 'dashboard', label: 'Tablero General', icon: LayoutGrid, section: 'PANEL PRINCIPAL' },
    { id: 'entradas', label: 'Entradas', icon: Ticket, section: 'MÓDULOS OPERATIVOS' },
    { id: 'cantina', label: 'Cantina', icon: UtensilsCrossed, section: 'MÓDULOS OPERATIVOS' },
    { id: 'gastos_partido', label: 'Gastos del Partido', icon: Receipt, section: 'MÓDULOS OPERATIVOS' },
    { id: 'partidos', label: 'Detalle de Partidos', icon: Trophy, section: 'MÓDULOS OPERATIVOS' },
    { id: 'sponsors', label: 'Sponsors', icon: Award, section: 'GESTIÓN INSTITUCIONAL' },
    { id: 'rendicion', label: 'Rendición al Club', icon: Landmark, section: 'GESTIÓN INSTITUCIONAL' },
    { id: 'gastos', label: 'Gastos y Salidas', icon: Building2, section: 'GESTIÓN INSTITUCIONAL' },
  ];

  // Restricciones estrictas para el rol Padre:
  // 1. Ocultar completamente la sección de GESTIÓN INSTITUCIONAL (Sponsors, Rendición, Gastos)
  // 2. En MÓDULOS OPERATIVOS, ocultar Entradas, Cantina y Gastos del Partido; habilitar únicamente Detalle de Partidos
  if (isPadre) {
    menuItems = menuItems.filter(item => item.id === 'dashboard' || item.id === 'partidos');
  }

  if (isAdmin) {
    menuItems.push({
      id: 'usuarios',
      label: 'Aprobación de Usuarios',
      icon: UserCheck,
      section: 'ADMINISTRACIÓN',
      badge: pendingCount > 0 ? pendingCount : null
    });
  }

  const handleSelectTab = (id) => {
    setActiveTab(id);
    if (setIsMobileOpen) setIsMobileOpen(false);
  };

  return (
    <>
      {/* Fondo oscuro móvil */}
      {isMobileOpen && (
        <div className="sidebar-backdrop" onClick={() => setIsMobileOpen(false)} />
      )}

      <aside className={`sidebar ${isMobileOpen ? 'open' : ''}`}>
        {/* Cabecera del Club */}
        <div className="sidebar-header">
          <img 
            src="/escudo.png" 
            alt="Escudo San Martín" 
            className="brand-logo-img"
          />
          <div style={{ flex: 1 }}>
            <div className="brand-title">HOCKEY SAN MARTIN</div>
            <div className="brand-subtitle">A.C.S.M. • GESTIÓN</div>
          </div>
          {isMobileOpen && (
            <button 
              className="btn-icon-only" 
              onClick={() => setIsMobileOpen(false)}
              style={{ border: 'none', background: 'transparent' }}
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Buscador Rápido tipo Fintrixity */}
        <div className="sidebar-search-box">
          <div className="search-input-wrapper">
            <Search size={15} className="search-icon" />
            <input type="text" placeholder="Buscar módulo..." readOnly onClick={() => {}} />
            <span className="search-shortcut">⌘K</span>
          </div>
        </div>

        {/* Lista de Navegación */}
        <nav className="sidebar-nav">
          {menuItems.map((item, index) => {
            const showSectionTitle = index === 0 || menuItems[index - 1].section !== item.section;
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <React.Fragment key={item.id}>
                {showSectionTitle && (
                  <div className="nav-section-title">{item.section}</div>
                )}
                <button
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => handleSelectTab(item.id)}
                >
                  <div className="nav-item-content">
                    <Icon size={18} className="nav-icon" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="nav-badge">{item.badge}</span>
                  )}
                </button>
              </React.Fragment>
            );
          })}
        </nav>

        {/* Pie de Sidebar con Información de Rol y Salida */}
        <div className="sidebar-footer">
          <div className="user-profile-card">
            <div className="user-avatar">
              {currentUser?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="user-info">
              <div className="user-name">{currentUser?.full_name}</div>
              <span className="user-role-tag">
                {currentUser?.role === 'admin' && '👑 Administrador'}
                {currentUser?.role === 'tesorero' && '💼 Tesorero'}
                {currentUser?.role === 'delegado' && '📋 Delegado'}
                {currentUser?.role === 'padre' && '👀 Padre (Lectura)'}
              </span>
            </div>
            <button 
              onClick={onLogout} 
              className="btn-icon-only" 
              title="Cerrar sesión"
              style={{ padding: '6px', border: 'none', background: 'transparent' }}
            >
              <LogOut size={16} color="var(--text-muted)" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
