import React, { useState } from 'react';
import { 
  UserCheck, 
  UserX, 
  Shield, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  Search,
  Lock,
  Sparkles
} from 'lucide-react';
import { formatDate } from '../lib/exportUtils';
import confetti from 'canvas-confetti';

export const UserManagementModule = ({ profiles, onApproveUser, onRejectUser, onUpdateRole }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const pendingUsers = profiles.filter(p => p.status === 'pending');
  const activeUsers = profiles.filter(p => p.status === 'approved');
  const rejectedUsers = profiles.filter(p => p.status === 'rejected');

  const filteredActive = activeUsers.filter(u => 
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleApprove = async (userId, targetRole) => {
    await onApproveUser(userId, targetRole);
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 }
    });
  };

  const handleReject = async (userId) => {
    if (window.confirm('¿Seguro que deseas rechazar la solicitud de este usuario?')) {
      await onRejectUser(userId);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Administración y Aprobación de Cuentas</h1>
          <p className="page-description">
            Control estricto de seguridad: autoriza el ingreso de nuevos usuarios y asigna los roles oficiales del club.
          </p>
        </div>

        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          borderRadius: '12px',
          background: 'rgba(229, 37, 42, 0.15)',
          border: '1px solid rgba(229, 37, 42, 0.3)',
          color: 'var(--club-red)',
          fontWeight: 700,
          fontSize: '0.85rem'
        }}>
          <Shield size={16} /> Panel Exclusivo de Administrador
        </div>
      </div>

      {/* 1. SECCIÓN CRÍTICA: SOLICITUDES PENDIENTES */}
      <div className="card" style={{ 
        marginBottom: '28px', 
        borderColor: pendingUsers.length > 0 ? 'rgba(245, 158, 11, 0.5)' : 'var(--border-subtle)',
        boxShadow: pendingUsers.length > 0 ? '0 10px 30px rgba(245, 158, 11, 0.15)' : 'none'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(245, 158, 11, 0.2)',
              color: 'var(--color-warning)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Clock size={20} />
            </div>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff' }}>
                Solicitudes de Nuevos Usuarios Pendientes ({pendingUsers.length})
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Ningún usuario puede ver balances ni cargar datos hasta que tú lo apruebes.
              </div>
            </div>
          </div>

          {pendingUsers.length > 0 && (
            <span className="badge badge-pending">
              {pendingUsers.length} REQUIEREN REVISIÓN
            </span>
          )}
        </div>

        {pendingUsers.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '30px',
            background: 'var(--bg-input)',
            borderRadius: '12px',
            border: '1px dashed var(--border-subtle)'
          }}>
            <CheckCircle2 size={32} color="var(--color-success)" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff' }}>
              No hay solicitudes pendientes en este momento
            </div>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              Todas las cuentas registradas han sido procesadas o autorizadas.
            </div>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nombre y Correo</th>
                  <th>Fecha Registro</th>
                  <th>Rol Solicitado</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'right' }}>Acción de Autorización</th>
                </tr>
              </thead>
              <tbody>
                {pendingUsers.map((user) => (
                  <tr key={user.id} style={{ background: 'rgba(245, 158, 11, 0.04)' }}>
                    <td>
                      <div style={{ fontWeight: 700, color: '#ffffff' }}>{user.full_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{user.email}</div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {formatDate(user.created_at)}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        background: user.role === 'delegado' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                        color: user.role === 'delegado' ? 'var(--color-info)' : 'var(--text-secondary)',
                        textTransform: 'uppercase'
                      }}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-pending">
                        ⏳ En Espera
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        {/* Aprobar con el rol solicitado */}
                        <button
                          className="btn btn-primary"
                          style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                          onClick={() => handleApprove(user.id, user.role)}
                          title="Aprobar cuenta"
                        >
                          <UserCheck size={14} /> Aprobar como {user.role.toUpperCase()}
                        </button>

                        {/* O cambiar de rol si correspondiera */}
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                          onClick={() => {
                            const newRole = user.role === 'padre' ? 'delegado' : 'padre';
                            handleApprove(user.id, newRole);
                          }}
                          title="Aprobar con rol opuesto"
                        >
                          Aprobar como {user.role === 'padre' ? 'DELEGADO' : 'PADRE'}
                        </button>

                        {/* Rechazar */}
                        <button
                          className="btn btn-danger"
                          style={{ padding: '6px 10px' }}
                          onClick={() => handleReject(user.id)}
                          title="Rechazar solicitud"
                        >
                          <UserX size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 2. USUARIOS ACTIVOS Y GESTIÓN DE ROLES */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff' }}>
              Usuarios Autorizados en el Sistema ({activeUsers.length})
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Puedes promover a Tesorero, Administrador o ajustar permisos en cualquier momento.
            </div>
          </div>

          <div className="search-input-wrapper" style={{ width: '240px' }}>
            <Search size={14} className="search-icon" />
            <input 
              type="text" 
              placeholder="Buscar usuario..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ padding: '7px 12px 7px 32px', fontSize: '0.8rem' }}
            />
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Correo Electrónico</th>
                <th>Rol Actual</th>
                <th>Permisos Otorgados</th>
                <th>Cambiar Rol</th>
              </tr>
            </thead>
            <tbody>
              {filteredActive.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: u.role === 'admin' ? 'var(--club-red-gradient)' : 'var(--bg-input)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.78rem'
                      }}>
                        {u.full_name?.charAt(0) || 'U'}
                      </div>
                      <span style={{ fontWeight: 700, color: '#ffffff' }}>{u.full_name}</span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{u.email}</span>
                  </td>
                  <td>
                    <span style={{
                      fontWeight: 800,
                      fontSize: '0.74rem',
                      color: u.role === 'admin' ? 'var(--club-red)' : u.role === 'tesorero' ? 'var(--color-success)' : u.role === 'delegado' ? 'var(--color-info)' : 'var(--text-secondary)',
                      textTransform: 'uppercase'
                    }}>
                      {u.role === 'admin' && '👑 Administrador'}
                      {u.role === 'tesorero' && '💼 Tesorero'}
                      {u.role === 'delegado' && '📋 Delegado'}
                      {u.role === 'padre' && '👀 Padre'}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      {u.role === 'admin' && 'Control total, aprobación de usuarios y borrado'}
                      {u.role === 'tesorero' && 'Carga total, sponsors, gastos y borrado de errores'}
                      {u.role === 'delegado' && 'Carga y edición de Entradas y Cantina'}
                      {u.role === 'padre' && 'Solo lectura de informes y gráficos'}
                    </span>
                  </td>
                  <td>
                    <select
                      className="form-select"
                      style={{ padding: '4px 10px', fontSize: '0.78rem', width: 'auto' }}
                      value={u.role}
                      onChange={e => onUpdateRole(u.id, e.target.value)}
                    >
                      <option value="padre">Padre (Solo Lectura)</option>
                      <option value="delegado">Delegado (Entradas/Cantina)</option>
                      <option value="tesorero">Tesorero (Financiero)</option>
                      <option value="admin">Administrador (Total)</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
