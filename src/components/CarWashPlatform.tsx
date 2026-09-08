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
  Receipt,
  CreditCard,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  ExternalLink,
  ShieldAlert,
  Camera,
  Eye,
  FileText,
} from 'lucide-react';
import { useParking } from '../context/ParkingContext';
import { formatCLP, formatDateTime, formatTimeOnly, calculateParkingFee } from '../utils/pricing';
import {
  WashOrder,
  WashStatus,
  VehicleType,
  VEHICLE_TYPES,
  PaymentMethod,
  POSTerminalProvider,
  WashInspectionSheet,
} from '../types';
import { WashInspectionModal } from './WashInspectionModal';

interface CarWashPlatformProps {
  onCheckOutSpot?: (spotNumber: number) => void;
  onNavigateToCaja?: () => void;
}

export const CarWashPlatform: React.FC<CarWashPlatformProps> = ({
  onCheckOutSpot,
  onNavigateToCaja,
}) => {
  const {
    washServices,
    washOrders,
    spots,
    getVehicleByPlate,
    addWashOrder,
    updateWashStatus,
    collectStandaloneWashOrder,
    assignWashOrderToSpot,
    currentTime,
    settings,
    currentUser,
    updateWashInspectionSheet,
  } = useParking();

  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [selectedSpot, setSelectedSpot] = useState<string>('');
  const [plate, setPlate] = useState('');
  const [selectedVehicleType, setSelectedVehicleType] = useState<VehicleType>('sedan');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [washerName, setWasherName] = useState('Juan Pablo R.');
  const [notes, setNotes] = useState('');
  const [catalogFilterType, setCatalogFilterType] = useState<'all' | VehicleType>('all');

  // Inspection Modal states
  const [inspectionModalOrder, setInspectionModalOrder] = useState<WashOrder | null>(null);
  const [newOrderInspectionSheet, setNewOrderInspectionSheet] = useState<WashInspectionSheet | null>(null);
  const [isCreatingInspectionForNewOrder, setIsCreatingInspectionForNewOrder] = useState(false);

  // Standalone Wash Payment Collection Modal state
  const [collectModalOrder, setCollectModalOrder] = useState<WashOrder | null>(null);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('efectivo');
  const [posProvider, setPosProvider] = useState<POSTerminalProvider>('tuu');
  const [authorizationCode, setAuthorizationCode] = useState('');
  const [siiBoletaNumber, setSiiBoletaNumber] = useState('');
  const [transferVoucherNumber, setTransferVoucherNumber] = useState('');
  const [cashGiven, setCashGiven] = useState('');

  // Assign spot modal state
  const [assignSpotOrder, setAssignSpotOrder] = useState<WashOrder | null>(null);
  const [targetSpotNumber, setTargetSpotNumber] = useState('');

  // Notifications
  const [actionNotification, setActionNotification] = useState<string | null>(null);

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
      inspectionSheet: newOrderInspectionSheet || undefined,
    });

    setIsNewOrderModalOpen(false);
    setNewOrderInspectionSheet(null);
    setPlate('');
    setSelectedSpot('');
    setSelectedServiceId('');
    setNotes('');
  };

  // Helper to render Damage Inspection button or badge for any Wash Order
  const renderInspectionButtonOrBadge = (order: WashOrder) => {
    if (order.inspectionSheet) {
      return (
        <div className="bg-cyan-950/50 border border-cyan-700/60 rounded-lg p-2 text-xs flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 text-cyan-200 truncate">
            <ShieldAlert className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="text-[11px] truncate">
              Ficha: <strong className="text-white">{order.inspectionSheet.damages.length}</strong> daño(s) • <strong className="text-white">{order.inspectionSheet.photos.length}</strong> foto(s)
            </span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setInspectionModalOrder(order);
            }}
            className="px-2 py-0.5 rounded bg-cyan-900/90 hover:bg-cyan-800 text-cyan-200 text-[10px] font-bold shrink-0 transition flex items-center gap-1"
            title="Ver o editar ficha de daños y fotos"
          >
            <Eye className="w-3 h-3" />
            Ver Ficha
          </button>
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setInspectionModalOrder(order);
        }}
        className="w-full py-1.5 px-2 rounded-lg bg-zinc-950/70 hover:bg-cyan-950/60 text-zinc-400 hover:text-cyan-300 border border-zinc-800 hover:border-cyan-700/60 text-[10px] font-medium flex items-center justify-center gap-1.5 transition"
        title="Registrar daños previos y fotos para evitar acusaciones"
      >
        <Camera className="w-3.5 h-3.5 text-cyan-400" />
        <span>+ Registrar Daños / Fotos</span>
      </button>
    );
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
      {/* Real-time notification banner */}
      {actionNotification && (
        <div className="bg-emerald-950/90 border border-emerald-500/60 p-3.5 rounded-xl text-xs text-emerald-200 flex items-center justify-between shadow-lg shadow-emerald-950/40 animate-fade-in">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionNotification}</span>
          </div>
          <div className="flex items-center gap-2">
            {onNavigateToCaja && (
              <button
                onClick={onNavigateToCaja}
                className="text-xs bg-emerald-850 hover:bg-emerald-800 text-white font-bold px-2.5 py-1 rounded-lg border border-emerald-600/60 flex items-center gap-1 transition"
              >
                <span>Ver en Caja Diaria</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
            <button
              onClick={() => setActionNotification(null)}
              className="text-emerald-400 hover:text-white text-xs font-bold px-1.5 py-0.5"
            >
              ✕
            </button>
          </div>
        </div>
      )}

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

                {renderInspectionButtonOrBadge(order)}

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

                {renderInspectionButtonOrBadge(order)}

                <div className="pt-2 border-t border-zinc-800">
                  <button
                    onClick={() => updateWashStatus(order.id, 'ready')}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-sm border border-emerald-400/30"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Marcar Terminado / Listo
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
            {readyOrders.map((order) => {
              // Check if vehicle is currently in a parking spot
              const parkedSpot = spots.find(
                (s) =>
                  s.status === 'occupied' &&
                  (s.number === order.spotNumber ||
                    s.currentSession?.plate.toUpperCase() === order.plate.toUpperCase())
              );
              const isParked = !!parkedSpot && !!parkedSpot.currentSession;

              // If parked, compute live fee
              const livePricing = isParked && parkedSpot.currentSession
                ? calculateParkingFee(
                    parkedSpot.currentSession.entryTime,
                    currentTime,
                    undefined,
                    settings.base30MinPrice,
                    settings.extra10MinPrice
                  )
                : null;

              const currentParkingFee = livePricing?.totalParkingCost || 0;
              const totalCombinedToCollect = currentParkingFee + order.price;

              return (
                <div
                  key={order.id}
                  className={`rounded-xl p-3.5 text-xs space-y-2.5 shadow-sm border transition ${
                    isParked
                      ? 'bg-[#121626] border-indigo-600/50'
                      : 'bg-zinc-900/90 border-emerald-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-white bg-zinc-950 px-2 py-0.5 rounded border border-zinc-700">
                        {order.plate}
                      </span>
                      {isParked ? (
                        <span className="text-[10px] font-bold text-indigo-300 bg-indigo-950/90 px-2 py-0.5 rounded border border-indigo-700/80 flex items-center gap-1">
                          🅿️ Puesto #{parkedSpot.number}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-cyan-300 bg-cyan-950/90 px-2 py-0.5 rounded border border-cyan-800/80 flex items-center gap-1">
                          🚿 Solo Lavado
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800">
                      ✨ Listo
                    </span>
                  </div>

                  <div>
                    <div className="font-semibold text-zinc-100">{order.serviceName}</div>
                    <div className="text-[11px] font-bold text-cyan-300 font-mono">
                      Lavado: {formatCLP(order.price)}
                    </div>
                  </div>

                  {renderInspectionButtonOrBadge(order)}

                  {isParked ? (
                    /* CASE 1: VEHICLE IS PARKED AND STILL PARKED - SUM TO PARKING */
                    <div className="bg-indigo-950/70 border border-indigo-500/50 rounded-lg p-2.5 space-y-1.5 text-[11px]">
                      <div className="text-indigo-200 font-bold flex items-center justify-between">
                        <span>⏱️ Sigue Estacionado ({livePricing?.elapsedMinutes || 0} min)</span>
                        <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.2 rounded border border-indigo-500/40">
                          Cobro Unificado
                        </span>
                      </div>
                      <div className="flex justify-between text-zinc-300">
                        <span>Parking transcurrido:</span>
                        <span className="font-mono text-white">{formatCLP(currentParkingFee)}</span>
                      </div>
                      <div className="flex justify-between text-cyan-300">
                        <span>Lavado listo:</span>
                        <span className="font-mono font-bold">+{formatCLP(order.price)}</span>
                      </div>
                      <div className="flex justify-between text-amber-300 font-bold pt-1 border-t border-indigo-500/40 text-xs">
                        <span>Total al Salir:</span>
                        <span className="font-mono text-white font-extrabold">{formatCLP(totalCombinedToCollect)}</span>
                      </div>
                      <p className="text-[10px] text-indigo-300/80 italic pt-0.5 leading-tight">
                        El monto del lavado se suma automáticamente a la tarifa del estacionamiento para ser cobrado al registrar la salida.
                      </p>

                      <div className="pt-1.5">
                        {onCheckOutSpot ? (
                          <button
                            onClick={() => onCheckOutSpot(parkedSpot.number)}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-sm border border-indigo-400/40 active:scale-95"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                            Cobrar Salida y Entregar (Puesto #{parkedSpot.number})
                          </button>
                        ) : (
                          <button
                            onClick={() => updateWashStatus(order.id, 'delivered')}
                            className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition border border-zinc-700"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            Marcar Entregado
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* CASE 2: STANDALONE WASH - VEHICLE ENTERED ONLY FOR WASH */
                    <div className="space-y-2">
                      <div className="bg-emerald-950/40 border border-emerald-600/40 rounded-lg p-2 text-[11px] text-emerald-200/90 leading-tight">
                        <span className="font-bold text-emerald-300 block mb-0.5">🚗 Ingresó Solo Para Lavado</span>
                        Al marcar como cobrado, se sumará directamente a la <strong>Caja Diaria</strong>.
                      </div>

                      <div className="flex flex-col gap-1.5 pt-0.5">
                        <button
                          onClick={() => {
                            setCollectModalOrder(order);
                            setPayMethod('efectivo');
                            setCashGiven('');
                            setAuthorizationCode('');
                            setSiiBoletaNumber('');
                            setTransferVoucherNumber('');
                          }}
                          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-md shadow-emerald-950 border border-emerald-400/50 active:scale-95"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          Cobrar e Ingresar a Caja ({formatCLP(order.price)})
                        </button>

                        <button
                          onClick={() => {
                            setAssignSpotOrder(order);
                            setTargetSpotNumber('');
                          }}
                          title="Si el cliente continuará estacionado, vincúlelo a un puesto para sumar el tiempo de parking"
                          className="w-full bg-zinc-800 hover:bg-zinc-750 text-indigo-300 py-1.5 px-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 border border-zinc-700 transition hover:border-indigo-600/50"
                        >
                          🅿️ ¿Sigue Estacionado? Asignar Puesto
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="text-[10px] text-zinc-400 pt-0.5">
                    Lavado por: <span className="text-zinc-200">{order.washerName}</span> • Listo:{' '}
                    <span className="font-mono text-zinc-300">
                      {order.completedAt ? formatTimeOnly(order.completedAt) : '-'}
                    </span>
                  </div>
                </div>
              );
            })}
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
                {renderInspectionButtonOrBadge(order)}
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

              {/* Ficha de Inspección y Registro de Daños Preexistentes */}
              <div className="bg-cyan-950/30 border border-cyan-800/60 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-cyan-400" />
                    <span className="font-bold text-xs text-white">Ficha de Daños y Fotos de Ingreso</span>
                  </div>
                  <span className="text-[10px] text-cyan-300 uppercase tracking-wider font-semibold">
                    Anti-Reclamos
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-snug">
                  Documenta rayones, abolladuras o trizaduras previas y adjunta fotos con fecha/hora antes de mojar el vehículo.
                </p>
                {newOrderInspectionSheet ? (
                  <div className="flex items-center justify-between bg-cyan-950/80 border border-cyan-700/80 rounded-lg p-2 text-xs">
                    <div className="text-cyan-200">
                      <span className="font-bold text-emerald-400">✓ Ficha completada:</span>{' '}
                      <strong>{newOrderInspectionSheet.damages.length}</strong> daño(s),{' '}
                      <strong>{newOrderInspectionSheet.photos.length}</strong> foto(s)
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsCreatingInspectionForNewOrder(true)}
                      className="px-2.5 py-1 bg-cyan-900 hover:bg-cyan-800 text-cyan-200 rounded font-semibold text-[11px] transition"
                    >
                      Editar Ficha
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (!plate.trim()) {
                        alert('Por favor ingrese primero la patente del vehículo.');
                        return;
                      }
                      setIsCreatingInspectionForNewOrder(true);
                    }}
                    className="w-full py-2 px-3 bg-zinc-900 hover:bg-cyan-950 border border-zinc-700 hover:border-cyan-600 rounded-lg text-cyan-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Llenar Ficha de Daños y Tomar Fotos Ahora</span>
                  </button>
                )}
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

      {/* MODAL: COBRAR SOLO LAVADO (STANDALONE WASH ORDER COLLECTION) */}
      {collectModalOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#12141D] border border-zinc-750 rounded-2xl max-w-lg w-full p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-zinc-100">
                    Cobrar Servicio de Lavado
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Vehículo ingresado solo para lavado • Suma a Caja Diaria
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCollectModalOrder(null)}
                className="text-zinc-500 hover:text-white text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Summary Ticket */}
            <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-white bg-zinc-900 px-2.5 py-1 rounded text-sm border border-zinc-700">
                  {collectModalOrder.plate}
                </span>
                <span className="text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                  ✨ Listo Para Retiro
                </span>
              </div>
              <div className="flex justify-between text-zinc-300">
                <span>Servicio:</span>
                <span className="font-semibold text-white">{collectModalOrder.serviceName}</span>
              </div>
              {collectModalOrder.washerName && (
                <div className="flex justify-between text-zinc-400 text-[11px]">
                  <span>Lavador asignado:</span>
                  <span className="text-zinc-200">{collectModalOrder.washerName}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-zinc-800 text-sm">
                <span className="font-bold text-zinc-200">Total a Cobrar:</span>
                <span className="font-mono font-extrabold text-emerald-400 text-lg">
                  {formatCLP(collectModalOrder.price)}
                </span>
              </div>
            </div>

            {/* Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!collectModalOrder) return;
                const isCard = payMethod === 'tarjeta_debito' || payMethod === 'tarjeta_credito';
                const posInfo = isCard
                  ? { provider: posProvider, authorizationCode: authorizationCode.trim() || undefined }
                  : undefined;

                collectStandaloneWashOrder(
                  collectModalOrder.id,
                  payMethod,
                  posInfo,
                  siiBoletaNumber.trim() || undefined,
                  transferVoucherNumber.trim() || undefined
                );

                setActionNotification(
                  `¡Cobro de lavado para patente ${collectModalOrder.plate} (${formatCLP(collectModalOrder.price)}) registrado con éxito! El dinero fue ingresado a la Caja Diaria.`
                );
                setCollectModalOrder(null);
                setCashGiven('');
                setAuthorizationCode('');
                setSiiBoletaNumber('');
                setTransferVoucherNumber('');
              }}
              className="space-y-4"
            >
              {/* Payment Method Tabs */}
              <div>
                <label className="block text-zinc-300 font-semibold mb-2 text-xs">
                  Medio de Pago *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPayMethod('efectivo')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      payMethod === 'efectivo'
                        ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    Efectivo
                  </button>

                  <button
                    type="button"
                    onClick={() => setPayMethod('tarjeta_debito')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      payMethod === 'tarjeta_debito'
                        ? 'bg-cyan-600/30 border-cyan-500 text-cyan-300'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    Débito (POS)
                  </button>

                  <button
                    type="button"
                    onClick={() => setPayMethod('tarjeta_credito')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      payMethod === 'tarjeta_credito'
                        ? 'bg-purple-600/30 border-purple-500 text-purple-300'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    Crédito (POS)
                  </button>

                  <button
                    type="button"
                    onClick={() => setPayMethod('transferencia')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      payMethod === 'transferencia'
                        ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <Send className="w-3.5 h-3.5" />
                    Transferencia
                  </button>

                  <button
                    type="button"
                    onClick={() => setPayMethod('cuenta_corriente_vip')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 col-span-2 sm:col-span-2 ${
                      payMethod === 'cuenta_corriente_vip'
                        ? 'bg-yellow-600/30 border-yellow-500 text-yellow-300'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <span>👑 Cuenta Corriente VIP</span>
                  </button>
                </div>
              </div>

              {/* Cash given & change calculation */}
              {payMethod === 'efectivo' && (
                <div className="bg-zinc-950/60 border border-emerald-500/30 rounded-xl p-3 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <label className="text-zinc-300 font-semibold">
                      Efectivo Entregado por el Cliente:
                    </label>
                    <span className="text-[10px] text-zinc-400">Calculadora de Vuelto</span>
                  </div>
                  <input
                    type="number"
                    placeholder="Monto recibido (Ej: 20000)"
                    value={cashGiven}
                    onChange={(e) => setCashGiven(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white font-mono font-bold text-sm focus:outline-none focus:border-emerald-500"
                  />
                  {/* Fast cash buttons */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[
                      collectModalOrder.price,
                      Math.ceil(collectModalOrder.price / 5000) * 5000,
                      10000,
                      20000,
                    ]
                      .filter((val, idx, arr) => val >= collectModalOrder.price && arr.indexOf(val) === idx)
                      .map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setCashGiven(String(val))}
                          className="px-2 py-0.5 bg-zinc-850 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 rounded text-[10px] font-mono"
                        >
                          {formatCLP(val)}
                        </button>
                      ))}
                  </div>
                  {cashGiven && parseFloat(cashGiven) >= collectModalOrder.price && (
                    <div className="flex justify-between items-center pt-2 border-t border-zinc-800 text-xs font-bold">
                      <span className="text-zinc-300">Vuelto a entregar:</span>
                      <span className="font-mono text-emerald-400 text-sm">
                        {formatCLP(parseFloat(cashGiven) - collectModalOrder.price)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Card Terminal Settings */}
              {(payMethod === 'tarjeta_debito' || payMethod === 'tarjeta_credito') && (
                <div className="bg-zinc-950/60 border border-indigo-500/30 rounded-xl p-3 space-y-3 text-xs">
                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1.5">
                      Terminal POS Utilizado:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPosProvider('tuu')}
                        className={`p-2 rounded-lg border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                          posProvider === 'tuu'
                            ? 'bg-cyan-600/30 border-cyan-500 text-cyan-300'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-cyan-400" />
                        POS TUU (Redelcom)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPosProvider('mercadopago')}
                        className={`p-2 rounded-lg border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                          posProvider === 'mercadopago'
                            ? 'bg-sky-600/30 border-sky-500 text-sky-300'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-sky-400" />
                        MERCADO PAGO
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">
                      Código de Autorización / N° Operación Voucher (Opcional):
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: 489210"
                      value={authorizationCode}
                      onChange={(e) => setAuthorizationCode(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}

              {/* Transfer voucher */}
              {payMethod === 'transferencia' && (
                <div>
                  <label className="block text-zinc-300 font-medium mb-1 text-xs">
                    N° de Comprobante de Transferencia:
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: TRF-98234"
                    value={transferVoucherNumber}
                    onChange={(e) => setTransferVoucherNumber(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-750 rounded-lg px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              {/* SII Electronic Invoice / Boleta */}
              <div>
                <label className="block text-zinc-300 font-medium mb-1 text-xs">
                  N° Boleta Electrónica SII (Opcional):
                </label>
                <input
                  type="text"
                  placeholder="Ej: 14205"
                  value={siiBoletaNumber}
                  onChange={(e) => setSiiBoletaNumber(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-750 rounded-lg px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setCollectModalOrder(null)}
                  className="px-3.5 py-2 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 rounded-lg border border-zinc-750 transition text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold shadow-lg shadow-emerald-950 transition border border-emerald-400/40 text-xs flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Confirmar Cobro e Ingresar a Caja Diaria
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ASIGNAR PUESTO (IF VEHICLE DECIDED TO STAY PARKED) */}
      {assignSpotOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#12141D] border border-zinc-750 rounded-2xl max-w-md w-full p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🅿️</span>
                <div>
                  <h3 className="font-bold text-base text-zinc-100">
                    Asignar Puesto de Estacionamiento
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Patente: <strong className="text-white font-mono">{assignSpotOrder.plate}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAssignSpotOrder(null)}
                className="text-zinc-500 hover:text-white text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Al asignar un puesto, el vehículo continuará acumulando tiempo de estacionamiento. El monto del lavado se sumará al total del parking y se cobrará en una única boleta/salida.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!assignSpotOrder || !targetSpotNumber) return;
                assignWashOrderToSpot(assignSpotOrder.id, Number(targetSpotNumber));
                setActionNotification(
                  `Lavado de patente ${assignSpotOrder.plate} asignado al Puesto #${targetSpotNumber}. El lavado y parking se cobrarán juntos al salir.`
                );
                setAssignSpotOrder(null);
                setTargetSpotNumber('');
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block text-zinc-300 font-semibold mb-1.5">
                  Seleccionar Puesto Disponible *
                </label>
                <select
                  value={targetSpotNumber}
                  onChange={(e) => setTargetSpotNumber(e.target.value)}
                  className="w-full bg-zinc-900 border border-indigo-600/50 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-400 text-xs"
                  required
                >
                  <option value="">Seleccione un puesto...</option>
                  {spots.map((s) => (
                    <option key={s.number} value={s.number}>
                      Puesto #{s.number} ({s.status === 'occupied' ? `Ocupado: ${s.currentSession?.plate}` : 'Disponible'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setAssignSpotOrder(null)}
                  className="px-3.5 py-1.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 rounded-lg border border-zinc-750 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!targetSpotNumber}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg font-bold shadow transition border border-indigo-400/40"
                >
                  Asignar y Unificar Cobro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: WASH INSPECTION / DAMAGE REGISTRATION */}
      {inspectionModalOrder && (
        <WashInspectionModal
          plate={inspectionModalOrder.plate}
          orderId={inspectionModalOrder.id}
          clientName={inspectionModalOrder.clientName}
          initialSheet={inspectionModalOrder.inspectionSheet}
          currentInspectorName={currentUser?.name || inspectionModalOrder.washerName || 'Inspector Lavado'}
          onSave={(sheet) => {
            updateWashInspectionSheet(inspectionModalOrder.id, sheet);
            setInspectionModalOrder(null);
            setActionNotification(`✓ Ficha de daños y fotos guardada exitosamente para vehículo patente ${sheet.plate}.`);
          }}
          onClose={() => setInspectionModalOrder(null)}
        />
      )}

      {/* MODAL: WASH INSPECTION FOR NEW ORDER BEFORE CREATION */}
      {isCreatingInspectionForNewOrder && (
        <WashInspectionModal
          plate={plate.trim().toUpperCase() || 'VEHICULO'}
          initialSheet={newOrderInspectionSheet || undefined}
          currentInspectorName={currentUser?.name || washerName || 'Inspector Lavado'}
          onSave={(sheet) => {
            setNewOrderInspectionSheet(sheet);
            setIsCreatingInspectionForNewOrder(false);
            setActionNotification(`✓ Ficha pre-lavado completada para ${sheet.plate}. Se adjuntará a la nueva orden.`);
          }}
          onClose={() => setIsCreatingInspectionForNewOrder(false)}
        />
      )}
    </div>
  );
};
