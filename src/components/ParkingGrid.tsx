import React, { useState } from 'react';
import {
  Car,
  QrCode,
  LogOut,
  Sparkles,
  ShoppingBag,
  Clock,
  Star,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Plus,
  TrendingDown,
  Key,
  Trash2,
  Shield,
  ShieldAlert,
  X,
  AlertTriangle,
  Edit3,
} from 'lucide-react';
import { useParking } from '../context/ParkingContext';
import { calculateParkingFee, calculateVacancyLoss, formatCLP, formatTimeOnly } from '../utils/pricing';
import { ParkingSpot } from '../types';

interface ParkingGridProps {
  onCheckIn: (spotNumber: number) => void;
  onCheckOut: (spotNumber: number) => void;
  onOpenQR: (spotNumber: number) => void;
  onEditSpot?: (spotNumber: number) => void;
  onAddWash: (spotNumber: number) => void;
  onAddAccessory: (spotNumber: number) => void;
  onOpenUniversalQR?: () => void;
  onOpenCustomerPortal?: () => void;
}

export const ParkingGrid: React.FC<ParkingGridProps> = ({
  onCheckIn,
  onCheckOut,
  onOpenQR,
  onEditSpot,
  onAddWash,
  onAddAccessory,
  onOpenUniversalQR,
  onOpenCustomerPortal,
}) => {
  const { spots, currentTime, settings, cancelActiveSpotSession, currentUser, users } = useParking();
  const [spotToCancel, setSpotToCancel] = useState<number | null>(null);
  const [adminPinInput, setAdminPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const selectedSpot = spotToCancel ? spots.find((s) => s.number === spotToCancel) : null;
  const activeSession = selectedSpot?.currentSession;
  const isAdmin = currentUser?.role === 'admin';

  const handleConfirmCancellation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!spotToCancel) return;

    if (!isAdmin) {
      if (!adminPinInput || adminPinInput.length !== 8) {
        setPinError('Debes ingresar el PIN de 8 dígitos de Administrador.');
        return;
      }
      const adminUser = users.find((u) => u.role === 'admin' && u.pin === adminPinInput);
      if (!adminUser) {
        setPinError('PIN de Administrador incorrecto. Acción denegada.');
        return;
      }
    }

    const result = cancelActiveSpotSession(spotToCancel, adminPinInput);
    if (result.success) {
      setFeedbackMessage({ type: 'success', text: result.message });
      setSpotToCancel(null);
      setAdminPinInput('');
      setPinError('');
      setTimeout(() => setFeedbackMessage(null), 5000);
    } else {
      setPinError(result.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Success Notification Alert */}
      {feedbackMessage && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs shadow-lg transition-all animate-fadeIn ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
              : 'bg-rose-950/80 border-rose-500/50 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-semibold">{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800/60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Overview Banner & Pricing Formula Bar */}
      <div className="bg-[#0E1017] border border-zinc-800/80 rounded-2xl p-5 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-indigo-950/60 text-indigo-300 text-xs px-2.5 py-1 rounded-full font-semibold border border-indigo-500/30">
                Puestos 1 al 10 en Vivo
              </span>
              <span className="text-xs text-zinc-400">Control Operativo</span>
            </div>
            <h2 className="text-xl font-bold text-zinc-100 mt-1 tracking-tight">
              Plano de Estacionamiento & Estado en Tiempo Real
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Haz clic en cualquier puesto para registrar entrada, consultar QR del cliente, editar datos o procesar cobro y salida.
            </p>
          </div>

          {/* Pricing Rule Card */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 text-xs max-w-md">
            <div className="font-semibold text-amber-300 flex items-center gap-1.5 mb-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              Regla de Cobro por Tramos:
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-300">
              <div className="bg-zinc-950/80 p-1.5 rounded border border-zinc-800">
                <span className="text-zinc-400 block text-[10px]">1er Tramo Fijo</span>
                <span className="font-bold text-emerald-400 font-mono">0 - 30 min = ${settings.base30MinPrice}</span>
              </div>
              <div className="bg-zinc-950/80 p-1.5 rounded border border-zinc-800">
                <span className="text-zinc-400 block text-[10px]">Tramos Siguientes</span>
                <span className="font-bold text-cyan-400 font-mono">+10 min = ${settings.extra10MinPrice} c/u</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Universal QR Code & Customer Portal Notification Banner */}
      <div className="bg-gradient-to-r from-purple-950/30 via-indigo-950/30 to-zinc-900/80 border border-purple-800/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-600/30 border border-purple-500/40 text-purple-300 flex items-center justify-center flex-shrink-0 shadow-inner">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-zinc-100">
                Tótem & Código QR Único del Estacionamiento
              </span>
              <span className="bg-purple-950 text-purple-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-700/60 uppercase">
                Para Clientes
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Los clientes escanean este único código QR e ingresan su patente para ver su puesto, hora de ingreso y tiempo en vivo.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {onOpenUniversalQR && (
            <button
              onClick={onOpenUniversalQR}
              className="flex-1 sm:flex-initial px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/30 transition flex items-center justify-center gap-1.5 whitespace-nowrap border border-indigo-400/30"
            >
              <QrCode className="w-4 h-4" />
              Ver / Imprimir Afiche QR
            </button>
          )}

          {onOpenCustomerPortal && (
            <button
              onClick={onOpenCustomerPortal}
              className="flex-1 sm:flex-initial px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded-xl text-xs font-semibold border border-zinc-700 transition flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <span>Abrir Portal</span>
            </button>
          )}
        </div>
      </div>

      {/* 10 Parking Spots Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {spots.map((spot) => (
          <SpotCard
            key={spot.number}
            spot={spot}
            currentTime={currentTime}
            basePrice={settings.base30MinPrice}
            extraPrice={settings.extra10MinPrice}
            onCheckIn={onCheckIn}
            onCheckOut={onCheckOut}
            onOpenQR={onOpenQR}
            onEditSpot={onEditSpot}
            onAddWash={onAddWash}
            onAddAccessory={onAddAccessory}
            onRequestCancelEntry={(spotNum) => {
              setSpotToCancel(spotNum);
              setAdminPinInput('');
              setPinError('');
            }}
          />
        ))}
      </div>

      {/* Admin Cancel / Delete Entry Modal */}
      {spotToCancel && selectedSpot && activeSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#11131C] border border-rose-900/60 rounded-2xl max-w-md w-full p-6 text-zinc-100 shadow-2xl space-y-5 animate-scaleUp">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-zinc-800/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-950/80 border border-rose-700/60 text-rose-400 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Anular Ingreso de Vehículo
                  </h3>
                  <span className="text-xs text-rose-300 font-medium">
                    Puesto #{spotToCancel} • Privilegio de Administrador
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSpotToCancel(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Vehicle Summary Box */}
            <div className="bg-zinc-950/90 border border-zinc-800 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Patente:</span>
                <span className="font-mono font-bold text-sm bg-zinc-900 px-2 py-0.5 rounded border border-zinc-700 text-white">
                  {activeSession.plate}
                </span>
              </div>
              <div className="flex items-center justify-between text-zinc-300">
                <span className="text-zinc-400">Vehículo:</span>
                <span className="font-medium">
                  {activeSession.brand} {activeSession.model} ({activeSession.color})
                </span>
              </div>
              <div className="flex items-center justify-between text-zinc-300">
                <span className="text-zinc-400">Hora Ingreso:</span>
                <span className="font-mono text-zinc-200">
                  {formatTimeOnly(activeSession.entryTime)}
                </span>
              </div>
              {activeSession.clientName && (
                <div className="flex items-center justify-between text-zinc-300">
                  <span className="text-zinc-400">Cliente:</span>
                  <span>{activeSession.clientName}</span>
                </div>
              )}
            </div>

            {/* Reason explanation */}
            <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl p-3 text-[11px] text-amber-200/90 flex gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold block text-amber-300">
                  Motivo: Cliente se retira sin estacionarse
                </span>
                <p className="text-zinc-300 text-[11px] leading-relaxed">
                  Esta acción anulará el registro y liberará el puesto <strong>#{spotToCancel}</strong> inmediatamente a estado <em>Disponible</em> sin generar costo, ticket de cobro ni ingreso en caja diaria.
                </p>
              </div>
            </div>

            {/* Admin Authentication Form */}
            <form onSubmit={handleConfirmCancellation} className="space-y-4">
              {isAdmin ? (
                <div className="bg-emerald-950/40 border border-emerald-700/50 rounded-xl p-3 text-xs flex items-center gap-2.5 text-emerald-300">
                  <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-semibold block">Administrador Autenticado</span>
                    <span className="text-[11px] text-zinc-300">
                      Sesión activa de {currentUser?.name}. Tienes autorización directa.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    Ingresa PIN de Administrador (8 dígitos):
                  </label>
                  <input
                    type="password"
                    maxLength={8}
                    pattern="[0-9]{8}"
                    autoFocus
                    placeholder="Ej: 12345678"
                    value={adminPinInput}
                    onChange={(e) => {
                      setAdminPinInput(e.target.value.replace(/\D/g, ''));
                      setPinError('');
                    }}
                    className="w-full bg-zinc-950 border border-zinc-700 focus:border-rose-500 rounded-xl px-4 py-2.5 text-sm font-mono tracking-widest text-center text-white outline-none"
                    required
                  />
                  <span className="text-[10px] text-zinc-400 block">
                    Por seguridad, solo un usuario con rol de Administrador puede autorizar la anulación de registros.
                  </span>
                </div>
              )}

              {pinError && (
                <div className="p-2.5 rounded-lg bg-rose-950/80 border border-rose-700 text-rose-300 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{pinError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSpotToCancel(null)}
                  className="flex-1 py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl text-xs font-semibold border border-zinc-700 transition"
                >
                  Cancelar / Volver
                </button>
                <button
                  id="btn-confirm-delete-entry"
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-600/30 transition flex items-center justify-center gap-1.5 border border-rose-400/30"
                >
                  <Trash2 className="w-4 h-4" />
                  Confirmar Anulación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

interface SpotCardProps {
  spot: ParkingSpot;
  currentTime: Date;
  basePrice: number;
  extraPrice: number;
  onCheckIn: (spotNumber: number) => void;
  onCheckOut: (spotNumber: number) => void;
  onOpenQR: (spotNumber: number) => void;
  onEditSpot?: (spotNumber: number) => void;
  onAddWash: (spotNumber: number) => void;
  onAddAccessory: (spotNumber: number) => void;
  onRequestCancelEntry: (spotNumber: number) => void;
}

const SpotCard: React.FC<SpotCardProps> = ({
  spot,
  currentTime,
  basePrice,
  extraPrice,
  onCheckIn,
  onCheckOut,
  onOpenQR,
  onEditSpot,
  onAddWash,
  onAddAccessory,
  onRequestCancelEntry,
}) => {
  const { toggleSpotValetParking, settings, currentUser } = useParking();
  const isOccupied = spot.status === 'occupied' && spot.currentSession;
  const isReserved = spot.status === 'reserved_monthly' && spot.monthlyContract;
  const isAvailable = spot.status === 'available';

  // Live calculation if occupied
  const session = spot.currentSession;
  const pricing = session
    ? calculateParkingFee(session.entryTime, currentTime, undefined, basePrice, extraPrice)
    : null;

  const washOrders = session?.washOrders || [];
  const washTotal = washOrders.reduce((sum, w) => sum + w.price, 0);
  const accTotal = (session?.accessorySales || []).reduce((sum, a) => sum + a.total, 0);
  const valetTotal = session?.hasValetParking ? (session.valetParkingFee || settings.valetParkingPrice || 2000) : 0;
  const grandTotal = (pricing?.totalParkingCost || 0) + washTotal + accTotal + valetTotal;

  // Vacancy lost revenue for empty spots
  const vacancyLoss = isAvailable
    ? calculateVacancyLoss(spot.accumulatedEmptyMinutesToday || 0)
    : 0;

  return (
    <div
      id={`spot-card-${spot.number}`}
      className={`rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-lg ${
        isOccupied
          ? 'bg-[#120F14] border-rose-900/60 ring-1 ring-rose-500/20'
          : isReserved
          ? 'bg-[#110F18] border-purple-900/60 ring-1 ring-purple-500/20'
          : 'bg-[#0E1016] border-zinc-800 hover:border-indigo-500/50 hover:bg-[#11131A]'
      }`}
    >
      {/* Card Header: Spot Number, Delete Action & Status */}
      <div
        className={`px-4 py-2.5 border-b flex items-center justify-between ${
          isOccupied
            ? 'bg-rose-950/40 border-rose-900/50 text-rose-200'
            : isReserved
            ? 'bg-purple-950/40 border-purple-900/50 text-purple-200'
            : 'bg-zinc-900/90 border-zinc-800/90 text-zinc-200'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-base tracking-tight font-mono">
            Puesto #{spot.number}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Admin Delete / Cancel Entry Button */}
          {isOccupied && (
            <button
              id={`btn-cancel-entry-${spot.number}`}
              onClick={(e) => {
                e.stopPropagation();
                onRequestCancelEntry(spot.number);
              }}
              className="p-1 rounded-md bg-rose-950/70 hover:bg-rose-900/90 text-rose-300 hover:text-white border border-rose-700/60 transition-all hover:scale-105 shadow-sm"
              title="Eliminar / Anular ingreso sin cobro (Cliente se fue sin estacionar - Privilegio Admin)"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Status Pill */}
          {isOccupied && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-950 text-rose-300 border border-rose-700/60">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping"></span>
              Ocupado
            </span>
          )}
          {isReserved && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-950 text-purple-300 border border-purple-700/60">
              <Calendar className="w-3 h-3 text-purple-300" />
              Arriendo
            </span>
          )}
          {isAvailable && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Disponible
            </span>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 flex-1 flex flex-col justify-between text-xs space-y-3">
        {/* CASE 1: OCCUPIED SPOT */}
        {isOccupied && session && pricing && (
          <div className="space-y-2.5">
            {/* Vehicle Plate Badge */}
            <div className="flex items-center justify-between gap-1 flex-wrap">
              <div className="bg-zinc-900 border-2 border-zinc-700 px-2.5 py-1 rounded-md text-white font-mono font-bold tracking-wider text-sm flex items-center gap-1.5 shadow-inner">
                <span className="text-[10px] text-zinc-500 font-sans">CL</span>
                <span>{session.plate}</span>
              </div>

              <div className="flex items-center gap-1">
                {session.hasValetParking && (
                  <span
                    className="bg-amber-950/90 text-amber-300 border border-amber-500/50 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-sm"
                    title={`Valet Parking Activo - ${session.valetDriver || 'En caseta'}`}
                  >
                    <Key className="w-3 h-3 text-amber-400" />
                    Valet
                  </span>
                )}

                {session.isFrequent && (
                  <span
                    className="bg-amber-950/80 text-amber-300 border border-amber-600/50 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-sm"
                    title="Cliente Frecuente (múltiples visitas registradas)"
                  >
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    Frecuente
                  </span>
                )}
              </div>
            </div>

            {/* Vehicle Model & Color */}
            <div className="text-zinc-300 text-[11px] leading-tight">
              <div className="font-semibold text-zinc-100 truncate">
                {session.brand} {session.model} {session.year ? `(${session.year})` : ''}
              </div>
              <div className="text-zinc-400 truncate flex items-center gap-1">
                <span>Color: {session.color}</span>
                {session.clientName && (
                  <>
                    <span>•</span>
                    <span className="text-zinc-300 font-medium truncate">
                      {session.clientName}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Live Timer & Tier Calculation Box */}
            <div className="bg-[#090A0F]/90 border border-zinc-800 rounded-xl p-2.5 space-y-1.5">
              <div className="flex items-center justify-between text-zinc-300">
                <span className="text-zinc-400 flex items-center gap-1 text-[11px]">
                  <Clock className="w-3 h-3 text-cyan-400" />
                  Tiempo:
                </span>
                <span className="font-mono font-bold text-cyan-300 text-xs">
                  {pricing.formattedDuration} ({pricing.elapsedMinutes} min)
                </span>
              </div>

              {/* Tramo breakdown */}
              <div className="text-[10px] text-zinc-400 border-t border-zinc-800/80 pt-1.5 space-y-0.5">
                <div className="flex justify-between">
                  <span>Tramo Base (30m):</span>
                  <span className="text-zinc-200 font-medium font-mono">${basePrice}</span>
                </div>
                {pricing.extraTiersCount > 0 ? (
                  <div className="flex justify-between text-cyan-300">
                    <span>
                      {pricing.extraTiersCount} tramo(s) extra (10m):
                    </span>
                    <span className="font-semibold font-mono">+{formatCLP(pricing.extraTierCost)}</span>
                  </div>
                ) : (
                  <div className="text-emerald-400 text-[9px]">
                    ✓ Dentro del tramo inicial fijo
                  </div>
                )}
              </div>

              {/* Services Badges if any */}
              {washOrders.length > 0 && (
                <div className="border-t border-zinc-800/80 pt-1 flex items-center justify-between text-[10px] text-purple-300">
                  <span className="flex items-center gap-1 truncate">
                    <Sparkles className="w-3 h-3 text-purple-400" />
                    Lavado ({washOrders[0].status === 'ready' ? 'Listo' : 'En proceso'}):
                  </span>
                  <span className="font-semibold font-mono text-purple-200">
                    {formatCLP(washTotal)}
                  </span>
                </div>
              )}

              {accTotal > 0 && (
                <div className="border-t border-zinc-800/80 pt-1 flex items-center justify-between text-[10px] text-amber-300">
                  <span className="flex items-center gap-1">
                    <ShoppingBag className="w-3 h-3 text-amber-400" />
                    Accesorios:
                  </span>
                  <span className="font-semibold font-mono text-amber-200">
                    {formatCLP(accTotal)}
                  </span>
                </div>
              )}

              {session.hasValetParking && (
                <div className="border-t border-zinc-800/80 pt-1 flex items-center justify-between text-[10px] text-amber-300">
                  <span className="flex items-center gap-1 truncate">
                    <Key className="w-3 h-3 text-amber-400 shrink-0" />
                    Valet Parking{session.valetDriver ? ` (${session.valetDriver})` : ''}:
                  </span>
                  <span className="font-semibold font-mono text-amber-200 shrink-0">
                    {formatCLP(session.valetParkingFee || settings.valetParkingPrice || 2000)}
                  </span>
                </div>
              )}

              {/* Total live accumulation */}
              <div className="border-t border-zinc-800 pt-1.5 flex items-center justify-between">
                <span className="text-[11px] font-medium text-zinc-300">
                  Total Acumulado:
                </span>
                <span className="text-sm font-extrabold text-emerald-400 font-mono">
                  {formatCLP(grandTotal)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* CASE 2: RESERVED MONTHLY LEASE */}
        {isReserved && spot.monthlyContract && (
          <div className="space-y-2">
            <div className="bg-zinc-900 border-2 border-purple-700/60 px-2 py-1 rounded-md text-purple-200 font-mono font-bold tracking-wider text-xs flex items-center justify-between shadow-inner">
              <span>{spot.monthlyContract.plate}</span>
              <span className="text-[10px] font-sans uppercase bg-purple-950 px-1 rounded text-purple-300">
                {spot.monthlyContract.type.replace('_', ' ')}
              </span>
            </div>

            <div className="text-zinc-300 text-[11px] space-y-1">
              <div className="font-semibold text-zinc-100 truncate">
                {spot.monthlyContract.brand} {spot.monthlyContract.model}
              </div>
              <div className="text-zinc-400 text-[10px] truncate">
                Titular: <span className="text-zinc-200">{spot.monthlyContract.clientName}</span>
              </div>
              <div className="text-zinc-400 text-[10px]">
                RUT: {spot.monthlyContract.clientRut}
              </div>
            </div>

            <div className="bg-purple-950/40 border border-purple-900/60 rounded-lg p-2 text-[10px] text-purple-300">
              <div className="flex justify-between">
                <span>Abono Mensual:</span>
                <span className="font-bold text-purple-200 font-mono">
                  {formatCLP(spot.monthlyContract.monthlyFee)}/mes
                </span>
              </div>
              <div className="text-zinc-400 text-[9px] mt-0.5">
                Vence: {spot.monthlyContract.endDate}
              </div>
            </div>
          </div>
        )}

        {/* CASE 3: AVAILABLE SPOT */}
        {isAvailable && (
          <div className="py-3 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center text-emerald-400 shadow-inner">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-zinc-200 block">
                Puesto Libre
              </span>
              <span className="text-[10px] text-zinc-400">
                Listo para ingreso inmediato
              </span>
            </div>

            {/* Vacancy lost opportunity meter */}
            {spot.accumulatedEmptyMinutesToday > 0 && (
              <div className="bg-[#090A0F]/90 border border-zinc-800 rounded-lg p-2 w-full text-[10px] text-zinc-400 space-y-0.5">
                <div className="flex items-center justify-between text-rose-300">
                  <span className="flex items-center gap-1">
                    <TrendingDown className="w-3 h-3 text-rose-400" />
                    Vacío hoy:
                  </span>
                  <span className="font-mono font-medium">
                    {Math.floor(spot.accumulatedEmptyMinutesToday / 60)}h{' '}
                    {spot.accumulatedEmptyMinutesToday % 60}m
                  </span>
                </div>
                <div className="flex justify-between text-[9px] text-zinc-400">
                  <span>Pérdida por vacancia:</span>
                  <span className="font-bold text-rose-400 font-mono">
                    -{formatCLP(vacancyLoss)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Card Actions Footer */}
        <div className="pt-2 border-t border-zinc-800 space-y-1.5">
          {isOccupied && (
            <>
              <div className="grid grid-cols-3 gap-1">
                <button
                  id={`btn-qr-${spot.number}`}
                  onClick={() => onOpenQR(spot.number)}
                  className="flex items-center justify-center gap-1 bg-zinc-900 hover:bg-zinc-800 text-cyan-300 hover:text-cyan-200 border border-zinc-800 py-1.5 rounded-lg text-[10px] font-medium transition"
                  title="Ver código QR para el cliente y pantalla en vivo"
                >
                  <QrCode className="w-3.5 h-3.5 text-cyan-400" />
                  QR
                </button>

                {onEditSpot && (
                  <button
                    id={`btn-edit-spot-${spot.number}`}
                    onClick={() => onEditSpot(spot.number)}
                    className="flex items-center justify-center gap-1 bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 hover:text-amber-200 border border-amber-800/60 py-1.5 rounded-lg text-[10px] font-medium transition"
                    title="Editar datos de ingreso, patente o cambiar puesto"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                    Editar
                  </button>
                )}

                <button
                  id={`btn-checkout-${spot.number}`}
                  onClick={() => onCheckOut(spot.number)}
                  className="flex items-center justify-center gap-1 bg-rose-600 hover:bg-rose-500 text-white py-1.5 rounded-lg text-[10px] font-semibold shadow transition active:scale-95 border border-rose-400/30"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Cobrar
                </button>
              </div>

              {/* Extra service adders */}
              <div className="grid grid-cols-3 gap-1">
                <button
                  id={`btn-add-wash-${spot.number}`}
                  onClick={() => onAddWash(spot.number)}
                  className="flex items-center justify-center gap-1 bg-purple-950/50 hover:bg-purple-900/70 text-purple-300 border border-purple-800/60 py-1 rounded text-[10px] transition"
                  title="Añadir orden de lavado a este vehículo"
                >
                  <Sparkles className="w-3 h-3 text-purple-400" />
                  + Lavado
                </button>

                <button
                  id={`btn-add-acc-${spot.number}`}
                  onClick={() => onAddAccessory(spot.number)}
                  className="flex items-center justify-center gap-1 bg-amber-950/50 hover:bg-amber-900/70 text-amber-300 border border-amber-800/60 py-1 rounded text-[10px] transition"
                  title="Añadir accesorio comprado a la cuenta"
                >
                  <ShoppingBag className="w-3 h-3 text-amber-400" />
                  + Acceso.
                </button>

                <button
                  id={`btn-toggle-valet-${spot.number}`}
                  onClick={() => toggleSpotValetParking(spot.number)}
                  className={`flex items-center justify-center gap-1 border py-1 rounded text-[10px] font-medium transition ${
                    session.hasValetParking
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30'
                      : 'bg-zinc-900/90 text-zinc-400 border-zinc-800 hover:text-amber-300 hover:border-amber-500/40'
                  }`}
                  title={
                    session.hasValetParking
                      ? 'Desactivar servicio Valet Parking de este vehículo'
                      : `Activar cobro Valet Parking (+${formatCLP(settings.valetParkingPrice || 2000)})`
                  }
                >
                  <Key className="w-3 h-3 text-amber-400" />
                  {session.hasValetParking ? 'Valet ✓' : '+ Valet'}
                </button>
              </div>
            </>
          )}

          {isReserved && (
            <div className="flex gap-1.5">
              <button
                id={`btn-manage-contract-${spot.number}`}
                onClick={() => onCheckIn(spot.number)}
                className="w-full flex items-center justify-center gap-1 bg-purple-950/70 hover:bg-purple-900/80 text-purple-200 border border-purple-700/60 py-1.5 rounded-lg text-[11px] font-medium transition"
              >
                <Calendar className="w-3.5 h-3.5 text-purple-300" />
                Registrar Entrada Abono
              </button>
            </div>
          )}

          {isAvailable && (
            <button
              id={`btn-checkin-${spot.number}`}
              onClick={() => onCheckIn(spot.number)}
              className="w-full flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg text-xs font-semibold shadow-md shadow-indigo-600/20 transition active:scale-95 border border-indigo-400/30"
            >
              <Plus className="w-4 h-4" />
              Ingresar Vehículo
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

