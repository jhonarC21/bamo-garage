import React, { useState } from 'react';
import {
  DollarSign,
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  Receipt,
  FileText,
  Calendar,
  CreditCard,
  Building,
  TrendingDown,
  TrendingUp,
  Lock,
  CheckCircle,
  AlertTriangle,
  Printer,
  Trash2,
  Filter,
  Search,
  Layers,
  Key,
} from 'lucide-react';
import { useParking } from '../context/ParkingContext';
import { formatCLP, formatDateTime, formatTimeOnly } from '../utils/pricing';
import { BusinessExpense, DocumentType, PaymentSource, EXPENSE_CATEGORIES, PaymentMethod } from '../types';

export const DailyCashRegister: React.FC = () => {
  const {
    completedSessions,
    accessorySales,
    monthlyContracts,
    expenses,
    addExpense,
    deleteExpense,
    openingCash,
    setOpeningCash,
    cashRegisterClosures,
    closeCashRegister,
    currentTime,
    currentUser,
  } = useParking();

  // Active view tab inside Cash Register
  const [activeSubTab, setActiveSubTab] = useState<'movements' | 'expenses' | 'closure' | 'history'>('movements');

  // Expense form modal
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseConcept, setExpenseConcept] = useState('');
  const [expenseCategory, setExpenseCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDocType, setExpenseDocType] = useState<DocumentType>('factura');
  const [expenseDocNumber, setExpenseDocNumber] = useState('');
  const [expensePaymentSource, setExpensePaymentSource] = useState<PaymentSource>('efectivo_caja');
  const [expenseResponsible, setExpenseResponsible] = useState(currentUser.name);
  const [expenseHasIVA, setExpenseHasIVA] = useState(true);
  const [expenseNotes, setExpenseNotes] = useState('');

  // Cash closure form
  const [countedCash, setCountedCash] = useState<string>('');
  const [closureNotes, setClosureNotes] = useState('');
  const [closureSuccessMessage, setClosureSuccessMessage] = useState<string | null>(null);

  // Filters for expenses list
  const [expenseSearch, setExpenseSearch] = useState('');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('ALL');

  // Today's date string YYYY-MM-DD
  const todayStr = currentTime.toISOString().split('T')[0];

  // Calculate Today's Incomes
  const todayParkingSessions = completedSessions.filter((s) => (s.exitTime || s.entryTime || '').startsWith(todayStr));
  const todayAccessorySales = accessorySales.filter((s) => (s.soldAt || s.date || '').startsWith(todayStr));
  const todayContracts = monthlyContracts.filter((c) => (c.createdAt || c.startDate || '').startsWith(todayStr));

  // Income totals
  const totalParkingIncome = todayParkingSessions.reduce((acc, s) => acc + (s.parkingCost || 0), 0);
  const totalWashIncome = todayParkingSessions.reduce(
    (acc, s) => acc + (s.washOrders ? s.washOrders.reduce((wAcc, w) => wAcc + (w.price || 0), 0) : 0),
    0
  );
  const totalShopIncome =
    todayAccessorySales.reduce((acc, s) => acc + (s.totalAmount ?? s.total ?? 0), 0) +
    todayParkingSessions.reduce(
      (acc, s) => acc + (s.accessorySales ? s.accessorySales.reduce((aAcc, a) => aAcc + (a.total || 0), 0) : 0),
      0
    );
  const totalContractsIncome = todayContracts.reduce((acc, c) => acc + (c.monthlyFee || 0), 0);
  const totalValetIncome = todayParkingSessions.reduce(
    (acc, s) => acc + (s.hasValetParking ? (s.valetParkingFee || 0) : 0),
    0
  );
  const totalGrossIncome = totalParkingIncome + totalWashIncome + totalShopIncome + totalContractsIncome + totalValetIncome;

  // Incomes by payment method
  const incomeByMethod: Record<PaymentMethod, number> = {
    efectivo: 0,
    tarjeta_debito: 0,
    tarjeta_credito: 0,
    transferencia: 0,
  };

  todayParkingSessions.forEach((s) => {
    if (s.paymentMethod) {
      incomeByMethod[s.paymentMethod] = (incomeByMethod[s.paymentMethod] || 0) + (s.totalAmount || 0);
    }
  });
  todayAccessorySales.forEach((s) => {
    if (s.paymentMethod) {
      incomeByMethod[s.paymentMethod] = (incomeByMethod[s.paymentMethod] || 0) + (s.totalAmount ?? s.total ?? 0);
    }
  });
  todayContracts.forEach((c) => {
    if (c.paymentMethod) {
      incomeByMethod[c.paymentMethod] = (incomeByMethod[c.paymentMethod] || 0) + (c.monthlyFee || 0);
    }
  });

  // Calculate Today's Expenses
  const todayExpenses = expenses.filter((e) => (e.date || '').startsWith(todayStr));
  const totalExpensesToday = todayExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);
  const expensesFromCashBox = todayExpenses
    .filter((e) => e.paymentSource === 'efectivo_caja')
    .reduce((acc, e) => acc + (e.amount || 0), 0);
  const expensesFromBank = todayExpenses
    .filter((e) => e.paymentSource === 'cuenta_bancaria')
    .reduce((acc, e) => acc + (e.amount || 0), 0);

  // POS Fee and Net calculations
  const totalPosFeesToday =
    todayParkingSessions.reduce((acc, s) => acc + (s.posFeeAmount || 0), 0) +
    todayAccessorySales.reduce((acc, s) => acc + (s.posFeeAmount || 0), 0);

  const totalCardGross = (incomeByMethod.tarjeta_debito || 0) + (incomeByMethod.tarjeta_credito || 0);
  const totalCardNetReceived = totalCardGross - totalPosFeesToday;

  // Breakdown by POS Terminal Operator
  const tuuSessions = todayParkingSessions.filter((s) => s.posProvider === 'tuu');
  const tuuSales = todayAccessorySales.filter((s) => s.posProvider === 'tuu');
  const tuuGross =
    tuuSessions.reduce((acc, s) => acc + (s.totalAmount || 0), 0) +
    tuuSales.reduce((acc, s) => acc + (s.totalAmount ?? s.total ?? 0), 0);
  const tuuFees =
    tuuSessions.reduce((acc, s) => acc + (s.posFeeAmount || 0), 0) +
    tuuSales.reduce((acc, s) => acc + (s.posFeeAmount || 0), 0);

  const mpSessions = todayParkingSessions.filter((s) => s.posProvider === 'mercadopago');
  const mpSales = todayAccessorySales.filter((s) => s.posProvider === 'mercadopago');
  const mpGross =
    mpSessions.reduce((acc, s) => acc + (s.totalAmount || 0), 0) +
    mpSales.reduce((acc, s) => acc + (s.totalAmount ?? s.total ?? 0), 0);
  const mpFees =
    mpSessions.reduce((acc, s) => acc + (s.posFeeAmount || 0), 0) +
    mpSales.reduce((acc, s) => acc + (s.posFeeAmount || 0), 0);

  // Cash in drawer theoretical balance
  const theoreticalCashInDrawer = openingCash + incomeByMethod.efectivo - expensesFromCashBox;

  // Handle create new expense
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(expenseAmount);
    if (!expenseConcept.trim() || isNaN(amountNum) || amountNum <= 0) return;

    addExpense({
      date: currentTime.toISOString(),
      concept: expenseConcept.trim(),
      category: expenseCategory,
      amount: amountNum,
      documentType: expenseDocType,
      documentNumber: expenseDocNumber.trim() || undefined,
      paymentSource: expensePaymentSource,
      responsible: expenseResponsible.trim() || currentUser.name,
      hasInvoiceIVA: expenseHasIVA && expenseDocType === 'factura',
      notes: expenseNotes.trim() || undefined,
    });

    // Reset form
    setExpenseConcept('');
    setExpenseAmount('');
    setExpenseDocNumber('');
    setExpenseNotes('');
    setIsExpenseModalOpen(false);
  };

  // Handle cash closure
  const handleCloseCashRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const counted = parseFloat(countedCash);
    if (isNaN(counted) || counted < 0) return;

    const diff = counted - theoreticalCashInDrawer;

    closeCashRegister({
      date: currentTime.toISOString(),
      closedBy: currentUser.name,
      openingCash,
      cashIncomes: incomeByMethod.efectivo,
      cardIncomes: (incomeByMethod.tarjeta_debito || 0) + (incomeByMethod.tarjeta_credito || 0),
      transferIncomes: incomeByMethod.transferencia,
      totalIncomes: totalGrossIncome,
      cashExpenses: expensesFromCashBox,
      bankExpenses: expensesFromBank,
      totalExpenses: totalExpensesToday,
      theoreticalCashInDrawer,
      actualCountedCash: counted,
      difference: diff,
      notes: closureNotes.trim() || undefined,
    });

    setClosureSuccessMessage(`¡Cierre de caja registrado exitosamente! Diferencia: ${diff >= 0 ? '+' : ''}${formatCLP(diff)}`);
    setCountedCash('');
    setClosureNotes('');
    setTimeout(() => setClosureSuccessMessage(null), 5000);
    setActiveSubTab('history');
  };

  const filteredExpenses = expenses.filter((exp) => {
    const matchesSearch =
      exp.concept.toLowerCase().includes(expenseSearch.toLowerCase()) ||
      (exp.documentNumber && exp.documentNumber.toLowerCase().includes(expenseSearch.toLowerCase())) ||
      exp.responsible.toLowerCase().includes(expenseSearch.toLowerCase());
    const matchesCat = expenseCategoryFilter === 'ALL' || exp.category === expenseCategoryFilter;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#0F1117] border border-zinc-800 rounded-2xl p-5 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2.5 py-1 rounded-full font-semibold border border-emerald-500/20 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              Flujo de Caja en Tiempo Real
            </span>
            <span className="text-xs text-zinc-400">Fecha Operativa: {todayStr}</span>
          </div>
          <h2 className="text-xl font-bold text-zinc-100 mt-1 tracking-tight">
            Caja Diaria & Registro de Gastos de la Empresa
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Control de ingresos por servicios, egresos de caja chica, pagos bancarios y cuadratura de caja diaria.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsExpenseModalOpen(true)}
            className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-rose-600/30 transition active:scale-95 border border-rose-400/30"
          >
            <Plus className="w-4 h-4" />
            Anexar Nuevo Gasto
          </button>
        </div>
      </div>

      {/* Main KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Opening Cash */}
        <div className="bg-[#12141C] border border-zinc-800/80 rounded-xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Apertura de Caja</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-indigo-300 font-mono">{formatCLP(openingCash)}</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="number"
              value={openingCash}
              onChange={(e) => setOpeningCash(Number(e.target.value) || 0)}
              className="w-28 bg-zinc-900 border border-zinc-700 text-xs text-zinc-200 rounded px-2 py-0.5"
              placeholder="Editar base"
            />
            <span className="text-[11px] text-zinc-500">Monto base inicial</span>
          </div>
        </div>

        {/* Card 2: Total Incomes Today */}
        <div className="bg-[#12141C] border border-zinc-800/80 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Ingresos del Día</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-emerald-400 font-mono">{formatCLP(totalGrossIncome)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-400">
            <span>Efectivo: <b className="text-zinc-200">{formatCLP(incomeByMethod.efectivo)}</b></span>
            <span>Digital/Tarjetas: <b className="text-zinc-200">{formatCLP(totalGrossIncome - incomeByMethod.efectivo)}</b></span>
          </div>
        </div>

        {/* Card 3: Total Expenses Today */}
        <div className="bg-[#12141C] border border-zinc-800/80 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Gastos Registrados</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-rose-400 font-mono">{formatCLP(totalExpensesToday)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-400">
            <span>Caja Chica: <b className="text-zinc-200">{formatCLP(expensesFromCashBox)}</b></span>
            <span>Banco/Transf: <b className="text-zinc-200">{formatCLP(expensesFromBank)}</b></span>
          </div>
        </div>

        {/* Card 4: Theoretical Cash Balance */}
        <div className="bg-[#12141C] border border-amber-500/30 rounded-xl p-4 bg-gradient-to-br from-[#12141C] to-amber-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-300 uppercase tracking-wider">Saldo Físico en Gaveta</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-amber-400 font-mono">{formatCLP(theoreticalCashInDrawer)}</span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-2">
            Apertura ({formatCLP(openingCash)}) + Cobros Efectivo ({formatCLP(incomeByMethod.efectivo)}) - Gastos Caja ({formatCLP(expensesFromCashBox)})
          </p>
        </div>
      </div>

      {/* Navigation Subtabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('movements')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'movements'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
        >
          <Receipt className="w-4 h-4" />
          Ingresos por Servicios ({todayParkingSessions.length + todayAccessorySales.length})
        </button>

        <button
          onClick={() => setActiveSubTab('expenses')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'expenses'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
        >
          <TrendingDown className="w-4 h-4" />
          Registro de Gastos de la Empresa ({expenses.length})
        </button>

        <button
          onClick={() => setActiveSubTab('closure')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'closure'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
        >
          <Lock className="w-4 h-4" />
          Cuadratura & Cierre de Caja
        </button>

        <button
          onClick={() => setActiveSubTab('history')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'history'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Historial de Cierres ({cashRegisterClosures.length})
        </button>
      </div>

      {/* Subtab 1: Movements (Ingresos de hoy) */}
      {activeSubTab === 'movements' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="bg-[#12141C] p-3.5 rounded-xl border border-zinc-800 text-xs">
              <span className="text-zinc-400 block font-medium">Estacionamiento</span>
              <span className="text-lg font-bold text-white font-mono">{formatCLP(totalParkingIncome)}</span>
            </div>
            <div className="bg-[#12141C] p-3.5 rounded-xl border border-zinc-800 text-xs">
              <span className="text-zinc-400 block font-medium">Lavado & Detailing</span>
              <span className="text-lg font-bold text-cyan-400 font-mono">{formatCLP(totalWashIncome)}</span>
            </div>
            <div className="bg-[#12141C] p-3.5 rounded-xl border border-zinc-800 text-xs">
              <span className="text-zinc-400 block font-medium">Tienda Accesorios</span>
              <span className="text-lg font-bold text-amber-400 font-mono">{formatCLP(totalShopIncome)}</span>
            </div>
            <div className="bg-[#12141C] p-3.5 rounded-xl border border-zinc-800 text-xs">
              <span className="text-zinc-400 block font-medium flex items-center gap-1">
                <Key className="w-3 h-3 text-amber-400" />
                Valet Parking
              </span>
              <span className="text-lg font-bold text-amber-300 font-mono">{formatCLP(totalValetIncome)}</span>
            </div>
            <div className="bg-[#12141C] p-3.5 rounded-xl border border-zinc-800 text-xs">
              <span className="text-zinc-400 block font-medium">Arriendos Mensuales</span>
              <span className="text-lg font-bold text-purple-400 font-mono">{formatCLP(totalContractsIncome)}</span>
            </div>
          </div>

          {/* POS TERMINAL RECONCILIATION & COMMISSION DEDUCTION SUMMARY */}
          <div className="bg-[#0D101C] border-2 border-indigo-500/30 rounded-xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-500/20 pb-2">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-indigo-400" />
                <h4 className="text-xs font-bold text-indigo-200 uppercase tracking-wide">
                  Conciliación de Terminales POS & Comisiones Débito / Crédito
                </h4>
              </div>
              <span className="text-[11px] text-zinc-400 font-mono">
                Total Cobros con Tarjeta: <strong className="text-white">{formatCLP(totalCardGross)}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {/* Box 1: POS TUU */}
              <div className="bg-[#13172B] border border-cyan-500/30 rounded-xl p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    POS TUU (Redelcom)
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    {tuuSessions.length + tuuSales.length} transacciones
                  </span>
                </div>
                <div className="flex justify-between text-zinc-300 text-[11px]">
                  <span>Ventas Brutas:</span>
                  <span className="font-mono font-bold text-zinc-100">{formatCLP(tuuGross)}</span>
                </div>
                <div className="flex justify-between text-rose-300 text-[11px]">
                  <span>Comisiones Descontadas:</span>
                  <span className="font-mono font-bold text-rose-400">-{formatCLP(tuuFees)}</span>
                </div>
                <div className="flex justify-between text-emerald-300 text-[11px] pt-1 border-t border-cyan-500/20 font-bold">
                  <span>Neto Liquidado a Banco:</span>
                  <span className="font-mono text-emerald-400">{formatCLP(tuuGross - tuuFees)}</span>
                </div>
              </div>

              {/* Box 2: POS MERCADO PAGO */}
              <div className="bg-[#13172B] border border-sky-500/30 rounded-xl p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sky-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                    MERCADO PAGO (Point)
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    {mpSessions.length + mpSales.length} transacciones
                  </span>
                </div>
                <div className="flex justify-between text-zinc-300 text-[11px]">
                  <span>Ventas Brutas:</span>
                  <span className="font-mono font-bold text-zinc-100">{formatCLP(mpGross)}</span>
                </div>
                <div className="flex justify-between text-rose-300 text-[11px]">
                  <span>Comisiones Descontadas:</span>
                  <span className="font-mono font-bold text-rose-400">-{formatCLP(mpFees)}</span>
                </div>
                <div className="flex justify-between text-emerald-300 text-[11px] pt-1 border-t border-sky-500/20 font-bold">
                  <span>Neto Liquidado a Banco:</span>
                  <span className="font-mono text-emerald-400">{formatCLP(mpGross - mpFees)}</span>
                </div>
              </div>

              {/* Box 3: TOTAL POS SUMMARY */}
              <div className="bg-[#151C33] border border-indigo-500/40 rounded-xl p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-300">TOTAL CONCILIACIÓN POS</span>
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-200 px-1.5 py-0.5 rounded font-mono">
                    Hoy
                  </span>
                </div>
                <div className="flex justify-between text-zinc-300 text-[11px]">
                  <span>Total Bruto Tarjetas:</span>
                  <span className="font-mono font-bold">{formatCLP(totalCardGross)}</span>
                </div>
                <div className="flex justify-between text-rose-300 text-[11px]">
                  <span>Total Retención POS:</span>
                  <span className="font-mono font-bold text-rose-400">-{formatCLP(totalPosFeesToday)}</span>
                </div>
                <div className="flex justify-between text-emerald-300 text-xs pt-1 border-t border-indigo-500/30 font-extrabold">
                  <span>Neto Total en Cuenta:</span>
                  <span className="font-mono text-emerald-300 text-sm">{formatCLP(totalCardNetReceived)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#0F1117] border border-zinc-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-400" />
                Ventas & Pagos Cobrados Hoy ({todayParkingSessions.length})
              </h3>
            </div>

            {todayParkingSessions.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs">
                No hay sesiones completadas hoy aún. Al realizar salidas de vehículos se listarán aquí en tiempo real.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900/80 text-zinc-400 border-b border-zinc-800">
                    <tr>
                      <th className="p-3 font-semibold">Hora</th>
                      <th className="p-3 font-semibold">Ticket / Patente</th>
                      <th className="p-3 font-semibold">Cliente</th>
                      <th className="p-3 font-semibold">Desglose Servicios</th>
                      <th className="p-3 font-semibold">Método Pago & POS</th>
                      <th className="p-3 font-semibold text-right">Monto Bruto / Comisión / Neto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {todayParkingSessions.map((session) => (
                      <tr key={session.id} className="hover:bg-zinc-850/50">
                        <td className="p-3 font-mono text-zinc-400">{formatTimeOnly(session.exitTime)}</td>
                        <td className="p-3 font-mono font-bold text-zinc-200">
                          <span className="bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700 mr-2">
                            {session.plate}
                          </span>
                          <span className="text-zinc-400 text-[11px]">{session.ticketNumber}</span>
                        </td>
                        <td className="p-3 text-zinc-300">{session.clientName || 'Cliente Ocasional'}</td>
                        <td className="p-3 text-zinc-400">
                          <div>Parking: {formatCLP(session.parkingCost)}</div>
                          {session.washOrders && session.washOrders.length > 0 && (
                            <div className="text-cyan-400 text-[11px]">
                              Lavado: {session.washOrders.map((w) => w.serviceName).join(', ')} ({formatCLP(session.washOrders.reduce((a, b) => a + b.price, 0))})
                            </div>
                          )}
                          {session.accessorySales && session.accessorySales.length > 0 && (
                            <div className="text-amber-400 text-[11px]">
                              Tienda: {session.accessorySales.length} producto(s) ({formatCLP(session.accessorySales.reduce((a, b) => a + b.total, 0))})
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="space-y-1">
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-zinc-800 text-zinc-300 border border-zinc-700">
                              {session.paymentMethod.replace('_', ' ')}
                            </span>
                            {session.posProvider && (
                              <div className="flex items-center gap-1.5 text-[10px]">
                                <span className={`px-1.5 py-0.2 rounded font-bold ${
                                  session.posProvider === 'tuu'
                                    ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40'
                                    : 'bg-sky-950/80 text-sky-300 border border-sky-500/40'
                                }`}>
                                  POS {session.posProvider === 'tuu' ? 'TUU' : 'MP'}
                                </span>
                                {session.authorizationCode && (
                                  <span className="font-mono text-zinc-400">
                                    Cód: <strong className="text-zinc-200">{session.authorizationCode}</strong>
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-right font-mono">
                          <div className="font-bold text-white text-sm">
                            {formatCLP(session.totalAmount)}
                          </div>
                          {session.posFeeAmount !== undefined && session.posFeeAmount > 0 && (
                            <div className="text-[10px] text-rose-400">
                              Comisión ({session.posFeePercent}%): -{formatCLP(session.posFeeAmount)}
                            </div>
                          )}
                          {session.netAmountReceived !== undefined && (
                            <div className="text-[11px] font-bold text-emerald-400">
                              Neto: {formatCLP(session.netAmountReceived)}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Subtab 2: Expenses of the Company */}
      {activeSubTab === 'expenses' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Buscar gastos..."
                  value={expenseSearch}
                  onChange={(e) => setExpenseSearch(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <select
                value={expenseCategoryFilter}
                onChange={(e) => setExpenseCategoryFilter(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">Todas las Categorías</option>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setIsExpenseModalOpen(true)}
              className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white px-3.5 py-1.5 rounded-xl font-bold text-xs shadow-md transition whitespace-nowrap self-end sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              Registrar Gasto
            </button>
          </div>

          <div className="bg-[#0F1117] border border-zinc-800 rounded-xl overflow-hidden">
            {filteredExpenses.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs">
                No se encontraron gastos registrados con los filtros actuales.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900/80 text-zinc-400 border-b border-zinc-800">
                    <tr>
                      <th className="p-3 font-semibold">Fecha / Hora</th>
                      <th className="p-3 font-semibold">Concepto / Detalle</th>
                      <th className="p-3 font-semibold">Categoría</th>
                      <th className="p-3 font-semibold">Documento</th>
                      <th className="p-3 font-semibold">Medio de Pago</th>
                      <th className="p-3 font-semibold">Responsable</th>
                      <th className="p-3 font-semibold text-right">Monto</th>
                      <th className="p-3 font-semibold text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {filteredExpenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-zinc-850/50">
                        <td className="p-3 text-zinc-400 font-mono text-[11px]">
                          {formatDateTime(exp.date)}
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-zinc-200">{exp.concept}</div>
                          {exp.notes && <div className="text-zinc-500 text-[11px]">{exp.notes}</div>}
                        </td>
                        <td className="p-3">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-zinc-800/80 text-zinc-300 text-[11px] border border-zinc-700/50">
                            {exp.category}
                          </span>
                        </td>
                        <td className="p-3 text-zinc-400 font-mono text-[11px]">
                          <span className="uppercase font-bold text-zinc-300">{exp.documentType}</span>
                          {exp.documentNumber && <span className="ml-1 text-zinc-400">#{exp.documentNumber}</span>}
                          {exp.hasInvoiceIVA && (
                            <span className="ml-1.5 text-[9px] bg-emerald-950 text-emerald-400 px-1 rounded border border-emerald-800">
                              IVA 19%
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                              exp.paymentSource === 'efectivo_caja'
                                ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                                : 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20'
                            }`}
                          >
                            {exp.paymentSource === 'efectivo_caja' ? 'Efectivo Caja Chica' : 'Cuenta Bancaria'}
                          </span>
                        </td>
                        <td className="p-3 text-zinc-300">{exp.responsible}</td>
                        <td className="p-3 text-right font-mono font-bold text-rose-400 text-sm">
                          -{formatCLP(exp.amount)}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => {
                              if (window.confirm(`¿Eliminar gasto "${exp.concept}"?`)) {
                                deleteExpense(exp.id);
                              }
                            }}
                            className="p-1 text-zinc-500 hover:text-rose-400 rounded transition"
                            title="Eliminar gasto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Subtab 3: Closure Form */}
      {activeSubTab === 'closure' && (
        <div className="max-w-2xl mx-auto bg-[#0F1117] border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-6">
          <div className="border-b border-zinc-800 pb-4">
            <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
              <Lock className="w-5 h-5 text-amber-400" />
              Cuadratura y Cierre de Caja Diario
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Contabilice el dinero físico real que tiene en la gaveta para calcular automáticamente sobrantes o faltantes.
            </p>
          </div>

          {closureSuccessMessage && (
            <div className="bg-emerald-950/70 border border-emerald-500/50 p-4 rounded-xl text-emerald-300 text-xs font-semibold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              {closureSuccessMessage}
            </div>
          )}

          {/* Breakdown Table */}
          <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800 space-y-2.5 text-xs">
            <div className="flex justify-between text-zinc-400">
              <span>(+) Monto Apertura Inicial:</span>
              <span className="font-mono font-bold text-zinc-200">{formatCLP(openingCash)}</span>
            </div>
            <div className="flex justify-between text-emerald-400">
              <span>(+) Cobros en Efectivo del Día:</span>
              <span className="font-mono font-bold">+{formatCLP(incomeByMethod.efectivo)}</span>
            </div>
            <div className="flex justify-between text-rose-400">
              <span>(-) Gastos Pagados en Efectivo de Caja:</span>
              <span className="font-mono font-bold">-{formatCLP(expensesFromCashBox)}</span>
            </div>
            <div className="border-t border-zinc-700 pt-2 flex justify-between font-bold text-sm text-amber-300">
              <span>(=) Total Teórico Esperado en Gaveta:</span>
              <span className="font-mono text-base">{formatCLP(theoreticalCashInDrawer)}</span>
            </div>
          </div>

          <form onSubmit={handleCloseCashRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                Efectivo Físico Contado en Gaveta ($ CLP) *
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 absolute left-3 top-3 text-amber-400" />
                <input
                  type="number"
                  required
                  placeholder="Ej: 145000"
                  value={countedCash}
                  onChange={(e) => setCountedCash(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-9 pr-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {countedCash && !isNaN(parseFloat(countedCash)) && (
              <div
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between ${
                  parseFloat(countedCash) - theoreticalCashInDrawer === 0
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                    : parseFloat(countedCash) - theoreticalCashInDrawer > 0
                    ? 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300'
                    : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                }`}
              >
                <span>
                  {parseFloat(countedCash) - theoreticalCashInDrawer === 0
                    ? '✓ Caja Cuadrada Perfecta (Sin Diferencia)'
                    : parseFloat(countedCash) - theoreticalCashInDrawer > 0
                    ? '↑ Sobrante en Caja:'
                    : '↓ Faltante en Caja:'}
                </span>
                <span className="font-mono font-bold text-sm">
                  {parseFloat(countedCash) - theoreticalCashInDrawer >= 0 ? '+' : ''}
                  {formatCLP(parseFloat(countedCash) - theoreticalCashInDrawer)}
                </span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                Observaciones del Cierre (Opcional)
              </label>
              <textarea
                rows={2}
                placeholder="Ej: Se retiró $100.000 para depósito bancario por la noche..."
                value={closureNotes}
                onChange={(e) => setClosureNotes(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-amber-600/30 transition text-xs flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Registrar y Guardar Cierre de Caja
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Subtab 4: History of Closures */}
      {activeSubTab === 'history' && (
        <div className="bg-[#0F1117] border border-zinc-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-zinc-800">
            <h3 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-400" />
              Historial de Cierres de Caja Anteriores
            </h3>
          </div>

          {cashRegisterClosures.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-xs">
              Aún no se han registrado cierres de caja. Complete la cuadratura en la pestaña anterior.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-900/80 text-zinc-400 border-b border-zinc-800">
                  <tr>
                    <th className="p-3 font-semibold">Fecha y Hora</th>
                    <th className="p-3 font-semibold">Cerrado Por</th>
                    <th className="p-3 font-semibold text-right">Apertura</th>
                    <th className="p-3 font-semibold text-right">Ingresos Totales</th>
                    <th className="p-3 font-semibold text-right">Gastos Efectivo</th>
                    <th className="p-3 font-semibold text-right">Saldo Teórico</th>
                    <th className="p-3 font-semibold text-right">Físico Contado</th>
                    <th className="p-3 font-semibold text-right">Diferencia</th>
                    <th className="p-3 font-semibold">Notas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {cashRegisterClosures.map((cls) => (
                    <tr key={cls.id} className="hover:bg-zinc-850/50">
                      <td className="p-3 font-mono text-zinc-300">{formatDateTime(cls.date)}</td>
                      <td className="p-3 font-semibold text-zinc-200">{cls.closedBy}</td>
                      <td className="p-3 text-right font-mono text-zinc-400">{formatCLP(cls.openingCash)}</td>
                      <td className="p-3 text-right font-mono text-emerald-400 font-bold">{formatCLP(cls.totalIncomes)}</td>
                      <td className="p-3 text-right font-mono text-rose-400 font-bold">-{formatCLP(cls.cashExpenses)}</td>
                      <td className="p-3 text-right font-mono text-zinc-300">{formatCLP(cls.theoreticalCashInDrawer)}</td>
                      <td className="p-3 text-right font-mono text-amber-300 font-bold">{formatCLP(cls.actualCountedCash)}</td>
                      <td className="p-3 text-right font-mono font-bold">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] ${
                            cls.difference === 0
                              ? 'text-emerald-400 bg-emerald-950/60'
                              : cls.difference > 0
                              ? 'text-cyan-400 bg-cyan-950/60'
                              : 'text-rose-400 bg-rose-950/60'
                          }`}
                        >
                          {cls.difference >= 0 ? '+' : ''}
                          {formatCLP(cls.difference)}
                        </span>
                      </td>
                      <td className="p-3 text-zinc-400 text-[11px] max-w-xs truncate">{cls.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal: New Expense */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0F1117] border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-rose-400" />
                Anexar Nuevo Gasto u Operación
              </h3>
              <button
                onClick={() => setIsExpenseModalOpen(false)}
                className="text-zinc-400 hover:text-white text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Concepto / Glosa del Gasto *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Compra de 50L Shampoo pH neutro, Pago cuenta de agua..."
                  value={expenseConcept}
                  onChange={(e) => setExpenseConcept(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Monto ($ CLP) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    placeholder="Ej: 25000"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 font-mono text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Categoría del Gasto</label>
                  <select
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value as any)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-zinc-200 focus:outline-none focus:border-rose-500"
                  >
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Tipo de Comprobante</label>
                  <select
                    value={expenseDocType}
                    onChange={(e) => setExpenseDocType(e.target.value as DocumentType)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-zinc-200 focus:outline-none focus:border-rose-500"
                  >
                    <option value="factura">Factura Electrónica (con IVA)</option>
                    <option value="boleta">Boleta de Venta / Servicio</option>
                    <option value="boleta_honorarios">Boleta de Honorarios (con Retención)</option>
                    <option value="recibo">Recibo / Comprobante Interno</option>
                    <option value="vale">Vale de Caja Chica</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">N° Documento / Folio</label>
                  <input
                    type="text"
                    placeholder="Ej: FC-48192"
                    value={expenseDocNumber}
                    onChange={(e) => setExpenseDocNumber(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Fuente de Pago</label>
                  <select
                    value={expensePaymentSource}
                    onChange={(e) => setExpensePaymentSource(e.target.value as PaymentSource)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-zinc-200 focus:outline-none focus:border-rose-500"
                  >
                    <option value="efectivo_caja">Efectivo de la Caja Chica</option>
                    <option value="cuenta_bancaria">Cuenta Bancaria / Transferencia</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Responsable del Gasto</label>
                  <input
                    type="text"
                    value={expenseResponsible}
                    onChange={(e) => setExpenseResponsible(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Notas Adicionales</label>
                <textarea
                  rows={2}
                  placeholder="Detalles sobre proveedor o justificación..."
                  value={expenseNotes}
                  onChange={(e) => setExpenseNotes(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition shadow-lg shadow-rose-600/30"
                >
                  Guardar Gasto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
