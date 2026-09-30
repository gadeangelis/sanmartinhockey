import React, { useState, useMemo } from 'react';
import {
  Trophy,
  Ticket,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Scale,
  ChevronLeft,
  Plus,
  Receipt,
  AlertCircle,
  Calendar,
  Users
} from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/exportUtils';
import { getRivalInfo, RIVALES } from '../lib/rivales';
import { clubApi } from '../lib/supabase';
import confetti from 'canvas-confetti';

// Build list of unique matches from entradas + cantina + match-linked gastos
function buildPartidos(entradas, cantina, gastos) {
  const map = new Map();

  const addOrGet = (fechaRaw, rivalRaw, divisionRaw) => {
    if (!fechaRaw || !rivalRaw) return null;
    const fecha = String(fechaRaw).split('T')[0];
    const rivalInfo = getRivalInfo(rivalRaw);
    const rival = rivalInfo.id;
    let division = (divisionRaw || 'SENIOR').toUpperCase().trim();
    if (division === 'PRIMERA') division = 'SENIOR';

    const key = `${fecha}_${rival}_${division}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        fecha,
        rival,
        division,
        entradas: [],
        cantina: [],
        gastos: [],
      });
    }
    return map.get(key);
  };

  entradas.forEach(e => {
    if (!e.rival) return;
    const p = addOrGet(e.fecha, e.rival, e.division);
    if (p) p.entradas.push(e);
  });

  cantina.forEach(c => {
    if (!c.rival) return;
    const p = addOrGet(c.fecha, c.rival, c.division);
    if (p) p.cantina.push(c);
  });

  gastos.forEach(g => {
    if (!g.rival) return;
    const p = addOrGet(g.fecha, g.rival, g.division);
    if (p) p.gastos.push(g);
  });

  return Array.from(map.values()).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}

function calcPartido(partido) {
  const totalEntradas = partido.entradas.reduce((s, e) => s + (e.subtotal || 0), 0);
  const efectivoEntradas = partido.entradas.reduce((s, e) => s + (e.efectivo || 0), 0);
  const transferenciaEntradas = partido.entradas.reduce((s, e) => s + (e.transferencia || 0), 0);
  const cantidadEntradas = partido.entradas.reduce((s, e) => s + (e.cantidad_total || e.cantidad_vendida || 0), 0);

  const totalCantina = partido.cantina.reduce((s, c) => s + (c.total_ventas || 0), 0);
  const efectivoCantina = partido.cantina.reduce((s, c) => s + (c.efectivo || 0), 0);
  const transferenciaCantina = partido.cantina.reduce((s, c) => s + (c.transferencia || 0), 0);

  const totalGastos = partido.gastos.reduce((s, g) => s + (g.monto || 0), 0);
  const efectivoGastos = partido.gastos.filter(g => g.medio_pago === 'Efectivo').reduce((s, g) => s + (g.monto || 0), 0);
  const transferenciaGastos = partido.gastos.filter(g => g.medio_pago === 'Transferencia').reduce((s, g) => s + (g.monto || 0), 0);

  const saldoNeto = totalEntradas + totalCantina - totalGastos;

  return {
    totalEntradas, efectivoEntradas, transferenciaEntradas, cantidadEntradas,
    totalCantina, efectivoCantina, transferenciaCantina,
    totalGastos, efectivoGastos, transferenciaGastos,
    saldoNeto,
  };
}

// ─── Sub-component: Match List Card (Tarjeta Unificada por Partido) ──────────────
function PartidoCard({ partido, onSelect }) {
  const rivalInfo = getRivalInfo(partido.rival);
  const stats = calcPartido(partido);
  const isPositive = stats.saldoNeto >= 0;

  return (
    <div
      onClick={() => onSelect(partido)}
      style={{
        background: 'linear-gradient(135deg, rgba(22, 26, 34, 0.95), rgba(18, 21, 27, 0.95))',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        padding: '18px 20px',
        cursor: 'pointer',
        transition: 'all 0.25s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.border = '1px solid rgba(229, 37, 42, 0.45)';
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(229, 37, 42, 0.12)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.08)';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 14px rgba(0, 0, 0, 0.25)';
      }}
    >
      {/* Fila Superior: Escudo, Rival, División, Fecha y Saldo Destacado */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <img
            src={rivalInfo.image}
            alt={rivalInfo.name}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '2px solid rgba(255,255,255,0.18)',
              flexShrink: 0
            }}
            onError={e => {
              e.target.style.background = 'rgba(255,255,255,0.1)';
              e.target.style.border = '2px solid rgba(255,255,255,0.18)';
              e.target.src = '';
            }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 800, color: '#ffffff', fontSize: '1.05rem', letterSpacing: '-0.3px' }}>
                San Martín vs {rivalInfo.name}
              </span>
              <span className={`badge ${partido.division === 'SENIOR' ? 'badge-senior' : 'badge-inferiores'}`} style={{ fontSize: '0.65rem' }}>
                {partido.division}
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={13} style={{ opacity: 0.7 }} />
              <span>{formatDate(partido.fecha)}</span>
            </div>
          </div>
        </div>

        {/* Saldo Neto en la cabecera de la tarjeta */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: isPositive ? 'rgba(16, 185, 129, 0.08)' : 'rgba(244, 63, 94, 0.08)',
          border: `1px solid ${isPositive ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)'}`,
          borderRadius: '12px',
          padding: '8px 14px',
        }}>
          <div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
              Saldo Neto
            </div>
            <div style={{
              fontSize: '1.15rem',
              fontWeight: 900,
              color: isPositive ? 'var(--color-success)' : 'var(--color-danger)',
              lineHeight: 1.1
            }}>
              {isPositive ? '+' : ''}{formatCurrency(stats.saldoNeto)}
            </div>
          </div>
          <span style={{
            fontSize: '0.68rem',
            fontWeight: 800,
            padding: '3px 8px',
            borderRadius: '6px',
            background: isPositive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)',
            color: isPositive ? 'var(--color-success)' : 'var(--color-danger)',
            textTransform: 'uppercase'
          }}>
            {isPositive ? 'Superávit' : 'Déficit'}
          </span>
        </div>
      </div>

      {/* Fila Inferior: Métricas consolidadas del partido (Entradas, Cantina, Gastos del Partido y Saldo) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: '10px',
        paddingTop: '12px',
        borderTop: '1px solid rgba(255, 255, 255, 0.06)'
      }}>
        {/* Entradas */}
        <div style={{
          background: 'rgba(59, 130, 246, 0.06)',
          border: '1px solid rgba(59, 130, 246, 0.15)',
          borderRadius: '10px',
          padding: '10px 12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <Ticket size={13} color="#3b82f6" />
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
              Entradas
            </span>
          </div>
          <div style={{ fontSize: '0.98rem', fontWeight: 800, color: stats.totalEntradas > 0 ? '#ffffff' : 'var(--text-muted)' }}>
            {formatCurrency(stats.totalEntradas)}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {stats.cantidadEntradas > 0 ? `${stats.cantidadEntradas} tickets` : (partido.entradas.length > 0 ? `${partido.entradas.length} registro(s)` : 'Sin ventas')}
          </div>
        </div>

        {/* Cantina */}
        <div style={{
          background: 'rgba(245, 158, 11, 0.06)',
          border: '1px solid rgba(245, 158, 11, 0.15)',
          borderRadius: '10px',
          padding: '10px 12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <ShoppingCart size={13} color="#f59e0b" />
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
              Cantina
            </span>
          </div>
          <div style={{ fontSize: '0.98rem', fontWeight: 800, color: stats.totalCantina > 0 ? '#ffffff' : 'var(--text-muted)' }}>
            {formatCurrency(stats.totalCantina)}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {partido.cantina.length > 0 ? `${partido.cantina.length} registro(s)` : 'Sin ventas'}
          </div>
        </div>

        {/* Gastos del Partido */}
        <div style={{
          background: 'rgba(244, 63, 94, 0.06)',
          border: '1px solid rgba(244, 63, 94, 0.15)',
          borderRadius: '10px',
          padding: '10px 12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <Receipt size={13} color="var(--color-danger)" />
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
              Gastos Partido
            </span>
          </div>
          <div style={{ fontSize: '0.98rem', fontWeight: 800, color: stats.totalGastos > 0 ? 'var(--color-danger)' : 'var(--text-muted)' }}>
            {stats.totalGastos > 0 ? `-${formatCurrency(stats.totalGastos)}` : '$0'}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {partido.gastos.length > 0 ? `${partido.gastos.length} egreso(s) (árbitros, etc.)` : 'Sin egresos'}
          </div>
        </div>

        {/* Saldo Neto Consolidado */}
        <div style={{
          background: isPositive ? 'rgba(16, 185, 129, 0.06)' : 'rgba(244, 63, 94, 0.06)',
          border: `1px solid ${isPositive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)'}`,
          borderRadius: '10px',
          padding: '10px 12px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <Scale size={13} color={isPositive ? 'var(--color-success)' : 'var(--color-danger)'} />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
                Saldo Neto
              </span>
            </div>
            <div style={{
              fontSize: '0.98rem',
              fontWeight: 900,
              color: isPositive ? 'var(--color-success)' : 'var(--color-danger)'
            }}>
              {isPositive ? '+' : ''}{formatCurrency(stats.saldoNeto)}
            </div>
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--club-red)', fontWeight: 700, marginTop: '2px', textAlign: 'right' }}>
            Ver detalle →
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-component: Quick Add Expense Modal ───────────────────────────────────
function QuickGastoModal({ partido, onAddGasto, onClose }) {
  const [fecha] = useState(partido.fecha);
  const [motivoCategoria, setMotivoCategoria] = useState('Arbitrajes y Jueces');
  const [monto, setMonto] = useState('');
  const [medioPago, setMedioPago] = useState('Efectivo');
  const [proveedor, setProveedor] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const rivalInfo = getRivalInfo(partido.rival);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!monto || parseFloat(monto) <= 0) {
      setErrorMsg('Ingresá un monto válido.');
      return;
    }
    try {
      setIsSubmitting(true);
      await onAddGasto({
        fecha,
        motivo_categoria: motivoCategoria,
        monto: parseFloat(monto),
        medio_pago: medioPago,
        proveedor: proveedor.trim(),
        foto_url: null,
        rival: partido.rival,
        division: partido.division,
      });
      confetti({ particleCount: 30, spread: 45, origin: { y: 0.7 } });
      onClose();
    } catch (err) {
      setErrorMsg('Error: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src={rivalInfo.image} alt={rivalInfo.name}
              style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.2)' }}
              onError={e => e.target.style.display = 'none'} />
            <div>
              <h3 className="modal-title">Cargar Gasto — vs {rivalInfo.name}</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {formatDate(partido.fecha)} • {partido.division}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {errorMsg && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--color-danger-bg)', border: '1px solid rgba(244,63,94,0.3)', color: 'var(--color-danger)', fontSize: '0.8rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={14} /> {errorMsg}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Motivo / Categoría</label>
              <select className="form-select" value={motivoCategoria} onChange={e => setMotivoCategoria(e.target.value)}>
                <option value="Arbitrajes y Jueces">Arbitrajes y Jueces</option>
                <option value="Viáticos y Transporte">Viáticos y Transporte</option>
                <option value="Material Deportivo (Bocha, Conos, Palos)">Material Deportivo</option>
                <option value="Seguros y Emergencias">Seguros y Emergencias</option>
                <option value="Otro">Otro Gasto</option>
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Monto ($)</label>
                <input type="number" className="form-input" placeholder="Ej. 30000" value={monto} onChange={e => setMonto(e.target.value)} required />
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
              <label className="form-label">Proveedor / Destinatario (opcional)</label>
              <input type="text" className="form-input" placeholder="Ej. Colegio de Árbitros" value={proveedor} onChange={e => setProveedor(e.target.value)} />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Registrar Gasto del Partido'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Sub-component: Match Detail View ────────────────────────────────────────
function PartidoDetail({ partido, onBack, canManage, onAddGasto, onDeleteGasto, onNavigateToModule }) {
  const [showQuickModal, setShowQuickModal] = useState(false);
  const rivalInfo = getRivalInfo(partido.rival);
  const stats = calcPartido(partido);
  const isPositive = stats.saldoNeto >= 0;

  const statCards = [
    {
      label: 'Total Entradas',
      icon: Ticket,
      value: stats.totalEntradas,
      color: '#3b82f6',
      bg: 'rgba(59,130,246,0.1)',
      sub1: { label: 'Efectivo', val: stats.efectivoEntradas },
      sub2: { label: 'Transferencia', val: stats.transferenciaEntradas },
      detail: stats.cantidadEntradas > 0 ? `${stats.cantidadEntradas} entradas vendidas` : null,
    },
    {
      label: 'Total Cantina',
      icon: ShoppingCart,
      value: stats.totalCantina,
      color: '#f59e0b',
      bg: 'rgba(245,158,11,0.1)',
      sub1: { label: 'Efectivo', val: stats.efectivoCantina },
      sub2: { label: 'Transferencia', val: stats.transferenciaCantina },
      detail: partido.cantina.length > 0 ? `${partido.cantina.length} carga(s) de cantina` : null,
    },
    {
      label: 'Total Gastos',
      icon: TrendingDown,
      value: -stats.totalGastos,
      color: 'var(--color-danger)',
      bg: 'var(--color-danger-bg)',
      sub1: { label: 'Efectivo', val: -stats.efectivoGastos },
      sub2: { label: 'Transferencia', val: -stats.transferenciaGastos },
      detail: partido.gastos.length > 0 ? `${partido.gastos.length} egreso(s) registrado(s)` : null,
    },
  ];

  return (
    <div>
      {/* Header del partido */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
        <button
          onClick={onBack}
          className="btn btn-secondary"
          style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
        >
          <ChevronLeft size={16} /> Volver
        </button>

        <img
          src={rivalInfo.image}
          alt={rivalInfo.name}
          style={{ width: '52px', height: '52px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.2)' }}
          onError={e => e.target.style.display = 'none'}
        />

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
              San Martín vs {rivalInfo.name}
            </h2>
            <span className={`badge ${partido.division === 'SENIOR' ? 'badge-senior' : 'badge-inferiores'}`}>
              {partido.division}
            </span>
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', gap: '14px', marginTop: '4px' }}>
            <span>📅 {formatDate(partido.fecha)}</span>
          </div>
        </div>

        {canManage && (
          <button
            onClick={() => setShowQuickModal(true)}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
          >
            <Plus size={15} /> Cargar Gasto
          </button>
        )}
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        {statCards.map((card) => {
          const Icon = card.icon;
          const isNeg = card.value < 0;
          return (
            <div key={card.label} style={{
              background: card.bg,
              border: `1px solid ${card.color}33`,
              borderRadius: '14px',
              padding: '18px 16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Icon size={17} color={card.color} />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{card.label}</span>
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: isNeg ? 'var(--color-danger)' : '#ffffff', lineHeight: 1 }}>
                {isNeg ? '' : ''}{formatCurrency(Math.abs(card.value))}
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
                <span>💵 {formatCurrency(Math.abs(card.sub1.val))}</span>
                <span>🏦 {formatCurrency(Math.abs(card.sub2.val))}</span>
              </div>
              {card.detail && (
                <div style={{ marginTop: '6px', fontSize: '0.7rem', color: card.color, fontWeight: 600 }}>{card.detail}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Saldo Neto hero card */}
      <div style={{
        background: isPositive
          ? 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05))'
          : 'linear-gradient(135deg, rgba(244,63,94,0.15), rgba(244,63,94,0.05))',
        border: `1px solid ${isPositive ? 'rgba(34,197,94,0.35)' : 'rgba(244,63,94,0.35)'}`,
        borderRadius: '16px',
        padding: '22px 24px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: isPositive ? 'rgba(34,197,94,0.2)' : 'rgba(244,63,94,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Scale size={22} color={isPositive ? 'var(--color-success)' : 'var(--color-danger)'} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>
              Resultado Neto del Partido
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Entradas + Cantina − Gastos
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontSize: '2.2rem',
            fontWeight: 900,
            color: isPositive ? 'var(--color-success)' : 'var(--color-danger)',
            lineHeight: 1,
          }}>
            {isPositive ? '+' : ''}{formatCurrency(stats.saldoNeto)}
          </div>
          <div style={{ fontSize: '0.76rem', marginTop: '4px', color: 'var(--text-secondary)', fontWeight: 600 }}>
            {isPositive ? '✅ Superávit' : '⚠️ Déficit'}
          </div>
        </div>
      </div>

      {/* Gastos del partido */}
      {partido.gastos.length > 0 && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#ffffff', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Receipt size={16} color="var(--color-danger)" />
            Egresos del Partido ({partido.gastos.length})
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Categoría</th>
                  <th>Proveedor</th>
                  <th>Medio</th>
                  <th>Monto</th>
                  <th>Registrado por</th>
                  {canManage && <th>Acción</th>}
                </tr>
              </thead>
              <tbody>
                {partido.gastos.map(g => (
                  <tr key={g.id}>
                    <td><span style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.85rem' }}>{g.motivo_categoria}</span></td>
                    <td><span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{g.proveedor || '—'}</span></td>
                    <td>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: g.medio_pago === 'Transferencia' ? 'var(--club-red)' : 'var(--color-success)' }}>
                        {g.medio_pago}
                      </span>
                    </td>
                    <td><span style={{ fontWeight: 800, color: 'var(--color-danger)' }}>-{formatCurrency(g.monto)}</span></td>
                    <td><span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{g.created_by_name}</span></td>
                    {canManage && (
                      <td>
                        <button className="btn btn-danger" style={{ padding: '5px' }} onClick={() => {
                          if (window.confirm('¿Anular este gasto?')) onDeleteGasto(g.id);
                        }}>
                          ✕
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Entradas del partido */}
      {partido.entradas.length > 0 && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#ffffff', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Ticket size={16} color="#3b82f6" />
            Detalle de Entradas ({partido.entradas.length} registro(s))
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Tickets</th>
                  <th>Efectivo</th>
                  <th>Transferencia</th>
                  <th>Subtotal</th>
                  <th>Cargado por</th>
                </tr>
              </thead>
              <tbody>
                {partido.entradas.map(e => {
                  // Resolver de tipo de talonario robusto (evita 'CLAUSURA' o nombres de torneos erróneos)
                  let rawTipo = (e.talonario_tipo || e.tipo_talonario || e.tipo_sector || e.sector || '').trim();
                  const torneoName = String(e.torneo_tipo || '').trim().toUpperCase();

                  if (rawTipo.toUpperCase() === 'CLAUSURA' || rawTipo.toUpperCase() === 'APERTURA' || (torneoName && rawTipo.toUpperCase() === torneoName)) {
                    rawTipo = '';
                  }

                  let tipoLabel = 'GENERAL';
                  if (!rawTipo) {
                    if (e.es_playa) {
                      const allStr = JSON.stringify(e).toUpperCase();
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
                    } else if (e.es_playa) {
                      tipoLabel = upper.includes('PLAYA') ? upper : `PLAYA (${upper})`;
                    } else {
                      tipoLabel = upper;
                    }
                  }

                  // Resolver de rango o número de tickets
                  const nroIni = Number(e.nro_inicial ?? e.nroInicial ?? e.nro_inicio ?? e.ticket_inicial ?? e.desde ?? 0);
                  const nroFin = Number(e.nro_final ?? e.nroFinal ?? e.nro_fin ?? e.ticket_final ?? e.hasta ?? 0);
                  const cantVendida = Number(e.cantidad_vendida ?? e.cantidad ?? e.total_tickets ?? e.tickets ?? 0);

                  const hasRange = nroIni > 0 || nroFin > 0;
                  const ticketsDisplay = hasRange
                    ? `N° ${String(nroIni).padStart(4, '0')} al ${String(nroFin).padStart(4, '0')}`
                    : (cantVendida > 0 ? `${cantVendida} entradas` : '—');

                  const isPlaya = e.es_playa || tipoLabel.startsWith('PLAYA');

                  return (
                    <tr key={e.id}>
                      <td>
                        <span style={{
                          display: 'inline-block',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: '6px',
                          background: isPlaya ? 'rgba(59, 130, 246, 0.2)' : 'rgba(229, 37, 42, 0.2)',
                          color: isPlaya ? '#3b82f6' : 'var(--club-red)',
                          whiteSpace: 'nowrap'
                        }}>
                          {tipoLabel}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.82rem', fontWeight: 700, color: '#ffffff' }}>
                          {ticketsDisplay}
                        </span>
                        {cantVendida > 0 && hasRange && (
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {cantVendida} entradas
                          </div>
                        )}
                      </td>
                      <td><span style={{ fontSize: '0.8rem', color: 'var(--color-success)', fontWeight: 700 }}>{formatCurrency(e.efectivo || 0)}</span></td>
                      <td><span style={{ fontSize: '0.8rem', color: 'var(--club-red)', fontWeight: 700 }}>{formatCurrency(e.transferencia || 0)}</span></td>
                      <td><span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#ffffff' }}>{formatCurrency(e.subtotal || 0)}</span></td>
                      <td><span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{e.created_by_name}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cantina del partido */}
      {partido.cantina.length > 0 && (
        <div className="card">
          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#ffffff', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingCart size={16} color="#f59e0b" />
            Detalle de Cantina ({partido.cantina.length} registro(s))
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Efectivo</th>
                  <th>Transferencia</th>
                  <th>Total Ventas</th>
                  <th>Notas</th>
                  <th>Cargado por</th>
                </tr>
              </thead>
              <tbody>
                {partido.cantina.map(c => (
                  <tr key={c.id}>
                    <td><span style={{ fontSize: '0.8rem', color: 'var(--color-success)', fontWeight: 700 }}>{formatCurrency(c.efectivo || 0)}</span></td>
                    <td><span style={{ fontSize: '0.8rem', color: 'var(--club-red)', fontWeight: 700 }}>{formatCurrency(c.transferencia || 0)}</span></td>
                    <td><span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#ffffff' }}>{formatCurrency(c.total_ventas || 0)}</span></td>
                    <td><span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{c.notas || '—'}</span></td>
                    <td><span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{c.created_by_name}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state if no detail */}
      {partido.entradas.length === 0 && partido.cantina.length === 0 && partido.gastos.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          <Trophy size={36} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <div style={{ fontSize: '0.9rem' }}>No hay datos cargados para este partido todavía.</div>
          <div style={{ fontSize: '0.8rem', marginTop: '6px' }}>
            Cargá entradas, cantina o gastos desde sus respectivos módulos.
          </div>
        </div>
      )}

      {showQuickModal && (
        <QuickGastoModal
          partido={partido}
          onAddGasto={onAddGasto}
          onClose={() => setShowQuickModal(false)}
        />
      )}
    </div>
  );
}

// ─── Main Module ──────────────────────────────────────────────────────────────
export const PartidosModule = ({ entradas, cantina, gastos, currentUser, onAddGasto, onDeleteGasto, onNavigateToModule }) => {
  const [selectedPartido, setSelectedPartido] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const canManage = ['tesorero', 'admin'].includes(currentUser?.role);

  const partidos = useMemo(
    () => buildPartidos(entradas, cantina, gastos),
    [entradas, cantina, gastos]
  );

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return partidos;
    const q = searchQuery.toLowerCase();
    return partidos.filter(p =>
      getRivalInfo(p.rival).name.toLowerCase().includes(q) ||
      p.division.toLowerCase().includes(q) ||
      formatDate(p.fecha).includes(q)
    );
  }, [partidos, searchQuery]);

  // Re-sync selected partido when gastos/entradas/cantina changes
  const livePartido = useMemo(() => {
    if (!selectedPartido) return null;
    return partidos.find(p => p.key === selectedPartido.key) || null;
  }, [selectedPartido, partidos]);

  if (livePartido) {
    return (
      <div className="page-container">
        <PartidoDetail
          partido={livePartido}
          onBack={() => setSelectedPartido(null)}
          canManage={canManage}
          onAddGasto={onAddGasto}
          onDeleteGasto={onDeleteGasto}
          onNavigateToModule={onNavigateToModule}
        />
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Detalle de Partidos</h1>
          <p className="page-description">
            Balance financiero por jornada: entradas, cantina y gastos operativos de cada partido.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '8px 14px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--club-red)' }}>{partidos.length}</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>jornadas registradas</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          className="form-input"
          placeholder="🔍 Buscar por rival, división o fecha..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ maxWidth: '380px' }}
        />
      </div>

      {/* Stats summary */}
      {partidos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          {[
            {
              label: 'Ingresos Totales',
              value: partidos.reduce((s, p) => { const c = calcPartido(p); return s + c.totalEntradas + c.totalCantina; }, 0),
              color: 'var(--color-success)',
              icon: TrendingUp,
            },
            {
              label: 'Gastos Totales',
              value: partidos.reduce((s, p) => s + calcPartido(p).totalGastos, 0),
              color: 'var(--color-danger)',
              icon: TrendingDown,
            },
            {
              label: 'Saldo Global',
              value: partidos.reduce((s, p) => s + calcPartido(p).saldoNeto, 0),
              color: 'var(--color-success)',
              icon: Scale,
            },
          ].map(card => {
            const Icon = card.icon;
            const isNeg = card.value < 0;
            return (
              <div key={card.label} style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '12px',
                padding: '14px 16px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <Icon size={14} color={isNeg ? 'var(--color-danger)' : card.color} />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>{card.label}</span>
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: isNeg ? 'var(--color-danger)' : '#ffffff' }}>
                  {isNeg ? '' : ''}{formatCurrency(Math.abs(card.value))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List of matches */}
      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Trophy size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
            {partidos.length === 0 ? 'Aún no hay partidos registrados' : 'Sin resultados para tu búsqueda'}
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Los partidos aparecen automáticamente al cargar Entradas o Cantina con un rival asignado.
          </div>
          {partidos.length === 0 && (
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '20px' }}>
              <button className="btn btn-secondary" style={{ fontSize: '0.8rem' }} onClick={() => onNavigateToModule('entradas')}>
                <Ticket size={14} /> Ir a Entradas
              </button>
              <button className="btn btn-secondary" style={{ fontSize: '0.8rem' }} onClick={() => onNavigateToModule('cantina')}>
                <ShoppingCart size={14} /> Ir a Cantina
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map(partido => (
            <PartidoCard
              key={partido.key}
              partido={partido}
              onSelect={setSelectedPartido}
            />
          ))}
        </div>
      )}
    </div>
  );
};
