import React, { useState } from 'react';
import {
  Users,
  Plus,
  FileText,
  DollarSign,
  Printer,
  Calendar,
  CheckCircle,
  Clock,
  ShieldAlert,
  ChevronRight,
  Calculator,
  UserCheck,
  Building,
  CreditCard,
  Edit2,
  Trash2,
  HelpCircle,
} from 'lucide-react';
import { useParking } from '../context/ParkingContext';
import { formatCLP, formatDateTime, AFP_RATES_CHILE } from '../utils/pricing';
import { Employee, ContractType, AFPOption, HealthSystem, PayrollSettlement, PaymentMethod } from '../types';

export const PayrollManagement: React.FC = () => {
  const {
    employees,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    payrollSettlements,
    generatePayrollSettlement,
    markPayrollPaid,
    settings,
    currentTime,
  } = useParking();

  const [activeTab, setActiveTab] = useState<'employees' | 'generate' | 'settlements'>('employees');

  // Employee Modal
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [empRut, setEmpRut] = useState('');
  const [empName, setEmpName] = useState('');
  const [empRole, setEmpRole] = useState('lavador');
  const [empContractType, setEmpContractType] = useState<ContractType>('indefinido');
  const [empStartDate, setEmpStartDate] = useState(currentTime.toISOString().split('T')[0]);
  const [empBaseSalary, setEmpBaseSalary] = useState('550000');
  const [empAfp, setEmpAfp] = useState<AFPOption>('habitat');
  const [empHealth, setEmpHealth] = useState<HealthSystem>('fonasa');
  const [empHealthUF, setEmpHealthUF] = useState('');
  const [empMeal, setEmpMeal] = useState('45000');
  const [empTransport, setEmpTransport] = useState('35000');

  // Generate settlement form
  const [selectedEmpId, setSelectedEmpId] = useState<string>(employees[0]?.id || '');
  const [settlementMonth, setSettlementMonth] = useState<string>(
    `${currentTime.getFullYear()}-${String(currentTime.getMonth() + 1).padStart(2, '0')}`
  );
  const [overtimeHours, setOvertimeHours] = useState<string>('0');
  const [bonuses, setBonuses] = useState<string>('0');
  const [otherDeductions, setOtherDeductions] = useState<string>('0');
  const [settlementPaymentMethod, setSettlementPaymentMethod] = useState<PaymentMethod>('transferencia');

  // Printable slip view modal
  const [selectedSettlementToView, setSelectedSettlementToView] = useState<PayrollSettlement | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const openNewEmpModal = () => {
    setEditingEmployee(null);
    setEmpRut('');
    setEmpName('');
    setEmpRole('lavador');
    setEmpContractType('indefinido');
    setEmpStartDate(currentTime.toISOString().split('T')[0]);
    setEmpBaseSalary('550000');
    setEmpAfp('habitat');
    setEmpHealth('fonasa');
    setEmpHealthUF('');
    setEmpMeal('45000');
    setEmpTransport('35000');
    setIsEmployeeModalOpen(true);
  };

  const openEditEmpModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setEmpRut(emp.rut);
    setEmpName(emp.name);
    setEmpRole(emp.role);
    setEmpContractType(emp.contractType);
    setEmpStartDate(emp.startDate);
    setEmpBaseSalary(String(emp.baseSalary));
    setEmpAfp(emp.afp);
    setEmpHealth(emp.healthSystem);
    setEmpHealthUF(emp.healthPlanUF ? String(emp.healthPlanUF) : '');
    setEmpMeal(String(emp.mealAllowance || 0));
    setEmpTransport(String(emp.transportAllowance || 0));
    setIsEmployeeModalOpen(true);
  };

  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empRut.trim() || !empName.trim()) return;

    const baseSal = parseFloat(empBaseSalary) || settings.minWageChile;
    const meal = parseFloat(empMeal) || 0;
    const trans = parseFloat(empTransport) || 0;
    const healthUFNum = empHealth === 'isapre' && empHealthUF ? parseFloat(empHealthUF) : undefined;

    if (editingEmployee) {
      updateEmployee(editingEmployee.id, {
        rut: empRut.trim(),
        name: empName.trim(),
        role: empRole,
        contractType: empContractType,
        startDate: empStartDate,
        baseSalary: baseSal,
        afp: empAfp,
        healthSystem: empHealth,
        healthPlanUF: healthUFNum,
        mealAllowance: meal,
        transportAllowance: trans,
      });
    } else {
      addEmployee({
        rut: empRut.trim(),
        name: empName.trim(),
        role: empRole,
        contractType: empContractType,
        startDate: empStartDate,
        baseSalary: baseSal,
        afp: empAfp,
        healthSystem: empHealth,
        healthPlanUF: healthUFNum,
        mealAllowance: meal,
        transportAllowance: trans,
        active: true,
      });
    }

    setIsEmployeeModalOpen(false);
  };

  const handleGenerateSettlement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpId) return;

    try {
      const generated = generatePayrollSettlement({
        employeeId: selectedEmpId,
        month: settlementMonth,
        overtimeHours: parseFloat(overtimeHours) || 0,
        bonuses: parseFloat(bonuses) || 0,
        otherDeductions: parseFloat(otherDeductions) || 0,
        paymentMethod: settlementPaymentMethod,
      });

      setSelectedSettlementToView(generated);
      setSuccessMessage(`Liquidación de sueldo calculada y generada para ${generated.employeeName}`);
      setActiveTab('settlements');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      alert(err.message || 'Error al generar liquidación');
    }
  };

  const currentEmp = employees.find((e) => e.id === selectedEmpId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#0F1117] border border-zinc-800 rounded-2xl p-5 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-purple-500/10 text-purple-400 text-xs px-2.5 py-1 rounded-full font-semibold border border-purple-500/20 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-purple-400" />
              Código del Trabajo de Chile
            </span>
            <span className="text-xs text-zinc-400">Gratificación Art. 50 (25% tope 4.75 IMM) | Previred</span>
          </div>
          <h2 className="text-xl font-bold text-zinc-100 mt-1 tracking-tight">
            Pagos de Nómina & Liquidaciones de Sueldo (Chile)
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Gestión de trabajadores, cálculo legal de imposiciones previsionales (AFP, FONASA/Isapre, AFC, SIS, Mutual) y emisión de liquidaciones.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={openNewEmpModal}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-purple-600/30 transition active:scale-95 border border-purple-400/30"
          >
            <Plus className="w-4 h-4" />
            Contratar / Registrar Trabajador
          </button>
        </div>
      </div>

      {/* Navigation Subtabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('employees')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'employees'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
        >
          <Users className="w-4 h-4" />
          Plantilla de Trabajadores ({employees.length})
        </button>

        <button
          onClick={() => setActiveTab('generate')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'generate'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
        >
          <Calculator className="w-4 h-4" />
          Calcular & Emitir Liquidación
        </button>

        <button
          onClick={() => setActiveTab('settlements')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'settlements'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          Liquidaciones Emitidas ({payrollSettlements.length})
        </button>
      </div>

      {successMessage && (
        <div className="bg-emerald-950/70 border border-emerald-500/50 p-4 rounded-xl text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          {successMessage}
        </div>
      )}

      {/* TAB 1: Employees List */}
      {activeTab === 'employees' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {employees.map((emp) => (
              <div
                key={emp.id}
                className="bg-[#0F1117] border border-zinc-800 hover:border-purple-500/40 transition rounded-2xl p-4 shadow-xl flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800/50">
                      {emp.role}
                    </span>
                    <span className="text-[11px] font-mono text-zinc-400">{emp.rut}</span>
                  </div>

                  <h3 className="text-sm font-bold text-zinc-100 mt-2">{emp.name}</h3>

                  <div className="mt-3 space-y-1 text-xs text-zinc-400">
                    <div className="flex justify-between">
                      <span>Sueldo Base:</span>
                      <span className="font-mono text-emerald-400 font-bold">{formatCLP(emp.baseSalary)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Contrato:</span>
                      <span className="capitalize text-zinc-300">{emp.contractType.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>AFP / Salud:</span>
                      <span className="capitalize text-zinc-300">
                        {AFP_RATES_CHILE[emp.afp]?.name || emp.afp} ({AFP_RATES_CHILE[emp.afp]?.rate || 11.45}%) / {emp.healthSystem}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Colación + Mov.:</span>
                      <span className="font-mono text-zinc-300">{formatCLP((emp.mealAllowance || 0) + (emp.transportAllowance || 0))}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                  <button
                    onClick={() => {
                      setSelectedEmpId(emp.id);
                      setActiveTab('generate');
                    }}
                    className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 transition"
                  >
                    Liquidación <ChevronRight className="w-3 h-3" />
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditEmpModal(emp)}
                      className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition"
                      title="Editar Trabajador"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`¿Eliminar trabajador ${emp.name}?`)) {
                          deleteEmployee(emp.id);
                        }
                      }}
                      className="p-1.5 text-zinc-500 hover:text-rose-400 rounded hover:bg-zinc-800 transition"
                      title="Eliminar Trabajador"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: Generate Settlement Form */}
      {activeTab === 'generate' && (
        <div className="max-w-3xl mx-auto bg-[#0F1117] border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-6">
          <div className="border-b border-zinc-800 pb-4">
            <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-purple-400" />
              Calculadora Legal de Liquidación de Sueldo (Chile)
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Aplica automáticamente gratificación legal art. 50 (tope 4.75 IMM), cálculo de horas extras, retenciones de AFP/Salud/AFC y aportes patronales (SIS, Mutual, AFC empleador).
            </p>
          </div>

          <form onSubmit={handleGenerateSettlement} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-zinc-300 mb-1.5">Seleccionar Trabajador *</label>
                <select
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-white font-medium focus:outline-none focus:border-purple-500"
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.rut}) - {e.role}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-zinc-300 mb-1.5">Mes a Liquidar (YYYY-MM) *</label>
                <input
                  type="month"
                  required
                  value={settlementMonth}
                  onChange={(e) => setSettlementMonth(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {currentEmp && (
              <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800 space-y-2">
                <div className="flex justify-between text-zinc-300 font-semibold">
                  <span>Parámetros Base del Contrato:</span>
                  <span className="text-purple-400 uppercase">{currentEmp.contractType.replace('_', ' ')}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-zinc-400 text-[11px] pt-1">
                  <div>
                    <span className="block text-zinc-500">Sueldo Base:</span>
                    <b className="text-zinc-200">{formatCLP(currentEmp.baseSalary)}</b>
                  </div>
                  <div>
                    <span className="block text-zinc-500">AFP:</span>
                    <b className="text-zinc-200 capitalize">
                      {AFP_RATES_CHILE[currentEmp.afp]?.name || currentEmp.afp} ({AFP_RATES_CHILE[currentEmp.afp]?.rate || 11.45}%)
                    </b>
                  </div>
                  <div>
                    <span className="block text-zinc-500">Salud:</span>
                    <b className="text-zinc-200 uppercase">{currentEmp.healthSystem}</b>
                  </div>
                  <div>
                    <span className="block text-zinc-500">No Imponibles:</span>
                    <b className="text-zinc-200">{formatCLP((currentEmp.mealAllowance || 0) + (currentEmp.transportAllowance || 0))}</b>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-zinc-300 mb-1">Horas Extras del Mes</label>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={overtimeHours}
                  onChange={(e) => setOvertimeHours(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 font-mono text-white focus:outline-none focus:border-purple-500"
                  placeholder="0"
                />
                <span className="text-[10px] text-zinc-500 mt-0.5 block">Factor 0.0077777 + 50% recargo</span>
              </div>

              <div>
                <label className="block font-bold text-zinc-300 mb-1">Bonos / Comisiones Imponibles ($)</label>
                <input
                  type="number"
                  min={0}
                  value={bonuses}
                  onChange={(e) => setBonuses(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 font-mono text-white focus:outline-none focus:border-purple-500"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-300 mb-1">Otros Descuentos / Anticipos ($)</label>
                <input
                  type="number"
                  min={0}
                  value={otherDeductions}
                  onChange={(e) => setOtherDeductions(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 font-mono text-white focus:outline-none focus:border-purple-500"
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-zinc-300 mb-1">Medio de Pago del Sueldo</label>
              <select
                value={settlementPaymentMethod}
                onChange={(e) => setSettlementPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500"
              >
                <option value="transferencia">Transferencia Bancaria Cuenta RUT / Vista</option>
                <option value="efectivo">Efectivo con Firma de Comprobante</option>
                <option value="debito">Cheque Nominativo</option>
              </select>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-purple-600/30 transition flex items-center justify-center gap-2"
              >
                <Calculator className="w-4 h-4" />
                Calcular y Guardar Liquidación de Sueldo
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: Settlements List */}
      {activeTab === 'settlements' && (
        <div className="bg-[#0F1117] border border-zinc-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
            <h3 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-400" />
              Historial de Liquidaciones de Sueldo Generadas ({payrollSettlements.length})
            </h3>
          </div>

          {payrollSettlements.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-xs">
              No hay liquidaciones emitidas todavía. Genere la primera en la pestaña "Calcular & Emitir".
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-900/80 text-zinc-400 border-b border-zinc-800">
                  <tr>
                    <th className="p-3 font-semibold">Período</th>
                    <th className="p-3 font-semibold">Trabajador</th>
                    <th className="p-3 font-semibold text-right">Total Imponible</th>
                    <th className="p-3 font-semibold text-right">No Imponibles</th>
                    <th className="p-3 font-semibold text-right">Descuentos Legales</th>
                    <th className="p-3 font-semibold text-right">Líquido a Pagar</th>
                    <th className="p-3 font-semibold text-right">Costo Empresa</th>
                    <th className="p-3 font-semibold text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {payrollSettlements.map((liq) => (
                    <tr key={liq.id} className="hover:bg-zinc-850/50">
                      <td className="p-3 font-mono font-bold text-purple-400">{liq.month}</td>
                      <td className="p-3">
                        <div className="font-bold text-zinc-200">{liq.employeeName}</div>
                        <div className="text-[11px] text-zinc-500 font-mono">{liq.employeeRut} | {liq.employeeRole}</div>
                      </td>
                      <td className="p-3 text-right font-mono text-zinc-300">{formatCLP(liq.totalTaxableIncome)}</td>
                      <td className="p-3 text-right font-mono text-zinc-400">{formatCLP(liq.totalNonTaxableIncome)}</td>
                      <td className="p-3 text-right font-mono text-rose-400">-{formatCLP(liq.totalDeductions)}</td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-400 text-sm">
                        {formatCLP(liq.netSalaryToPay)}
                      </td>
                      <td className="p-3 text-right font-mono text-cyan-300 font-semibold">
                        {formatCLP(liq.totalEmployerCost)}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => setSelectedSettlementToView(liq)}
                          className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg font-semibold text-[11px] transition inline-flex items-center gap-1.5 border border-zinc-700"
                        >
                          <Printer className="w-3.5 h-3.5 text-purple-400" />
                          Ver / Imprimir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal: View Printable Pay Slip */}
      {selectedSettlementToView && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white text-zinc-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 my-8 font-sans">
            {/* Slip Header */}
            <div className="flex items-center justify-between border-b-2 border-zinc-900 pb-3">
              <div>
                <div className="text-xs font-black uppercase text-zinc-900">
                  {settings.parkingName || 'BAMO GARAGE SPA'}
                </div>
                <div className="text-[10px] text-zinc-600 font-mono">
                  RUT: {settings.rut || '78.084.649-6'} • {settings.address || 'Cobija 2058'} • {settings.siiOffice || 'SII Calama'}
                </div>
                <h2 className="text-base font-black tracking-tight uppercase mt-1">LIQUIDACIÓN DE SUELDO</h2>
                <p className="text-[10.5px] text-zinc-600 font-semibold">
                  Conforme al Art. 54 del Código del Trabajo de Chile
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold bg-zinc-100 px-2.5 py-1 rounded border border-zinc-300">
                  Período: {selectedSettlementToView.month}
                </span>
                <div className="text-[10px] text-zinc-500 mt-1 font-mono">
                  Contacto: {settings.phone || '+56993939952'}
                </div>
              </div>
            </div>

            {/* Employee Data */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-zinc-50 p-3 rounded-lg border border-zinc-200">
              <div>
                <span className="text-zinc-500 font-semibold block text-[10px] uppercase">Trabajador:</span>
                <span className="font-bold text-zinc-900">{selectedSettlementToView.employeeName}</span>
              </div>
              <div>
                <span className="text-zinc-500 font-semibold block text-[10px] uppercase">R.U.T.:</span>
                <span className="font-mono font-bold text-zinc-900">{selectedSettlementToView.employeeRut}</span>
              </div>
              <div>
                <span className="text-zinc-500 font-semibold block text-[10px] uppercase">Cargo / Función:</span>
                <span className="font-semibold text-zinc-800 uppercase">{selectedSettlementToView.employeeRole}</span>
              </div>
              <div>
                <span className="text-zinc-500 font-semibold block text-[10px] uppercase">Tipo Contrato:</span>
                <span className="capitalize text-zinc-800">{selectedSettlementToView.contractType.replace('_', ' ')} (30 días)</span>
              </div>
            </div>

            {/* Two column breakdown: Haberes vs Descuentos */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              {/* Left Column: Haberes */}
              <div className="border border-zinc-200 rounded-lg p-3 space-y-1.5 bg-emerald-50/30">
                <div className="font-bold text-emerald-800 border-b border-zinc-200 pb-1 text-[11px] uppercase tracking-wider">
                  I. Haberes del Trabajador
                </div>
                <div className="flex justify-between text-zinc-700">
                  <span>Sueldo Base:</span>
                  <span className="font-mono font-semibold">{formatCLP(selectedSettlementToView.baseSalary)}</span>
                </div>
                <div className="flex justify-between text-zinc-700">
                  <span>Gratificación Legal (Art. 50):</span>
                  <span className="font-mono font-semibold">{formatCLP(selectedSettlementToView.legalGratification)}</span>
                </div>
                {selectedSettlementToView.overtimeAmount > 0 && (
                  <div className="flex justify-between text-zinc-700">
                    <span>Horas Extras ({selectedSettlementToView.overtimeHours} hrs):</span>
                    <span className="font-mono font-semibold">{formatCLP(selectedSettlementToView.overtimeAmount)}</span>
                  </div>
                )}
                {selectedSettlementToView.bonuses > 0 && (
                  <div className="flex justify-between text-zinc-700">
                    <span>Bonos / Comisiones:</span>
                    <span className="font-mono font-semibold">{formatCLP(selectedSettlementToView.bonuses)}</span>
                  </div>
                )}
                <div className="border-t border-zinc-200 pt-1 flex justify-between font-bold text-zinc-900">
                  <span>Total Imponible:</span>
                  <span className="font-mono">{formatCLP(selectedSettlementToView.totalTaxableIncome)}</span>
                </div>
                <div className="pt-1 flex justify-between text-zinc-600 text-[11px]">
                  <span>Asignación Colación:</span>
                  <span className="font-mono">{formatCLP(selectedSettlementToView.mealAllowance)}</span>
                </div>
                <div className="flex justify-between text-zinc-600 text-[11px]">
                  <span>Asignación Movilización:</span>
                  <span className="font-mono">{formatCLP(selectedSettlementToView.transportAllowance)}</span>
                </div>
                <div className="border-t-2 border-emerald-500/40 pt-1 flex justify-between font-black text-emerald-900">
                  <span>TOTAL HABERES BRUTO:</span>
                  <span className="font-mono text-sm">{formatCLP(selectedSettlementToView.totalGrossIncome)}</span>
                </div>
              </div>

              {/* Right Column: Descuentos */}
              <div className="border border-zinc-200 rounded-lg p-3 space-y-1.5 bg-rose-50/30">
                <div className="font-bold text-rose-800 border-b border-zinc-200 pb-1 text-[11px] uppercase tracking-wider">
                  II. Descuentos Previsionales & Legales
                </div>
                <div className="flex justify-between text-zinc-700">
                  <span className="uppercase">AFP {selectedSettlementToView.afpName} ({selectedSettlementToView.afpRate}%):</span>
                  <span className="font-mono font-semibold">{formatCLP(selectedSettlementToView.afpAmount)}</span>
                </div>
                <div className="flex justify-between text-zinc-700">
                  <span>Salud ({selectedSettlementToView.healthRate}%):</span>
                  <span className="font-mono font-semibold">{formatCLP(selectedSettlementToView.healthAmount)}</span>
                </div>
                <div className="flex justify-between text-zinc-700">
                  <span>Seguro Cesantía ({selectedSettlementToView.unemploymentWorkerRate}%):</span>
                  <span className="font-mono font-semibold">{formatCLP(selectedSettlementToView.unemploymentWorkerAmount)}</span>
                </div>
                {selectedSettlementToView.secondCategoryTax > 0 && (
                  <div className="flex justify-between text-zinc-700">
                    <span>Impuesto Único 2da Cat:</span>
                    <span className="font-mono font-semibold">{formatCLP(selectedSettlementToView.secondCategoryTax)}</span>
                  </div>
                )}
                {selectedSettlementToView.otherDeductions > 0 && (
                  <div className="flex justify-between text-zinc-700">
                    <span>Otros Descuentos / Anticipos:</span>
                    <span className="font-mono font-semibold">{formatCLP(selectedSettlementToView.otherDeductions)}</span>
                  </div>
                )}
                <div className="border-t-2 border-rose-500/40 pt-2 flex justify-between font-black text-rose-900">
                  <span>TOTAL DESCUENTOS:</span>
                  <span className="font-mono text-sm">-{formatCLP(selectedSettlementToView.totalDeductions)}</span>
                </div>
              </div>
            </div>

            {/* Net Salary Payable */}
            <div className="p-3.5 bg-zinc-900 text-white rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs uppercase tracking-wider font-semibold text-zinc-400 block">
                  LÍQUIDO A PAGAR AL TRABAJADOR
                </span>
                <span className="text-[11px] text-zinc-300">Medio: {selectedSettlementToView.paymentMethod}</span>
              </div>
              <span className="text-2xl font-black font-mono text-emerald-400">
                {formatCLP(selectedSettlementToView.netSalaryToPay)}
              </span>
            </div>

            {/* Employer Contributions Box */}
            <div className="p-2.5 bg-zinc-100 rounded-lg border border-zinc-300 text-[11px] text-zinc-600 flex flex-wrap justify-between gap-2">
              <span>Aporte Empleador AFC: <b>{formatCLP(selectedSettlementToView.unemploymentEmployerAmount)}</b></span>
              <span>SIS (1.49%): <b>{formatCLP(selectedSettlementToView.sisAmount)}</b></span>
              <span>Mutual (0.93%): <b>{formatCLP(selectedSettlementToView.mutualAmount)}</b></span>
              <span className="text-zinc-900 font-bold">Costo Total Empresa: <b className="text-indigo-900">{formatCLP(selectedSettlementToView.totalEmployerCost)}</b></span>
            </div>

            {/* Signature row */}
            <div className="grid grid-cols-2 gap-8 pt-8 text-center text-xs text-zinc-600">
              <div>
                <div className="border-t border-zinc-400 pt-1 font-semibold">FIRMA DEL EMPLEADOR</div>
                <span className="text-[10px] text-zinc-400">RUT Empresa / Administrador</span>
              </div>
              <div>
                <div className="border-t border-zinc-400 pt-1 font-semibold">FIRMA DEL TRABAJADOR</div>
                <span className="text-[10px] text-zinc-400">Recibí conforme el alcance líquido</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-200">
              <button
                onClick={() => setSelectedSettlementToView(null)}
                className="px-4 py-2 rounded-xl bg-zinc-200 hover:bg-zinc-300 text-zinc-800 font-semibold text-xs transition"
              >
                Cerrar
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimir Liquidación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: New / Edit Employee */}
      {isEmployeeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0F1117] border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-6 text-xs">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                {editingEmployee ? 'Editar Ficha Trabajador' : 'Registrar Nuevo Trabajador'}
              </h3>
              <button
                onClick={() => setIsEmployeeModalOpen(false)}
                className="text-zinc-400 hover:text-white text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">RUT Trabajador *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: 18.951.342-8"
                    value={empRut}
                    onChange={(e) => setEmpRut(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 font-mono text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Nombre Completo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Carlos Morales Castro"
                    value={empName}
                    onChange={(e) => setEmpName(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Cargo / Puesto</label>
                  <select
                    value={empRole}
                    onChange={(e) => setEmpRole(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-zinc-200 focus:outline-none focus:border-purple-500"
                  >
                    <option value="lavador">Lavador / Operario Detailing</option>
                    <option value="cajero">Cajero / Atención al Cliente</option>
                    <option value="supervisor">Supervisor de Turno</option>
                    <option value="administrador">Administrador</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Tipo de Contrato</label>
                  <select
                    value={empContractType}
                    onChange={(e) => setEmpContractType(e.target.value as ContractType)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-zinc-200 focus:outline-none focus:border-purple-500"
                  >
                    <option value="indefinido">Contrato Indefinido (AFC 0.6% / 2.4%)</option>
                    <option value="plazo_fijo">Plazo Fijo / Por Obra (AFC 0% / 3.0%)</option>
                    <option value="honorarios">Honorarios (Sin Imposiciones)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Sueldo Base Mensual ($ CLP) *</label>
                  <input
                    type="number"
                    required
                    min={100000}
                    value={empBaseSalary}
                    onChange={(e) => setEmpBaseSalary(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 font-mono text-white focus:outline-none focus:border-purple-500"
                  />
                  <span className="text-[10px] text-zinc-500">Sueldo mínimo legal Chile: $500.000</span>
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">AFP Previsión</label>
                  <select
                    value={empAfp}
                    onChange={(e) => setEmpAfp(e.target.value as AFPOption)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-zinc-200 focus:outline-none focus:border-purple-500"
                  >
                    <option value="habitat">Habitat (11.27%)</option>
                    <option value="provida">ProVida (11.45%)</option>
                    <option value="cuprum">Cuprum (11.44%)</option>
                    <option value="modelo">Modelo (10.58%)</option>
                    <option value="planvital">PlanVital (11.16%)</option>
                    <option value="uno">Uno (10.49%)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Sistema de Salud</label>
                  <select
                    value={empHealth}
                    onChange={(e) => setEmpHealth(e.target.value as HealthSystem)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-zinc-200 focus:outline-none focus:border-purple-500"
                  >
                    <option value="fonasa">FONASA (7% Legal)</option>
                    <option value="isapre">ISAPRE (Plan en UF o 7%)</option>
                  </select>
                </div>

                {empHealth === 'isapre' && (
                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">Plan Isapre en UF</label>
                    <input
                      type="number"
                      step={0.1}
                      placeholder="Ej: 2.8"
                      value={empHealthUF}
                      onChange={(e) => setEmpHealthUF(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 font-mono text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Asignación de Colación ($)</label>
                  <input
                    type="number"
                    min={0}
                    value={empMeal}
                    onChange={(e) => setEmpMeal(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 font-mono text-white focus:outline-none focus:border-purple-500"
                  />
                  <span className="text-[10px] text-zinc-500">No imponible ni tributable</span>
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Asignación de Movilización ($)</label>
                  <input
                    type="number"
                    min={0}
                    value={empTransport}
                    onChange={(e) => setEmpTransport(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 font-mono text-white focus:outline-none focus:border-purple-500"
                  />
                  <span className="text-[10px] text-zinc-500">No imponible ni tributable</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsEmployeeModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition shadow-lg shadow-purple-600/30"
                >
                  {editingEmployee ? 'Guardar Cambios' : 'Registrar Trabajador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
