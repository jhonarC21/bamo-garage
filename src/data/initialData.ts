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

// Standard Car Wash Services Catalog for Bamo Garage SpA (Segmented by Vehicle Type)
export const INITIAL_WASH_SERVICES: WashService[] = [
  // --- Hatchback & City Car ---
  {
    id: 'wash_hatchback_simple',
    name: 'Lavado Exterior Simple (Hatchback / City Car)',
    description: 'Lavado exterior con shampoo pH neutro, hidrolavado, secado de microfibra y silicona en neumáticos para autos compactos y city cars.',
    price: 6000,
    durationMinutes: 25,
    category: 'exterior',
    vehicleType: 'hatchback_citycar',
    compatibleVehicleTypes: ['hatchback_citycar'],
  },
  {
    id: 'wash_hatchback_completo',
    name: 'Lavado Completo Full (Hatchback / City Car)',
    description: 'Exterior e interior completo: aspirado de piso y tapiz, limpieza de tablero, marcos de puertas y aromatizado express.',
    price: 11000,
    durationMinutes: 40,
    category: 'completo',
    vehicleType: 'hatchback_citycar',
    compatibleVehicleTypes: ['hatchback_citycar'],
  },

  // --- Sedán ---
  {
    id: 'wash_sedan_simple',
    name: 'Lavado Exterior Simple (Sedán)',
    description: 'Lavado exterior a presión, espuma activa, secado manual de carrocería y abrillantador de neumáticos para autos sedán.',
    price: 7000,
    durationMinutes: 25,
    category: 'exterior',
    vehicleType: 'sedan',
    compatibleVehicleTypes: ['sedan'],
  },
  {
    id: 'wash_sedan_completo',
    name: 'Lavado Completo Int + Ext (Sedán)',
    description: 'Exterior + aspirado completo de habitáculo y maletero, limpieza de plásticos interiores, vidrios y fragancia automotriz.',
    price: 13000,
    durationMinutes: 45,
    category: 'completo',
    vehicleType: 'sedan',
    compatibleVehicleTypes: ['sedan'],
  },

  // --- SUV / Station Wagon ---
  {
    id: 'wash_suv_simple',
    name: 'Lavado Exterior Simple (SUV / Station Wagon)',
    description: 'Hidrolavado profundo con remoción de barro en pasos de rueda, carrocería completa y protección de neumáticos para SUV/Station.',
    price: 8500,
    durationMinutes: 35,
    category: 'exterior',
    vehicleType: 'suv_station',
    compatibleVehicleTypes: ['suv_station'],
  },
  {
    id: 'wash_suv_completo',
    name: 'Lavado Completo Full (SUV / Station Wagon)',
    description: 'Lavado exterior detallado + aspirado profundo de habitáculo, maletero XL, hidratación de plásticos y limpieza de vidrios.',
    price: 16000,
    durationMinutes: 50,
    category: 'completo',
    vehicleType: 'suv_station',
    compatibleVehicleTypes: ['suv_station'],
  },

  // --- Mini Van ---
  {
    id: 'wash_minivan_simple',
    name: 'Lavado Exterior Simple (Mini Van)',
    description: 'Lavado exterior de gran volumen con shampoo espumante, limpieza de llantas y secado con microfibra de alta absorción.',
    price: 10000,
    durationMinutes: 40,
    category: 'exterior',
    vehicleType: 'minivan',
    compatibleVehicleTypes: ['minivan'],
  },
  {
    id: 'wash_minivan_completo',
    name: 'Lavado Completo 3 Filas (Mini Van)',
    description: 'Exterior completo + aspirado minucioso en las 3 filas de asientos, limpieza de rieles de puertas correderas y aromatizado.',
    price: 19000,
    durationMinutes: 60,
    category: 'completo',
    vehicleType: 'minivan',
    compatibleVehicleTypes: ['minivan'],
  },

  // --- Van / Furgón ---
  {
    id: 'wash_van_simple',
    name: 'Lavado Exterior Comercial (Van / Furgón)',
    description: 'Lavado a presión con desengrasante para carrocerías altas y furgones comerciales, remoción de polución vial y secado.',
    price: 12000,
    durationMinutes: 45,
    category: 'exterior',
    vehicleType: 'van_furgon',
    compatibleVehicleTypes: ['van_furgon'],
  },
  {
    id: 'wash_van_completo',
    name: 'Lavado Completo Cabina + Furgón',
    description: 'Exterior completo + limpieza profunda de cabina de conducción, piso de goma y desinfección de zona de carga.',
    price: 22000,
    durationMinutes: 70,
    category: 'completo',
    vehicleType: 'van_furgon',
    compatibleVehicleTypes: ['van_furgon'],
  },

  // --- Servicios Universales / Especializados ---
  {
    id: 'wash_tapiz_universal',
    name: 'Limpieza Profunda de Tapiz & Asientos',
    description: 'Lavado por inyección y extracción en asientos y alfombras, eliminación de manchas rebeldes y sanitización con vapor.',
    price: 28000,
    durationMinutes: 90,
    category: 'interior',
    compatibleVehicleTypes: ['hatchback_citycar', 'sedan', 'suv_station', 'minivan', 'van_furgon'],
  },
  {
    id: 'wash_cera_carnauba',
    name: 'Encerado Alta Protección Cera Carnauba',
    description: 'Aplicación manual de cera natural con sellado hidrofóbico, realce de brillo y protección contra rayos UV.',
    price: 15000,
    durationMinutes: 45,
    category: 'detailing',
    compatibleVehicleTypes: ['hatchback_citycar', 'sedan', 'suv_station', 'minivan', 'van_furgon'],
  },
  {
    id: 'wash_motor_vapor',
    name: 'Lavado de Motor al Detalle con Vapor',
    description: 'Desengrase técnico de vano motor, vapor seco controlado y acondicionador dieléctrico en plásticos y mangueras.',
    price: 16000,
    durationMinutes: 45,
    category: 'detailing',
    compatibleVehicleTypes: ['hatchback_citycar', 'sedan', 'suv_station', 'minivan', 'van_furgon'],
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
