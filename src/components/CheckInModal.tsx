import React, { useState, useEffect } from 'react';
import {
  X,
  Car,
  Search,
  Star,
  Sparkles,
  User,
  Phone,
  Mail,
  CreditCard,
  Clock,
  ShieldCheck,
  Check,
  Key,
  Crown,
  QrCode,
  Radio,
} from 'lucide-react';
import { VehicleType, VEHICLE_TYPES } from '../types';
import { useParking } from '../context/ParkingContext';
import { formatCLP } from '../utils/pricing';
import { bluetoothScanner } from '../utils/bluetoothScanner';

interface CheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSpotNumber?: number;
  initialPlate?: string;
  onSuccess: (spotNumber: number) => void;
}

export const CheckInModal: React.FC<CheckInModalProps> = ({
  isOpen,
  onClose,
  initialSpotNumber,
  initialPlate,
  onSuccess,
}) => {
  const { spots, washServices, getVehicleByPlate, checkInVehicle, settings, currentTime } = useParking();

  const availableSpots = spots.filter(
    (s) => s.status === 'available' || (initialSpotNumber && s.number === initialSpotNumber)
  );

  const [spotNumber, setSpotNumber] = useState<number>(
    initialSpotNumber || (availableSpots[0]?.number ?? 1)
  );

  const [plate, setPlate] = useState(initialPlate || '');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [year, setYear] = useState<string>('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('sedan');
  
  // Manual Entry Time
  const [isManualEntryTime, setIsManualEntryTime] = useState(false);
  const [manualEntryDate, setManualEntryDate] = useState<string>(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });

  // VIP Client
  const [isVIP, setIsVIP] = useState(false);

  // Optional client fields
  const [clientName, setClientName] = useState('');
  const [clientRut, setClientRut] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  
  // Optional wash service
  const [selectedWashId, setSelectedWashId] = useState<string>('');
  const [notes, setNotes] = useState('');

  // Valet parking state
  const [hasValetParking, setHasValetParking] = useState(false);
  const [valetFee, setValetFee] = useState<string>(String(settings.valetParkingPrice ?? 2000));
  const [valetDriver, setValetDriver] = useState('');
  const [valetNotes, setValetNotes] = useState('');

  // Auto-detection state
  const [isFoundInDb, setIsFoundInDb] = useState(false);
  const [isFrequent, setIsFrequent] = useState(false);
  const [visitsCount, setVisitsCount] = useState(0);

  useEffect(() => {
    if (initialSpotNumber) {
      setSpotNumber(initialSpotNumber);
    } else if (availableSpots.length > 0) {
      setSpotNumber(availableSpots[0].number);
    }
  }, [initialSpotNumber, isOpen]);

  // Bluetooth & Laser QR Scanner listener
  useEffect(() => {
    if (!isOpen) return;

    const cleanup = bluetoothScanner.onScan((scannedCode) => {
      const cleaned = scannedCode.trim().toUpperCase();
      handlePlateChange(cleaned);
    });

    return () => cleanup();
  }, [isOpen]);

  // Handle License Plate Autocomplete & Recognition
  const handlePlateChange = (val: string) => {
    const formatted = val.toUpperCase();
    setPlate(formatted);

    if (formatted.length >= 4) {
      const match = getVehicleByPlate(formatted);
      if (match) {
        setBrand(match.brand || '');
        setModel(match.model || '');
        setColor(match.color || '');
        setYear(match.year ? String(match.year) : '');
        if (match.vehicleType) {
          setVehicleType(match.vehicleType);
        }
        setClientName(match.clientName || '');
        setClientRut(match.clientRut || '');
        setClientPhone(match.clientPhone || '');
        setClientEmail(match.clientEmail || '');
        setIsVIP(!!match.isVIP);
        setIsFoundInDb(true);
        setIsFrequent(match.isFrequent || match.visitsCount >= settings.frequentThreshold);
        setVisitsCount(match.visitsCount || 0);
        return;
      }
    }
    setIsFoundInDb(false);
    setIsFrequent(false);
    setVisitsCount(0);
  };

  // Filter wash services compatible with the selected vehicle type
  const compatibleWashServices = washServices.filter((s) => {
    if (!s.compatibleVehicleTypes || s.compatibleVehicleTypes.length === 0) return true;
    return s.compatibleVehicleTypes.includes(vehicleType);
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!plate.trim()) return;

    let finalEntryTime: string | undefined = undefined;
    if (isManualEntryTime && manualEntryDate) {
      finalEntryTime = new Date(manualEntryDate).toISOString();
    }

    checkInVehicle({
      spotNumber,
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
      entryTime: finalEntryTime,
      isManualEntryTime,
      isVIP,
      washServiceId: selectedWashId || undefined,
      hasValetParking,
      valetParkingFee: hasValetParking ? (parseFloat(valetFee) || (settings.valetParkingPrice ?? 2000)) : 0,
      valetDriver: valetDriver.trim() || undefined,
      valetNotes: valetNotes.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    onSuccess(spotNumber);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#0F1117] border border-zinc-800 rounded-2xl w-full max-w-xl text-white shadow-2xl overflow-hidden my-6">
        {/* Modal Header */}
        <div className="bg-[#13151F] px-6 py-4 border-b border-zinc-800/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-zinc-100 tracking-tight">
                Registrar Ingreso de Vehículo
              </h3>
              <p className="text-xs text-zinc-400">
                Reconocimiento automático de patentes y cálculo de tramos
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

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Spot Selector & Plate Input */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Spot Selector */}
            <div>
              <label className="block text-zinc-300 font-medium mb-1">
                Puesto Asignado (1-10) *
              </label>
              <select
                id="select-checkin-spot"
                value={spotNumber}
                onChange={(e) => setSpotNumber(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2 text-white font-bold focus:outline-none focus:border-indigo-500"
                required
              >
                {spots.map((s) => (
                  <option
                    key={s.number}
                    value={s.number}
                    disabled={s.status !== 'available' && s.number !== initialSpotNumber}
                  >
                    Puesto #{s.number} {
                      s.status === 'occupied'
                        ? '(Ocupado)'
                        : s.status === 'reserved_monthly'
                        ? `(Arriendo Activo ${s.monthlyContract?.type === 'nocturno' ? 'Nocturno' : s.monthlyContract?.type === 'diurno' ? 'Diurno' : '24/7'})`
                        : s.monthlyContract?.type === 'nocturno'
                        ? '(Disponible - Arriendo Nocturno 20:00)'
                        : s.monthlyContract?.type === 'diurno'
                        ? '(Disponible - Arriendo Diurno 08:00)'
                        : '(Disponible)'
                    }
                  </option>
                ))}
              </select>
            </div>

            {/* License Plate Input */}
            <div className="sm:col-span-2">
              <label className="block text-zinc-300 font-medium mb-1 flex items-center justify-between">
                <span>Patente del Vehículo *</span>
                {isFoundInDb && (
                  <span className="text-emerald-400 font-medium text-[11px] flex items-center gap-1">
                    <Check className="w-3 h-3" /> Ficha reconocida en Base de Datos
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  id="input-checkin-plate"
                  type="text"
                  placeholder="Ej: KLYH-45 o PZ-1234"
                  value={plate}
                  onChange={(e) => handlePlateChange(e.target.value)}
                  className={`w-full bg-zinc-900 border-2 rounded-lg px-3 py-2 text-white uppercase font-mono font-bold tracking-wider placeholder:normal-case placeholder:font-sans placeholder:text-zinc-500 focus:outline-none text-sm shadow-inner transition ${
                    isFoundInDb
                      ? 'border-emerald-500/80 focus:border-emerald-400 bg-emerald-950/15'
                      : 'border-indigo-500/80 focus:border-indigo-400'
                  }`}
                  required
                  autoFocus
                />
                <Search className="w-4 h-4 text-zinc-400 absolute right-3 top-2.5" />
              </div>
            </div>
          </div>

          {/* Notificación de Vehículo Ya Registrado en BD */}
          {isFoundInDb && (
            <div className="p-3 bg-emerald-950/50 border border-emerald-500/60 rounded-xl flex items-center justify-between gap-3 text-xs text-emerald-200 shadow-md animate-fadeIn">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <div>
                  <span className="font-bold text-emerald-300">¡Vehículo ya registrado en la Base de Datos!</span>
                  <div className="text-[11px] text-zinc-300">
                    Datos del vehículo y cliente cargados automáticamente para evitar duplicidad de información.
                  </div>
                </div>
              </div>
              <span className="bg-emerald-900/80 text-emerald-200 border border-emerald-600/60 px-2 py-0.5 rounded font-mono text-[10px] font-bold whitespace-nowrap">
                {visitsCount} visitas previas
              </span>
            </div>
          )}

          {/* Manual Entry Time Selector */}
          <div className="bg-zinc-900/90 border border-zinc-750 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="checkbox-manual-time" className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  id="checkbox-manual-time"
                  type="checkbox"
                  checked={isManualEntryTime}
                  onChange={(e) => setIsManualEntryTime(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-indigo-500 focus:ring-indigo-500/30 accent-indigo-500 cursor-pointer"
                />
                <span className="font-semibold text-xs text-zinc-200 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  Asignar hora de entrada manual
                </span>
              </label>
              <span className="text-[11px] text-zinc-400 font-mono">
                {isManualEntryTime ? 'Hora personalizada' : 'Hora actual automática'}
              </span>
            </div>

            {isManualEntryTime && (
              <div className="pt-2 border-t border-zinc-800">
                <label className="block text-zinc-300 text-[11px] mb-1 font-medium">
                  Fecha y Hora Exacta de Ingreso:
                </label>
                <input
                  id="input-manual-entry-time"
                  type="datetime-local"
                  value={manualEntryDate}
                  onChange={(e) => setManualEntryDate(e.target.value)}
                  className="w-full bg-[#0A0B10] border border-indigo-500/60 rounded-lg px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-indigo-400"
                  required={isManualEntryTime}
                />
              </div>
            )}
          </div>

          {/* VIP Client & Frequent Client Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* VIP Client Checkbox */}
            <div className={`border rounded-xl p-3 flex items-center justify-between cursor-pointer transition ${isVIP ? 'bg-amber-950/40 border-amber-500/60 text-amber-200' : 'bg-zinc-900/60 border-zinc-800 text-zinc-400'}`}>
              <label htmlFor="checkbox-vip-client" className="flex items-center gap-2 cursor-pointer select-none w-full">
                <input
                  id="checkbox-vip-client"
                  type="checkbox"
                  checked={isVIP}
                  onChange={(e) => setIsVIP(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-amber-500/30 accent-amber-500 cursor-pointer"
                />
                <div className="flex-1">
                  <div className="font-bold text-xs flex items-center gap-1.5 text-amber-300">
                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                    Cliente VIP (Pago Acumulado)
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    Permite acumular deuda en cuenta corriente
                  </div>
                </div>
              </label>
            </div>

            {/* Frequent Client Alert */}
            {isFrequent ? (
              <div className="bg-amber-950/60 border border-amber-600/60 rounded-xl p-3 flex items-center gap-2.5 text-amber-200">
                <div className="w-7 h-7 rounded-lg bg-amber-900/60 border border-amber-600 flex items-center justify-center flex-shrink-0">
                  <Star className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                </div>
                <div className="text-xs">
                  <div className="font-bold text-amber-300">⭐ Cliente Frecuente</div>
                  <div className="text-[10px] text-amber-200/80">
                    <span className="font-bold font-mono text-amber-300">{visitsCount} visitas</span> previas
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-3 flex items-center gap-2 text-zinc-400">
                <Radio className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[11px]">Lector láser/Bluetooth QR activo</span>
              </div>
            )}
          </div>

          {/* Vehicle Info (Auto-filled or manual) */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5 space-y-3">
            <div className="font-semibold text-zinc-200 flex items-center justify-between border-b border-zinc-800 pb-1.5">
              <span className="flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-indigo-400" />
                Datos del Vehículo & Tipo
              </span>
              <span className="text-[10px] text-zinc-400">
                Segmentación para servicios y lavados
              </span>
            </div>

            {/* Vehicle Type Selector */}
            <div>
              <label className="block text-zinc-300 font-semibold text-[11px] mb-1.5">
                Tipo de Vehículo * (Para catálogo de servicios de lavado)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5">
                {VEHICLE_TYPES.map((vt) => (
                  <button
                    key={vt.id}
                    type="button"
                    onClick={() => {
                      setVehicleType(vt.id);
                      setSelectedWashId(''); // reset selected wash if incompatible
                    }}
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
                <label className="block text-zinc-400 text-[11px] mb-1">Marca *</label>
                <input
                  id="input-checkin-brand"
                  type="text"
                  placeholder="Toyota, Hyundai..."
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full bg-[#0A0B10] border border-zinc-750 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-400 text-[11px] mb-1">Modelo *</label>
                <input
                  id="input-checkin-model"
                  type="text"
                  placeholder="RAV4, Tucson..."
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full bg-[#0A0B10] border border-zinc-750 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-400 text-[11px] mb-1">Color *</label>
                <input
                  id="input-checkin-color"
                  type="text"
                  placeholder="Gris, Blanco..."
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-full bg-[#0A0B10] border border-zinc-750 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-400 text-[11px] mb-1">Año</label>
                <input
                  id="input-checkin-year"
                  type="number"
                  placeholder="2023"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full bg-[#0A0B10] border border-zinc-750 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Optional Client Details (For Internal Staff Only) */}
          <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5">
              <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-zinc-400" />
                Datos del Cliente (Opcional - Gestión Interna)
              </span>
              <span className="text-[10px] text-zinc-500">Solo personal</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-zinc-400 text-[11px] mb-1">Nombre Completo</label>
                <input
                  id="input-checkin-client-name"
                  type="text"
                  placeholder="Ej: Carlos Morales"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full bg-[#0A0B10] border border-zinc-750 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 text-[11px] mb-1">RUT</label>
                <input
                  id="input-checkin-client-rut"
                  type="text"
                  placeholder="15.489.321-4"
                  value={clientRut}
                  onChange={(e) => setClientRut(e.target.value)}
                  className="w-full bg-[#0A0B10] border border-zinc-750 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 text-[11px] mb-1">Teléfono Móvil</label>
                <input
                  id="input-checkin-client-phone"
                  type="text"
                  placeholder="+56 9 7412 8596"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className="w-full bg-[#0A0B10] border border-zinc-750 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 text-[11px] mb-1">Correo Electrónico</label>
                <input
                  id="input-checkin-client-email"
                  type="email"
                  placeholder="cliente@ejemplo.cl"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  className="w-full bg-[#0A0B10] border border-zinc-750 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Optional Car Wash Service Addition */}
          <div className="bg-purple-950/25 border border-purple-800/40 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-purple-200 flex items-center gap-1.5 text-xs">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                ¿Desea agregar Servicio de Lavado al ingreso? (Opcional)
              </label>
              <span className="text-[10px] text-purple-300 bg-purple-950 px-2 py-0.5 rounded border border-purple-800">
                Filtrado para {VEHICLE_TYPES.find((v) => v.id === vehicleType)?.shortLabel}
              </span>
            </div>
            <select
              id="select-checkin-wash"
              value={selectedWashId}
              onChange={(e) => setSelectedWashId(e.target.value)}
              className="w-full bg-zinc-900 border border-purple-800/60 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-400"
            >
              <option value="">-- Sin servicio de lavado --</option>
              {compatibleWashServices.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} - {formatCLP(w.price)} (~{w.durationMinutes} min)
                </option>
              ))}
            </select>
          </div>

          {/* Optional Valet Parking Service Addition */}
          <div className={`border rounded-xl p-3.5 space-y-3 transition-all ${hasValetParking ? 'bg-amber-950/30 border-amber-500/50 shadow-lg shadow-amber-950/20' : 'bg-zinc-900/40 border-zinc-800'}`}>
            <div className="flex items-center justify-between">
              <label htmlFor="checkbox-valet-parking" className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  id="checkbox-valet-parking"
                  type="checkbox"
                  checked={hasValetParking}
                  onChange={(e) => setHasValetParking(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-amber-500/30 accent-amber-500 cursor-pointer"
                />
                <span className="font-bold text-xs text-amber-200 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  Servicio de Valet Parking (Recepción / Custodia / Acomodación)
                </span>
              </label>
              {hasValetParking && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  +{formatCLP(parseFloat(valetFee) || (settings.valetParkingPrice ?? 2000))}
                </span>
              )}
            </div>

            {hasValetParking && (
              <div className="pt-2 border-t border-amber-800/30 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div>
                  <label className="block text-amber-300/90 text-[11px] mb-1 font-semibold">Tarifa Valet ($ CLP)</label>
                  <input
                    id="input-valet-fee"
                    type="number"
                    value={valetFee}
                    onChange={(e) => setValetFee(e.target.value)}
                    className="w-full bg-[#0A0B10] border border-amber-600/50 rounded-lg px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-amber-400"
                    placeholder="2000"
                  />
                </div>
                <div>
                  <label className="block text-amber-300/90 text-[11px] mb-1 font-semibold">Valet / Conductor</label>
                  <input
                    id="input-valet-driver"
                    type="text"
                    value={valetDriver}
                    onChange={(e) => setValetDriver(e.target.value)}
                    placeholder="Ej: Juan P. / Caseta"
                    className="w-full bg-[#0A0B10] border border-amber-600/50 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-amber-300/90 text-[11px] mb-1 font-semibold">Nota / Custodia Llaves</label>
                  <input
                    id="input-valet-notes"
                    type="text"
                    value={valetNotes}
                    onChange={(e) => setValetNotes(e.target.value)}
                    placeholder="Ej: Llave en casillero #1"
                    className="w-full bg-[#0A0B10] border border-amber-600/50 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Tariff Calculation Reminder */}
          <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-3 flex items-center justify-between text-[11px] text-zinc-300">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <div>
                <span className="font-bold text-zinc-100">Tarifa de cobro por tramos:</span>{' '}
                <span>1er tramo fijo (0-30m) <strong className="text-emerald-400 font-mono">${settings.base30MinPrice}</strong>, luego <strong className="text-cyan-400 font-mono">${settings.extra10MinPrice}</strong> cada 10 min.</span>
              </div>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 rounded-lg font-medium transition border border-zinc-750"
            >
              Cancelar
            </button>
            <button
              id="btn-confirm-checkin"
              type="submit"
              className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-lg font-bold shadow-lg shadow-indigo-600/30 transition active:scale-95 border border-indigo-400/40"
            >
              Confirmar Ingreso & Generar QR
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

