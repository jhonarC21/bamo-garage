import {
  ParkingSpot,
  Vehicle,
  WashService,
  AccessoryProduct,
  MonthlyContract,
  ParkingSession,
  WashOrder,
  Employee,
  BusinessExpense,
  AppUser,
} from '../types';

// Clean initial vehicles database (empty, populated as real clients arrive)
export const INITIAL_VEHICLES: Vehicle[] = [];

// Standard Car Wash Services Catalog for Bamo Garage SpA
export const INITIAL_WASH_SERVICES: WashService[] = [
  {
    id: 'wash_simple',
    name: 'Lavado Exterior Simple',
    description: 'Lavado con shampoo pH neutro, hidrolavado, secado con microfibra y abrillantador de neumáticos.',
    price: 7000,
    durationMinutes: 25,
    category: 'exterior',
  },
  {
    id: 'wash_completo',
    name: 'Lavado Completo (Int + Ext)',
    description: 'Exterior completo + aspirado profundo de tapices, limpieza de tablero, marcos de puertas y aromatizado.',
    price: 12000,
    durationMinutes: 45,
    category: 'completo',
  },
  {
    id: 'wash_premium',
    name: 'Lavado Full Premium + Cera',
    description: 'Lavado completo + encerado de alta protección con cera carnauba, descontaminado express y limpieza de vidrios anti-empañante.',
    price: 18000,
    durationMinutes: 60,
    category: 'detailing',
  },
  {
    id: 'wash_tapiz',
    name: 'Limpieza Profunda de Tapiz',
    description: 'Lavado y extracción por inyección de asientos, eliminación de manchas profundas y sanitización con vapor.',
    price: 26000,
    durationMinutes: 90,
    category: 'interior',
  },
  {
    id: 'wash_motor',
    name: 'Lavado de Motor al Detalle',
    description: 'Desengrase cuidadoso de compartimento de motor, vapor controlado y acondicionador de plásticos y mangueras.',
    price: 15000,
    durationMinutes: 40,
    category: 'detailing',
  },
];

// Standard Accessories Shop Catalog with initial stock
export const INITIAL_ACCESSORIES: AccessoryProduct[] = [
  {
    id: 'acc_aroma_pino',
    name: 'Aromatizante Little Trees (Pino / Vainilla / Black Ice)',
    category: 'aromas',
    price: 1990,
    costPrice: 850,
    stock: 50,
    minStock: 10,
    description: 'Aromatizante clásico de colgar para retrovisor de larga duración.',
    sku: 'ARO-LT-01',
  },
  {
    id: 'acc_plumillas',
    name: 'Juego de Plumillas Limpiaparabrisas Siliconadas (Par)',
    category: 'emergencia',
    price: 8990,
    costPrice: 4200,
    stock: 20,
    minStock: 5,
    description: 'Plumillas de goma siliconada con adaptador universal para todo tipo de vehículo.',
    sku: 'PLU-SIL-02',
  },
  {
    id: 'acc_cera_spray',
    name: 'Cera Rápida Spray Brillo Extremo 500ml',
    category: 'limpieza',
    price: 6490,
    costPrice: 3100,
    stock: 20,
    minStock: 4,
    description: 'Brillo y protección hidrofóbica instantánea de fácil aplicación.',
    sku: 'LMP-CER-03',
  },
  {
    id: 'acc_microfibra',
    name: 'Pack 3 Paños Microfibra 40x40cm 600 GSM',
    category: 'limpieza',
    price: 4990,
    costPrice: 2100,
    stock: 30,
    minStock: 8,
    description: 'Paños extra suaves que no rayan la pintura, ideales para secado y pulido.',
    sku: 'LMP-MIC-04',
  },
  {
    id: 'acc_soporte_cel',
    name: 'Soporte Magnético / Pinza para Celular Rejilla',
    category: 'confort',
    price: 5990,
    costPrice: 2400,
    stock: 15,
    minStock: 3,
    description: 'Soporte universal giratorio 360° para rejillas de ventilación.',
    sku: 'CNF-SOP-05',
  },
  {
    id: 'acc_cables_bateria',
    name: 'Cables de Puente para Batería 500A con Bolso',
    category: 'emergencia',
    price: 14990,
    costPrice: 7500,
    stock: 10,
    minStock: 2,
    description: 'Cables reforzados de 3 metros con pinzas aisladas para emergencias.',
    sku: 'EMG-CAB-06',
  },
  {
    id: 'acc_cargador_usb',
    name: 'Cargador Rápido USB Dual Coche QC 3.0 + Tipo C',
    category: 'electronica',
    price: 7990,
    costPrice: 3300,
    stock: 20,
    minStock: 5,
    description: 'Carga ultrarrápida para smartphone y tablet con display de voltaje.',
    sku: 'ELC-CRG-07',
  },
  {
    id: 'acc_limpia_vidrios',
    name: 'Líquido Concentrado Limpiaparabrisas Anticongelante 1L',
    category: 'limpieza',
    price: 3490,
    costPrice: 1400,
    stock: 25,
    minStock: 6,
    description: 'Fórmula desengrasante que elimina bichos y suciedad pesada sin manchar.',
    sku: 'LMP-VID-08',
  },
];

// Clean monthly contracts (empty, ready to create contracts)
export const INITIAL_MONTHLY_CONTRACTS: MonthlyContract[] = [];

// Clean active sessions (empty)
export const INITIAL_ACTIVE_SESSIONS: ParkingSession[] = [];

// 10 Available Parking Spots for Bamo Garage SpA
export const INITIAL_SPOTS: ParkingSpot[] = Array.from({ length: 10 }, (_, i) => ({
  number: i + 1,
  status: 'available' as const,
  currentSessionId: undefined,
  currentSession: undefined,
  monthlyContractId: undefined,
  monthlyContract: undefined,
  lastStatusChange: new Date().toISOString(),
  accumulatedEmptyMinutesToday: 0,
}));

// Clean completed sessions history (empty)
export const INITIAL_COMPLETED_SESSIONS: ParkingSession[] = [];

// 1 Administrator User configured with PIN 12345678 (1 to 8)
export const INITIAL_USERS: AppUser[] = [
  {
    id: 'usr_admin',
    username: 'admin',
    name: 'Administrador General',
    role: 'admin',
    pin: '12345678', // Clave del 1 al 8
    email: 'admin@bamogarage.cl',
    phone: '+56 9 8888 1111',
    active: true,
    createdAt: new Date().toISOString(),
  },
];

// Clean employee staff (ready to register employees)
export const INITIAL_EMPLOYEES: Employee[] = [];

// Clean operational expenses (ready to register daily expenses)
export const INITIAL_EXPENSES: BusinessExpense[] = [];
