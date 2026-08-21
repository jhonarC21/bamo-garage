import React, { useState } from 'react';
import {
  Database,
  Search,
  Plus,
  Star,
  Car,
  User,
  Phone,
  Mail,
  Calendar,
  CheckCircle2,
  Edit2,
  Trash2,
  Filter,
  Smile,
  ThumbsUp,
  AlertTriangle,
  ShieldAlert,
  Frown,
  MessageSquare,
  Crown,
  CreditCard,
  DollarSign,
  Banknote,
} from 'lucide-react';
import { useParking } from '../context/ParkingContext';
import { formatCLP, formatDateTime } from '../utils/pricing';
import { Vehicle, CustomerBehaviorRating, PaymentMethod } from '../types';

export const VehiclesDatabase: React.FC = () => {
  const { vehicles, saveVehicle, payVIPAccumulatedBalance, settings } = useParking();

  const [searchQuery, setSearchQuery] = useState('');
  const [onlyFrequent, setOnlyFrequent] = useState(false);
  const [onlyVIP, setOnlyVIP] = useState(false);
  const [behaviorFilter, setBehaviorFilter] = useState<'all' | CustomerBehaviorRating>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  // VIP Payment Settlement Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [payingVehicle, setPayingVehicle] = useState<Vehicle | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('tarjeta_debito');

  // Form fields
  const [plate, setPlate] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [year, setYear] = useState<string>('');
  const [clientName, setClientName] = useState('');
  const [clientRut, setClientRut] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [isVIP, setIsVIP] = useState(false);
  const [vipCreditLimit, setVipCreditLimit] = useState<string>('200000');
  const [vipAccumulatedBalance, setVipAccumulatedBalance] = useState<string>('0');
  const [behaviorRating, setBehaviorRating] = useState<CustomerBehaviorRating>('bueno');
  const [behaviorNotes, setBehaviorNotes] = useState('');

  const openNewVehicleModal = () => {
    setEditingVehicle(null);
    setPlate('');
    setBrand('');
    setModel('');
    setColor('');
    setYear('');
    setClientName('');
    setClientRut('');
    setClientPhone('');
    setClientEmail('');
    setNotes('');
    setIsVIP(false);
    setVipCreditLimit('200000');
    setVipAccumulatedBalance('0');
    setBehaviorRating('bueno');
    setBehaviorNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (v: Vehicle) => {
    setEditingVehicle(v);
    setPlate(v.plate);
    setBrand(v.brand);
    setModel(v.model);
    setColor(v.color);
    setYear(v.year ? String(v.year) : '');
    setClientName(v.clientName || '');
    setClientRut(v.clientRut || '');
    setClientPhone(v.clientPhone || '');
    setClientEmail(v.clientEmail || '');
    setNotes(v.notes || '');
    setIsVIP(!!v.isVIP);
    setVipCreditLimit(String(v.vipCreditLimit || 200000));
    setVipAccumulatedBalance(String(v.vipAccumulatedBalance || 0));
    setBehaviorRating(v.behaviorRating || 'bueno');
    const notesStr = typeof v.behaviorNotes === 'string' ? v.behaviorNotes : Array.isArray(v.behaviorNotes) ? v.behaviorNotes.map(n => typeof n === 'string' ? n : (n as any)?.comment || '').join('; ') : '';
    setBehaviorNotes(notesStr);
    setIsModalOpen(true);
  };

  const openSettlePaymentModal = (v: Vehicle) => {
    setPayingVehicle(v);
    setPaymentAmount(String(v.vipAccumulatedBalance || 0));
    setPaymentMethod('tarjeta_debito');
    setIsPaymentModalOpen(true);
  };

  const handleConfirmVIPPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingVehicle) return;
    const amt = parseFloat(paymentAmount) || 0;
    if (amt <= 0) {
      alert('Ingresa un monto válido para abonar.');
      return;
    }

    payVIPAccumulatedBalance(payingVehicle.plate, amt, paymentMethod);
    setIsPaymentModalOpen(false);
    setPayingVehicle(null);
    alert(`Abono de ${formatCLP(amt)} registrado exitosamente para el cliente VIP (${payingVehicle.plate}).`);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!plate.trim()) return;

    const visits = editingVehicle?.visitsCount || 1;
    const isFreq = visits >= settings.frequentThreshold;

    const vehicleToSave: Vehicle = {
      plate: plate.trim().toUpperCase(),
      brand: brand.trim() || 'Desconocida',
      model: model.trim() || 'Desconocido',
      color: color.trim() || 'Desconocido',
      year: year ? parseInt(year, 10) : undefined,
      clientName: clientName.trim() || undefined,
      clientRut: clientRut.trim() || undefined,
      clientPhone: clientPhone.trim() || undefined,
      clientEmail: clientEmail.trim() || undefined,
      notes: notes.trim() || undefined,
      isVIP: isVIP,
      vipCreditLimit: isVIP ? parseFloat(vipCreditLimit) || 200000 : undefined,
      vipAccumulatedBalance: isVIP ? parseFloat(vipAccumulatedBalance) || 0 : 0,
      behaviorRating: behaviorRating,
      behaviorNotes: behaviorNotes.trim() || undefined,
      visitsCount: visits,
      totalSpent: editingVehicle?.totalSpent || 0,
      isFrequent: isFreq,
      createdAt: editingVehicle?.createdAt || new Date().toISOString(),
      lastVisit: editingVehicle?.lastVisit || new Date().toISOString(),
    };

    saveVehicle(vehicleToSave);
    setIsModalOpen(false);
  };

  const filteredVehicles = vehicles.filter((v) => {
    if (onlyFrequent && !v.isFrequent && v.visitsCount < settings.frequentThreshold) {
      return false;
    }
    if (onlyVIP && !v.isVIP) {
      return false;
    }
    if (behaviorFilter !== 'all' && (v.behaviorRating || 'bueno') !== behaviorFilter) {
      return false;
    }
    const q = (searchQuery || '').trim().toLowerCase();
    const notesString = typeof v.behaviorNotes === 'string' ? v.behaviorNotes : Array.isArray(v.behaviorNotes) ? v.behaviorNotes.map(n => typeof n === 'string' ? n : (n as any)?.comment || '').join(' ') : '';
    return (
      (v.plate || '').toLowerCase().includes(q) ||
      (v.brand || '').toLowerCase().includes(q) ||
      (v.model || '').toLowerCase().includes(q) ||
      (v.clientName && v.clientName.toLowerCase().includes(q)) ||
      (v.clientRut && v.clientRut.toLowerCase().includes(q)) ||
      notesString.toLowerCase().includes(q)
    );
  });

  const frequentCount = vehicles.filter(
    (v) => v.isFrequent || v.visitsCount >= settings.frequentThreshold
  ).length;

  const vipCount = vehicles.filter((v) => v.isVIP).length;

  const renderBehaviorBadge = (rating?: CustomerBehaviorRating) => {
    const val = rating || 'bueno';
    switch (val) {
      case 'excelente':
        return (
          <span className="bg-emerald-950/90 text-emerald-300 border border-emerald-600/50 px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
            <ThumbsUp className="w-3 h-3 text-emerald-400" />
            Excelente
          </span>
        );
      case 'bueno':
        return (
          <span className="bg-cyan-950/80 text-cyan-300 border border-cyan-700/50 px-2 py-0.5 rounded-full text-[10px] font-medium inline-flex items-center gap-1">
            <Smile className="w-3 h-3 text-cyan-400" />
            Buen Cliente
          </span>
        );
      case 'regular':
        return (
          <span className="bg-amber-950/80 text-amber-300 border border-amber-700/50 px-2 py-0.5 rounded-full text-[10px] font-medium inline-flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            Regular
          </span>
        );
      case 'problematico':
        return (
          <span className="bg-rose-950/90 text-rose-300 border border-rose-600/60 px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
            <Frown className="w-3 h-3 text-rose-400" />
            Problemático
          </span>
        );
      case 'vetado':
        return (
          <span className="bg-red-950 text-red-200 border border-red-500 px-2 py-0.5 rounded-full text-[10px] font-extrabold inline-flex items-center gap-1 shadow-sm">
            <ShieldAlert className="w-3 h-3 text-red-400" />
            VETADO
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#0F1117] border border-zinc-800 rounded-2xl p-5 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-indigo-500/10 text-indigo-400 text-xs px-2.5 py-1 rounded-full font-semibold border border-indigo-500/20 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              Base de Datos Automática
            </span>
            <span className="text-xs text-zinc-400">Padrón de Vehículos, Clientes & Comportamiento</span>
          </div>
          <h2 className="text-xl font-bold text-zinc-100 mt-1 tracking-tight">
            Base de Datos de Vehículos & Notas de Comportamiento
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Registro de clientes con evaluación de conducta (buen/mal comportamiento), historial de visitas y carga rápida al tipear la patente.
          </p>
        </div>

        <button
          onClick={openNewVehicleModal}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-indigo-600/30 transition active:scale-95 self-start md:self-auto border border-indigo-400/30"
        >
          <Plus className="w-4 h-4" />
          Registrar Nuevo Vehículo
        </button>
      </div>

      {/* Table & Filters Card */}
      <div className="bg-[#0F1117] border border-zinc-800 rounded-2xl p-5 text-white shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 text-xs border-b border-zinc-800 pb-3">
          {/* Search bar */}
          <div className="relative w-full lg:w-80">
            <input
              type="text"
              placeholder="Buscar por patente, marca, RUT, nombre o notas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-750 rounded-lg px-3 py-2 text-white text-xs pl-8 focus:outline-none focus:border-indigo-500"
            />
            <Search className="w-4 h-4 text-zinc-400 absolute left-2.5 top-2.5" />
          </div>

          {/* Quick filter pills */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setOnlyFrequent(!onlyFrequent);
                if (!onlyFrequent) setOnlyVIP(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
                onlyFrequent
                  ? 'bg-amber-950/80 border-amber-600/80 text-amber-300 font-bold'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${onlyFrequent ? 'fill-amber-400 text-amber-400' : ''}`} />
              Frecuentes ({frequentCount})
            </button>

            <button
              onClick={() => {
                setOnlyVIP(!onlyVIP);
                if (!onlyVIP) setOnlyFrequent(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
                onlyVIP
                  ? 'bg-yellow-950/90 border-yellow-500 text-yellow-300 font-bold shadow-md shadow-yellow-900/30'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              <Crown className={`w-3.5 h-3.5 ${onlyVIP ? 'fill-yellow-400 text-yellow-400' : 'text-yellow-500'}`} />
              Clientes VIP ({vipCount})
            </button>

            {/* Behavior Filter Dropdown */}
            <select
              value={behaviorFilter}
              onChange={(e) => setBehaviorFilter(e.target.value as any)}
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">Todos los Comportamientos</option>
              <option value="excelente">Solo Excelente</option>
              <option value="bueno">Solo Buen Cliente</option>
              <option value="regular">Solo Regular</option>
              <option value="problematico">Solo Problemático</option>
              <option value="vetado">Solo Vetados</option>
            </select>

            <span className="text-zinc-500 text-xs font-mono pl-2">
              Total: {vehicles.length}
            </span>
          </div>
        </div>

        {/* Vehicles Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-900/80 text-zinc-400 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="p-3 font-semibold">Patente</th>
                <th className="p-3 font-semibold">Categoría</th>
                <th className="p-3 font-semibold">Vehículo</th>
                <th className="p-3 font-semibold">Cliente & RUT</th>
                <th className="p-3 font-semibold">Comportamiento & Notas</th>
                <th className="p-3 text-center font-semibold">Visitas</th>
                <th className="p-3 text-right font-semibold">Saldo Acumulado VIP</th>
                <th className="p-3 text-right font-semibold">Gasto Histórico</th>
                <th className="p-3 text-center font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filteredVehicles.map((v) => (
                <tr key={v.plate} className="hover:bg-zinc-850/50 transition">
                  <td className="p-3">
                    <span className="bg-zinc-900 border border-zinc-700 px-2.5 py-1 rounded text-white font-mono font-bold text-xs tracking-wider shadow-inner">
                      {v.plate}
                    </span>
                  </td>
                  <td className="p-3">
                    {v.isVIP ? (
                      <span className="bg-yellow-950/80 text-yellow-300 border border-yellow-500/60 px-2 py-0.5 rounded-full text-[10px] font-extrabold inline-flex items-center gap-1 shadow-sm">
                        <Crown className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                        VIP
                      </span>
                    ) : v.isFrequent || v.visitsCount >= settings.frequentThreshold ? (
                      <span className="bg-amber-950/60 text-amber-300 border border-amber-700/40 px-2 py-0.5 rounded-full text-[10px] font-medium inline-flex items-center gap-1">
                        <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                        Frecuente
                      </span>
                    ) : (
                      <span className="text-zinc-500 text-[10px]">Estándar</span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="font-semibold text-zinc-200">{v.brand} {v.model}</div>
                    <div className="text-[11px] text-zinc-400">{v.color} {v.year ? `(${v.year})` : ''}</div>
                  </td>
                  <td className="p-3">
                    {v.clientName ? (
                      <div>
                        <div className="font-semibold text-zinc-200">{v.clientName}</div>
                        <div className="text-[10px] text-zinc-400">
                          {v.clientRut ? `RUT: ${v.clientRut}` : ''} {v.clientPhone ? `• ${v.clientPhone}` : ''}
                        </div>
                      </div>
                    ) : (
                      <span className="text-zinc-500 italic">No registrado</span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="space-y-1">
                      <div>{renderBehaviorBadge(v.behaviorRating)}</div>
                      {v.behaviorNotes && (
                        <div className="text-[11px] text-amber-300/90 flex items-start gap-1 max-w-xs">
                          <MessageSquare className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />
                          <span className="line-clamp-2">
                            {typeof v.behaviorNotes === 'string'
                              ? v.behaviorNotes
                              : Array.isArray(v.behaviorNotes)
                              ? v.behaviorNotes.map((n) => typeof n === 'string' ? n : (n as any)?.comment || '').join('; ')
                              : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-center font-mono font-bold text-cyan-400">
                    {v.visitsCount}
                  </td>
                  <td className="p-3 text-right font-mono font-bold">
                    {v.isVIP ? (
                      <div>
                        <span className={`text-xs ${v.vipAccumulatedBalance && v.vipAccumulatedBalance > 0 ? 'text-amber-400 font-black' : 'text-emerald-400'}`}>
                          {formatCLP(v.vipAccumulatedBalance || 0)}
                        </span>
                        <div className="text-[9px] text-zinc-500 font-sans">
                          Límite: {formatCLP(v.vipCreditLimit || 200000)}
                        </div>
                      </div>
                    ) : (
                      <span className="text-zinc-600 text-[10px]">-</span>
                    )}
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-zinc-300">
                    {formatCLP(v.totalSpent || 0)}
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {v.isVIP && v.vipAccumulatedBalance !== undefined && v.vipAccumulatedBalance > 0 && (
                        <button
                          onClick={() => openSettlePaymentModal(v)}
                          className="px-2 py-1 bg-yellow-600 hover:bg-yellow-500 text-black font-bold rounded-lg text-[10px] transition shadow flex items-center gap-1"
                          title="Abonar / Liquidar Saldo Acumulado VIP"
                        >
                          <DollarSign className="w-3 h-3" />
                          Abonar
                        </button>
                      )}
                      <button
                        onClick={() => openEditModal(v)}
                        className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg transition border border-zinc-700"
                        title="Editar datos del vehículo, cliente, categoría VIP y notas"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add/Edit Vehicle */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="bg-[#0F1117] border border-zinc-800 rounded-2xl w-full max-w-lg text-white shadow-2xl overflow-hidden my-6">
            <div className="bg-[#13151F] px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
                <Car className="w-4 h-4 text-indigo-400" />
                {editingVehicle ? 'Editar Vehículo y Ficha Cliente' : 'Registrar Nuevo Vehículo'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="block text-zinc-300 font-medium mb-1">Patente *</label>
                <input
                  type="text"
                  placeholder="Ej: KLYH-45"
                  value={plate}
                  onChange={(e) => setPlate(e.target.value.toUpperCase())}
                  className="w-full bg-zinc-900 border border-zinc-750 rounded-lg px-3 py-2 text-white uppercase font-mono font-bold tracking-wider text-xs focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Marca *</label>
                  <input
                    type="text"
                    placeholder="Toyota"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-750 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Modelo *</label>
                  <input
                    type="text"
                    placeholder="RAV4"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-750 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Color *</label>
                  <input
                    type="text"
                    placeholder="Gris Plata"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-750 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Año</label>
                  <input
                    type="number"
                    placeholder="2022"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-750 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* VIP Category Switch */}
              <div className="bg-yellow-950/20 border border-yellow-500/40 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isVIP}
                      onChange={(e) => setIsVIP(e.target.checked)}
                      className="w-4 h-4 rounded text-yellow-500 focus:ring-yellow-500 focus:ring-offset-zinc-900 bg-zinc-900 border-zinc-700"
                    />
                    <span className="font-bold text-yellow-300 text-[11px] flex items-center gap-1">
                      <Crown className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                      Cliente Categoría VIP (Pagos Acumulados / Cuenta Corriente)
                    </span>
                  </label>
                </div>

                {isVIP && (
                  <div className="grid grid-cols-2 gap-2.5 pt-1 border-t border-yellow-500/20">
                    <div>
                      <label className="block text-zinc-300 text-[10px] font-semibold mb-1">
                        Límite de Crédito Acumulado (CLP)
                      </label>
                      <input
                        type="number"
                        placeholder="200000"
                        value={vipCreditLimit}
                        onChange={(e) => setVipCreditLimit(e.target.value)}
                        className="w-full bg-zinc-950 border border-yellow-500/40 rounded-lg px-2.5 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-yellow-400"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-300 text-[10px] font-semibold mb-1">
                        Saldo Acumulado Actual (CLP)
                      </label>
                      <input
                        type="number"
                        placeholder="0"
                        value={vipAccumulatedBalance}
                        onChange={(e) => setVipAccumulatedBalance(e.target.value)}
                        className="w-full bg-zinc-950 border border-yellow-500/40 rounded-lg px-2.5 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-yellow-400"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Client Info */}
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 space-y-2">
                <span className="font-semibold text-zinc-200 block text-[11px]">
                  Datos del Cliente (Opcional - Gestión Interna)
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[10px] mb-1">Nombre</label>
                    <input
                      type="text"
                      placeholder="Carlos Morales"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-750 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[10px] mb-1">RUT</label>
                    <input
                      type="text"
                      placeholder="15.489.321-4"
                      value={clientRut}
                      onChange={(e) => setClientRut(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-750 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[10px] mb-1">Teléfono</label>
                    <input
                      type="text"
                      placeholder="+56 9 7412 8596"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-750 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[10px] mb-1">Correo</label>
                    <input
                      type="email"
                      placeholder="correo@ejemplo.cl"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-750 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Behavior Notes & Rating Section */}
              <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-300 text-[11px] flex items-center gap-1.5">
                    <ThumbsUp className="w-3.5 h-3.5 text-amber-400" />
                    Evaluación de Conducta & Notas del Cliente
                  </span>
                  <span className="text-[10px] text-zinc-400">Control de buen/mal comportamiento</span>
                </div>

                <div>
                  <label className="block text-zinc-300 text-[10px] font-semibold mb-1">
                    Calificación de Comportamiento
                  </label>
                  <select
                    value={behaviorRating}
                    onChange={(e) => setBehaviorRating(e.target.value as CustomerBehaviorRating)}
                    className="w-full bg-zinc-900 border border-amber-500/40 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="excelente">⭐ Excelente Cliente (Muy respetuoso, puntual, propinas)</option>
                    <option value="bueno">👍 Buen Comportamiento (Estándar cordial)</option>
                    <option value="regular">⚠️ Comportamiento Regular (Reclamos menores o demoras)</option>
                    <option value="problematico">❌ Cliente Problemático (Discusiones, exige descuentos indebidos)</option>
                    <option value="vetado">🚫 VETADO / Prohibido el Ingreso (Incumplimientos graves)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-300 text-[10px] font-semibold mb-1">
                    Notas Internas del Comportamiento
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Ej: Cliente siempre deja propina a los lavadores / Cliente reclamó por estacionarse fuera de línea el 12/08..."
                    value={behaviorNotes}
                    onChange={(e) => setBehaviorNotes(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-white text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 rounded-lg border border-zinc-750 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold shadow transition border border-indigo-400/30"
                >
                  Guardar Vehículo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Settle VIP Accumulated Payment */}
      {isPaymentModalOpen && payingVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="bg-[#0F1117] border border-zinc-800 rounded-2xl w-full max-w-md text-white shadow-2xl overflow-hidden my-6">
            <div className="bg-[#13151F] px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-yellow-400 flex items-center gap-2">
                <Crown className="w-4 h-4" />
                Abono a Saldo Acumulado VIP
              </h3>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmVIPPayment} className="p-6 space-y-4 text-xs">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Cliente / Patente:</span>
                  <span className="font-bold text-white font-mono">{payingVehicle.plate} ({payingVehicle.clientName || 'Cliente VIP'})</span>
                </div>
                <div className="flex justify-between border-t border-zinc-800 pt-1">
                  <span className="text-zinc-400">Saldo Deudor Acumulado:</span>
                  <span className="font-mono font-black text-amber-400 text-sm">
                    {formatCLP(payingVehicle.vipAccumulatedBalance || 0)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">
                  Monto a Abonar (CLP) *
                </label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-750 rounded-lg px-3 py-2 text-white font-mono font-bold text-sm focus:outline-none focus:border-yellow-500"
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1.5">
                  Método de Pago *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'efectivo', label: 'Efectivo', icon: Banknote },
                    { id: 'tarjeta_debito', label: 'Débito', icon: CreditCard },
                    { id: 'tarjeta_credito', label: 'Crédito', icon: CreditCard },
                    { id: 'transferencia', label: 'Transferencia', icon: DollarSign },
                  ].map((m) => {
                    const Icon = m.icon;
                    const selected = paymentMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                        className={`p-2 rounded-xl border flex items-center justify-center gap-1.5 text-center transition ${
                          selected
                            ? 'bg-yellow-600 border-yellow-400 text-black font-bold shadow'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-850'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span className="text-[11px]">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 rounded-lg border border-zinc-750 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg font-bold shadow transition"
                >
                  Registrar Pago de Abono
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};


