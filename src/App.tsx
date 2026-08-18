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
import { CustomerQRModal } from './components/CustomerQRModal';
import { UniversalQRModal } from './components/UniversalQRModal';
import { LiveCustomerPortal } from './components/LiveCustomerPortal';
import { AuthLoginScreen } from './components/AuthLoginScreen';

function ParkingAppContent() {
  const { isAuthenticated } = useParking();
  const [activeTab, setActiveTab] = useState<string>('parking');

  // Modal States
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [checkInSpotNumber, setCheckInSpotNumber] = useState<number | undefined>(undefined);

  const [isCheckOutOpen, setIsCheckOutOpen] = useState(false);
  const [checkOutSpotNumber, setCheckOutSpotNumber] = useState<number | null>(null);

  const [isQROpen, setIsQROpen] = useState(false);
  const [qrSpotNumber, setQrSpotNumber] = useState<number | null>(null);

  // Universal QR Modal state
  const [isUniversalQROpen, setIsUniversalQROpen] = useState(false);

  // Check URL query parameters for direct customer QR portal
  const [isCustomerPortalOpen, setIsCustomerPortalOpen] = useState(false);
  const [customerTicketNumber, setCustomerTicketNumber] = useState<string | null>(null);
  const [customerPlate, setCustomerPlate] = useState<string | null>(null);

  useEffect(() => {
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
  }, []);

  // Handlers from ParkingGrid
  const handleSpotCheckIn = (spotNumber: number) => {
    setCheckInSpotNumber(spotNumber);
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
          window.history.replaceState({}, '', window.location.pathname);
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
      {/* Top Navigation & Live Controls */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewCheckIn={() => {
          setCheckInSpotNumber(undefined);
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
        onClose={() => setIsCheckInOpen(false)}
        initialSpotNumber={checkInSpotNumber}
        onSuccess={handleCheckInSuccess}
      />

      <CheckOutModal
        isOpen={isCheckOutOpen}
        onClose={() => setIsCheckOutOpen(false)}
        spotNumber={checkOutSpotNumber}
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
    <ParkingProvider>
      <ParkingAppContent />
    </ParkingProvider>
  );
}
