import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  QrCode,
  Smartphone,
  Car,
  Clock,
  Sparkles,
  ShoppingBag,
  Share2,
  Copy,
  Check,
  Download,
  AlertCircle,
  Shield,
} from 'lucide-react';
import QRCode from 'qrcode';
import { useParking } from '../context/ParkingContext';
import { calculateParkingFee, formatCLP, formatDateTime } from '../utils/pricing';

interface CustomerQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  spotNumber: number | null;
  onOpenLivePortal?: (ticketNumber: string) => void;
}

export const CustomerQRModal: React.FC<CustomerQRModalProps> = ({
  isOpen,
  onClose,
  spotNumber,
  onOpenLivePortal,
}) => {
  const { getSpotSession, currentTime, settings } = useParking();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'qr' | 'mobile_preview'>('qr');

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const session = spotNumber !== null ? getSpotSession(spotNumber) : undefined;

  const pricing = session
    ? calculateParkingFee(
        session.entryTime,
        currentTime,
        undefined,
        settings.base30MinPrice,
        settings.extra10MinPrice
      )
    : null;

  const washTotal = (session?.washOrders || []).reduce((sum, w) => sum + w.price, 0);
  const accTotal = (session?.accessorySales || []).reduce((sum, a) => sum + a.total, 0);
  const grandTotal = (pricing?.totalParkingCost || 0) + washTotal + accTotal;

  // Generate QR Code URL with ticket metadata
  useEffect(() => {
    if (session) {
      const qrPayload = JSON.stringify({
        app: 'Bamo Garage SpA',
        rut: settings.rut || '78.084.649-6',
        address: settings.address || 'Cobija 2058',
        sii: settings.siiOffice || 'SII Calama',
        phone: settings.phone || '+56993939952',
        ticket: session.ticketNumber,
        spot: session.spotNumber,
        plate: session.plate,
        entryTime: session.entryTime,
        basePrice: settings.base30MinPrice,
        extraPrice: settings.extra10MinPrice,
        url: window.location.href.split('?')[0] + `?ticket=${session.ticketNumber}&spot=${session.spotNumber}`,
      });

      QRCode.toDataURL(
        qrPayload,
        {
          width: 320,
          margin: 2,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
          errorCorrectionLevel: 'H',
        },
        (err, url) => {
          if (!err && url) {
            setQrDataUrl(url);
          }
        }
      );
    }
  }, [session, settings]);

  if (!isOpen || spotNumber === null || !session || !pricing) return null;

  const handleCopyLink = () => {
    const link = `${window.location.origin}?ticket=${session.ticketNumber}&spot=${session.spotNumber}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#0F1117] border border-zinc-800 rounded-2xl w-full max-w-xl text-white shadow-2xl overflow-hidden my-6">
        {/* Modal Header */}
        <div className="bg-[#13151F] px-6 py-4 border-b border-zinc-800/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-zinc-100 tracking-tight">
                Portal QR para el Cliente • Puesto #{spotNumber}
              </h3>
              <p className="text-xs text-zinc-400">
                El cliente escanea el QR con su cámara para ver su tiempo y cobro en vivo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Mode Toggle: QR View vs Live Customer Mobile Screen */}
        <div className="bg-zinc-900/80 px-6 py-2 border-b border-zinc-800 flex items-center justify-between gap-2 text-xs">
          <span className="text-zinc-400">Modo de visualización:</span>
          <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
            <button
              onClick={() => setViewMode('qr')}
              className={`px-3 py-1 rounded-md transition font-medium flex items-center gap-1.5 ${
                viewMode === 'qr'
                  ? 'bg-cyan-600 text-white font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              Código QR
            </button>
            <button
              onClick={() => setViewMode('mobile_preview')}
              className={`px-3 py-1 rounded-md transition font-medium flex items-center gap-1.5 ${
                viewMode === 'mobile_preview'
                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              Vista Móvil del Cliente
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 text-xs">
          {viewMode === 'qr' ? (
            /* QR CODE VIEW */
            <div className="flex flex-col items-center text-center space-y-4">
              {/* QR Image Box */}
              <div className="bg-white p-4 rounded-2xl shadow-xl border-4 border-cyan-500/30 flex flex-col items-center">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`QR Ticket ${session.ticketNumber}`}
                    className="w-56 h-56 rounded-lg object-contain"
                  />
                ) : (
                  <div className="w-56 h-56 flex items-center justify-center text-zinc-400">
                    Generando QR...
                  </div>
                )}
                <div className="mt-2 text-zinc-800 font-mono font-bold text-xs tracking-wider">
                  Ticket N° {session.ticketNumber} • Puesto #{spotNumber}
                </div>
              </div>

              {/* Vehicle info summary under QR */}
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 w-full max-w-sm text-left space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Vehículo:</span>
                  <span className="font-bold text-zinc-100">
                    {session.brand} {session.model} ({session.plate})
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Hora Ingreso:</span>
                  <span className="font-mono text-zinc-200">{formatDateTime(session.entryTime)}</span>
                </div>
                <div className="flex justify-between items-center text-cyan-400 font-semibold border-t border-zinc-800 pt-1">
                  <span>Tiempo transcurrido:</span>
                  <span className="font-mono">{pricing.formattedDuration}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-850 hover:bg-zinc-800 text-zinc-200 rounded-lg border border-zinc-750 transition text-xs font-medium"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400 font-semibold">¡Enlace Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-zinc-400" />
                      Copiar Enlace
                    </>
                  )}
                </button>

                {qrDataUrl && (
                  <a
                    href={qrDataUrl}
                    download={`QR_Ticket_${session.ticketNumber}.png`}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-850 hover:bg-zinc-800 text-zinc-200 rounded-lg font-medium border border-zinc-750 transition text-xs"
                  >
                    <Download className="w-4 h-4" />
                    Descargar QR
                  </a>
                )}

                {onOpenLivePortal && (
                  <button
                    onClick={() => onOpenLivePortal(session.ticketNumber)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold shadow-md shadow-indigo-600/30 transition border border-indigo-400/30 text-xs"
                  >
                    <Smartphone className="w-4 h-4" />
                    Abrir Portal Interactivo del Cliente
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* LIVE CUSTOMER SMARTPHONE VIEW SIMULATION */
            <div className="max-w-sm mx-auto bg-[#07080D] border-4 border-zinc-800 rounded-3xl p-4 shadow-2xl text-white space-y-3 relative">
              {/* Smartphone Camera Notch */}
              <div className="w-24 h-3.5 bg-zinc-800 rounded-full mx-auto mb-2"></div>

              {/* App Brand Header */}
              <div className="text-center pb-2 border-b border-zinc-800">
                <span className="text-[10px] text-cyan-400 uppercase font-bold tracking-widest">
                  Mi Estacionamiento en Vivo
                </span>
                <h4 className="font-extrabold text-sm text-zinc-100">{settings.parkingName || 'Bamo Garage SpA'}</h4>
                <p className="text-[10px] text-zinc-400">
                  {settings.address || 'Cobija 2058'} • RUT: {settings.rut || '78.084.649-6'} • {settings.siiOffice || 'SII Calama'}
                </p>
                <p className="text-[10px] text-cyan-300 font-mono mt-0.5">Puesto #{spotNumber} • Ticket {session.ticketNumber}</p>
              </div>

              {/* Live Running Counter Box */}
              <div className="bg-gradient-to-br from-indigo-950/80 to-[#0C0E17] border border-indigo-500/30 rounded-2xl p-4 text-center space-y-1 shadow-inner">
                <div className="text-[11px] text-indigo-300 font-medium flex items-center justify-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  Tiempo de Estacionamiento
                </div>
                <div className="font-mono text-2xl font-extrabold text-white tracking-wider">
                  {pricing.formattedDuration}
                </div>
                <div className="text-[10px] text-zinc-400 font-mono">
                  Ingreso: {formatDateTime(session.entryTime)}
                </div>
              </div>

              {/* Vehicle details */}
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-2.5 text-[11px] space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Patente:</span>
                  <span className="font-mono font-bold text-zinc-100 bg-zinc-950 border border-zinc-700 px-2 py-0.5 rounded">
                    {session.plate}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Vehículo:</span>
                  <span className="text-zinc-200">{session.brand} {session.model} ({session.color})</span>
                </div>
              </div>

              {/* Live Cost Accumulator & Tramo Explanation */}
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between font-semibold border-b border-zinc-800 pb-1 text-zinc-200">
                  <span>Monto Acumulado a Pagar:</span>
                  <span className="text-base font-extrabold text-emerald-400 font-mono">
                    {formatCLP(grandTotal)}
                  </span>
                </div>

                <div className="space-y-1 text-[10px] text-zinc-300">
                  <div className="flex justify-between">
                    <span>1er Tramo Fijo (0 - 30 min):</span>
                    <span className="font-medium text-zinc-100 font-mono">${settings.base30MinPrice}</span>
                  </div>
                  {pricing.extraTiersCount > 0 ? (
                    <div className="flex justify-between text-cyan-300">
                      <span>{pricing.extraTiersCount} tramos extras (10 min c/u):</span>
                      <span className="font-semibold font-mono">+{formatCLP(pricing.extraTierCost)}</span>
                    </div>
                  ) : (
                    <div className="text-emerald-400 text-[9px]">
                      ✓ Está dentro del tramo inicial de 30 minutos
                    </div>
                  )}

                  {session.washOrders?.map((w, idx) => (
                    <div key={idx} className="flex justify-between text-purple-300 border-t border-zinc-800 pt-1">
                      <span>Lavado ({w.serviceName}):</span>
                      <span className="font-mono">+{formatCLP(w.price)}</span>
                    </div>
                  ))}

                  {session.accessorySales?.map((a, idx) => (
                    <div key={idx} className="flex justify-between text-amber-300 border-t border-zinc-800 pt-1">
                      <span>{a.quantity}x {a.productName}:</span>
                      <span className="font-mono">+{formatCLP(a.total)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Car wash live status progress if active */}
              {session.washOrders && session.washOrders.length > 0 && (
                <div className="bg-purple-950/40 border border-purple-800/60 rounded-xl p-3 text-[11px] space-y-1.5">
                  <div className="font-bold text-purple-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    Estado de tu Lavado:
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-300">{session.washOrders[0].serviceName}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        session.washOrders[0].status === 'ready'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60'
                          : session.washOrders[0].status === 'in_progress'
                          ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/60 animate-pulse'
                          : 'bg-amber-950 text-amber-300 border border-amber-700/60'
                      }`}
                    >
                      {session.washOrders[0].status === 'ready'
                        ? '✨ Listo para Retirar'
                        : session.washOrders[0].status === 'in_progress'
                        ? '🧽 En Proceso de Lavado'
                        : '🕒 En Cola de Espera'}
                    </span>
                  </div>
                </div>
              )}

              {/* Quick Actions in Mobile Simulator */}
              {onOpenLivePortal && (
                <div className="pt-2 space-y-2">
                  <button
                    onClick={() => onOpenLivePortal(session.ticketNumber)}
                    className="w-full py-2.5 px-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Abrir Portal (Pedir Lavado o Tienda)
                  </button>
                </div>
              )}

              {/* Safety & Contact */}
              <div className="text-[10px] text-zinc-400 text-center pt-1">
                Para solicitar tu salida o retiro, acércate a la caseta de control presentando este ticket.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#13151F] px-6 py-3 border-t border-zinc-800 flex items-center justify-between text-xs">
          <span className="text-zinc-400">
            Puesto #{spotNumber} • Patente <strong className="text-zinc-200 font-mono">{session.plate}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 rounded-lg transition border border-zinc-750"
          >
            Cerrar Ventana
          </button>
        </div>
      </div>
    </div>
  );
};
