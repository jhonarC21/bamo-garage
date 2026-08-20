import React, { useState } from 'react';
import {
  Calendar,
  Plus,
  Sun,
  Moon,
  Clock,
  Car,
  User,
  Phone,
  Mail,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  MessageCircle,
  Trash2,
  Send,
  ExternalLink,
} from 'lucide-react';
import { useParking } from '../context/ParkingContext';
import { formatCLP, formatDateTime } from '../utils/pricing';
import { ContractType, MonthlyContract } from '../types';

export const MonthlyContracts: React.FC = () => {
  const {
    monthlyContracts,
    spots,
    getVehicleByPlate,
    createMonthlyContract,
    updateMonthlyContract,
    deleteMonthlyContract,
    currentUser,
    settings,
  } = useParking();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');

  const sendWhatsAppReminder = (contract: MonthlyContract) => {
    if (!contract.clientPhone) {
      alert('Este contrato no tiene registrado un número de teléfono para WhatsApp.');
      return;
    }
    const cleanPhone = contract.clientPhone.replace(/[^0-9]/g, '');
    const phoneToUse = cleanPhone.startsWith('56') ? cleanPhone : `56${cleanPhone}`;
    const message = `Estimado(a) *${contract.clientName}*, le recordamos cordialmente desde *${settings.parkingName || 'BAMO GARAGE SPA'}* que su arriendo de estacionamiento para el vehículo *${contract.plate}* (Puesto #${contract.spotNumber || 'Flexible'}) tiene fecha de vencimiento el *${contract.endDate}*.\n\n` +
      `*Monto Mensual:* ${formatCLP(contract.monthlyFee)}\n` +
      `*Tipo de Plan:* ${contract.type.replace('_', ' ').toUpperCase()}\n\n` +
      `Agradecemos coordinar la renovación del servicio en nuestra caseta central o vía transferencia. ¡Muchas gracias por su preferencia!`;

    const whatsappUrl = `https://api.whatsapp.com/send?phone=${phoneToUse}&text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleDeleteContract = (contract: MonthlyContract) => {
    if (window.confirm(`¿Seguro que deseas ELIMINAR el contrato de arriendo N° ${contract.contractNumber} (${contract.clientName} - Patente ${contract.plate})? El puesto asociado quedará libre de inmediato.`)) {
      const res = deleteMonthlyContract(contract.id);
      if (res.success) {
        alert('Contrato de arriendo eliminado correctamente.');
      } else {
        alert(res.message);
      }
    }
  };

  // Form state
  const [contractType, setContractType] = useState<ContractType>('diurno');
  const [spotNumber, setSpotNumber] = useState<string>('');
  const [plate, setPlate] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientRut, setClientRut] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split('T')[0];
  });
  const [customFee, setCustomFee] = useState<string>('');
  const [notes, setNotes] = useState('');

  // Default fees by type
  const getFeeForType = (type: ContractType) => {
    switch (type) {
      case 'diurno':
        return settings.dayContractPrice;
      case 'nocturno':
        return settings.nightContractPrice;
      case 'completo_24_7':
        return settings.fullContractPrice;
      default:
        return 45000;
    }
  };

  const handleTypeChange = (type: ContractType) => {
    setContractType(type);
    setCustomFee(String(getFeeForType(type)));
  };

  const handlePlateChange = (val: string) => {
    const formatted = val.toUpperCase();
    setPlate(formatted);
    if (formatted.length >= 4) {
      const match = getVehicleByPlate(formatted);
      if (match) {
        setBrand(match.brand || '');
        setModel(match.model || '');
        setColor(match.color || '');
        setClientName(match.clientName || '');
        setClientRut(match.clientRut || '');
        setClientPhone(match.clientPhone || '');
        setClientEmail(match.clientEmail || '');
      }
    }
  };

  const handleCreateContract = (e: React.FormEvent) => {
    e.preventDefault();
    if (!plate.trim() || !clientName.trim() || !clientRut.trim()) return;

    createMonthlyContract({
      spotNumber: spotNumber ? Number(spotNumber) : undefined,
      plate: plate.trim().toUpperCase(),
      brand: brand.trim() || 'Desconocida',
      model: model.trim() || 'Desconocido',
      color: color.trim() || 'Desconocido',
      clientName: clientName.trim(),
      clientRut: clientRut.trim(),
      clientPhone: clientPhone.trim(),
      clientEmail: clientEmail.trim() || undefined,
      type: contractType,
      monthlyFee: customFee ? parseFloat(customFee) : getFeeForType(contractType),
      startDate,
      endDate,
      status: 'active',
      lastPaymentDate: new Date().toISOString().split('T')[0],
      notes: notes.trim() || undefined,
    });

    setIsModalOpen(false);
    // Reset form
    setPlate('');
    setBrand('');
    setModel('');
    setColor('');
    setClientName('');
    setClientRut('');
    setClientPhone('');
    setClientEmail('');
    setNotes('');
    setSpotNumber('');
  };

  const filteredContracts = monthlyContracts.filter((c) => {
    if (filterType === 'all') return true;
    return c.type === filterType;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#0F1117] border border-zinc-800 rounded-2xl p-5 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-indigo-500/10 text-indigo-400 text-xs px-2.5 py-1 rounded-full font-semibold border border-indigo-500/20 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              Arriendos Mensuales
            </span>
            <span className="text-xs text-zinc-400">Abonos Diurnos & Nocturnos</span>
          </div>
          <h2 className="text-xl font-bold text-zinc-100 mt-1 tracking-tight">
            Gestión de Contratos de Estacionamiento Mensual
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Planes mensuales con horario Diurno (08:00-20:00), Nocturno (20:00-08:00) o Completo 24/7.
          </p>
        </div>

        <button
          onClick={() => {
            setCustomFee(String(getFeeForType('diurno')));
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-indigo-600/30 transition active:scale-95 self-start md:self-auto border border-indigo-400/30"
        >
          <Plus className="w-4 h-4" />
          Nuevo Contrato Mensual
        </button>
      </div>

      {/* Pricing Cards Showcase */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        {/* DIURNO */}
        <div className="bg-[#0F1117] border border-amber-900/40 rounded-xl p-4 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-300 font-bold">
              <Sun className="w-4 h-4 text-amber-400" />
              Arriendo Diurno
            </div>
            <span className="bg-amber-950/80 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-800/80 font-mono">
              08:00 a 20:00 hrs
            </span>
          </div>
          <div className="text-xl font-extrabold text-white font-mono">
            {formatCLP(settings.dayContractPrice)} <span className="text-xs font-normal text-zinc-400">/ mes</span>
          </div>
          <p className="text-zinc-400 text-[11px]">
            Ideal para trabajadores de oficina y personal comercial con uso de lunes a viernes o sábados.
          </p>
        </div>

        {/* NOCTURNO */}
        <div className="bg-[#0F1117] border border-indigo-900/40 rounded-xl p-4 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo-300 font-bold">
              <Moon className="w-4 h-4 text-indigo-400" />
              Arriendo Nocturno
            </div>
            <span className="bg-indigo-950/80 text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-800/80 font-mono">
              20:00 a 08:00 hrs
            </span>
          </div>
          <div className="text-xl font-extrabold text-white font-mono">
            {formatCLP(settings.nightContractPrice)} <span className="text-xs font-normal text-zinc-400">/ mes</span>
          </div>
          <p className="text-zinc-400 text-[11px]">
            Diseñado para vecinos residentes sin estacionamiento propio en su edificio o domicilio.
          </p>
        </div>

        {/* 24/7 */}
        <div className="bg-[#0F1117] border border-purple-900/40 rounded-xl p-4 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-purple-300 font-bold">
              <Clock className="w-4 h-4 text-purple-400" />
              Arriendo Completo 24/7
            </div>
            <span className="bg-purple-950/80 text-purple-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-800/80 font-mono">
              Acceso Total 24/7
            </span>
          </div>
          <div className="text-xl font-extrabold text-white font-mono">
            {formatCLP(settings.fullContractPrice)} <span className="text-xs font-normal text-zinc-400">/ mes</span>
          </div>
          <p className="text-zinc-400 text-[11px]">
            Puesto exclusivo garantizado las 24 horas del día con control de acceso prioritario.
          </p>
        </div>
      </div>

      {/* Contracts Table */}
      <div className="bg-[#0F1117] border border-zinc-800 rounded-2xl p-5 text-white shadow-xl space-y-4">
        {/* Table Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-400" />
            <h3 className="font-bold text-sm text-zinc-100">Contratos Registrados ({monthlyContracts.length})</h3>
          </div>

          <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded text-xs transition font-medium ${
                filterType === 'all' ? 'bg-indigo-600 text-white font-bold shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterType('diurno')}
              className={`px-3 py-1 rounded text-xs transition font-medium ${
                filterType === 'diurno' ? 'bg-amber-600 text-white font-bold shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Diurnos
            </button>
            <button
              onClick={() => setFilterType('nocturno')}
              className={`px-3 py-1 rounded text-xs transition font-medium ${
                filterType === 'nocturno' ? 'bg-indigo-600 text-white font-bold shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Nocturnos
            </button>
            <button
              onClick={() => setFilterType('completo_24_7')}
              className={`px-3 py-1 rounded text-xs transition font-medium ${
                filterType === 'completo_24_7' ? 'bg-purple-600 text-white font-bold shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              24/7
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-900/80 text-zinc-400 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="p-3 font-semibold">Contrato N°</th>
                <th className="p-3 font-semibold">Puesto</th>
                <th className="p-3 font-semibold">Tipo / Horario</th>
                <th className="p-3 font-semibold">Vehículo / Patente</th>
                <th className="p-3 font-semibold">Titular / RUT</th>
                <th className="p-3 font-semibold">Vigencia</th>
                <th className="p-3 text-right font-semibold">Mensualidad</th>
                <th className="p-3 text-center font-semibold">Estado</th>
                <th className="p-3 text-center font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filteredContracts.map((contract) => {
                const isEndingSoon = new Date(contract.endDate).getTime() - new Date().getTime() <= 5 * 24 * 60 * 60 * 1000;

                return (
                  <tr key={contract.id} className="hover:bg-zinc-850/50 transition">
                    <td className="p-3 font-mono font-bold text-indigo-400">
                      {contract.contractNumber}
                    </td>
                    <td className="p-3">
                      {contract.spotNumber ? (
                        <span className="bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded text-white font-bold font-mono">
                          Puesto #{contract.spotNumber}
                        </span>
                      ) : (
                        <span className="text-zinc-500">Flexible</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          contract.type === 'diurno'
                            ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                            : contract.type === 'nocturno'
                            ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-800'
                            : 'bg-purple-950/80 text-purple-300 border border-purple-800'
                        }`}
                      >
                        {contract.type === 'diurno' && <Sun className="w-3 h-3" />}
                        {contract.type === 'nocturno' && <Moon className="w-3 h-3" />}
                        {contract.type === 'completo_24_7' && <Clock className="w-3 h-3" />}
                        {contract.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="font-mono font-bold text-white">{contract.plate}</div>
                      <div className="text-[11px] text-zinc-400">
                        {contract.brand} {contract.model} ({contract.color})
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-zinc-200">{contract.clientName}</div>
                      <div className="text-[10px] text-zinc-400">
                        RUT: {contract.clientRut} • {contract.clientPhone}
                      </div>
                    </td>
                    <td className="p-3 text-zinc-300 text-[11px] font-mono">
                      <div>Desde: {contract.startDate}</div>
                      <div className={isEndingSoon ? 'text-amber-400 font-bold' : ''}>
                        Hasta: {contract.endDate} {isEndingSoon && '⚠️'}
                      </div>
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-400">
                      {formatCLP(contract.monthlyFee)}
                    </td>
                    <td className="p-3 text-center">
                      <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        Activo
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => sendWhatsAppReminder(contract)}
                          className="flex items-center gap-1 px-2.5 py-1 bg-emerald-700/80 hover:bg-emerald-600 text-white rounded-lg font-bold text-[10px] transition shadow border border-emerald-500/40"
                          title="Enviar aviso de vencimiento por WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </button>

                        <button
                          onClick={() => handleDeleteContract(contract)}
                          className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition border border-transparent hover:border-rose-800/50"
                          title="Eliminar arriendo mensual"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: New Monthly Contract */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="bg-[#0F1117] border border-zinc-800 rounded-2xl w-full max-w-lg text-white shadow-2xl overflow-hidden my-6">
            <div className="bg-[#13151F] px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-400" />
                Registrar Nuevo Contrato de Arriendo Mensual
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateContract} className="p-6 space-y-3.5 text-xs">
              {/* Plan Type Selector */}
              <div>
                <label className="block text-zinc-300 font-semibold mb-1.5">
                  Tipo de Arriendo Mensual *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'diurno', label: 'Diurno', time: '08:00-20:00', icon: Sun },
                    { id: 'nocturno', label: 'Nocturno', time: '20:00-08:00', icon: Moon },
                    { id: 'completo_24_7', label: '24/7 Full', time: '24 Horas', icon: Clock },
                  ].map((p) => {
                    const Icon = p.icon;
                    const selected = contractType === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleTypeChange(p.id as ContractType)}
                        className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center transition ${
                          selected
                            ? 'bg-indigo-600 border-indigo-400 text-white font-bold shadow-md shadow-indigo-600/30'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-850'
                        }`}
                      >
                        <Icon className="w-4 h-4 mb-1" />
                        <span className="font-bold text-[11px]">{p.label}</span>
                        <span className="text-[9px] text-zinc-400">{p.time}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Spot assignment & Plate */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">
                    Puesto Asignado (Opcional)
                  </label>
                  <select
                    value={spotNumber}
                    onChange={(e) => setSpotNumber(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-750 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">-- Sin puesto fijo (Flexible) --</option>
                    {spots.map((s) => (
                      <option key={s.number} value={s.number}>
                        Puesto #{s.number} {s.status === 'reserved_monthly' ? '(Ya en arriendo)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1">
                    Patente del Vehículo *
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: LJWR-12"
                    value={plate}
                    onChange={(e) => handlePlateChange(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-750 rounded-lg px-3 py-2 text-white uppercase font-mono font-bold tracking-wider text-xs focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              {/* Vehicle specs */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-zinc-400 text-[10px] mb-1">Marca</label>
                  <input
                    type="text"
                    placeholder="Chevrolet"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-750 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 text-[10px] mb-1">Modelo</label>
                  <input
                    type="text"
                    placeholder="Onix"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-750 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 text-[10px] mb-1">Color</label>
                  <input
                    type="text"
                    placeholder="Blanco"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-750 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Client information */}
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 space-y-2">
                <span className="font-semibold text-zinc-200 block text-[11px]">
                  Datos del Arrendatario / Titular *
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[10px] mb-1">Nombre Completo *</label>
                    <input
                      type="text"
                      placeholder="Rodrigo Araya"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-750 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[10px] mb-1">RUT *</label>
                    <input
                      type="text"
                      placeholder="18.123.456-7"
                      value={clientRut}
                      onChange={(e) => setClientRut(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-750 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[10px] mb-1">Teléfono</label>
                    <input
                      type="text"
                      placeholder="+56 9 6543 2198"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-750 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[10px] mb-1">Correo</label>
                    <input
                      type="email"
                      placeholder="correo@ejemplo.cl"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-750 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Dates & Fee */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-zinc-400 text-[10px] mb-1">Fecha Inicio</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-750 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 text-[10px] mb-1">Fecha Fin</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-750 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 text-[10px] mb-1">Valor Mensual ($)</label>
                  <input
                    type="number"
                    value={customFee}
                    onChange={(e) => setCustomFee(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-750 rounded-lg px-2 py-1.5 text-white font-mono font-bold text-xs text-emerald-400 focus:outline-none focus:border-indigo-500"
                    required
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
                  Crear y Activar Contrato
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
