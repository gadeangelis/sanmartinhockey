import React, { useState } from 'react';
import {
  Plus,
  UtensilsCrossed,
  Camera,
  Trash2,
  Eye,
  Calendar,
  Users,
  Clock,
  AlertCircle,
  Receipt
} from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/exportUtils';
import { clubApi } from '../lib/supabase';
import { RIVALES, getRivalInfo } from '../lib/rivales';
import { RivalItem } from './RivalItem';
import confetti from 'canvas-confetti';

export const CantinaModule = ({ cantina, currentUser, onAddCantina, onDeleteCantina, onPreviewImage }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [rival, setRival] = useState('murialdo'); // Selector oficial de rivales
  const [division, setDivision] = useState('SENIOR');
  const [totalVentas, setTotalVentas] = useState('');
  const [efectivo, setEfectivo] = useState('');
  const [transferencia, setTransferencia] = useState('');
  const [notas, setNotas] = useState('');
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Permisos (Tesorero y Admin pueden crear/eliminar; Delegado y Padre son Solo Lectura)
  const canCreate = ['tesorero', 'admin'].includes(currentUser?.role);
  const canDelete = ['tesorero', 'admin'].includes(currentUser?.role);

  // Carga rápida de totales
  const handleTotalChange = (val) => {
    setTotalVentas(val);
  };

  const handleQuickPay = (type) => {
    const tot = parseFloat(totalVentas) || 0;
    if (type === 'all_cash') {
      setEfectivo(tot.toString());
      setTransferencia('0');
    } else if (type === 'all_transfer') {
      setTransferencia(tot.toString());
      setEfectivo('0');
    }
  };

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

    if (!rival.trim()) {
      setErrorMsg('Debes ingresar el Rival de la jornada.');
      return;
    }

    const tot = parseFloat(totalVentas) || 0;
    const ef = parseFloat(efectivo) || 0;
    const tr = parseFloat(transferencia) || 0;

    if (tot <= 0) {
      setErrorMsg('El total de ventas debe ser mayor a $0.');
      return;
    }

    if (ef + tr !== tot) {
      setErrorMsg(`La suma de Efectivo ($${ef}) y Transferencia ($${tr}) debe igualar las Ventas Totales ($${tot}).`);
      return;
    }

    try {
      setIsSubmitting(true);
      let fotoUrl = null;
      if (photoFile) {
        fotoUrl = await clubApi.uploadImage(photoFile);
      }

      const newRecord = {
        fecha,
        rival: getRivalInfo(rival).name,
        division,
        total_ventas: tot,
        efectivo: ef,
        transferencia: tr,
        notas: notas.trim(),
        foto_url: fotoUrl
      };

      await onAddCantina(newRecord);

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });

      // Reset
      setIsModalOpen(false);
      setRival('murialdo');
      setTotalVentas('');
      setEfectivo('');
      setTransferencia('');
      setNotas('');
      setPhotoPreview(null);
      setPhotoFile(null);
    } catch (err) {
      setErrorMsg('Error al registrar cierre de cantina: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Módulo de Cantina</h1>
          <p className="page-description">
            Cierres de caja por partido, recaudación en efectivo y transferencias, y respaldo fotográfico de caja.
          </p>
        </div>

        {canCreate ? (
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} />
            <span>Registrar Cierre de Cantina</span>
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

      {/* Historial de Cierres de Caja */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff' }}>
            Historial de Cierres de Cantina ({cantina.length})
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha y Rival</th>
                <th>División</th>
                <th>Ventas Totales</th>
                <th>Desglose Pago</th>
                <th>Notas / Detalle</th>
                <th>Ticket / Foto</th>
                <th>Auditoría</th>
                {canDelete && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {cantina.length === 0 ? (
                <tr>
                  <td colSpan={canDelete ? 8 : 7} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No hay registros de cantina aún.
                  </td>
                </tr>
              ) : (
                cantina.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <RivalItem rival={c.rival} subtitle={formatDate(c.fecha)} size={28} />
                    </td>
                    <td>
                      <span className={`badge ${c.division === 'SENIOR' ? 'badge-senior' : 'badge-inferiores'}`}>
                        {c.division}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 800, color: 'var(--color-success)', fontSize: '0.95rem' }}>
                        {formatCurrency(c.total_ventas)}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.76rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Efectivo:</span> <strong>{formatCurrency(c.efectivo)}</strong>
                      </div>
                      <div style={{ fontSize: '0.76rem' }}>
                        <span style={{ color: 'var(--club-red)' }}>Transf:</span> <strong>{formatCurrency(c.transferencia)}</strong>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', maxWidth: '200px' }}>
                        {c.notas || '-'}
                      </div>
                    </td>
                    <td>
                      {c.foto_url ? (
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                          onClick={() => onPreviewImage(c.foto_url, `Comprobante Cantina: ${getRivalInfo(c.rival).name}`)}
                        >
                          <Eye size={12} /> Ver Ticket
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Sin ticket</span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: '0.78rem', color: '#ffffff' }}>{c.created_by_name}</div>
                      <span style={{
                        fontSize: '0.65rem',
                        color: 'var(--club-red)',
                        textTransform: 'uppercase',
                        fontWeight: 700
                      }}>
                        {c.created_by_role}
                      </span>
                    </td>
                    {canDelete && (
                      <td>
                        <button
                          className="btn btn-danger"
                          style={{ padding: '6px' }}
                          title="Eliminar registro erróneo"
                          onClick={() => {
                            if (window.confirm('¿Seguro que deseas eliminar este registro de cantina?')) {
                              onDeleteCantina(c.id);
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

      {/* Modal de Cierre de Cantina */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '620px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'var(--club-red-gradient)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff'
                }}>
                  <UtensilsCrossed size={18} />
                </div>
                <div>
                  <h3 className="modal-title">Cierre de Caja de Cantina</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Carga del turno con desglose y foto de comprobante
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {errorMsg && (
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'var(--color-danger-bg)',
                    border: '1px solid rgba(244, 63, 94, 0.3)',
                    color: 'var(--color-danger)',
                    fontSize: '0.8rem',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <AlertCircle size={16} /> {errorMsg}
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Fecha</label>
                    <input
                      type="date"
                      className="form-input"
                      value={fecha}
                      onChange={e => setFecha(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Equipo Rival</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        background: 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        flexShrink: 0
                      }}>
                        <img
                          src={`/escudos-rivales/${rival}.jpg`}
                          alt="Escudo Rival"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                      </div>
                      <select
                        className="form-select"
                        value={rival}
                        onChange={e => setRival(e.target.value)}
                        required
                      >
                        {RIVALES.map(r => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">División</label>
                  <select
                    className="form-select"
                    value={division}
                    onChange={e => setDivision(e.target.value)}
                  >
                    <option value="SENIOR">SENIOR </option>
                    <option value="INFERIORES">INFERIORES </option>
                  </select>
                </div>

                {/* Total de Ventas */}
                <div className="form-group">
                  <label className="form-label">Ventas Totales de Cantina ($)</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="0"
                    value={totalVentas}
                    onChange={e => handleTotalChange(e.target.value)}
                    required
                  />
                </div>

                {/* Desglose de Medios de Pago */}
                <div style={{ marginBottom: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label className="form-label" style={{ margin: 0 }}>
                      Desglose de Caja (Efectivo y Transferencia)
                    </label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ fontSize: '0.7rem', padding: '3px 8px' }}
                        onClick={() => handleQuickPay('all_cash')}
                      >
                        Todo Efectivo
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ fontSize: '0.7rem', padding: '3px 8px' }}
                        onClick={() => handleQuickPay('all_transfer')}
                      >
                        Todo Transferencia
                      </button>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ color: 'var(--color-success)' }}>
                        Efectivo en Caja ($)
                      </label>
                      <input
                        type="number"
                        className="form-input"
                        placeholder="0"
                        value={efectivo}
                        onChange={e => setEfectivo(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ color: 'var(--club-red)' }}>
                        Cobrado por Transferencia ($)
                      </label>
                      <input
                        type="number"
                        className="form-input"
                        placeholder="0"
                        value={transferencia}
                        onChange={e => setTransferencia(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Notas */}
                <div className="form-group">
                  <label className="form-label">Observaciones / Resumen de Stock</label>
                  <textarea
                    className="form-textarea"
                    rows={2}
                    placeholder="Ej. Gran venta de hamburguesas, bebidas y cafetería. Faltó reposición de agua saborizada."
                    value={notas}
                    onChange={e => setNotas(e.target.value)}
                  />
                </div>

                {/* Respaldo Fotográfico (Cámara Móvil / Ticket Físico) */}
                <div className="form-group">
                  <label className="form-label">
                    Foto del Ticket o Planilla de Caja Física
                  </label>
                  <label className="photo-upload-box" style={{ display: 'block' }}>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoCapture}
                      style={{ display: 'none' }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                      <Camera size={26} color="var(--club-red)" />
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#ffffff' }}>
                        {photoFile ? 'Cambiar foto de ticket' : 'Capturar ticket físico con la cámara'}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Respaldo transparente para auditoría
                      </span>
                    </div>

                    {photoPreview && (
                      <img
                        src={photoPreview}
                        alt="Previsualización"
                        className="photo-preview-img"
                      />
                    )}
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Guardando...' : 'Guardar Cierre de Cantina'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
