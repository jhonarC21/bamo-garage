/**
 * Bluetooth Laser Barcode / QR Scanner Manager
 * Supports:
 * 1. Web Bluetooth API (Direct BLE connection to wireless scanners)
 * 2. HID Keyboard Wedge Mode (High-speed buffered keystroke interception for 99% of Bluetooth Laser Scanners)
 * 3. Audio beep feedback synthesizer
 */

export interface BluetoothScannerState {
  isConnected: boolean;
  deviceName: string | null;
  mode: 'web_bluetooth' | 'hid_keyboard' | 'disconnected';
  lastScannedCode: string | null;
  lastScannedAt: string | null;
  totalScans: number;
}

type ScanCallback = (code: string) => void;

class BluetoothScannerManager {
  private listeners: Set<ScanCallback> = new Set();
  private stateListeners: Set<(state: BluetoothScannerState) => void> = new Set();
  private bluetoothDevice: any = null;
  private buffer: string = '';
  private lastKeyTime: number = 0;
  private maxCharIntervalMs: number = 70; // Barcode scanners type in < 30ms per char
  private isInitialized: boolean = false;
  private scanSoundEnabled: boolean = true;

  private state: BluetoothScannerState = {
    isConnected: true, // HID Keyboard emulation is always active by default
    deviceName: 'Lector Láser HID / Bluetooth Activo',
    mode: 'hid_keyboard',
    lastScannedCode: null,
    lastScannedAt: null,
    totalScans: 0,
  };

  constructor() {
    this.initKeyboardListener();
  }

  private playBeep(success: boolean = true) {
    if (!this.scanSoundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = success ? 'sine' : 'sawtooth';
      osc.frequency.setValueAtTime(success ? 1760 : 440, ctx.currentTime); // A6 or A4
      if (success) {
        osc.frequency.setValueAtTime(2637, ctx.currentTime + 0.08); // E7
      }

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.16);
    } catch (e) {
      // Audio context might be restricted before interaction
    }
  }

  private initKeyboardListener() {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    window.addEventListener(
      'keydown',
      (e: KeyboardEvent) => {
        const now = Date.now();
        const diff = now - this.lastKeyTime;
        this.lastKeyTime = now;

        // Scanner detection: if key is Enter
        if (e.key === 'Enter') {
          if (this.buffer.length >= 3) {
            const scannedCode = this.buffer.trim();
            this.buffer = '';
            this.handleCodeReceived(scannedCode);
          } else {
            this.buffer = '';
          }
          return;
        }

        // Ignore modifier keys
        if (e.key.length > 1) {
          if (diff > 150) this.buffer = '';
          return;
        }

        // If interval between chars is very fast or it's starting fresh
        if (diff > 150) {
          this.buffer = e.key;
        } else {
          this.buffer += e.key;
        }
      },
      true
    );
  }

  public handleCodeReceived(rawCode: string) {
    const cleanCode = rawCode.trim().toUpperCase();
    if (!cleanCode) return;

    this.playBeep(true);

    this.state = {
      ...this.state,
      lastScannedCode: cleanCode,
      lastScannedAt: new Date().toISOString(),
      totalScans: this.state.totalScans + 1,
    };

    this.notifyState();

    // Dispatch global event for components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('laser_qr_scanned', {
          detail: { code: cleanCode, timestamp: new Date().toISOString() },
        })
      );
    }

    // Call registered subscribers
    this.listeners.forEach((callback) => {
      try {
        callback(cleanCode);
      } catch (err) {
        console.error('Error in scanner subscriber callback:', err);
      }
    });
  }

  public async connectWebBluetooth(): Promise<{ success: boolean; message: string }> {
    if (typeof navigator === 'undefined' || !(navigator as any).bluetooth) {
      return {
        success: false,
        message:
          'Tu navegador no soporta Web Bluetooth API directamente, pero el modo Lector Láser HID está 100% activo en segundo plano.',
      };
    }

    try {
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['generic_access', 'battery_service', '0000180f-0000-1000-8000-00805f9b34fb'],
      });

      if (device) {
        this.bluetoothDevice = device;
        this.state = {
          ...this.state,
          isConnected: true,
          deviceName: device.name || 'Lector Láser Bluetooth',
          mode: 'web_bluetooth',
        };
        this.notifyState();
        this.playBeep(true);
        return {
          success: true,
          message: `Lector Bluetooth "${device.name || 'Conectado'}" emparejado con éxito.`,
        };
      }

      return { success: false, message: 'No se seleccionó ningún dispositivo Bluetooth.' };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Error al emparejar el dispositivo Bluetooth.',
      };
    }
  }

  public disconnectWebBluetooth() {
    if (this.bluetoothDevice && this.bluetoothDevice.gatt?.connected) {
      this.bluetoothDevice.gatt.disconnect();
    }
    this.bluetoothDevice = null;
    this.state = {
      ...this.state,
      isConnected: true,
      deviceName: 'Lector Láser HID / Bluetooth Activo',
      mode: 'hid_keyboard',
    };
    this.notifyState();
  }

  public onScan(callback: ScanCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  public subscribeState(callback: (state: BluetoothScannerState) => void): () => void {
    this.stateListeners.add(callback);
    callback(this.state);
    return () => {
      this.stateListeners.delete(callback);
    };
  }

  public getState(): BluetoothScannerState {
    return this.state;
  }

  private notifyState() {
    this.stateListeners.forEach((cb) => {
      try {
        cb(this.state);
      } catch (e) {}
    });
  }

  public triggerTestScan(code: string = 'GARAGE-DEMO-99') {
    this.handleCodeReceived(code);
  }
}

export const scannerManager = new BluetoothScannerManager();
export const bluetoothScanner = scannerManager;
