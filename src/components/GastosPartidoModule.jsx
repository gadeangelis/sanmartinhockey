import React, { useState } from 'react';
import {
  Plus,
  Trophy,
  Trash2,
  Camera,
  Eye,
  AlertCircle,
  Receipt
} from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/exportUtils';
import { RIVALES, getRivalInfo } from '../lib/rivales';
import { clubApi } from '../lib/supabase';
import confetti from 'canvas-confetti';

export const GastosPartidoModule = ({ gastos, currentUser, onAddGasto, onDeleteGasto, onPreviewImage }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State — siempre asociado a un partido
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [rival, setRival] = useState('murialdo');
  const [division, setDivision] = useState('SENIOR');
  const [motivoCategoria, setMotivoCategoria] = useState('Arbitrajes');
  const [monto, setMonto] = useState('');
  const [medioPago, setMedioPago] = useState('Efectivo');
  const [proveedor, setProveedor] = useState('');
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Solo gastos vinculados a partidos
  const gastosPartido = gastos.filter(g => !!g.rival);

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
      setErrorMsg('Debes ingresar un monto válido.');
      return;
    }

    try {
      setIsSubmitting(true);
      let fotoUrl = null;
      if (photoFile) {
        fotoUrl = await clubApi.uploadImage(photoFile);
      }

      // Normalizar rival a ID para consistencia con el resto del sistema
      const rivalId = getRivalInfo(rival).id;

      const newGasto = {
        fecha,
        motivo_categoria: motivoCategoria,
        monto: parseFloat(monto),
        medio_pago: medioPago,
        proveedor: proveedor.trim(),
        foto_url: fotoUrl,
        rival: rivalId,
        division,
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
          <h1 className="page-title">Gastos del Partido</h1>
          <p className="page-description">
            Registro de costos operativos por jornada: árbitros, planilleros, viáticos y otros egresos asociados a cada encuentro.
          </p>
        </div>

        {canManage ? (
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} />
            <span>Registrar Gasto de Partido</span>
          </button>
        ) : (
          <div style={{
            fontSize: '0.78rem', padding: '6px 12px', borderRadius: '8px',
            background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)'
          }}>
            👀 Modo Solo Lectura
          </div>
        )}
      </div>

      {/* Info contextual */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px',
        borderRadius: '12px', background: 'rgba(229,37,42,0.07)', border: '1px solid rgba(229,37,42,0.2)',
        marginBottom: '20px', fontSize: '0.8rem', color: 'var(--text-secondary)'
      }}>
        <Trophy size={16} color="var(--club-red)" style={{ flexShrink: 0 }} />
        <span>
          Todos los gastos aquí registrados se <strong style={{ color: '#ffffff' }}>vinculan a un partido específico</strong> y se reflejan automáticamente en el módulo <strong style={{ color: '#ffffff' }}>Detalle de Partidos</strong> y en el Tablero General.
        </span>
      </div>

      {/* Historial de Gastos por Partido */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff' }}>
              Egresos Registrados por Jornada ({gastosPartido.length})
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Gastos operativos vinculados a partidos y fechas deportivas
            </div>
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Partido / Jornada</th>
                <th>Categoría / Motivo</th>
                <th>Proveedor</th>
                <th>Medio de Pago</th>
                <th>Monto Egresado</th>
                <th>Comprobante</th>
                <th>Auditoría</th>
                {canManage && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {gastosPartido.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 9 : 8} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No se han registrado gastos de partido aún.
                  </td>
                </tr>
              ) : (
                gastosPartido.map((g) => {
                  const rivalInfo = getRivalInfo(g.rival);
                  return (
                    <tr key={g.id}>
                      <td>
                        <span style={{ fontWeight: 700, color: '#ffffff' }}>{formatDate(g.fecha)}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <img
                            src={rivalInfo.image}
                            alt={rivalInfo.name}
                            style={{ width: '26px', height: '26px', objectFit: 'contain', flexShrink: 0 }}
                            onError={e => { e.target.style.display = 'none'; }}
                          />
                          <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff' }}>vs {rivalInfo.name}</div>
                            <span className={`badge ${g.division === 'SENIOR' ? 'badge-senior' : 'badge-inferiores'}`} style={{ fontSize: '0.62rem', display: 'inline-block' }}>
                              {g.division || 'SENIOR'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.85rem' }}>
                          {g.motivo_categoria}
                        </div>
                      </td>
                      <td>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                          {g.proveedor || '-'}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          fontSize: '0.75rem', fontWeight: 700,
                          color: g.medio_pago === 'Transferencia' ? 'var(--club-red)' : 'var(--color-success)'
                        }}>
                          {g.medio_pago}
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
                            <Eye size={12} /> Ver
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Sin adjunto</span>
                        )}
                      </td>
                      <td>
                        <div style={{ fontSize: '0.78rem', color: '#ffffff' }}>{g.created_by_name}</div>
                        <span style={{ fontSize: '0.65rem', color: 'var(--club-red)', textTransform: 'uppercase', fontWeight: 700 }}>
                          {g.created_by_role}
                        </span>
                      </td>
                      {canManage && (
                        <td>
                          <button
                            className="btn btn-danger"
                            style={{ padding: '6px' }}
                            title="Anular gasto"
                            onClick={() => {
                              if (window.confirm('¿Seguro que deseas anular este gasto de partido?')) {
                                onDeleteGasto(g.id);
                              }
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Carga de Gasto de Partido */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '580px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: 'var(--color-danger-bg)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', color: 'var(--color-danger)'
                }}>
                  <Trophy size={18} />
                </div>
                <div>
                  <h3 className="modal-title">Gasto del Partido</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Costo operativo vinculado a una jornada específica
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {errorMsg && (
                  <div style={{
                    padding: '10px 14px', borderRadius: '8px', background: 'var(--color-danger-bg)',
                    border: '1px solid rgba(244,63,94,0.3)', color: 'var(--color-danger)',
                    fontSize: '0.8rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px'
                  }}>
                    <AlertCircle size={16} /> {errorMsg}
                  </div>
                )}

                {/* Identificación del Partido */}
                <div style={{
                  padding: '14px 16px', borderRadius: '12px',
                  background: 'rgba(229,37,42,0.07)', border: '1px solid rgba(229,37,42,0.25)',
                  marginBottom: '16px'
                }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--club-red)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Trophy size={14} /> Datos del Partido
                  </div>
                  <div className="form-row" style={{ marginBottom: 0 }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Fecha del Partido</label>
                      <input type="date" className="form-input" value={fecha} onChange={e => setFecha(e.target.value)} required />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">División</label>
                      <select className="form-select" value={division} onChange={e => setDivision(e.target.value)}>
                        <option value="SENIOR">SENIOR</option>
                        <option value="INFERIORES">INFERIORES</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group" style={{ marginTop: '10px', marginBottom: 0 }}>
                    <label className="form-label">Club Rival</label>
                    <select className="form-select" value={rival} onChange={e => setRival(e.target.value)}>
                      {RIVALES.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Detalle del Gasto */}
                <div className="form-group">
                  <label className="form-label">Motivo / Categoría del Gasto</label>
                  <select className="form-select" value={motivoCategoria} onChange={e => setMotivoCategoria(e.target.value)}>
                    <option value="Arbitrajes">Arbitrajes</option>
                    <option value="Planilleros y Personal de Cancha">Planilleros y Personal de Cancha</option>
                    <option value="Viáticos y Transporte">Viáticos y Transporte</option>
                    <option value="Material Deportivo (Bocha, Conos, Palos)">Material Deportivo</option>
                    <option value="Seguros y Emergencias">Seguros y Emergencias</option>
                    <option value="Otro">Otro Gasto del Partido</option>
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Monto ($)</label>
                    <input
                      type="number" className="form-input" placeholder="Ej. 54000"
                      value={monto} onChange={e => setMonto(e.target.value)} required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Medio de Pago</label>
                    <select className="form-select" value={medioPago} onChange={e => setMedioPago(e.target.value)}>
                      <option value="Efectivo">Efectivo de Caja</option>
                      <option value="Transferencia">Transferencia Bancaria</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Proveedor / Destinatario</label>
                  <input
                    type="text" className="form-input" placeholder="Ej. Colegio de Árbitros de Hockey"
                    value={proveedor} onChange={e => setProveedor(e.target.value)}
                  />
                </div>

                {/* Comprobante */}
                <div className="form-group">
                  <label className="form-label">Comprobante Digital (Opcional)</label>
                  <label className="photo-upload-box" style={{ display: 'block' }}>
                    <input type="file" accept="image/*" capture="environment" onChange={handlePhotoCapture} style={{ display: 'none' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                      <Camera size={26} color="var(--club-red)" />
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#ffffff' }}>
                        {photoFile ? 'Cambiar archivo / foto' : 'Tomar foto o subir comprobante'}
                      </span>
                    </div>
                    {photoPreview && <img src={photoPreview} alt="Previsualización" className="photo-preview-img" />}
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Guardando...' : 'Registrar Gasto del Partido'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
