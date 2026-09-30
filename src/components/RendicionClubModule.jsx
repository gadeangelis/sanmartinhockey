import React, { useState } from 'react';
import { 
  Landmark, 
  CheckCircle2, 
  ArrowUpRight, 
  Calendar, 
  Building2, 
  FileSpreadsheet, 
  Filter 
} from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/exportUtils';
import { RivalItem } from './RivalItem';

export const RendicionClubModule = ({ rendiciones, onExportExcel }) => {
  const [selectedDivision, setSelectedDivision] = useState('TODAS'); // 'TODAS', 'SENIOR', 'INFERIORES'

  // Filtrado
  const filteredRendiciones = rendiciones.filter(r => {
    if (selectedDivision === 'TODAS') return true;
    return r.division === selectedDivision;
  });

  const totalTransferidoGeneral = filteredRendiciones.reduce((acc, r) => acc + (r.total_rendido_club || 0), 0);
  const totalEntradasTransferidas = filteredRendiciones.reduce((acc, r) => acc + (r.transferencia_entradas || 0), 0);
  const totalCantinaTransferida = filteredRendiciones.reduce((acc, r) => acc + (r.transferencia_cantina || 0), 0);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Rendición al Club San Martín</h1>
          <p className="page-description">
            Historial oficial de solo lectura: toda recaudación por transferencia ingresa directamente a la cuenta del club.
          </p>
        </div>

        <button className="btn btn-secondary" onClick={onExportExcel}>
          <FileSpreadsheet size={16} color="var(--color-success)" />
          <span>Exportar Planilla Contable</span>
        </button>
      </div>

      {/* Cartel Informativo Institucional */}
      <div style={{
        padding: '18px 22px',
        borderRadius: '16px',
        background: 'linear-gradient(135deg, rgba(229, 37, 42, 0.15) 0%, rgba(183, 20, 24, 0.05) 100%)',
        border: '1px solid rgba(229, 37, 42, 0.3)',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
      }}>
        <div style={{
          width: '46px',
          height: '46px',
          borderRadius: '14px',
          background: 'var(--club-red-gradient)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          boxShadow: '0 6px 16px rgba(229, 37, 42, 0.4)',
          flexShrink: 0
        }}>
          <Building2 size={24} />
        </div>
        <div>
          <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#ffffff', marginBottom: '4px' }}>
            Cuenta Bancaria Institucional A.C.S.M.
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            Los pagos por transferencia realizados por espectadores y asistentes tanto en <strong>Entradas</strong> como en <strong>Cantina</strong> son recibidos de forma directa e íntegra en la cuenta oficial del <strong>Atlético Club San Martín</strong>. Este historial refleja el cómputo exacto por partido.
          </p>
        </div>
      </div>

      {/* Tarjetas de Totales de Rendición */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '18px',
        marginBottom: '24px'
      }}>
        <div className="card">
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
            TOTAL RENDIDO A CUENTA CLUB
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--color-success)', letterSpacing: '-0.02em' }}>
            {formatCurrency(totalTransferidoGeneral)}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            Fondos bancarizados en cuenta oficial
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
            TRANSFERENCIAS POR ENTRADAS
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff' }}>
            {formatCurrency(totalEntradasTransferidas)}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            Talonarios y boletería
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
            TRANSFERENCIAS POR CANTINA
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff' }}>
            {formatCurrency(totalCantinaTransferida)}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            Ventas de buffet y cafetería
          </div>
        </div>
      </div>

      {/* Historial Detallado por Jornada */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff' }}>
              Detalle Consolidado por Jornada
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Solo lectura • Auditoría de fondos transferidos
            </div>
          </div>

          {/* Filtro por División */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={15} color="var(--text-muted)" />
            <select 
              className="form-select" 
              style={{ padding: '6px 12px', fontSize: '0.8rem', width: 'auto' }}
              value={selectedDivision}
              onChange={e => setSelectedDivision(e.target.value)}
            >
              <option value="TODAS">Todas las Divisiones</option>
              <option value="SENIOR">Solo SENIOR</option>
              <option value="INFERIORES">Solo INFERIORES</option>
            </select>
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Rival</th>
                <th>División / Categoría</th>
                <th>Entradas (Transferencia)</th>
                <th>Cantina (Transferencia)</th>
                <th>Total Jornada al Club</th>
                <th>Estado Bancario</th>
              </tr>
            </thead>
            <tbody>
              {filteredRendiciones.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No hay registros de transferencias para el filtro seleccionado.
                  </td>
                </tr>
              ) : (
                filteredRendiciones.map((r, idx) => (
                  <tr key={idx}>
                    <td>
                      <span style={{ fontWeight: 700, color: '#ffffff' }}>{formatDate(r.fecha)}</span>
                    </td>
                    <td>
                      <RivalItem rival={r.rival} size={28} />
                    </td>
                    <td>
                      <span className={`badge ${r.division === 'SENIOR' ? 'badge-senior' : 'badge-inferiores'}`}>
                        {r.division}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: '#ffffff' }}>
                        {formatCurrency(r.transferencia_entradas)}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: '#ffffff' }}>
                        {formatCurrency(r.transferencia_cantina)}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 800, color: 'var(--color-success)', fontSize: '0.95rem' }}>
                        {formatCurrency(r.total_rendido_club)}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-approved" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle2 size={12} /> Acreditado
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
