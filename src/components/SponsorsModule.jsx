import React, { useState } from 'react';
import { 
  Plus, 
  Award, 
  Trash2, 
  DollarSign, 
  Calendar, 
  CheckCircle2, 
  AlertCircle,
  Building,
  Tag
} from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/exportUtils';
import confetti from 'canvas-confetti';

export const SponsorsModule = ({ sponsors, currentUser, onAddSponsor, onDeleteSponsor }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState('Baranda Grande');
  const [monto, setMonto] = useState('');
  const [medioPago, setMedioPago] = useState('Transferencia');
  const [vigencia, setVigencia] = useState('Temporada 2026 (Anual)');
  const [estado, setEstado] = useState('Activo');
  const [notas, setNotas] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Exclusivo Tesorero / Admin
  const canManage = ['tesorero', 'admin'].includes(currentUser?.role);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!nombre.trim() || !monto) {
      setErrorMsg('Nombre de sponsor y monto son obligatorios.');
      return;
    }

    try {
      setIsSubmitting(true);
      const newSponsor = {
        nombre: nombre.trim(),
        tipo,
        monto: parseFloat(monto) || 0,
        medio_pago: medioPago,
        vigencia: vigencia.trim(),
        estado,
        notas: notas.trim()
      };

      await onAddSponsor(newSponsor);

      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.7 }
      });

      setIsModalOpen(false);
      setNombre('');
      setMonto('');
      setNotas('');
    } catch (err) {
      setErrorMsg('Error al registrar sponsor: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Módulo de Sponsors y Patrocinios</h1>
          <p className="page-description">
            Acuerdos comerciales y convenios publicitarios del club (Gestión exclusiva Tesorero / Administrador).
          </p>
        </div>

        {canManage ? (
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} />
            <span>Nuevo Acuerdo de Sponsor</span>
          </button>
        ) : (
          <div style={{
            fontSize: '0.78rem',
            padding: '6px 12px',
            borderRadius: '8px',
            background: 'rgba(255,255,255,0.06)',
            color: 'var(--text-secondary)'
          }}>
            👀 Solo Lectura (Exclusivo Tesorería / Admin para edición)
          </div>
        )}
      </div>

      {/* Lista de Sponsors */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff' }}>
            Convenios Registrados ({sponsors.length})
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Empresa / Patrocinador</th>
                <th>Espacio Publicitario</th>
                <th>Monto Acordado</th>
                <th>Medio de Cobro</th>
                <th>Vigencia</th>
                <th>Estado</th>
                <th>Auditoría</th>
                {canManage && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {sponsors.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 8 : 7} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No hay sponsors registrados aún.
                  </td>
                </tr>
              ) : (
                sponsors.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.9rem' }}>
                        {s.nombre}
                      </div>
                      {s.notas && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {s.notas}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Tag size={13} color="var(--club-red)" />
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.tipo}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 800, color: 'var(--color-success)', fontSize: '0.95rem' }}>
                        {formatCurrency(s.monto)}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: s.medio_pago === 'Transferencia' ? 'var(--club-red)' : 'var(--color-success)'
                      }}>
                        {s.medio_pago}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {s.vigencia || '-'}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-approved">
                        {s.estado || 'Activo'}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.78rem', color: '#ffffff' }}>{s.created_by_name}</div>
                      <span style={{
                        fontSize: '0.65rem',
                        color: 'var(--club-red)',
                        textTransform: 'uppercase',
                        fontWeight: 700
                      }}>
                        {s.created_by_role}
                      </span>
                    </td>
                    {canManage && (
                      <td>
                        <button
                          className="btn btn-danger"
                          style={{ padding: '6px' }}
                          title="Eliminar convenio"
                          onClick={() => {
                            if (window.confirm(`¿Deseas eliminar el acuerdo con ${s.nombre}?`)) {
                              onDeleteSponsor(s.id);
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

      {/* Modal de Carga de Sponsors */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '580px' }}>
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
                  <Award size={18} />
                </div>
                <div>
                  <h3 className="modal-title">Registrar Nuevo Sponsor</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Acuerdo publicitario para Hockey San Martín
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

                <div className="form-group">
                  <label className="form-label">Nombre de la Empresa o Marca</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Ej. Bodega San Martín, Pinturerías Cuyo" 
                    value={nombre}
                    onChange={e => setNombre(e.target.value)}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Tipología de Publicidad</label>
                    <select 
                      className="form-select"
                      value={tipo}
                      onChange={e => setTipo(e.target.value)}
                    >
                      <option value="Baranda Grande">Baranda Grande</option>
                      <option value="Baranda Chica">Baranda Chica</option>
                      <option value="Pantalla LED">Pantalla LED</option>
                      <option value="Camiseta / Indumentaria">Camiseta / Indumentaria</option>
                      <option value="Banner Digital">Banner Digital</option>
                      <option value="Otro">Otro espacio</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Monto del Convenio ($)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      placeholder="Ej. 250000"
                      value={monto}
                      onChange={e => setMonto(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Medio de Pago</label>
                    <select 
                      className="form-select"
                      value={medioPago}
                      onChange={e => setMedioPago(e.target.value)}
                    >
                      <option value="Transferencia">Transferencia (Cuenta Club)</option>
                      <option value="Efectivo">Efectivo</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Vigencia del Acuerdo</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Ej. Temporada 2026 (Anual)"
                      value={vigencia}
                      onChange={e => setVigencia(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Observaciones o Ubicación</label>
                  <textarea 
                    className="form-textarea" 
                    rows={2}
                    placeholder="Ej. Baranda tribuna preferencial sobre línea lateral."
                    value={notas}
                    onChange={e => setNotas(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Registrando...' : 'Registrar Sponsor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
