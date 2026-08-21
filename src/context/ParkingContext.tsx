import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import {
  ParkingSpot,
  Vehicle,
  WashService,
  WashOrder,
  AccessoryProduct,
  AccessorySale,
  AccessorySaleItem,
  MonthlyContract,
  ParkingSession,
  ParkingSettings,
  PaymentMethod,
  WashStatus,
  BehaviorRating,
  BehaviorNote,
  BusinessExpense,
  Employee,
  PayrollSettlement,
  AppUser,
  CashRegisterOpeningRecord,
  CashRegisterCloseRecord,
  POSTerminalProvider,
  AutoSnapshot,
  ReconciliationStatus,
  VIPPaymentRecord,
  UnifiedTransaction,
} from '../types';
import {
  INITIAL_SPOTS,
  INITIAL_VEHICLES,
  INITIAL_WASH_SERVICES,
  INITIAL_ACCESSORIES,
  INITIAL_MONTHLY_CONTRACTS,
  INITIAL_COMPLETED_SESSIONS,
  INITIAL_USERS,
  INITIAL_EMPLOYEES,
  INITIAL_EXPENSES,
} from '../data/initialData';
import {
  calculateParkingFee,
  DEFAULT_SETTINGS,
  calculateChileanPayroll,
  calculatePOSFee,
} from '../utils/pricing';

interface CheckInData {
  spotNumber: number;
  plate: string;
  brand: string;
  model: string;
  color: string;
  year?: number;
  clientName?: string;
  clientRut?: string;
  clientPhone?: string;
  clientEmail?: string;
  isVIP?: boolean;
  entryTime?: string; // Manual entry time
  isManualEntryTime?: boolean;
  washServiceId?: string;
  hasValetParking?: boolean;
  valetParkingFee?: number;
  valetDriver?: string;
  valetNotes?: string;
  notes?: string;
}

// Helper to sanitize payload for Firestore (stripping any undefined properties)
function sanitizeForFirestore<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

interface ParkingContextType {
  spots: ParkingSpot[];
  vehicles: Vehicle[];
  washServices: WashService[];
  washOrders: WashOrder[];
  accessoryProducts: AccessoryProduct[];
  accessorySales: AccessorySale[];
  monthlyContracts: MonthlyContract[];
  completedSessions: ParkingSession[];
  settings: ParkingSettings;
  simulatedMinutesAdded: number;
  currentTime: Date;

  // Cloud Firestore Real-time Multi-Device Sync
  isCloudSynced: boolean;
  cloudSyncStatus: 'connected' | 'syncing' | 'offline' | 'error';
  lastCloudSyncTime: Date | null;

  // Users & Access PIN 8 digits
  users: AppUser[];
  currentUser: AppUser;
  isAuthenticated: boolean;
  login: (usernameOrId: string, pin: string) => { success: boolean; message?: string };
  logout: () => void;
  lockSystem: () => void;
  setCurrentUser: (user: AppUser) => void;
  updateUserPin: (userId: string, newPin: string) => boolean;
  updateUser: (user: AppUser) => void;
  addUser: (user: Omit<AppUser, 'id' | 'createdAt'>) => AppUser;
  deleteUser: (id: string) => void;
  verifyUserPin: (userId: string, pin: string) => boolean;

  // Expenses & Daily Cash Register Opening/Closing
  expenses: BusinessExpense[];
  addExpense: (expense: Omit<BusinessExpense, 'id' | 'createdAt'>) => BusinessExpense;
  updateExpense: (id: string, updates: Partial<BusinessExpense>) => void;
  deleteExpense: (id: string) => void;
  isCashRegisterOpen: boolean;
  currentCashShift: CashRegisterOpeningRecord | null;
  openDailyCashRegister: (initialCash: number, cashierName: string, notes?: string) => CashRegisterOpeningRecord;
  cashRegisterClosures: CashRegisterCloseRecord[];
  closeCashRegister: (record: Omit<CashRegisterCloseRecord, 'id'>) => CashRegisterCloseRecord;
  openingCash: number;
  setOpeningCash: (amount: number) => void;

  // VIP Client & Tab Management
  markClientVIP: (plateOrRut: string, isVIP: boolean, creditLimit?: number) => void;
  vipPaymentRecords: VIPPaymentRecord[];
  payVIPAccumulatedBalance: (
    plateOrRut: string,
    amount: number,
    paymentMethod: PaymentMethod,
    posInfo?: { provider: POSTerminalProvider; authorizationCode: string },
    siiBoletaNumber?: string,
    transferVoucherNumber?: string
  ) => void;

  // Transaction Reconciliation Audit
  reconcileTransaction: (
    id: string,
    type: 'parking' | 'wash' | 'accessory' | 'contract' | 'vip_payment',
    status: ReconciliationStatus,
    notes?: string
  ) => void;
  batchReconcileTransactions: (
    items: { id: string; type: string }[],
    status: ReconciliationStatus,
    notes?: string
  ) => void;

  // Employees & Payroll (Chile)
  employees: Employee[];
  addEmployee: (emp: Omit<Employee, 'id'>) => Employee;
  updateEmployee: (id: string, updates: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;
  payrollSettlements: PayrollSettlement[];
  generatePayrollSettlement: (params: {
    employeeId: string;
    month: string;
    overtimeHours?: number;
    bonuses?: number;
    otherDeductions?: number;
    paymentMethod: PaymentMethod;
  }) => PayrollSettlement;
  markPayrollPaid: (id: string) => void;

  // Client Behavior Notes
  addVehicleBehaviorNote: (plate: string, note: Omit<BehaviorNote, 'id' | 'date'>) => void;
  updateVehicleBehaviorRating: (plate: string, rating: BehaviorRating) => void;

  // Frontend Configuration management
  updateSettings: (newSettings: Partial<ParkingSettings>) => void;
  addWashService: (service: Omit<WashService, 'id'>) => WashService;
  updateWashService: (service: WashService) => void;
  deleteWashService: (id: string) => void;
  addAccessoryProduct: (product: Omit<AccessoryProduct, 'id'>) => AccessoryProduct;
  updateAccessoryProduct: (product: AccessoryProduct) => void;
  saveAccessoryProduct: (product: AccessoryProduct) => void;
  deleteAccessoryProduct: (id: string) => void;

  // Actions
  checkInVehicle: (data: CheckInData) => ParkingSession;
  checkOutVehicle: (
    spotNumber: number,
    paymentMethod: PaymentMethod,
    posInfo?: { provider: POSTerminalProvider; authorizationCode: string },
    customExitTime?: string,
    siiBoletaNumber?: string,
    transferVoucherNumber?: string
  ) => ParkingSession | null;
  updateActiveSpotSession: (
    currentSpotNumber: number,
    updates: {
      targetSpotNumber?: number;
      plate?: string;
      brand?: string;
      model?: string;
      color?: string;
      year?: number;
      clientName?: string;
      clientRut?: string;
      clientPhone?: string;
      clientEmail?: string;
      entryTime?: string;
      isManualEntryTime?: boolean;
      isVIP?: boolean;
      hasValetParking?: boolean;
      valetParkingFee?: number;
      valetDriver?: string;
      notes?: string;
    }
  ) => { success: boolean; message: string };
  cancelActiveSpotSession: (spotNumber: number, adminPinOrBypass?: string) => { success: boolean; message: string };
  toggleSpotValetParking: (
    spotNumber: number,
    options?: { enabled?: boolean; fee?: number; notes?: string; driver?: string }
  ) => void;
  addWashOrder: (order: Omit<WashOrder, 'id' | 'requestedAt'>) => WashOrder;
  requestCustomerWashOrder: (spotNumber: number, serviceId: string, notes?: string) => WashOrder | null;
  updateWashStatus: (orderId: string, status: WashStatus, washerName?: string) => void;
  sellAccessories: (
    items: AccessorySaleItem[],
    paymentMethod: PaymentMethod,
    spotNumber?: number,
    clientName?: string,
    posInfo?: { provider: POSTerminalProvider; authorizationCode: string },
    siiBoletaNumber?: string,
    transferVoucherNumber?: string
  ) => void;
  requestCustomerAccessories: (spotNumber: number, items: AccessorySaleItem[], notes?: string) => boolean;
  createMonthlyContract: (contract: Omit<MonthlyContract, 'id' | 'contractNumber'>) => MonthlyContract;
  updateMonthlyContract: (id: string, updates: Partial<MonthlyContract>) => void;
  deleteMonthlyContract: (contractId: string, adminPinOrBypass?: string) => { success: boolean; message: string };
  saveVehicle: (vehicle: Vehicle) => void;
  getVehicleByPlate: (plate: string) => Vehicle | undefined;
  advanceTime: (minutes: number) => void;
  resetTime: () => void;
  resetToInitialData: () => void;
  getSpotSession: (spotNumber: number) => ParkingSession | undefined;
  
  // Backup & Recovery
  autoSnapshots: AutoSnapshot[];
  exportBackupData: () => any;
  downloadBackupFile: () => void;
  restoreFromBackupData: (backupObj: any) => { success: boolean; message: string };
  restoreFromSnapshot: (snapshotId: string) => { success: boolean; message: string };
  forceCloudSync: () => Promise<{ success: boolean; message: string }>;
}

const ParkingContext = createContext<ParkingContextType | undefined>(undefined);

const STORAGE_KEYS = {
  SPOTS: 'parking_app_spots_v3_prod',
  VEHICLES: 'parking_app_vehicles_v3_prod',
  WASH_SERVICES: 'parking_app_wash_services_v3_prod',
  WASH_ORDERS: 'parking_app_wash_orders_v3_prod',
  ACCESSORIES: 'parking_app_accessories_v3_prod',
  SALES: 'parking_app_sales_v3_prod',
  CONTRACTS: 'parking_app_contracts_v3_prod',
  SESSIONS_HIST: 'parking_app_hist_sessions_v3_prod',
  SETTINGS: 'parking_app_settings_v3_prod',
  USERS: 'parking_app_users_v3_prod',
  ACTIVE_USER: 'parking_app_active_user_v3_prod',
  AUTH_STATE: 'parking_app_auth_state_v3_prod',
  EXPENSES: 'parking_app_expenses_v3_prod',
  EMPLOYEES: 'parking_app_employees_v3_prod',
  PAYROLL: 'parking_app_payroll_v3_prod',
  CASH_CLOSURES: 'parking_app_cash_closures_v3_prod',
  OPENING_CASH: 'parking_app_opening_cash_v3_prod',
  CASH_SHIFT: 'parking_app_cash_shift_v3_prod',
  VIP_PAYMENTS: 'parking_app_vip_payments_v3_prod',
  SNAPSHOTS: 'bamo_auto_snapshots_history_v1',
};

export const ParkingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [spots, setSpots] = useState<ParkingSpot[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SPOTS);
    return saved ? JSON.parse(saved) : INITIAL_SPOTS;
  });

  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.VEHICLES);
    return saved ? JSON.parse(saved) : INITIAL_VEHICLES;
  });

  const [washServices, setWashServices] = useState<WashService[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.WASH_SERVICES);
    return saved ? JSON.parse(saved) : INITIAL_WASH_SERVICES;
  });

  const [washOrders, setWashOrders] = useState<WashOrder[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.WASH_ORDERS);
    if (saved) return JSON.parse(saved);
    const orders: WashOrder[] = [];
    INITIAL_SPOTS.forEach((s) => {
      if (s.currentSession?.washOrders) {
        orders.push(...s.currentSession.washOrders);
      }
    });
    return orders;
  });

  const [accessoryProducts, setAccessoryProducts] = useState<AccessoryProduct[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ACCESSORIES);
    return saved ? JSON.parse(saved) : INITIAL_ACCESSORIES;
  });

  const [accessorySales, setAccessorySales] = useState<AccessorySale[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SALES);
    return saved ? JSON.parse(saved) : [];
  });

  const [monthlyContracts, setMonthlyContracts] = useState<MonthlyContract[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CONTRACTS);
    return saved ? JSON.parse(saved) : INITIAL_MONTHLY_CONTRACTS;
  });

  const [completedSessions, setCompletedSessions] = useState<ParkingSession[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SESSIONS_HIST);
    return saved ? JSON.parse(saved) : INITIAL_COMPLETED_SESSIONS;
  });

  const [vipPaymentRecords, setVipPaymentRecords] = useState<VIPPaymentRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.VIP_PAYMENTS);
    return saved ? JSON.parse(saved) : [];
  });

  const [settings, setSettings] = useState<ParkingSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  });

  // Users with 8-digit PIN (default "12345678")
  const [users, setUsers] = useState<AppUser[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USERS);
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

  const [currentUser, setCurrentUser] = useState<AppUser>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_USER);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_USERS[0];
      }
    }
    return INITIAL_USERS[0];
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.AUTH_STATE);
    return saved === 'true';
  });

  // Expenses & Cash register
  const [expenses, setExpenses] = useState<BusinessExpense[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.EXPENSES);
    return saved ? JSON.parse(saved) : INITIAL_EXPENSES;
  });

  const [openingCash, setOpeningCash] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.OPENING_CASH);
    return saved ? Number(saved) : 50000;
  });

  const [cashRegisterClosures, setCashRegisterClosures] = useState<CashRegisterCloseRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CASH_CLOSURES);
    return saved ? JSON.parse(saved) : [];
  });

  const [currentCashShift, setCurrentCashShift] = useState<CashRegisterOpeningRecord | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CASH_SHIFT);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.status === 'open') return parsed;
      } catch {
        return null;
      }
    }
    return {
      id: 'shift_default',
      date: new Date().toISOString().split('T')[0],
      openedAt: new Date().toISOString(),
      cashierName: 'Administrador Principal',
      initialCash: 50000,
      status: 'open',
    };
  });

  const isCashRegisterOpen = currentCashShift?.status === 'open';

  // Employees & Payroll
  const [employees, setEmployees] = useState<Employee[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
    return saved ? JSON.parse(saved) : INITIAL_EMPLOYEES;
  });

  const [payrollSettlements, setPayrollSettlements] = useState<PayrollSettlement[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PAYROLL);
    return saved ? JSON.parse(saved) : [];
  });

  // Auto Snapshots for instant recovery
  const [autoSnapshots, setAutoSnapshots] = useState<AutoSnapshot[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SNAPSHOTS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Cloud Firestore Sync State
  const [isCloudSynced, setIsCloudSynced] = useState<boolean>(true);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'connected' | 'syncing' | 'offline' | 'error'>('connected');
  const [lastCloudSyncTime, setLastCloudSyncTime] = useState<Date | null>(null);
  const isIncomingCloudUpdate = useRef<boolean>(false);
  const isInitialCloudLoadComplete = useRef<boolean>(false);

  const [simulatedMinutesAdded, setSimulatedMinutesAdded] = useState<number>(0);
  const [baseCurrentTime, setBaseCurrentTime] = useState<Date>(new Date());

  // Real-time ticking every second
  useEffect(() => {
    const interval = setInterval(() => {
      setBaseCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const currentTime = new Date(baseCurrentTime.getTime() + simulatedMinutesAdded * 60000);

  // Real-time listener: Multi-device instant synchronization via Firebase Firestore
  useEffect(() => {
    try {
      const liveDocRef = doc(db, 'garage_state', 'bamo_garage_main');
      const unsubscribe = onSnapshot(
        liveDocRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            if (data) {
              isIncomingCloudUpdate.current = true;
              if (Array.isArray(data.spots)) setSpots(data.spots);
              if (Array.isArray(data.vehicles)) setVehicles(data.vehicles);
              if (Array.isArray(data.washServices)) setWashServices(data.washServices);
              if (Array.isArray(data.washOrders)) setWashOrders(data.washOrders);
              if (Array.isArray(data.accessoryProducts)) setAccessoryProducts(data.accessoryProducts);
              if (Array.isArray(data.accessorySales)) setAccessorySales(data.accessorySales);
              if (Array.isArray(data.monthlyContracts)) setMonthlyContracts(data.monthlyContracts);
              if (Array.isArray(data.completedSessions)) setCompletedSessions(data.completedSessions);
              if (Array.isArray(data.vipPaymentRecords)) setVipPaymentRecords(data.vipPaymentRecords);
              if (data.settings) setSettings((prev) => ({ ...prev, ...data.settings }));
              if (Array.isArray(data.users) && data.users.length > 0) setUsers(data.users);
              if (Array.isArray(data.expenses)) setExpenses(data.expenses);
              if (typeof data.openingCash === 'number') setOpeningCash(data.openingCash);
              if (Array.isArray(data.cashRegisterClosures)) setCashRegisterClosures(data.cashRegisterClosures);
              if (Array.isArray(data.employees)) setEmployees(data.employees);
              if (Array.isArray(data.payrollSettlements)) setPayrollSettlements(data.payrollSettlements);

              setIsCloudSynced(true);
              setCloudSyncStatus('connected');
              setLastCloudSyncTime(new Date());

              setTimeout(() => {
                isIncomingCloudUpdate.current = false;
                isInitialCloudLoadComplete.current = true;
              }, 300);
            }
          } else {
            // First-time database bootstrapping in Firestore
            setDoc(
              liveDocRef,
              sanitizeForFirestore({
                spots: INITIAL_SPOTS,
                vehicles: INITIAL_VEHICLES,
                washServices: INITIAL_WASH_SERVICES,
                washOrders: [],
                accessoryProducts: INITIAL_ACCESSORIES,
                accessorySales: [],
                monthlyContracts: INITIAL_MONTHLY_CONTRACTS,
                completedSessions: INITIAL_COMPLETED_SESSIONS,
                vipPaymentRecords: [],
                settings: DEFAULT_SETTINGS,
                users: INITIAL_USERS,
                expenses: INITIAL_EXPENSES,
                openingCash: 50000,
                cashRegisterClosures: [],
                employees: INITIAL_EMPLOYEES,
                payrollSettlements: [],
                lastUpdatedAt: new Date().toISOString(),
              })
            )
              .then(() => {
                setIsCloudSynced(true);
                setCloudSyncStatus('connected');
                setLastCloudSyncTime(new Date());
                isInitialCloudLoadComplete.current = true;
              })
              .catch((err) => {
                console.warn('Could not initialize cloud document:', err);
              });
          }
        },
        (error) => {
          console.warn('Firestore live sync error:', error);
          setCloudSyncStatus('offline');
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.warn('Error setting up Firestore listener:', err);
      setCloudSyncStatus('offline');
    }
  }, []);

  // Push local changes to Firestore across all devices
  useEffect(() => {
    if (isIncomingCloudUpdate.current) return;
    if (!isInitialCloudLoadComplete.current) return;

    const timer = setTimeout(() => {
      try {
        setCloudSyncStatus('syncing');
        const liveDocRef = doc(db, 'garage_state', 'bamo_garage_main');
        setDoc(
          liveDocRef,
          sanitizeForFirestore({
            spots,
            vehicles,
            washServices,
            washOrders,
            accessoryProducts,
            accessorySales,
            monthlyContracts,
            completedSessions,
            vipPaymentRecords,
            settings,
            users,
            expenses,
            openingCash,
            cashRegisterClosures,
            employees,
            payrollSettlements,
            lastUpdatedAt: new Date().toISOString(),
          }),
          { merge: true }
        )
          .then(() => {
            setIsCloudSynced(true);
            setCloudSyncStatus('connected');
            setLastCloudSyncTime(new Date());
          })
          .catch((err) => {
            console.warn('Error updating Firestore in real-time:', err);
            setCloudSyncStatus('error');
          });
      } catch (e) {
        console.warn('Error syncing state to Firestore:', e);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [
    spots,
    vehicles,
    washServices,
    washOrders,
    accessoryProducts,
    accessorySales,
    monthlyContracts,
    completedSessions,
    vipPaymentRecords,
    settings,
    users,
    expenses,
    openingCash,
    cashRegisterClosures,
    employees,
    payrollSettlements,
  ]);

  // Persistence effects
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SPOTS, JSON.stringify(spots));
  }, [spots]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.VEHICLES, JSON.stringify(vehicles));
  }, [vehicles]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.WASH_SERVICES, JSON.stringify(washServices));
  }, [washServices]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.WASH_ORDERS, JSON.stringify(washOrders));
  }, [washOrders]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ACCESSORIES, JSON.stringify(accessoryProducts));
  }, [accessoryProducts]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(accessorySales));
  }, [accessorySales]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CONTRACTS, JSON.stringify(monthlyContracts));
  }, [monthlyContracts]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SESSIONS_HIST, JSON.stringify(completedSessions));
  }, [completedSessions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.VIP_PAYMENTS, JSON.stringify(vipPaymentRecords));
  }, [vipPaymentRecords]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_USER, JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.OPENING_CASH, String(openingCash));
  }, [openingCash]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CASH_CLOSURES, JSON.stringify(cashRegisterClosures));
  }, [cashRegisterClosures]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PAYROLL, JSON.stringify(payrollSettlements));
  }, [payrollSettlements]);

  // Lookup vehicle
  const getVehicleByPlate = (plate: string): Vehicle | undefined => {
    if (!plate) return undefined;
    const cleanPlate = plate.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    return vehicles.find(
      (v) => v.plate.replace(/[^A-Z0-9]/g, '').toUpperCase() === cleanPlate
    );
  };

  const saveVehicle = (newOrUpdated: Vehicle) => {
    setVehicles((prev) => {
      const idx = prev.findIndex(
        (v) => v.plate.toUpperCase() === newOrUpdated.plate.toUpperCase()
      );
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = newOrUpdated;
        return next;
      }
      return [newOrUpdated, ...prev];
    });
  };

  const getSpotSession = (spotNumber: number): ParkingSession | undefined => {
    const spot = spots.find((s) => s.number === spotNumber);
    return spot?.currentSession;
  };

  // Check In Vehicle
  const checkInVehicle = (data: CheckInData): ParkingSession => {
    const cleanPlate = data.plate.trim().toUpperCase();
    const existingVehicle = getVehicleByPlate(cleanPlate);

    const visitsCount = (existingVehicle?.visitsCount || 0) + 1;
    const isFrequent = visitsCount >= settings.frequentThreshold || !!existingVehicle?.isFrequent;
    const isVIP = data.isVIP !== undefined ? data.isVIP : !!existingVehicle?.isVIP;

    // Entry time (manual or automatic)
    const effectiveEntryTime = data.entryTime || currentTime.toISOString();
    const isManualEntry = !!data.isManualEntryTime || !!data.entryTime;

    // Update / Register vehicle in database
    const updatedVehicle: Vehicle = {
      plate: cleanPlate,
      brand: data.brand || existingVehicle?.brand || 'Sin Marca',
      model: data.model || existingVehicle?.model || 'Sin Modelo',
      color: data.color || existingVehicle?.color || 'Sin Color',
      year: data.year || existingVehicle?.year,
      notes: data.notes || existingVehicle?.notes,
      clientName: data.clientName || existingVehicle?.clientName,
      clientRut: data.clientRut || existingVehicle?.clientRut,
      clientPhone: data.clientPhone || existingVehicle?.clientPhone,
      clientEmail: data.clientEmail || existingVehicle?.clientEmail,
      visitsCount,
      totalSpent: existingVehicle?.totalSpent || 0,
      isFrequent,
      isVIP,
      vipCreditLimit: existingVehicle?.vipCreditLimit ?? 200000,
      vipAccumulatedBalance: existingVehicle?.vipAccumulatedBalance ?? 0,
      lastVisit: effectiveEntryTime,
      createdAt: existingVehicle?.createdAt || currentTime.toISOString(),
    };
    saveVehicle(updatedVehicle);

    // Prepare optional wash order
    const createdWashOrders: WashOrder[] = [];
    if (data.washServiceId) {
      const service = washServices.find((w) => w.id === data.washServiceId);
      if (service) {
        const washOrder: WashOrder = {
          id: `wo_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          spotNumber: data.spotNumber,
          plate: cleanPlate,
          serviceId: service.id,
          serviceName: service.name,
          price: service.price,
          status: 'pending',
          requestedAt: effectiveEntryTime,
          paid: false,
        };
        createdWashOrders.push(washOrder);
        setWashOrders((prev) => [washOrder, ...prev]);
      }
    }

    const valetCost = data.hasValetParking ? (data.valetParkingFee ?? settings.valetParkingPrice ?? 2000) : 0;
    const totalServicesCost = createdWashOrders.reduce((sum, o) => sum + o.price, 0) + valetCost;

    const session: ParkingSession = {
      id: `sess_${Date.now()}`,
      ticketNumber: `TKT-${1000 + Math.floor(Math.random() * 9000)}`,
      spotNumber: data.spotNumber,
      plate: cleanPlate,
      brand: updatedVehicle.brand,
      model: updatedVehicle.model,
      color: updatedVehicle.color,
      year: updatedVehicle.year,
      clientName: updatedVehicle.clientName,
      clientRut: updatedVehicle.clientRut,
      clientPhone: updatedVehicle.clientPhone,
      clientEmail: updatedVehicle.clientEmail,
      isFrequent,
      entryTime: effectiveEntryTime,
      isManualEntryTime: isManualEntry,
      status: 'active',
      baseTierMinutes: 30,
      baseTierCost: settings.base30MinPrice,
      extraTierMinutes: 10,
      extraTierCost: 0,
      extraTiersCount: 0,
      parkingCost: settings.base30MinPrice,
      washOrders: createdWashOrders,
      accessorySales: [],
      hasValetParking: !!data.hasValetParking,
      valetParkingFee: data.hasValetParking ? (data.valetParkingFee ?? settings.valetParkingPrice ?? 2000) : 0,
      valetDriver: data.valetDriver,
      valetNotes: data.valetNotes,
      totalServicesCost,
      totalAmount: settings.base30MinPrice + totalServicesCost,
      notes: data.notes,
    };

    setSpots((prev) =>
      prev.map((spot) => {
        if (spot.number === data.spotNumber) {
          return {
            ...spot,
            status: 'occupied',
            currentSessionId: session.id,
            currentSession: session,
            lastStatusChange: currentTime.toISOString(),
          };
        }
        return spot;
      })
    );

    return session;
  };

  // Update active spot session (Edit entry data, spot assignment, or entry time)
  const updateActiveSpotSession = (
    currentSpotNumber: number,
    updates: {
      targetSpotNumber?: number;
      plate?: string;
      brand?: string;
      model?: string;
      color?: string;
      year?: number;
      clientName?: string;
      clientRut?: string;
      clientPhone?: string;
      clientEmail?: string;
      entryTime?: string;
      isManualEntryTime?: boolean;
      isVIP?: boolean;
      hasValetParking?: boolean;
      valetParkingFee?: number;
      valetDriver?: string;
      notes?: string;
    }
  ): { success: boolean; message: string } => {
    const currentSpot = spots.find((s) => s.number === currentSpotNumber);
    if (!currentSpot || !currentSpot.currentSession) {
      return { success: false, message: `No se encontró vehículo activo en el puesto #${currentSpotNumber}` };
    }

    const targetSpotNum = updates.targetSpotNumber ?? currentSpotNumber;
    if (targetSpotNum !== currentSpotNumber) {
      const targetSpot = spots.find((s) => s.number === targetSpotNum);
      if (!targetSpot) {
        return { success: false, message: `El puesto #${targetSpotNum} no existe en el estacionamiento.` };
      }
      if (targetSpot.status === 'occupied') {
        return { success: false, message: `El puesto #${targetSpotNum} ya se encuentra ocupado por otro vehículo.` };
      }
    }

    const oldSession = currentSpot.currentSession;
    const newPlate = updates.plate ? updates.plate.trim().toUpperCase() : oldSession.plate;
    const newEntryTime = updates.entryTime || oldSession.entryTime;

    // Recalculate parking fee with new entry time
    const pricing = calculateParkingFee(
      newEntryTime,
      currentTime,
      undefined,
      settings.base30MinPrice,
      settings.extra10MinPrice
    );

    const valetCost = updates.hasValetParking !== undefined
      ? (updates.hasValetParking ? (updates.valetParkingFee ?? oldSession.valetParkingFee ?? settings.valetParkingPrice ?? 2000) : 0)
      : (oldSession.hasValetParking ? (oldSession.valetParkingFee ?? settings.valetParkingPrice ?? 2000) : 0);

    const washCost = (oldSession.washOrders || []).reduce((sum, w) => sum + w.price, 0);
    const accCost = (oldSession.accessorySales || []).reduce((sum, a) => sum + a.total, 0);
    const totalServices = washCost + accCost + valetCost;

    const updatedSession: ParkingSession = {
      ...oldSession,
      spotNumber: targetSpotNum,
      plate: newPlate,
      brand: updates.brand !== undefined ? updates.brand : oldSession.brand,
      model: updates.model !== undefined ? updates.model : oldSession.model,
      color: updates.color !== undefined ? updates.color : oldSession.color,
      year: updates.year !== undefined ? updates.year : oldSession.year,
      clientName: updates.clientName !== undefined ? updates.clientName : oldSession.clientName,
      clientRut: updates.clientRut !== undefined ? updates.clientRut : oldSession.clientRut,
      clientPhone: updates.clientPhone !== undefined ? updates.clientPhone : oldSession.clientPhone,
      clientEmail: updates.clientEmail !== undefined ? updates.clientEmail : oldSession.clientEmail,
      entryTime: newEntryTime,
      isManualEntryTime: updates.isManualEntryTime !== undefined ? updates.isManualEntryTime : oldSession.isManualEntryTime,
      hasValetParking: updates.hasValetParking !== undefined ? updates.hasValetParking : oldSession.hasValetParking,
      valetParkingFee: valetCost,
      valetDriver: updates.valetDriver !== undefined ? updates.valetDriver : oldSession.valetDriver,
      notes: updates.notes !== undefined ? updates.notes : oldSession.notes,
      baseTierCost: pricing.baseTierCost,
      parkingCost: pricing.totalParkingCost,
      totalServicesCost: totalServices,
      totalAmount: pricing.totalParkingCost + totalServices,
    };

    // Update vehicle database record
    const existingVehicle = getVehicleByPlate(newPlate);
    saveVehicle({
      ...(existingVehicle || {
        plate: newPlate,
        brand: updatedSession.brand,
        model: updatedSession.model,
        color: updatedSession.color,
        createdAt: currentTime.toISOString(),
        visitsCount: 1,
        totalSpent: 0,
        isFrequent: false,
      }),
      brand: updatedSession.brand,
      model: updatedSession.model,
      color: updatedSession.color,
      year: updatedSession.year,
      clientName: updatedSession.clientName,
      clientRut: updatedSession.clientRut,
      clientPhone: updatedSession.clientPhone,
      clientEmail: updatedSession.clientEmail,
      isVIP: updates.isVIP !== undefined ? updates.isVIP : existingVehicle?.isVIP,
    });

    // Update spots state
    setSpots((prev) =>
      prev.map((s) => {
        if (s.number === currentSpotNumber && currentSpotNumber !== targetSpotNum) {
          const hasContract = monthlyContracts.some((c) => c.spotNumber === currentSpotNumber && c.status === 'active');
          return {
            ...s,
            status: hasContract ? 'reserved_monthly' : 'available',
            currentSessionId: undefined,
            currentSession: undefined,
            lastStatusChange: currentTime.toISOString(),
          };
        }
        if (s.number === targetSpotNum) {
          return {
            ...s,
            status: 'occupied',
            currentSessionId: updatedSession.id,
            currentSession: updatedSession,
            lastStatusChange: currentTime.toISOString(),
          };
        }
        return s;
      })
    );

    return {
      success: true,
      message: `Vehículo ${newPlate} actualizado correctamente en puesto #${targetSpotNum}.`,
    };
  };

  // Toggle or Update Valet Parking on an active Spot
  const toggleSpotValetParking = (
    spotNumber: number,
    options?: { enabled?: boolean; fee?: number; notes?: string; driver?: string }
  ) => {
    setSpots((prev) =>
      prev.map((spot) => {
        if (spot.number === spotNumber && spot.currentSession) {
          const currentValet = spot.currentSession.hasValetParking ?? false;
          const nextValet = options?.enabled !== undefined ? options.enabled : !currentValet;
          const defaultValetPrice = settings.valetParkingPrice ?? 2000;
          const valetFee = nextValet
            ? (options?.fee ?? (spot.currentSession.valetParkingFee && spot.currentSession.valetParkingFee > 0 ? spot.currentSession.valetParkingFee : defaultValetPrice))
            : 0;

          const washCost = (spot.currentSession.washOrders || []).reduce((sum, w) => sum + w.price, 0);
          const accCost = (spot.currentSession.accessorySales || []).reduce((sum, a) => sum + a.total, 0);
          const updatedServicesCost = washCost + accCost + valetFee;

          const updatedSession: ParkingSession = {
            ...spot.currentSession,
            hasValetParking: nextValet,
            valetParkingFee: nextValet ? valetFee : 0,
            valetDriver: options?.driver !== undefined ? options.driver : spot.currentSession.valetDriver,
            valetNotes: options?.notes !== undefined ? options.notes : spot.currentSession.valetNotes,
            totalServicesCost: updatedServicesCost,
            totalAmount: (spot.currentSession.parkingCost || settings.base30MinPrice) + updatedServicesCost,
          };

          return {
            ...spot,
            currentSession: updatedSession,
          };
        }
        return spot;
      })
    );
  };

  // Check Out Vehicle (Supports manual exit time & VIP accumulated accounts)
  const checkOutVehicle = (
    spotNumber: number,
    paymentMethod: PaymentMethod,
    posInfo?: { provider: POSTerminalProvider; authorizationCode: string },
    customExitTime?: string,
    siiBoletaNumber?: string,
    transferVoucherNumber?: string
  ): ParkingSession | null => {
    const spot = spots.find((s) => s.number === spotNumber);
    if (!spot || !spot.currentSession) return null;

    const currentSession = spot.currentSession;
    const effectiveExitTime = customExitTime || currentTime.toISOString();

    const pricing = calculateParkingFee(
      currentSession.entryTime,
      new Date(effectiveExitTime),
      undefined,
      settings.base30MinPrice,
      settings.extra10MinPrice
    );

    const washCost = (currentSession.washOrders || []).reduce((sum, w) => sum + w.price, 0);
    const accCost = (currentSession.accessorySales || []).reduce((sum, a) => sum + a.total, 0);
    const valetCost = currentSession.hasValetParking ? (currentSession.valetParkingFee || 0) : 0;
    const totalServicesCost = washCost + accCost + valetCost;
    const totalAmount = pricing.totalParkingCost + totalServicesCost;

    // Calculate POS commission if paying by debit/credit
    const posCalculation = calculatePOSFee(
      totalAmount,
      paymentMethod,
      posInfo?.provider,
      settings
    );

    const completedSession: ParkingSession = {
      ...currentSession,
      exitTime: effectiveExitTime,
      isManualExitTime: !!customExitTime,
      status: 'completed',
      baseTierMinutes: pricing.baseTierMinutes,
      baseTierCost: pricing.baseTierCost,
      extraTierMinutes: pricing.extraTierMinutes,
      extraTierCost: pricing.extraTierCost,
      extraTiersCount: pricing.extraTiersCount,
      parkingCost: pricing.totalParkingCost,
      totalServicesCost,
      totalAmount,
      paymentMethod,
      siiBoletaNumber: paymentMethod === 'efectivo' ? siiBoletaNumber?.trim() : undefined,
      transferVoucherNumber: paymentMethod === 'transferencia' ? transferVoucherNumber?.trim() : undefined,
      posProvider: posInfo?.provider,
      authorizationCode: posInfo?.authorizationCode,
      posFeePercent: posCalculation.feePercent > 0 ? posCalculation.feePercent : undefined,
      posFeeAmount: posCalculation.feeAmount > 0 ? posCalculation.feeAmount : undefined,
      netAmountReceived: posCalculation.netAmount,
      isReconciled: false,
      reconciliationStatus: 'pending',
    };

    // Update vehicle spending and VIP accumulated balance
    setVehicles((prev) =>
      prev.map((v) => {
        if (v.plate.toUpperCase() === completedSession.plate.toUpperCase()) {
          const isVipPayment = paymentMethod === 'cuenta_corriente_vip';
          return {
            ...v,
            isVIP: isVipPayment ? true : v.isVIP,
            vipAccumulatedBalance: isVipPayment
              ? (v.vipAccumulatedBalance || 0) + totalAmount
              : (v.vipAccumulatedBalance || 0),
            totalSpent: (v.totalSpent || 0) + totalAmount,
            lastVisit: effectiveExitTime,
          };
        }
        return v;
      })
    );

    // Mark attached wash orders as delivered & paid
    if (completedSession.washOrders && completedSession.washOrders.length > 0) {
      const orderIds = completedSession.washOrders.map((w) => w.id);
      setWashOrders((prev) =>
        prev.map((o) => (orderIds.includes(o.id) ? { ...o, status: 'delivered', paid: true } : o))
      );
    }

    // Save to historical completed sessions
    setCompletedSessions((prev) => [completedSession, ...prev]);

    // Free the spot (if it has a monthly contract, return to 'reserved_monthly', otherwise 'available')
    setSpots((prev) =>
      prev.map((s) => {
        if (s.number === spotNumber) {
          const hasContract = monthlyContracts.some(
            (c) => c.spotNumber === spotNumber && c.status === 'active'
          );
          return {
            ...s,
            status: hasContract ? 'reserved_monthly' : 'available',
            currentSessionId: undefined,
            currentSession: undefined,
            lastStatusChange: currentTime.toISOString(),
          };
        }
        return s;
      })
    );

    return completedSession;
  };

  // Cancel / Delete Active Parking Entry (Admin privilege only)
  const cancelActiveSpotSession = (
    spotNumber: number,
    adminPinOrBypass?: string
  ): { success: boolean; message: string } => {
    // Check admin authorization
    const isAdmin = currentUser && currentUser.role === 'admin';
    const isPinValid =
      adminPinOrBypass &&
      users.some((u) => u.role === 'admin' && u.pin === adminPinOrBypass);

    if (!isAdmin && !isPinValid) {
      return {
        success: false,
        message: 'Acceso restringido: Solo el Administrador puede anular o eliminar registros de ingreso sin cobro.',
      };
    }

    const spot = spots.find((s) => s.number === spotNumber);
    if (!spot || spot.status !== 'occupied' || !spot.currentSession) {
      return {
        success: false,
        message: `El puesto #${spotNumber} no tiene un vehículo ocupado actualmente.`,
      };
    }

    const plate = spot.currentSession.plate;
    const sessionId = spot.currentSession.id;

    // Remove any active wash orders related to this canceled session
    setWashOrders((prev) => prev.filter((order) => order.sessionId !== sessionId));

    // Free the spot (if it has an active monthly contract, return to 'reserved_monthly', otherwise 'available')
    setSpots((prev) =>
      prev.map((s) => {
        if (s.number === spotNumber) {
          const hasContract = monthlyContracts.some(
            (c) => c.spotNumber === spotNumber && c.status === 'active'
          );
          return {
            ...s,
            status: hasContract ? 'reserved_monthly' : 'available',
            currentSessionId: undefined,
            currentSession: undefined,
            lastStatusChange: currentTime.toISOString(),
          };
        }
        return s;
      })
    );

    return {
      success: true,
      message: `Ingreso del vehículo patente ${plate} (Puesto #${spotNumber}) anulado exitosamente sin cobro.`,
    };
  };

  // Add Standalone or Linked Wash Order
  const addWashOrder = (orderData: Omit<WashOrder, 'id' | 'requestedAt'>): WashOrder => {
    const newOrder: WashOrder = {
      ...orderData,
      id: `wo_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      requestedAt: currentTime.toISOString(),
    };

    setWashOrders((prev) => [newOrder, ...prev]);

    // If attached to an active spot session, update session
    if (orderData.spotNumber) {
      setSpots((prev) =>
        prev.map((spot) => {
          if (spot.number === orderData.spotNumber && spot.currentSession) {
            const currentOrders = spot.currentSession.washOrders || [];
            const updatedOrders = [...currentOrders, newOrder];
            const washCost = updatedOrders.reduce((sum, w) => sum + w.price, 0);
            const accCost = (spot.currentSession.accessorySales || []).reduce((sum, a) => sum + a.total, 0);
            return {
              ...spot,
              currentSession: {
                ...spot.currentSession,
                washOrders: updatedOrders,
                totalServicesCost: washCost + accCost,
                totalAmount: spot.currentSession.parkingCost + washCost + accCost,
              },
            };
          }
          return spot;
        })
      );
    }

    return newOrder;
  };

  // Update Wash Order Status
  const updateWashStatus = (orderId: string, status: WashStatus, washerName?: string) => {
    setWashOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          return {
            ...o,
            status,
            washerName: washerName || o.washerName,
            startedAt: status === 'in_progress' && !o.startedAt ? currentTime.toISOString() : o.startedAt,
            completedAt: status === 'ready' || status === 'delivered' ? currentTime.toISOString() : o.completedAt,
            paid: status === 'delivered' ? true : o.paid,
          };
        }
        return o;
      })
    );

    // Also update spot session if linked
    setSpots((prev) =>
      prev.map((spot) => {
        if (spot.currentSession?.washOrders?.some((w) => w.id === orderId)) {
          const updatedWash = spot.currentSession.washOrders.map((w) =>
            w.id === orderId ? { ...w, status, washerName: washerName || w.washerName } : w
          );
          return {
            ...spot,
            currentSession: {
              ...spot.currentSession,
              washOrders: updatedWash,
            },
          };
        }
        return spot;
      })
    );
  };

  // Request Customer Wash Order from QR Mobile Portal
  const requestCustomerWashOrder = (spotNumber: number, serviceId: string, notes?: string): WashOrder | null => {
    const spot = spots.find((s) => s.number === spotNumber);
    if (!spot || !spot.currentSession) return null;

    const service = washServices.find((s) => s.id === serviceId);
    if (!service) return null;

    const washOrder: WashOrder = {
      id: `wo_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      ticketId: spot.currentSession.ticketNumber,
      spotNumber: spot.number,
      plate: spot.currentSession.plate,
      serviceId: service.id,
      serviceName: service.name,
      price: service.price,
      status: 'pending',
      notes: notes ? `📱 QR Cliente: ${notes}` : '📱 Solicitado desde Portal QR Móvil (Pagar al Salir)',
      requestedAt: currentTime.toISOString(),
      paid: false,
    };

    setWashOrders((prev) => [washOrder, ...prev]);

    setSpots((prev) =>
      prev.map((s) => {
        if (s.number === spotNumber && s.currentSession) {
          const currentOrders = s.currentSession.washOrders || [];
          const updatedOrders = [...currentOrders, washOrder];
          const washCost = updatedOrders.reduce((sum, w) => sum + w.price, 0);
          const accCost = (s.currentSession.accessorySales || []).reduce((sum, a) => sum + a.total, 0);
          return {
            ...s,
            currentSession: {
              ...s.currentSession,
              washOrders: updatedOrders,
              totalServicesCost: washCost + accCost,
              totalAmount: s.currentSession.parkingCost + washCost + accCost,
            },
          };
        }
        return s;
      })
    );

    return washOrder;
  };

  // Sell Accessories
  const sellAccessories = (
    items: AccessorySaleItem[],
    paymentMethod: PaymentMethod,
    spotNumber?: number,
    clientName?: string,
    posInfo?: { provider: POSTerminalProvider; authorizationCode: string }
  ) => {
    const total = items.reduce((sum, item) => sum + item.total, 0);
    const saleId = `sale_${Date.now()}`;

    const posCalculation = calculatePOSFee(
      total,
      paymentMethod,
      posInfo?.provider,
      settings
    );

    const sale: AccessorySale = {
      id: saleId,
      spotNumber,
      date: currentTime.toISOString(),
      soldAt: currentTime.toISOString(),
      items,
      total,
      totalAmount: total,
      paymentMethod,
      clientName,
      paid: true,
      posProvider: posInfo?.provider,
      authorizationCode: posInfo?.authorizationCode,
      posFeePercent: posCalculation.feePercent > 0 ? posCalculation.feePercent : undefined,
      posFeeAmount: posCalculation.feeAmount > 0 ? posCalculation.feeAmount : undefined,
      netAmountReceived: posCalculation.netAmount,
    };

    // Deduct stock
    setAccessoryProducts((prev) =>
      prev.map((p) => {
        const item = items.find((i) => i.productId === p.id);
        if (item) {
          return { ...p, stock: Math.max(0, p.stock - item.quantity) };
        }
        return p;
      })
    );

    setAccessorySales((prev) => [sale, ...prev]);

    // If attached to spot session
    if (spotNumber) {
      setSpots((prev) =>
        prev.map((spot) => {
          if (spot.number === spotNumber && spot.currentSession) {
            const currentAcc = spot.currentSession.accessorySales || [];
            const updatedAcc = [...currentAcc, ...items];
            const washCost = (spot.currentSession.washOrders || []).reduce((sum, w) => sum + w.price, 0);
            const accCost = updatedAcc.reduce((sum, a) => sum + a.total, 0);
            return {
              ...spot,
              currentSession: {
                ...spot.currentSession,
                accessorySales: updatedAcc,
                totalServicesCost: washCost + accCost,
                totalAmount: spot.currentSession.parkingCost + washCost + accCost,
              },
            };
          }
          return spot;
        })
      );
    }
  };

  // Request Customer Accessories from QR Mobile Portal (Pre-order, Pay on Exit)
  const requestCustomerAccessories = (spotNumber: number, items: AccessorySaleItem[], notes?: string): boolean => {
    const spot = spots.find((s) => s.number === spotNumber);
    if (!spot || !spot.currentSession) return false;
    if (!items || items.length === 0) return false;

    const total = items.reduce((sum, item) => sum + item.total, 0);
    const saleId = `sale_qr_${Date.now()}`;

    const sale: AccessorySale = {
      id: saleId,
      ticketId: spot.currentSession.ticketNumber,
      spotNumber,
      date: currentTime.toISOString(),
      items,
      total,
      paymentMethod: 'efectivo',
      clientName: spot.currentSession.clientName
        ? `${spot.currentSession.clientName} (QR Puesto #${spotNumber})`
        : `Cliente Puesto #${spotNumber}`,
      paid: false, // Billed to ticket, paid upon vehicle checkout
    };

    // Deduct stock
    setAccessoryProducts((prev) =>
      prev.map((p) => {
        const item = items.find((i) => i.productId === p.id);
        if (item) {
          return { ...p, stock: Math.max(0, p.stock - item.quantity) };
        }
        return p;
      })
    );

    setAccessorySales((prev) => [sale, ...prev]);

    setSpots((prev) =>
      prev.map((s) => {
        if (s.number === spotNumber && s.currentSession) {
          const currentAcc = s.currentSession.accessorySales || [];
          const updatedAcc = [...currentAcc, ...items];
          const washCost = (s.currentSession.washOrders || []).reduce((sum, w) => sum + w.price, 0);
          const accCost = updatedAcc.reduce((sum, a) => sum + a.total, 0);
          return {
            ...s,
            currentSession: {
              ...s.currentSession,
              accessorySales: updatedAcc,
              totalServicesCost: washCost + accCost,
              totalAmount: s.currentSession.parkingCost + washCost + accCost,
            },
          };
        }
        return s;
      })
    );

    return true;
  };

  // Create Monthly Contract
  const createMonthlyContract = (contractData: Omit<MonthlyContract, 'id' | 'contractNumber'>): MonthlyContract => {
    const id = `ctr_${Date.now()}`;
    const contractNumber = `ARR-2026-${100 + monthlyContracts.length + 1}`;
    const newContract: MonthlyContract = {
      ...contractData,
      id,
      contractNumber,
    };

    setMonthlyContracts((prev) => [newContract, ...prev]);

    // If assigned to a spot, mark spot as reserved_monthly if not currently occupied
    if (newContract.spotNumber) {
      setSpots((prev) =>
        prev.map((s) => {
          if (s.number === newContract.spotNumber) {
            return {
              ...s,
              status: s.status === 'occupied' ? 'occupied' : 'reserved_monthly',
              monthlyContractId: newContract.id,
              monthlyContract: newContract,
            };
          }
          return s;
        })
      );
    }

    // Register vehicle in database
    const cleanPlate = newContract.plate.toUpperCase();
    const existing = getVehicleByPlate(cleanPlate);
    saveVehicle({
      plate: cleanPlate,
      brand: newContract.brand || existing?.brand || 'Sin Marca',
      model: newContract.model || existing?.model || 'Sin Modelo',
      color: newContract.color || existing?.color || 'Sin Color',
      clientName: newContract.clientName,
      clientRut: newContract.clientRut,
      clientPhone: newContract.clientPhone,
      clientEmail: newContract.clientEmail,
      visitsCount: (existing?.visitsCount || 0) + 1,
      totalSpent: (existing?.totalSpent || 0) + newContract.monthlyFee,
      isFrequent: true, // Monthly contract auto frequent
      lastVisit: currentTime.toISOString(),
      createdAt: existing?.createdAt || currentTime.toISOString(),
    });

    return newContract;
  };

  const updateMonthlyContract = (id: string, updates: Partial<MonthlyContract>) => {
    setMonthlyContracts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  // Delete Monthly/Weekly Rental Contract (Admin privileged)
  const deleteMonthlyContract = (
    contractId: string,
    adminPinOrBypass?: string
  ): { success: boolean; message: string } => {
    const isAdmin = currentUser && currentUser.role === 'admin';
    const isPinValid =
      adminPinOrBypass &&
      users.some((u) => u.role === 'admin' && u.pin === adminPinOrBypass);

    if (!isAdmin && !isPinValid) {
      return {
        success: false,
        message: 'Acceso restringido: Solo el Administrador puede eliminar contratos de arriendo mensual o semanal.',
      };
    }

    const contract = monthlyContracts.find((c) => c.id === contractId);
    if (!contract) {
      return { success: false, message: 'El contrato de arriendo no existe o ya fue eliminado.' };
    }

    const spotNumber = contract.spotNumber;

    setMonthlyContracts((prev) => prev.filter((c) => c.id !== contractId));

    // If spot was assigned to this contract, release the spot if not occupied
    if (spotNumber) {
      setSpots((prev) =>
        prev.map((s) => {
          if (s.number === spotNumber) {
            if (s.status === 'reserved_monthly') {
              return {
                ...s,
                status: 'available',
                monthlyContractId: undefined,
                monthlyContract: undefined,
                lastStatusChange: currentTime.toISOString(),
              };
            } else {
              return {
                ...s,
                monthlyContractId: undefined,
                monthlyContract: undefined,
              };
            }
          }
          return s;
        })
      );
    }

    return {
      success: true,
      message: `Contrato de arriendo ${contract.contractNumber || ''} (${contract.clientName}) eliminado exitosamente.`,
    };
  };

  // --- VIP Client Management & Tab Accounts ---
  const markClientVIP = (plateOrRut: string, isVIP: boolean, creditLimit: number = 200000) => {
    const clean = plateOrRut.trim().toUpperCase();
    setVehicles((prev) =>
      prev.map((v) => {
        const matchPlate = v.plate.toUpperCase() === clean;
        const matchRut = v.clientRut && v.clientRut.toUpperCase() === clean;
        if (matchPlate || matchRut) {
          return {
            ...v,
            isVIP,
            vipCreditLimit: creditLimit,
            vipAccumulatedBalance: v.vipAccumulatedBalance || 0,
          };
        }
        return v;
      })
    );
  };

  const payVIPAccumulatedBalance = (plateOrRut: string, amount: number, paymentMethod: PaymentMethod) => {
    const clean = plateOrRut.trim().toUpperCase();
    setVehicles((prev) =>
      prev.map((v) => {
        const matchPlate = v.plate.toUpperCase() === clean;
        const matchRut = v.clientRut && v.clientRut.toUpperCase() === clean;
        if (matchPlate || matchRut) {
          const currentBal = v.vipAccumulatedBalance || 0;
          return {
            ...v,
            vipAccumulatedBalance: Math.max(0, currentBal - amount),
          };
        }
        return v;
      })
    );
  };

  // --- Users & 8-Digit PIN Management ---
  const updateUserPin = (userId: string, newPin: string): boolean => {
    // Validate strictly 8 numeric digits
    if (!/^\d{8}$/.test(newPin)) {
      return false;
    }
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, pin: newPin } : u))
    );
    if (currentUser.id === userId) {
      setCurrentUser((prev) => ({ ...prev, pin: newPin }));
    }
    return true;
  };

  const updateUser = (updatedUser: AppUser) => {
    setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
    if (currentUser.id === updatedUser.id) {
      setCurrentUser(updatedUser);
    }
  };

  const addUser = (userData: Omit<AppUser, 'id' | 'createdAt'>): AppUser => {
    const newUser: AppUser = {
      ...userData,
      id: `usr_${Date.now()}`,
      pin: userData.pin && /^\d{8}$/.test(userData.pin) ? userData.pin : '12345678',
      createdAt: new Date().toISOString(),
    };
    setUsers((prev) => [...prev, newUser]);
    return newUser;
  };

  const deleteUser = (id: string) => {
    if (users.length <= 1) return; // Don't delete last user
    setUsers((prev) => prev.filter((u) => u.id !== id));
    if (currentUser.id === id) {
      const remaining = users.filter((u) => u.id !== id);
      if (remaining.length > 0) setCurrentUser(remaining[0]);
    }
  };

  const verifyUserPin = (userId: string, pin: string): boolean => {
    const user = users.find((u) => u.id === userId);
    return user ? user.pin === pin : false;
  };

  const login = (usernameOrId: string, pin: string): { success: boolean; message?: string } => {
    if (!usernameOrId || !pin) {
      return { success: false, message: 'Por favor complete el usuario y la clave.' };
    }
    const cleanQuery = usernameOrId.trim().toLowerCase();
    const user = users.find(
      (u) =>
        (u.username.toLowerCase() === cleanQuery || u.id === usernameOrId || u.name.toLowerCase() === cleanQuery) &&
        u.active
    );
    if (!user) {
      return { success: false, message: 'Usuario no encontrado o inactivo en el sistema.' };
    }
    if (user.pin !== pin) {
      return {
        success: false,
        message: 'Clave incorrecta. Recuerde que la clave del Administrador es del 1 al 8 (12345678).',
      };
    }
    setCurrentUser(user);
    setIsAuthenticated(true);
    localStorage.setItem(STORAGE_KEYS.AUTH_STATE, 'true');
    localStorage.setItem(STORAGE_KEYS.ACTIVE_USER, JSON.stringify(user));
    return { success: true };
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem(STORAGE_KEYS.AUTH_STATE);
  };

  const lockSystem = () => {
    logout();
  };

  // --- Expenses & Cash Register ---
  const addExpense = (expenseData: Omit<BusinessExpense, 'id' | 'createdAt'>): BusinessExpense => {
    const newExpense: BusinessExpense = {
      ...expenseData,
      id: `exp_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setExpenses((prev) => [newExpense, ...prev]);
    return newExpense;
  };

  const updateExpense = (id: string, updates: Partial<BusinessExpense>) => {
    setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));
  };

  const deleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  const openDailyCashRegister = (
    initialCash: number,
    cashierName: string,
    notes?: string
  ): CashRegisterOpeningRecord => {
    const newShift: CashRegisterOpeningRecord = {
      id: `shift_${Date.now()}`,
      date: currentTime.toISOString().split('T')[0],
      openedAt: currentTime.toISOString(),
      cashierName: cashierName || currentUser.name,
      initialCash,
      notes,
      status: 'open',
    };
    setCurrentCashShift(newShift);
    setOpeningCash(initialCash);
    localStorage.setItem(STORAGE_KEYS.CASH_SHIFT, JSON.stringify(newShift));
    localStorage.setItem(STORAGE_KEYS.OPENING_CASH, String(initialCash));
    return newShift;
  };

  const closeCashRegister = (recordData: Omit<CashRegisterCloseRecord, 'id'>): CashRegisterCloseRecord => {
    const newRecord: CashRegisterCloseRecord = {
      ...recordData,
      id: `cls_${Date.now()}`,
    };
    setCashRegisterClosures((prev) => [newRecord, ...prev]);
    if (currentCashShift) {
      const closedShift: CashRegisterOpeningRecord = {
        ...currentCashShift,
        status: 'closed',
      };
      setCurrentCashShift(closedShift);
      localStorage.setItem(STORAGE_KEYS.CASH_SHIFT, JSON.stringify(closedShift));
    }
    return newRecord;
  };

  // --- Employees & Payroll (Chile) ---
  const addEmployee = (empData: Omit<Employee, 'id'>): Employee => {
    const newEmp: Employee = {
      ...empData,
      id: `emp_${Date.now()}`,
    };
    setEmployees((prev) => [...prev, newEmp]);
    return newEmp;
  };

  const updateEmployee = (id: string, updates: Partial<Employee>) => {
    setEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));
  };

  const deleteEmployee = (id: string) => {
    setEmployees((prev) => prev.filter((e) => e.id !== id));
  };

  const generatePayrollSettlement = (params: {
    employeeId: string;
    month: string;
    overtimeHours?: number;
    bonuses?: number;
    otherDeductions?: number;
    paymentMethod: PaymentMethod;
  }): PayrollSettlement => {
    const emp = employees.find((e) => e.id === params.employeeId);
    if (!emp) throw new Error('Empleado no encontrado');

    const payroll = calculateChileanPayroll({
      baseSalary: emp.baseSalary,
      contractType: emp.contractType,
      afpKey: emp.afp,
      healthSystem: emp.healthSystem,
      healthPlanUF: emp.healthPlanUF,
      overtimeHours: params.overtimeHours,
      bonuses: params.bonuses,
      mealAllowance: emp.mealAllowance,
      transportAllowance: emp.transportAllowance,
      minWage: settings.minWageChile,
    });

    const settlement: PayrollSettlement = {
      id: `liq_${Date.now()}`,
      month: params.month,
      employeeId: emp.id,
      employeeName: emp.name,
      employeeRut: emp.rut,
      employeeRole: emp.role,
      contractType: emp.contractType,
      workedDays: 30,
      baseSalary: payroll.baseSalary,
      legalGratification: payroll.legalGratification,
      overtimeHours: payroll.overtimeHours,
      overtimeAmount: payroll.overtimeAmount,
      bonuses: payroll.bonuses,
      totalTaxableIncome: payroll.totalTaxableIncome,
      mealAllowance: payroll.mealAllowance,
      transportAllowance: payroll.transportAllowance,
      totalNonTaxableIncome: payroll.totalNonTaxableIncome,
      totalGrossIncome: payroll.totalGrossIncome,
      afpName: emp.afp,
      afpRate: payroll.afpRate,
      afpAmount: payroll.afpAmount,
      healthRate: payroll.healthRate,
      healthAmount: payroll.healthAmount,
      unemploymentWorkerRate: payroll.unemploymentWorkerRate,
      unemploymentWorkerAmount: payroll.unemploymentWorkerAmount,
      secondCategoryTax: payroll.secondCategoryTax,
      otherDeductions: params.otherDeductions || 0,
      totalDeductions: payroll.totalDeductions + (params.otherDeductions || 0),
      netSalaryToPay: payroll.netSalaryToPay - (params.otherDeductions || 0),
      unemploymentEmployerAmount: payroll.unemploymentEmployerAmount,
      sisAmount: payroll.sisAmount,
      mutualAmount: payroll.mutualAmount,
      totalEmployerCost: payroll.totalEmployerCost,
      paidAt: currentTime.toISOString(),
      paymentMethod: params.paymentMethod,
      status: 'paid',
    };

    setPayrollSettlements((prev) => [settlement, ...prev.filter((p) => !(p.employeeId === emp.id && p.month === params.month))]);
    return settlement;
  };

  const markPayrollPaid = (id: string) => {
    setPayrollSettlements((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'paid', paidAt: currentTime.toISOString() } : p))
    );
  };

  // --- Customer Behavior Notes & Rating ---
  const addVehicleBehaviorNote = (plate: string, note: Omit<BehaviorNote, 'id' | 'date'>) => {
    const cleanPlate = plate.trim().toUpperCase();
    const newNote: BehaviorNote = {
      ...note,
      id: `bn_${Date.now()}`,
      date: currentTime.toISOString(),
    };

    setVehicles((prev) =>
      prev.map((v) => {
        if (v.plate.toUpperCase() === cleanPlate) {
          const notesList = v.behaviorNotes ? [newNote, ...v.behaviorNotes] : [newNote];
          return {
            ...v,
            behaviorRating: note.rating,
            behaviorNotes: notesList,
          };
        }
        return v;
      })
    );
  };

  const updateVehicleBehaviorRating = (plate: string, rating: BehaviorRating) => {
    const cleanPlate = plate.trim().toUpperCase();
    setVehicles((prev) =>
      prev.map((v) => (v.plate.toUpperCase() === cleanPlate ? { ...v, behaviorRating: rating } : v))
    );
  };

  // --- Frontend Configs Management ---
  const updateSettings = (newSettings: Partial<ParkingSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const addWashService = (serviceData: Omit<WashService, 'id'>): WashService => {
    const newService: WashService = {
      ...serviceData,
      id: `wash_${Date.now()}`,
    };
    setWashServices((prev) => [...prev, newService]);
    return newService;
  };

  const updateWashService = (service: WashService) => {
    setWashServices((prev) => prev.map((s) => (s.id === service.id ? service : s)));
  };

  const deleteWashService = (id: string) => {
    setWashServices((prev) => prev.filter((s) => s.id !== id));
  };

  const addAccessoryProduct = (prodData: Omit<AccessoryProduct, 'id'>): AccessoryProduct => {
    const newProduct: AccessoryProduct = {
      ...prodData,
      id: `acc_${Date.now()}`,
    };
    setAccessoryProducts((prev) => [...prev, newProduct]);
    return newProduct;
  };

  const updateAccessoryProduct = (product: AccessoryProduct) => {
    setAccessoryProducts((prev) => prev.map((p) => (p.id === product.id ? product : p)));
  };

  const saveAccessoryProduct = (product: AccessoryProduct) => {
    setAccessoryProducts((prev) => {
      const idx = prev.findIndex((p) => p.id === product.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = product;
        return next;
      }
      return [product, ...prev];
    });
  };

  const deleteAccessoryProduct = (id: string) => {
    setAccessoryProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const advanceTime = (minutes: number) => {
    setSimulatedMinutesAdded((prev) => prev + minutes);
  };

  const resetTime = () => {
    setSimulatedMinutesAdded(0);
  };

  const exportBackupData = () => {
    return {
      version: '3.0',
      exportDate: new Date().toISOString(),
      system: 'Bamo Garage SpA - Sistema Integral de Estacionamiento',
      rut: '78.084.649-6',
      data: {
        spots,
        vehicles,
        washServices,
        washOrders,
        accessoryProducts,
        accessorySales,
        monthlyContracts,
        completedSessions,
        settings,
        users,
        expenses,
        openingCash,
        cashRegisterClosures,
        employees,
        payrollSettlements,
      },
    };
  };

  const downloadBackupFile = () => {
    try {
      const backup = exportBackupData();
      const jsonStr = JSON.stringify(backup, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const dateStr = new Date().toISOString().split('T')[0];
      const a = document.createElement('a');
      a.href = url;
      a.download = `bamo_garage_respaldo_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.warn('Error downloading backup file:', e);
    }
  };

  const restoreFromBackupData = (backupObj: any): { success: boolean; message: string } => {
    try {
      if (!backupObj) throw new Error('Archivo o datos de respaldo vacíos.');
      const d = backupObj.data || backupObj;

      if (Array.isArray(d.spots)) setSpots(d.spots);
      if (Array.isArray(d.vehicles)) setVehicles(d.vehicles);
      if (Array.isArray(d.washServices)) setWashServices(d.washServices);
      if (Array.isArray(d.washOrders)) setWashOrders(d.washOrders);
      if (Array.isArray(d.accessoryProducts)) setAccessoryProducts(d.accessoryProducts);
      if (Array.isArray(d.accessorySales)) setAccessorySales(d.accessorySales);
      if (Array.isArray(d.monthlyContracts)) setMonthlyContracts(d.monthlyContracts);
      if (Array.isArray(d.completedSessions)) setCompletedSessions(d.completedSessions);
      if (d.settings) setSettings((prev) => ({ ...prev, ...d.settings }));
      if (Array.isArray(d.users) && d.users.length > 0) setUsers(d.users);
      if (Array.isArray(d.expenses)) setExpenses(d.expenses);
      if (typeof d.openingCash === 'number') setOpeningCash(d.openingCash);
      if (Array.isArray(d.cashRegisterClosures)) setCashRegisterClosures(d.cashRegisterClosures);
      if (Array.isArray(d.employees)) setEmployees(d.employees);
      if (Array.isArray(d.payrollSettlements)) setPayrollSettlements(d.payrollSettlements);

      // Force push directly to Firestore
      try {
        const liveDocRef = doc(db, 'garage_state', 'bamo_garage_main');
        setDoc(
          liveDocRef,
          sanitizeForFirestore({
            spots: d.spots || spots,
            vehicles: d.vehicles || vehicles,
            washServices: d.washServices || washServices,
            washOrders: d.washOrders || washOrders,
            accessoryProducts: d.accessoryProducts || accessoryProducts,
            accessorySales: d.accessorySales || accessorySales,
            monthlyContracts: d.monthlyContracts || monthlyContracts,
            completedSessions: d.completedSessions || completedSessions,
            settings: d.settings || settings,
            users: d.users || users,
            expenses: d.expenses || expenses,
            openingCash: typeof d.openingCash === 'number' ? d.openingCash : openingCash,
            cashRegisterClosures: d.cashRegisterClosures || cashRegisterClosures,
            employees: d.employees || employees,
            payrollSettlements: d.payrollSettlements || payrollSettlements,
            lastUpdatedAt: new Date().toISOString(),
          }),
          { merge: true }
        );
      } catch (err) {
        console.warn('Error syncing restored data to Firestore:', err);
      }

      return { success: true, message: '¡Datos restaurados correctamente con éxito!' };
    } catch (err: any) {
      return { success: false, message: `Error al restaurar: ${err.message}` };
    }
  };

  const restoreFromSnapshot = (snapshotId: string): { success: boolean; message: string } => {
    const target = autoSnapshots.find((s) => s.id === snapshotId);
    if (!target) return { success: false, message: 'Punto de restauración no encontrado.' };
    return restoreFromBackupData(target.data);
  };

  const forceCloudSync = async (): Promise<{ success: boolean; message: string }> => {
    try {
      setCloudSyncStatus('syncing');
      const liveDocRef = doc(db, 'garage_state', 'bamo_garage_main');
      await setDoc(
        liveDocRef,
        sanitizeForFirestore({
          spots,
          vehicles,
          washServices,
          washOrders,
          accessoryProducts,
          accessorySales,
          monthlyContracts,
          completedSessions,
          settings,
          users,
          expenses,
          openingCash,
          cashRegisterClosures,
          employees,
          payrollSettlements,
          lastUpdatedAt: new Date().toISOString(),
        }),
        { merge: true }
      );
      setIsCloudSynced(true);
      setCloudSyncStatus('connected');
      setLastCloudSyncTime(new Date());
      return { success: true, message: 'Sincronización con la nube completada exitosamente.' };
    } catch (err: any) {
      setCloudSyncStatus('error');
      return { success: false, message: `Error al sincronizar con la nube: ${err.message}` };
    }
  };

  const resetToInitialData = () => {
    setSpots(INITIAL_SPOTS);
    setVehicles(INITIAL_VEHICLES);
    setWashServices(INITIAL_WASH_SERVICES);
    const orders: WashOrder[] = [];
    INITIAL_SPOTS.forEach((s) => {
      if (s.currentSession?.washOrders) {
        orders.push(...s.currentSession.washOrders);
      }
    });
    setWashOrders(orders);
    setAccessoryProducts(INITIAL_ACCESSORIES);
    setAccessorySales([]);
    setMonthlyContracts(INITIAL_MONTHLY_CONTRACTS);
    setCompletedSessions(INITIAL_COMPLETED_SESSIONS);
    setSettings(DEFAULT_SETTINGS);
    setUsers(INITIAL_USERS);
    setCurrentUser(INITIAL_USERS[0]);
    setExpenses(INITIAL_EXPENSES);
    setOpeningCash(50000);
    setCashRegisterClosures([]);
    setEmployees(INITIAL_EMPLOYEES);
    setPayrollSettlements([]);
    setSimulatedMinutesAdded(0);

    try {
      const liveDocRef = doc(db, 'garage_state', 'bamo_garage_main');
      setDoc(
        liveDocRef,
        sanitizeForFirestore({
          spots: INITIAL_SPOTS,
          vehicles: INITIAL_VEHICLES,
          washServices: INITIAL_WASH_SERVICES,
          washOrders: orders,
          accessoryProducts: INITIAL_ACCESSORIES,
          accessorySales: [],
          monthlyContracts: INITIAL_MONTHLY_CONTRACTS,
          completedSessions: INITIAL_COMPLETED_SESSIONS,
          settings: DEFAULT_SETTINGS,
          users: INITIAL_USERS,
          expenses: INITIAL_EXPENSES,
          openingCash: 50000,
          cashRegisterClosures: [],
          employees: INITIAL_EMPLOYEES,
          payrollSettlements: [],
          lastUpdatedAt: new Date().toISOString(),
        })
      );
    } catch (e) {
      console.warn('Error resetting cloud document:', e);
    }
  };

  return (
    <ParkingContext.Provider
      value={{
        spots,
        vehicles,
        washServices,
        washOrders,
        accessoryProducts,
        accessorySales,
        monthlyContracts,
        completedSessions,
        settings,
        simulatedMinutesAdded,
        currentTime,
        isCloudSynced,
        cloudSyncStatus,
        lastCloudSyncTime,
        users,
        currentUser,
        isAuthenticated,
        login,
        logout,
        lockSystem,
        setCurrentUser,
        updateUserPin,
        updateUser,
        addUser,
        deleteUser,
        verifyUserPin,
        expenses,
        addExpense,
        updateExpense,
        deleteExpense,
        cashRegisterClosures,
        currentCashShift,
        isCashRegisterOpen,
        openDailyCashRegister,
        closeCashRegister,
        openingCash,
        setOpeningCash,
        employees,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        payrollSettlements,
        generatePayrollSettlement,
        markPayrollPaid,
        addVehicleBehaviorNote,
        updateVehicleBehaviorRating,
        updateSettings,
        addWashService,
        updateWashService,
        deleteWashService,
        addAccessoryProduct,
        updateAccessoryProduct,
        saveAccessoryProduct,
        deleteAccessoryProduct,
        checkInVehicle,
        updateActiveSpotSession,
        checkOutVehicle,
        cancelActiveSpotSession,
        toggleSpotValetParking,
        addWashOrder,
        requestCustomerWashOrder,
        updateWashStatus,
        sellAccessories,
        requestCustomerAccessories,
        createMonthlyContract,
        updateMonthlyContract,
        deleteMonthlyContract,
        markClientVIP,
        payVIPAccumulatedBalance,
        saveVehicle,
        getVehicleByPlate,
        advanceTime,
        resetTime,
        resetToInitialData,
        getSpotSession,
        autoSnapshots,
        exportBackupData,
        downloadBackupFile,
        restoreFromBackupData,
        restoreFromSnapshot,
        forceCloudSync,
      }}
    >
      {children}
    </ParkingContext.Provider>
  );
};

export const useParking = () => {
  const context = useContext(ParkingContext);
  if (!context) {
    throw new Error('useParking must be used within a ParkingProvider');
  }
  return context;
};
