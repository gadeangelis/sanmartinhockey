import React, { useState } from 'react';
import {
  Plus,
  Ticket,
  Camera,
  Trash2,
  Eye,
  Users,
  AlertCircle,
  Calculator,
  ChevronDown,
  ChevronUp,
  Layers
} from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/exportUtils';
import { clubApi } from '../lib/supabase';
import { RIVALES, getRivalInfo } from '../lib/rivales';
import { RivalItem } from './RivalItem';
import confetti from 'canvas-confetti';

// Estado inicial de un talonario vacío
const emptyTalonario = () => ({
  nroInicial: '',
  nroFinal: '',
  efectivo: '',
  transferencia: ''
});

// Helper para calcular la cantidad de tickets de un talonario
const calcCantidad = (t) => {
  const ini = parseInt(t.nroInicial) || 0;
  const fin = parseInt(t.nroFinal) || 0;
  return fin >= ini && fin > 0 ? fin - ini + 1 : 0;
};

export const EntradasModule = ({ entradas, currentUser, onAddEntrada, onDeleteEntrada, onPreviewImage }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Estado para el modal de detalle de una jornada agrupada
  const [selectedJornadaGroup, setSelectedJornadaGroup] = useState(null);

  // Form State para la carga
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [rival, setRival] = useState('murialdo');
  const [division, setDivision] = useState('SENIOR');
  const [torneoTipo, setTorneoTipo] = useState('APERTURA');

  // Precios independientes para cada talonario
  const [precioEntradas, setPrecioEntradas] = useState(5000);
  const [precioPlayaLocal, setPrecioPlayaLocal] = useState(1000);
  const [precioPlayaVisitante, setPrecioPlayaVisitante] = useState(5000);

  // Tres talonarios independientes
  const [talonarios, setTalonarios] = useState({
    ENTRADAS: emptyTalonario(),
    PLAYA_LOCAL: emptyTalonario(),
    PLAYA_VISITANTE: emptyTalonario()
  });

  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Permisos según el rol (Tesorero y Admin pueden crear/eliminar; Delegado y Padre son Solo Lectura)
  const canCreate = ['tesorero', 'admin'].includes(currentUser?.role);
  const canDelete = ['tesorero', 'admin'].includes(currentUser?.role);

  // Actualizar un campo de un talonario específico
  const updateTalonario = (key, field, value) => {
    setTalonarios(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value }
    }));
  };

  // Cálculos por talonario
  const talonarioKeys = ['ENTRADAS', 'PLAYA_LOCAL', 'PLAYA_VISITANTE'];
  const talonarioLabels = {
    ENTRADAS: '🎫 ENTRADAS',
    PLAYA_LOCAL: '🅿️ PLAYA LOCAL',
    PLAYA_VISITANTE: '🅿️ PLAYA VISITANTE'
  };
  const talonarioColors = {
    ENTRADAS: { bg: 'rgba(229, 37, 42, 0.1)', border: 'rgba(229, 37, 42, 0.3)', accent: 'var(--club-red)' },
    PLAYA_LOCAL: { bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.3)', accent: '#3b82f6' },
    PLAYA_VISITANTE: { bg: 'rgba(168, 85, 247, 0.1)', border: 'rgba(168, 85, 247, 0.3)', accent: '#a855f7' }
  };

  // Obtener el precio unitario correspondiente a cada talonario
  const getPrecioUnitario = (key) => {
    if (key === 'ENTRADAS') return parseFloat(precioEntradas) || 0;
    if (key === 'PLAYA_LOCAL') return parseFloat(precioPlayaLocal) || 0;
    if (key === 'PLAYA_VISITANTE') return parseFloat(precioPlayaVisitante) || 0;
    return 0;
  };

  // Totales y validaciones por talonario
  const getTalonarioStats = (key) => {
    const t = talonarios[key];
    const cantidad = calcCantidad(t);
    const ef = parseFloat(t.efectivo) || 0;
    const tr = parseFloat(t.transferencia) || 0;
    const subtotalIngresado = ef + tr;
    const precioUnit = getPrecioUnitario(key);
    const subtotalEsperado = cantidad * precioUnit;
    const esValidoMonto = cantidad === 0 || subtotalIngresado === subtotalEsperado;

    return {
      cantidad,
      efectivo: ef,
      transferencia: tr,
      subtotal: subtotalIngresado,
      subtotalEsperado,
      esValidoMonto
    };
  };

  // Totales generales consolidados en el formulario
  const totalGeneralEfectivo = talonarioKeys.reduce((sum, k) => sum + getTalonarioStats(k).efectivo, 0);
  const totalGeneralTransferencia = talonarioKeys.reduce((sum, k) => sum + getTalonarioStats(k).transferencia, 0);
  const totalGeneralRecaudado = totalGeneralEfectivo + totalGeneralTransferencia;
  const totalTicketsVendidos = talonarioKeys.reduce((sum, k) => sum + getTalonarioStats(k).cantidad, 0);

  // === AGRUPAR ENTRADAS POR JORNADA (Fecha + Rival + División + Torneo) ===
  const jornadasAgrupadas = React.useMemo(() => {
    const map = {};
    entradas.forEach(e => {
      // Clave única para la jornada
      const key = `${e.fecha}_${e.rival}_${e.division}_${e.torneo_tipo}`;
      if (!map[key]) {
        map[key] = {
          idGroup: key,
          fecha: e.fecha,
          rival: e.rival,
          division: e.division,
          torneo_tipo: e.torneo_tipo,
          registros: [],
          totalRecaudado: 0,
          totalEfectivo: 0,
          totalTransferencia: 0,
          totalTickets: 0,
          foto_url: e.foto_url || null,
          created_by_name: e.created_by_name,
          created_by_role: e.created_by_role
        };
      }
      map[key].registros.push(e);
      map[key].totalRecaudado += Number(e.subtotal || 0);
      map[key].totalEfectivo += Number(e.efectivo || 0);
      map[key].totalTransferencia += Number(e.transferencia || 0);
      map[key].totalTickets += Number(e.cantidad_vendida || 0);
      if (e.foto_url && !map[key].foto_url) {
        map[key].foto_url = e.foto_url;
      }
    });
    return Object.values(map).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  }, [entradas]);

  // Manejar captura o carga de foto
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
      setErrorMsg('Debes especificar el Rival de la jornada.');
      return;
    }

    const hayDatos = talonarioKeys.some(k => getTalonarioStats(k).cantidad > 0);
    if (!hayDatos) {
      setErrorMsg('Debes completar al menos un talonario con Nro. Inicial y Nro. Final válidos.');
      return;
    }

    for (const key of talonarioKeys) {
      const stats = getTalonarioStats(key);
      const labelName = talonarioLabels[key].replace(/[🎫🅿️]/g, '').trim();

      if (stats.cantidad > 0) {
        if (stats.subtotal <= 0) {
          setErrorMsg(`El talonario ${labelName} tiene ${stats.cantidad} entradas pero no tiene monto ingresado (debe ser ${formatCurrency(stats.subtotalEsperado)}).`);
          return;
        }
        if (!stats.esValidoMonto) {
          setErrorMsg(`Error en ${labelName}: Has ingresado ${formatCurrency(stats.subtotal)}, pero ${stats.cantidad} entradas a ${formatCurrency(getPrecioUnitario(key))} c/u deben sumar exactamente ${formatCurrency(stats.subtotalEsperado)}.`);
          return;
        }
      }
    }

    try {
      setIsSubmitting(true);
      let fotoUrl = null;
      if (photoFile) {
        fotoUrl = await clubApi.uploadImage(photoFile);
      }

      const registros = [];
      for (const key of talonarioKeys) {
        const stats = getTalonarioStats(key);
        const t = talonarios[key];
        if (stats.cantidad > 0) {
          const talonarioNombre = key === 'ENTRADAS' ? 'GENERAL' : key === 'PLAYA_LOCAL' ? 'LOCAL' : 'VISITANTE';

          registros.push({
            fecha: String(fecha),
            rival: String(getRivalInfo(rival).name || rival),
            division: String(division),
            torneo_tipo: String(torneoTipo),
            es_playa: Boolean(key !== 'ENTRADAS'),
            talonario_tipo: String(talonarioNombre),
            nro_inicial: t.nroInicial !== '' ? parseInt(t.nroInicial, 10) : 0,
            nro_final: t.nroFinal !== '' ? parseInt(t.nroFinal, 10) : 0,
            cantidad_vendida: parseInt(stats.cantidad, 10) || 0,
            precio_unitario: getPrecioUnitario(key),
            subtotal: parseFloat(stats.subtotal) || 0,
            efectivo: t.efectivo !== '' ? parseFloat(t.efectivo) : 0,
            transferencia: t.transferencia !== '' ? parseFloat(t.transferencia) : 0,
            foto_url: fotoUrl ? String(fotoUrl) : null
          });
        }
      }

      for (const record of registros) {
        await onAddEntrada(record);
      }

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });

      setIsModalOpen(false);
      setRival('murialdo');
      setTalonarios({
        ENTRADAS: emptyTalonario(),
        PLAYA_LOCAL: emptyTalonario(),
        PLAYA_VISITANTE: emptyTalonario()
      });
      setPhotoPreview(null);
      setPhotoFile(null);
    } catch (err) {
      setErrorMsg('Error guardando el registro: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Módulo de Entradas</h1>
          <p className="page-description">
            Control obligatorio por jornada: cálculo de talonarios, torneo, rival y respaldo fotográfico.
          </p>
        </div>

        {canCreate ? (
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} />
            <span>Cargar Entradas de Jornada</span>
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

      {/* Tabla Principal con Resumen por Jornada */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff' }}>
            Historial de Jornadas Registradas ({jornadasAgrupadas.length})
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha y Rival</th>
                <th>División</th>
                <th>Torneo</th>
                <th>Total Tickets</th>
                <th>Total Recaudado</th>
                <th>Desglose Pago</th>
                <th>Foto Respaldo</th>
                <th>Auditoría</th>
                <th style={{ textAlign: 'center' }}>Detalle / Acciones</th>
              </tr>
            </thead>
            <tbody>
              {jornadasAgrupadas.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No hay registros de entradas cargados aún.
                  </td>
                </tr>
              ) : (
                jornadasAgrupadas.map((j) => (
                  <tr key={j.idGroup}>
                    <td>
                      <RivalItem rival={j.rival} subtitle={formatDate(j.fecha)} size={28} />
                    </td>
                    <td>
                      <span className={`badge ${j.division === 'SENIOR' ? 'badge-senior' : 'badge-inferiores'}`}>
                        {j.division}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.82rem' }}>
                        {j.torneo_tipo}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: '#ffffff' }}>{j.totalTickets} tickets</span>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({j.registros.length} talonarios)</div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 800, color: 'var(--color-success)', fontSize: '0.98rem' }}>
                        {formatCurrency(j.totalRecaudado)}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.76rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Efectivo:</span> <strong>{formatCurrency(j.totalEfectivo)}</strong>
                      </div>
                      <div style={{ fontSize: '0.76rem' }}>
                        <span style={{ color: 'var(--club-red)' }}>Transf:</span> <strong>{formatCurrency(j.totalTransferencia)}</strong>
                      </div>
                    </td>
                    <td>
                      {j.foto_url ? (
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                          onClick={() => onPreviewImage(j.foto_url, `Jornada: ${j.rival} (${j.division})`)}
                        >
                          <Eye size={12} /> Ver Foto
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Sin foto</span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: '0.78rem', color: '#ffffff' }}>{j.created_by_name}</div>
                      <span style={{
                        fontSize: '0.65rem',
                        color: 'var(--club-red)',
                        textTransform: 'uppercase',
                        fontWeight: 700
                      }}>
                        {j.created_by_role}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className="btn btn-primary"
                        style={{ padding: '6px 12px', fontSize: '0.78rem', gap: '6px', margin: '0 auto' }}
                        onClick={() => setSelectedJornadaGroup(j)}
                      >
                        <Layers size={14} /> Detalle
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Detalle de Talonarios por Jornada */}
      {selectedJornadaGroup && (
        <div className="modal-backdrop" onClick={() => setSelectedJornadaGroup(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
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
                  <Ticket size={18} />
                </div>
                <div>
                  <h3 className="modal-title">Detalle de Talonarios - {selectedJornadaGroup.rival}</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {formatDate(selectedJornadaGroup.fecha)} • {selectedJornadaGroup.division} • Torneo {selectedJornadaGroup.torneo_tipo}
                  </p>
                </div>
              </div>
            </div>

            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              {/* Tabla Detallada de Talonarios */}
              <div className="table-container" style={{ marginBottom: '16px' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Tickets / Números</th>
                      <th>Precio Unit.</th>
                      <th>Efectivo</th>
                      <th>Transferencia</th>
                      <th style={{ textAlign: 'right' }}>Subtotal</th>
                      {canDelete && <th style={{ textAlign: 'center' }}>Acción</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedJornadaGroup.registros.map((reg) => {
                      // Resolver de tipo de talonario robusto
                      let rawTipo = (reg.talonario_tipo || reg.tipo_talonario || reg.tipo_sector || reg.sector || '').trim();
                      const torneoName = String(reg.torneo_tipo || selectedJornadaGroup.torneo_tipo || '').trim().toUpperCase();

                      if (rawTipo.toUpperCase() === 'CLAUSURA' || rawTipo.toUpperCase() === 'APERTURA' || (torneoName && rawTipo.toUpperCase() === torneoName)) {
                        rawTipo = '';
                      }

                      let tipoLabel = 'GENERAL';
                      if (!rawTipo) {
                        if (reg.es_playa) {
                          const allStr = JSON.stringify(reg).toUpperCase();
                          tipoLabel = allStr.includes('VISITANTE') ? 'PLAYA (VISITANTE)' : 'PLAYA (LOCAL)';
                        } else {
                          tipoLabel = 'GENERAL';
                        }
                      } else {
                        const upper = rawTipo.toUpperCase();
                        if (upper === 'GENERAL' || upper === 'ENTRADA' || upper === 'ENTRADAS') {
                          tipoLabel = 'GENERAL';
                        } else if (upper === 'LOCAL' || upper === 'PLAYA_LOCAL' || upper === 'PLAYA (LOCAL)') {
                          tipoLabel = 'PLAYA (LOCAL)';
                        } else if (upper === 'VISITANTE' || upper === 'PLAYA_VISITANTE' || upper === 'PLAYA (VISITANTE)') {
                          tipoLabel = 'PLAYA (VISITANTE)';
                        } else if (reg.es_playa) {
                          tipoLabel = upper.includes('PLAYA') ? upper : `PLAYA (${upper})`;
                        } else {
                          tipoLabel = upper;
                        }
                      }

                      // Resolver de rango de números
                      const nroIni = Number(reg.nro_inicial ?? reg.nroInicial ?? reg.nro_inicio ?? reg.ticket_inicial ?? reg.desde ?? 0);
                      const nroFin = Number(reg.nro_final ?? reg.nroFinal ?? reg.nro_fin ?? reg.ticket_final ?? reg.hasta ?? 0);
                      const cantVendida = Number(reg.cantidad_vendida ?? reg.cantidad ?? reg.total_tickets ?? reg.tickets ?? 0);

                      const hasRange = nroIni > 0 || nroFin > 0;
                      const ticketsRange = hasRange
                        ? `N° ${String(nroIni).padStart(4, '0')} al ${String(nroFin).padStart(4, '0')}`
                        : (cantVendida > 0 ? `${cantVendida} entradas` : '—');

                      const isPlaya = reg.es_playa || tipoLabel.startsWith('PLAYA');

                      return (
                        <tr key={reg.id}>
                          <td>
                            <span style={{
                              display: 'inline-block',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '3px 10px',
                              borderRadius: '6px',
                              background: reg.es_playa ? 'rgba(59, 130, 246, 0.2)' : 'rgba(229, 37, 42, 0.2)',
                              color: reg.es_playa ? '#3b82f6' : 'var(--club-red)',
                              whiteSpace: 'nowrap'
                            }}>
                              {tipoLabel}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 700, color: '#ffffff' }}>
                              {ticketsRange}
                            </span>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              {Number(reg.cantidad_vendida) || 0} entradas
                            </div>
                          </td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                            {formatCurrency(reg.precio_unitario)}
                          </td>
                          <td style={{ fontSize: '0.82rem' }}>
                            <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                              {formatCurrency(reg.efectivo)}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.82rem' }}>
                            <span style={{ color: '#3b82f6', fontWeight: 600 }}>
                              {formatCurrency(reg.transferencia)}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-success)' }}>
                              {formatCurrency(reg.subtotal)}
                            </span>
                          </td>
                          {canDelete && (
                            <td style={{ textAlign: 'center' }}>
                              <button
                                className="btn btn-danger"
                                style={{ padding: '5px 8px' }}
                                title="Eliminar este talonario"
                                onClick={() => {
                                  if (window.confirm('¿Deseas eliminar este talonario específico?')) {
                                    onDeleteEntrada(reg.id);
                                    if (selectedJornadaGroup.registros.length <= 1) {
                                      setSelectedJornadaGroup(null);
                                    } else {
                                      setSelectedJornadaGroup(prev => ({
                                        ...prev,
                                        registros: prev.registros.filter(r => r.id !== reg.id),
                                        totalRecaudado: prev.totalRecaudado - Number(reg.subtotal),
                                        totalTickets: prev.totalTickets - Number(reg.cantidad_vendida)
                                      }));
                                    }
                                  }
                                }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Totales Consolidados del Grupo */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '10px',
                padding: '14px',
                borderRadius: '10px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Total Tickets</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff' }}>
                    {selectedJornadaGroup.totalTickets}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Efectivo</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-success)' }}>
                    {formatCurrency(selectedJornadaGroup.totalEfectivo)}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Total Recaudado</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--color-success)' }}>
                    {formatCurrency(selectedJornadaGroup.totalRecaudado)}
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setSelectedJornadaGroup(null)}>
                Cerrar Detalle
              </button>

            </div>
          </div>
        </div>
      )}

      {/* Modal de Carga de Entradas */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '720px' }}>
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
                  <Ticket size={18} />
                </div>
                <div>
                  <h3 className="modal-title">Cargar Entradas de Jornada</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    3 talonarios independientes con validación de montos
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
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

                {/* Contexto Obligatorio: Fecha, Rival */}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Fecha del Partido</label>
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
                        flexShrink: '0',
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

                {/* División y Torneo */}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">División</label>
                    <select
                      className="form-select"
                      value={division}
                      onChange={e => setDivision(e.target.value)}
                    >
                      <option value="SENIOR">SENIOR</option>
                      <option value="INFERIORES">INFERIORES</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tipo de Torneo</label>
                    <select
                      className="form-select"
                      value={torneoTipo}
                      onChange={e => setTorneoTipo(e.target.value)}
                    >
                      <option value="APERTURA">APERTURA</option>
                      <option value="CLAUSURA">CLAUSURA</option>
                      <option value="MENDOCINO">MENDOCINO</option>
                      <option value="SUPER LIGA">SUPER LIGA</option>
                    </select>
                  </div>
                </div>

                {/* Precios Unitarios Separados */}
                <div className="form-row">
                  <div className="form-group" style={{ marginBottom: '18px' }}>
                    <label className="form-label">Precio Unitario por Entrada ($)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={precioEntradas}
                      onChange={e => setPrecioEntradas(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: '18px' }}>
                    <label className="form-label">Precio Playa Local ($)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={precioPlayaLocal}
                      onChange={e => setPrecioPlayaLocal(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '18px' }}>
                  <label className="form-label">Precio Playa Visitante ($)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={precioPlayaVisitante}
                    onChange={e => setPrecioPlayaVisitante(e.target.value)}
                    required
                  />
                </div>

                {/* === TRES TALONARIOS INDEPENDIENTES === */}
                {talonarioKeys.map((key) => {
                  const t = talonarios[key];
                  const stats = getTalonarioStats(key);
                  const colors = talonarioColors[key];

                  return (
                    <div key={key} style={{
                      padding: '16px',
                      borderRadius: '14px',
                      background: colors.bg,
                      border: `1px solid ${!stats.esValidoMonto && stats.cantidad > 0 ? 'var(--color-danger)' : colors.border}`,
                      marginBottom: '16px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                        <Calculator size={16} color={colors.accent} />
                        <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#ffffff' }}>
                          {talonarioLabels[key]}
                        </span>
                        {stats.cantidad > 0 && (
                          <span style={{
                            marginLeft: 'auto',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '2px 10px',
                            borderRadius: '20px',
                            background: colors.accent,
                            color: '#ffffff'
                          }}>
                            {stats.cantidad} tickets (Esperado: {formatCurrency(stats.subtotalEsperado)})
                          </span>
                        )}
                      </div>

                      <div className="form-row">
                        <div className="form-group" style={{ marginBottom: '10px' }}>
                          <span className="form-label" style={{ display: 'block', marginBottom: '4px' }}>Nro. Inicial</span>
                          <input
                            type="number"
                            className="form-input"
                            placeholder="Ej. 0048"
                            value={t.nroInicial}
                            onChange={e => updateTalonario(key, 'nroInicial', e.target.value)}
                            min="0"
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: '10px' }}>
                          <span className="form-label" style={{ display: 'block', marginBottom: '4px' }}>Nro. Final</span>
                          <input
                            type="number"
                            className="form-input"
                            placeholder="Ej. 0098"
                            value={t.nroFinal}
                            onChange={e => updateTalonario(key, 'nroFinal', e.target.value)}
                            min="0"
                          />
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group" style={{ marginBottom: '0' }}>
                          <span className="form-label" style={{ display: 'block', marginBottom: '4px', color: 'var(--color-success)', fontSize: '0.78rem' }}>
                            💵 Efectivo ($)
                          </span>
                          <input
                            type="number"
                            className="form-input"
                            placeholder="0"
                            value={t.efectivo}
                            onChange={e => updateTalonario(key, 'efectivo', e.target.value)}
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: '0' }}>
                          <span className="form-label" style={{ display: 'block', marginBottom: '4px', color: colors.accent, fontSize: '0.78rem' }}>
                            🏦 Transferencia (Cta. Club San Martín) ($)
                          </span>
                          <input
                            type="number"
                            className="form-input"
                            placeholder="0"
                            value={t.transferencia}
                            onChange={e => updateTalonario(key, 'transferencia', e.target.value)}
                          />
                        </div>
                      </div>

                      {stats.cantidad > 0 && (
                        <div style={{
                          marginTop: '12px',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          background: 'rgba(0,0,0,0.2)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <span style={{ fontSize: '0.76rem', color: stats.esValidoMonto ? 'var(--text-secondary)' : 'var(--color-danger)', fontWeight: stats.esValidoMonto ? 400 : 700 }}>
                            {stats.esValidoMonto ? 'Subtotal ingresado:' : `⚠️ No coincide (Debe ser ${formatCurrency(stats.subtotalEsperado)})`}
                          </span>
                          <span style={{ fontSize: '1rem', fontWeight: 800, color: stats.esValidoMonto ? 'var(--color-success)' : 'var(--color-danger)' }}>
                            {formatCurrency(stats.subtotal)}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* === RESUMEN CONSOLIDADO === */}
                <div style={{
                  padding: '18px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, rgba(229, 37, 42, 0.15), rgba(229, 37, 42, 0.05))',
                  border: '2px solid rgba(229, 37, 42, 0.4)',
                  marginBottom: '18px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                    <Calculator size={18} color="var(--club-red)" />
                    <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff' }}>
                      RESUMEN CONSOLIDADO
                    </span>
                    <span style={{
                      marginLeft: 'auto',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '3px 12px',
                      borderRadius: '20px',
                      background: 'var(--club-red)',
                      color: '#ffffff'
                    }}>
                      {totalTicketsVendidos} tickets totales
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{
                      padding: '12px',
                      borderRadius: '10px',
                      background: 'rgba(16, 185, 129, 0.12)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        💵 Total General Efectivo
                      </div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--color-success)' }}>
                        {formatCurrency(totalGeneralEfectivo)}
                      </div>
                    </div>
                    <div style={{
                      padding: '12px',
                      borderRadius: '10px',
                      background: 'rgba(229, 37, 42, 0.12)',
                      border: '1px solid rgba(229, 37, 42, 0.3)',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        🏦 Total General Transferencia
                      </div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--club-red)' }}>
                        {formatCurrency(totalGeneralTransferencia)}
                      </div>
                    </div>
                  </div>

                  <div style={{
                    marginTop: '12px',
                    padding: '10px',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.06)',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                      TOTAL RECAUDADO (3 Talonarios)
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#ffffff' }}>
                      {formatCurrency(totalGeneralRecaudado)}
                    </div>
                  </div>
                </div>

                {/* Respaldo Fotográfico */}
                <div className="form-group">
                  <span className="form-label" style={{ display: 'block', marginBottom: '6px' }}>
                    Respaldo Fotográfico (Foto del Talonario Físico)
                  </span>
                  <div className="photo-upload-box" style={{ display: 'block', cursor: 'pointer' }} onClick={() => document.getElementById('hidden-file-input').click()}>
                    <input
                      id="hidden-file-input"
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoCapture}
                      style={{ display: 'none' }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                      <Camera size={26} color="var(--club-red)" />
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#ffffff' }}>
                        {photoFile ? 'Cambiar foto de talonario' : 'Tomar foto con la cámara o adjuntar archivo'}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Permite auditar el estado del talonario en papel
                      </span>
                    </div>

                    {photoPreview && (
                      <img
                        src={photoPreview}
                        alt="Previsualización"
                        className="photo-preview-img"
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Guardando registro...' : 'Guardar y Confirmar Entradas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};



