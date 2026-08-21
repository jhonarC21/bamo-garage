import { ParkingSettings, PaymentMethod, POSTerminalProvider } from '../types';

export const DEFAULT_SETTINGS: ParkingSettings = {
  parkingName: 'Bamo Garage SpA',
  address: 'Cobija 2058, Calama',
  phone: '+56993939952',
  rut: '78.084.649-6',
  siiOffice: 'SII Calama',
  hourlyCapacity: 10,
  base30MinPrice: 900,
  extra10MinPrice: 300,
  baseTierMinutes: 30,
  baseTierCost: 900,
  extraTierMinutes: 10,
  extraTierCost: 300,
  valetParkingPrice: 2000,
  valetParkingEnabled: true,
  weeklyContractPrice: 15000,
  weeklyContractSchedule: '7 Días Continuos (24 Horas)',
  weeklyContractDescription: 'Tarifa plana semanal para estadías temporales',
  dayContractPrice: 45000,
  dayContractSchedule: '08:00 a 20:00 hrs',
  dayContractDescription: 'Arriendo de uso comercial diurno',
  nightContractPrice: 35000,
  nightContractSchedule: '20:00 a 08:00 hrs',
  nightContractDescription: 'Custodia nocturna segura con portón y cámaras',
  fullContractPrice: 70000,
  fullContractSchedule: '24 Horas / Lunes a Domingo',
  fullContractDescription: 'Acceso ilimitado 24/7 sin restricción horaria',
  operatingHoursStart: '07:00',
  operatingHoursEnd: '23:00',
  frequentThreshold: 3,
  frequentDiscountPercent: 0,
  // POS Commissions Default (Chile)
  posTuuDebitFeePercent: 1.49, // 1.49% Tuu / Redelcom Débito
  posTuuCreditFeePercent: 2.19, // 2.19% Tuu / Redelcom Crédito
  posMercadoPagoDebitFeePercent: 2.95, // 2.95% Mercado Pago Point Débito
  posMercadoPagoCreditFeePercent: 3.49, // 3.49% Mercado Pago Point Crédito
  ppmRatePercent: 1.5,
  ivaRatePercent: 19,
  honorariosRetentionPercent: 13.75,
  minWageChile: 500000,
  expenseCategories: [
    'Insumos de Lavado & Químicos',
    'Aseo, Limpieza & Desinfección',
    'Mantenimiento & Reparaciones',
    'Servicios Básicos (Agua, Luz, Gas, Internet)',
    'Colaciones, Café & Bienestar Personal',
    'Combustible & Generador',
    'Útiles de Oficina & Papelería Térmica',
    'Seguridad, Cámaras & Extintores',
    'Otros Gastos Operacionales',
  ],
};

/**
 * Calculates POS operator fee and net amount received
 */
export function calculatePOSFee(
  amount: number,
  method: PaymentMethod,
  provider: POSTerminalProvider | undefined,
  settings: Partial<ParkingSettings> = DEFAULT_SETTINGS
): { feePercent: number; feeAmount: number; netAmount: number } {
  if (!provider || (method !== 'tarjeta_debito' && method !== 'tarjeta_credito')) {
    return { feePercent: 0, feeAmount: 0, netAmount: amount };
  }

  let rate = 0;
  if (provider === 'tuu') {
    rate =
      method === 'tarjeta_debito'
        ? (settings.posTuuDebitFeePercent ?? DEFAULT_SETTINGS.posTuuDebitFeePercent)
        : (settings.posTuuCreditFeePercent ?? DEFAULT_SETTINGS.posTuuCreditFeePercent);
  } else if (provider === 'mercadopago') {
    rate =
      method === 'tarjeta_debito'
        ? (settings.posMercadoPagoDebitFeePercent ?? DEFAULT_SETTINGS.posMercadoPagoDebitFeePercent)
        : (settings.posMercadoPagoCreditFeePercent ?? DEFAULT_SETTINGS.posMercadoPagoCreditFeePercent);
  }

  const feeAmount = Math.round(amount * (rate / 100));
  const netAmount = Math.max(0, amount - feeAmount);

  return {
    feePercent: rate,
    feeAmount,
    netAmount,
  };
}

export const AFP_RATES: Record<string, { name: string; rate: number }> = {
  habitat: { name: 'AFP Habitat', rate: 11.27 },
  provida: { name: 'AFP ProVida', rate: 11.45 },
  capital: { name: 'AFP Capital', rate: 11.44 },
  cuprum: { name: 'AFP Cuprum', rate: 11.44 },
  planvital: { name: 'AFP PlanVital', rate: 11.16 },
  modelo: { name: 'AFP Modelo', rate: 10.58 },
  uno: { name: 'AFP Uno', rate: 10.49 },
};

export const AFP_RATES_CHILE = AFP_RATES;

/**
 * Calculates complete Chilean Payroll Settlement under Código del Trabajo & Leyes Previsionales
 */
export function calculateChileanPayroll(params: {
  baseSalary: number;
  contractType: 'indefinido' | 'plazo_fijo';
  afpKey: string;
  healthSystem: 'fonasa' | 'isapre';
  healthPlanUF?: number;
  ufValue?: number; // e.g. 38.000 CLP
  overtimeHours?: number;
  bonuses?: number;
  mealAllowance?: number;
  transportAllowance?: number;
  minWage?: number;
}) {
  const minWage = params.minWage || 500000;
  const ufValue = params.ufValue || 38000;
  const baseSalary = Math.max(0, params.baseSalary);
  
  // Gratificación Legal Art. 50: 25% del sueldo base mensual con tope de 4.75 IMM anual / 12 meses
  const maxGratificationMonthly = Math.round((4.75 * minWage) / 12); // ~$197.917
  const calculatedGratification = Math.round(baseSalary * 0.25);
  const legalGratification = Math.min(calculatedGratification, maxGratificationMonthly);

  // Horas extras (valor hora = (sueldo base / 30) * 28 / 44 * 1.5 en jornada de 44 hrs)
  const overtimeHours = params.overtimeHours || 0;
  const hourlyRateNormal = (baseSalary / 30) * (28 / 44);
  const overtimeHourlyRate = hourlyRateNormal * 1.5;
  const overtimeAmount = Math.round(overtimeHours * overtimeHourlyRate);

  const bonuses = params.bonuses || 0;
  const totalTaxableIncome = baseSalary + legalGratification + overtimeAmount + bonuses;

  // Haberes No Imponibles
  const mealAllowance = params.mealAllowance || 0;
  const transportAllowance = params.transportAllowance || 0;
  const totalNonTaxableIncome = mealAllowance + transportAllowance;
  const totalGrossIncome = totalTaxableIncome + totalNonTaxableIncome;

  // Descuentos Legales Previsionales Trabajador
  const afpInfo = AFP_RATES[params.afpKey] || AFP_RATES.provida;
  const afpRate = afpInfo.rate;
  const afpAmount = Math.round((totalTaxableIncome * afpRate) / 100);

  // Salud 7% Fonasa o Isapre
  let healthAmount = 0;
  let healthRate = 7;
  if (params.healthSystem === 'fonasa') {
    healthAmount = Math.round((totalTaxableIncome * 7) / 100);
  } else {
    const isapre7Percent = Math.round((totalTaxableIncome * 7) / 100);
    const planPactado = Math.round((params.healthPlanUF || 2.5) * ufValue);
    healthAmount = Math.max(isapre7Percent, planPactado);
    healthRate = Math.round((healthAmount / (totalTaxableIncome || 1)) * 1000) / 10;
  }

  // AFC Trabajador: 0.6% contrato indefinido, 0% plazo fijo
  const unemploymentWorkerRate = params.contractType === 'indefinido' ? 0.6 : 0.0;
  const unemploymentWorkerAmount = Math.round((totalTaxableIncome * unemploymentWorkerRate) / 100);

  // Base Tributable Impuesto Único de Segunda Categoría
  const taxableForTax = totalTaxableIncome - afpAmount - healthAmount - unemploymentWorkerAmount;
  let secondCategoryTax = 0;
  const utmValue = 66000; // Valor UTM de referencia
  const taxableUTM = taxableForTax / utmValue;
  if (taxableUTM > 13.5) {
    if (taxableUTM <= 30) {
      secondCategoryTax = Math.round(taxableForTax * 0.04 - 13.5 * utmValue * 0.04);
    } else {
      secondCategoryTax = Math.round(taxableForTax * 0.08 - 25.5 * utmValue * 0.04);
    }
  }

  const totalDeductions = afpAmount + healthAmount + unemploymentWorkerAmount + secondCategoryTax;
  const netSalaryToPay = totalGrossIncome - totalDeductions;

  // Aportes Patronales (Costo Empresa)
  const unemploymentEmployerRate = params.contractType === 'indefinido' ? 2.4 : 3.0;
  const unemploymentEmployerAmount = Math.round((totalTaxableIncome * unemploymentEmployerRate) / 100);
  const sisRate = 1.49; // SIS
  const sisAmount = Math.round((totalTaxableIncome * sisRate) / 100);
  const mutualRate = 0.93; // Mutual 0.93%
  const mutualAmount = Math.round((totalTaxableIncome * mutualRate) / 100);

  const totalEmployerContributions = unemploymentEmployerAmount + sisAmount + mutualAmount;
  const totalEmployerCost = totalGrossIncome + totalEmployerContributions;

  return {
    baseSalary,
    legalGratification,
    overtimeHours,
    overtimeAmount,
    bonuses,
    totalTaxableIncome,
    mealAllowance,
    transportAllowance,
    totalNonTaxableIncome,
    totalGrossIncome,
    afpName: afpInfo.name,
    afpRate,
    afpAmount,
    healthRate,
    healthAmount,
    unemploymentWorkerRate,
    unemploymentWorkerAmount,
    secondCategoryTax,
    totalDeductions,
    netSalaryToPay,
    unemploymentEmployerAmount,
    sisAmount,
    mutualAmount,
    totalEmployerContributions,
    totalEmployerCost,
  };
}

export interface PricingBreakdown {
  elapsedMinutes: number;
  formattedDuration: string;
  baseTierMinutes: number;
  baseTierCost: number;
  extraMinutes: number;
  extraTiersCount: number;
  extraTierMinutes: number;
  extraTierCost: number;
  totalParkingCost: number;
  nextTierRemainingSeconds?: number;
}

/**
 * Calculates parking fee according to exact user rules:
 * - Primer tramo fijo: hasta 30 minutos = $900
 * - Tramos siguientes: cada 10 minutos (vencidos/fracción) = $300
 */
export function calculateParkingFee(
  entryTime: string | Date,
  currentTime: string | Date = new Date(),
  simulatedElapsedMinutes?: number,
  basePrice = DEFAULT_SETTINGS.base30MinPrice,
  extraPrice = DEFAULT_SETTINGS.extra10MinPrice
): PricingBreakdown {
  let elapsedMinutes = 0;

  if (typeof simulatedElapsedMinutes === 'number' && simulatedElapsedMinutes >= 0) {
    elapsedMinutes = simulatedElapsedMinutes;
  } else {
    const start = new Date(entryTime).getTime();
    const now = new Date(currentTime).getTime();
    const diffMs = Math.max(0, now - start);
    elapsedMinutes = Math.floor(diffMs / (1000 * 60));
  }

  const hours = Math.floor(elapsedMinutes / 60);
  const mins = elapsedMinutes % 60;
  const formattedDuration = hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;

  const baseTierMinutes = 30;
  const baseTierCost = basePrice; // $900

  let extraMinutes = 0;
  let extraTiersCount = 0;
  let extraTierCost = 0;

  if (elapsedMinutes > baseTierMinutes) {
    extraMinutes = elapsedMinutes - baseTierMinutes;
    // Cada 10 minutos vencidos (fracción cuenta como tramo de 10 min)
    extraTiersCount = Math.ceil(extraMinutes / 10);
    extraTierCost = extraTiersCount * extraPrice;
  }

  const totalParkingCost = baseTierCost + extraTierCost;

  return {
    elapsedMinutes,
    formattedDuration,
    baseTierMinutes,
    baseTierCost,
    extraMinutes,
    extraTiersCount,
    extraTierMinutes: 10,
    extraTierCost,
    totalParkingCost,
  };
}

/**
 * Calculates lost revenue / opportunity cost from empty parking slots
 * Base rate: $900 for 30 min = $30 per minute ($1.800 / hour)
 */
export function calculateVacancyLoss(
  emptyMinutes: number,
  ratePerMinute: number = DEFAULT_SETTINGS.base30MinPrice / 30
): number {
  return Math.round(emptyMinutes * ratePerMinute);
}

/**
 * Format currency in Chilean Pesos (CLP)
 */
export function formatCLP(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format date in Chilean locale
 */
export function formatDateTime(isoString: string): string {
  if (!isoString) return '-';
  const date = new Date(isoString);
  return date.toLocaleString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTimeOnly(isoString: string): string {
  if (!isoString) return '-';
  const date = new Date(isoString);
  return date.toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
