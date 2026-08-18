import React, { useState, useEffect } from 'react';
import {
  Car,
  Clock,
  Sparkles,
  ShoppingBag,
  ShieldCheck,
  MapPin,
  CheckCircle2,
  ArrowLeft,
  Plus,
  Minus,
  Check,
  Share2,
  Copy,
  AlertCircle,
  Search,
  ChevronRight,
  Info,
  Calendar,
  RefreshCw,
  QrCode,
  Key,
} from 'lucide-react';
import { useParking } from '../context/ParkingContext';
import { calculateParkingFee, formatCLP, formatDateTime, formatTimeOnly } from '../utils/pricing';
import { AccessorySaleItem, WashService, ParkingSession } from '../types';

interface LiveCustomerPortalProps {
  ticketNumber?: string | null;
  initialPlate?: string | null;
  onExit: () => void;
}

export const LiveCustomerPortal: React.FC<LiveCustomerPortalProps> = ({
  ticketNumber: initialTicketNumber,
  initialPlate: initialPlateProp,
  onExit,
}) => {
  const {
    spots,
    completedSessions,
    currentTime,
    settings,
    washServices,
    accessoryProducts,
    requestCustomerWashOrder,
    requestCustomerAccessories,
  } = useParking();

  // Active plate or ticket query state
  const [searchedPlate, setSearchedPlate] = useState<string>(initialPlateProp || '');
  const [plateInput, setPlateInput] = useState<string>(initialPlateProp || '');
  const [selectedTicketNumber, setSelectedTicketNumber] = useState<string | null>(
    initialTicketNumber || null
  );
  const [searchError, setSearchError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'stay' | 'wash' | 'shop'>('stay');
  const [copiedLink, setCopiedLink] = useState(false);

  // Wash request modal / state
  const [selectedWashService, setSelectedWashService] = useState<WashService | null>(null);
  const [washNotes, setWashNotes] = useState('');
  const [washSuccessMsg, setWashSuccessMsg] = useState<string | null>(null);

  // Shop cart state { [productId]: quantity }
  const [shopCart, setShopCart] = useState<Record<string, number>>({});
  const [shopCategory, setShopCategory] = useState<string>('all');
  const [shopSearch, setShopSearch] = useState('');
  const [shopNotes, setShopNotes] = useState('');
  const [shopSuccessMsg, setShopSuccessMsg] = useState<string | null>(null);

  // Normalize plate helper
  const normalizePlate = (str: string) => str.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

  // Find active session by ticket or by plate
  let activeSpot = spots.find((s) => {
    if (!s.currentSession) return false;
    if (selectedTicketNumber && s.currentSession.ticketNumber === selectedTicketNumber) {
      return true;
    }
    if (searchedPlate && normalizePlate(s.currentSession.plate) === normalizePlate(searchedPlate)) {
      return true;
    }
    return false;
  });

  let activeSession = activeSpot?.currentSession;

  // Fallback to completed session if not in active spots
  let completedSession = completedSessions.find((s) => {
    if (selectedTicketNumber && s.ticketNumber === selectedTicketNumber) return true;
    if (searchedPlate && normalizePlate(s.plate) === normalizePlate(searchedPlate)) return true;
    return false;
  });

  const session: ParkingSession | undefined = activeSession || completedSession;
  const spotNumber = session?.spotNumber;

  // Handle Search Submission
  const handleSearchPlate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = plateInput.trim().toUpperCase();
    if (!clean) {
      setSearchError('Por favor digita la patente de tu vehículo.');
      return;
    }

    const norm = normalizePlate(clean);
    // Check if plate exists in active or completed sessions
    const matchSpot = spots.find(
      (s) => s.currentSession && normalizePlate(s.currentSession.plate) === norm
    );
    const matchCompleted = completedSessions.find((s) => normalizePlate(s.plate) === norm);

    if (matchSpot && matchSpot.currentSession) {
      setSearchedPlate(matchSpot.currentSession.plate);
      setSelectedTicketNumber(matchSpot.currentSession.ticketNumber);
      setSearchError(null);
    } else if (matchCompleted) {
      setSearchedPlate(matchCompleted.plate);
      setSelectedTicketNumber(matchCompleted.ticketNumber);
      setSearchError(null);
    } else {
      setSearchError(
        `No encontramos ningún vehículo activo con la patente "${clean}". Revisa que esté bien escrita o acércate a la caseta.`
      );
    }
  };

  const handleSelectQuickPlate = (plate: string) => {
    setPlateInput(plate);
    setSearchedPlate(plate);
    const match = spots.find(
      (s) => s.currentSession && normalizePlate(s.currentSession.plate) === normalizePlate(plate)
    );
    if (match && match.currentSession) {
      setSelectedTicketNumber(match.currentSession.ticketNumber);
      setSearchError(null);
    }
  };

  const handleResetSearch = () => {
    setSelectedTicketNumber(null);
    setSearchedPlate('');
    setPlateInput('');
    setSearchError(null);
    setActiveTab('stay');
  };

  const handleCopyPortalLink = () => {
    const url = session
      ? `${window.location.origin}${window.location.pathname}?plate=${session.plate}`
      : `${window.location.origin}${window.location.pathname}?portal=customer`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Cart operations
  const handleAddToCart = (productId: string) => {
    const prod = accessoryProducts.find((p) => p.id === productId);
    if (!prod || prod.stock <= 0) return;
    const currentQty = shopCart[productId] || 0;
    if (currentQty >= prod.stock) return;

    setShopCart((prev) => ({
      ...prev,
      [productId]: currentQty + 1,
    }));
  };

  const handleRemoveFromCart = (productId: string) => {
    const currentQty = shopCart[productId] || 0;
    if (currentQty <= 1) {
      const next = { ...shopCart };
      delete next[productId];
      setShopCart(next);
    } else {
      setShopCart((prev) => ({
        ...prev,
        [productId]: currentQty - 1,
      }));
    }
  };

  const cartEntries = Object.entries(shopCart) as [string, number][];
  const totalCartCount: number = (Object.values(shopCart) as number[]).reduce(
    (sum: number, qty: number) => sum + qty,
    0
  );
  const totalCartAmount: number = cartEntries.reduce(
    (sum: number, [pId, qty]: [string, number]) => {
      const prod = accessoryProducts.find((p) => p.id === pId);
      return sum + (prod ? prod.price * qty : 0);
    },
    0
  );

  // Submit wash order
  const handleConfirmWashOrder = () => {
    if (!selectedWashService || !session || spotNumber === undefined || session.status !== 'active')
      return;

    const res = requestCustomerWashOrder(spotNumber, selectedWashService.id, washNotes.trim());
    if (res) {
      setWashSuccessMsg(
        `¡Servicio "${selectedWashService.name}" solicitado con éxito! Se cargó a tu ticket.`
      );
      setSelectedWashService(null);
      setWashNotes('');
      setTimeout(() => setWashSuccessMsg(null), 5000);
      setActiveTab('stay');
    }
  };

  // Submit accessory pre-order
  const handleConfirmShopOrder = () => {
    if (totalCartCount === 0 || !session || spotNumber === undefined || session.status !== 'active')
      return;

    const items: AccessorySaleItem[] = cartEntries.map(([pId, qty]) => {
      const prod = accessoryProducts.find((p) => p.id === pId)!;
      return {
        productId: prod.id,
        productName: prod.name,
        quantity: qty,
        unitPrice: prod.price,
        total: prod.price * qty,
      };
    });

    const success = requestCustomerAccessories(spotNumber, items, shopNotes.trim());
    if (success) {
      setShopSuccessMsg(
        `¡${items.length} producto(s) solicitados por ${formatCLP(
          totalCartAmount
        )}! Pagarás al momento de retirar tu vehículo.`
      );
      setShopCart({});
      setShopNotes('');
      setTimeout(() => setShopSuccessMsg(null), 6000);
      setActiveTab('stay');
    }
  };

  const filteredAccessories = accessoryProducts.filter((p) => {
    const matchesCat = shopCategory === 'all' || p.category === shopCategory;
    const matchesSearch =
      p.name.toLowerCase().includes(shopSearch.toLowerCase()) ||
      p.description.toLowerCase().includes(shopSearch.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const activeOccupiedSpots = spots.filter((s) => s.status === 'occupied' && s.currentSession);

  // =========================================================================
  // VIEW 1: SEARCH / INPUT VEHICLE PLATE SCREEN (WHEN SCANNED FROM SINGLE QR)
  // =========================================================================
  if (!session || spotNumber === undefined) {
    return (
      <div className="min-h-screen bg-[#07080C] text-zinc-100 flex flex-col items-center justify-start py-6 px-3 sm:px-6">
        <div className="w-full max-w-lg bg-[#0F1117] border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-[#13151F] px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between">
            <button
              onClick={onExit}
              className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-xs transition py-1 px-2 rounded-lg hover:bg-zinc-800"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver a la Administración</span>
            </button>
            <div className="flex items-center gap-1.5 text-indigo-400 text-xs font-semibold">
              <QrCode className="w-4 h-4" />
              <span>Tótem QR Clientes</span>
            </div>
          </div>

          {/* Branding Banner */}
          <div className="px-6 pt-6 pb-4 text-center space-y-1.5 bg-gradient-to-b from-[#13151F] to-[#0F1117]">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-600/10">
              <Car className="w-6 h-6" />
            </div>
            <h1 className="font-black text-xl text-white tracking-tight">
              {settings.parkingName || 'Bamo Garage SpA'}
            </h1>
            <p className="text-xs text-zinc-300 flex items-center justify-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-indigo-400" />
              {settings.address || 'Cobija 2058'}
            </p>
            <p className="text-[11px] text-zinc-400 font-mono flex items-center justify-center gap-2">
              <span>RUT: {settings.rut || '78.084.649-6'}</span>
              <span>•</span>
              <span className="text-cyan-400">{settings.siiOffice || 'SII Calama'}</span>
              <span>•</span>
              <span>Cel: {settings.phone || '+56993939952'}</span>
            </p>
          </div>

          {/* Plate Lookup Form */}
          <div className="p-6 space-y-5">
            <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-inner">
              <div className="text-center space-y-1">
                <h2 className="font-extrabold text-base text-zinc-100">
                  Consulta tu Estadía en Tiempo Real
                </h2>
                <p className="text-xs text-zinc-400">
                  Digita la patente de tu vehículo para ver tu puesto, hora de ingreso y tiempo transcurrido.
                </p>
              </div>

              <form onSubmit={handleSearchPlate} className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                    <span>Patente del Vehículo</span>
                    <span className="text-[10px] text-indigo-400 font-mono">Ej: CL-8921 o AB-1234</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="INGRESA TU PATENTE"
                      value={plateInput}
                      onChange={(e) => {
                        setPlateInput(e.target.value.toUpperCase());
                        setSearchError(null);
                      }}
                      className="w-full uppercase text-center font-mono font-black tracking-widest text-lg sm:text-xl py-3 px-4 bg-zinc-950 border-2 border-indigo-500/60 focus:border-indigo-400 rounded-2xl text-white placeholder:text-zinc-600 focus:outline-none shadow-inner"
                      autoFocus
                    />
                  </div>
                </div>

                {searchError && (
                  <div className="p-3 bg-rose-950/80 border border-rose-700/60 rounded-xl text-rose-200 text-xs flex items-start gap-2 animate-fadeIn">
                    <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                    <span>{searchError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-extrabold rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 text-sm border border-indigo-400/30 active:scale-[0.99]"
                >
                  <Search className="w-4 h-4" />
                  Consultar Mi Vehículo
                </button>
              </form>
            </div>

            {/* Quick Demo Vehicles selector (so users can test instantly) */}
            {activeOccupiedSpots.length > 0 && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span className="font-semibold text-zinc-300">
                    Vehículos estacionados actualmente ({activeOccupiedSpots.length}):
                  </span>
                  <span className="text-[10px] text-zinc-500">Toca para probar rápido</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {activeOccupiedSpots.map((spot) => (
                    <button
                      key={spot.number}
                      onClick={() => handleSelectQuickPlate(spot.currentSession!.plate)}
                      className="p-2.5 bg-zinc-900/90 hover:bg-zinc-800/90 border border-zinc-800 hover:border-indigo-500/50 rounded-xl text-left transition flex items-center justify-between group"
                    >
                      <div>
                        <span className="font-mono font-black text-xs text-zinc-100 block group-hover:text-indigo-300 transition">
                          {spot.currentSession!.plate}
                        </span>
                        <span className="text-[10px] text-zinc-400">
                          {spot.currentSession!.brand} • Puesto #{spot.number}
                        </span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-indigo-400 transition" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Pricing info footer */}
            <div className="bg-[#12141D] border border-zinc-800/80 rounded-2xl p-4 text-xs space-y-2">
              <div className="font-bold text-amber-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Tarifas Oficiales del Estacionamiento
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-300 pt-1 font-mono">
                <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-850">
                  <span className="text-zinc-400 block text-[10px] font-sans">1er Tramo Fijo</span>
                  <span className="font-bold text-emerald-400">$900 (0 a 30 min)</span>
                </div>
                <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-850">
                  <span className="text-zinc-400 block text-[10px] font-sans">Tramos Siguientes</span>
                  <span className="font-bold text-cyan-400">+$300 (cada 10 min)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: ACTIVE STAY MONITOR (SPOT NUMBER, ENTRY TIME, LIVE DURATION & BILL)
  // =========================================================================
  const pricing = calculateParkingFee(
    session.entryTime,
    session.exitTime ? new Date(session.exitTime) : currentTime,
    undefined,
    settings.base30MinPrice,
    settings.extra10MinPrice
  );

  const washTotal = (session.washOrders || []).reduce((sum, w) => sum + w.price, 0);
  const accTotal = (session.accessorySales || []).reduce((sum, a) => sum + a.total, 0);
  const valetTotal = session.hasValetParking
    ? session.valetParkingFee || settings.valetParkingPrice || 2000
    : 0;
  const grandTotal = pricing.totalParkingCost + washTotal + accTotal + valetTotal;

  return (
    <div className="min-h-screen bg-[#07080C] text-zinc-100 flex flex-col items-center justify-start py-4 px-3 sm:px-6">
      <div className="w-full max-w-xl bg-[#0F1117] border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Top App Header */}
        <div className="bg-[#13151F] px-4 sm:px-6 py-3.5 border-b border-zinc-800 flex items-center justify-between">
          <button
            onClick={handleResetSearch}
            className="flex items-center gap-1 text-zinc-400 hover:text-white text-xs transition p-1.5 rounded-lg hover:bg-zinc-800"
            title="Consultar otra patente"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Consultar otra Patente</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-0.5 rounded-full">
              Puesto #{session.spotNumber}
            </span>
            <span
              className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full border font-mono ${
                session.status === 'active'
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
                  : 'bg-zinc-800 text-zinc-300 border-zinc-700'
              }`}
            >
              {session.status === 'active' ? 'Estadía en Curso' : 'Estadía Finalizada'}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleCopyPortalLink}
              className="text-zinc-400 hover:text-cyan-400 p-1.5 rounded-lg hover:bg-zinc-800 transition flex items-center gap-1 text-xs"
              title="Copiar enlace de este vehículo"
            >
              {copiedLink ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={onExit}
              className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition text-xs"
              title="Volver a la administración"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Brand Banner */}
        <div className="px-5 pt-4 pb-3 border-b border-zinc-800/80 bg-gradient-to-b from-[#13151F] to-[#0F1117] text-center space-y-1">
          <div className="flex items-center justify-center gap-2">
            <div className="w-8 h-8 bg-indigo-600/30 border border-indigo-500/40 rounded-xl flex items-center justify-center text-indigo-400 shadow-sm">
              <Car className="w-4 h-4" />
            </div>
            <h1 className="font-extrabold text-base sm:text-lg text-zinc-100 tracking-tight">
              {settings.parkingName}
            </h1>
          </div>
          <p className="text-[11px] text-zinc-400 flex items-center justify-center gap-1">
            <MapPin className="w-3 h-3 text-zinc-500" />
            {settings.address}
          </p>
        </div>

        {/* Global Success / Alert Banners */}
        {washSuccessMsg && (
          <div className="mx-4 mt-3 p-3 bg-purple-950/80 border border-purple-600/60 rounded-xl text-purple-200 text-xs flex items-center gap-2.5 shadow-lg animate-fadeIn">
            <Sparkles className="w-4 h-4 text-purple-400 flex-shrink-0" />
            <span className="font-medium">{washSuccessMsg}</span>
          </div>
        )}

        {shopSuccessMsg && (
          <div className="mx-4 mt-3 p-3 bg-amber-950/80 border border-amber-600/60 rounded-xl text-amber-200 text-xs flex items-center gap-2.5 shadow-lg animate-fadeIn">
            <ShoppingBag className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span className="font-medium">{shopSuccessMsg}</span>
          </div>
        )}

        {/* Segmented Tab Navigation */}
        <div className="px-4 pt-3 pb-1 border-b border-zinc-800/80 bg-[#0C0E14]">
          <div className="grid grid-cols-3 gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs">
            <button
              onClick={() => setActiveTab('stay')}
              className={`py-2 px-2 rounded-lg font-bold transition flex items-center justify-center gap-1.5 ${
                activeTab === 'stay'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Mi Estadía</span>
            </button>

            <button
              onClick={() => setActiveTab('wash')}
              className={`py-2 px-2 rounded-lg font-bold transition flex items-center justify-center gap-1.5 ${
                activeTab === 'wash'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Lavado & Estética</span>
            </button>

            <button
              onClick={() => setActiveTab('shop')}
              className={`py-2 px-2 rounded-lg font-bold transition flex items-center justify-center gap-1.5 relative ${
                activeTab === 'shop'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Tienda</span>
              {totalCartCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-mono flex items-center justify-center font-bold">
                  {totalCartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* TAB 1: MI ESTADÍA (PUESTO, TIEMPO DE INGRESO, TIEMPO TRANSCURRIDO & TARIFA) */}
        {activeTab === 'stay' && (
          <div className="p-4 sm:p-5 space-y-4 text-xs">
            {/* Spotlight 3 Core Requested Data: Puesto, Hora Ingreso, Tiempo Transcurrido */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* 1. Puesto de Estacionamiento */}
              <div className="bg-gradient-to-br from-indigo-950/80 via-zinc-900 to-zinc-950 border border-indigo-500/40 rounded-2xl p-4 text-center space-y-1 shadow-inner">
                <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider block">
                  Puesto Asignado
                </span>
                <div className="font-mono text-2xl sm:text-3xl font-black text-white">
                  #{session.spotNumber}
                </div>
                <span className="text-[10px] text-zinc-400 font-mono">
                  Patente: <strong className="text-zinc-200">{session.plate}</strong>
                </span>
              </div>

              {/* 2. Hora de Ingreso */}
              <div className="bg-gradient-to-br from-cyan-950/80 via-zinc-900 to-zinc-950 border border-cyan-500/40 rounded-2xl p-4 text-center space-y-1 shadow-inner">
                <span className="text-[10px] text-cyan-300 font-bold uppercase tracking-wider block">
                  Hora de Ingreso
                </span>
                <div className="font-mono text-xl sm:text-2xl font-black text-white">
                  {formatTimeOnly(session.entryTime)}
                </div>
                <span className="text-[10px] text-zinc-400 font-mono truncate block">
                  {new Date(session.entryTime).toLocaleDateString('es-CL', {
                    day: '2-digit',
                    month: 'short',
                  })}
                </span>
              </div>

              {/* 3. Tiempo Transcurrido */}
              <div className="bg-gradient-to-br from-emerald-950/80 via-zinc-900 to-zinc-950 border border-emerald-500/40 rounded-2xl p-4 text-center space-y-1 shadow-inner">
                <span className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                  {session.status === 'active' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  )}
                  Tiempo Transcurrido
                </span>
                <div className="font-mono text-xl sm:text-2xl font-black text-emerald-300">
                  {pricing.formattedDuration}
                </div>
                <span className="text-[10px] text-zinc-400 font-mono">
                  {pricing.elapsedMinutes} min totales
                </span>
              </div>
            </div>

            {/* Vehicle Card Summary */}
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Patente del Vehículo:</span>
                <span className="font-mono font-black text-zinc-100 bg-zinc-950 border border-zinc-700 px-3 py-0.5 rounded-lg text-sm tracking-wider">
                  {session.plate}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-zinc-800 pt-1.5">
                <span className="text-zinc-400">Vehículo:</span>
                <span className="text-zinc-200 font-medium">
                  {session.brand} {session.model} ({session.color})
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-zinc-800 pt-1.5">
                <span className="text-zinc-400">Ticket N°:</span>
                <span className="font-mono text-zinc-400">{session.ticketNumber}</span>
              </div>
            </div>

            {/* Real-time Bill Breakdown */}
            <div className="bg-zinc-950/90 border border-zinc-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                <div>
                  <span className="font-extrabold text-sm text-zinc-200 block">
                    Cobro Acumulado al Momento:
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    {pricing.extraTiersCount === 0
                      ? 'Tarifa base de 30 minutos'
                      : `Base 30m + ${pricing.extraTiersCount} tramo(s) extra`}
                  </span>
                </div>
                <span className="font-mono font-black text-2xl text-emerald-400">
                  {formatCLP(grandTotal)}
                </span>
              </div>

              {/* Line items */}
              <div className="space-y-1.5 text-[11px] text-zinc-300">
                {/* 1. Base tier */}
                <div className="flex justify-between">
                  <span>Primer Tramo (0 a 30 min):</span>
                  <span className="font-medium text-zinc-100 font-mono">
                    {formatCLP(settings.base30MinPrice)}
                  </span>
                </div>

                {/* 2. Extra 10-min tiers */}
                {pricing.extraTiersCount > 0 ? (
                  <div className="flex justify-between text-cyan-300 font-mono">
                    <span>{pricing.extraTiersCount} tramos extras (10 min c/u):</span>
                    <span className="font-semibold">+{formatCLP(pricing.extraTierCost)}</span>
                  </div>
                ) : (
                  <div className="text-[10px] text-emerald-400 font-medium">
                    ✓ Dentro de la tarifa base inicial de 30 minutos
                  </div>
                )}

                {/* 3. Wash services */}
                {session.washOrders?.map((w, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between text-purple-300 border-t border-zinc-800 pt-1.5 font-mono"
                  >
                    <span className="font-sans flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-purple-400" />
                      Lavado ({w.serviceName}):
                    </span>
                    <span>+{formatCLP(w.price)}</span>
                  </div>
                ))}

                {/* 4. Accessories */}
                {session.accessorySales?.map((a, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between text-amber-300 border-t border-zinc-800 pt-1.5 font-mono"
                  >
                    <span className="font-sans flex items-center gap-1">
                      <ShoppingBag className="w-3 h-3 text-amber-400" />
                      {a.quantity}x {a.productName}:
                    </span>
                    <span>+{formatCLP(a.total)}</span>
                  </div>
                ))}

                {/* 5. Valet Parking */}
                {session.hasValetParking && (
                  <div className="flex justify-between text-amber-300 border-t border-zinc-800 pt-1.5 font-mono">
                    <span className="font-sans flex items-center gap-1">
                      <Key className="w-3 h-3 text-amber-400" />
                      Valet Parking{session.valetDriver ? ` (${session.valetDriver})` : ''}:
                    </span>
                    <span>+{formatCLP(session.valetParkingFee || settings.valetParkingPrice || 2000)}</span>
                  </div>
                )}
              </div>

              <div className="p-2.5 bg-zinc-900/90 border border-zinc-800 rounded-xl text-[10px] text-zinc-400 flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Pago en Caja al Salir:</strong> Al retirar tu auto, indica tu patente{' '}
                  <strong className="text-zinc-200 font-mono">{session.plate}</strong> o puesto{' '}
                  <strong className="text-zinc-200 font-mono">#{session.spotNumber}</strong> en la
                  caseta de control.
                </span>
              </div>
            </div>

            {/* Valet Parking Card if included */}
            {session.hasValetParking && (
              <div className="bg-amber-950/30 border border-amber-800/50 rounded-2xl p-4 space-y-1.5 text-xs">
                <div className="font-bold text-amber-300 flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-amber-400" />
                  Servicio Valet Parking Incluido
                </div>
                <p className="text-[11px] text-zinc-300">
                  Tu vehículo cuenta con servicio de aparcamiento y custodia de llaves Valet Parking
                  {session.valetDriver ? ` a cargo de ${session.valetDriver}` : ''}.
                </p>
                {session.valetNotes && (
                  <div className="text-[10px] text-zinc-400 italic bg-zinc-900/80 p-2 rounded-lg border border-zinc-800">
                    Instrucciones: {session.valetNotes}
                  </div>
                )}
              </div>
            )}

            {/* Active Wash Status Progress if ordered */}
            {session.washOrders && session.washOrders.length > 0 && (
              <div className="bg-purple-950/30 border border-purple-800/50 rounded-2xl p-4 space-y-2 text-xs">
                <div className="font-bold text-purple-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  Estado de tus Servicios de Lavado
                </div>
                <div className="space-y-2 pt-1">
                  {session.washOrders.map((wo, i) => (
                    <div
                      key={i}
                      className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-zinc-200">{wo.serviceName}</div>
                        <div className="text-[10px] text-zinc-400">
                          {wo.washerName ? `Lavador: ${wo.washerName}` : 'Asignando personal'}
                        </div>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          wo.status === 'ready'
                            ? 'bg-emerald-950/90 text-emerald-300 border-emerald-700'
                            : wo.status === 'in_progress'
                            ? 'bg-cyan-950/90 text-cyan-300 border-cyan-700 animate-pulse'
                            : 'bg-amber-950/90 text-amber-300 border-amber-700'
                        }`}
                      >
                        {wo.status === 'ready'
                          ? '✨ Listo para Retiro'
                          : wo.status === 'in_progress'
                          ? '🧽 En Lavado'
                          : '🕒 En Cola'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Action Cards */}
            {session.status === 'active' && (
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  onClick={() => setActiveTab('wash')}
                  className="p-3 bg-purple-950/40 hover:bg-purple-900/50 border border-purple-800/60 rounded-xl text-left transition group space-y-1 shadow-sm"
                >
                  <div className="flex items-center justify-between text-purple-300">
                    <span className="font-bold text-xs">Solicitar Lavado</span>
                    <Sparkles className="w-4 h-4 text-purple-400 group-hover:scale-110 transition" />
                  </div>
                  <p className="text-[10px] text-zinc-400">
                    Exterior, Full Detailing o Tapiz mientras estás estacionado.
                  </p>
                </button>

                <button
                  onClick={() => setActiveTab('shop')}
                  className="p-3 bg-amber-950/40 hover:bg-amber-900/50 border border-amber-800/60 rounded-xl text-left transition group space-y-1 shadow-sm"
                >
                  <div className="flex items-center justify-between text-amber-300">
                    <span className="font-bold text-xs">Tienda de Accesorios</span>
                    <ShoppingBag className="w-4 h-4 text-amber-400 group-hover:scale-110 transition" />
                  </div>
                  <p className="text-[10px] text-zinc-400">
                    Aromatizantes, plumillas y cargadores con pago al salir.
                  </p>
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SOLICITAR LAVADO & ESTÉTICA VEHICULAR */}
        {activeTab === 'wash' && (
          <div className="p-4 sm:p-5 space-y-4 text-xs">
            <div className="bg-purple-950/20 border border-purple-800/40 rounded-2xl p-3.5 space-y-1">
              <div className="font-bold text-purple-300 flex items-center gap-1.5 text-xs">
                <Sparkles className="w-4 h-4 text-purple-400" />
                Catálogo de Lavados & Estética Vehicular
              </div>
              <p className="text-[11px] text-zinc-400">
                Selecciona el servicio deseado para tu vehículo en el{' '}
                <strong className="text-zinc-200 font-mono">Puesto #{spotNumber}</strong>. El costo se sumará a tu ticket y pagarás al salir.
              </p>
            </div>

            {/* Services Grid */}
            <div className="space-y-3">
              {washServices.map((service) => {
                const alreadyOrdered = session.washOrders?.some(
                  (w) => w.serviceId === service.id && w.status !== 'delivered'
                );

                return (
                  <div
                    key={service.id}
                    className="bg-zinc-900/90 border border-zinc-800 hover:border-purple-500/50 rounded-2xl p-4 transition space-y-2.5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-zinc-100">{service.name}</h3>
                          <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                            {service.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                          {service.description}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0 font-mono">
                        <div className="text-base font-extrabold text-purple-300">
                          {formatCLP(service.price)}
                        </div>
                        <div className="text-[10px] text-zinc-400 flex items-center justify-end gap-1">
                          <Clock className="w-3 h-3 text-zinc-500" />
                          ~{service.durationMinutes} min
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-zinc-800 pt-2.5 flex items-center justify-between">
                      {alreadyOrdered ? (
                        <div className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Servicio ya solicitado en este ticket
                        </div>
                      ) : (
                        <span className="text-[10px] text-zinc-400">
                          Pago al momento de retirar en caja
                        </span>
                      )}

                      <button
                        onClick={() => setSelectedWashService(service)}
                        disabled={session.status !== 'active' || alreadyOrdered}
                        className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 ${
                          alreadyOrdered
                            ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                            : 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        {alreadyOrdered ? 'Solicitado' : 'Solicitar Servicio'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: TIENDA DE ACCESORIOS */}
        {activeTab === 'shop' && (
          <div className="p-4 sm:p-5 space-y-4 text-xs">
            <div className="bg-amber-950/20 border border-amber-800/40 rounded-2xl p-3.5 space-y-1">
              <div className="font-bold text-amber-300 flex items-center gap-1.5 text-xs">
                <ShoppingBag className="w-4 h-4 text-amber-400" />
                Tienda de Accesorios • Pre-ordenar para Entrega
              </div>
              <p className="text-[11px] text-zinc-400">
                Pide artículos para tu auto con entrega inmediata o al momento de cancelar tu estadía.
              </p>
            </div>

            {/* Category Filter Pills & Search */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Buscar aromatizantes, plumillas, cargadores..."
                  value={shopSearch}
                  onChange={(e) => setShopSearch(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'aromas', label: 'Aromatizantes' },
                  { id: 'limpieza', label: 'Limpieza' },
                  { id: 'electronica', label: 'Electrónica' },
                  { id: 'emergencia', label: 'Emergencia' },
                  { id: 'confort', label: 'Confort' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setShopCategory(cat.id)}
                    className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition ${
                      shopCategory === cat.id
                        ? 'bg-amber-600 text-white font-bold'
                        : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Products List */}
            <div className="space-y-2.5">
              {filteredAccessories.map((product) => {
                const qtyInCart = shopCart[product.id] || 0;
                const isOutOfStock = product.stock <= 0;

                return (
                  <div
                    key={product.id}
                    className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-sm hover:border-zinc-700 transition"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-100 text-xs">{product.name}</span>
                        <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                          {product.sku}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-400 line-clamp-1">{product.description}</p>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-extrabold text-amber-300 text-xs">
                          {formatCLP(product.price)}
                        </span>
                        <span
                          className={`text-[9px] font-mono ${
                            isOutOfStock ? 'text-rose-400' : 'text-zinc-500'
                          }`}
                        >
                          {isOutOfStock ? 'Sin stock' : `Stock: ${product.stock} un.`}
                        </span>
                      </div>
                    </div>

                    {/* Quantity Add / Stepper */}
                    <div>
                      {isOutOfStock ? (
                        <span className="px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-500 text-[10px] font-bold">
                          Agotado
                        </span>
                      ) : qtyInCart > 0 ? (
                        <div className="flex items-center gap-1.5 bg-zinc-950 border border-amber-600/50 p-1 rounded-xl">
                          <button
                            onClick={() => handleRemoveFromCart(product.id)}
                            className="w-6 h-6 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex items-center justify-center font-bold"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-mono font-bold text-amber-300 w-5 text-center text-xs">
                            {qtyInCart}
                          </span>
                          <button
                            onClick={() => handleAddToCart(product.id)}
                            disabled={qtyInCart >= product.stock}
                            className="w-6 h-6 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white flex items-center justify-center font-bold"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAddToCart(product.id)}
                          disabled={session.status !== 'active'}
                          className="px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-600/40 rounded-xl font-bold transition flex items-center gap-1 text-[11px]"
                        >
                          <Plus className="w-3 h-3" />
                          Agregar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Shopping Cart Summary Bar */}
            {totalCartCount > 0 && (
              <div className="sticky bottom-0 bg-zinc-950 border border-amber-600/60 rounded-2xl p-4 shadow-2xl space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-amber-400" />
                    <span className="font-bold text-zinc-100 text-xs">
                      Pre-orden de Artículos ({totalCartCount})
                    </span>
                  </div>
                  <span className="font-mono font-extrabold text-amber-300 text-sm">
                    {formatCLP(totalCartAmount)}
                  </span>
                </div>

                <div className="space-y-1">
                  <input
                    type="text"
                    placeholder="Instrucciones de entrega opcionales (ej: dejar en asiento copiloto)"
                    value={shopNotes}
                    onChange={(e) => setShopNotes(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-[11px] text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => setShopCart({})}
                    className="px-3 py-2 text-zinc-400 hover:text-rose-400 text-[11px] transition"
                  >
                    Vaciar Carrito
                  </button>

                  <button
                    onClick={handleConfirmShopOrder}
                    className="flex-1 py-2.5 px-4 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl shadow-lg shadow-amber-600/30 transition flex items-center justify-center gap-2 text-xs"
                  >
                    <Check className="w-4 h-4" />
                    Confirmar Pedido (Pagar al Salir)
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* WASH CONFIRMATION MODAL */}
        {selectedWashService && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <div className="bg-[#0F1117] border border-zinc-800 rounded-2xl w-full max-w-md p-5 text-white shadow-2xl space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  <h3 className="font-bold text-sm text-zinc-100">Confirmar Solicitud de Lavado</h3>
                </div>
                <button
                  onClick={() => setSelectedWashService(null)}
                  className="text-zinc-400 hover:text-white text-xs p-1"
                >
                  ✕
                </button>
              </div>

              <div className="bg-purple-950/30 border border-purple-800/40 rounded-xl p-3.5 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-zinc-200 text-sm">{selectedWashService.name}</span>
                  <span className="font-mono font-extrabold text-purple-300 text-base">
                    {formatCLP(selectedWashService.price)}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400">{selectedWashService.description}</p>
                <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-mono pt-1">
                  <span>⏱️ Tiempo estimado: ~{selectedWashService.durationMinutes} min</span>
                  <span>•</span>
                  <span>🚗 Vehículo: {session.plate}</span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <label className="text-zinc-300 font-medium text-[11px]">
                  Instrucciones o notas adicionales para el lavador (opcional):
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej: aspirar maleta, cuidado con aromatizante, etc."
                  value={washNotes}
                  onChange={(e) => setWashNotes(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="p-2.5 bg-zinc-900 rounded-xl text-[10px] text-zinc-400">
                ℹ️ Al confirmar, el servicio se enviará a la cola del Car Wash y se cargará a tu{' '}
                <strong className="text-zinc-200 font-mono">Puesto #{session.spotNumber}</strong> con pago al momento de retirar tu vehículo en caja.
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => setSelectedWashService(null)}
                  className="w-1/3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold rounded-xl text-xs transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmWashOrder}
                  className="w-2/3 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-purple-600/30 transition flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Confirmar y Solicitar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 bg-[#13151F] border-t border-zinc-800 text-center text-[10px] text-zinc-500 space-y-1">
          <p>
            Al retirar tu vehículo, presenta tu Patente <strong className="text-zinc-300 font-mono">{session.plate}</strong> o Puesto <strong className="text-zinc-300 font-mono">#{session.spotNumber}</strong> en caja.
          </p>
        </div>
      </div>
    </div>
  );
};
