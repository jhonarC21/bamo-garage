import React, { useState, useEffect } from 'react';
import {
  Bluetooth,
  BluetoothConnected,
  BluetoothOff,
  Radio,
  QrCode,
  Volume2,
  VolumeX,
  Zap,
  CheckCircle2,
  AlertCircle,
  X,
  Keyboard,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { bluetoothScanner, BluetoothScannerState } from '../utils/bluetoothScanner';

interface BluetoothScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BluetoothScannerModal: React.FC<BluetoothScannerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [scannerState, setScannerState] = useState<BluetoothScannerState>(bluetoothScanner.getState());
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectMessage, setConnectMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [testCodeInput, setTestCodeInput] = useState('BG-2058-CL');
  const [scanHistory, setScanHistory] = useState<Array<{ code: string; time: string }>>([]);

  useEffect(() => {
    const unsub = bluetoothScanner.subscribeState((state) => {
      setScannerState(state);
      if (state.lastScannedCode) {
        setScanHistory((prev) => [
          { code: state.lastScannedCode!, time: new Date().toLocaleTimeString('es-CL') },
          ...prev.slice(0, 9),
        ]);
      }
    });
    return () => unsub();
  }, []);

  if (!isOpen) return null;

  const handlePairBluetooth = async () => {
    setIsConnecting(true);
    setConnectMessage(null);
    try {
      const result = await bluetoothScanner.connectWebBluetooth();
      setConnectMessage({
        text: result.message,
        isError: !result.success,
      });
    } catch (err: any) {
      setConnectMessage({
        text: err?.message || 'Error al conectar con dispositivo Bluetooth.',
        isError: true,
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    bluetoothScanner.disconnectWebBluetooth();
    setConnectMessage({
      text: 'Desconectado de Web Bluetooth. Modo receptor láser HID activo.',
      isError: false,
    });
  };

  const handleTestScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testCodeInput.trim()) return;
    bluetoothScanner.triggerTestScan(testCodeInput.trim());
    setConnectMessage({
      text: `Código "${testCodeInput.trim()}" procesado como lectura láser real.`,
      isError: false,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0F1117] border border-zinc-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 my-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-inner">
              <Bluetooth className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                Conexión Lector Láser Bluetooth & Códigos QR
              </h3>
              <p className="text-xs text-zinc-400">
                Pistolas lectoras de códigos de barra, lectores QR inalámbricos y escáneres POS
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current State Indicator */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
                Receptor Láser Activo y Escuchando
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-zinc-400 bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-800">
              <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>Modo: <b>{scannerState.mode === 'web_bluetooth' ? 'Web Bluetooth GATT' : 'HID Teclado Inalámbrico'}</b></span>
            </div>
          </div>

          <div className="text-xs text-zinc-300 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Dispositivo vinculado:</span>
              <span className="font-semibold text-white">{scannerState.deviceName || 'Lector Láser HID / Bluetooth Estándar'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Lecturas registradas en sesión:</span>
              <span className="font-mono font-bold text-amber-400">{scannerState.totalScans} escaneos</span>
            </div>
            {scannerState.lastScannedCode && (
              <div className="flex items-center justify-between bg-zinc-950/80 p-2 rounded-lg border border-zinc-800/80 mt-1">
                <span className="text-zinc-400">Último código leído:</span>
                <span className="font-mono font-bold text-cyan-300">{scannerState.lastScannedCode}</span>
              </div>
            )}
          </div>
        </div>

        {/* Pairing Actions */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handlePairBluetooth}
              disabled={isConnecting}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-cyan-600/20 text-xs transition active:scale-95 border border-cyan-400/40"
            >
              {isConnecting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Buscando dispositivos Bluetooth...
                </>
              ) : (
                <>
                  <BluetoothConnected className="w-4 h-4" />
                  Buscar y Emparejar Lector Bluetooth
                </>
              )}
            </button>

            {scannerState.mode === 'web_bluetooth' && (
              <button
                onClick={handleDisconnect}
                className="flex items-center justify-center gap-1.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-700/60 font-semibold py-2.5 px-3 rounded-xl text-xs transition"
              >
                <BluetoothOff className="w-4 h-4" />
                Desconectar
              </button>
            )}
          </div>

          {connectMessage && (
            <div
              className={`p-3 rounded-xl text-xs flex items-start gap-2 border ${
                connectMessage.isError
                  ? 'bg-amber-950/40 border-amber-800 text-amber-200'
                  : 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
              }`}
            >
              {connectMessage.isError ? (
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              )}
              <span>{connectMessage.text}</span>
            </div>
          )}
        </div>

        {/* How Bluetooth Scanners Work in Bamo Garage */}
        <div className="bg-indigo-950/30 border border-indigo-900/50 rounded-xl p-3.5 text-xs text-indigo-200 space-y-2">
          <div className="font-bold flex items-center gap-1.5 text-indigo-100">
            <Keyboard className="w-4 h-4 text-indigo-400" />
            ¿Cómo funciona la lectura automática con pistola láser?
          </div>
          <p className="text-zinc-300 leading-relaxed text-[11px]">
            Los lectores de códigos de barra Bluetooth y USB funcionan en modo <b>HID / Emulador de Teclado</b>. Esto significa que una vez emparejada la pistola con su computador, tablet o celular, puede <b>disparar el láser a cualquier ticket o código QR impreso</b> desde cualquier pantalla: el sistema detecta la ráfaga de escaneo al instante, emite un pitido sonoro y abre el ticket correspondiente sin necesidad de hacer clic.
          </p>
        </div>

        {/* Simulator / Test Scanner Tool */}
        <form onSubmit={handleTestScan} className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-300">
            <span className="font-semibold flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Probar Lectura de Código de Prueba
            </span>
            <span className="text-[11px] text-zinc-400">Simula el disparo láser</span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={testCodeInput}
              onChange={(e) => setTestCodeInput(e.target.value.toUpperCase())}
              placeholder="Ej: CL-BBCL12 o SKU-ACC-01"
              className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono uppercase focus:outline-none focus:border-cyan-500"
            />
            <button
              type="submit"
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-semibold px-4 py-1.5 rounded-xl text-xs border border-zinc-600 transition active:scale-95"
            >
              Disparar Escaneo
            </button>
          </div>
        </form>

        {/* Scan History */}
        {scanHistory.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-zinc-400">Historial reciente de lecturas láser:</span>
            <div className="max-h-28 overflow-y-auto space-y-1 bg-zinc-950 p-2 rounded-xl border border-zinc-800 text-[11px]">
              {scanHistory.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-zinc-300 py-0.5 border-b border-zinc-900 last:border-0">
                  <span className="font-mono text-cyan-300 font-bold flex items-center gap-1.5">
                    <QrCode className="w-3 h-3 text-cyan-400" />
                    {item.code}
                  </span>
                  <span className="text-zinc-500 font-mono text-[10px]">{item.time}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-zinc-800 pt-3 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold rounded-xl transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
