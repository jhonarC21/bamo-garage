import React, { useState } from 'react';
import {
  Sparkles,
  Clock,
  Car,
  User,
  Plus,
  CheckCircle2,
  AlertCircle,
  Play,
  Check,
  Send,
  Search,
  Filter,
  Layers,
  Trash2,
} from 'lucide-react';
import { useParking } from '../context/ParkingContext';
import { formatCLP, formatDateTime, formatTimeOnly } from '../utils/pricing';
import { WashOrder, WashStatus, VehicleType, VEHICLE_TYPES } from '../types';

export const CarWashPlatform: React.FC = () => {
  const {
    washServices,
    washOrders,
    spots,
    getVehicleByPlate,
    addWashOrder,
    updateWashStatus,
    removeWashOrder,
  } = useParking();

  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [selectedSpot, setSelectedSpot] = useState<string>('');
  const [plate, setPlate] = useState('');
  const [selectedVehicleType, setSelectedVehicleType] = useState<VehicleType>('sedan');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [washerName, setWasherName] = useState('Juan Pablo R.');
  const [notes, setNotes] = useState('');
  const [catalogFilterType, setCatalogFilterType] = useState<'all' | VehicleType>('all');

  // Kanban filters
  const pendingOrders = washOrders.filter((o) => o.status === 'pending');
  const inProgressOrders = washOrders.filter((o) => o.status === 'in_progress');
  const readyOrders = washOrders.filter((o) => o.status === 'ready');
  const deliveredOrders = washOrders.filter((o) => o.status === 'delivered');

  const occupiedSpots = spots.filter((s) => s.status === 'occupied' && s.currentSession);

  // When spot is selected, auto-fill plate and vehicleType
  const handleSpotSelect = (spotVal: string) => {
    setSelectedSpot(spotVal);
    if (spotVal) {
      const spotNum = Number(spotVal);
      const spot = spots.find((s) => s.number === spotNum);
      if (spot?.currentSession) {
        setPlate(spot.currentSession.plate);
        if (spot.currentSession.vehicleType) {
          setSelectedVehicleType(spot.currentSession.vehicleType);
        } else {
          const vMatch = getVehicleByPlate(spot.currentSession.plate);
          if (vMatch?.vehicleType) {
            setSelectedVehicleType(vMatch.vehicleType);
          }
        }
      }
    }
  };

  const handlePlateChange = (val: string) => {
    const formatted = val.toUpperCase();
    setPlate(formatted);
    if (formatted.length >= 4) {
      const match = getVehicleByPlate(formatted);
      if (match?.vehicleType) {
        setSelectedVehicleType(match.vehicleType);
      }
    }
  };

  // Filter services compatible with selected vehicle type
  const compatibleWashServices = washServices.filter((s) => {
    if (!s.compatibleVehicleTypes || s.compatibleVehicleTypes.length === 0) return true;
    return s.compatibleVehicleTypes.includes(selectedVehicleType);
  });

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveServiceId = selectedServiceId || compatibleWashServices[0]?.id;
    if (!plate.trim() || !effectiveServiceId) return;

    const service = washServices.find((s) => s.id === effectiveServiceId);
    if (!service) return;

    addWashOrder({
      spotNumber: selectedSpot ? Number(selectedSpot) : undefined,
      plate: plate.trim().toUpperCase(),
      serviceId: service.id,
      serviceName: service.name,
      price: service.price,
      washerName: washerName.trim() || undefined,
      status: 'pending',
      notes: notes.trim() || undefined,
      paid: false,
    });

    setIsNewOrderModalOpen(false);
    setPlate('');
    setSelectedSpot('');
    setSelectedServiceId('');
    setNotes('');
  };

  const washersList = ['Juan Pablo R.', 'Marcos Soto', 'Cristian Vega', 'Esteban Muñoz'];

  // Catalog filtered services
  const displayedCatalogServices = washServices.filter((s) => {
    if (catalogFilterType === 'all') return true;
    if (!s.compatibleVehicleTypes || s.compatibleVehicleTypes.length === 0) return true;
    return s.compatibleVehicleTypes.includes(catalogFilterType);
  });

  return (
    <div className="space-y-6">
      {/* Header & Quick Stats */}
      <div className="bg-[#0F1117] border border-zinc-800 rounded-2xl p-5 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-purple-500/10 text-purple-400 text-xs px-2.5 py-1 rounded-full font-semibold border border-purple-500/20 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              Plataforma Car Wash
            </span>
            <span className="text-xs text-zinc-400">Control de Lavados</span>
          </div>
          <h2 className="text-xl font-bold text-zinc-100 mt-1 tracking-tight">
            Gestión y Cola de Lavado de Autos
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Asigna lavadores, gestiona tiempos y sincroniza el estado en tiempo real con el QR del cliente.
          </p>
        </div>

        <button
          id="btn-open-new-wash"
          onClick={() => setIsNewOrderModalOpen(true)}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-purple-600/30 transition active:scale-95 self-start md:self-auto border border-purple-400/30"
        >
          <Plus className="w-4 h-4" />
          Nueva Orden de Lavado
        </button>
      </div>

      {/* Kanban Board of Wash Orders */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* COLUMN 1: PENDING */}
        <div className="bg-[#0F1117] border border-zinc-800 rounded-2xl p-4 flex flex-col space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
              <h3 className="font-bold text-xs text-zinc-200 uppercase tracking-wide">
                En Cola de Espera
              </h3>
            </div>
            <span className="bg-amber-950/80 text-amber-300 border border-amber-800/80 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
              {pendingOrders.length}
            </span>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px]">
            {pendingOrders.map((order) => (
              <div
                key={order.id}
                className="bg-zinc-900/90 border border-amber-900/40 rounded-xl p-3 text-xs space-y-2 shadow-sm hover:border-amber-700/60 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-white bg-zinc-950 px-2 py-0.5 rounded border border-zinc-700">
                    {order.plate}
                  </span>
                  {order.spotNumber && (
                    <span className="text-[10px] font-bold text-indigo-300 bg-indigo-950/80 px-1.5 py-0.5 rounded border border-indigo-800">
                      Puesto #{order.spotNumber}
                    </span>
                  )}
                </div>

                <div>
                  <div className="font-semibold text-zinc-100">{order.serviceName}</div>
                  <div className="text-[11px] font-bold text-emerald-400 font-mono">{formatCLP(order.price)}</div>
                </div>

                <div className="text-[10px] text-zinc-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-400" />
                  Solicitado: <span className="font-mono">{formatTimeOnly(order.requestedAt)}</span>
                </div>

                <div className="pt-2 border-t border-zinc-800 flex items-center justify-between gap-2">
                  <select
                    value={order.washerName || ''}
                    onChange={(e) => updateWashStatus(order.id, 'pending', e.target.value)}
                    className="bg-zinc-950 border border-zinc-700 rounded text-[10px] text-zinc-300 px-1.5 py-1 flex-1 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Asignar Lavador</option>
                    {washersList.map((w) => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>

                  <button
                    onClick={() => updateWashStatus(order.id, 'in_progress', order.washerName || washersList[0])}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white px-2.5 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition shadow-sm border border-cyan-400/30"
                    title="Comenzar lavado ahora"
                  >
                    <Play className="w-3 h-3" />
                    Iniciar
                  </button>

                  <button
                    onClick={() => removeWashOrder(order.id, order.spotNumber)}
                    className="p-1.5 text-zinc-400 hover:text-rose-400 bg-zinc-950 hover:bg-rose-950/60 border border-zinc-750 hover:border-rose-800 rounded transition"
                    title="Eliminar orden por error"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
            {pendingOrders.length === 0 && (
              <div className="text-center py-8 text-zinc-500 text-xs">
                No hay vehículos en espera
              </div>
            )}
          </div>
        </div>

        {/* COLUMN 2: IN PROGRESS */}
        <div className="bg-[#0F1117] border border-zinc-800 rounded-2xl p-4 flex flex-col space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
              <h3 className="font-bold text-xs text-zinc-200 uppercase tracking-wide">
                En Proceso de Lavado
              </h3>
            </div>
            <span className="bg-cyan-950/80 text-cyan-300 border border-cyan-800/80 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
              {inProgressOrders.length}
            </span>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px]">
            {inProgressOrders.map((order) => (
              <div
                key={order.id}
                className="bg-zinc-900/90 border border-cyan-800/60 rounded-xl p-3 text-xs space-y-2 shadow-sm ring-1 ring-cyan-500/20"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-white bg-zinc-950 px-2 py-0.5 rounded border border-zinc-700">
                    {order.plate}
                  </span>
                  {order.spotNumber && (
                    <span className="text-[10px] font-bold text-indigo-300 bg-indigo-950/80 px-1.5 py-0.5 rounded border border-indigo-800">
                      Puesto #{order.spotNumber}
                    </span>
                  )}
                </div>

                <div>
                  <div className="font-semibold text-zinc-100">{order.serviceName}</div>
                  <div className="text-[11px] font-bold text-emerald-400 font-mono">{formatCLP(order.price)}</div>
                </div>

                <div className="text-[10px] text-cyan-300 flex items-center gap-1">
                  <User className="w-3 h-3" />
                  Lavador: <strong className="text-white">{order.washerName || 'Sin asignar'}</strong>
                </div>

                <div className="text-[10px] text-zinc-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-cyan-400" />
                  Iniciado: <span className="font-mono">{order.startedAt ? formatTimeOnly(order.startedAt) : '-'}</span>
                </div>

                <div className="pt-2 border-t border-zinc-800 flex items-center gap-2">
                  <button
                    onClick={() => updateWashStatus(order.id, 'ready')}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-sm border border-emerald-400/30"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Marcar Terminado / Listo
                  </button>
                  <button
                    onClick={() => removeWashOrder(order.id, order.spotNumber)}
                    className="p-1.5 text-zinc-400 hover:text-rose-400 bg-zinc-950 hover:bg-rose-950/60 border border-zinc-750 hover:border-rose-800 rounded-lg transition"
                    title="Eliminar orden por error"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {inProgressOrders.length === 0 && (
              <div className="text-center py-8 text-zinc-500 text-xs">
                No hay lavados en proceso
              </div>
            )}
          </div>
        </div>

        {/* COLUMN 3: READY / COMPLETED */}
        <div className="bg-[#0F1117] border border-zinc-800 rounded-2xl p-4 flex flex-col space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <h3 className="font-bold text-xs text-zinc-200 uppercase tracking-wide">
                Listos Para Retiro
              </h3>
            </div>
            <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
              {readyOrders.length}
            </span>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px]">
            {readyOrders.map((order) => (
              <div
                key={order.id}
                className="bg-zinc-900/90 border border-emerald-800/60 rounded-xl p-3 text-xs space-y-2 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-white bg-zinc-950 px-2 py-0.5 rounded border border-zinc-700">
                    {order.plate}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800">
                    ✨ Listo
                  </span>
                </div>

                <div>
                  <div className="font-semibold text-zinc-100">{order.serviceName}</div>
                  <div className="text-[11px] font-bold text-emerald-400 font-mono">{formatCLP(order.price)}</div>
                </div>

                <div className="text-[10px] text-zinc-400">
                  Lavado por: <span className="text-zinc-200">{order.washerName}</span> • Listo: <span className="font-mono text-zinc-300">{order.completedAt ? formatTimeOnly(order.completedAt) : '-'}</span>
                </div>

                <div className="pt-2 border-t border-zinc-800 flex items-center gap-2">
                  <button
                    onClick={() => updateWashStatus(order.id, 'delivered')}
                    className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition border border-zinc-700"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Entregado al Cliente
                  </button>
                  <button
                    onClick={() => removeWashOrder(order.id, order.spotNumber)}
                    className="p-1.5 text-zinc-400 hover:text-rose-400 bg-zinc-950 hover:bg-rose-950/60 border border-zinc-750 hover:border-rose-800 rounded-lg transition"
                    title="Eliminar orden por error"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {readyOrders.length === 0 && (
              <div className="text-center py-8 text-zinc-500 text-xs">
                No hay vehículos terminados por entregar
              </div>
            )}
          </div>
        </div>

        {/* COLUMN 4: DELIVERED HISTORY */}
        <div className="bg-[#0F1117] border border-zinc-800 rounded-2xl p-4 flex flex-col space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-zinc-400"></span>
              <h3 className="font-bold text-xs text-zinc-200 uppercase tracking-wide">
                Entregados & Facturados
              </h3>
            </div>
            <span className="bg-zinc-900 text-zinc-300 border border-zinc-800 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
              {deliveredOrders.length}
            </span>
          </div>

          <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[600px]">
            {deliveredOrders.slice(0, 10).map((order) => (
              <div
                key={order.id}
                className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-2.5 text-xs space-y-1 opacity-80"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-zinc-300">{order.plate}</span>
                  <span className="text-[10px] text-emerald-400 font-bold font-mono">{formatCLP(order.price)}</span>
                </div>
                <div className="text-[11px] text-zinc-400">{order.serviceName}</div>
                <div className="text-[10px] text-zinc-500">
                  {order.completedAt ? formatTimeOnly(order.completedAt) : 'Hoy'} • Lavador: {order.washerName}
                </div>
              </div>
            ))}
            {deliveredOrders.length === 0 && (
              <div className="text-center py-8 text-zinc-500 text-xs">
                Historial vacío
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Services Price Catalog */}
      <div className="bg-[#0F1117] border border-zinc-800 rounded-2xl p-5 text-white space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
          <div>
            <h3 className="font-bold text-sm text-zinc-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              Catálogo Oficial de Servicios por Tipo de Vehículo
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Servicios calibrados específicamente por dimensiones y tipología vehicular
            </p>
          </div>

          {/* Vehicle Type Filter for Catalog */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-400 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-purple-400" />
              Filtrar por:
            </span>
            <select
              value={catalogFilterType}
              onChange={(e) => setCatalogFilterType(e.target.value as any)}
              className="bg-zinc-900 border border-zinc-750 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
            >
              <option value="all">Todos los Vehículos</option>
              {VEHICLE_TYPES.map((vt) => (
                <option key={vt.id} value={vt.id}>
                  {vt.shortLabel}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {displayedCatalogServices.map((service) => (
            <div
              key={service.id}
              className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-3.5 space-y-2.5 flex flex-col justify-between hover:border-purple-500/40 transition"
            >
              <div>
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-zinc-100 text-xs">{service.name}</h4>
                  <span className="font-mono font-bold text-emerald-400 text-xs">
                    {formatCLP(service.price)}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                  {service.description}
                </p>

                {/* Compatible Vehicle Types Badges */}
                <div className="mt-2 pt-2 border-t border-zinc-800/80 flex flex-wrap gap-1">
                  <span className="text-[10px] text-zinc-400 mr-1">Aplica a:</span>
                  {service.compatibleVehicleTypes && service.compatibleVehicleTypes.length > 0 ? (
                    service.compatibleVehicleTypes.map((vt) => (
                      <span
                        key={vt}
                        className="bg-indigo-950/80 text-indigo-300 border border-indigo-700/50 px-1.5 py-0.2 rounded text-[9px] font-semibold"
                      >
                        {VEHICLE_TYPES.find((t) => t.id === vt)?.shortLabel || vt}
                      </span>
                    ))
                  ) : (
                    <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-700/50 px-1.5 py-0.2 rounded text-[9px] font-semibold">
                      Todos los tipos
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-2 border-t border-zinc-800">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-cyan-400" />
                  Duración aprox: ~{service.durationMinutes} min
                </span>
                <span className="uppercase text-[9px] font-bold bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300 border border-zinc-700">
                  {service.category}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal: New Wash Order */}
      {isNewOrderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#0F1117] border border-zinc-800 rounded-2xl w-full max-w-md text-white shadow-2xl overflow-hidden">
            <div className="bg-[#13151F] px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                Nueva Orden de Lavado
              </h3>
              <button
                onClick={() => setIsNewOrderModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="p-5 space-y-3.5 text-xs">
              {/* Optional Link to active Parking Spot */}
              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  Vincular a Puesto de Estacionamiento (Opcional)
                </label>
                <select
                  value={selectedSpot}
                  onChange={(e) => handleSpotSelect(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-750 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500"
                >
                  <option value="">-- Sin puesto asignado / Lavado de Paso --</option>
                  {occupiedSpots.map((s) => (
                    <option key={s.number} value={s.number}>
                      Puesto #{s.number} - {s.currentSession?.plate} ({s.currentSession?.brand})
                    </option>
                  ))}
                </select>
              </div>

              {/* License Plate */}
              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  Patente del Vehículo *
                </label>
                <input
                  type="text"
                  placeholder="Ej: KLYH-45"
                  value={plate}
                  onChange={(e) => handlePlateChange(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-750 rounded-lg px-3 py-2 text-white uppercase font-mono font-bold tracking-wider text-sm focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              {/* Vehicle Type Selector */}
              <div>
                <label className="block text-zinc-300 font-semibold mb-1.5 flex items-center justify-between">
                  <span>Tipo de Vehículo * (Filtra servicios compatibles)</span>
                  <span className="text-[10px] text-purple-300">
                    {VEHICLE_TYPES.find((v) => v.id === selectedVehicleType)?.shortLabel}
                  </span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1">
                  {VEHICLE_TYPES.map((vt) => (
                    <button
                      key={vt.id}
                      type="button"
                      onClick={() => {
                        setSelectedVehicleType(vt.id);
                        setSelectedServiceId('');
                      }}
                      className={`p-1.5 rounded-lg border text-center transition flex flex-col items-center justify-center ${
                        selectedVehicleType === vt.id
                          ? 'bg-purple-600/30 border-purple-500 text-white font-bold'
                          : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                      }`}
                    >
                      <span className="text-[10px] font-semibold leading-tight">{vt.shortLabel}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Service Selection Filtered by Vehicle Type */}
              <div>
                <label className="block text-zinc-300 font-medium mb-1 flex items-center justify-between">
                  <span>Servicio de Lavado *</span>
                  <span className="text-[10px] text-emerald-400 font-medium">
                    {compatibleWashServices.length} servicios disponibles
                  </span>
                </label>
                <select
                  value={selectedServiceId || (compatibleWashServices[0]?.id || '')}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  className="w-full bg-zinc-900 border border-purple-800/60 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-400"
                  required
                >
                  {compatibleWashServices.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} - {formatCLP(w.price)} (~{w.durationMinutes} min)
                    </option>
                  ))}
                  {compatibleWashServices.length === 0 && (
                    <option value="" disabled>No hay servicios disponibles para esta categoría</option>
                  )}
                </select>
              </div>

              {/* Assigned Washer */}
              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  Lavador Asignado
                </label>
                <select
                  value={washerName}
                  onChange={(e) => setWasherName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-750 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500"
                >
                  {washersList.map((w) => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-zinc-300 font-medium mb-1">Notas especiales</label>
                <input
                  type="text"
                  placeholder="Ej: Cuidado con rayón en puerta derecha"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-750 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsNewOrderModalOpen(false)}
                  className="px-3.5 py-1.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 rounded-lg border border-zinc-750 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={compatibleWashServices.length === 0}
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg font-bold shadow transition border border-purple-400/30"
                >
                  Crear Orden de Lavado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
