import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getRivalInfo } from './rivales';

// Formato de moneda argentina ($)
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount || 0);
};

/**
 * Genera una lista de períodos YYYY-MM desde Septiembre 2026 hasta el mes actual (inclusive),
 * en orden descendente (más reciente primero). Usar en todos los selectores de período.
 */
export const generateMonthsList = () => {
  const now = new Date();
  const start = new Date(2026, 8, 1); // Sep 2026
  const end = new Date(now.getFullYear(), now.getMonth(), 1);
  const months = [];
  let cursor = new Date(end);
  while (cursor >= start) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, '0');
    months.push(`${y}-${m}`);
    cursor.setMonth(cursor.getMonth() - 1);
  }
  return months;
};

/** Devuelve el mes actual del sistema en formato YYYY-MM */
export const getCurrentSystemMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};



// Formato de fecha legible
export const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  try {
    const [year, month, day] = dateStr.split('T')[0].split('-');
    return `${day}/${month}/${year}`;
  } catch (e) {
    return dateStr;
  }
};

// Exportar a Excel (.xlsx)
export const exportToExcel = ({ balanceData, entradas, cantina, sponsors, gastos, rendiciones, periodoLabel }) => {
  const wb = XLSX.utils.book_new();

  // Hoja 1: Resumen General
  const resumenData = [
    ['HOCKEY CLUB SAN MARTIN (A.C.S.M.)'],
    [`INFORME DE BALANCE FINANCIERO Y CONTABLE - PERÍODO: ${periodoLabel ? periodoLabel.toUpperCase() : 'GENERAL'}`],
    ['Fecha de Generación:', new Date().toLocaleDateString('es-AR') + ' ' + new Date().toLocaleTimeString('es-AR')],
    [],
    ['CONCEPTO', 'MONTO (ARS)'],
    ['Dinero Total Disponible (Caja en Mano Efectivo)', balanceData.cajaEfectivo],
    [`Acreditado en Cuenta Club San Martín (Transferencias ${periodoLabel || 'Período'})`, balanceData.cuentaBancoClub],
    [`Total Ingresos (${periodoLabel || 'Período'})`, balanceData.totalIngresos],
    [`Total Gastos y Egresos (${periodoLabel || 'Período'})`, balanceData.totalGastos],
    [`Saldo Neto (${periodoLabel || 'Período'})`, balanceData.saldoNeto]
  ];
  const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen Financiero');

  // Hoja 2: Entradas
  const entradasFormatted = entradas.map(e => {
    let rawTipo = (e.talonario_tipo || e.tipo_talonario || e.tipo_sector || e.sector || '').trim();
    const torneoName = String(e.torneo_tipo || '').trim().toUpperCase();
    if (rawTipo.toUpperCase() === 'CLAUSURA' || rawTipo.toUpperCase() === 'APERTURA' || (torneoName && rawTipo.toUpperCase() === torneoName)) {
      rawTipo = '';
    }
    let tipoLabel = 'GENERAL';
    if (!rawTipo) {
      if (e.es_playa) {
        tipoLabel = JSON.stringify(e).toUpperCase().includes('VISITANTE') ? 'PLAYA (VISITANTE)' : 'PLAYA (LOCAL)';
      } else {
        tipoLabel = 'GENERAL';
      }
    } else {
      const upper = rawTipo.toUpperCase();
      if (upper === 'GENERAL' || upper === 'ENTRADA' || upper === 'ENTRADAS') tipoLabel = 'GENERAL';
      else if (upper === 'LOCAL' || upper === 'PLAYA_LOCAL' || upper === 'PLAYA (LOCAL)') tipoLabel = 'PLAYA (LOCAL)';
      else if (upper === 'VISITANTE' || upper === 'PLAYA_VISITANTE' || upper === 'PLAYA (VISITANTE)') tipoLabel = 'PLAYA (VISITANTE)';
      else if (e.es_playa && !upper.includes('PLAYA')) tipoLabel = `PLAYA (${upper})`;
      else tipoLabel = upper;
    }

    const nroIni = Number(e.nro_inicial ?? e.nroInicial ?? e.nro_inicio ?? e.ticket_inicial ?? e.desde ?? 0);
    const nroFin = Number(e.nro_final ?? e.nroFinal ?? e.nro_fin ?? e.ticket_final ?? e.hasta ?? 0);

    return {
      'Fecha': formatDate(e.fecha),
      'Rival': e.rival,
      'División': e.division,
      'Torneo': e.torneo_tipo,
      'Sector / Tipo': tipoLabel,
      'Rango Tickets': (nroIni > 0 || nroFin > 0) ? `N° ${String(nroIni).padStart(4, '0')} al ${String(nroFin).padStart(4, '0')}` : '—',
      'N° Inicial': nroIni || '-',
      'N° Final': nroFin || '-',
      'Cant. Vendida': e.cantidad_vendida || 0,
      'Precio Unit.': e.precio_unitario || 0,
      'Subtotal': e.subtotal || 0,
      'Efectivo': e.efectivo || 0,
      'Transferencia (Club)': e.transferencia || 0,
      'Cargado Por': (e.created_by_name || 'Usuario') + ' (' + (e.created_by_role || 'Delegado') + ')'
    };
  });
  const wsEntradas = XLSX.utils.json_to_sheet(entradasFormatted);
  XLSX.utils.book_append_sheet(wb, wsEntradas, 'Entradas');

  // Hoja 3: Cantina
  const cantinaFormatted = cantina.map(c => ({
    'Fecha': formatDate(c.fecha),
    'Rival': c.rival,
    'División': c.division,
    'Total Ventas': c.total_ventas,
    'Efectivo': c.efectivo,
    'Transferencia (Club)': c.transferencia,
    'Notas': c.notas || '-',
    'Cargado Por': c.created_by_name + ' (' + c.created_by_role + ')'
  }));
  const wsCantina = XLSX.utils.json_to_sheet(cantinaFormatted);
  XLSX.utils.book_append_sheet(wb, wsCantina, 'Cantina');

  // Hoja 4: Sponsors
  const sponsorsFormatted = sponsors.map(s => ({
    'Sponsor / Empresa': s.nombre,
    'Tipo de Publicidad': s.tipo,
    'Monto Acordado': s.monto,
    'Medio de Pago': s.medio_pago,
    'Vigencia': s.vigencia || '-',
    'Estado': s.estado,
    'Cargado Por': s.created_by_name
  }));
  const wsSponsors = XLSX.utils.json_to_sheet(sponsorsFormatted);
  XLSX.utils.book_append_sheet(wb, wsSponsors, 'Sponsors');

  // Hoja 5: Gastos
  const gastosFormatted = gastos.map(g => ({
    'Fecha': formatDate(g.fecha),
    'Categoría / Motivo': g.motivo_categoria,
    'Partido / Rival': g.rival ? `vs ${getRivalInfo(g.rival).name} (${g.division || ''})` : 'General Club',
    'Monto': g.monto,
    'Medio de Pago': g.medio_pago === 'Efectivo' ? 'Efectivo de Caja' : g.medio_pago,
    'Proveedor / Destino': g.proveedor || '-',
    'Cargado Por': g.created_by_name
  }));
  const wsGastos = XLSX.utils.json_to_sheet(gastosFormatted);
  XLSX.utils.book_append_sheet(wb, wsGastos, 'Gastos');

  // Hoja 6: Rendición al Club San Martín
  const rendicionFormatted = rendiciones.map(r => ({
    'Fecha': formatDate(r.fecha),
    'Rival': r.rival,
    'División': r.division,
    'Entradas (Transf.)': r.transferencia_entradas,
    'Cantina (Transf.)': r.transferencia_cantina,
    'Total Rendido a Cuenta Club': r.total_rendido_club
  }));
  const wsRendicion = XLSX.utils.json_to_sheet(rendicionFormatted);
  XLSX.utils.book_append_sheet(wb, wsRendicion, 'Rendición Club San Martín');

  // Descargar archivo Excel
  const fileName = `Hockey_San_Martin_Balance_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

// Exportar a PDF Membretado con Escudo
export const exportToPdf = ({ balanceData, entradas, cantina, sponsors = [], gastos, rendiciones, periodoLabel }) => {
  const doc = new jsPDF('p', 'mm', 'a4');

  // Encabezado con Rojo Institucional San Martín
  doc.setFillColor(211, 47, 47); // #D32F2F
  doc.rect(0, 0, 210, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('HOCKEY CLUB SAN MARTIN', 15, 14);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Sistema de Gestión Contable - Período: ${periodoLabel || 'General'}`, 15, 19);

  const fechaGen = new Date().toLocaleDateString('es-AR') + ' ' + new Date().toLocaleTimeString('es-AR');
  doc.text(`Emisión: ${fechaGen}`, 195, 14, { align: 'right' });

  // Calcular Total Transferido al Club acumulado en las rendiciones del período
  const totalTransferidoClub = rendiciones.reduce((sum, r) => sum + (Number(r.total_rendido_club) || (Number(r.transferencia_entradas || 0) + Number(r.transferencia_cantina || 0))), 0);

  // Tarjeta de Resumen Ejecutivo y Fondos Disponibles
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 28, 182, 53, 3, 3, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 28, 182, 53, 3, 3, 'S');

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`ESTADO FINANCIERO Y FONDOS DISPONIBLES - ${periodoLabel ? periodoLabel.toUpperCase() : 'GENERAL'}`, 20, 35);

  // Línea divisoria horizontal sutil
  doc.setDrawColor(226, 232, 240);
  doc.line(20, 38, 190, 38);

  // COLUMNA IZQUIERDA: FONDOS DISPONIBLES (Caja Operativa vs Fondo de Sponsors)
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('Caja en Mano (Efectivo Operativo):', 20, 46);
  doc.setTextColor(16, 120, 70); // Verde distinguido
  doc.text(formatCurrency(balanceData.cajaEfectivo || 0), 96, 46, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('Fondo de Sponsors Disponible:', 20, 54);
  doc.setTextColor(180, 83, 9); // Ámbar / Dorado Sponsors
  doc.text(formatCurrency(balanceData.fondoSponsors || 0), 96, 54, { align: 'right' });

  // Métrica Destacada: Total Transferido al Club San Martín (Movido a columna izquierda)
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175); // Azul institucional
  doc.text('Total Transferido al Club:', 20, 62);
  doc.text(formatCurrency(totalTransferidoClub), 96, 62, { align: 'right' });

  // Separador vertical entre columnas
  doc.setDrawColor(226, 232, 240);
  doc.line(103, 40, 103, 78);

  // COLUMNA DERECHA: RENDIMIENTO CONTABLE (Ingresos, Gastos y Saldo)
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(`Total Ingresos (${periodoLabel || 'Período'}):`, 108, 44);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 120, 70);
  doc.text(formatCurrency(balanceData.totalIngresos || 0), 190, 44, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(`Total Gastos (${periodoLabel || 'Período'}):`, 108, 51);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(211, 47, 47);
  doc.text(formatCurrency(balanceData.totalGastos || 0), 190, 51, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(`Saldo Neto (${periodoLabel || 'Período'}):`, 108, 58);
  const esSaldoPositivo = (balanceData.saldoNeto || 0) >= 0;
  doc.setTextColor(esSaldoPositivo ? 16 : 211, esSaldoPositivo ? 120 : 47, esSaldoPositivo ? 70 : 47);
  doc.text(formatCurrency(balanceData.saldoNeto || 0), 190, 58, { align: 'right' });

  let currentY = 89;

  // Tabla de Rendición al Club San Martín
  doc.setTextColor(33, 37, 41);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('1. RENDICIÓN AL CLUB SAN MARTÍN (Ingresos por Transferencia)', 15, currentY);

  autoTable(doc, {
    startY: currentY + 3,
    head: [['Fecha', 'Rival', 'División', 'Entradas ($)', 'Cantina ($)', 'Total Transferido']],
    body: rendiciones.slice(0, 10).map(r => [
      formatDate(r.fecha),
      r.rival,
      r.division,
      formatCurrency(r.transferencia_entradas),
      formatCurrency(r.transferencia_cantina),
      formatCurrency(r.total_rendido_club)
    ]),
    foot: [['TOTAL TRANSFERIDO AL CLUB', '', '', '', '', formatCurrency(totalTransferidoClub)]],
    theme: 'striped',
    headStyles: { fillColor: [211, 47, 47], textColor: 255, fontSize: 8 },
    footStyles: { fillColor: [240, 244, 248], textColor: [30, 64, 175], fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7 },
    margin: { left: 14, right: 14 }
  });

  currentY = doc.lastAutoTable.finalY + 12;

  // Si queda poco espacio, pasar de página
  if (currentY > 210) {
    doc.addPage();
    currentY = 20;
  }

  // Tabla de Gastos Recientes
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(33, 37, 41);
  doc.text('2. GASTOS Y EGRESOS REGISTRADOS', 15, currentY);

  autoTable(doc, {
    startY: currentY + 3,
    head: [['Fecha', 'Motivo / Categoría', 'Partido / Rival', 'Proveedor', 'Medio', 'Monto']],
    body: gastos.slice(0, 10).map(g => [
      formatDate(g.fecha),
      g.motivo_categoria,
      g.rival ? `vs ${getRivalInfo(g.rival).name}` : 'General Club',
      g.proveedor || '-',
      g.medio_pago === 'Efectivo' ? 'Efectivo de Caja' : g.medio_pago,
      formatCurrency(g.monto)
    ]),
    theme: 'striped',
    headStyles: { fillColor: [50, 50, 50], textColor: 255, fontSize: 8 },
    bodyStyles: { fontSize: 7 },
    margin: { left: 14, right: 14 }
  });

  // Tabla de Patrocinios / Sponsors si existen
  if (sponsors && sponsors.length > 0) {
    currentY = doc.lastAutoTable.finalY + 12;
    if (currentY > 210) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(33, 37, 41);
    doc.text('3. PATROCINIOS Y SPONSORS (Convenios Comerciales)', 15, currentY);

    autoTable(doc, {
      startY: currentY + 3,
      head: [['Empresa / Sponsor', 'Tipo de Publicidad', 'Medio de Pago', 'Vigencia', 'Monto Acordado']],
      body: sponsors.slice(0, 10).map(s => [
        s.nombre,
        s.tipo,
        s.medio_pago || 'Transferencia',
        s.vigencia || 'Temporada 2026',
        formatCurrency(s.monto)
      ]),
      theme: 'striped',
      headStyles: { fillColor: [180, 83, 9], textColor: 255, fontSize: 8 },
      bodyStyles: { fontSize: 7 },
      margin: { left: 14, right: 14 }
    });
  }

  // Pie de Página
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `Hockey Club San Martín - Página ${i} de ${pageCount} | Documento confidencial para uso interno y de padres`,
      105,
      290,
      { align: 'center' }
    );
  }

  // Guardar archivo PDF
  doc.save(`Hockey_San_Martin_Informe_${new Date().toISOString().split('T')[0]}.pdf`);
};
