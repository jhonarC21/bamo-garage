import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { doc, onSnapshot, setDoc, deleteDoc, collection } from 'firebase/firestore';
import { db, allDbs } from '../firebase';
import {
  ParkingSpot,
  Vehicle,
  VehicleType,
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
  VehicleAuditLog,
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
  isContractActiveNow,
} from '../utils/pricing';

interface CheckInData {
  spotNumber: number;
  plate: string;
  brand: string;
  model: string;
  color: string;
  year?: number;
  vehicleType?: VehicleType;
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
      vehicleType?: VehicleType;
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
  removeWashOrder: (orderId: string, spotNumber?: number) => { success: boolean; message: string };
  removeAccessoryItemFromSpot: (spotNumber: number, productId: string, removeQuantity?: number) => { success: boolean; message: string };
  cancelAccessorySale: (saleId: string) => { success: boolean; message: string };
  createMonthlyContract: (contract: Omit<MonthlyContract, 'id' | 'contractNumber'>) => MonthlyContract;
  updateMonthlyContract: (id: string, updates: Partial<MonthlyContract>) => void;
  deleteMonthlyContract: (contractId: string, adminPinOrBypass?: string) => { success: boolean; message: string };
  saveVehicle: (vehicle: Vehicle) => void;
  getVehicleByPlate: (plate: string) => Vehicle | undefined;
  reclassifySessionPaymentMethod: (
    sessionId: string,
    newPaymentMethod: PaymentMethod,
    posInfo?: { provider: POSTerminalProvider; authorizationCode: string },
    siiBoletaNumber?: string,
    transferVoucherNumber?: string
  ) => { success: boolean; message: string };
  setCustomerPaymentPreference: (spotNumber: number, preference: 'efectivo' | 'debito') => boolean;
  deleteVehicle: (plate: string, adminPinOrBypass?: string) => { success: boolean; message: string };
  vehicleAuditLogs: VehicleAuditLog[];
  addVehicleAuditLog: (log: Omit<VehicleAuditLog, 'id' | 'timestamp'>) => void;
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

// Ensure local storage is wiped so no residual or outdated local data is ever accessed
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.clear();
  }
} catch {
  // safe fallback
}

export const ParkingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [spots, setSpots] = useState<ParkingSpot[]>(INITIAL_SPOTS);
  const [vehicles, setVehicles] = useState<Vehicle[]>(INITIAL_VEHICLES);
  const [vehicleAuditLogs, setVehicleAuditLogs] = useState<VehicleAuditLog[]>([]);
  const [washServices, setWashServices] = useState<WashService[]>(INITIAL_WASH_SERVICES);
  const [washOrders, setWashOrders] = useState<WashOrder[]>(() => {
    const orders: WashOrder[] = [];
    INITIAL_SPOTS.forEach((s) => {
      if (s.currentSession?.washOrders) {
        orders.push(...s.currentSession.washOrders);
      }
    });
    return orders;
  });
  const [accessoryProducts, setAccessoryProducts] = useState<AccessoryProduct[]>(INITIAL_ACCESSORIES);
  const [accessorySales, setAccessorySales] = useState<AccessorySale[]>([]);
  const [monthlyContracts, setMonthlyContracts] = useState<MonthlyContract[]>(INITIAL_MONTHLY_CONTRACTS);
  const [completedSessions, setCompletedSessions] = useState<ParkingSession[]>(INITIAL_COMPLETED_SESSIONS);
  const [vipPaymentRecords, setVipPaymentRecords] = useState<VIPPaymentRecord[]>([]);
  const [settings, setSettings] = useState<ParkingSettings>(DEFAULT_SETTINGS);

  // Users with 8-digit PIN (default "12345678")
  const [users, setUsers] = useState<AppUser[]>(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState<AppUser>(INITIAL_USERS[0]);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);

  // Expenses & Cash register
  const [expenses, setExpenses] = useState<BusinessExpense[]>(INITIAL_EXPENSES);
  const [openingCash, setOpeningCash] = useState<number>(50000);
  const [cashRegisterClosures, setCashRegisterClosures] = useState<CashRegisterCloseRecord[]>([]);
  const [currentCashShift, setCurrentCashShift] = useState<CashRegisterOpeningRecord | null>({
    id: 'shift_default',
    date: new Date().toISOString().split('T')[0],
    openedAt: new Date().toISOString(),
    cashierName: 'Administrador Principal',
    initialCash: 50000,
    status: 'open',
  });

  const isCashRegisterOpen = currentCashShift?.status === 'open';

  // Employees & Payroll
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [payrollSettlements, setPayrollSettlements] = useState<PayrollSettlement[]>([]);

  // Auto Snapshots for instant recovery
  const [autoSnapshots, setAutoSnapshots] = useState<AutoSnapshot[]>([]);

  // Cloud Firestore Sync State
  const [isLoadedFromCloud, setIsLoadedFromCloud] = useState<boolean>(false);
  const [isCloudSynced, setIsCloudSynced] = useState<boolean>(true);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'connected' | 'syncing' | 'offline' | 'error'>('connected');
  const [lastCloudSyncTime, setLastCloudSyncTime] = useState<Date | null>(null);
  const isIncomingCloudUpdate = useRef<boolean>(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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

  // --- Hybrid Targeted Cloud Synchronization (Local-First Architecture) ---
  // Sync essential active ticket data to Firestore 'tickets' & 'active_tickets' collection for customer QR portal
  const syncActiveTicketToFirestore = useCallback(
    async (session: ParkingSession | null | undefined, customSettings?: ParkingSettings) => {
      if (!session || !session.ticketNumber) return;
      try {
        const activeSettings = customSettings || settings;
        const cleanPlate = session.plate.trim().toUpperCase();
        const normPlate = cleanPlate.replace(/[^A-Z0-9]/g, '');
        const nowIso = new Date().toISOString();
        const effectiveEntryTime = session.entryTime || nowIso;

        // Construct document payload strictly including required fields:
        // plate, spotNumber, status: 'occupied', and lastStatusChange
        const payload = sanitizeForFirestore({
          id: session.id,
          ticketNumber: session.ticketNumber,
          spotNumber: session.spotNumber,
          plate: cleanPlate,
          normalizedPlate: normPlate,
          status: 'occupied', // Explicitly 'occupied' as required for customer portal query
          sessionStatus: 'active',
          isOccupied: true,
          lastStatusChange: effectiveEntryTime, // Explicitly lastStatusChange
          entryTime: effectiveEntryTime,
          isManualEntryTime: !!session.isManualEntryTime,
          brand: session.brand || 'Sin Marca',
          model: session.model || 'Sin Modelo',
          color: session.color || 'Sin Color',
          year: session.year || null,
          vehicleType: session.vehicleType || 'auto',
          clientName: session.clientName || null,
          clientPhone: session.clientPhone || null,
          clientEmail: session.clientEmail || null,
          clientRut: session.clientRut || null,
          hasValetParking: !!session.hasValetParking,
          valetParkingFee: session.valetParkingFee || 0,
          valetDriver: session.valetDriver || null,
          valetNotes: session.valetNotes || null,
          parkingCost: session.parkingCost || activeSettings.base30MinPrice,
          totalServicesCost: session.totalServicesCost || 0,
          totalAmount: session.totalAmount || activeSettings.base30MinPrice,
          washOrders: session.washOrders || [],
          accessorySales: session.accessorySales || [],
          customerPaymentPreference: session.customerPaymentPreference || null,
          customerPaymentPreferenceTime: session.customerPaymentPreferenceTime || null,
          rates: {
            base30MinPrice: activeSettings.base30MinPrice,
            extra10MinPrice: activeSettings.extra10MinPrice,
            valetParkingPrice: activeSettings.valetParkingPrice ?? 2000,
            parkingName: activeSettings.parkingName,
            address: activeSettings.address,
            phone: activeSettings.phone,
            rut: activeSettings.rut,
            siiOffice: activeSettings.siiOffice,
          },
          lastUpdatedAt: nowIso,
        });

        // Keys to index in Firestore for instant search by plate, ticket, or spot
        const docKeys = Array.from(
          new Set([
            session.ticketNumber,
            cleanPlate,
            normPlate,
            `plate_${normPlate}`,
            `spot_${session.spotNumber}`,
          ].filter(Boolean))
        );

        const writePromises: Promise<any>[] = [];
        for (const targetDb of allDbs) {
          for (const key of docKeys) {
            writePromises.push(
              setDoc(doc(targetDb, 'tickets', key), payload, { merge: true }),
              setDoc(doc(targetDb, 'active_tickets', key), payload, { merge: true }),
              setDoc(doc(targetDb, 'sesiones', key), payload, { merge: true })
            );
          }
          // Spot doc
          writePromises.push(
            setDoc(
              doc(targetDb, 'spots', String(session.spotNumber)),
              {
                spotNumber: session.spotNumber,
                plate: cleanPlate,
                status: 'occupied',
                lastStatusChange: effectiveEntryTime,
                currentSession: payload,
                lastUpdatedAt: nowIso,
              },
              { merge: true }
            )
          );
        }

        await Promise.allSettled(writePromises);

        setIsCloudSynced(true);
        setCloudSyncStatus('connected');
        setLastCloudSyncTime(new Date());
      } catch (err) {
        console.warn('Error syncing active ticket to Firestore:', err);
      }
    },
    [settings]
  );

  // Complete or clean up ticket from tickets and active_tickets collections
  const completeTicketInFirestore = useCallback(
    async (
      ticketNumber: string,
      exitData?: { exitTime: string; totalAmount: number; paymentMethod: string },
      plate?: string,
      spotNum?: number
    ) => {
      if (!ticketNumber) return;
      try {
        const cleanPlate = plate ? plate.trim().toUpperCase() : '';
        const normPlate = cleanPlate.replace(/[^A-Z0-9]/g, '');
        const exitTimeIso = exitData?.exitTime || new Date().toISOString();

        const exitPayload = sanitizeForFirestore({
          status: 'completed',
          sessionStatus: 'completed',
          isOccupied: false,
          exitTime: exitTimeIso,
          lastStatusChange: exitTimeIso,
          totalAmount: exitData?.totalAmount || 0,
          paymentMethod: exitData?.paymentMethod || 'efectivo',
          lastUpdatedAt: new Date().toISOString(),
        });

        const docKeys = Array.from(
          new Set([
            ticketNumber,
            cleanPlate,
            normPlate,
            normPlate ? `plate_${normPlate}` : '',
            spotNum ? `spot_${spotNum}` : '',
          ].filter(Boolean))
        );

        const promises: Promise<any>[] = [];
        for (const targetDb of allDbs) {
          for (const key of docKeys) {
            promises.push(
              exitData
                ? setDoc(doc(targetDb, 'tickets', key), exitPayload, { merge: true })
                : deleteDoc(doc(targetDb, 'tickets', key)),
              exitData
                ? setDoc(doc(targetDb, 'active_tickets', key), exitPayload, { merge: true })
                : deleteDoc(doc(targetDb, 'active_tickets', key)),
              exitData
                ? setDoc(doc(targetDb, 'sesiones', key), exitPayload, { merge: true })
                : deleteDoc(doc(targetDb, 'sesiones', key))
            );
          }
          if (spotNum) {
            promises.push(
              setDoc(
                doc(targetDb, 'spots', String(spotNum)),
                {
                  spotNumber: spotNum,
                  status: 'available',
                  lastStatusChange: exitTimeIso,
                  currentSession: null,
                  lastUpdatedAt: new Date().toISOString(),
                },
                { merge: true }
              )
            );
          }
        }

        await Promise.allSettled(promises);
        setIsCloudSynced(true);
        setCloudSyncStatus('connected');
        setLastCloudSyncTime(new Date());
      } catch (err) {
        console.warn('Error completing/deleting ticket in Firestore:', err);
      }
    },
    []
  );

  // Sync public catalog (wash services & accessory products) for QR portal clients
  const syncPublicCatalogToFirestore = useCallback(
    async (
      services?: WashService[],
      products?: AccessoryProduct[],
      activeSettings?: ParkingSettings
    ) => {
      try {
        const catalogDocRef = doc(db, 'garage_catalog', 'public_info');
        const curServices = services || washServices;
        const curProducts = products || accessoryProducts;
        const curSettings = activeSettings || settings;

        await setDoc(
          catalogDocRef,
          sanitizeForFirestore({
            washServices: (curServices || []).filter((s) => s.availableInCustomerPortal !== false && s.enabledInClientPortal !== false),
            accessoryProducts: (curProducts || []).filter((p) => p.stock > 0),
            settings: {
              parkingName: curSettings.parkingName,
              address: curSettings.address,
              phone: curSettings.phone,
              rut: curSettings.rut,
              base30MinPrice: curSettings.base30MinPrice,
              extra10MinPrice: curSettings.extra10MinPrice,
              valetParkingPrice: curSettings.valetParkingPrice ?? 2000,
            },
            lastUpdatedAt: new Date().toISOString(),
          }),
          { merge: true }
        );
        setIsCloudSynced(true);
        setCloudSyncStatus('connected');
        setLastCloudSyncTime(new Date());
      } catch (err) {
        console.warn('Error syncing public catalog to Firestore:', err);
      }
    },
    [washServices, accessoryProducts, settings]
  );

  // Listen in real-time to tickets and active_tickets so admin automatically receives customer QR requests
  useEffect(() => {
    let unsubscribeTickets: (() => void) | undefined;
    let unsubscribeActive: (() => void) | undefined;

    const handleSnapshotChange = (snapshot: any) => {
      setIsCloudSynced(true);
      setCloudSyncStatus('connected');
      setLastCloudSyncTime(new Date());

      snapshot.docChanges().forEach((change: any) => {
        if (change.type === 'modified' || change.type === 'added') {
          const ticketData = change.doc.data();
          if (ticketData && ticketData.status === 'active' && ticketData.spotNumber) {
            setSpots((prevSpots) =>
              prevSpots.map((spot) => {
                if (
                  spot.number === ticketData.spotNumber &&
                  spot.currentSession &&
                  (spot.currentSession.ticketNumber === ticketData.ticketNumber ||
                    spot.currentSession.plate.replace(/[^A-Z0-9]/gi, '').toUpperCase() ===
                      (ticketData.normalizedPlate || (ticketData.plate || '').replace(/[^A-Z0-9]/gi, '').toUpperCase()))
                ) {
                  const localSession = spot.currentSession;
                  const remoteWash = Array.isArray(ticketData.washOrders)
                    ? ticketData.washOrders
                    : localSession.washOrders;
                  const remoteAcc = Array.isArray(ticketData.accessorySales)
                    ? ticketData.accessorySales
                    : localSession.accessorySales;
                  const remotePref =
                    ticketData.customerPaymentPreference || localSession.customerPaymentPreference;

                  const hasWashDiff =
                    JSON.stringify(remoteWash) !== JSON.stringify(localSession.washOrders);
                  const hasAccDiff =
                    JSON.stringify(remoteAcc) !== JSON.stringify(localSession.accessorySales);
                  const hasPrefDiff = remotePref !== localSession.customerPaymentPreference;

                  if (hasWashDiff || hasAccDiff || hasPrefDiff) {
                    const washCost = (remoteWash || []).reduce(
                      (sum: number, w: any) => sum + (w.price || 0),
                      0
                    );
                    const accCost = (remoteAcc || []).reduce(
                      (sum: number, a: any) => sum + (a.total || 0),
                      0
                    );
                    const valetCost = localSession.hasValetParking
                      ? localSession.valetParkingFee || 0
                      : 0;
                    const totalServices = washCost + accCost + valetCost;

                    return {
                      ...spot,
                      currentSession: {
                        ...localSession,
                        washOrders: remoteWash,
                        accessorySales: remoteAcc,
                        customerPaymentPreference: remotePref,
                        customerPaymentPreferenceTime:
                          ticketData.customerPaymentPreferenceTime ||
                          localSession.customerPaymentPreferenceTime,
                        totalServicesCost: totalServices,
                        totalAmount: localSession.parkingCost + totalServices,
                      },
                    };
                  }
                }
                return spot;
              })
            );
          }
        }
      });
    };

    try {
      unsubscribeTickets = onSnapshot(collection(db, 'tickets'), handleSnapshotChange, (error) => {
        console.warn('Firestore tickets listener note:', error);
      });
      unsubscribeActive = onSnapshot(collection(db, 'active_tickets'), handleSnapshotChange, (error) => {
        console.warn('Firestore active_tickets listener note:', error);
      });
    } catch (err) {
      console.warn('Error setting up tickets listeners:', err);
    }

    return () => {
      if (unsubscribeTickets) unsubscribeTickets();
      if (unsubscribeActive) unsubscribeActive();
    };
  }, []);

  // Sync public catalog once on startup or when services/products change
  useEffect(() => {
    syncPublicCatalogToFirestore(washServices, accessoryProducts, settings);
  }, [washServices, accessoryProducts, settings, syncPublicCatalogToFirestore]);

  // Real-time Firestore sync listener for central garage state
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    const liveDocRef = doc(db, 'garage_state', 'bamo_garage_main');

    try {
      unsubscribe = onSnapshot(
        liveDocRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            isIncomingCloudUpdate.current = true;

            if (Array.isArray(data.spots)) setSpots(data.spots);
            if (Array.isArray(data.vehicles)) setVehicles(data.vehicles);
            if (Array.isArray(data.vehicleAuditLogs)) setVehicleAuditLogs(data.vehicleAuditLogs);
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
            if (data.currentCashShift) setCurrentCashShift(data.currentCashShift);
            if (Array.isArray(data.employees)) setEmployees(data.employees);
            if (Array.isArray(data.payrollSettlements)) setPayrollSettlements(data.payrollSettlements);
            if (Array.isArray(data.autoSnapshots)) setAutoSnapshots(data.autoSnapshots);

            setIsLoadedFromCloud(true);
            setIsCloudSynced(true);
            setCloudSyncStatus('connected');
            setLastCloudSyncTime(new Date());

            setTimeout(() => {
              isIncomingCloudUpdate.current = false;
            }, 300);
          } else {
            // Fresh database: write initial default dataset into Firestore
            const initialPayload = sanitizeForFirestore({
              spots: INITIAL_SPOTS,
              vehicles: INITIAL_VEHICLES,
              vehicleAuditLogs: [],
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
              currentCashShift: {
                id: 'shift_default',
                date: new Date().toISOString().split('T')[0],
                openedAt: new Date().toISOString(),
                cashierName: 'Administrador Principal',
                initialCash: 50000,
                status: 'open',
              },
              employees: INITIAL_EMPLOYEES,
              payrollSettlements: [],
              autoSnapshots: [],
              lastUpdatedAt: new Date().toISOString(),
            });

            for (const targetDb of allDbs) {
              setDoc(doc(targetDb, 'garage_state', 'bamo_garage_main'), initialPayload, { merge: true }).catch(() => {});
            }
            setIsLoadedFromCloud(true);
            setIsCloudSynced(true);
            setCloudSyncStatus('connected');
            setLastCloudSyncTime(new Date());
          }
        },
        (error) => {
          console.warn('Firestore real-time state listener note:', error);
          setCloudSyncStatus('error');
        }
      );
    } catch (err) {
      console.warn('Error setting up central garage_state listener:', err);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Automatic Firestore persistence whenever state changes
  useEffect(() => {
    if (!isLoadedFromCloud || isIncomingCloudUpdate.current) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        setCloudSyncStatus('syncing');
        const payload = sanitizeForFirestore({
          spots,
          vehicles,
          vehicleAuditLogs,
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
          currentCashShift,
          employees,
          payrollSettlements,
          autoSnapshots,
          lastUpdatedAt: new Date().toISOString(),
        });

        const promises = allDbs.map((targetDb) =>
          setDoc(doc(targetDb, 'garage_state', 'bamo_garage_main'), payload, { merge: true })
        );
        await Promise.allSettled(promises);

        setIsCloudSynced(true);
        setCloudSyncStatus('connected');
        setLastCloudSyncTime(new Date());
      } catch (err) {
        console.warn('Error syncing state changes to Firestore:', err);
        setCloudSyncStatus('error');
      }
    }, 500);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [
    isLoadedFromCloud,
    spots,
    vehicles,
    vehicleAuditLogs,
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
    currentCashShift,
    employees,
    payrollSettlements,
    autoSnapshots,
  ]);

  // Synchronize dynamic contract spot reservations when time/schedules transition (e.g. Day -> Night or Night -> Day)
  useEffect(() => {
    setSpots((prevSpots) => {
      let changed = false;
      const nextSpots = prevSpots.map((spot) => {
        if (spot.status === 'occupied') return spot;

        const assignedContract = monthlyContracts.find(
          (c) => c.spotNumber === spot.number && c.status === 'active'
        );

        const shouldBeReserved = isContractActiveNow(assignedContract, currentTime, settings);
        const currentIsReserved = spot.status === 'reserved_monthly';

        if (shouldBeReserved !== currentIsReserved || spot.monthlyContractId !== assignedContract?.id) {
          changed = true;
          return {
            ...spot,
            status: shouldBeReserved ? ('reserved_monthly' as const) : ('available' as const),
            monthlyContractId: assignedContract?.id,
            monthlyContract: assignedContract,
          };
        }
        return spot;
      });

      return changed ? nextSpots : prevSpots;
    });
  }, [currentTime, monthlyContracts, settings]);

  // Lookup vehicle
  const getVehicleByPlate = (plate: string): Vehicle | undefined => {
    if (!plate) return undefined;
    const cleanPlate = plate.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    return vehicles.find(
      (v) => v.plate.replace(/[^A-Z0-9]/g, '').toUpperCase() === cleanPlate
    );
  };

  const addVehicleAuditLog = (log: Omit<VehicleAuditLog, 'id' | 'timestamp'>) => {
    const newLog: VehicleAuditLog = {
      ...log,
      id: `val_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      timestamp: currentTime.toISOString(),
    };
    setVehicleAuditLogs((prev) => [newLog, ...prev]);
  };

  const deleteVehicle = (
    plate: string,
    adminPinOrBypass?: string
  ): { success: boolean; message: string } => {
    const isAdmin = currentUser && currentUser.role === 'admin';
    const isPinValid =
      adminPinOrBypass &&
      users.some((u) => u.role === 'admin' && u.pin === adminPinOrBypass);

    if (!isAdmin && !isPinValid) {
      return {
        success: false,
        message: 'Acceso restringido: Solo un usuario con rol de Administrador o autorización mediante Clave PIN de Administrador puede eliminar registros de vehículos.',
      };
    }

    const cleanPlate = plate.trim().toUpperCase();
    const existingVehicle = getVehicleByPlate(cleanPlate);
    if (!existingVehicle) {
      return { success: false, message: `El vehículo con patente ${cleanPlate} no se encuentra registrado.` };
    }

    setVehicles((prev) => prev.filter((v) => v.plate.trim().toUpperCase() !== cleanPlate));

    addVehicleAuditLog({
      action: 'delete',
      plate: cleanPlate,
      user: currentUser.name || 'Usuario',
      userRole: currentUser.role,
      authorizedByAdmin: isAdmin ? currentUser.name : 'Administrador (PIN Autorizado)',
      adminPinVerified: true,
      description: `Eliminación permanente del registro vehicular patente ${cleanPlate} (${existingVehicle.brand} ${existingVehicle.model})`,
      previousData: existingVehicle,
    });

    return {
      success: true,
      message: `Vehículo con patente ${cleanPlate} eliminado exitosamente.`,
    };
  };

  const setCustomerPaymentPreference = (spotNumber: number, preference: 'efectivo' | 'debito'): boolean => {
    let matched = false;
    setSpots((prev) =>
      prev.map((s) => {
        if (s.number === spotNumber && s.currentSession) {
          matched = true;
          const updatedSession: ParkingSession = {
            ...s.currentSession,
            customerPaymentPreference: preference,
            customerPaymentPreferenceTime: new Date().toISOString(),
          };
          syncActiveTicketToFirestore(updatedSession, settings);
          return {
            ...s,
            currentSession: updatedSession,
          };
        }
        return s;
      })
    );
    return matched;
  };

  const saveVehicle = (newOrUpdated: Vehicle) => {
    const cleanTargetPlate = newOrUpdated.plate.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    setVehicles((prev) => {
      const idx = prev.findIndex(
        (v) => v.plate.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') === cleanTargetPlate
      );
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = {
          ...prev[idx],
          ...newOrUpdated,
          visitsCount: newOrUpdated.visitsCount || prev[idx].visitsCount || 1,
          totalSpent: newOrUpdated.totalSpent ?? prev[idx].totalSpent ?? 0,
          createdAt: prev[idx].createdAt || newOrUpdated.createdAt,
        };
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
      vehicleType: data.vehicleType || existingVehicle?.vehicleType,
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
      vehicleType: updatedVehicle.vehicleType,
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

    // Sync active ticket for customer QR portal
    syncActiveTicketToFirestore(session, settings);

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
      vehicleType?: VehicleType;
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
      vehicleType: updates.vehicleType !== undefined ? updates.vehicleType : oldSession.vehicleType,
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
      vehicleType: updatedSession.vehicleType,
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
          const contract = monthlyContracts.find(
            (c) => c.spotNumber === currentSpotNumber && c.status === 'active'
          );
          const hasActiveContractNow = isContractActiveNow(contract, currentTime, settings);
          return {
            ...s,
            status: hasActiveContractNow ? 'reserved_monthly' : 'available',
            currentSessionId: undefined,
            currentSession: undefined,
            monthlyContractId: contract?.id,
            monthlyContract: contract,
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

    // Sync updated ticket
    syncActiveTicketToFirestore(updatedSession, settings);

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

          syncActiveTicketToFirestore(updatedSession, settings);

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

    // Complete ticket in Firestore
    completeTicketInFirestore(currentSession.ticketNumber, {
      exitTime: effectiveExitTime,
      totalAmount,
      paymentMethod,
    });

    // Free the spot (if it has an active contract active RIGHT NOW, return to 'reserved_monthly', otherwise 'available')
    setSpots((prev) =>
      prev.map((s) => {
        if (s.number === spotNumber) {
          const contract = monthlyContracts.find(
            (c) => c.spotNumber === spotNumber && c.status === 'active'
          );
          const hasActiveContractNow = isContractActiveNow(contract, new Date(effectiveExitTime), settings);
          return {
            ...s,
            status: hasActiveContractNow ? 'reserved_monthly' : 'available',
            currentSessionId: undefined,
            currentSession: undefined,
            monthlyContractId: contract?.id,
            monthlyContract: contract,
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
    const ticketNumber = spot.currentSession.ticketNumber;

    // Remove any active wash orders related to this canceled session
    setWashOrders((prev) => prev.filter((order) => order.sessionId !== sessionId));

    // Remove ticket from active_tickets in Firestore
    completeTicketInFirestore(ticketNumber);

    // Free the spot (if it has an active monthly contract active RIGHT NOW, return to 'reserved_monthly', otherwise 'available')
    setSpots((prev) =>
      prev.map((s) => {
        if (s.number === spotNumber) {
          const contract = monthlyContracts.find(
            (c) => c.spotNumber === spotNumber && c.status === 'active'
          );
          const hasActiveContractNow = isContractActiveNow(contract, currentTime, settings);
          return {
            ...s,
            status: hasActiveContractNow ? 'reserved_monthly' : 'available',
            currentSessionId: undefined,
            currentSession: undefined,
            monthlyContractId: contract?.id,
            monthlyContract: contract,
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
            const updatedSession = {
              ...spot.currentSession,
              washOrders: updatedOrders,
              totalServicesCost: washCost + accCost,
              totalAmount: spot.currentSession.parkingCost + washCost + accCost,
            };
            syncActiveTicketToFirestore(updatedSession, settings);
            return {
              ...spot,
              currentSession: updatedSession,
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
          const updatedSession = {
            ...spot.currentSession,
            washOrders: updatedWash,
          };
          syncActiveTicketToFirestore(updatedSession, settings);
          return {
            ...spot,
            currentSession: updatedSession,
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
          const updatedSession = {
            ...s.currentSession,
            washOrders: updatedOrders,
            totalServicesCost: washCost + accCost,
            totalAmount: s.currentSession.parkingCost + washCost + accCost,
          };
          syncActiveTicketToFirestore(updatedSession, settings);
          return {
            ...s,
            currentSession: updatedSession,
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
            const updatedSession = {
              ...spot.currentSession,
              accessorySales: updatedAcc,
              totalServicesCost: washCost + accCost,
              totalAmount: spot.currentSession.parkingCost + washCost + accCost,
            };
            syncActiveTicketToFirestore(updatedSession, settings);
            return {
              ...spot,
              currentSession: updatedSession,
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
          const updatedSession = {
            ...s.currentSession,
            accessorySales: updatedAcc,
            totalServicesCost: washCost + accCost,
            totalAmount: s.currentSession.parkingCost + washCost + accCost,
          };
          syncActiveTicketToFirestore(updatedSession, settings);
          return {
            ...s,
            currentSession: updatedSession,
          };
        }
        return s;
      })
    );

    return true;
  };

  // Remove or Cancel a Wash Order (mistake by customer or admin)
  const removeWashOrder = (orderId: string, spotNumber?: number): { success: boolean; message: string } => {
    const targetOrder = washOrders.find((o) => o.id === orderId);
    const serviceName = targetOrder?.serviceName || 'Servicio de lavado';

    // Remove from global wash orders
    setWashOrders((prev) => prev.filter((o) => o.id !== orderId));

    // Remove from active spot session if attached
    setSpots((prev) =>
      prev.map((spot) => {
        const isTargetSpot = (spotNumber && spot.number === spotNumber) ||
          spot.currentSession?.washOrders?.some((w) => w.id === orderId);

        if (isTargetSpot && spot.currentSession) {
          const currentOrders = spot.currentSession.washOrders || [];
          const updatedOrders = currentOrders.filter((w) => w.id !== orderId);
          const washCost = updatedOrders.reduce((sum, w) => sum + w.price, 0);
          const accCost = (spot.currentSession.accessorySales || []).reduce((sum, a) => sum + a.total, 0);
          const updatedSession = {
            ...spot.currentSession,
            washOrders: updatedOrders,
            totalServicesCost: washCost + accCost,
            totalAmount: spot.currentSession.parkingCost + washCost + accCost,
          };
          syncActiveTicketToFirestore(updatedSession, settings);

          return {
            ...spot,
            currentSession: updatedSession,
          };
        }
        return spot;
      })
    );

    return {
      success: true,
      message: `"${serviceName}" eliminado exitosamente. El cobro fue descontado del ticket.`,
    };
  };

  // Remove or Cancel an Accessory Product from an Active Spot Session (restores stock)
  const removeAccessoryItemFromSpot = (
    spotNumber: number,
    productId: string,
    removeQuantity?: number
  ): { success: boolean; message: string } => {
    const targetSpot = spots.find((s) => s.number === spotNumber);
    if (!targetSpot || !targetSpot.currentSession) {
      return { success: false, message: 'Puesto no encontrado o sin estadía activa.' };
    }

    const currentAcc = targetSpot.currentSession.accessorySales || [];
    const itemIndex = currentAcc.findIndex((item) => item.productId === productId);
    if (itemIndex === -1) {
      return { success: false, message: 'El producto no está asociado a este ticket.' };
    }

    const targetItem = currentAcc[itemIndex];
    const qtyToRestore = removeQuantity && removeQuantity < targetItem.quantity ? removeQuantity : targetItem.quantity;
    const remainingQty = targetItem.quantity - qtyToRestore;

    // 1. Restore stock in inventory
    setAccessoryProducts((prev) =>
      prev.map((prod) => (prod.id === productId ? { ...prod, stock: prod.stock + qtyToRestore } : prod))
    );

    // 2. Update accessorySales on spot session
    let updatedAcc: AccessorySaleItem[];
    if (remainingQty <= 0) {
      updatedAcc = currentAcc.filter((_, idx) => idx !== itemIndex);
    } else {
      updatedAcc = currentAcc.map((item, idx) =>
        idx === itemIndex
          ? {
              ...item,
              quantity: remainingQty,
              total: remainingQty * item.unitPrice,
            }
          : item
      );
    }

    // 3. Update spots state
    setSpots((prev) =>
      prev.map((spot) => {
        if (spot.number === spotNumber && spot.currentSession) {
          const washCost = (spot.currentSession.washOrders || []).reduce((sum, w) => sum + w.price, 0);
          const accCost = updatedAcc.reduce((sum, a) => sum + a.total, 0);
          const updatedSession = {
            ...spot.currentSession,
            accessorySales: updatedAcc,
            totalServicesCost: washCost + accCost,
            totalAmount: spot.currentSession.parkingCost + washCost + accCost,
          };
          syncActiveTicketToFirestore(updatedSession, settings);

          return {
            ...spot,
            currentSession: updatedSession,
          };
        }
        return spot;
      })
    );

    // 4. Update or remove unpaid pre-orders in accessorySales
    setAccessorySales((prev) =>
      prev
        .map((sale) => {
          if (sale.spotNumber === spotNumber && !sale.paid) {
            const hasProd = sale.items.some((i) => i.productId === productId);
            if (!hasProd) return sale;

            const newItems = sale.items
              .map((i) => {
                if (i.productId === productId) {
                  const rem = i.quantity - qtyToRestore;
                  return rem > 0 ? { ...i, quantity: rem, total: rem * i.unitPrice } : null;
                }
                return i;
              })
              .filter(Boolean) as AccessorySaleItem[];

            if (newItems.length === 0) return null;
            const newTotal = newItems.reduce((sum, i) => sum + i.total, 0);
            return { ...sale, items: newItems, total: newTotal, totalAmount: newTotal };
          }
          return sale;
        })
        .filter(Boolean) as AccessorySale[]
    );

    return {
      success: true,
      message: `"${targetItem.productName}" eliminado del ticket (${qtyToRestore} un. devueltas al inventario).`,
    };
  };

  // Cancel an entire accessory sale (e.g. from shop sales list)
  const cancelAccessorySale = (saleId: string): { success: boolean; message: string } => {
    const sale = accessorySales.find((s) => s.id === saleId);
    if (!sale) return { success: false, message: 'Venta no encontrada.' };

    // Restore stock for all items
    setAccessoryProducts((prev) =>
      prev.map((prod) => {
        const item = sale.items.find((i) => i.productId === prod.id);
        if (item) {
          return { ...prod, stock: prod.stock + item.quantity };
        }
        return prod;
      })
    );

    // If attached to spot, remove items from spot
    if (sale.spotNumber) {
      setSpots((prev) =>
        prev.map((spot) => {
          if (spot.number === sale.spotNumber && spot.currentSession) {
            const currentAcc = spot.currentSession.accessorySales || [];
            const saleProductIds = new Set(sale.items.map((i) => i.productId));
            const updatedAcc = currentAcc.filter((i) => !saleProductIds.has(i.productId));
            const washCost = (spot.currentSession.washOrders || []).reduce((sum, w) => sum + w.price, 0);
            const accCost = updatedAcc.reduce((sum, a) => sum + a.total, 0);
            const updatedSession = {
              ...spot.currentSession,
              accessorySales: updatedAcc,
              totalServicesCost: washCost + accCost,
              totalAmount: spot.currentSession.parkingCost + washCost + accCost,
            };
            syncActiveTicketToFirestore(updatedSession, settings);

            return {
              ...spot,
              currentSession: updatedSession,
            };
          }
          return spot;
        })
      );
    }

    setAccessorySales((prev) => prev.filter((s) => s.id !== saleId));

    return {
      success: true,
      message: 'Venta de accesorios anulada y productos restituidos al stock.',
    };
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

    // If assigned to a spot, mark spot as reserved_monthly only if currently active right now and not occupied
    if (newContract.spotNumber) {
      const isActiveNow = isContractActiveNow(newContract, currentTime, settings);
      setSpots((prev) =>
        prev.map((s) => {
          if (s.number === newContract.spotNumber) {
            return {
              ...s,
              status: s.status === 'occupied' ? 'occupied' : (isActiveNow ? 'reserved_monthly' : 'available'),
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

  const payVIPAccumulatedBalance = (
    plateOrRut: string,
    amount: number,
    paymentMethod: PaymentMethod,
    posInfo?: { provider: POSTerminalProvider; authorizationCode: string },
    siiBoletaNumber?: string,
    transferVoucherNumber?: string
  ) => {
    const clean = plateOrRut.trim().toUpperCase();
    const newRecord: VIPPaymentRecord = {
      id: `vip_pay_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      date: currentTime.toISOString(),
      plateOrRut: clean,
      amount,
      paymentMethod,
      posProvider: posInfo?.provider,
      authorizationCode: posInfo?.authorizationCode,
      siiBoletaNumber: paymentMethod === 'efectivo' ? siiBoletaNumber?.trim() : undefined,
      transferVoucherNumber: paymentMethod === 'transferencia' ? transferVoucherNumber?.trim() : undefined,
      isReconciled: false,
      reconciliationStatus: 'pending',
    };
    setVipPaymentRecords((prev) => [newRecord, ...prev]);

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

  // Reclassify / Modify payment method for completed sessions (e.g. transfer accidentally logged cash to VIP receivable credit)
  const reclassifySessionPaymentMethod = (
    sessionId: string,
    newPaymentMethod: PaymentMethod,
    posInfo?: { provider: POSTerminalProvider; authorizationCode: string },
    siiBoletaNumber?: string,
    transferVoucherNumber?: string
  ): { success: boolean; message: string } => {
    const session = completedSessions.find((s) => s.id === sessionId);
    if (!session) {
      return { success: false, message: 'La sesión no fue encontrada.' };
    }

    const prevMethod = session.paymentMethod;
    if (prevMethod === newPaymentMethod) {
      return { success: false, message: 'El medio de pago ya es el seleccionado.' };
    }

    const posCalculation = calculatePOSFee(
      session.totalAmount,
      newPaymentMethod,
      posInfo?.provider,
      settings
    );

    setCompletedSessions((prev) =>
      prev.map((s) => {
        if (s.id === sessionId) {
          return {
            ...s,
            paymentMethod: newPaymentMethod,
            posProvider: posInfo?.provider,
            authorizationCode: posInfo?.authorizationCode,
            siiBoletaNumber: newPaymentMethod === 'efectivo' ? siiBoletaNumber?.trim() : undefined,
            transferVoucherNumber: newPaymentMethod === 'transferencia' ? transferVoucherNumber?.trim() : undefined,
            posFeePercent: posCalculation.feePercent > 0 ? posCalculation.feePercent : undefined,
            posFeeAmount: posCalculation.feeAmount > 0 ? posCalculation.feeAmount : undefined,
            netAmountReceived: posCalculation.netAmount,
          };
        }
        return s;
      })
    );

    const plate = session.plate.toUpperCase();
    setVehicles((prev) =>
      prev.map((v) => {
        if (v.plate.toUpperCase() === plate) {
          let newVipBal = v.vipAccumulatedBalance || 0;
          let isVip = v.isVIP;

          if (newPaymentMethod === 'cuenta_corriente_vip') {
            newVipBal += session.totalAmount;
            isVip = true;
          } else if (prevMethod === 'cuenta_corriente_vip') {
            newVipBal = Math.max(0, newVipBal - session.totalAmount);
          }

          return {
            ...v,
            isVIP: isVip,
            vipAccumulatedBalance: newVipBal,
          };
        }
        return v;
      })
    );

    return {
      success: true,
      message: `Medio de pago actualizado a ${newPaymentMethod.replace('_', ' ').toUpperCase()}${
        newPaymentMethod === 'cuenta_corriente_vip'
          ? ' (El monto se cargó a la Cuenta Corriente VIP y se descontó de la Caja Diaria)'
          : ''
      }.`,
    };
  };

  // --- Administrator Reconciliation Audit ---
  const reconcileTransaction = (
    id: string,
    type: 'parking' | 'wash' | 'accessory' | 'contract' | 'vip_payment',
    status: ReconciliationStatus,
    notes?: string
  ) => {
    const nowIso = currentTime.toISOString();
    const adminName = currentUser.name || 'Administrador';

    if (type === 'parking') {
      setCompletedSessions((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                isReconciled: status === 'verified',
                reconciliationStatus: status,
                reconciledAt: nowIso,
                reconciledBy: adminName,
                reconciliationNotes: notes !== undefined ? notes : s.reconciliationNotes,
              }
            : s
        )
      );
    } else if (type === 'wash') {
      setWashOrders((prev) =>
        prev.map((w) =>
          w.id === id
            ? {
                ...w,
                isReconciled: status === 'verified',
                reconciliationStatus: status,
                reconciledAt: nowIso,
                reconciledBy: adminName,
                reconciliationNotes: notes !== undefined ? notes : w.reconciliationNotes,
              }
            : w
        )
      );
    } else if (type === 'accessory') {
      setAccessorySales((prev) =>
        prev.map((a) =>
          a.id === id
            ? {
                ...a,
                isReconciled: status === 'verified',
                reconciliationStatus: status,
                reconciledAt: nowIso,
                reconciledBy: adminName,
                reconciliationNotes: notes !== undefined ? notes : a.reconciliationNotes,
              }
            : a
        )
      );
    } else if (type === 'contract') {
      setMonthlyContracts((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                isReconciled: status === 'verified',
                reconciliationStatus: status,
                reconciledAt: nowIso,
                reconciledBy: adminName,
                reconciliationNotes: notes !== undefined ? notes : c.reconciliationNotes,
              }
            : c
        )
      );
    } else if (type === 'vip_payment') {
      setVipPaymentRecords((prev) =>
        prev.map((v) =>
          v.id === id
            ? {
                ...v,
                isReconciled: status === 'verified',
                reconciliationStatus: status,
                reconciledAt: nowIso,
                reconciledBy: adminName,
                reconciliationNotes: notes !== undefined ? notes : v.reconciliationNotes,
              }
            : v
        )
      );
    }
  };

  const batchReconcileTransactions = (
    items: { id: string; type: string }[],
    status: ReconciliationStatus,
    notes?: string
  ) => {
    items.forEach((item) => {
      reconcileTransaction(item.id, item.type as any, status, notes);
    });
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
    return { success: true };
  };

  const logout = () => {
    setIsAuthenticated(false);
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
        removeWashOrder,
        sellAccessories,
        requestCustomerAccessories,
        removeAccessoryItemFromSpot,
        cancelAccessorySale,
        createMonthlyContract,
        updateMonthlyContract,
        deleteMonthlyContract,
        markClientVIP,
        vipPaymentRecords,
        payVIPAccumulatedBalance,
        reconcileTransaction,
        batchReconcileTransactions,
        saveVehicle,
        deleteVehicle,
        vehicleAuditLogs,
        addVehicleAuditLog,
        getVehicleByPlate,
        setCustomerPaymentPreference,
        reclassifySessionPaymentMethod,
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
