import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  QrCode,
  Smartphone,
  Download,
  Printer,
  Copy,
  Check,
  ExternalLink,
  Car,
  Clock,
  MapPin,
  Sparkles,
  Search,
} from 'lucide-react';
import QRCode from 'qrcode';
import { useParking } from '../context/ParkingContext';

interface UniversalQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCustomerPortal: () => void;
}

export const UniversalQRModal: React.FC<UniversalQRModalProps> = ({
  isOpen,
  onClose,
  onOpenCustomerPortal,
}) => {
  const { settings, spots } = useParking();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Universal Customer Portal URL
  const portalUrl = `${window.location.origin}${window.location.pathname}?portal=customer`;

  useEffect(() => {
    if (isOpen) {
      QRCode.toDataURL(
        portalUrl,
        {
          width: 400,
          margin: 2,
          color: {
            dark: '#090A0F',
            light: '#FFFFFF',
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
  }, [isOpen, portalUrl]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrintPoster = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const win = window.open('', '_blank');
    if (!win) {
      alert('Por favor permite las ventanas emergentes para imprimir el afiche.');
      return;
    }

    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Afiche QR Tótem - ${settings.parkingName}</title>
          <meta charset="utf-8" />
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&family=JetBrains+Mono:wght@700;800&display=swap');
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: 'Plus Jakarta Sans', sans-serif;
              background: #ffffff;
              color: #0f172a;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              padding: 24px;
            }
            .poster {
              width: 100%;
              max-width: 520px;
              border: 3px solid #0f172a;
              border-radius: 24px;
              padding: 32px 28px;
              text-align: center;
              box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            }
            .badge {
              display: inline-block;
              background: #4f46e5;
              color: #ffffff;
              font-size: 12px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 1px;
              padding: 6px 14px;
              border-radius: 9999px;
              margin-bottom: 16px;
            }
            .title {
              font-size: 26px;
              font-weight: 900;
              color: #0f172a;
              line-height: 1.2;
              margin-bottom: 6px;
            }
            .subtitle {
              font-size: 13px;
              color: #475569;
              margin-bottom: 24px;
            }
            .qr-box {
              background: #f8fafc;
              border: 2px dashed #cbd5e1;
              border-radius: 20px;
              padding: 20px;
              display: inline-block;
              margin-bottom: 20px;
            }
            .qr-img {
              width: 260px;
              height: 260px;
              display: block;
              margin: 0 auto;
            }
            .steps {
              background: #f1f5f9;
              border-radius: 16px;
              padding: 16px;
              text-align: left;
              margin-bottom: 20px;
              font-size: 13px;
            }
            .step-item {
              display: flex;
              align-items: center;
              gap: 10px;
              margin-bottom: 10px;
              font-weight: 600;
              color: #1e293b;
            }
            .step-item:last-child { margin-bottom: 0; }
            .step-num {
              width: 24px;
              height: 24px;
              background: #4f46e5;
              color: white;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 11px;
              font-weight: 800;
              flex-shrink: 0;
            }
            .rates {
              border-top: 1px solid #e2e8f0;
              padding-top: 14px;
              font-size: 12px;
              color: #64748b;
              display: flex;
              justify-content: space-around;
              font-family: 'JetBrains Mono', monospace;
              font-weight: 700;
            }
            .rate-pill {
              color: #0f172a;
              background: #e0e7ff;
              padding: 4px 8px;
              border-radius: 6px;
            }
            @media print {
              body { padding: 0; }
              .poster { border: 2px solid #000; box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <div class="poster">
            <div class="badge">📱 Portal de Clientes • Consulta en Vivo</div>
            <h1 class="title">${settings.parkingName || 'Bamo Garage SpA'}</h1>
            <p class="subtitle">${settings.address || 'Cobija 2058'} • RUT: ${settings.rut || '78.084.649-6'} • ${settings.siiOffice || 'SII Calama'} • Cel: ${settings.phone || '+56993939952'}</p>

            <div class="qr-box">
              <img class="qr-img" src="${qrDataUrl}" alt="Código QR Único de Clientes" />
            </div>

            <div class="steps">
              <div class="step-item">
                <span class="step-num">1</span>
                <span>Escanea este código QR con la cámara de tu smartphone</span>
              </div>
              <div class="step-item">
                <span class="step-num">2</span>
                <span>Digita la <strong>Patente</strong> de tu vehículo</span>
              </div>
              <div class="step-item">
                <span class="step-num">3</span>
                <span>Revisa tu <strong>Puesto</strong>, <strong>Hora de Ingreso</strong> y <strong>Tiempo en Vivo</strong></span>
              </div>
            </div>

            <div class="rates">
              <div>Tramo 0-30m: <span class="rate-pill">$900</span></div>
              <div>Cada +10m: <span class="rate-pill">+$300</span></div>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    win.document.close();
  };

  const occupiedCount = spots.filter((s) => s.status === 'occupied').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#0F1117] border border-zinc-800 rounded-3xl w-full max-w-xl text-zinc-100 shadow-2xl overflow-hidden my-auto animate-fadeIn">
        {/* Header */}
        <div className="bg-[#141722] px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-400 flex items-center justify-center shadow-inner">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-zinc-100 tracking-tight flex items-center gap-2">
                Código QR Único para Clientes
                <span className="bg-emerald-950 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-700/60 uppercase">
                  Tótem General
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Un único código QR para todo el estacionamiento. Los clientes solo digitan su patente.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-2 rounded-xl hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5">
          {/* Main Visual Poster Card */}
          <div
            ref={printRef}
            className="bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-5 text-center space-y-4 shadow-inner"
          >
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-700/60 text-indigo-300 text-[11px] font-bold uppercase tracking-wider mb-2">
                <Smartphone className="w-3.5 h-3.5" />
                Escanea y Digita tu Patente
              </div>
              <h3 className="font-black text-lg text-white tracking-tight">
                {settings.parkingName || 'Bamo Garage SpA'}
              </h3>
              <p className="text-xs text-zinc-300 flex items-center justify-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-indigo-400" />
                {settings.address || 'Cobija 2058'}
              </p>
              <p className="text-[11px] text-zinc-400 flex items-center justify-center gap-2 mt-0.5 font-mono">
                <span>RUT: {settings.rut || '78.084.649-6'}</span>
                <span>•</span>
                <span className="text-cyan-400">{settings.siiOffice || 'SII Calama'}</span>
                <span>•</span>
                <span>Cel: {settings.phone || '+56993939952'}</span>
              </p>
            </div>

            {/* QR Code Container */}
            <div className="flex justify-center">
              <div className="bg-white p-4 rounded-2xl shadow-xl inline-block border-4 border-zinc-800">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Código QR Único para Clientes"
                    className="w-52 h-52 sm:w-60 sm:h-60 mx-auto rounded-lg"
                  />
                ) : (
                  <div className="w-52 h-52 flex items-center justify-center text-zinc-400 text-xs">
                    Generando código QR...
                  </div>
                )}
              </div>
            </div>

            {/* How it works 3-step banner */}
            <div className="grid grid-cols-3 gap-2 text-left bg-[#12141D] border border-zinc-800/80 p-3 rounded-xl text-xs">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <span className="font-bold text-zinc-200 block text-[11px]">Escanear QR</span>
                  <span className="text-[10px] text-zinc-400">Con cualquier celular</span>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <span className="font-bold text-zinc-200 block text-[11px]">Digitar Patente</span>
                  <span className="text-[10px] text-zinc-400">Ej: CL-8921</span>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <span className="font-bold text-zinc-200 block text-[11px]">Ver en Vivo</span>
                  <span className="text-[10px] text-zinc-400">Puesto, hora y tiempo</span>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-zinc-400 flex items-center justify-center gap-3 pt-1">
              <span>Vehículos estacionados actualmente: <strong className="text-zinc-200 font-mono">{occupiedCount}/10</strong></span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              onClick={handlePrintPoster}
              className="py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-600/30 transition flex items-center justify-center gap-2 border border-indigo-400/30"
            >
              <Printer className="w-4 h-4" />
              Imprimir Afiche Tótem
            </button>

            {qrDataUrl && (
              <a
                href={qrDataUrl}
                download="Afiche_QR_Unico_AutoPark.png"
                className="py-2.5 px-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 rounded-xl font-semibold text-xs border border-zinc-700 transition flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4 text-zinc-400" />
                Descargar Imagen QR
              </a>
            )}

            <button
              onClick={handleCopyLink}
              className="py-2.5 px-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 rounded-xl font-semibold text-xs border border-zinc-700 transition flex items-center justify-center gap-2"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-300">¡Enlace Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-zinc-400" />
                  Copiar Enlace
                </>
              )}
            </button>
          </div>

          {/* Direct Simulator Launcher */}
          <div className="bg-gradient-to-r from-purple-950/40 via-indigo-950/40 to-zinc-900 border border-purple-800/40 rounded-2xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-600/30 border border-purple-500/40 text-purple-300 flex items-center justify-center flex-shrink-0">
                <Smartphone className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <span className="font-bold text-zinc-100 block">Probar el Portal de Clientes</span>
                <span className="text-[11px] text-zinc-400">
                  Simula la experiencia del cliente buscando por patente o probando las opciones en vivo.
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                onClose();
                onOpenCustomerPortal();
              }}
              className="w-full sm:w-auto px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-600/30 transition flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Abrir Portal de Clientes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
