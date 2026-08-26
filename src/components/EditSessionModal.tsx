import React, { useState, useEffect } from 'react';
import {
  X,
  Car,
  Edit3,
  Clock,
  Crown,
  Key,
  User,
  ShieldAlert,
  Check,
  ArrowRightLeft,
  Trash2,
  Sparkles,
  ShoppingBag,
} from 'lucide-react';
import { useParking } from '../context/ParkingContext';
import { ParkingSpot, ParkingSession, VEHICLE_TYPES, VehicleType } from '../types';
import { formatCLP } from '../utils/pricing';

interface EditSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  spot: ParkingSpot | null;
  onSuccess?: () => void;
}

export const EditSessionModal: React.FC<EditSessionModalProps> = ({
  isOpen,
  onClose,
  spot,
  onSuccess,
}) => {
  const {
    spots,
    updateActiveSpotSession,
    settings,
    getVehicleByPlate,
    removeWashOrder,
    removeAccessoryItemFromSpot,
  } = useParking();

  const [targetSpotNumber, setTargetSpotNumber] = useState<number>(spot?.number ?? 1);
  const [plate, setPlate] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [year, setYear] = useState<string>('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('sedan');

  // Manual Entry Time
  const [isManualEntryTime, setIsManualEntryTime] = useState(false);
  const [entryDateString, setEntryDateString] = useState('');

  // Client Details
  const [clientName, setClientName] = useState('');
  const [clientRut, setClientRut] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');

  // VIP & Valet
  const [isVIP, setIsVIP] = useState(false);
  const [hasValetParking, setHasValetParking] = useState(false);
  const [valetFee, setValetFee] = useState<string>('2000');
  const [valetDriver, setValetDriver] = useState('');
  const [notes, setNotes] = useState('');

  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (spot && spot.currentSession) {
      const sess = spot.currentSession;
      setTargetSpotNumber(spot.number);
      setPlate(sess.plate || '');
      setBrand(sess.brand || '');
      setModel(sess.model || '');
      setColor(sess.color || '');
      setYear(sess.year ? String(sess.year) : '');
      setClientName(sess.clientName || '');
      setClientRut(sess.clientRut || '');
      setClientPhone(sess.clientPhone || '');
      setClientEmail(sess.clientEmail || '');
      setNotes(sess.notes || '');

      setIsManualEntryTime(!!sess.isManualEntryTime);
      if (sess.entryTime) {
        const d = new Date(sess.entryTime);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        setEntryDateString(d.toISOString().slice(0, 16));
      }

      const vehicle = getVehicleByPlate(sess.plate);
      setIsVIP(!!vehicle?.isVIP);
      if (sess.vehicleType) {
        setVehicleType(sess.vehicleType);
      } else if (vehicle?.vehicleType) {
        setVehicleType(vehicle.vehicleType);
      }

      setHasValetParking(!!sess.hasValetParking);
      setValetFee(String(sess.valetParkingFee ?? settings.valetParkingPrice ?? 2000));
      setValetDriver(sess.valetDriver || '');
      setErrorMsg('');
    }
  }, [spot, isOpen]);

  if (!isOpen || !spot || !spot.currentSession) return null;

  const currentSession = spot.currentSession;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!plate.trim()) return;

    let finalEntryIso: string | undefined = undefined;
    if (entryDateString) {
      finalEntryIso = new Date(entryDateString).toISOString();
    }

    const result = updateActiveSpotSession(spot.number, {
      targetSpotNumber,
      plate: plate.trim().toUpperCase(),
      brand: brand.trim() || 'Desconocida',
      model: model.trim() || 'Desconocido',
      color: color.trim() || 'Desconocido',
      year: year ? parseInt(year, 10) : undefined,
      vehicleType,
      clientName: clientName.trim() || undefined,
      clientRut: clientRut.trim() || undefined,
      clientPhone: clientPhone.trim() || undefined,
      clientEmail: clientEmail.trim() || undefined,
      entryTime: finalEntryIso,
      isManualEntryTime,
      isVIP,
      hasValetParking,
      valetParkingFee: hasValetParking ? (parseFloat(valetFee) || 2000) : 0,
      valetDriver: valetDriver.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    if (result.success) {
      if (onSuccess) onSuccess();
      onClose();
    } else {
      setErrorMsg(result.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#0F1117] border border-zinc-800 rounded-2xl w-full max-w-xl text-white shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="bg-[#13151F] px-6 py-4 border-b border-zinc-800/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-zinc-100 tracking-tight">
                Editar Datos de Ingreso / Puesto #{spot.number}
              </h3>
              <p className="text-xs text-zinc-400">
                Ticket: <strong className="text-indigo-400 font-mono">{currentSession.ticketNumber}</strong> | Modificar puesto, patente u hora de entrada
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="m-4 bg-rose-950/80 border border-rose-600 rounded-xl p-3 flex items-center gap-2 text-rose-200 text-xs">
            <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Spot Transfer & Plate */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Reassign Spot */}
            <div>
              <label className="block text-zinc-300 font-medium mb-1 flex items-center gap-1">
                <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-400" />
                Puesto Asignado:
              </label>
              <select
                id="select-edit-spot"
                value={targetSpotNumber}
                onChange={(e) => setTargetSpotNumber(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2 text-white font-bold focus:outline-none focus:border-indigo-500"
              >
                {spots.map((s) => (
                  <option
                    key={s.number}
                    value={s.number}
                    disabled={s.status === 'occupied' && s.number !== spot.number}
                  >
                    Puesto #{s.number} {s.number === spot.number ? '(Actual)' : s.status === 'occupied' ? '(Ocupado)' : '(Disponible)'}
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
                id="input-edit-plate"
                type="text"
                value={plate}
                onChange={(e) => setPlate(e.target.value.toUpperCase())}
                className="w-full bg-zinc-900 border-2 border-indigo-500/80 rounded-lg px-3 py-2 text-white uppercase font-mono font-bold tracking-wider focus:outline-none focus:border-indigo-400"
                required
              />
            </div>
          </div>

          {/* Manual Entry Time Modifier */}
          <div className="bg-zinc-900/90 border border-zinc-750 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="checkbox-edit-manual-time" className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  id="checkbox-edit-manual-time"
                  type="checkbox"
                  checked={isManualEntryTime}
                  onChange={(e) => setIsManualEntryTime(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-indigo-500 focus:ring-indigo-500/30 accent-indigo-500 cursor-pointer"
                />
                <span className="font-semibold text-xs text-zinc-200 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  Modificar Hora de Entrada Registrada
                </span>
              </label>
            </div>

            <div className="pt-2 border-t border-zinc-800">
              <label className="block text-zinc-300 text-[11px] mb-1 font-medium">
                Fecha y Hora de Ingreso:
              </label>
              <input
                id="input-edit-entry-time"
                type="datetime-local"
                value={entryDateString}
                onChange={(e) => setEntryDateString(e.target.value)}
                className="w-full bg-[#0A0B10] border border-indigo-500/60 rounded-lg px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-indigo-400"
                required
              />
            </div>
          </div>

          {/* VIP Status */}
          <div className={`border rounded-xl p-3 flex items-center justify-between transition ${isVIP ? 'bg-amber-950/40 border-amber-500/60 text-amber-200' : 'bg-zinc-900/60 border-zinc-800 text-zinc-400'}`}>
            <label htmlFor="checkbox-edit-vip" className="flex items-center gap-2 cursor-pointer select-none w-full">
              <input
                id="checkbox-edit-vip"
                type="checkbox"
                checked={isVIP}
                onChange={(e) => setIsVIP(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-amber-500/30 accent-amber-500 cursor-pointer"
              />
              <div className="flex-1">
                <div className="font-bold text-xs flex items-center gap-1.5 text-amber-300">
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  Cliente VIP (Pago Acumulado / Cuenta Corriente)
                </div>
                <div className="text-[10px] text-zinc-400">
                  Permite cobros diferidos y acumulación de saldo
                </div>
              </div>
            </label>
          </div>

          {/* Vehicle Info */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5 space-y-3">
            <div className="font-semibold text-zinc-200 flex items-center justify-between border-b border-zinc-800 pb-1.5">
              <span className="flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-indigo-400" />
                Datos del Vehículo
              </span>
              <span className="text-[10px] text-zinc-400">
                Segmentación para servicios y lavados
              </span>
            </div>

            {/* Vehicle Type Selector */}
            <div>
              <label className="block text-zinc-300 font-semibold text-[11px] mb-1.5">
                Tipo de Vehículo *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5">
                {VEHICLE_TYPES.map((vt) => (
                  <button
                    key={vt.id}
                    type="button"
                    onClick={() => setVehicleType(vt.id)}
                    className={`p-2 rounded-xl border text-center transition flex flex-col items-center justify-center gap-0.5 ${
                      vehicleType === vt.id
                        ? 'bg-indigo-600/30 border-indigo-500 text-white font-bold shadow-md shadow-indigo-600/20'
                        : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                    }`}
                  >
                    <span className="text-[11px] font-semibold leading-tight">{vt.shortLabel}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="block text-zinc-400 text-[11px] mb-1">Marca</label>
                <input
                  id="input-edit-brand"
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full bg-[#0A0B10] border border-zinc-750 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 text-[11px] mb-1">Modelo</label>
                <input
                  id="input-edit-model"
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full bg-[#0A0B10] border border-zinc-750 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 text-[11px] mb-1">Color</label>
                <input
                  id="input-edit-color"
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-full bg-[#0A0B10] border border-zinc-750 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 text-[11px] mb-1">Año</label>
                <input
                  id="input-edit-year"
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full bg-[#0A0B10] border border-zinc-750 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Client Details */}
          <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-3.5 space-y-3">
            <div className="font-semibold text-zinc-300 flex items-center gap-1.5 border-b border-zinc-800 pb-1.5">
              <User className="w-3.5 h-3.5 text-zinc-400" />
              Datos del Conductor / Cliente
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-zinc-400 text-[11px] mb-1">Nombre Completo</label>
                <input
                  id="input-edit-client-name"
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full bg-[#0A0B10] border border-zinc-750 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 text-[11px] mb-1">RUT</label>
                <input
                  id="input-edit-client-rut"
                  type="text"
                  value={clientRut}
                  onChange={(e) => setClientRut(e.target.value)}
                  className="w-full bg-[#0A0B10] border border-zinc-750 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 text-[11px] mb-1">Teléfono Móvil</label>
                <input
                  id="input-edit-client-phone"
                  type="text"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className="w-full bg-[#0A0B10] border border-zinc-750 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 text-[11px] mb-1">Correo Electrónico</label>
                <input
                  id="input-edit-client-email"
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  className="w-full bg-[#0A0B10] border border-zinc-750 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Valet Parking Toggle */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5 space-y-2">
            <label htmlFor="checkbox-edit-valet" className="flex items-center gap-2 cursor-pointer select-none">
              <input
                id="checkbox-edit-valet"
                type="checkbox"
                checked={hasValetParking}
                onChange={(e) => setHasValetParking(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-amber-500/30 accent-amber-500 cursor-pointer"
              />
              <span className="font-bold text-xs text-amber-200 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                Servicio de Valet Parking
              </span>
            </label>

            {hasValetParking && (
              <div className="pt-2 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1">Tarifa Valet ($)</label>
                  <input
                    id="input-edit-valet-fee"
                    type="number"
                    value={valetFee}
                    onChange={(e) => setValetFee(e.target.value)}
                    className="w-full bg-[#0A0B10] border border-zinc-750 rounded-lg px-2.5 py-1.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1">Conductor Valet</label>
                  <input
                    id="input-edit-valet-driver"
                    type="text"
                    value={valetDriver}
                    onChange={(e) => setValetDriver(e.target.value)}
                    className="w-full bg-[#0A0B10] border border-zinc-750 rounded-lg px-2.5 py-1.5 text-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Wash Services and Accessories Attached to this Session */}
          {((currentSession.washOrders && currentSession.washOrders.length > 0) ||
            (currentSession.accessorySales && currentSession.accessorySales.length > 0)) && (
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <span className="font-bold text-xs text-zinc-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  Servicios y Productos Adicionales del Ticket
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">
                  Total Adicionales: {formatCLP(currentSession.totalServicesCost || 0)}
                </span>
              </div>

              {/* Wash orders */}
              {currentSession.washOrders && currentSession.washOrders.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-purple-300 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Lavados:
                  </span>
                  {currentSession.washOrders.map((w) => (
                    <div
                      key={w.id}
                      className="bg-[#0A0B10] border border-zinc-800 rounded-lg p-2 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-semibold text-zinc-200 block">{w.serviceName}</span>
                        <span className="text-[10px] text-zinc-400 font-mono">
                          {formatCLP(w.price)} • Estado: {w.status}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeWashOrder(w.id, spot.number)}
                        className="p-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/80 rounded-lg transition flex items-center gap-1 text-[10px] font-bold"
                        title="Eliminar este servicio del ticket"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        <span>Eliminar</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Accessories */}
              {currentSession.accessorySales && currentSession.accessorySales.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-amber-300 flex items-center gap-1">
                    <ShoppingBag className="w-3 h-3" /> Accesorios de Tienda:
                  </span>
                  {currentSession.accessorySales.map((a) => (
                    <div
                      key={a.productId}
                      className="bg-[#0A0B10] border border-zinc-800 rounded-lg p-2 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-semibold text-zinc-200 block">
                          {a.quantity}x {a.productName}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-mono">
                          {formatCLP(a.total)} ({formatCLP(a.unitPrice)} c/u)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAccessoryItemFromSpot(spot.number, a.productId)}
                        className="p-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/80 rounded-lg transition flex items-center gap-1 text-[10px] font-bold"
                        title="Eliminar este producto del ticket (restituye stock)"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        <span>Eliminar</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-zinc-400 text-[11px] mb-1">Notas / Observaciones</label>
            <input
              id="input-edit-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observaciones de ingreso..."
              className="w-full bg-zinc-900 border border-zinc-750 rounded-lg px-3 py-1.5 text-white"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 rounded-lg font-medium transition border border-zinc-750"
            >
              Cancelar
            </button>
            <button
              id="btn-save-edit-session"
              type="submit"
              className="px-5 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white rounded-lg font-bold shadow-lg shadow-amber-600/30 transition active:scale-95 border border-amber-400/40"
            >
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
