import React, { useState } from 'react';
import {
  Plus,
  Receipt,
  Trash2,
  Camera,
  Eye,
  AlertCircle,
  Building2
} from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/exportUtils';
import { clubApi } from '../lib/supabase';
import confetti from 'canvas-confetti';

export const GastosModule = ({ gastos, currentUser, onAddGasto, onDeleteGasto, onPreviewImage, fondoSponsors = 0 }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State — gastos generales del club (sin asociación a partido)
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [motivoCategoria, setMotivoCategoria] = useState('Reparaciones y Mantenimiento');
  const [monto, setMonto] = useState('');
  const [medioPago, setMedioPago] = useState('Transferencia');
  const [proveedor, setProveedor] = useState('');
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Solo gastos GENERALES (sin rival asociado)
  const gastosGenerales = gastos.filter(g => !g.rival);

  // Permisos: Solo Tesorero y Admin
  const canManage = ['tesorero', 'admin'].includes(currentUser?.role);

  const handlePhotoCapture = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = () => setPhotoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!monto || parseFloat(monto) <= 0) {
      setErrorMsg('Debes ingresar un monto válido de gasto.');
      return;
    }

    try {
      setIsSubmitting(true);
      let fotoUrl = null;
      if (photoFile) {
        fotoUrl = await clubApi.uploadImage(photoFile);
      }

      const newGasto = {
        fecha,
        motivo_categoria: motivoCategoria,
        monto: parseFloat(monto),
        medio_pago: medioPago,
        proveedor: proveedor.trim(),
        foto_url: fotoUrl,
        // Sin rival ni division — es un gasto general del club
        rival: null,
        division: null
      };

      await onAddGasto(newGasto);

      confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 } });

      setIsModalOpen(false);
      setMonto('');
      setProveedor('');
      setPhotoPreview(null);
      setPhotoFile(null);
    } catch (err) {
      setErrorMsg('Error al registrar gasto: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Gastos y Salidas del Club</h1>
          <p className="page-description">
            Egresos generales e institucionales: mantenimiento, licencias, seguros y materiales deportivos.
          </p>
        </div>

        {canManage ? (
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} />
            <span>Registrar Gasto General</span>
          </button>
        ) : (
          <div style={{
            fontSize: '0.78rem',
            padding: '6px 12px',
            borderRadius: '8px',
            background: 'rgba(255,255,255,0.06)',
            color: 'var(--text-secondary)'
          }}>
            👀 Modo Solo Lectura
          </div>
        )}
      </div>

      {/* Info contextual */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '12px 16px',
        borderRadius: '12px',
        background: 'rgba(59,130,246,0.07)',
        border: '1px solid rgba(59,130,246,0.2)',
        marginBottom: '20px',
        fontSize: '0.8rem',
        color: 'var(--text-secondary)'
      }}>
        <Building2 size={16} color="#3b82f6" style={{ flexShrink: 0 }} />
        <span>
          Este módulo es exclusivo para <strong style={{ color: '#ffffff' }}>gastos institucionales del club</strong> (mantenimiento, licencias, seguros, etc.).
          Los pagos de árbitros y gastos operativos de partidos se gestionan en <strong style={{ color: '#ffffff' }}>Gastos del Partido</strong>.
        </span>
      </div>

      {/* Historial de Gastos Generales */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff' }}>
              Historial de Egresos Institucionales ({gastosGenerales.length})
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Solo gastos generales del club — sin asociación a jornada deportiva
            </div>
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Categoría / Motivo</th>
                <th>Proveedor / Beneficiario</th>
                <th>Medio de Pago</th>
                <th>Monto Egresado</th>
                <th>Comprobante</th>
                <th>Auditoría</th>
                {canManage && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {gastosGenerales.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 8 : 7} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No se han registrado gastos generales aún.
                  </td>
                </tr>
              ) : (
                gastosGenerales.map((g) => (
                  <tr key={g.id}>
                    <td>
                      <span style={{ fontWeight: 700, color: '#ffffff' }}>{formatDate(g.fecha)}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.88rem' }}>
                        {g.motivo_categoria}
                      </div>
                    </td>
                    <td>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                        {g.proveedor ? g.proveedor.split('[MEDIO')[0].trim() : '-'}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: '6px',
                        background: g.medio_pago === 'Transferencia'
                          ? 'rgba(59, 130, 246, 0.15)'
                          : g.medio_pago === 'Efectivo de Sponsor'
                            ? 'rgba(245, 158, 11, 0.18)'
                            : 'rgba(16, 185, 129, 0.15)',
                        color: g.medio_pago === 'Transferencia'
                          ? '#60a5fa'
                          : g.medio_pago === 'Efectivo de Sponsor'
                            ? '#f59e0b'
                            : 'var(--color-success)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        whiteSpace: 'nowrap'
                      }}>
                        {g.medio_pago === 'Efectivo de Sponsor' && '🏆 '}
                        {g.medio_pago === 'Transferencia' && '🏛️ '}
                        {(g.medio_pago === 'Efectivo' || g.medio_pago === 'Efectivo de Caja') && '💵 '}
                        {g.medio_pago === 'Efectivo' ? 'Efectivo de Caja' : g.medio_pago}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 800, color: 'var(--color-danger)', fontSize: '0.95rem' }}>
                        -{formatCurrency(g.monto)}
                      </span>
                    </td>
                    <td>
                      {g.foto_url ? (
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                          onClick={() => onPreviewImage(g.foto_url, `Comprobante: ${g.motivo_categoria}`)}
                        >
                          <Eye size={12} /> Ver Factura
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Sin adjunto</span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: '0.78rem', color: '#ffffff' }}>{g.created_by_name}</div>
                      <span style={{
                        fontSize: '0.65rem',
                        color: 'var(--club-red)',
                        textTransform: 'uppercase',
                        fontWeight: 700
                      }}>
                        {g.created_by_role}
                      </span>
                    </td>
                    {canManage && (
                      <td>
                        <button
                          className="btn btn-danger"
                          style={{ padding: '6px' }}
                          title="Eliminar gasto erróneo"
                          onClick={() => {
                            if (window.confirm('¿Seguro que deseas anular este gasto?')) {
                              onDeleteGasto(g.id);
                            }
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Carga de Gasto General */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: 'var(--color-danger-bg)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', color: 'var(--color-danger)'
                }}>
                  <Receipt size={18} />
                </div>
                <div>
                  <h3 className="modal-title">Registrar Gasto Institucional</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Gastos generales del club con respaldo digital
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {errorMsg && (
                  <div style={{
                    padding: '10px 14px', borderRadius: '8px',
                    background: 'var(--color-danger-bg)', border: '1px solid rgba(244,63,94,0.3)',
                    color: 'var(--color-danger)', fontSize: '0.8rem', marginBottom: '16px',
                    display: 'flex', alignItems: 'center', gap: '8px'
                  }}>
                    <AlertCircle size={16} /> {errorMsg}
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Fecha del Gasto</label>
                    <input
                      type="date" className="form-input" value={fecha}
                      onChange={e => setFecha(e.target.value)} required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Monto ($)</label>
                    <input
                      type="number" className="form-input" placeholder="Ej. 78000"
                      value={monto} onChange={e => setMonto(e.target.value)} required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Motivo o Categoría</label>
                  <select className="form-select" value={motivoCategoria} onChange={e => setMotivoCategoria(e.target.value)}>
                    <option value="Reparaciones y Mantenimiento">Reparaciones y Mantenimiento de Cancha</option>
                    <option value="Mercaderia para Cantina">Mercaderia para Cantina</option>
                    <option value="Licencias y Federaciones">Licencias y Federaciones</option>
                    <option value="Material Deportivo (Bocha, Conos, Palos)">Material Deportivo (Bochas, Conos, Palos)</option>
                    <option value="Indumentaria y Pecheras">Indumentaria y Pecheras</option>
                    <option value="Viáticos y Transporte">Viáticos y Transporte</option>
                    <option value="Limpieza e Higiene">Limpieza e Higiene</option>
                    <option value="Gastos Administrativos">Gastos Administrativos</option>
                    <option value="Otro">Otro Gasto Institucional</option>
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Medio de Pago</label>
                    <select className="form-select" value={medioPago} onChange={e => setMedioPago(e.target.value)}>
                      <option value="Transferencia">Transferencia Bancaria</option>
                      <option value="Efectivo de Caja">Efectivo de Caja</option>
                      <option value="Efectivo de Sponsor">Efectivo de Sponsor</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Proveedor o Destinatario</label>
                    <input
                      type="text" className="form-input" placeholder="Ej. Empresa de Mantenimiento"
                      value={proveedor} onChange={e => setProveedor(e.target.value)}
                    />
                  </div>
                </div>

                {/* Aviso Informativo si paga con Efectivo de Sponsor */}
                {medioPago === 'Efectivo de Sponsor' && (
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(245, 158, 11, 0.12)',
                    border: '1px solid rgba(245, 158, 11, 0.35)',
                    marginBottom: '16px',
                    fontSize: '0.8rem',
                    color: '#f59e0b',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 800 }}>
                      <span>🏆 Fondo de Sponsor Disponible:</span>
                      <span style={{ fontSize: '0.95rem', color: '#ffffff' }}>{formatCurrency(fondoSponsors)}</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                      Este gasto se descontará únicamente de los fondos acumulados de sponsors, sin afectar la caja operativa de entradas y cantina.
                    </div>
                    {parseFloat(monto) > fondoSponsors && (
                      <div style={{ fontSize: '0.74rem', color: 'var(--color-danger)', fontWeight: 700, marginTop: '4px' }}>
                        ⚠️ El monto ingresado ({formatCurrency(parseFloat(monto) || 0)}) supera el fondo de sponsors disponible ({formatCurrency(fondoSponsors)}).
                      </div>
                    )}
                  </div>
                )}

                {/* Comprobante Digital */}
                <div className="form-group">
                  <label className="form-label">Comprobante Digital o Foto de Factura (Opcional)</label>
                  <label className="photo-upload-box" style={{ display: 'block' }}>
                    <input
                      type="file" accept="image/*" capture="environment"
                      onChange={handlePhotoCapture} style={{ display: 'none' }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                      <Camera size={26} color="var(--club-red)" />
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#ffffff' }}>
                        {photoFile ? 'Cambiar archivo / foto' : 'Tomar foto o subir comprobante'}
                      </span>
                    </div>
                    {photoPreview && (
                      <img src={photoPreview} alt="Previsualización" className="photo-preview-img" />
                    )}
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Guardando...' : 'Registrar Gasto Institucional'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
