import React, { createContext, useContext, useState, useEffect } from 'react';
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
  CashRegisterCloseRecord,
  POSTerminalProvider,
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
  washServiceId?: string;
  hasValetParking?: boolean;
  valetParkingFee?: number;
  valetDriver?: string;
  valetNotes?: string;
  notes?: string;
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

  // Expenses & Daily Cash
  expenses: BusinessExpense[];
  addExpense: (expense: Omit<BusinessExpense, 'id' | 'createdAt'>) => BusinessExpense;
  updateExpense: (id: string, updates: Partial<BusinessExpense>) => void;
  deleteExpense: (id: string) => void;
  cashRegisterClosures: CashRegisterCloseRecord[];
  closeCashRegister: (record: Omit<CashRegisterCloseRecord, 'id'>) => CashRegisterCloseRecord;
  openingCash: number;
  setOpeningCash: (amount: number) => void;

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
  deleteAccessoryProduct: (id: string) => void;

  // Actions
  checkInVehicle: (data: CheckInData) => ParkingSession;
  checkOutVehicle: (
    spotNumber: number,
    paymentMethod: PaymentMethod,
    posInfo?: { provider: POSTerminalProvider; authorizationCode: string }
  ) => ParkingSession | null;
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
    posInfo?: { provider: POSTerminalProvider; authorizationCode: string }
  ) => void;
  requestCustomerAccessories: (spotNumber: number, items: AccessorySaleItem[], notes?: string) => boolean;
  createMonthlyContract: (contract: Omit<MonthlyContract, 'id' | 'contractNumber'>) => MonthlyContract;
  updateMonthlyContract: (id: string, updates: Partial<MonthlyContract>) => void;
  saveVehicle: (vehicle: Vehicle) => void;
  getVehicleByPlate: (plate: string) => Vehicle | undefined;
  advanceTime: (minutes: number) => void;
  resetTime: () => void;
  resetToInitialData: () => void;
  getSpotSession: (spotNumber: number) => ParkingSession | undefined;
}

const ParkingContext = createContext<ParkingContextType | undefined>(undefined);

const STORAGE_KEYS = {
  SPOTS: 'parking_app_spots_v2',
  VEHICLES: 'parking_app_vehicles_v2',
  WASH_SERVICES: 'parking_app_wash_services_v2',
  WASH_ORDERS: 'parking_app_wash_orders_v2',
  ACCESSORIES: 'parking_app_accessories_v2',
  SALES: 'parking_app_sales_v2',
  CONTRACTS: 'parking_app_contracts_v2',
  SESSIONS_HIST: 'parking_app_hist_sessions_v2',
  SETTINGS: 'parking_app_settings_v2',
  USERS: 'parking_app_users_v2',
  ACTIVE_USER: 'parking_app_active_user_v2',
  AUTH_STATE: 'parking_app_auth_state_v2',
  EXPENSES: 'parking_app_expenses_v2',
  EMPLOYEES: 'parking_app_employees_v2',
  PAYROLL: 'parking_app_payroll_v2',
  CASH_CLOSURES: 'parking_app_cash_closures_v2',
  OPENING_CASH: 'parking_app_opening_cash_v2',
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

  // Employees & Payroll
  const [employees, setEmployees] = useState<Employee[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
    return saved ? JSON.parse(saved) : INITIAL_EMPLOYEES;
  });

  const [payrollSettlements, setPayrollSettlements] = useState<PayrollSettlement[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PAYROLL);
    return saved ? JSON.parse(saved) : [];
  });

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
      lastVisit: currentTime.toISOString(),
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
          requestedAt: currentTime.toISOString(),
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
      entryTime: currentTime.toISOString(),
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

  // Check Out Vehicle
  const checkOutVehicle = (
    spotNumber: number,
    paymentMethod: PaymentMethod,
    posInfo?: { provider: POSTerminalProvider; authorizationCode: string }
  ): ParkingSession | null => {
    const spot = spots.find((s) => s.number === spotNumber);
    if (!spot || !spot.currentSession) return null;

    const currentSession = spot.currentSession;
    const pricing = calculateParkingFee(
      currentSession.entryTime,
      currentTime,
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
      exitTime: currentTime.toISOString(),
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
      posProvider: posInfo?.provider,
      authorizationCode: posInfo?.authorizationCode,
      posFeePercent: posCalculation.feePercent > 0 ? posCalculation.feePercent : undefined,
      posFeeAmount: posCalculation.feeAmount > 0 ? posCalculation.feeAmount : undefined,
      netAmountReceived: posCalculation.netAmount,
    };

    // Update vehicle spending
    setVehicles((prev) =>
      prev.map((v) => {
        if (v.plate.toUpperCase() === completedSession.plate.toUpperCase()) {
          return {
            ...v,
            totalSpent: (v.totalSpent || 0) + totalAmount,
            lastVisit: currentTime.toISOString(),
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

  const closeCashRegister = (recordData: Omit<CashRegisterCloseRecord, 'id'>): CashRegisterCloseRecord => {
    const newRecord: CashRegisterCloseRecord = {
      ...recordData,
      id: `cls_${Date.now()}`,
    };
    setCashRegisterClosures((prev) => [newRecord, ...prev]);
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

  const deleteAccessoryProduct = (id: string) => {
    setAccessoryProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const advanceTime = (minutes: number) => {
    setSimulatedMinutesAdded((prev) => prev + minutes);
  };

  const resetTime = () => {
    setSimulatedMinutesAdded(0);
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
        deleteAccessoryProduct,
        checkInVehicle,
        checkOutVehicle,
        toggleSpotValetParking,
        addWashOrder,
        requestCustomerWashOrder,
        updateWashStatus,
        sellAccessories,
        requestCustomerAccessories,
        createMonthlyContract,
        updateMonthlyContract,
        saveVehicle,
        getVehicleByPlate,
        advanceTime,
        resetTime,
        resetToInitialData,
        getSpotSession,
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
