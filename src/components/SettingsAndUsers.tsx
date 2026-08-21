import React, { useState, useRef } from 'react';
import {
  Settings,
  Users,
  KeyRound,
  Sparkles,
  ShoppingBag,
  Clock,
  Landmark,
  ShieldCheck,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  AlertCircle,
  Lock,
  Unlock,
  Save,
  Tag,
  Car,
  CreditCard,
  Eye,
  EyeOff,
  RefreshCw,
  Key,
  Sun,
  Moon,
  Calendar,
  DollarSign,
  Download,
  Upload,
  Database,
  History,
  Cloud,
  HelpCircle,
  ShieldAlert,
} from 'lucide-react';
import { useParking } from '../context/ParkingContext';
import { formatCLP } from '../utils/pricing';
import { AppUser, UserRole, WashService, AccessoryProduct, AccessoryCategory, ACCESSORY_CATEGORIES } from '../types';

export const SettingsAndUsers: React.FC = () => {
  const {
    users,
    currentUser,
    setCurrentUser,
    updateUserPin,
    updateUser,
    addUser,
    deleteUser,
    washServices,
    addWashService,
    updateWashService,
    deleteWashService,
    accessoryProducts,
    addAccessoryProduct,
    updateAccessoryProduct,
    deleteAccessoryProduct,
    settings,
    updateSettings,
    autoSnapshots,
    exportBackupData,
    downloadBackupFile,
    restoreFromBackupData,
    restoreFromSnapshot,
    forceCloudSync,
    cloudSyncStatus,
    lastCloudSyncTime,
    resetToInitialData,
  } = useParking();

  const [activeTab, setActiveTab] = useState<'users' | 'wash' | 'shop' | 'tariffs' | 'tax' | 'pos' | 'backup'>('users');
  const [backupStatusMsg, setBackupStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [resetConfirmPin, setResetConfirmPin] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- PIN Management State ---
  const [selectedUserForPin, setSelectedUserForPin] = useState<AppUser | null>(null);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSuccess, setPinSuccess] = useState<string | null>(null);
  const [showPin, setShowPin] = useState(false);

  // --- User Form Modal State ---
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [userName, setUserName] = useState('');
  const [userUsername, setUserUsername] = useState('');
  const [userRole, setUserRole] = useState<UserRole>('cajero');
  const [userEmail, setUserEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userPinInit, setUserPinInit] = useState('12345678');

  // --- Wash Service Modal State ---
  const [isWashModalOpen, setIsWashModalOpen] = useState(false);
  const [editingWash, setEditingWash] = useState<WashService | null>(null);
  const [washName, setWashName] = useState('');
  const [washDescription, setWashDescription] = useState('');
  const [washPrice, setWashPrice] = useState('8000');
  const [washDuration, setWashDuration] = useState('30');
  const [washCategory, setWashCategory] = useState<'exterior' | 'interior' | 'completo' | 'detailing'>('completo');

  // --- Accessory Modal State ---
  const [isShopModalOpen, setIsShopModalOpen] = useState(false);
  const [editingProd, setEditingProd] = useState<AccessoryProduct | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodDescription, setProdDescription] = useState('');
  const [prodCategory, setProdCategory] = useState<AccessoryCategory>(ACCESSORY_CATEGORIES[0]);
  const [prodPrice, setProdPrice] = useState('2990');
  const [prodStock, setProdStock] = useState('15');

  // --- Tariff & Rental Plans Form State ---
  const [baseTierMinutes, setBaseTierMinutes] = useState(String(settings.baseTierMinutes || 30));
  const [baseTierCost, setBaseTierCost] = useState(String(settings.baseTierCost || 900));
  const [extraTierMinutes, setExtraTierMinutes] = useState(String(settings.extraTierMinutes || 10));
  const [extraTierCost, setExtraTierCost] = useState(String(settings.extraTierCost || 300));
  const [frequentThreshold, setFrequentThreshold] = useState(String(settings.frequentThreshold || 3));
  const [frequentDiscount, setFrequentDiscount] = useState(String(settings.frequentDiscountPercent ?? settings.frequentDiscountPercentage ?? 10));
  const [valetPrice, setValetPrice] = useState(String(settings.valetParkingPrice || 2000));
  const [valetEnabled, setValetEnabled] = useState(settings.valetParkingEnabled !== false);
  
  // Rental Plans State
  const [dayPlanPrice, setDayPlanPrice] = useState(String(settings.dayContractPrice || 45000));
  const [dayPlanSchedule, setDayPlanSchedule] = useState(settings.dayContractSchedule || '08:00 a 20:00 hrs');
  const [dayPlanDescription, setDayPlanDescription] = useState(settings.dayContractDescription || 'Arriendo de uso comercial diurno');

  const [nightPlanPrice, setNightPlanPrice] = useState(String(settings.nightContractPrice || 35000));
  const [nightPlanSchedule, setNightPlanSchedule] = useState(settings.nightContractSchedule || '20:00 a 08:00 hrs');
  const [nightPlanDescription, setNightPlanDescription] = useState(settings.nightContractDescription || 'Custodia nocturna protegida con portón y cámaras');

  const [fullPlanPrice, setFullPlanPrice] = useState(String(settings.fullContractPrice || 70000));
  const [fullPlanSchedule, setFullPlanSchedule] = useState(settings.fullContractSchedule || '24 Horas / Lunes a Domingo');
  const [fullPlanDescription, setFullPlanDescription] = useState(settings.fullContractDescription || 'Acceso ilimitado 24/7 sin restricción horaria');

  const [weeklyPlanPrice, setWeeklyPlanPrice] = useState(String(settings.weeklyContractPrice || 15000));
  const [weeklyPlanSchedule, setWeeklyPlanSchedule] = useState(settings.weeklyContractSchedule || '7 Días Continuos (24 Horas)');
  const [weeklyPlanDescription, setWeeklyPlanDescription] = useState(settings.weeklyContractDescription || 'Tarifa plana semanal para estadías temporales');

  const [operatingStart, setOperatingStart] = useState(settings.operatingHoursStart || '07:00');
  const [operatingEnd, setOperatingEnd] = useState(settings.operatingHoursEnd || '23:00');

  const [tariffSaveMsg, setTariffSaveMsg] = useState<string | null>(null);

  // --- Tax & Payroll Settings State ---
  const [ivaRate, setIvaRate] = useState(String((settings.ivaRatePercent || 19)));
  const [ppmRate, setPpmRate] = useState(String((settings.ppmRatePercent || 1.5)));
  const [retencionRate, setRetencionRate] = useState(String((settings.honorariosRetentionPercent || 13.75)));
  const [minWage, setMinWage] = useState(String(settings.minWageChile || 500000));
  const [taxSaveMsg, setTaxSaveMsg] = useState<string | null>(null);

  // --- POS Terminal Commission Rates State ---
  const [posTuuDebit, setPosTuuDebit] = useState(String(settings.posTuuDebitFeePercent ?? 1.49));
  const [posTuuCredit, setPosTuuCredit] = useState(String(settings.posTuuCreditFeePercent ?? 2.19));
  const [posMpDebit, setPosMpDebit] = useState(String(settings.posMercadoPagoDebitFeePercent ?? 2.95));
  const [posMpCredit, setPosMpCredit] = useState(String(settings.posMercadoPagoCreditFeePercent ?? 3.49));
  const [posSaveMsg, setPosSaveMsg] = useState<string | null>(null);

  // Handle PIN Change
  const handleChangePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForPin) return;

    setPinError(null);
    setPinSuccess(null);

    // Validate 8 digits
    if (!/^\d{8}$/.test(newPin)) {
      setPinError('La clave debe contener exactamente 8 dígitos numéricos (ej: 12345678).');
      return;
    }

    if (newPin !== confirmPin) {
      setPinError('Las claves no coinciden. Por favor confirme los 8 dígitos.');
      return;
    }

    const success = updateUserPin(selectedUserForPin.id, newPin);
    if (success) {
      setPinSuccess(`¡Clave de 8 dígitos modificada exitosamente para ${selectedUserForPin.name}!`);
      setNewPin('');
      setConfirmPin('');
      setTimeout(() => {
        setSelectedUserForPin(null);
        setPinSuccess(null);
      }, 2500);
    } else {
      setPinError('Error al actualizar la clave.');
    }
  };

  // Handle Save User
  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !userUsername.trim()) return;

    if (editingUser) {
      updateUser({
        ...editingUser,
        name: userName.trim(),
        username: userUsername.trim().toLowerCase(),
        role: userRole,
        email: userEmail.trim() || undefined,
        phone: userPhone.trim() || undefined,
      });
    } else {
      addUser({
        username: userUsername.trim().toLowerCase(),
        name: userName.trim(),
        role: userRole,
        pin: /^\d{8}$/.test(userPinInit) ? userPinInit : '12345678',
        email: userEmail.trim() || undefined,
        phone: userPhone.trim() || undefined,
        active: true,
      });
    }

    setIsUserModalOpen(false);
  };

  // Handle Save Wash Service
  const handleSaveWash = (e: React.FormEvent) => {
    e.preventDefault();
    if (!washName.trim()) return;

    const priceNum = parseFloat(washPrice) || 5000;
    const durNum = parseInt(washDuration, 10) || 30;

    if (editingWash) {
      updateWashService({
        ...editingWash,
        name: washName.trim(),
        description: washDescription.trim(),
        price: priceNum,
        durationMinutes: durNum,
        category: washCategory,
      });
    } else {
      addWashService({
        name: washName.trim(),
        description: washDescription.trim(),
        price: priceNum,
        durationMinutes: durNum,
        category: washCategory,
      });
    }
    setIsWashModalOpen(false);
  };

  // Handle Save Accessory Product
  const handleSaveProd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim()) return;

    const priceNum = parseFloat(prodPrice) || 1990;
    const stockNum = parseInt(prodStock, 10) || 10;

    if (editingProd) {
      updateAccessoryProduct({
        ...editingProd,
        name: prodName.trim(),
        description: prodDescription.trim(),
        category: prodCategory,
        price: priceNum,
        stock: stockNum,
      });
    } else {
      addAccessoryProduct({
        sku: `ACC-${Date.now().toString().slice(-4)}`,
        name: prodName.trim(),
        description: prodDescription.trim(),
        category: prodCategory,
        price: priceNum,
        costPrice: priceNum * 0.6,
        stock: stockNum,
        minStock: 3,
      });
    }
    setIsShopModalOpen(false);
  };

  // Handle Save Tariffs & Rental Plans
  const handleSaveTariffs = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      baseTierMinutes: parseInt(baseTierMinutes, 10) || 30,
      baseTierCost: parseFloat(baseTierCost) || 900,
      extraTierMinutes: parseInt(extraTierMinutes, 10) || 10,
      extraTierCost: parseFloat(extraTierCost) || 300,
      frequentThreshold: parseInt(frequentThreshold, 10) || 3,
      frequentDiscountPercent: parseFloat(frequentDiscount) || 10,
      frequentDiscountPercentage: parseFloat(frequentDiscount) || 10,
      valetParkingPrice: parseFloat(valetPrice) || 2000,
      valetParkingEnabled: valetEnabled,
      // Rental Plans & Schedules
      dayContractPrice: parseFloat(dayPlanPrice) || 45000,
      dayContractSchedule: dayPlanSchedule.trim() || '08:00 a 20:00 hrs',
      dayContractDescription: dayPlanDescription.trim(),
      nightContractPrice: parseFloat(nightPlanPrice) || 35000,
      nightContractSchedule: nightPlanSchedule.trim() || '20:00 a 08:00 hrs',
      nightContractDescription: nightPlanDescription.trim(),
      fullContractPrice: parseFloat(fullPlanPrice) || 70000,
      fullContractSchedule: fullPlanSchedule.trim() || '24 Horas / Lunes a Domingo',
      fullContractDescription: fullPlanDescription.trim(),
      weeklyContractPrice: parseFloat(weeklyPlanPrice) || 15000,
      weeklyContractSchedule: weeklyPlanSchedule.trim() || '7 Días Continuos (24 Horas)',
      weeklyContractDescription: weeklyPlanDescription.trim(),
      operatingHoursStart: operatingStart.trim() || '07:00',
      operatingHoursEnd: operatingEnd.trim() || '23:00',
    });
    setTariffSaveMsg('¡Tarifas, planes de arriendo y horarios actualizados correctamente!');
    setTimeout(() => setTariffSaveMsg(null), 3500);
  };

  // Handle Save Tax Settings
  const handleSaveTax = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      ivaRateChile: (parseFloat(ivaRate) || 19) / 100,
      ppmRateChile: (parseFloat(ppmRate) || 1.5) / 100,
      retencionHonorariosRateChile: (parseFloat(retencionRate) || 13.75) / 100,
      minWageChile: parseFloat(minWage) || 500000,
    });
    setTaxSaveMsg('¡Parámetros tributarios y salariales de Chile guardados!');
    setTimeout(() => setTaxSaveMsg(null), 3500);
  };

  // Handle Save POS Terminal Fees
  const handleSavePos = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      posTuuDebitFeePercent: parseFloat(posTuuDebit) || 1.49,
      posTuuCreditFeePercent: parseFloat(posTuuCredit) || 2.19,
      posMercadoPagoDebitFeePercent: parseFloat(posMpDebit) || 2.95,
      posMercadoPagoCreditFeePercent: parseFloat(posMpCredit) || 3.49,
    });
    setPosSaveMsg('¡Tasas de comisión de terminales POS TUU y Mercado Pago guardadas!');
    setTimeout(() => setPosSaveMsg(null), 3500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#0F1117] border border-zinc-800 rounded-2xl p-5 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-amber-500/10 text-amber-400 text-xs px-2.5 py-1 rounded-full font-semibold border border-amber-500/20 flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5 text-amber-400" />
              Configuración del Sistema
            </span>
            <span className="text-xs text-zinc-400">Edición en Frontend & Control de Accesos</span>
          </div>
          <h2 className="text-xl font-bold text-zinc-100 mt-1 tracking-tight">
            Configuración & Gestión de Usuarios (Clave 8 Dígitos)
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Administración de operadores con clave inicial 12345678, y edición de subcategorías de lavado, catálogo de tienda, tarifas y terminales POS.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-700 text-xs flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Usuario Activo: <b className="text-white">{currentUser.name}</b> ({currentUser.role})</span>
          </div>
        </div>
      </div>

      {/* Navigation Subtabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'users'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
        >
          <Users className="w-4 h-4" />
          Usuarios & Claves 8 Dígitos ({users.length})
        </button>

        <button
          onClick={() => setActiveTab('pos')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'pos'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Terminales POS & Comisiones
        </button>

        <button
          onClick={() => setActiveTab('wash')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'wash'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Subcategorías de Lavado ({washServices.length})
        </button>

        <button
          onClick={() => setActiveTab('shop')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'shop'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          Catálogo Tienda Accesorios ({accessoryProducts.length})
        </button>

        <button
          onClick={() => setActiveTab('tariffs')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'tariffs'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          Tarifas & Tramos Parking
        </button>

        <button
          onClick={() => setActiveTab('tax')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'tax'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
        >
          <Landmark className="w-4 h-4" />
          Parámetros Tributarios & Laborales
        </button>

        <button
          onClick={() => setActiveTab('backup')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'backup'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
        >
          <Database className="w-4 h-4" />
          Copias de Seguridad & Respaldo
        </button>
      </div>

      {/* TAB 1: USERS & 8-DIGIT PIN */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-zinc-900/60 p-4 rounded-xl border border-zinc-800">
            <div>
              <h3 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-400" />
                Seguridad de Acceso: Clave PIN de 8 Dígitos
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Todos los usuarios iniciales se configuran con la clave <b className="text-amber-300 font-mono">12345678</b> (dígitos del 1 al 8) y cada uno puede modificarla en cualquier momento.
              </p>
            </div>

            <button
              onClick={() => {
                setEditingUser(null);
                setUserName('');
                setUserUsername('');
                setUserRole('cajero');
                setUserEmail('');
                setUserPhone('');
                setUserPinInit('12345678');
                setIsUserModalOpen(true);
              }}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-3.5 py-2 rounded-xl font-bold text-xs shadow-md transition whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              Nuevo Operador
            </button>
          </div>

          {/* Users Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {users.map((u) => {
              const isCurrent = currentUser.id === u.id;
              return (
                <div
                  key={u.id}
                  className={`bg-[#0F1117] border rounded-2xl p-4 shadow-xl flex flex-col justify-between transition ${
                    isCurrent ? 'border-amber-500/60 ring-1 ring-amber-500/30' : 'border-zinc-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                        {u.role}
                      </span>
                      {isCurrent ? (
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-bold">
                          Activo Ahora
                        </span>
                      ) : (
                        <button
                          onClick={() => setCurrentUser(u)}
                          className="text-[10px] text-zinc-400 hover:text-amber-300 transition underline"
                        >
                          Cambiar a este usuario
                        </button>
                      )}
                    </div>

                    <h4 className="font-bold text-sm text-zinc-100 mt-2">{u.name}</h4>
                    <p className="text-xs text-zinc-400 font-mono">@{u.username}</p>

                    <div className="mt-3 bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500 font-medium">Clave 8 Dígitos:</span>
                        <span className="font-mono font-bold text-amber-400 tracking-wider">
                          •••••••• <span className="text-[10px] text-zinc-500">({u.pin ? u.pin.slice(0, 2) + '******' : '12345678'})</span>
                        </span>
                      </div>
                      {u.email && <div className="text-[11px] text-zinc-400 truncate">{u.email}</div>}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between">
                    <button
                      onClick={() => {
                        setSelectedUserForPin(u);
                        setNewPin('');
                        setConfirmPin('');
                        setPinError(null);
                        setPinSuccess(null);
                      }}
                      className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded-lg text-xs font-bold transition flex items-center gap-1 border border-amber-500/30"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      Modificar Clave
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingUser(u);
                          setUserName(u.name);
                          setUserUsername(u.username);
                          setUserRole(u.role);
                          setUserEmail(u.email || '');
                          setUserPhone(u.phone || '');
                          setIsUserModalOpen(true);
                        }}
                        className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition"
                        title="Editar Usuario"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {users.length > 1 && (
                        <button
                          onClick={() => {
                            if (window.confirm(`¿Eliminar usuario ${u.name}?`)) {
                              deleteUser(u.id);
                            }
                          }}
                          className="p-1.5 text-zinc-500 hover:text-rose-400 rounded hover:bg-zinc-800 transition"
                          title="Eliminar Usuario"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Modal to Change 8-Digit PIN */}
          {selectedUserForPin && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#0F1117] border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                    <KeyRound className="w-5 h-5 text-amber-400" />
                    Modificar Clave de 8 Dígitos
                  </h3>
                  <button
                    onClick={() => setSelectedUserForPin(null)}
                    className="text-zinc-400 hover:text-white text-lg leading-none"
                  >
                    ✕
                  </button>
                </div>

                <div className="text-xs text-zinc-400">
                  Usuario: <b className="text-white">{selectedUserForPin.name}</b> (@{selectedUserForPin.username})
                </div>

                {pinSuccess && (
                  <div className="p-3 bg-emerald-950/70 border border-emerald-500/50 rounded-xl text-emerald-300 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    {pinSuccess}
                  </div>
                )}

                {pinError && (
                  <div className="p-3 bg-rose-950/70 border border-rose-500/50 rounded-xl text-rose-300 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                    {pinError}
                  </div>
                )}

                <form onSubmit={handleChangePin} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">
                      Nueva Clave (Exactamente 8 Dígitos del 1 al 8 o números 0-9) *
                    </label>
                    <div className="relative">
                      <input
                        type={showPin ? 'text' : 'password'}
                        required
                        maxLength={8}
                        minLength={8}
                        pattern="\d{8}"
                        placeholder="Ej: 12345678"
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 font-mono text-base tracking-widest text-center text-amber-300 focus:outline-none focus:border-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPin(!showPin)}
                        className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-300"
                      >
                        {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <span className="text-[11px] text-zinc-500 mt-1 block text-center">
                      {newPin.length} / 8 dígitos ingresados
                    </span>
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">
                      Confirmar Nueva Clave (8 Dígitos) *
                    </label>
                    <input
                      type={showPin ? 'text' : 'password'}
                      required
                      maxLength={8}
                      minLength={8}
                      pattern="\d{8}"
                      placeholder="Repita los 8 dígitos"
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 font-mono text-base tracking-widest text-center text-amber-300 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Quick Preset: 12345678 */}
                  <div className="flex justify-between items-center bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800">
                    <span className="text-zinc-400 text-[11px]">Restablecer a defecto (1 al 8):</span>
                    <button
                      type="button"
                      onClick={() => {
                        setNewPin('12345678');
                        setConfirmPin('12345678');
                      }}
                      className="text-amber-400 hover:text-amber-300 font-mono font-bold text-[11px] underline"
                    >
                      Usar "12345678"
                    </button>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setSelectedUserForPin(null)}
                      className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={newPin.length !== 8}
                      className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold transition shadow-lg shadow-amber-600/30"
                    >
                      Guardar Clave de 8 Dígitos
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SUBCATEGORÍAS DE LAVADO */}
      {activeTab === 'wash' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-zinc-900/60 p-4 rounded-xl border border-zinc-800">
            <div>
              <h3 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                Edición de Subcategorías y Servicios de Lavado
              </h3>
              <p className="text-xs text-zinc-400">
                Agregue, edite precios y cambie duraciones de los servicios que se ofrecen en el túnel de lavado y portal QR.
              </p>
            </div>

            <button
              onClick={() => {
                setEditingWash(null);
                setWashName('');
                setWashDescription('');
                setWashPrice('8000');
                setWashDuration('30');
                setWashCategory('completo');
                setIsWashModalOpen(true);
              }}
              className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-3.5 py-2 rounded-xl font-bold text-xs shadow-md transition whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              Nuevo Servicio de Lavado
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {washServices.map((w) => (
              <div key={w.id} className="bg-[#0F1117] border border-zinc-800 rounded-2xl p-4 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                      {w.category}
                    </span>
                    <span className="text-xs text-zinc-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-400" />
                      {w.durationMinutes} min
                    </span>
                  </div>

                  <h4 className="font-bold text-sm text-zinc-100 mt-2">{w.name}</h4>
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{w.description}</p>

                  <div className="mt-3 text-lg font-mono font-bold text-emerald-400">
                    {formatCLP(w.price)}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-800 flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setEditingWash(w);
                      setWashName(w.name);
                      setWashDescription(w.description);
                      setWashPrice(String(w.price));
                      setWashDuration(String(w.durationMinutes));
                      setWashCategory(w.category);
                      setIsWashModalOpen(true);
                    }}
                    className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                  >
                    <Edit2 className="w-3 h-3" /> Editar
                  </button>

                  <button
                    onClick={() => {
                      if (window.confirm(`¿Eliminar servicio "${w.name}"?`)) {
                        deleteWashService(w.id);
                      }
                    }}
                    className="p-1.5 text-zinc-500 hover:text-rose-400 rounded hover:bg-zinc-800 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: CATÁLOGO TIENDA ACCESORIOS */}
      {activeTab === 'shop' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-zinc-900/60 p-4 rounded-xl border border-zinc-800">
            <div>
              <h3 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-amber-400" />
                Edición de Subcategorías y Artículos de la Tienda
              </h3>
              <p className="text-xs text-zinc-400">
                Administre los artículos disponibles para compra anticipada o en caja (aromatizantes, paños, siliconas, etc.).
              </p>
            </div>

            <button
              onClick={() => {
                setEditingProd(null);
                setProdName('');
                setProdDescription('');
                setProdCategory(ACCESSORY_CATEGORIES[0]);
                setProdPrice('2990');
                setProdStock('15');
                setIsShopModalOpen(true);
              }}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-3.5 py-2 rounded-xl font-bold text-xs shadow-md transition whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              Nuevo Artículo Tienda
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {accessoryProducts.map((p) => (
              <div key={p.id} className="bg-[#0F1117] border border-zinc-800 rounded-2xl p-4 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                      {p.category}
                    </span>
                    <span className="text-xs font-bold text-zinc-300">
                      Stock: <b className={p.stock < 5 ? 'text-rose-400' : 'text-emerald-400'}>{p.stock}</b>
                    </span>
                  </div>

                  <h4 className="font-bold text-sm text-zinc-100 mt-2">{p.name}</h4>
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{p.description}</p>

                  <div className="mt-3 text-base font-mono font-bold text-amber-400">
                    {formatCLP(p.price)}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-800 flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setEditingProd(p);
                      setProdName(p.name);
                      setProdDescription(p.description);
                      setProdCategory(p.category);
                      setProdPrice(String(p.price));
                      setProdStock(String(p.stock));
                      setIsShopModalOpen(true);
                    }}
                    className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                  >
                    <Edit2 className="w-3 h-3" /> Editar
                  </button>

                  <button
                    onClick={() => {
                      if (window.confirm(`¿Eliminar producto "${p.name}"?`)) {
                        deleteAccessoryProduct(p.id);
                      }
                    }}
                    className="p-1.5 text-zinc-500 hover:text-rose-400 rounded hover:bg-zinc-800 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: TARIFAS PARKING */}
      {activeTab === 'tariffs' && (
        <div className="max-w-xl mx-auto bg-[#0F1117] border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-6">
          <div className="border-b border-zinc-800 pb-4">
            <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-400" />
              Parámetros de Cobro por Tramos (Parking)
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Configure los minutos y precios del tramo inicial y los tramos subsecuentes fraccionados.
            </p>
          </div>

          {tariffSaveMsg && (
            <div className="p-3 bg-emerald-950/70 border border-emerald-500/50 rounded-xl text-emerald-300 text-xs font-semibold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              {tariffSaveMsg}
            </div>
          )}

          <form onSubmit={handleSaveTariffs} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-zinc-300 mb-1">Minutos Tramo Base Inicial</label>
                <input
                  type="number"
                  required
                  value={baseTierMinutes}
                  onChange={(e) => setBaseTierMinutes(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 font-mono text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-300 mb-1">Precio Tramo Base ($ CLP)</label>
                <input
                  type="number"
                  required
                  value={baseTierCost}
                  onChange={(e) => setBaseTierCost(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 font-mono text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-zinc-300 mb-1">Minutos Tramo Extra Adicional</label>
                <input
                  type="number"
                  required
                  value={extraTierMinutes}
                  onChange={(e) => setExtraTierMinutes(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 font-mono text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-300 mb-1">Precio Tramo Extra ($ CLP)</label>
                <input
                  type="number"
                  required
                  value={extraTierCost}
                  onChange={(e) => setExtraTierCost(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 font-mono text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-zinc-300 mb-1">Umbral Visitas Cliente Frecuente</label>
                <input
                  type="number"
                  required
                  value={frequentThreshold}
                  onChange={(e) => setFrequentThreshold(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 font-mono text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-300 mb-1">Descuento Cliente Frecuente (%)</label>
                <input
                  type="number"
                  required
                  value={frequentDiscount}
                  onChange={(e) => setFrequentDiscount(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 font-mono text-white"
                />
              </div>
            </div>

            {/* Valet Parking Configuration Card */}
            <div className="bg-gradient-to-r from-amber-950/40 via-zinc-900 to-zinc-950 border border-amber-500/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-zinc-200">Servicio de Valet Parking (Aparcacoches)</span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={valetEnabled}
                    onChange={(e) => setValetEnabled(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 bg-zinc-900 border-zinc-700"
                  />
                  <span className="text-[11px] text-zinc-300 font-medium">Habilitado</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block font-bold text-zinc-300 mb-1">Tarifa por Vehículo ($ CLP)</label>
                  <input
                    type="number"
                    required
                    value={valetPrice}
                    onChange={(e) => setValetPrice(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 font-mono text-amber-300 font-bold"
                  />
                </div>
                <div className="flex flex-col justify-end text-[10px] text-zinc-400">
                  <p>
                    Monto adicional fijo que se añade al ticket cuando el cliente solicita o se le presta servicio de custodia y valet parking.
                  </p>
                </div>
              </div>
            </div>

            {/* SECCIÓN PLANES DE ARRIENDO MENSUAL Y SEMANAL */}
            <div className="border-t border-zinc-800 pt-5 space-y-4">
              <div>
                <h4 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-400" />
                  Planes de Arriendo (Tarifas, Horarios y Descripciones)
                </h4>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Personalice los precios y horarios de los contratos de estacionamiento mensual y semanal.
                </p>
              </div>

              {/* Plan 1: Diurno */}
              <div className="bg-zinc-950/80 border border-amber-500/20 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center gap-2 font-bold text-amber-300 text-xs">
                  <Sun className="w-4 h-4" />
                  <span>Plan Diurno (Comercial / Oficina)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 text-[10px] font-semibold mb-1">Precio Mensual ($ CLP)</label>
                    <input
                      type="number"
                      required
                      value={dayPlanPrice}
                      onChange={(e) => setDayPlanPrice(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2 font-mono text-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[10px] font-semibold mb-1">Horario del Plan</label>
                    <input
                      type="text"
                      required
                      placeholder="08:00 a 20:00 hrs"
                      value={dayPlanSchedule}
                      onChange={(e) => setDayPlanSchedule(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2 text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-zinc-400 text-[10px] font-semibold mb-1">Descripción / Condiciones</label>
                  <input
                    type="text"
                    value={dayPlanDescription}
                    onChange={(e) => setDayPlanDescription(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2 text-zinc-300 text-[11px]"
                    placeholder="Arriendo de uso comercial diurno"
                  />
                </div>
              </div>

              {/* Plan 2: Nocturno */}
              <div className="bg-zinc-950/80 border border-indigo-500/20 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center gap-2 font-bold text-indigo-300 text-xs">
                  <Moon className="w-4 h-4" />
                  <span>Plan Nocturno (Custodia Segura)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 text-[10px] font-semibold mb-1">Precio Mensual ($ CLP)</label>
                    <input
                      type="number"
                      required
                      value={nightPlanPrice}
                      onChange={(e) => setNightPlanPrice(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2 font-mono text-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[10px] font-semibold mb-1">Horario del Plan</label>
                    <input
                      type="text"
                      required
                      placeholder="20:00 a 08:00 hrs"
                      value={nightPlanSchedule}
                      onChange={(e) => setNightPlanSchedule(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2 text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-zinc-400 text-[10px] font-semibold mb-1">Descripción / Condiciones</label>
                  <input
                    type="text"
                    value={nightPlanDescription}
                    onChange={(e) => setNightPlanDescription(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2 text-zinc-300 text-[11px]"
                    placeholder="Custodia nocturna protegida con portón y cámaras"
                  />
                </div>
              </div>

              {/* Plan 3: 24/7 Completo */}
              <div className="bg-zinc-950/80 border border-emerald-500/20 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center gap-2 font-bold text-emerald-300 text-xs">
                  <Clock className="w-4 h-4" />
                  <span>Plan Completo 24/7 (Acceso Continuo)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 text-[10px] font-semibold mb-1">Precio Mensual ($ CLP)</label>
                    <input
                      type="number"
                      required
                      value={fullPlanPrice}
                      onChange={(e) => setFullPlanPrice(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2 font-mono text-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[10px] font-semibold mb-1">Horario del Plan</label>
                    <input
                      type="text"
                      required
                      placeholder="24 Horas / Lunes a Domingo"
                      value={fullPlanSchedule}
                      onChange={(e) => setFullPlanSchedule(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2 text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-zinc-400 text-[10px] font-semibold mb-1">Descripción / Condiciones</label>
                  <input
                    type="text"
                    value={fullPlanDescription}
                    onChange={(e) => setFullPlanDescription(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2 text-zinc-300 text-[11px]"
                    placeholder="Acceso ilimitado 24/7 sin restricción horaria"
                  />
                </div>
              </div>

              {/* Plan 4: Semanal */}
              <div className="bg-zinc-950/80 border border-cyan-500/20 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center gap-2 font-bold text-cyan-300 text-xs">
                  <Calendar className="w-4 h-4" />
                  <span>Plan Semanal (7 Días Continuos)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 text-[10px] font-semibold mb-1">Precio Semanal ($ CLP)</label>
                    <input
                      type="number"
                      required
                      value={weeklyPlanPrice}
                      onChange={(e) => setWeeklyPlanPrice(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2 font-mono text-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[10px] font-semibold mb-1">Horario del Plan</label>
                    <input
                      type="text"
                      required
                      placeholder="7 Días Continuos (24 Horas)"
                      value={weeklyPlanSchedule}
                      onChange={(e) => setWeeklyPlanSchedule(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2 text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-zinc-400 text-[10px] font-semibold mb-1">Descripción / Condiciones</label>
                  <input
                    type="text"
                    value={weeklyPlanDescription}
                    onChange={(e) => setWeeklyPlanDescription(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2 text-zinc-300 text-[11px]"
                    placeholder="Tarifa plana semanal para estadías temporales"
                  />
                </div>
              </div>

              {/* Horario General Garita */}
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5 space-y-2">
                <span className="font-bold text-zinc-300 text-xs block">
                  Horario de Atención General de la Garita / Parking
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 text-[10px] mb-1">Hora de Apertura</label>
                    <input
                      type="time"
                      value={operatingStart}
                      onChange={(e) => setOperatingStart(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-2 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[10px] mb-1">Hora de Cierre</label>
                    <input
                      type="time"
                      value={operatingEnd}
                      onChange={(e) => setOperatingEnd(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-2 text-white font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              Guardar Tarifas, Planes y Horarios
            </button>
          </form>
        </div>
      )}

      {/* TAB 5: PARÁMETROS TRIBUTARIOS & LABORALES */}
      {activeTab === 'tax' && (
        <div className="max-w-xl mx-auto bg-[#0F1117] border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-6">
          <div className="border-b border-zinc-800 pb-4">
            <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
              <Landmark className="w-5 h-5 text-cyan-400" />
              Parámetros Tributarios y Laborales de Chile
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Valores oficiales de tasas de impuestos (SII) y sueldo mínimo legal.
            </p>
          </div>

          {taxSaveMsg && (
            <div className="p-3 bg-emerald-950/70 border border-emerald-500/50 rounded-xl text-emerald-300 text-xs font-semibold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              {taxSaveMsg}
            </div>
          )}

          <form onSubmit={handleSaveTax} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-zinc-300 mb-1">Tasa IVA General (%)</label>
                <input
                  type="number"
                  step={0.1}
                  required
                  value={ivaRate}
                  onChange={(e) => setIvaRate(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 font-mono text-white"
                />
                <span className="text-[10px] text-zinc-500">Tasa legal en Chile: 19%</span>
              </div>

              <div>
                <label className="block font-bold text-zinc-300 mb-1">Tasa PPM ProPyme (%)</label>
                <input
                  type="number"
                  step={0.1}
                  required
                  value={ppmRate}
                  onChange={(e) => setPpmRate(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 font-mono text-white"
                />
                <span className="text-[10px] text-zinc-500">Pago Provisional Mensual (1.5% - 2.5%)</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-zinc-300 mb-1">Retención Honorarios (%)</label>
                <input
                  type="number"
                  step={0.05}
                  required
                  value={retencionRate}
                  onChange={(e) => setRetencionRate(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 font-mono text-white"
                />
                <span className="text-[10px] text-zinc-500">Tasa año 2026: 13.75% / 14.5%</span>
              </div>

              <div>
                <label className="block font-bold text-zinc-300 mb-1">Ingreso Mínimo Mensual ($ CLP)</label>
                <input
                  type="number"
                  required
                  value={minWage}
                  onChange={(e) => setMinWage(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 font-mono text-white"
                />
                <span className="text-[10px] text-zinc-500">Base para tope de gratificación 4.75 IMM</span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-cyan-600/30 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              Guardar Parámetros de Chile
            </button>
          </form>
        </div>
      )}

      {/* TAB 6: TERMINALES POS & COMISIONES */}
      {activeTab === 'pos' && (
        <div className="max-w-3xl mx-auto bg-[#0F1117] border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-6">
          <div className="border-b border-zinc-800 pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-400" />
                Configuración de Terminales POS (TUU & Mercado Pago)
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Configure los porcentajes de comisión retenidos por los proveedores del POS. El sistema los deduce automáticamente en cada cobro con débito/crédito y exige el código de autorización del voucher.
              </p>
            </div>
          </div>

          {posSaveMsg && (
            <div className="p-3 bg-emerald-950/70 border border-emerald-500/50 rounded-xl text-emerald-300 text-xs font-semibold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              {posSaveMsg}
            </div>
          )}

          <form onSubmit={handleSavePos} className="space-y-6 text-xs">
            {/* Operator 1: TUU (Redelcom) */}
            <div className="bg-[#121629] border border-cyan-500/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                  <span className="font-bold text-sm text-cyan-300">Terminal POS TUU (Redelcom)</span>
                </div>
                <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
                  Comisión Operador A
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-zinc-300 mb-1">
                    Comisión Débito Redcompra (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step={0.01}
                      required
                      value={posTuuDebit}
                      onChange={(e) => setPosTuuDebit(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 font-mono text-white pr-8 focus:outline-none focus:border-cyan-500"
                    />
                    <span className="absolute right-3 top-2.5 text-zinc-400 font-bold">%</span>
                  </div>
                  <span className="text-[10px] text-zinc-400 mt-1 block">
                    Tasa estándar TUU Débito: ~1.49% + IVA
                  </span>
                </div>

                <div>
                  <label className="block font-bold text-zinc-300 mb-1">
                    Comisión Crédito (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step={0.01}
                      required
                      value={posTuuCredit}
                      onChange={(e) => setPosTuuCredit(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 font-mono text-white pr-8 focus:outline-none focus:border-cyan-500"
                    />
                    <span className="absolute right-3 top-2.5 text-zinc-400 font-bold">%</span>
                  </div>
                  <span className="text-[10px] text-zinc-400 mt-1 block">
                    Tasa estándar TUU Crédito: ~2.19% + IVA
                  </span>
                </div>
              </div>
            </div>

            {/* Operator 2: Mercado Pago (Point) */}
            <div className="bg-[#121629] border border-sky-500/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-sky-500/20 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                  <span className="font-bold text-sm text-sky-300">Terminal POS MERCADO PAGO (Point)</span>
                </div>
                <span className="bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
                  Comisión Operador B
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-zinc-300 mb-1">
                    Comisión Débito Mercado Pago (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step={0.01}
                      required
                      value={posMpDebit}
                      onChange={(e) => setPosMpDebit(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 font-mono text-white pr-8 focus:outline-none focus:border-sky-500"
                    />
                    <span className="absolute right-3 top-2.5 text-zinc-400 font-bold">%</span>
                  </div>
                  <span className="text-[10px] text-zinc-400 mt-1 block">
                    Tasa estándar Mercado Pago Débito: ~2.95% + IVA
                  </span>
                </div>

                <div>
                  <label className="block font-bold text-zinc-300 mb-1">
                    Comisión Crédito Mercado Pago (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step={0.01}
                      required
                      value={posMpCredit}
                      onChange={(e) => setPosMpCredit(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 font-mono text-white pr-8 focus:outline-none focus:border-sky-500"
                    />
                    <span className="absolute right-3 top-2.5 text-zinc-400 font-bold">%</span>
                  </div>
                  <span className="text-[10px] text-zinc-400 mt-1 block">
                    Tasa estándar Mercado Pago Crédito: ~3.49% + IVA
                  </span>
                </div>
              </div>
            </div>

            {/* Validation Rule Notice */}
            <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-xl p-3.5 text-zinc-300 text-xs flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block font-semibold mb-0.5">
                  Regla de Seguridad & Voucher de Autorización:
                </strong>
                Al procesar cobros con tarjeta de débito o crédito en Checkout de Vehículos o Tienda de Accesorios, el sistema exige obligatoriamente seleccionar el terminal físico (Tuu o Mercado Pago) e ingresar los dígitos del código de autorización que figura en el ticket/voucher impreso por el POS antes de completar la transacción.
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              Guardar Tasas de Comisiones POS
            </button>
          </form>
        </div>
      )}

      {/* TAB 7: BACKUP & DATA RECOVERY */}
      {activeTab === 'backup' && (
        <div className="space-y-6">
          {/* Status Feedback Banner */}
          {backupStatusMsg && (
            <div
              className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-3 border ${
                backupStatusMsg.type === 'success'
                  ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300'
                  : 'bg-rose-950/70 border-rose-500/50 text-rose-300'
              }`}
            >
              {backupStatusMsg.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
              )}
              <span>{backupStatusMsg.text}</span>
            </div>
          )}

          {/* Assistant for "Mis datos se borraron, ¿qué hago?" */}
          <div className="bg-gradient-to-r from-emerald-950/60 to-zinc-900 border border-emerald-500/40 rounded-2xl p-5 shadow-xl">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold border border-emerald-500/40">
                  <Database className="w-3.5 h-3.5" />
                  Centro de Recuperación & Respaldo
                </div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  ¿Se te borraron los datos o cambiaste de equipo?
                </h3>
                <p className="text-xs text-zinc-300 max-w-2xl leading-relaxed">
                  Tus datos en Bamo Garage SpA cuentan con triple capa de protección: sincronización en tiempo real con la nube Firestore, puntos de restauración automáticos locales y descargas de respaldo JSON.
                </p>
              </div>

              <div className="flex flex-wrap gap-2.5">
                <button
                  onClick={downloadBackupFile}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition"
                >
                  <Download className="w-4 h-4" />
                  Descargar Copia (.JSON)
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-xl font-bold text-xs border border-zinc-700 flex items-center gap-2 transition"
                >
                  <Upload className="w-4 h-4 text-amber-400" />
                  Restaurar desde Archivo (.JSON)
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      try {
                        const parsed = JSON.parse(event.target?.result as string);
                        const res = restoreFromBackupData(parsed);
                        if (res.success) {
                          setBackupStatusMsg({ type: 'success', text: res.message });
                        } else {
                          setBackupStatusMsg({ type: 'error', text: res.message });
                        }
                      } catch (err: any) {
                        setBackupStatusMsg({
                          type: 'error',
                          text: `El archivo seleccionado no es un respaldo JSON válido: ${err.message}`,
                        });
                      }
                    };
                    reader.readAsText(file);
                    e.target.value = '';
                  }}
                />
              </div>
            </div>
          </div>

          {/* Cloud Synchronization Panel */}
          <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                    Sincronización en la Nube (Google Firebase Firestore)
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        cloudSyncStatus === 'connected'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : cloudSyncStatus === 'syncing'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {cloudSyncStatus === 'connected' && '● Conectado & Sincronizado'}
                      {cloudSyncStatus === 'syncing' && '● Sincronizando datos...'}
                      {cloudSyncStatus === 'offline' && '● Sin conexión local'}
                      {cloudSyncStatus === 'error' && '● Error de red'}
                    </span>
                  </h4>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Base de datos centralizada de Bamo Garage SpA para que todos los dispositivos compartan vehículos, tickets y cajas en tiempo real.
                  </p>
                </div>
              </div>

              <button
                disabled={isSyncingCloud}
                onClick={async () => {
                  setIsSyncingCloud(true);
                  const res = await forceCloudSync();
                  setIsSyncingCloud(false);
                  setBackupStatusMsg({
                    type: res.success ? 'success' : 'error',
                    text: res.message,
                  });
                }}
                className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 border border-zinc-700 whitespace-nowrap self-start sm:self-auto"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCloud ? 'animate-spin' : ''}`} />
                {isSyncingCloud ? 'Sincronizando...' : 'Forzar Sincronización Nube'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/80">
                <span className="text-zinc-500 block mb-1">Última Sincronización:</span>
                <span className="font-semibold text-zinc-200">
                  {lastCloudSyncTime ? lastCloudSyncTime.toLocaleTimeString('es-CL') : 'Al iniciar la sesión'}
                </span>
              </div>
              <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/80">
                <span className="text-zinc-500 block mb-1">Identificador de Empresa:</span>
                <span className="font-mono font-semibold text-amber-300">Bamo Garage SpA (78.084.649-6)</span>
              </div>
              <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/80">
                <span className="text-zinc-500 block mb-1">Documento Central:</span>
                <span className="font-mono text-zinc-300 text-[11px]">garage_state/bamo_garage_main</span>
              </div>
            </div>
          </div>

          {/* Automatic Restore Points (Local Snapshots) */}
          <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                    Puntos de Restauración Automáticos (Historial Local)
                  </h4>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    El sistema registra automáticamente capturas de estado periódicas en la memoria del navegador para que puedas revertir a un momento anterior.
                  </p>
                </div>
              </div>
            </div>

            {autoSnapshots.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
                Los puntos de restauración automáticos se generarán conforme registres vehículos, lavados y ventas.
              </div>
            ) : (
              <div className="space-y-2.5">
                {autoSnapshots.map((snap, idx) => {
                  const date = new Date(snap.timestamp);
                  return (
                    <div
                      key={snap.id}
                      className="p-3.5 bg-zinc-950/70 border border-zinc-800 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-zinc-700 transition"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px] font-mono font-bold">
                            #{idx + 1}
                          </span>
                          <span className="text-xs font-semibold text-white">
                            {date.toLocaleDateString('es-CL', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })}{' '}
                            - {date.toLocaleTimeString('es-CL')}
                          </span>
                          {idx === 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                              Más reciente
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-400">{snap.summary}</p>
                      </div>

                      <button
                        onClick={() => {
                          if (
                            window.confirm(
                              `¿Deseas restaurar la información al estado del ${date.toLocaleDateString('es-CL')} ${date.toLocaleTimeString('es-CL')}?`
                            )
                          ) {
                            const res = restoreFromSnapshot(snap.id);
                            setBackupStatusMsg({
                              type: res.success ? 'success' : 'error',
                              text: res.message,
                            });
                          }
                        }}
                        className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <History className="w-3.5 h-3.5" />
                        Restaurar este punto
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Diagnostic & Education Guide */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <h4 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-cyan-400" />
              Guía Rápida: ¿Por qué pueden desaparecer datos y cómo evitarlo?
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 bg-zinc-950/60 rounded-xl border border-zinc-800 space-y-2">
                <div className="font-bold text-amber-300 flex items-center gap-1.5">
                  <span>1. Limpieza de Cookies / Caché</span>
                </div>
                <p className="text-zinc-400 leading-relaxed">
                  Si utilizas la opción de «Borrar datos de navegación» de Google Chrome o Safari, la memoria local del navegador se reinicia. Puedes solucionarlo al instante recargando la página o cargando tu copia de seguridad JSON.
                </p>
              </div>

              <div className="p-4 bg-zinc-950/60 rounded-xl border border-zinc-800 space-y-2">
                <div className="font-bold text-cyan-300 flex items-center gap-1.5">
                  <span>2. Ventana de Modo Incógnito</span>
                </div>
                <p className="text-zinc-400 leading-relaxed">
                  Las pestañas privadas no guardan información al cerrarse. Usa siempre una pestaña normal en el navegador del estacionamiento para mantener todo grabado permanentemente.
                </p>
              </div>

              <div className="p-4 bg-zinc-950/60 rounded-xl border border-zinc-800 space-y-2">
                <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <span>3. Respaldo Semanal Recomendado</span>
                </div>
                <p className="text-zinc-400 leading-relaxed">
                  Te recomendamos hacer clic en <b>«Descargar Copia (.JSON)»</b> al finalizar la semana o cada cierre de mes para guardar un archivo seguro en tu computador o pendrive.
                </p>
              </div>
            </div>
          </div>

          {/* Danger Zone: Reset to Initial Data */}
          <div className="bg-rose-950/20 border border-rose-900/40 rounded-2xl p-5 space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-rose-300 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  Restablecer a Valores de Fábrica
                </h4>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Borra los registros creados y restablece la demostración con 10 puestos, servicios estándar y usuarios por defecto (PIN: 12345678).
                </p>
              </div>

              {!showResetConfirm ? (
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="px-3.5 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-bold transition whitespace-nowrap"
                >
                  Restablecer Valores
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    maxLength={8}
                    placeholder="PIN Admin (12345678)"
                    value={resetConfirmPin}
                    onChange={(e) => setResetConfirmPin(e.target.value)}
                    className="w-36 bg-zinc-900 border border-rose-500/50 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      if (resetConfirmPin === '12345678' || resetConfirmPin === currentUser.pin) {
                        resetToInitialData();
                        setShowResetConfirm(false);
                        setResetConfirmPin('');
                        setBackupStatusMsg({
                          type: 'success',
                          text: 'Se han restablecido los valores iniciales de fábrica de Bamo Garage SpA.',
                        });
                      } else {
                        alert('Clave PIN incorrecta para confirmar restablecimiento.');
                      }
                    }}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition"
                  >
                    Confirmar Reset
                  </button>
                  <button
                    onClick={() => {
                      setShowResetConfirm(false);
                      setResetConfirmPin('');
                    }}
                    className="px-2.5 py-1.5 text-zinc-400 hover:text-white text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: New / Edit User */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0F1117] border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                {editingUser ? 'Editar Usuario Operador' : 'Nuevo Usuario Operador'}
              </h3>
              <button
                onClick={() => setIsUserModalOpen(false)}
                className="text-zinc-400 hover:text-white text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-3">
              <div>
                <label className="block font-semibold text-zinc-300 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-white focus:border-amber-500 focus:outline-none"
                  placeholder="Ej: Marcelo Ríos"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-300 mb-1">Nombre de Usuario *</label>
                  <input
                    type="text"
                    required
                    value={userUsername}
                    onChange={(e) => setUserUsername(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 font-mono text-white focus:border-amber-500 focus:outline-none"
                    placeholder="mrios"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-300 mb-1">Rol / Perfil</label>
                  <select
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value as UserRole)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-white focus:border-amber-500 focus:outline-none"
                  >
                    <option value="admin">Administrador Total</option>
                    <option value="cajero">Cajero / Cobranza</option>
                    <option value="supervisor">Supervisor de Turno</option>
                    <option value="lavador">Jefe de Lavado</option>
                  </select>
                </div>
              </div>

              {!editingUser && (
                <div>
                  <label className="block font-semibold text-zinc-300 mb-1">Clave Inicial (8 Dígitos)</label>
                  <input
                    type="text"
                    maxLength={8}
                    minLength={8}
                    pattern="\d{8}"
                    value={userPinInit}
                    onChange={(e) => setUserPinInit(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 font-mono tracking-widest text-amber-400 focus:border-amber-500 focus:outline-none"
                    placeholder="12345678"
                  />
                  <span className="text-[10px] text-zinc-500">Por defecto: 12345678 (del 1 al 8)</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-300 mb-1">Email (Opcional)</label>
                  <input
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-white focus:border-amber-500 focus:outline-none"
                    placeholder="correo@autopark.cl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-300 mb-1">Teléfono</label>
                  <input
                    type="tel"
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-white focus:border-amber-500 focus:outline-none"
                    placeholder="+56 9 1234 5678"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold transition shadow-lg shadow-amber-600/30"
                >
                  Guardar Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New / Edit Wash Service */}
      {isWashModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0F1117] border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                {editingWash ? 'Editar Servicio de Lavado' : 'Nuevo Servicio de Lavado'}
              </h3>
              <button
                onClick={() => setIsWashModalOpen(false)}
                className="text-zinc-400 hover:text-white text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveWash} className="space-y-3">
              <div>
                <label className="block font-semibold text-zinc-300 mb-1">Nombre del Servicio *</label>
                <input
                  type="text"
                  required
                  value={washName}
                  onChange={(e) => setWashName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-white focus:border-cyan-500 focus:outline-none"
                  placeholder="Ej: Lavado Full Detailing + Encerado"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-300 mb-1">Descripción y Tratamientos</label>
                <textarea
                  rows={2}
                  value={washDescription}
                  onChange={(e) => setWashDescription(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-white focus:border-cyan-500 focus:outline-none"
                  placeholder="Detalle de los pasos incluidos..."
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-300 mb-1">Precio ($ CLP) *</label>
                  <input
                    type="number"
                    required
                    min={1000}
                    value={washPrice}
                    onChange={(e) => setWashPrice(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 font-mono text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-300 mb-1">Duración (min)</label>
                  <input
                    type="number"
                    required
                    min={5}
                    value={washDuration}
                    onChange={(e) => setWashDuration(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 font-mono text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-300 mb-1">Subcategoría</label>
                  <select
                    value={washCategory}
                    onChange={(e) => setWashCategory(e.target.value as any)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-white focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="exterior">Exterior</option>
                    <option value="interior">Interior</option>
                    <option value="completo">Completo</option>
                    <option value="detailing">Detailing</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsWashModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition shadow-lg shadow-cyan-600/30"
                >
                  Guardar Servicio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New / Edit Accessory Product */}
      {isShopModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0F1117] border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-amber-400" />
                {editingProd ? 'Editar Producto Tienda' : 'Nuevo Producto Tienda'}
              </h3>
              <button
                onClick={() => setIsShopModalOpen(false)}
                className="text-zinc-400 hover:text-white text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProd} className="space-y-3">
              <div>
                <label className="block font-semibold text-zinc-300 mb-1">Nombre del Producto *</label>
                <input
                  type="text"
                  required
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-white focus:border-amber-500 focus:outline-none"
                  placeholder="Ej: Aromatizante Little Trees Vainilla"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-300 mb-1">Subcategoría</label>
                  <select
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value as AccessoryCategory)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-white focus:border-amber-500 focus:outline-none"
                  >
                    {ACCESSORY_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-zinc-300 mb-1">Precio ($ CLP) *</label>
                  <input
                    type="number"
                    required
                    min={100}
                    value={prodPrice}
                    onChange={(e) => setProdPrice(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 font-mono text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-zinc-300 mb-1">Stock Disponible</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={prodStock}
                  onChange={(e) => setProdStock(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 font-mono text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-300 mb-1">Descripción</label>
                <textarea
                  rows={2}
                  value={prodDescription}
                  onChange={(e) => setProdDescription(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-white focus:border-amber-500 focus:outline-none"
                  placeholder="Detalles sobre presentación..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsShopModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold transition shadow-lg shadow-amber-600/30"
                >
                  Guardar Producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
