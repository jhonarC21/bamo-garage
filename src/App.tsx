import React, { useState, useEffect } from 'react';
import { ParkingProvider, useParking } from './context/ParkingContext';
import { Navbar } from './components/Navbar';
import { ParkingGrid } from './components/ParkingGrid';
import { CarWashPlatform } from './components/CarWashPlatform';
import { AccessoriesShop } from './components/AccessoriesShop';
import { MonthlyContracts } from './components/MonthlyContracts';
import { VehiclesDatabase } from './components/VehiclesDatabase';
import { AdminAnalytics } from './components/AdminAnalytics';
import { DailyCashRegister } from './components/DailyCashRegister';
import { BusinessAccounting } from './components/BusinessAccounting';
import { PayrollManagement } from './components/PayrollManagement';
import { SettingsAndUsers } from './components/SettingsAndUsers';
import { CheckInModal } from './components/CheckInModal';
import { CheckOutModal } from './components/CheckOutModal';
import { EditSessionModal } from './components/EditSessionModal';
import { CustomerQRModal } from './components/CustomerQRModal';
import { UniversalQRModal } from './components/UniversalQRModal';
import { LiveCustomerPortal } from './components/LiveCustomerPortal';
import { AuthLoginScreen } from './components/AuthLoginScreen';
import { ErrorBoundary } from './components/ErrorBoundary';
import { bluetoothScanner, ScannedPayload } from './utils/bluetoothScanner';
import { QrCode, CheckCircle2, X } from 'lucide-react';

function ParkingAppContent() {
  const { isAuthenticated, spots } = useParking();
  const [activeTab, setActiveTab] = useState<string>('parking');

  // Modal States
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [checkInSpotNumber, setCheckInSpotNumber] = useState<number | undefined>(undefined);
  const [initialPlatePrefill, setInitialPlatePrefill] = useState<string>('');

  const [isCheckOutOpen, setIsCheckOutOpen] = useState(false);
  const [checkOutSpotNumber, setCheckOutSpotNumber] = useState<number | null>(null);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editSpotNumber, setEditSpotNumber] = useState<number | null>(null);

  const [isQROpen, setIsQROpen] = useState(false);
  const [qrSpotNumber, setQrSpotNumber] = useState<number | null>(null);

  // Universal QR Modal state
  const [isUniversalQROpen, setIsUniversalQROpen] = useState(false);

  // Scan feedback toast
  const [scanToast, setScanToast] = useState<{ message: string; sub?: string } | null>(null);

  // Check URL query parameters for direct customer QR portal
  const [isCustomerPortalOpen, setIsCustomerPortalOpen] = useState(false);
  const [customerTicketNumber, setCustomerTicketNumber] = useState<string | null>(null);
  const [customerPlate, setCustomerPlate] = useState<string | null>(null);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const ticket = params.get('ticket');
      const plate = params.get('plate') || params.get('patente');
      const portal = params.get('portal') || params.get('cliente');

      if (ticket) {
        setCustomerTicketNumber(ticket);
        setIsCustomerPortalOpen(true);
      } else if (plate) {
        setCustomerPlate(plate);
        setIsCustomerPortalOpen(true);
      } else if (portal) {
        setIsCustomerPortalOpen(true);
      }
    } catch (e) {
      console.warn('URL param parse error:', e);
    }
  }, []);

  // Global Bluetooth / Laser Barcode Scanner Listener
  useEffect(() => {
    const unsub = bluetoothScanner.onScan((code: string, payload: ScannedPayload) => {
      // 1. If currently in customer portal, do nothing here (portal has its own search)
      if (isCustomerPortalOpen) return;

      const ticketQuery = payload.ticketNumber || (payload.type === 'ticket' ? payload.raw : null);
      const plateQuery = payload.plate || (payload.type === 'plate' ? payload.raw.replace(/[^A-Za-z0-9]/g, '') : null);

      // Search active spots for match
      let matchSpot = spots.find((s) => {
        if (!s.currentSession) return false;
        if (ticketQuery && s.currentSession.ticketNumber.toUpperCase() === ticketQuery.toUpperCase()) {
          return true;
        }
        if (plateQuery) {
          const cleanSessionPlate = s.currentSession.plate.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
          const cleanSearchPlate = plateQuery.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
          if (cleanSessionPlate === cleanSearchPlate) return true;
        }
        return false;
      });

      if (matchSpot) {
        // Vehicle found parked! Open CheckOutModal automatically
        setCheckOutSpotNumber(matchSpot.number);
        setIsCheckOutOpen(true);
        setScanToast({
          message: `¡Vehículo identificado en Puesto #${matchSpot.number}!`,
          sub: `Patente: ${matchSpot.currentSession?.plate} • Ticket: ${matchSpot.currentSession?.ticketNumber}`,
        });
        setTimeout(() => setScanToast(null), 5000);
      } else if (payload.type === 'sku' || payload.sku) {
        // SKU scanned: open shop tab
        setActiveTab('shop');
        setScanToast({
          message: `Código de Producto escaneado: ${payload.sku || payload.raw}`,
          sub: 'Revisando inventario en la tienda de accesorios.',
        });
        setTimeout(() => setScanToast(null), 4000);
      } else if (plateQuery && plateQuery.length >= 4) {
        // New plate for entry: open CheckInModal
        setInitialPlatePrefill(plateQuery.toUpperCase());
        setCheckInSpotNumber(undefined);
        setIsCheckInOpen(true);
        setScanToast({
          message: `Nueva patente escaneada: ${plateQuery.toUpperCase()}`,
          sub: 'Abriendo registro de ingreso a puesto disponible.',
        });
        setTimeout(() => setScanToast(null), 4000);
      } else {
        // Generic code received
        setScanToast({
          message: `Lectura láser exitosa: ${code}`,
          sub: 'Dispositivo emitió señal de escaneo.',
        });
        setTimeout(() => setScanToast(null), 3500);
      }
    });

    return () => unsub();
  }, [spots, isCustomerPortalOpen]);

  // Handlers from ParkingGrid
  const handleSpotCheckIn = (spotNumber: number) => {
    setCheckInSpotNumber(spotNumber);
    setInitialPlatePrefill('');
    setIsCheckInOpen(true);
  };

  const handleSpotCheckOut = (spotNumber: number) => {
    setCheckOutSpotNumber(spotNumber);
    setIsCheckOutOpen(true);
  };

  const handleSpotOpenQR = (spotNumber: number) => {
    setQrSpotNumber(spotNumber);
    setIsQROpen(true);
  };

  const handleSpotEdit = (spotNumber: number) => {
    setEditSpotNumber(spotNumber);
    setIsEditOpen(true);
  };

  const handleSpotAddWash = (spotNumber: number) => {
    setActiveTab('wash');
  };

  const handleSpotAddAccessory = (spotNumber: number) => {
    setActiveTab('shop');
  };

  const handleCheckInSuccess = (spotNum: number) => {
    // Automatically open QR view for the newly checked in vehicle
    setQrSpotNumber(spotNum);
    setIsQROpen(true);
  };

  if (isCustomerPortalOpen || customerTicketNumber || customerPlate) {
    return (
      <LiveCustomerPortal
        ticketNumber={customerTicketNumber}
        initialPlate={customerPlate}
        onExit={() => {
          setIsCustomerPortalOpen(false);
          setCustomerTicketNumber(null);
          setCustomerPlate(null);
          try {
            window.history.replaceState({}, '', window.location.pathname);
          } catch (e) {}
        }}
      />
    );
  }

  // Gate the internal garage application behind the authentication screen
  if (!isAuthenticated) {
    return <AuthLoginScreen />;
  }

  return (
    <div className="min-h-screen bg-[#090A0F] text-zinc-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      {/* Laser Scan Toast Notification */}
      {scanToast && (
        <div className="fixed top-4 right-4 z-50 bg-gradient-to-r from-cyan-950 via-zinc-900 to-zinc-900 border border-cyan-500/60 rounded-2xl p-4 shadow-2xl max-w-sm w-full animate-fadeIn flex items-start justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-500/30">
              <QrCode className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="font-bold text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                {scanToast.message}
              </div>
              {scanToast.sub && <p className="text-zinc-400 text-[11px] mt-0.5">{scanToast.sub}</p>}
            </div>
          </div>
          <button
            onClick={() => setScanToast(null)}
            className="text-zinc-500 hover:text-zinc-200 p-1 rounded-lg"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Navigation & Live Controls */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewCheckIn={() => {
          setCheckInSpotNumber(undefined);
          setInitialPlatePrefill('');
          setIsCheckInOpen(true);
        }}
        onOpenUniversalQR={() => setIsUniversalQROpen(true)}
        onOpenCustomerPortal={() => setIsCustomerPortalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'parking' && (
          <ParkingGrid
            onCheckIn={handleSpotCheckIn}
            onCheckOut={handleSpotCheckOut}
            onOpenQR={handleSpotOpenQR}
            onEditSpot={handleSpotEdit}
            onAddWash={handleSpotAddWash}
            onAddAccessory={handleSpotAddAccessory}
            onOpenUniversalQR={() => setIsUniversalQROpen(true)}
            onOpenCustomerPortal={() => setIsCustomerPortalOpen(true)}
          />
        )}

        {activeTab === 'wash' && <CarWashPlatform />}

        {activeTab === 'shop' && <AccessoriesShop />}

        {activeTab === 'contracts' && <MonthlyContracts />}

        {activeTab === 'caja' && <DailyCashRegister />}

        {activeTab === 'contabilidad' && <BusinessAccounting />}

        {activeTab === 'nomina' && <PayrollManagement />}

        {activeTab === 'database' && <VehiclesDatabase />}

        {activeTab === 'admin' && <AdminAnalytics />}

        {activeTab === 'configuracion' && <SettingsAndUsers />}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-850 bg-[#0D0E15]/90 backdrop-blur-md py-4 text-center text-xs text-zinc-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="font-semibold text-zinc-200 flex items-center gap-2">
            <span>Bamo Garage SpA</span>
            <span className="text-zinc-600">•</span>
            <span className="text-zinc-400 font-normal">Cobija 2058, Calama (RUT: 78.084.649-6)</span>
            <span className="text-zinc-600">•</span>
            <span className="text-cyan-400 font-normal">SII Calama</span>
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsUniversalQROpen(true)}
              className="text-indigo-400 hover:text-indigo-300 underline font-semibold text-[11px]"
            >
              Ver QR Único para Clientes
            </button>
            <span className="text-zinc-600">•</span>
            <span className="text-zinc-400 text-[11px]">
              Tarifa: $900 (0 a 30 min) + $300 (cada 10 min adicionales)
            </span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <CheckInModal
        isOpen={isCheckInOpen}
        onClose={() => {
          setIsCheckInOpen(false);
          setInitialPlatePrefill('');
        }}
        initialSpotNumber={checkInSpotNumber}
        initialPlate={initialPlatePrefill}
        onSuccess={handleCheckInSuccess}
      />

      <CheckOutModal
        isOpen={isCheckOutOpen}
        onClose={() => setIsCheckOutOpen(false)}
        spotNumber={checkOutSpotNumber}
      />

      <EditSessionModal
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setEditSpotNumber(null);
        }}
        spot={editSpotNumber ? (spots.find((s) => s.number === editSpotNumber) || null) : null}
      />

      <CustomerQRModal
        isOpen={isQROpen}
        onClose={() => setIsQROpen(false)}
        spotNumber={qrSpotNumber}
        onOpenLivePortal={(ticket) => {
          setIsQROpen(false);
          setCustomerTicketNumber(ticket);
          setIsCustomerPortalOpen(true);
        }}
      />

      <UniversalQRModal
        isOpen={isUniversalQROpen}
        onClose={() => setIsUniversalQROpen(false)}
        onOpenCustomerPortal={() => {
          setIsUniversalQROpen(false);
          setIsCustomerPortalOpen(true);
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ParkingProvider>
        <ParkingAppContent />
      </ParkingProvider>
    </ErrorBoundary>
  );
}
