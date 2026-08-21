export type SpotStatus = 'available' | 'occupied' | 'reserved_monthly' | 'maintenance';

export type ContractType = 'semanal' | 'diurno' | 'nocturno' | 'completo_24_7';

export type WashStatus = 'pending' | 'in_progress' | 'ready' | 'delivered';

export type PaymentMethod =
  | 'efectivo'
  | 'tarjeta_debito'
  | 'tarjeta_credito'
  | 'transferencia'
  | 'cuenta_corriente_vip';

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
  isVIP?: boolean; // VIP customer category (accumulated payment / tab)
  vipCreditLimit?: number; // Maximum credit limit for accumulated payments (e.g. 100.000 CLP)
  vipAccumulatedBalance?: number; // Current accumulated unpaid balance
  behaviorRating?: BehaviorRating;
  behaviorNotes?: (BehaviorNote | string)[] | string;
  lastVisit?: string;
  createdAt: string;
}

export interface Client {
  rut?: string;
  name: string;
  phone?: string;
  email?: string;
  plates: string[];
  isVIP?: boolean;
  vipCreditLimit?: number;
  vipAccumulatedBalance?: number;
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
  sessionId?: string;
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
  isVIP?: boolean; // Client VIP flag
  entryTime: string; // ISO string
  isManualEntryTime?: boolean; // True if operator manually specified entry time
  exitTime?: string; // ISO string when finished
  isManualExitTime?: boolean; // True if operator manually specified exit time
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
  type: ContractType; // semanal, diurno, nocturno, completo_24_7
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
  weeklyContractPrice?: number; // e.g. 15.000 CLP
  weeklyContractSchedule?: string; // e.g. "7 Días Continuos (24 Horas)"
  weeklyContractDescription?: string; // e.g. "Tarifa plana semanal para estadías temporales"
  dayContractPrice: number; // 45.000 CLP
  dayContractSchedule?: string; // e.g. "08:00 a 20:00 hrs"
  dayContractDescription?: string; // e.g. "Arriendo de uso comercial diurno"
  nightContractPrice: number; // 35.000 CLP
  nightContractSchedule?: string; // e.g. "20:00 a 08:00 hrs"
  nightContractDescription?: string; // e.g. "Custodia nocturna segura con portón y cámaras"
  fullContractPrice: number; // 70.000 CLP
  fullContractSchedule?: string; // e.g. "24 Horas / Lunes a Domingo"
  fullContractDescription?: string; // e.g. "Acceso ilimitado 24/7 sin restricción horaria"
  operatingHoursStart: string; // "07:00"
  operatingHoursEnd: string; // "23:00"
  frequentThreshold: number; // 3 visits
  frequentDiscountPercent: number; // 0% or 10%
  frequentDiscountPercentage?: number; // alias
  // POS Terminal Commission Fees
  posTuuDebitFeePercent: number; // e.g. 1.49 (%)
  posTuuCreditFeePercent: number; // e.g. 2.19 (%)
  posMercadoPagoDebitFeePercent: number; // e.g. 2.95 (%)
  posMercadoPagoCreditFeePercent: number; // e.g. 3.49 (%)
  // Accounting & Tax settings (Chile)
  ppmRatePercent: number; // e.g. 1.5%
  ppmRateChile?: number; // alias
  ivaRatePercent: number; // 19%
  ivaRateChile?: number; // alias
  honorariosRetentionPercent: number; // 13.75% / 14.5%
  retencionHonorariosRateChile?: number; // alias
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

export type ExpenseDocumentType = 'boleta' | 'factura' | 'vale_caja' | 'transferencia' | 'boleta_honorarios' | 'otro';
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

export interface CashRegisterOpeningRecord {
  id: string;
  date: string;
  openedAt: string;
  cashierName: string;
  openedBy?: string; // alias
  initialCash: number;
  initialOpeningCash?: number; // alias
  notes?: string;
  status: 'open' | 'closed';
}

export interface CashRegisterCloseRecord {
  id: string;
  date: string;
  openedAt?: string;
  closedAt?: string;
  cashierName?: string;
  closedBy?: string; // alias
  openingCash: number;
  cashRevenue?: number;
  cashIncomes?: number; // alias
  cardRevenue?: number;
  cardIncomes?: number; // alias
  transferRevenue?: number;
  transferIncomes?: number; // alias
  vipCreditRevenue?: number;
  vipCreditIncomes?: number; // alias
  totalRevenue?: number;
  totalIncomes?: number; // alias
  cashExpenses: number;
  bankExpenses: number;
  totalExpenses: number;
  expectedCashInDrawer?: number;
  theoreticalCashInDrawer?: number; // alias
  actualCashCounted?: number;
  actualCountedCash?: number; // alias
  difference: number; // actual - expected (0: cuadrado, >0: sobrante, <0: faltante)
  breakdown?: CashDenominationCount[];
  notes?: string;
  status?: 'closed';
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
  createdAt?: string; // alias
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

export interface AutoSnapshot {
  id: string;
  timestamp: string;
  summary: string;
  data: any;
}

