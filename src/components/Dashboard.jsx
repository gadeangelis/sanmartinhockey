import React, { useState } from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Landmark,
  Calendar,
  FileSpreadsheet,
  FileText,
  Sparkles
} from 'lucide-react';
import { formatCurrency, exportToExcel, exportToPdf, generateMonthsList, getCurrentSystemMonth } from '../lib/exportUtils';

export const Dashboard = ({
  balanceData,
  entradas,
  cantina,
  sponsors,
  gastos,
  rendiciones,
  onExportExcel,
  onExportPdf,
  onNavigateToModule
}) => {
  // Mes actual del sistema (dinámico, centralizado en exportUtils)
  const currentSystemMonth = getCurrentSystemMonth();

  const [selectedMonth, setSelectedMonth] = useState(currentSystemMonth);
  const [chartView, setChartView] = useState('monthly'); // 'monthly' o 'matches'
  const [compositionTab, setCompositionTab] = useState('all'); // 'all', 'incomes', 'expenses'

  // Formato legible para nombres de meses
  const formatMonthLabel = (monthKey) => {
    if (!monthKey) return '';
    const [year, month] = monthKey.split('-');
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const idx = parseInt(month, 10) - 1;
    return `${monthNames[idx] || month} ${year}`;
  };

  // Historial base de cierres mensuales guardados/archivados
  const defaultClosures = {};

  const [monthlyClosures, setMonthlyClosures] = useState(() => {
    try {
      const saved = localStorage.getItem('hc_monthly_closures');
      return saved ? JSON.parse(saved) : defaultClosures;
    } catch (e) {
      return defaultClosures;
    }
  });

  const handleToggleCloseMonth = (monthKey) => {
    setMonthlyClosures(prev => {
      const isCurrentlyClosed = prev[monthKey]?.isClosed;
      const updated = {
        ...prev,
        [monthKey]: {
          ...(prev[monthKey] || {}),
          isClosed: !isCurrentlyClosed,
          closedAt: !isCurrentlyClosed ? new Date().toISOString() : null
        }
      };
      try {
        localStorage.setItem('hc_monthly_closures', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  // Helper para extraer clave YYYY-MM
  const getRecordMonth = (record) => (record.fecha || record.created_at || '').slice(0, 7);

  // Computar métricas de cualquier mes específico
  const getMonthData = (monthKey) => {
    const ent = entradas.filter(e => getRecordMonth(e) === monthKey);
    const can = cantina.filter(c => getRecordMonth(c) === monthKey);
    const spo = sponsors.filter(s => getRecordMonth(s) === monthKey);
    const gas = gastos.filter(g => getRecordMonth(g) === monthKey);

    const hasLiveRecords = ent.length > 0 || can.length > 0 || spo.length > 0 || gas.length > 0;

    let ingresosEntradas = ent.reduce((sum, e) => sum + (e.subtotal || 0), 0);
    let ingresosCantina = can.reduce((sum, c) => sum + (c.total_ventas || 0), 0);
    let ingresosSponsors = spo.reduce((sum, s) => sum + (s.monto || 0), 0);
    let totalGastos = gas.reduce((sum, g) => sum + (g.monto || 0), 0);

    const transEnt = ent.reduce((sum, e) => sum + (e.transferencia || 0), 0);
    const transCan = can.reduce((sum, c) => sum + (c.transferencia || 0), 0);
    const transSpo = spo.filter(s => s.medio_pago === 'Transferencia').reduce((sum, s) => sum + (s.monto || 0), 0);
    const transGas = gas.filter(g => g.medio_pago === 'Transferencia').reduce((sum, g) => sum + (g.monto || 0), 0);
    let transferencias = Math.max(0, (transEnt + transCan + transSpo) - transGas);

    // Si es un mes histórico cerrado sin registros en vivo, usar el consolidado guardado
    if (!hasLiveRecords && monthlyClosures[monthKey]) {
      const hist = monthlyClosures[monthKey];
      ingresosEntradas = hist.entradas || 0;
      ingresosCantina = hist.cantina || 0;
      ingresosSponsors = hist.sponsors || 0;
      totalGastos = hist.totalGastos || 0;
      transferencias = hist.transferencias || 0;
    }

    const totalIngresos = ingresosEntradas + ingresosCantina + ingresosSponsors;
    const saldoNeto = totalIngresos - totalGastos;

    // Desglose de gastos por categoría del mes
    const catMap = gas.reduce((acc, g) => {
      const cat = g.motivo_categoria || 'Otros Gastos';
      acc[cat] = (acc[cat] || 0) + (g.monto || 0);
      return acc;
    }, {});

    const categoriasGasto = Object.entries(catMap).map(([categoria, monto]) => ({
      categoria,
      monto,
      porcentaje: totalGastos > 0 ? (monto / totalGastos) * 100 : 0
    })).sort((a, b) => b.monto - a.monto);

    return {
      id: monthKey,
      label: formatMonthLabel(monthKey),
      isCurrent: monthKey === currentSystemMonth,
      isClosed: Boolean(monthlyClosures[monthKey]?.isClosed),
      ingresosEntradas,
      ingresosCantina,
      ingresosSponsors,
      totalIngresos,
      totalGastos,
      saldoNeto,
      transferencias,
      categoriasGasto,
      hasLiveRecords
    };
  };

  // Lista de meses disponibles para selección y auditoría (dinámico desde Sep 2026)
  const monthsListKeys = generateMonthsList();
  const allMonthsData = monthsListKeys.map(key => getMonthData(key));

  // Datos del mes actualmente seleccionado
  const mesActivoData = getMonthData(selectedMonth);

  // Exportación filtrada por mes seleccionado
  const handleExportExcelFiltered = () => {
    const entMes = entradas.filter(e => getRecordMonth(e) === selectedMonth);
    const canMes = cantina.filter(c => getRecordMonth(c) === selectedMonth);
    const spoMes = sponsors.filter(s => getRecordMonth(s) === selectedMonth);
    const gasMes = gastos.filter(g => getRecordMonth(g) === selectedMonth);
    const renMes = rendiciones ? rendiciones.filter(r => (r.fecha || '').slice(0, 7) === selectedMonth) : [];

    exportToExcel({
      balanceData: {
        cajaEfectivo: balanceData.cajaEfectivo,
        fondoSponsors: balanceData.fondoSponsors,
        cuentaBancoClub: mesActivoData.transferencias,
        totalIngresos: mesActivoData.totalIngresos,
        totalGastos: mesActivoData.totalGastos,
        saldoNeto: mesActivoData.saldoNeto
      },
      entradas: entMes,
      cantina: canMes,
      sponsors: spoMes,
      gastos: gasMes,
      rendiciones: renMes,
      periodoLabel: mesActivoData.label
    });
  };

  const handleExportPdfFiltered = () => {
    const entMes = entradas.filter(e => getRecordMonth(e) === selectedMonth);
    const canMes = cantina.filter(c => getRecordMonth(c) === selectedMonth);
    const spoMes = sponsors.filter(s => getRecordMonth(s) === selectedMonth);
    const gasMes = gastos.filter(g => getRecordMonth(g) === selectedMonth);
    const renMes = rendiciones ? rendiciones.filter(r => (r.fecha || '').slice(0, 7) === selectedMonth) : [];

    exportToPdf({
      balanceData: {
        cajaEfectivo: balanceData.cajaEfectivo,
        fondoSponsors: balanceData.fondoSponsors,
        cuentaBancoClub: mesActivoData.transferencias,
        totalIngresos: mesActivoData.totalIngresos,
        totalGastos: mesActivoData.totalGastos,
        saldoNeto: mesActivoData.saldoNeto
      },
      entradas: entMes,
      cantina: canMes,
      sponsors: spoMes,
      gastos: gasMes,
      rendiciones: renMes,
      periodoLabel: mesActivoData.label
    });
  };

  // Datos para el gráfico de barras comparativo (Ingresos vs Gastos) — últimos 6 meses desde Sep 2026
  const chartMonthKeys = generateMonthsList().slice(0, 6).reverse();
  const monthlyData = chartMonthKeys.map(key => {
    const d = getMonthData(key);
    return { label: d.label.split(' ')[0], income: d.totalIngresos, expense: d.totalGastos };
  });

  // matchesData basado en partidos reales del mes activo (entradas por partido)
  const matchesData = (() => {
    const partidosMap = {};
    entradas.filter(e => (e.fecha || '').slice(0, 7) === selectedMonth).forEach(e => {
      const key = e.fecha ? e.fecha.slice(0, 10) : 'Sin fecha';
      if (!partidosMap[key]) partidosMap[key] = { income: 0, expense: 0 };
      partidosMap[key].income += (e.subtotal || 0);
    });
    cantina.filter(c => (c.fecha || '').slice(0, 7) === selectedMonth).forEach(c => {
      const key = c.fecha ? c.fecha.slice(0, 10) : 'Sin fecha';
      if (!partidosMap[key]) partidosMap[key] = { income: 0, expense: 0 };
      partidosMap[key].income += (c.total_ventas || 0);
    });
    gastos.filter(g => (g.fecha || '').slice(0, 7) === selectedMonth && g.rival).forEach(g => {
      const key = g.fecha ? g.fecha.slice(0, 10) : 'Sin fecha';
      if (!partidosMap[key]) partidosMap[key] = { income: 0, expense: 0 };
      partidosMap[key].expense += (g.monto || 0);
    });
    return Object.entries(partidosMap).sort().map(([fecha, vals], i) => ({
      label: `Jorn. ${i + 1}`,
      income: vals.income,
      expense: vals.expense
    }));
  })();

  const currentChartData = chartView === 'monthly' ? monthlyData : matchesData;
  const maxChartVal = Math.max(...currentChartData.map(d => Math.max(d.income, d.expense))) || 1000000;

  return (
    <div className="page-container">
      {/* Cabecera del Tablero General con Selector Mensual */}
      <div className="page-header" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title">Tablero General</h1>
          <p className="page-description">
            Transparencia y control financiero en tiempo real.
          </p>
        </div>

        {/* Controles de Período y Exportación Filtrada */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Selector de Mes */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--bg-card)',
            padding: '6px 12px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)'
          }}>
            <Calendar size={16} color="var(--club-red)" />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Período:
            </span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              {allMonthsData.map(m => (
                <option key={m.id} value={m.id} style={{ background: '#1c1f26', color: '#ffffff' }}>
                  {m.label} {m.isCurrent ? '(Mes en Curso)' : m.isClosed ? '(Cerrado)' : '($0)'}
                </option>
              ))}
            </select>
            {mesActivoData.isCurrent ? (
              <span className="badge badge-approved" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                En Curso
              </span>
            ) : mesActivoData.isClosed ? (
              <span style={{
                fontSize: '0.68rem',
                padding: '2px 8px',
                borderRadius: '4px',
                background: 'rgba(255,255,255,0.08)',
                color: 'var(--text-secondary)',
                fontWeight: 700
              }}>
                Cerrado
              </span>
            ) : (
              <span style={{
                fontSize: '0.68rem',
                padding: '2px 8px',
                borderRadius: '4px',
                background: 'rgba(245, 158, 11, 0.15)',
                color: '#f59e0b',
                fontWeight: 700
              }}>
                Sin Movimientos ($0)
              </span>
            )}
          </div>

          <button className="btn btn-secondary" onClick={handleExportExcelFiltered}>
            <FileSpreadsheet size={16} color="var(--color-success)" />
            <span>Descargar Excel</span>
          </button>
          <button className="btn btn-primary" onClick={handleExportPdfFiltered}>
            <FileText size={16} />
            <span>Descargar Informe PDF</span>
          </button>
        </div>
      </div>

      {/* Grilla Principal de Métricas */}
      <div className="metrics-grid">
        {/* Tarjeta Héroe Roja: Dinero Total Disponible (Caja física persistente + transferencias del mes) */}
        <div className="card card-hero">
          <div className="card-hero-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="card-hero-icon">
                <Wallet size={24} color="#ffffff" />
              </div>
              <div>
                <div className="card-hero-title">DINERO TOTAL DISPONIBLE</div>
                <div className="card-hero-subtitle">Caja en Mano (Efectivo Físico)</div>
              </div>
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.2)',
              padding: '4px 10px',
              borderRadius: '9999px',
              fontSize: '0.72rem',
              fontWeight: 800,
              letterSpacing: '0.03em'
            }}>
              CAJA OPERATIVA
            </div>
          </div>

          <div className="hero-balance-number">
            {formatCurrency(balanceData.cajaEfectivo)}
          </div>

          {/* Bloque de Fondo de Sponsors (acumulativo histórico, separado de caja operativa) */}
          <div className="hero-breakdown-row" style={{ gridTemplateColumns: '1fr', paddingTop: '10px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              background: 'rgba(0, 0, 0, 0.35)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              fontSize: '0.8rem',
              color: 'rgba(255, 255, 255, 0.95)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={16} color="#f59e0b" style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#f59e0b', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.04em' }}>
                    Sponsors y Publicidad (Acumulado Histórico)
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)' }}>
                    Fondo independiente • Separado de la caja operativa
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#f59e0b' }}>
                  {formatCurrency(balanceData.fondoSponsors || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Métrica 2: Ingresos del Mes Seleccionado (Reset automático en $0 para nuevos meses) */}
        <div className="card card-metric">
          <div>
            <div className="card-metric-header">
              <div>
                <div className="metric-label">TOTAL INGRESOS ({mesActivoData.label.toUpperCase()})</div>
                <div className="metric-value" style={{ color: 'var(--color-success)' }}>
                  {formatCurrency(mesActivoData.totalIngresos)}
                </div>
              </div>
              <div className="metric-icon-box" style={{ color: 'var(--color-success)' }}>
                <TrendingUp size={22} />
              </div>
            </div>
            <div className="metric-trend trend-up">
              <ArrowUpRight size={14} /> {mesActivoData.isCurrent ? 'Mes en curso' : 'Período cerrado'}
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '16px' }}>
            Entradas, Cantina y Sponsors de {mesActivoData.label}
          </div>
        </div>

        {/* Métrica 3: Gastos del Mes Seleccionado (Reset automático en $0 para nuevos meses) */}
        <div className="card card-metric">
          <div>
            <div className="card-metric-header">
              <div>
                <div className="metric-label">TOTAL GASTOS Y SALIDAS ({mesActivoData.label.toUpperCase()})</div>
                <div className="metric-value" style={{ color: 'var(--color-danger)' }}>
                  {formatCurrency(mesActivoData.totalGastos)}
                </div>
              </div>
              <div className="metric-icon-box" style={{ color: 'var(--color-danger)' }}>
                <TrendingDown size={22} />
              </div>
            </div>
            <div className="metric-trend trend-down">
              <ArrowDownRight size={14} /> Gastos imputados a {mesActivoData.label}
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '16px' }}>
            Arbitrajes, mantenimiento e insumos del mes
          </div>
        </div>
      </div>

      {/* Gráfico y Distribución Consolidada */}
      <div className="dashboard-grid-2">
        {/* Gráfico de Flujo de Fondos (Cash Flow) */}
        <div className="card">
          <div className="chart-header">
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff' }}>
                Flujo Financiero (Cash Flow)
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Comparativa de Ingresos vs. Gastos por período
              </div>
            </div>

            <div className="segmented-control">
              <button
                className={`segmented-btn ${chartView === 'monthly' ? 'active' : ''}`}
                onClick={() => setChartView('monthly')}
              >
                Mensual
              </button>
              <button
                className={`segmented-btn ${chartView === 'matches' ? 'active' : ''}`}
                onClick={() => setChartView('matches')}
              >
                Jornadas
              </button>
            </div>
          </div>

          {/* Indicador limpio del Saldo Neto Período */}
          <div style={{ margin: '14px 0 20px', display: 'flex', alignItems: 'baseline', gap: '10px' }}>
            <span style={{
              fontSize: '1.85rem',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: mesActivoData.saldoNeto >= 0 ? 'var(--color-success)' : 'var(--color-danger)'
            }}>
              {formatCurrency(mesActivoData.saldoNeto)}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Saldo Neto de {mesActivoData.label}
            </span>
          </div>

          {/* Barras Estilizadas Fintrixity: Duales */}
          <div className="bar-chart-bars">
            {currentChartData.map((bar, i) => {
              const heightIncome = Math.min(100, Math.max(8, (bar.income / maxChartVal) * 100));
              const heightExpense = Math.min(100, Math.max(8, (bar.expense / maxChartVal) * 100));
              return (
                <div key={i} className="bar-col">
                  <div className="bar-dual-tracks">
                    <div
                      className="bar-track-income"
                      title={`${bar.label} - Ingresos: ${formatCurrency(bar.income)}`}
                    >
                      <div
                        className="bar-fill-income"
                        style={{ height: `${heightIncome}%` }}
                      />
                    </div>
                    <div
                      className="bar-track-expense"
                      title={`${bar.label} - Gastos: ${formatCurrency(bar.expense)}`}
                    >
                      <div
                        className="bar-fill-expense"
                        style={{ height: `${heightExpense}%` }}
                      />
                    </div>
                  </div>
                  <span className="bar-label">{bar.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sección "Composición de Ingresos y Gastos" del Mes Seleccionado con Transferencias Integradas */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', marginBottom: '4px' }}>
                Composición de Ingresos y Gastos
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                Desglose operativo - {mesActivoData.label}
              </div>
            </div>

            {/* Pestañas de filtrado */}
            <div className="segmented-control" style={{ transform: 'scale(0.92)', transformOrigin: 'top right' }}>
              <button
                className={`segmented-btn ${compositionTab === 'all' ? 'active' : ''}`}
                onClick={() => setCompositionTab('all')}
              >
                Todos
              </button>
              <button
                className={`segmented-btn ${compositionTab === 'incomes' ? 'active' : ''}`}
                onClick={() => setCompositionTab('incomes')}
              >
                Ingresos
              </button>
              <button
                className={`segmented-btn ${compositionTab === 'expenses' ? 'active' : ''}`}
                onClick={() => setCompositionTab('expenses')}
              >
                Gastos
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {mesActivoData.totalIngresos === 0 && mesActivoData.totalGastos === 0 && mesActivoData.transferencias === 0 ? (
              <div style={{
                padding: '24px 16px',
                textAlign: 'center',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255,255,255,0.02)',
                border: '1px dashed var(--border-subtle)'
              }}>
                <Sparkles size={24} color="var(--text-muted)" style={{ margin: '0 auto 8px' }} />
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff', marginBottom: '4px' }}>
                  Sin movimientos en {mesActivoData.label}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Las partidas inician en $0 para este período.
                </div>
              </div>
            ) : (
              <>
                {/* SUBSECCIÓN 1: INGRESOS OPERATIVOS DEL MES */}
                {(compositionTab === 'all' || compositionTab === 'incomes') && (
                  <div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: 'var(--color-success)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      marginBottom: '10px'
                    }}>
                      <span>🟢 Ingresos de {mesActivoData.label}</span>
                      <span>{formatCurrency(mesActivoData.totalIngresos)}</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {/* Entradas */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '5px' }}>
                          <span style={{ color: '#ffffff', fontWeight: 600 }}>🎟️ Venta de Entradas</span>
                          <span style={{ fontWeight: 700, color: 'var(--club-red)' }}>
                            {formatCurrency(mesActivoData.ingresosEntradas)}
                          </span>
                        </div>
                        <div style={{ height: '7px', background: 'var(--bg-input)', borderRadius: '9999px', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${(mesActivoData.ingresosEntradas / (mesActivoData.totalIngresos || 1)) * 100}%`,
                            background: 'var(--club-red)',
                            borderRadius: '9999px'
                          }} />
                        </div>
                      </div>

                      {/* Cantina */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '5px' }}>
                          <span style={{ color: '#ffffff', fontWeight: 600 }}>🍔 Cantina del Club</span>
                          <span style={{ fontWeight: 700, color: 'var(--color-info)' }}>
                            {formatCurrency(mesActivoData.ingresosCantina)}
                          </span>
                        </div>
                        <div style={{ height: '7px', background: 'var(--bg-input)', borderRadius: '9999px', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${(mesActivoData.ingresosCantina / (mesActivoData.totalIngresos || 1)) * 100}%`,
                            background: 'var(--color-info)',
                            borderRadius: '9999px'
                          }} />
                        </div>
                      </div>

                      {/* Sponsors */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '5px' }}>
                          <span style={{ color: '#ffffff', fontWeight: 600 }}>🏆 Sponsors y Publicidad</span>
                          <span style={{ fontWeight: 700, color: 'var(--color-success)' }}>
                            {formatCurrency(mesActivoData.ingresosSponsors)}
                          </span>
                        </div>
                        <div style={{ height: '7px', background: 'var(--bg-input)', borderRadius: '9999px', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${(mesActivoData.ingresosSponsors / (mesActivoData.totalIngresos || 1)) * 100}%`,
                            background: 'var(--color-success)',
                            borderRadius: '9999px'
                          }} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TRANSFERENCIAS AL CLUB EN EL MES (Completamente integradas) */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  background: 'rgba(229, 37, 42, 0.08)',
                  border: '1px solid rgba(229, 37, 42, 0.18)',
                  fontSize: '0.8rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Landmark size={15} color="var(--club-red)" />
                    <span style={{ color: '#ffffff', fontWeight: 600 }}>🏛️ Transferencias al Club ({mesActivoData.label})</span>
                  </div>
                  <span style={{ fontWeight: 700, color: 'var(--club-red)', fontSize: '0.86rem' }}>
                    {formatCurrency(mesActivoData.transferencias)}
                  </span>
                </div>

                {/* SEPARADOR */}
                {compositionTab === 'all' && (
                  <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '2px 0' }} />
                )}

                {/* SUBSECCIÓN 2: GASTOS Y SALIDAS DEL MES */}
                {(compositionTab === 'all' || compositionTab === 'expenses') && (
                  <div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: '#f59e0b',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      marginBottom: '10px'
                    }}>
                      <span>🟠 Gastos y Egresos Operativos</span>
                      <span>{formatCurrency(mesActivoData.totalGastos)}</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {mesActivoData.categoriasGasto.length === 0 ? (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '6px 0' }}>
                          Sin gastos registrados para este mes.
                        </div>
                      ) : (
                        mesActivoData.categoriasGasto.map((item, idx) => (
                          <div key={idx}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '5px' }}>
                              <span style={{ color: '#ffffff', fontWeight: 600, fontSize: '0.8rem' }}>
                                • {item.categoria}
                              </span>
                              <span style={{ fontWeight: 700, color: '#f59e0b' }}>
                                {formatCurrency(item.monto)}
                              </span>
                            </div>
                            <div style={{ height: '7px', background: 'var(--bg-input)', borderRadius: '9999px', overflow: 'hidden' }}>
                              <div style={{
                                height: '100%',
                                width: `${item.porcentaje}%`,
                                background: 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)',
                                borderRadius: '9999px'
                              }} />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

