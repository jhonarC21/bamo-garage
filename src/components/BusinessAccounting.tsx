import React, { useState } from 'react';
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  Building2,
  FileCheck,
  Percent,
  Download,
  Calendar,
  AlertCircle,
  PieChart as PieChartIcon,
  ShieldCheck,
  Landmark,
  Scale,
  Sparkles,
} from 'lucide-react';
import { useParking } from '../context/ParkingContext';
import { formatCLP } from '../utils/pricing';

export const BusinessAccounting: React.FC = () => {
  const {
    completedSessions,
    accessorySales,
    monthlyContracts,
    expenses,
    payrollSettlements,
    settings,
    currentTime,
  } = useParking();

  const [periodFilter, setPeriodFilter] = useState<'all' | 'current_month'>('current_month');

  const currentYearMonth = `${currentTime.getFullYear()}-${String(currentTime.getMonth() + 1).padStart(2, '0')}`;

  // Filter completed sessions by period
  const filteredSessions = periodFilter === 'all'
    ? completedSessions
    : completedSessions.filter((s) => (s.exitTime || s.entryTime || '').startsWith(currentYearMonth));

  const filteredSales = periodFilter === 'all'
    ? accessorySales
    : accessorySales.filter((s) => (s.soldAt || s.date || '').startsWith(currentYearMonth));

  const filteredContracts = periodFilter === 'all'
    ? monthlyContracts
    : monthlyContracts.filter((c) => (c.createdAt || c.startDate || '').startsWith(currentYearMonth));

  const filteredExpenses = periodFilter === 'all'
    ? expenses
    : expenses.filter((e) => (e.date || '').startsWith(currentYearMonth));

  const filteredPayroll = periodFilter === 'all'
    ? payrollSettlements
    : payrollSettlements.filter(
        (p) =>
          p.month === currentYearMonth ||
          (p.paidAt && p.paidAt.startsWith(currentYearMonth)) ||
          (p.createdAt && p.createdAt.startsWith(currentYearMonth))
      );

  // --- REVENUE BREAKDOWN ---
  const parkingGross = filteredSessions.reduce((acc, s) => acc + (s.parkingCost || 0), 0);
  const washGross = filteredSessions.reduce(
    (acc, s) => acc + (s.washOrders ? s.washOrders.reduce((wAcc, w) => wAcc + (w.price || 0), 0) : 0),
    0
  );
  const shopGross =
    filteredSales.reduce((acc, s) => acc + (s.totalAmount ?? s.total ?? 0), 0) +
    filteredSessions.reduce(
      (acc, s) => acc + (s.accessorySales ? s.accessorySales.reduce((aAcc, a) => aAcc + (a.total || 0), 0) : 0),
      0
    );
  const contractsGross = filteredContracts.reduce((acc, c) => acc + (c.monthlyFee || 0), 0);
  const valetGross = filteredSessions.reduce(
    (acc, s) => acc + (s.hasValetParking ? (s.valetParkingFee || 0) : 0),
    0
  );

  const totalGrossRevenue = parkingGross + washGross + shopGross + contractsGross + valetGross;

  // Under Chilean tax law, retail/service prices to final consumer are IVA Included (Bruto con IVA 19%)
  // Neto = Bruto / 1.19, IVA Débito = Bruto - Neto
  const netRevenue = Math.round(totalGrossRevenue / (1 + settings.ivaRateChile));
  const ivaDebitoFiscal = totalGrossRevenue - netRevenue;

  // --- EXPENSE BREAKDOWN ---
  const directExpensesTotal = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);

  // IVA Crédito Fiscal: on invoices (facturas) that include deductible IVA
  const invoiceExpenses = filteredExpenses.filter((e) => e.hasInvoiceIVA && e.documentType === 'factura');
  const invoiceExpensesGross = invoiceExpenses.reduce((acc, e) => acc + e.amount, 0);
  const invoiceExpensesNet = Math.round(invoiceExpensesGross / (1 + settings.ivaRateChile));
  const ivaCreditoFiscal = invoiceExpensesGross - invoiceExpensesNet;

  // Total payroll employer cost
  const totalPayrollEmployerCost = filteredPayroll.reduce((acc, p) => acc + p.totalEmployerCost, 0);
  const totalPayrollNetPaid = filteredPayroll.reduce((acc, p) => acc + p.netSalaryToPay, 0);

  const totalOperatingCosts = directExpensesTotal + totalPayrollEmployerCost;

  // --- TAX OBLIGATIONS (CHILE F29 PROJECTION) ---
  // IVA a pagar = IVA Débito - IVA Crédito
  const ivaBalance = ivaDebitoFiscal - ivaCreditoFiscal;
  const ivaToPay = Math.max(0, ivaBalance);
  const ivaRemanente = ivaBalance < 0 ? Math.abs(ivaBalance) : 0;

  // PPM (Pago Provisional Mensual de Primera Categoría)
  const ppmEstimated = Math.round(netRevenue * settings.ppmRateChile);

  // Retención Boletas de Honorarios (13.75% o 14.5%)
  const honorariosExpenses = filteredExpenses.filter((e) => e.documentType === 'boleta_honorarios');
  const honorariosTotal = honorariosExpenses.reduce((acc, e) => acc + e.amount, 0);
  const honorariosRetention = Math.round(honorariosTotal * settings.retencionHonorariosRateChile);

  // Total estimated F29 monthly tax payment
  const totalF29Estimated = ivaToPay + ppmEstimated + honorariosRetention;

  // --- FINANCIAL RESULTS (ESTADO DE RESULTADOS) ---
  const netOperatingProfit = totalGrossRevenue - totalOperatingCosts;
  const netProfitAfterTax = netOperatingProfit - totalF29Estimated;
  const profitMargin = totalGrossRevenue > 0 ? ((netProfitAfterTax / totalGrossRevenue) * 100).toFixed(1) : '0.0';

  // Group direct expenses by category
  const expenseByCategoryMap: Record<string, number> = {};
  filteredExpenses.forEach((e) => {
    expenseByCategoryMap[e.category] = (expenseByCategoryMap[e.category] || 0) + e.amount;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#0F1117] border border-zinc-800 rounded-2xl p-5 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-cyan-500/10 text-cyan-400 text-xs px-2.5 py-1 rounded-full font-semibold border border-cyan-500/20 flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5 text-cyan-400" />
              {settings.siiOffice || 'SII Calama'}
            </span>
            <span className="text-xs text-zinc-300 font-semibold">{settings.parkingName || 'Bamo Garage SpA'}</span>
            <span className="text-zinc-600">•</span>
            <span className="text-xs text-zinc-400 font-mono">RUT: {settings.rut || '78.084.649-6'}</span>
            <span className="text-zinc-600">•</span>
            <span className="text-xs text-zinc-400">{settings.address || 'Cobija 2058'}</span>
          </div>
          <h2 className="text-xl font-bold text-zinc-100 mt-1 tracking-tight">
            Contabilidad Empresarial & Proyección Tributaria
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Estado de resultados financiero, cálculo de IVA Crédito/Débito, PPM y proyección de Formulario 29.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-zinc-900 border border-zinc-700 rounded-xl p-1 text-xs">
            <button
              onClick={() => setPeriodFilter('current_month')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                periodFilter === 'current_month'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Mes Actual ({currentYearMonth})
            </button>
            <button
              onClick={() => setPeriodFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                periodFilter === 'all'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Histórico Completo
            </button>
          </div>
        </div>
      </div>

      {/* Top 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Gross Revenue */}
        <div className="bg-[#12141C] border border-zinc-800/80 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Ingresos Brutos</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-emerald-400 font-mono">{formatCLP(totalGrossRevenue)}</span>
          </div>
          <div className="mt-2 text-[11px] text-zinc-400">
            Neto: <b className="text-zinc-200">{formatCLP(netRevenue)}</b> | IVA Débito: <b className="text-zinc-200">{formatCLP(ivaDebitoFiscal)}</b>
          </div>
        </div>

        {/* Card 2: Total Operating Costs */}
        <div className="bg-[#12141C] border border-zinc-800/80 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Costos & Gastos Totales</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-rose-400 font-mono">{formatCLP(totalOperatingCosts)}</span>
          </div>
          <div className="mt-2 text-[11px] text-zinc-400">
            Gastos: <b className="text-zinc-200">{formatCLP(directExpensesTotal)}</b> | Nómina: <b className="text-zinc-200">{formatCLP(totalPayrollEmployerCost)}</b>
          </div>
        </div>

        {/* Card 3: Form 29 SII Tax Total */}
        <div className="bg-[#12141C] border border-indigo-500/30 rounded-xl p-4 bg-gradient-to-br from-[#12141C] to-indigo-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">Impuestos Est. F29 SII</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-indigo-300 font-mono">{formatCLP(totalF29Estimated)}</span>
          </div>
          <div className="mt-2 text-[11px] text-zinc-400">
            IVA ({formatCLP(ivaToPay)}) + PPM {settings.ppmRateChile * 100}% ({formatCLP(ppmEstimated)})
          </div>
        </div>

        {/* Card 4: Net Final Profit */}
        <div className="bg-[#12141C] border border-cyan-500/30 rounded-xl p-4 bg-gradient-to-br from-[#12141C] to-cyan-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-cyan-300 uppercase tracking-wider">Utilidad Neta Final</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className={`text-2xl font-bold font-mono ${netProfitAfterTax >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
              {formatCLP(netProfitAfterTax)}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-zinc-400">
            Margen Neto Operacional: <b className="text-cyan-300">{profitMargin}%</b>
          </div>
        </div>
      </div>

      {/* Main Analysis: Income Statement vs Chilean Tax Obligations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Estado de Resultados Financiero */}
        <div className="bg-[#0F1117] border border-zinc-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h3 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-400" />
              Estado de Resultados (P&L)
            </h3>
            <span className="text-[11px] text-zinc-500 font-mono">Valores en Pesos Chilenos ($)</span>
          </div>

          <div className="space-y-3 text-xs">
            {/* Revenues */}
            <div>
              <span className="font-bold text-zinc-300 uppercase tracking-wider text-[11px] block mb-1">
                1. Ingresos Operacionales
              </span>
              <div className="space-y-1.5 pl-2 border-l-2 border-emerald-500/50">
                <div className="flex justify-between text-zinc-400">
                  <span>Ticket Parking Rotativo:</span>
                  <span className="font-mono text-zinc-200">{formatCLP(parkingGross)}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Servicios de Lavado & Detailing:</span>
                  <span className="font-mono text-cyan-300">{formatCLP(washGross)}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Ventas Tienda de Accesorios:</span>
                  <span className="font-mono text-amber-300">{formatCLP(shopGross)}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Contratos de Arriendo Mensual:</span>
                  <span className="font-mono text-purple-300">{formatCLP(contractsGross)}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Servicio Valet Parking:</span>
                  <span className="font-mono text-amber-300">{formatCLP(valetGross)}</span>
                </div>
                <div className="flex justify-between font-bold text-emerald-400 pt-1 border-t border-zinc-800">
                  <span>Total Ingresos Brutos:</span>
                  <span className="font-mono">{formatCLP(totalGrossRevenue)}</span>
                </div>
              </div>
            </div>

            {/* Expenses */}
            <div className="pt-2">
              <span className="font-bold text-zinc-300 uppercase tracking-wider text-[11px] block mb-1">
                2. Costos Operacionales & Nómina
              </span>
              <div className="space-y-1.5 pl-2 border-l-2 border-rose-500/50">
                <div className="flex justify-between text-zinc-400">
                  <span>Insumos, Mantenimiento & Gastos Generales:</span>
                  <span className="font-mono text-zinc-200">{formatCLP(directExpensesTotal)}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Costo Total Empresa en Nómina (Sueldos + Imposiciones):</span>
                  <span className="font-mono text-zinc-200">{formatCLP(totalPayrollEmployerCost)}</span>
                </div>
                <div className="flex justify-between font-bold text-rose-400 pt-1 border-t border-zinc-800">
                  <span>Total Egresos Operacionales:</span>
                  <span className="font-mono">-{formatCLP(totalOperatingCosts)}</span>
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="pt-3 border-t border-zinc-800 space-y-2">
              <div className="flex justify-between font-bold text-zinc-200">
                <span>Resultado Operacional Antes de Impuestos:</span>
                <span className="font-mono">{formatCLP(netOperatingProfit)}</span>
              </div>
              <div className="flex justify-between text-indigo-400 text-[11px]">
                <span>(-) Provisión Impuestos F29 Estimada:</span>
                <span className="font-mono">-{formatCLP(totalF29Estimated)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-cyan-300 p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30">
                <span>(=) Utilidad Neta Líquida del Negocio:</span>
                <span className="font-mono text-base">{formatCLP(netProfitAfterTax)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Desglose Tributario Chile (Formulario 29 SII) */}
        <div className="bg-[#0F1117] border border-zinc-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h3 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-cyan-400" />
              Proyección Formulario 29 SII (Leyes Chile)
            </h3>
            <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded font-bold border border-indigo-500/20">
              IVA 19% / PPM {settings.ppmRateChile * 100}%
            </span>
          </div>

          <div className="space-y-3.5 text-xs">
            {/* IVA Breakdown */}
            <div className="bg-zinc-900/90 p-3.5 rounded-xl border border-zinc-800 space-y-2">
              <div className="font-bold text-zinc-200 flex items-center justify-between">
                <span>1. Cuadratura de IVA (Impuesto al Valor Agregado)</span>
                <span className="text-[11px] text-zinc-500">Tasa 19%</span>
              </div>
              <div className="flex justify-between text-zinc-400 text-[11px]">
                <span>(+) IVA Débito Fiscal (Por ventas y servicios prestados):</span>
                <span className="font-mono text-emerald-400 font-bold">+{formatCLP(ivaDebitoFiscal)}</span>
              </div>
              <div className="flex justify-between text-zinc-400 text-[11px]">
                <span>(-) IVA Crédito Fiscal (Facturas de compras e insumos):</span>
                <span className="font-mono text-rose-400 font-bold">-{formatCLP(ivaCreditoFiscal)}</span>
              </div>
              <div className="pt-1.5 border-t border-zinc-800 flex justify-between font-bold text-xs">
                <span className={ivaToPay > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                  {ivaToPay > 0 ? '(=) IVA a Pagar en F29:' : '(=) Remanente a Favor Mes Siguiente:'}
                </span>
                <span className="font-mono font-bold">
                  {ivaToPay > 0 ? formatCLP(ivaToPay) : formatCLP(ivaRemanente)}
                </span>
              </div>
            </div>

            {/* PPM Breakdown */}
            <div className="bg-zinc-900/90 p-3.5 rounded-xl border border-zinc-800 space-y-2">
              <div className="font-bold text-zinc-200 flex items-center justify-between">
                <span>2. PPM (Pago Provisional Mensual)</span>
                <span className="text-[11px] text-zinc-500">Tasa {(settings.ppmRateChile * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between text-zinc-400 text-[11px]">
                <span>Base Imponible Neta de Ventas:</span>
                <span className="font-mono text-zinc-300">{formatCLP(netRevenue)}</span>
              </div>
              <div className="flex justify-between text-zinc-400 text-[11px]">
                <span>Monto PPM a Enterar al Fisco:</span>
                <span className="font-mono text-indigo-300 font-bold">{formatCLP(ppmEstimated)}</span>
              </div>
            </div>

            {/* Honorarios Retention */}
            <div className="bg-zinc-900/90 p-3.5 rounded-xl border border-zinc-800 space-y-2">
              <div className="font-bold text-zinc-200 flex items-center justify-between">
                <span>3. Retención Boletas de Honorarios</span>
                <span className="text-[11px] text-zinc-500">Tasa {(settings.retencionHonorariosRateChile * 100).toFixed(2)}%</span>
              </div>
              <div className="flex justify-between text-zinc-400 text-[11px]">
                <span>Honorarios Brutos Registrados:</span>
                <span className="font-mono text-zinc-300">{formatCLP(honorariosTotal)}</span>
              </div>
              <div className="flex justify-between text-zinc-400 text-[11px]">
                <span>Retención a Declarar y Pagar:</span>
                <span className="font-mono text-purple-300 font-bold">{formatCLP(honorariosRetention)}</span>
              </div>
            </div>

            {/* Total F29 Card */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-950/80 to-purple-950/80 border border-indigo-500/40 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-indigo-200 block">Total a Pagar Proyectado F29</span>
                <span className="text-[10px] text-indigo-300/80">Plazo legal: hasta el día 20 del mes siguiente</span>
              </div>
              <span className="text-xl font-bold font-mono text-white">{formatCLP(totalF29Estimated)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Expenses by category breakdown */}
      <div className="bg-[#0F1117] border border-zinc-800 rounded-2xl p-5 shadow-xl space-y-4">
        <h3 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
          <PieChartIcon className="w-4 h-4 text-amber-400" />
          Distribución de Gastos Directos por Categoría
        </h3>

        {Object.keys(expenseByCategoryMap).length === 0 ? (
          <p className="text-xs text-zinc-500">No hay gastos registrados en este período.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(expenseByCategoryMap).map(([cat, amount]) => {
              const pct = directExpensesTotal > 0 ? ((amount / directExpensesTotal) * 100).toFixed(1) : '0';
              return (
                <div key={cat} className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800 text-xs">
                  <div className="flex justify-between text-zinc-300 font-semibold mb-1">
                    <span className="truncate pr-2">{cat}</span>
                    <span className="font-mono text-rose-400">{formatCLP(amount)}</span>
                  </div>
                  <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-rose-500 h-full rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-zinc-500 mt-1 block">{pct}% del total de compras</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
