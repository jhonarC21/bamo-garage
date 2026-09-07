import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export type CajaMovementType =
  | 'apertura'
  | 'cierre'
  | 'gasto'
  | 'anulacion_gasto'
  | 'cobro_parking'
  | 'cobro_lavado'
  | 'venta_accesorio'
  | 'abono_vip';

export interface CajaMovementRecord {
  id: string;
  type: CajaMovementType;
  timestamp: string;
  amount: number;
  paymentMethod?: string;
  description: string;
  cashier: string;
  details?: Record<string, any>;
  syncStatus: 'synced' | 'pending' | 'failed';
  lastAttempt?: string;
  errorReason?: string;
}

export interface SyncStatusState {
  isOnline: boolean;
  pendingCount: number;
  lastSyncTime: string | null;
  isSyncing: boolean;
  lastError: string | null;
}

const STORAGE_KEYS = {
  MIRROR_LEDGER: 'bamo_caja_movements_mirror_v2',
  PENDING_QUEUE: 'bamo_caja_pending_sync_queue_v2',
  LAST_SYNC: 'bamo_caja_last_cloud_sync_v2',
};

// Listeners for UI reactive status
type SyncListener = (status: SyncStatusState) => void;
const listeners = new Set<SyncListener>();

let isCurrentlySyncing = false;

function notifyListeners() {
  const status = getSyncStatus();
  listeners.forEach((fn) => {
    try {
      fn(status);
    } catch (e) {
      console.error('[CajaMirror] Error notifying listener:', e);
    }
  });
}

export function subscribeToSyncStatus(listener: SyncListener): () => void {
  listeners.add(listener);
  listener(getSyncStatus());
  return () => {
    listeners.delete(listener);
  };
}

export function getSyncStatus(): SyncStatusState {
  const pending = getPendingQueue();
  const lastSync = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
  return {
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    pendingCount: pending.length,
    lastSyncTime: lastSync,
    isSyncing: isCurrentlySyncing,
    lastError: pending.find((p) => p.errorReason)?.errorReason || null,
  };
}

/**
 * Reads the emergency mirror ledger from localStorage
 */
export function getMirrorLedger(): CajaMovementRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MIRROR_LEDGER);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('[CajaMirror] Error reading mirror ledger from localStorage:', err);
    return [];
  }
}

/**
 * Reads the pending sync queue from localStorage
 */
export function getPendingQueue(): CajaMovementRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PENDING_QUEUE);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('[CajaMirror] Error reading pending queue from localStorage:', err);
    return [];
  }
}

/**
 * Saves the pending queue to localStorage with try/catch safeguard
 */
function savePendingQueue(queue: CajaMovementRecord[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEYS.PENDING_QUEUE, JSON.stringify(queue));
    return true;
  } catch (err) {
    console.error('[CajaMirror] Failed to write pending queue to localStorage:', err);
    return false;
  }
}

/**
 * Saves the mirror ledger to localStorage with try/catch safeguard
 */
function saveMirrorLedger(ledger: CajaMovementRecord[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEYS.MIRROR_LEDGER, JSON.stringify(ledger));
    return true;
  } catch (err) {
    console.error('[CajaMirror] Failed to write mirror ledger to localStorage:', err);
    return false;
  }
}

/**
 * Sanitize object for Firestore to avoid undefined or non-serializable fields
 */
function sanitizeForFirestore(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeForFirestore);

  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      clean[key] = sanitizeForFirestore(value);
    }
  }
  return clean;
}

/**
 * Requirement 2: Sistema de Respaldo Local de Emergencia (Local Storage Mirror)
 *
 * Cada vez que el usuario registre un movimiento en la caja:
 * 1. Guarda el objeto en localStorage inmediatamente (espejo + cola pendiente)
 * 2. Intenta escribir en Firestore
 * 3. Si Firestore falla por red o permisos, los datos QUEDAN asegurados en la cola local
 */
export async function recordCajaMovement(
  movement: Omit<CajaMovementRecord, 'id' | 'timestamp' | 'syncStatus'> & { id?: string; timestamp?: string }
): Promise<{ success: boolean; movement: CajaMovementRecord; syncedToCloud: boolean }> {
  const movementId = movement.id || `caja_mov_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const timestamp = movement.timestamp || new Date().toISOString();

  const record: CajaMovementRecord = {
    ...movement,
    id: movementId,
    timestamp,
    syncStatus: 'pending',
    lastAttempt: new Date().toISOString(),
  };

  // 1. Guardar primero en el Local Storage Mirror (Respaldo Inmediato)
  try {
    const mirror = getMirrorLedger();
    // Reemplaza o agrega al inicio
    const existingIndex = mirror.findIndex((m) => m.id === record.id);
    if (existingIndex >= 0) {
      mirror[existingIndex] = record;
    } else {
      mirror.unshift(record);
    }
    // Mantener hasta los últimos 1000 registros de espejo local para no saturar memoria
    if (mirror.length > 1000) mirror.length = 1000;
    saveMirrorLedger(mirror);

    // Agregar a la cola de pendientes
    const queue = getPendingQueue();
    if (!queue.some((q) => q.id === record.id)) {
      queue.push(record);
      savePendingQueue(queue);
    }
  } catch (localErr) {
    console.error('[CajaMirror] Error al guardar en Local Storage Mirror:', localErr);
  }

  notifyListeners();

  // 2. Intentar escribir a Cloud Firestore
  let syncedToCloud = false;
  try {
    const docRef = doc(db, 'caja_movements', record.id);
    await setDoc(docRef, sanitizeForFirestore(record), { merge: true });

    syncedToCloud = true;
    record.syncStatus = 'synced';
    record.errorReason = undefined;

    // Actualizar estado en el espejo
    try {
      const mirror = getMirrorLedger();
      const idx = mirror.findIndex((m) => m.id === record.id);
      if (idx >= 0) {
        mirror[idx].syncStatus = 'synced';
        delete mirror[idx].errorReason;
        saveMirrorLedger(mirror);
      }

      // Eliminar de la cola de pendientes
      const queue = getPendingQueue().filter((q) => q.id !== record.id);
      savePendingQueue(queue);
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
    } catch (e) {
      console.warn('[CajaMirror] Error actualizando cola tras sincronización exitosa:', e);
    }
  } catch (cloudErr: any) {
    // Si falla por problemas de red o 'Missing permissions', aseguramos los datos de forma local
    const errorMsg = cloudErr?.message || String(cloudErr);
    console.warn('[CajaMirror] Falló escritura a Firestore (asegurado localmente en cola):', errorMsg);
    record.syncStatus = 'pending';
    record.errorReason = errorMsg;

    try {
      const queue = getPendingQueue();
      const qIdx = queue.findIndex((q) => q.id === record.id);
      if (qIdx >= 0) {
        queue[qIdx].errorReason = errorMsg;
        queue[qIdx].lastAttempt = new Date().toISOString();
        savePendingQueue(queue);
      }
    } catch {
      // noop
    }
  }

  notifyListeners();

  return {
    success: true, // Éxito porque los datos están asegurados (local o remotamente)
    movement: record,
    syncedToCloud,
  };
}

/**
 * Requirement 3: Sincronización Automática al Iniciar la App
 *
 * Al cargar la app o cuando vuelve la red:
 * 1. Revisa si hay registros pendientes en localStorage
 * 2. Si hay internet, los sube a Firestore y limpia la cola local
 * 3. Si no hay internet, permite seguir trabajando visualizando los datos acumulados
 */
export async function syncPendingCajaRecords(): Promise<{
  attempted: number;
  succeeded: number;
  failed: number;
}> {
  if (isCurrentlySyncing) {
    return { attempted: 0, succeeded: 0, failed: 0 };
  }

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  if (!isOnline) {
    console.log('[CajaMirror] Modo offline activo: los registros locales se mantendrán en cola hasta reconexión.');
    notifyListeners();
    return { attempted: 0, succeeded: 0, failed: 0 };
  }

  const pending = getPendingQueue();
  if (pending.length === 0) {
    return { attempted: 0, succeeded: 0, failed: 0 };
  }

  isCurrentlySyncing = true;
  notifyListeners();

  let succeeded = 0;
  let failed = 0;
  const remainingQueue: CajaMovementRecord[] = [];
  const mirror = getMirrorLedger();

  for (const item of pending) {
    try {
      const docRef = doc(db, 'caja_movements', item.id);
      const payloadToSave = {
        ...item,
        syncStatus: 'synced',
        syncedAt: new Date().toISOString(),
      };
      delete (payloadToSave as any).errorReason;

      await setDoc(docRef, sanitizeForFirestore(payloadToSave), { merge: true });
      succeeded++;

      // Actualizar estado en el espejo
      const mIdx = mirror.findIndex((m) => m.id === item.id);
      if (mIdx >= 0) {
        mirror[mIdx].syncStatus = 'synced';
        delete mirror[mIdx].errorReason;
      }
    } catch (err: any) {
      failed++;
      const errMsg = err?.message || String(err);
      console.warn(`[CajaMirror] Error subiendo registro pendiente ${item.id}:`, errMsg);
      item.errorReason = errMsg;
      item.lastAttempt = new Date().toISOString();
      remainingQueue.push(item);
    }
  }

  saveMirrorLedger(mirror);
  savePendingQueue(remainingQueue);

  if (succeeded > 0) {
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
  }

  isCurrentlySyncing = false;
  notifyListeners();

  return {
    attempted: pending.length,
    succeeded,
    failed,
  };
}

// Auto-inicialización de listeners de red en el navegador
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[CajaMirror] Conexión a internet restablecida. Iniciando sincronización de cola...');
    syncPendingCajaRecords();
  });

  window.addEventListener('offline', () => {
    console.log('[CajaMirror] Desconectado. Activando modo de operación offline local.');
    notifyListeners();
  });
}
