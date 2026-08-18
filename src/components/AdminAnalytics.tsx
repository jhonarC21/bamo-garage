import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Star,
  Users,
  Car,
  Sparkles,
  ShoppingBag,
  Calendar,
  AlertTriangle,
  Clock,
  Printer,
  CreditCard,
  Banknote,
  Smartphone,
  ShieldCheck,
  Percent,
  Key,
} from 'lucide-react';
import { useParking } from '../context/ParkingContext';
import {
  calculateParkingFee,
  calculateVacancyLoss,
  formatCLP,
  formatDateTime,
} from '../utils/pricing';

export const AdminAnalytics: React.FC = () => {
  const {
    spots,
    vehicles,
    completedSessions,
    accessorySales,
    monthlyContracts,
    washOrders,
    settings,
    currentTime,
  } = useParking();

  const [timeRange, setTimeRange] = useState<'daily' | 'monthly' | 'annual'>('daily');

  // --- REVENUE CALCULATIONS ---
  // 1. Parking Revenue (Completed sessions + Active sessions current parking value)
  const completedParkingRevenue = completedSessions.reduce(
    (sum, s) => sum + (s.parkingCost || 0),
    0
  );
  const activeParkingRevenue = spots.reduce((sum, s) => {
    if (s.status === 'occupied' && s.currentSession) {
      const p = calculateParkingFee(
        s.currentSession.entryTime,
        currentTime,
        undefined,
        settings.base30MinPrice,
        settings.extra10MinPrice
      );
      return sum + p.totalParkingCost;
    }
    return sum;
  }, 0);
  const totalParkingRevenue = completedParkingRevenue + activeParkingRevenue;

  // 2. Wash Revenue
  const totalWashRevenue = washOrders.reduce((sum, w) => sum + (w.price || 0), 0);

  // 3. Accessories Revenue
  const totalAccessoriesRevenue = accessorySales.reduce((sum, a) => sum + (a.total || 0), 0);

  // 4. Monthly Contracts Revenue
  const totalMonthlyRevenue = monthlyContracts.reduce((sum, c) => sum + (c.monthlyFee || 0), 0);

  // 5. Valet Parking Revenue
  const completedValetRevenue = completedSessions.reduce(
    (sum, s) => sum + (s.hasValetParking ? (s.valetParkingFee || 0) : 0),
    0
  );
  const activeValetRevenue = spots.reduce((sum, s) => {
    if (s.status === 'occupied' && s.currentSession?.hasValetParking) {
      return sum + (s.currentSession.valetParkingFee || settings.valetParkingPrice || 2000);
    }
    return sum;
  }, 0);
  const totalValetRevenue = completedValetRevenue + activeValetRevenue;

  // Time-scaled estimations for daily, monthly, annual display
  let multiplier = 1;
  if (timeRange === 'daily') {
    multiplier = 1;
  } else if (timeRange === 'monthly') {
    multiplier = 30;
  } else if (timeRange === 'annual') {
    multiplier = 365;
  }

  const currentPeriodParking = timeRange === 'daily' ? totalParkingRevenue : totalParkingRevenue * multiplier * 0.85;
  const currentPeriodWash = timeRange === 'daily' ? totalWashRevenue : totalWashRevenue * multiplier * 0.9;
  const currentPeriodAcc = timeRange === 'daily' ? totalAccessoriesRevenue : totalAccessoriesRevenue * multiplier * 0.8;
  const currentPeriodMonthly = timeRange === 'daily' ? Math.round(totalMonthlyRevenue / 30) : timeRange === 'monthly' ? totalMonthlyRevenue : totalMonthlyRevenue * 12;
  const currentPeriodValet = timeRange === 'daily' ? totalValetRevenue : totalValetRevenue * multiplier * 0.85;

  const totalGrossRevenue = currentPeriodParking + currentPeriodWash + currentPeriodAcc + currentPeriodMonthly + currentPeriodValet;

  // --- VACANCY & OPPORTUNITY LOSS CALCULATION ---
  // Total empty minutes accumulated across 10 spots
  const totalEmptyMinutesToday = spots.reduce(
    (sum, s) => sum + (s.accumulatedEmptyMinutesToday || 0),
    0
  );

  const dailyVacancyLoss = calculateVacancyLoss(totalEmptyMinutesToday);
  const periodVacancyLoss = timeRange === 'daily'
    ? dailyVacancyLoss
    : timeRange === 'monthly'
    ? dailyVacancyLoss * 30
    : dailyVacancyLoss * 365;

  // Maximum theoretical revenue (if all 10 spots were 100% occupied 14 hours/day @ $1.800/hr)
  const theoreticalDailyMaxParking = 10 * 14 * 1800; // $252.000 / day
  const theoreticalPeriodMax = (theoreticalDailyMaxParking + (currentPeriodWash + currentPeriodAcc)) * (timeRange === 'daily' ? 1 : timeRange === 'monthly' ? 30 : 365);

  const netBalance = totalGrossRevenue - periodVacancyLoss;
  const occupancyRate = Math.max(
    10,
    Math.min(95, Math.round((currentPeriodParking / (currentPeriodParking + periodVacancyLoss || 1)) * 100))
  );

  // --- CLIENT FREQUENCY METRICS ---
  const totalVehiclesCount = vehicles.length;
  const frequentVehicles = vehicles.filter(
    (v) => v.isFrequent || v.visitsCount >= settings.frequentThreshold
  );
  const frequentRatio = totalVehiclesCount > 0 ? Math.round((frequentVehicles.length / totalVehiclesCount) * 100) : 0;
  const occasionalRatio = 100 - frequentRatio;

  // Payments breakdown for completed sessions
  const cashPayments = completedSessions
    .filter((s) => s.paymentMethod === 'efectivo')
    .reduce((sum, s) => sum + s.totalAmount, 0);
  const debitPayments = completedSessions
    .filter((s) => s.paymentMethod === 'tarjeta_debito')
    .reduce((sum, s) => sum + s.totalAmount, 0);
  const creditPayments = completedSessions
    .filter((s) => s.paymentMethod === 'tarjeta_credito')
    .reduce((sum, s) => sum + s.totalAmount, 0);
  const transferPayments = completedSessions
    .filter((s) => s.paymentMethod === 'transferencia')
    .reduce((sum, s) => sum + s.totalAmount, 0);

  return (
    <div className="space-y-6">
      {/* Header Banner & Period Selector */}
      <div className="bg-[#0F1117] border border-zinc-800 rounded-2xl p-5 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-indigo-500/10 text-indigo-400 text-xs px-2.5 py-1 rounded-full font-semibold border border-indigo-500/20 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              Acceso Administrativo
            </span>
            <span className="text-xs text-zinc-400">Auditoría Financiera & Operativa</span>
          </div>
          <h2 className="text-xl font-bold text-zinc-100 mt-1 tracking-tight">
            Panel Informativo de Métricas & Pérdidas por Vacancia
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Monitorea ingresos reales, cotejo de pérdidas por puestos vacíos y comportamiento de clientes frecuentes.
          </p>
        </div>

        {/* Range Selector */}
        <div className="flex items-center gap-1 bg-zinc-900 p-1.5 rounded-xl border border-zinc-800 self-start md:self-auto">
          <button
            onClick={() => setTimeRange('daily')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              timeRange === 'daily'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Diario (Hoy)
          </button>
          <button
            onClick={() => setTimeRange('monthly')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              timeRange === 'monthly'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Mensual
          </button>
          <button
            onClick={() => setTimeRange('annual')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              timeRange === 'annual'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Anual
          </button>
        </div>
      </div>

      {/* TOP 4 KEY EXECUTIVE CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        {/* 1. TOTAL GROSS REVENUE */}
        <div className="bg-[#0F1117] border border-emerald-900/40 rounded-2xl p-4 space-y-2 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="font-semibold text-zinc-300">Ingresos Totales ({timeRange})</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-800 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono">
            {formatCLP(totalGrossRevenue)}
          </div>
          <p className="text-[11px] text-zinc-400">
            Sumatoria de Estacionamiento + Lavados + Accesorios + Arriendos.
          </p>
        </div>

        {/* 2. VACANCY OPPORTUNITY LOSS */}
        <div className="bg-[#0F1117] border border-rose-900/50 rounded-2xl p-4 space-y-2 relative overflow-hidden shadow-lg ring-1 ring-rose-500/20">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="font-semibold text-rose-300">Pérdida por Vacancia ({timeRange})</span>
            <div className="w-8 h-8 rounded-lg bg-rose-950/80 border border-rose-800 flex items-center justify-center text-rose-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-rose-400 font-mono">
            -{formatCLP(periodVacancyLoss)}
          </div>
          <p className="text-[11px] text-zinc-400">
            Costo de oportunidad por puestos no ocupados (calculado a $1.800/hr).
          </p>
        </div>

        {/* 3. OCCUPANCY EFFICIENCY */}
        <div className="bg-[#0F1117] border border-cyan-900/40 rounded-2xl p-4 space-y-2 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="font-semibold text-cyan-300">Eficiencia de Ocupación</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-800 flex items-center justify-center text-cyan-400">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-cyan-300 font-mono">
            {occupancyRate}%
          </div>
          <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-cyan-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${occupancyRate}%` }}
            ></div>
          </div>
        </div>

        {/* 4. FREQUENT CLIENTS RATIO */}
        <div className="bg-[#0F1117] border border-amber-900/40 rounded-2xl p-4 space-y-2 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="font-semibold text-amber-300">Clientes Frecuentes</span>
            <div className="w-8 h-8 rounded-lg bg-amber-950/80 border border-amber-800 flex items-center justify-center text-amber-400">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-300 font-mono">
            {frequentVehicles.length} <span className="text-sm font-normal text-zinc-400">({frequentRatio}%)</span>
          </div>
          <p className="text-[11px] text-zinc-400">
            {occasionalRatio}% de clientes son ocasionales / nuevos.
          </p>
        </div>
      </div>

      {/* DETAILED VACANCY OPPORTUNITY LOSS SECTION */}
      <div className="bg-[#0F1117] border border-zinc-800 rounded-2xl p-5 text-white shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
          <div>
            <h3 className="font-bold text-base text-zinc-100 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              Contabilización de Tiempo No Ocupado & Cotejo como Pérdida
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Cálculo automatizado del dinero dejado de percibir por cada minuto que los 10 puestos permanecen vacíos.
            </p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-1.5 text-xs text-zinc-300 flex items-center gap-3">
            <div>
              <span className="text-zinc-400 text-[10px] block">Tiempo Vacío Acumulado Hoy:</span>
              <span className="font-mono font-bold text-rose-400">
                {Math.floor(totalEmptyMinutesToday / 60)} horas {totalEmptyMinutesToday % 60} minutos
              </span>
            </div>
            <div className="border-l border-zinc-800 pl-3">
              <span className="text-zinc-400 text-[10px] block">Pérdida Monetaria Hoy:</span>
              <span className="font-mono font-bold text-rose-400">
                -{formatCLP(dailyVacancyLoss)}
              </span>
            </div>
          </div>
        </div>

        {/* 10 Spots Vacancy Breakdown Bars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {spots.map((spot) => {
            const emptyMins = spot.accumulatedEmptyMinutesToday || 0;
            const loss = calculateVacancyLoss(emptyMins);
            const isCurrentlyOccupied = spot.status === 'occupied';
            const isMonthly = spot.status === 'reserved_monthly';

            return (
              <div
                key={spot.number}
                className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 space-y-2 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-200">Puesto #{spot.number}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isCurrentlyOccupied
                        ? 'bg-rose-950/80 text-rose-300 border border-rose-800'
                        : isMonthly
                        ? 'bg-purple-950/80 text-purple-300 border border-purple-800'
                        : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                    }`}
                  >
                    {isCurrentlyOccupied ? 'Ocupado' : isMonthly ? 'Arriendo' : 'Libre'}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-zinc-400">
                    <span>Horas vacías hoy:</span>
                    <span className="font-mono text-zinc-200">
                      {Math.floor(emptyMins / 60)}h {emptyMins % 60}m
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-rose-400">Pérdida por vacancia:</span>
                    <span className="font-mono font-bold text-rose-400">
                      -{formatCLP(loss)}
                    </span>
                  </div>
                </div>

                <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-rose-500 h-full rounded-full"
                    style={{ width: `${Math.min(100, (emptyMins / 480) * 100)}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* REVENUE BREAKDOWN BY SERVICE & FREQUENT CUSTOMER ANALYSIS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* REVENUE SOURCES */}
        <div className="bg-[#0F1117] border border-zinc-800 rounded-2xl p-5 text-white shadow-xl space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h3 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              Desglose de Ganancias por Unidad de Negocio ({timeRange})
            </h3>
          </div>

          <div className="space-y-3">
            {/* 1. Estacionamiento por tramos */}
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-zinc-200 flex items-center gap-2">
                  <Car className="w-4 h-4 text-indigo-400" />
                  Estacionamiento (Tramos 30m $900 + 10m $300)
                </span>
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  {formatCLP(currentPeriodParking)}
                </span>
              </div>
              <p className="text-[10px] text-zinc-400">
                Cobro dinámico por tramos con reconocimiento automático de patentes.
              </p>
            </div>

            {/* 2. Lavado de autos */}
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-zinc-200 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  Servicios de Lavado de Autos (Car Wash)
                </span>
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  {formatCLP(currentPeriodWash)}
                </span>
              </div>
              <p className="text-[10px] text-zinc-400">
                Exterior simple, completo, full premium y limpieza profunda de tapiz.
              </p>
            </div>

            {/* 3. Tienda de Accesorios */}
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-zinc-200 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-amber-400" />
                  Venta de Accesorios Vehiculares (POS)
                </span>
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  {formatCLP(currentPeriodAcc)}
                </span>
              </div>
              <p className="text-[10px] text-zinc-400">
                Aromatizantes, plumillas siliconadas, cera spray, microfibra, cables de batería.
              </p>
            </div>

            {/* 4. Arriendos Mensuales */}
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-zinc-200 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-cyan-400" />
                  Arriendos Mensuales (Diurno / Nocturno / 24/7)
                </span>
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  {formatCLP(currentPeriodMonthly)}
                </span>
              </div>
              <p className="text-[10px] text-zinc-400">
                Abonos fijos recurrentes para empresas y residentes.
              </p>
            </div>

            {/* 5. Valet Parking */}
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-zinc-200 flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-400" />
                  Servicio Valet Parking
                </span>
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  {formatCLP(currentPeriodValet)}
                </span>
              </div>
              <p className="text-[10px] text-zinc-400">
                Cobro por custodia de llaves y aparcamiento personalizado de vehículos.
              </p>
            </div>
          </div>
        </div>

        {/* FREQUENT CUSTOMER ANALYSIS */}
        <div className="bg-[#0F1117] border border-zinc-800 rounded-2xl p-5 text-white shadow-xl space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h3 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              Análisis de Clientes Frecuentes vs Ocasionales
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="bg-amber-950/40 border border-amber-800/60 rounded-xl p-3">
              <div className="text-2xl font-extrabold text-amber-300 font-mono">
                {frequentVehicles.length}
              </div>
              <div className="text-[11px] font-bold text-zinc-200 mt-1">Clientes Frecuentes</div>
              <div className="text-[10px] text-zinc-400 font-mono">≥ {settings.frequentThreshold} visitas registradas</div>
            </div>

            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3">
              <div className="text-2xl font-extrabold text-zinc-300 font-mono">
                {vehicles.length - frequentVehicles.length}
              </div>
              <div className="text-[11px] font-bold text-zinc-200 mt-1">Clientes Nuevos / Ocasionales</div>
              <div className="text-[10px] text-zinc-400 font-mono">&lt; {settings.frequentThreshold} visitas</div>
            </div>
          </div>

          {/* Top Frequent Vehicles List */}
          <div className="space-y-2">
            <span className="font-semibold text-zinc-300 block text-[11px]">
              Top Vehículos con Mayor Frecuencia de Visita:
            </span>
            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
              {frequentVehicles.slice(0, 5).map((v) => (
                <div
                  key={v.plate}
                  className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-2.5 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="bg-zinc-950 border border-zinc-700 px-2 py-0.5 rounded text-white font-mono font-bold text-[11px]">
                      {v.plate}
                    </span>
                    <div>
                      <div className="font-semibold text-zinc-200">{v.brand} {v.model}</div>
                      <div className="text-[10px] text-zinc-400">{v.clientName || 'Sin nombre'}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-amber-400 font-bold text-xs font-mono">{v.visitsCount} visitas</div>
                    <div className="text-[10px] text-emerald-400 font-mono font-semibold">
                      {formatCLP(v.totalSpent || 0)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CASHIER SHIFT CLOSURE SUMMARY */}
      <div className="bg-[#0F1117] border border-zinc-800 rounded-2xl p-5 text-white shadow-xl space-y-4 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
          <div>
            <h3 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-cyan-400" />
              Arqueo de Caja & Cierre de Turno por Método de Pago
            </h3>
            <p className="text-xs text-zinc-400">
              Desglose de cobros recibidos hoy según medio de pago.
            </p>
          </div>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-200 rounded-lg border border-zinc-750 transition self-start sm:self-auto"
          >
            <Printer className="w-4 h-4 text-cyan-400" />
            Imprimir Cierre de Turno
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-zinc-400 text-[11px]">
              <Banknote className="w-3.5 h-3.5 text-emerald-400" />
              Efectivo en Caja
            </div>
            <div className="text-base font-extrabold text-emerald-400 font-mono">
              {formatCLP(cashPayments)}
            </div>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-zinc-400 text-[11px]">
              <CreditCard className="w-3.5 h-3.5 text-cyan-400" />
              Tarjetas Débito
            </div>
            <div className="text-base font-extrabold text-cyan-400 font-mono">
              {formatCLP(debitPayments)}
            </div>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-zinc-400 text-[11px]">
              <CreditCard className="w-3.5 h-3.5 text-indigo-400" />
              Tarjetas Crédito
            </div>
            <div className="text-base font-extrabold text-indigo-400 font-mono">
              {formatCLP(creditPayments)}
            </div>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-zinc-400 text-[11px]">
              <Smartphone className="w-3.5 h-3.5 text-purple-400" />
              Transferencias
            </div>
            <div className="text-base font-extrabold text-purple-400 font-mono">
              {formatCLP(transferPayments)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
