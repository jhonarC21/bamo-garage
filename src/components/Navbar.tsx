import React from 'react';
import {
  Car,
  Clock,
  Sparkles,
  ShoppingBag,
  Calendar,
  Database,
  BarChart3,
  FastForward,
  RotateCcw,
  ShieldCheck,
  Zap,
  QrCode,
  Smartphone,
  Wallet,
  Landmark,
  FileSpreadsheet,
  Settings,
  UserCheck,
  Lock,
  LogOut,
  Shield,
  Cloud,
  CloudOff,
  RefreshCw,
} from 'lucide-react';
import { useParking } from '../context/ParkingContext';
import { formatTimeOnly } from '../utils/pricing';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenNewCheckIn: () => void;
  onOpenUniversalQR?: () => void;
  onOpenCustomerPortal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenNewCheckIn,
  onOpenUniversalQR,
  onOpenCustomerPortal,
}) => {
  const {
    spots,
    currentTime,
    simulatedMinutesAdded,
    advanceTime,
    resetTime,
    resetToInitialData,
    currentUser,
    lockSystem,
    settings,
    cloudSyncStatus,
  } = useParking();

  const occupiedCount = spots.filter((s) => s.status === 'occupied').length;
  const reservedCount = spots.filter((s) => s.status === 'reserved_monthly').length;
  const availableCount = spots.filter((s) => s.status === 'available').length;

  const navItems = [
    { id: 'parking', label: '10 Puestos', icon: Car, badge: `${occupiedCount}/10` },
    { id: 'wash', label: 'Lavado', icon: Sparkles },
    { id: 'shop', label: 'Accesorios', icon: ShoppingBag },
    { id: 'contracts', label: 'Arriendos', icon: Calendar, badge: `${reservedCount}` },
    { id: 'caja', label: 'Caja Diaria', icon: Wallet },
    { id: 'contabilidad', label: 'Contabilidad SII', icon: Landmark },
    { id: 'nomina', label: 'Pagos Nómina', icon: FileSpreadsheet },
    { id: 'database', label: 'Vehículos & Clientes', icon: Database },
    { id: 'admin', label: 'Métricas', icon: BarChart3 },
    { id: 'configuracion', label: 'Configuración', icon: Settings },
  ];

  return (
    <header className="bg-[#0D0E15]/95 backdrop-blur-xl text-zinc-100 border-b border-zinc-800/80 sticky top-0 z-40 shadow-2xl">
      {/* Top Bar: Live Info & Simulator */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-indigo-950/50 text-indigo-300 px-3 py-1 rounded-full border border-indigo-500/30 shadow-inner">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-semibold tracking-wide uppercase text-[11px]">Sistema Activo</span>
            <span className="text-zinc-600">|</span>
            <span className="text-zinc-300">10 Puestos</span>
          </div>

          {/* Cloud Sync Status Badge */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold transition ${
              cloudSyncStatus === 'connected'
                ? 'bg-emerald-950/50 text-emerald-300 border-emerald-500/40 shadow-sm'
                : cloudSyncStatus === 'syncing'
                ? 'bg-cyan-950/50 text-cyan-300 border-cyan-500/40 animate-pulse'
                : 'bg-amber-950/50 text-amber-300 border-amber-500/40'
            }`}
            title={
              cloudSyncStatus === 'connected'
                ? 'Sincronizado en tiempo real con Firebase Firestore (Multi-dispositivo en vivo)'
                : cloudSyncStatus === 'syncing'
                ? 'Sincronizando cambios con la nube...'
                : 'Modo local (Reconectando nube...)'
            }
          >
            {cloudSyncStatus === 'connected' ? (
              <>
                <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">En Línea (Nube)</span>
              </>
            ) : cloudSyncStatus === 'syncing' ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                <span className="hidden sm:inline">Sincronizando</span>
              </>
            ) : (
              <>
                <CloudOff className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Modo Local</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5 bg-zinc-900/90 px-2.5 py-1 rounded-lg border border-zinc-800 text-zinc-300">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-mono font-semibold text-zinc-100">
              {formatTimeOnly(currentTime.toISOString())}
            </span>
            {simulatedMinutesAdded > 0 && (
              <span className="text-amber-300 font-semibold text-[11px] ml-1 bg-amber-950/70 px-1.5 py-0.2 rounded border border-amber-700/60">
                +{simulatedMinutesAdded} min simulados
              </span>
            )}
          </div>

          {currentUser && (
            <div className="flex items-center gap-1.5 bg-zinc-900/90 px-2.5 py-1 rounded-lg border border-zinc-800 text-zinc-300 text-[11px]">
              {currentUser.role === 'admin' ? (
                <Shield className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
              )}
              <span className="text-zinc-400 hidden sm:inline">Usuario:</span>
              <span className="font-semibold text-white">{currentUser.name}</span>
              {currentUser.role === 'admin' && (
                <span className="bg-amber-950 text-amber-300 text-[9px] font-bold px-1.5 py-0.2 rounded border border-amber-700/50 uppercase ml-0.5">
                  Admin
                </span>
              )}
            </div>
          )}

          <button
            id="btn-lock-system"
            onClick={lockSystem}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-rose-100 border border-rose-800/50 transition text-[11px] font-semibold active:scale-95"
            title="Bloquear sistema y cerrar sesión activa"
          >
            <Lock className="w-3 h-3 text-rose-400" />
            <span>Bloquear</span>
          </button>
        </div>

        {/* Time Simulator & Demo Tools */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-zinc-900/90 p-1 rounded-lg border border-zinc-800">
            <span className="text-zinc-400 px-1.5 font-medium flex items-center gap-1">
              <FastForward className="w-3 h-3 text-cyan-400" />
              Simular:
            </span>
            <button
              id="btn-time-15m"
              onClick={() => advanceTime(15)}
              className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-200 hover:text-white transition font-medium text-[11px] border border-zinc-700/50"
              title="Avanzar 15 minutos para probar tramos"
            >
              +15m
            </button>
            <button
              id="btn-time-30m"
              onClick={() => advanceTime(30)}
              className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-200 hover:text-white transition font-medium text-[11px] border border-zinc-700/50"
              title="Avanzar 30 minutos (1 tramo inicial)"
            >
              +30m
            </button>
            <button
              id="btn-time-60m"
              onClick={() => advanceTime(60)}
              className="px-2 py-0.5 bg-cyan-950/80 text-cyan-300 hover:bg-cyan-900/90 rounded transition font-medium text-[11px] border border-cyan-800/60"
              title="Avanzar 1 hora"
            >
              +1h
            </button>
            {simulatedMinutesAdded > 0 && (
              <button
                id="btn-time-reset"
                onClick={resetTime}
                className="px-1.5 py-0.5 text-amber-300 hover:text-amber-100 hover:bg-amber-950/60 rounded transition flex items-center gap-0.5 text-[11px]"
                title="Volver a la hora actual real"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                Reset
              </button>
            )}
          </div>

          <button
            id="btn-reset-demo"
            onClick={() => {
              if (window.confirm('¿Deseas restablecer el sistema a cero (todos los puestos disponibles y registros limpios)?')) {
                resetToInitialData();
              }
            }}
            className="text-zinc-400 hover:text-zinc-200 px-2.5 py-1 rounded-lg hover:bg-zinc-850 border border-transparent hover:border-zinc-750 transition text-[11px]"
            title="Restablecer todos los puestos a disponibles y limpiar transacciones"
          >
            Restablecer a Cero
          </button>
        </div>
      </div>

      {/* Main Header & Nav Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between py-3 border-t border-zinc-800/80 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-cyan-600 flex items-center justify-center shadow-lg shadow-indigo-600/20 border border-indigo-400/30">
              <Car className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-lg text-zinc-100 tracking-tight">
                  {settings.parkingName || 'Bamo Garage SpA'}
                </h1>
                <span className="bg-indigo-950 text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border border-indigo-700/50">
                  10 Puestos
                </span>
                <span className="hidden sm:inline-block bg-zinc-800 text-zinc-300 text-[10px] font-mono px-2 py-0.5 rounded-full border border-zinc-700">
                  RUT: {settings.rut || '78.084.649-6'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="text-zinc-300 font-medium">{settings.address || 'Cobija 2058'}</span>
                <span className="text-zinc-600">•</span>
                <span className="text-cyan-400 font-medium">{settings.siiOffice || 'SII Calama'}</span>
                <span className="text-zinc-600">•</span>
                <span className="text-zinc-400">Cel: {settings.phone || '+56993939952'}</span>
              </p>
            </div>
          </div>

          {/* Quick status counters and fast check-in button */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-2 text-xs bg-zinc-900/90 px-3 py-1.5 rounded-xl border border-zinc-800 shadow-sm">
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                {availableCount} Libres
              </span>
              <span className="text-zinc-700">•</span>
              <span className="flex items-center gap-1.5 text-rose-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                {occupiedCount} Ocupados
              </span>
              <span className="text-zinc-700">•</span>
              <span className="flex items-center gap-1.5 text-purple-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                {reservedCount} Arriendos
              </span>
            </div>

            {onOpenUniversalQR && (
              <button
                id="btn-universal-qr"
                onClick={onOpenUniversalQR}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs bg-gradient-to-r from-purple-900/60 to-indigo-900/60 hover:from-purple-800/80 hover:to-indigo-800/80 text-purple-200 hover:text-white border border-purple-500/40 shadow-md shadow-purple-950/40 transition active:scale-95"
                title="Ver e imprimir el Código QR Único del Estacionamiento"
              >
                <QrCode className="w-3.5 h-3.5 text-purple-300" />
                <span>QR Único Clientes</span>
              </button>
            )}

            <button
              id="btn-quick-checkin"
              onClick={onOpenNewCheckIn}
              disabled={availableCount === 0}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-xs shadow-lg transition ${
                availableCount > 0
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-indigo-600/30 active:scale-95 border border-indigo-400/40'
                  : 'bg-zinc-850 text-zinc-500 cursor-not-allowed border border-zinc-800'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              {availableCount > 0 ? 'Registrar Ingreso' : 'Estacionamiento Lleno'}
            </button>
          </div>
        </div>

        {/* Horizontal Navigation Tabs */}
        <nav className="flex items-center space-x-1 overflow-x-auto pb-2 scrollbar-none border-t border-zinc-800/60 pt-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-tab-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-zinc-800/95 text-white shadow-md border border-zinc-700/80'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-850/60 border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-400' : 'text-zinc-400'}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive
                        ? 'bg-indigo-950 text-indigo-300 border border-indigo-700/60'
                        : 'bg-zinc-850 text-zinc-300 border border-zinc-750'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

