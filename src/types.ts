export type SpotStatus = 'available' | 'occupied' | 'reserved_monthly' | 'maintenance';

export type ContractType = 'diurno' | 'nocturno' | 'completo_24_7';

export type WashStatus = 'pending' | 'in_progress' | 'ready' | 'delivered';

export type PaymentMethod = 'efectivo' | 'tarjeta_debito' | 'tarjeta_credito' | 'transferencia';

export type POSTerminalProvider = 'tuu' | 'mercadopago';

export interface POSCommissionInfo {
  provider: POSTerminalProvider;
  authorizationCode: string;
  feePercent: number;
  feeAmount: number;
  netAmount: number;
}

export type BehaviorRating = 'excelente' | 'bueno' | 'regular' | 'problematico' | 'conflictivo' | 'moroso' | 'vetado';
export type CustomerBehaviorRating = BehaviorRating;

export interface BehaviorNote {
  id: string;
  date: string;
  rating: BehaviorRating;
  comment: string;
  author: string;
  isAlert?: boolean;
}

export interface Vehicle {
  plate: string; // e.g. "ABCD-12", "AB-1234"
  brand: string;
  model: string;
  color: string;
  year?: number;
  notes?: string;
  clientName?: string;
  clientRut?: string;
  clientPhone?: string;
  clientEmail?: string;
  visitsCount: number;
  totalSpent: number;
  isFrequent: boolean; // >= 3 visits or marked
  behaviorRating?: BehaviorRating;
  behaviorNotes?: BehaviorNote[];
  lastVisit?: string;
  createdAt: string;
}

export interface Client {
  rut?: string;
  name: string;
  phone?: string;
  email?: string;
  plates: string[];
}

export const WASH_CATEGORIES = ['exterior', 'interior', 'completo', 'detailing'] as const;
export type WashCategory = typeof WASH_CATEGORIES[number];

export interface WashService {
  id: string;
  name: string;
  description: string;
  price: number;
  durationMinutes: number;
  category: WashCategory;
  iconName?: string;
}

export interface WashOrder {
  id: string;
  ticketId?: string;
  spotNumber?: number;
  plate: string;
  serviceId: string;
  serviceName: string;
  price: number;
  washerName?: string;
  status: WashStatus;
  notes?: string;
  requestedAt: string;
  startedAt?: string;
  completedAt?: string;
  paid: boolean;
  paymentMethod?: PaymentMethod;
  posProvider?: POSTerminalProvider;
  authorizationCode?: string;
  posFeePercent?: number;
  posFeeAmount?: number;
  netAmountReceived?: number;
}

export const ACCESSORY_CATEGORIES = ['limpieza', 'aromas', 'electronica', 'emergencia', 'confort'] as const;
export type AccessoryCategory = typeof ACCESSORY_CATEGORIES[number];

export interface AccessoryProduct {
  id: string;
  name: string;
  category: AccessoryCategory;
  price: number;
  costPrice: number;
  stock: number;
  minStock: number;
  description: string;
  sku: string;
  image?: string;
}

export interface AccessorySaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface AccessorySale {
  id: string;
  ticketId?: string;
  spotNumber?: number;
  date: string;
  soldAt?: string; // alias for date compatibility
  items: AccessorySaleItem[];
  total: number;
  totalAmount?: number; // alias for total compatibility
  paymentMethod: PaymentMethod;
  clientName?: string;
  paid: boolean;
  posProvider?: POSTerminalProvider;
  authorizationCode?: string;
  posFeePercent?: number;
  posFeeAmount?: number;
  netAmountReceived?: number;
}

export interface ParkingSession {
  id: string;
  ticketNumber: string;
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
  isFrequent: boolean;
  entryTime: string; // ISO string
  exitTime?: string; // ISO string when finished
  simulatedElapsedMinutes?: number; // for manual time tests
  status: 'active' | 'completed' | 'cancelled';
  
  // Pricing breakdown
  baseTierMinutes: number; // 30 min fixed
  baseTierCost: number; // $900
  extraTierMinutes: number; // 10 min each
  extraTierCost: number; // $300 each
  extraTiersCount: number;
  parkingCost: number;
  
  // Extra services associated
  washOrders: WashOrder[];
  accessorySales: AccessorySaleItem[];
  hasValetParking?: boolean;
  valetParkingFee?: number;
  valetDriver?: string;
  valetNotes?: string;
  
  totalServicesCost: number;
  totalAmount: number;
  paymentMethod?: PaymentMethod;
  posProvider?: POSTerminalProvider;
  authorizationCode?: string;
  posFeePercent?: number;
  posFeeAmount?: number;
  netAmountReceived?: number;
  notes?: string;
  qrCodeUrl?: string;
}

export interface ParkingSpot {
  number: number; // 1 to 10
  status: SpotStatus;
  currentSessionId?: string;
  currentSession?: ParkingSession;
  monthlyContractId?: string;
  monthlyContract?: MonthlyContract;
  lastStatusChange: string;
  accumulatedEmptyMinutesToday: number;
}

export interface MonthlyContract {
  id: string;
  contractNumber: string;
  spotNumber?: number; // fixed spot or flexible
  plate: string;
  brand: string;
  model: string;
  color: string;
  clientName: string;
  clientRut: string;
  clientPhone: string;
  clientEmail?: string;
  type: ContractType; // diurno, nocturno, completo_24_7
  monthlyFee: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'expired' | 'pending';
  lastPaymentDate?: string;
  paymentMethod?: PaymentMethod;
  posProvider?: POSTerminalProvider;
  authorizationCode?: string;
  posFeePercent?: number;
  posFeeAmount?: number;
  netAmountReceived?: number;
  createdAt?: string;
  notes?: string;
}

export interface ShiftClosure {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  cashierName: string;
  totalParkingRevenue: number;
  totalWashRevenue: number;
  totalAccessoriesRevenue: number;
  totalMonthlyRevenue: number;
  totalRevenue: number;
  totalLostVacancyCost: number;
  totalVehiclesServed: number;
  totalWashServed: number;
  notes?: string;
}

export interface ParkingSettings {
  parkingName: string;
  address: string;
  phone: string;
  rut: string;
  siiOffice: string; // e.g. "SII Calama"
  hourlyCapacity: number; // 10 spots
  base30MinPrice: number; // 900 CLP
  extra10MinPrice: number; // 300 CLP
  baseTierMinutes?: number;
  baseTierCost?: number;
  extraTierMinutes?: number;
  extraTierCost?: number;
  valetParkingPrice?: number; // e.g. 2.000 CLP
  valetParkingEnabled?: boolean;
  dayContractPrice: number; // 45.000 CLP
  nightContractPrice: number; // 35.000 CLP
  fullContractPrice: number; // 70.000 CLP
  operatingHoursStart: string; // "07:00"
  operatingHoursEnd: string; // "23:00"
  frequentThreshold: number; // 3 visits
  frequentDiscountPercent: number; // 0% or 10%
  // POS Terminal Commission Fees
  posTuuDebitFeePercent: number; // e.g. 1.49 (%)
  posTuuCreditFeePercent: number; // e.g. 2.19 (%)
  posMercadoPagoDebitFeePercent: number; // e.g. 2.95 (%)
  posMercadoPagoCreditFeePercent: number; // e.g. 3.49 (%)
  // Accounting & Tax settings (Chile)
  ppmRatePercent: number; // e.g. 1.5%
  ivaRatePercent: number; // 19%
  honorariosRetentionPercent: number; // 13.75% / 14.5%
  minWageChile: number; // e.g. 500000 CLP
  expenseCategories: string[];
}

export type ExpenseCategory =
  | 'insumos_lavado'
  | 'aseo_limpieza'
  | 'mantenimiento'
  | 'servicios_basicos'
  | 'colaciones_cafe'
  | 'combustible'
  | 'utiles_oficina'
  | 'seguridad'
  | 'otros';

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'insumos_lavado',
  'aseo_limpieza',
  'mantenimiento',
  'servicios_basicos',
  'colaciones_cafe',
  'combustible',
  'utiles_oficina',
  'seguridad',
  'otros',
];

export type ExpenseDocumentType = 'boleta' | 'factura' | 'vale_caja' | 'transferencia' | 'otro';
export type DocumentType = ExpenseDocumentType;
export type PaymentSource = 'efectivo_caja' | 'cuenta_bancaria';

export interface BusinessExpense {
  id: string;
  date: string;
  concept: string;
  category: ExpenseCategory | string;
  amount: number;
  documentType: ExpenseDocumentType;
  documentNumber?: string;
  paymentSource: 'efectivo_caja' | 'cuenta_bancaria';
  responsible: string;
  hasInvoiceIVA: boolean; // Factura con IVA 19%
  notes?: string;
  createdAt: string;
}

export interface CashDenominationCount {
  denomination: number;
  count: number;
  total: number;
}

export interface CashRegisterCloseRecord {
  id: string;
  date: string;
  openedAt: string;
  closedAt: string;
  cashierName: string;
  openingCash: number;
  cashRevenue: number;
  cardRevenue: number;
  transferRevenue: number;
  totalRevenue: number;
  cashExpenses: number;
  bankExpenses: number;
  totalExpenses: number;
  expectedCashInDrawer: number;
  actualCashCounted: number;
  difference: number; // actual - expected (0: cuadrado, >0: sobrante, <0: faltante)
  breakdown?: CashDenominationCount[];
  notes?: string;
  status: 'closed';
}

export type AFPName = 'habitat' | 'provida' | 'capital' | 'cuprum' | 'planvital' | 'modelo' | 'uno';
export type AFPOption = AFPName;
export type HealthSystem = 'fonasa' | 'isapre';

export interface Employee {
  id: string;
  rut: string;
  name: string;
  role: 'lavador' | 'cajero' | 'operador' | 'administrador' | 'supervisor';
  contractType: 'indefinido' | 'plazo_fijo';
  startDate: string;
  baseSalary: number; // Sueldo Base (ej. 500.000 CLP)
  afp: AFPName;
  healthSystem: 'fonasa' | 'isapre';
  healthPlanUF?: number;
  mealAllowance: number; // Colación (no imponible)
  transportAllowance: number; // Movilización (no imponible)
  active: boolean;
}

export interface PayrollSettlement {
  id: string;
  month: string; // e.g. "2026-08"
  employeeId: string;
  employeeName: string;
  employeeRut: string;
  employeeRole: string;
  contractType: 'indefinido' | 'plazo_fijo';
  workedDays: number;
  
  // Haberes Imponibles
  baseSalary: number;
  legalGratification: number; // 25% con tope legal chileno 4.75 IMM / 12 ($197.917)
  overtimeHours: number;
  overtimeAmount: number;
  bonuses: number;
  totalTaxableIncome: number; // Total Imponible
  
  // Haberes No Imponibles
  mealAllowance: number;
  transportAllowance: number;
  totalNonTaxableIncome: number;
  totalGrossIncome: number; // Total Haberes Bruto
  
  // Descuentos Legales Previsionales (Trabajador)
  afpName: AFPName;
  afpRate: number; // ej. 11.45%
  afpAmount: number;
  healthRate: number; // 7% o UF
  healthAmount: number;
  unemploymentWorkerRate: number; // 0.6% indefinido / 0% plazo fijo
  unemploymentWorkerAmount: number;
  secondCategoryTax: number; // Impuesto Único 2da Cat
  otherDeductions: number;
  totalDeductions: number; // Total Descuentos
  
  // Sueldo Líquido
  netSalaryToPay: number; // Líquido a Pagar
  
  // Aportes Patronales (Costo Empresa Leyes Chilenas)
  unemploymentEmployerAmount: number; // 2.4% indefinido / 3.0% plazo fijo
  sisAmount: number; // SIS 1.49%
  mutualAmount: number; // Mutual 0.93%
  totalEmployerCost: number; // Costo Total Empleador
  
  paidAt: string;
  paymentMethod: PaymentMethod;
  status: 'draft' | 'paid';
}

export type UserRole = 'admin' | 'supervisor' | 'cajero' | 'operador' | 'lavador';

export interface AppUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  pin: string; // 8-digit PIN strictly validated, default "12345678"
  email?: string;
  phone?: string;
  active: boolean;
  createdAt: string;
}

