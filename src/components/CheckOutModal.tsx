import React, { useState } from 'react';
import {
  X,
  LogOut,
  Receipt,
  Car,
  Clock,
  Sparkles,
  ShoppingBag,
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle2,
  Printer,
  Star,
  ShieldCheck,
  AlertCircle,
  Key,
} from 'lucide-react';
import { useParking } from '../context/ParkingContext';
import { calculateParkingFee, formatCLP, formatDateTime, calculatePOSFee } from '../utils/pricing';
import { PaymentMethod, POSTerminalProvider } from '../types';
import confetti from 'canvas-confetti';

interface CheckOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  spotNumber: number | null;
}

export const CheckOutModal: React.FC<CheckOutModalProps> = ({
  isOpen,
  onClose,
  spotNumber,
}) => {
  const { getSpotSession, checkOutVehicle, currentTime, settings } = useParking();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('tarjeta_debito');
  const [posProvider, setPosProvider] = useState<POSTerminalProvider>('tuu');
  const [authorizationCode, setAuthorizationCode] = useState<string>('');
  const [cashGiven, setCashGiven] = useState<string>('');
  const [isSuccessReceipt, setIsSuccessReceipt] = useState(false);
  const [completedData, setCompletedData] = useState<any>(null);

  if (!isOpen || spotNumber === null) return null;

  const session = getSpotSession(spotNumber);
  if (!session && !isSuccessReceipt) return null;

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
  const valetTotal = session?.hasValetParking
    ? session.valetParkingFee || settings.valetParkingPrice || 2000
    : 0;
  const totalAmount = (pricing?.totalParkingCost || 0) + washTotal + accTotal + valetTotal;

  const cashNumber = parseFloat(cashGiven) || 0;
  const cashChange = Math.max(0, cashNumber - totalAmount);

  const isCardPayment = paymentMethod === 'tarjeta_debito' || paymentMethod === 'tarjeta_credito';
  const posFeeCalc = isCardPayment
    ? calculatePOSFee(totalAmount, paymentMethod, posProvider, settings)
    : { feePercent: 0, feeAmount: 0, netAmount: totalAmount };

  const isPosAuthValid = !isCardPayment || authorizationCode.trim().length >= 3;

  const handleConfirmCheckout = () => {
    if (isCardPayment && !isPosAuthValid) return;

    const result = checkOutVehicle(
      spotNumber,
      paymentMethod,
      isCardPayment
        ? {
            provider: posProvider,
            authorizationCode: authorizationCode.trim(),
          }
        : undefined
    );

    if (result) {
      setCompletedData({
        ...result,
        pricing,
        washOrders: session?.washOrders || [],
        accessorySales: session?.accessorySales || [],
        hasValetParking: session?.hasValetParking,
        valetParkingFee: session?.valetParkingFee || settings.valetParkingPrice || 2000,
        valetDriver: session?.valetDriver,
      });
      setIsSuccessReceipt(true);
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });
      } catch (e) {}
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#0F1117] border border-zinc-800 rounded-2xl w-full max-w-lg text-white shadow-2xl overflow-hidden my-6">
        {/* Modal Header */}
        <div className="bg-[#13151F] px-6 py-4 border-b border-zinc-800/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-zinc-100 tracking-tight">
                {isSuccessReceipt ? 'Comprobante de Pago & Salida' : `Cobro y Salida - Puesto #${spotNumber}`}
              </h3>
              <p className="text-xs text-zinc-400 font-mono">
                Ticket: {session?.ticketNumber || completedData?.ticketNumber}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setIsSuccessReceipt(false);
              onClose();
            }}
            className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        {!isSuccessReceipt && session && pricing ? (
          <div className="p-6 space-y-4 text-xs">
            {/* Vehicle & Time Header */}
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="bg-zinc-950 border border-zinc-700 px-2.5 py-1 rounded text-white font-mono font-bold text-sm tracking-wider shadow-inner">
                    {session.plate}
                  </span>
                  <span className="font-semibold text-zinc-200">
                    {session.brand} {session.model}
                  </span>
                </div>
                {session.isFrequent && (
                  <span className="bg-amber-950/80 text-amber-300 border border-amber-600/60 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    Cliente Frecuente
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-zinc-400 text-[11px] pt-1 border-t border-zinc-800">
                <div>
                  Ingreso: <span className="text-zinc-200 font-mono">{formatDateTime(session.entryTime)}</span>
                </div>
                <div>
                  Salida: <span className="text-zinc-200 font-mono">{formatDateTime(currentTime.toISOString())}</span>
                </div>
              </div>
            </div>

            {/* Exact Cost Breakdown */}
            <div className="bg-[#090A0F]/90 border border-zinc-800 rounded-xl p-4 space-y-2.5">
              <div className="font-semibold text-zinc-200 flex items-center justify-between border-b border-zinc-800 pb-2">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  Desglose Detallado de Cobro
                </span>
                <span className="text-cyan-300 font-mono font-bold">
                  {pricing.formattedDuration} ({pricing.elapsedMinutes} min)
                </span>
              </div>

              {/* 1st Tier */}
              <div className="flex justify-between items-center text-zinc-300">
                <div>
                  <span className="font-medium text-zinc-200">Primer Tramo Fijo (0 - 30 min):</span>
                  <p className="text-[10px] text-zinc-400">Tarifa base inicial</p>
                </div>
                <span className="font-mono font-semibold text-emerald-400">
                  {formatCLP(pricing.baseTierCost)}
                </span>
              </div>

              {/* Additional Tiers */}
              {pricing.extraTiersCount > 0 ? (
                <div className="flex justify-between items-center text-zinc-300 border-t border-zinc-800/80 pt-1.5">
                  <div>
                    <span className="font-medium text-zinc-200">
                      Tramos Adicionales ({pricing.extraTiersCount} tramos de 10 min):
                    </span>
                    <p className="text-[10px] text-zinc-400">
                      {pricing.extraMinutes} min extras vencidos ({pricing.extraTiersCount} x ${settings.extra10MinPrice})
                    </p>
                  </div>
                  <span className="font-mono font-semibold text-cyan-400">
                    +{formatCLP(pricing.extraTierCost)}
                  </span>
                </div>
              ) : (
                <div className="text-[10px] text-emerald-400/90 italic border-t border-zinc-800/80 pt-1">
                  ✓ Estadía completada dentro del tramo fijo de 30 minutos.
                </div>
              )}

              {/* Parking Subtotal */}
              <div className="flex justify-between items-center text-zinc-300 border-t border-zinc-800/80 pt-1.5 font-medium">
                <span>Subtotal Estacionamiento:</span>
                <span className="font-mono font-bold text-zinc-100">
                  {formatCLP(pricing.totalParkingCost)}
                </span>
              </div>

              {/* Wash Services if any */}
              {session.washOrders && session.washOrders.length > 0 && (
                <div className="border-t border-zinc-800/80 pt-2 space-y-1">
                  <div className="font-semibold text-purple-300 flex items-center gap-1 text-[11px]">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    Servicios de Lavado de Autos:
                  </div>
                  {session.washOrders.map((w, idx) => (
                    <div key={idx} className="flex justify-between text-zinc-300 pl-4 text-[11px]">
                      <span>{w.serviceName}</span>
                      <span className="font-mono font-semibold text-purple-300">
                        {formatCLP(w.price)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Accessories if any */}
              {session.accessorySales && session.accessorySales.length > 0 && (
                <div className="border-t border-zinc-800/80 pt-2 space-y-1">
                  <div className="font-semibold text-amber-300 flex items-center gap-1 text-[11px]">
                    <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
                    Accesorios Vehiculares:
                  </div>
                  {session.accessorySales.map((a, idx) => (
                    <div key={idx} className="flex justify-between text-zinc-300 pl-4 text-[11px]">
                      <span>
                        {a.quantity}x {a.productName}
                      </span>
                      <span className="font-mono font-semibold text-amber-300">
                        {formatCLP(a.total)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Valet Parking if any */}
              {session.hasValetParking && (
                <div className="border-t border-zinc-800/80 pt-2 space-y-1">
                  <div className="font-semibold text-amber-300 flex items-center gap-1 text-[11px]">
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    Servicio Valet Parking:
                  </div>
                  <div className="flex justify-between text-zinc-300 pl-4 text-[11px]">
                    <span>
                      Custodia / Conductor{session.valetDriver ? ` (${session.valetDriver})` : ''}
                    </span>
                    <span className="font-mono font-semibold text-amber-300">
                      {formatCLP(session.valetParkingFee || settings.valetParkingPrice || 2000)}
                    </span>
                  </div>
                  {session.valetNotes && (
                    <div className="text-[10px] text-zinc-400 pl-4 italic">
                      Nota: {session.valetNotes}
                    </div>
                  )}
                </div>
              )}

              {/* GRAND TOTAL */}
              <div className="border-t border-zinc-700 pt-3 flex items-center justify-between">
                <div>
                  <span className="font-extrabold text-sm text-zinc-100">TOTAL A COBRAR:</span>
                  <p className="text-[10px] text-zinc-400">Impuestos y servicios incluidos</p>
                </div>
                <span className="font-extrabold text-xl text-emerald-400 font-mono">
                  {formatCLP(totalAmount)}
                </span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="block text-zinc-300 font-semibold">
                Método de Pago *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'tarjeta_debito', label: 'Débito', icon: CreditCard },
                  { id: 'tarjeta_credito', label: 'Crédito', icon: CreditCard },
                  { id: 'efectivo', label: 'Efectivo', icon: Banknote },
                  { id: 'transferencia', label: 'Transfer.', icon: Smartphone },
                ].map((m) => {
                  const Icon = m.icon;
                  const selected = paymentMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 text-center transition ${
                        selected
                          ? 'bg-indigo-600 border-indigo-400 text-white font-bold shadow-md shadow-indigo-600/30'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-850'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[11px]">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* POS TERMINAL & AUTHORIZATION CODE REQUIRED FOR DEBIT / CREDIT */}
            {isCardPayment && (
              <div className="bg-[#121526] border-2 border-indigo-500/40 rounded-xl p-4 space-y-3 shadow-lg shadow-indigo-950/40">
                <div className="flex items-center justify-between border-b border-indigo-500/20 pb-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-400" />
                    <span className="font-bold text-xs text-indigo-200 uppercase tracking-wide">
                      Terminal POS & Código de Autorización (Obligatorio)
                    </span>
                  </div>
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-semibold px-2 py-0.5 rounded-full border border-indigo-400/30">
                    Voucher Físico
                  </span>
                </div>

                {/* POS Provider Choice */}
                <div>
                  <label className="block text-zinc-300 text-[11px] font-semibold mb-1.5">
                    1. Seleccione el Terminal POS utilizado: *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPosProvider('tuu')}
                      className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                        posProvider === 'tuu'
                          ? 'bg-cyan-950/80 border-cyan-400 text-white ring-1 ring-cyan-400/50 shadow-md'
                          : 'bg-zinc-900 border-zinc-750 text-zinc-300 hover:bg-zinc-850'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-cyan-300">POS TUU (Redelcom)</span>
                        {posProvider === 'tuu' && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
                      </div>
                      <div className="text-[10px] text-zinc-400 mt-1">
                        Comisión Débito:{' '}
                        <strong className="text-zinc-200">
                          {settings.posTuuDebitFeePercent || 1.49}%
                        </strong>{' '}
                        (Crédito {settings.posTuuCreditFeePercent || 2.19}%)
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPosProvider('mercadopago')}
                      className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                        posProvider === 'mercadopago'
                          ? 'bg-sky-950/80 border-sky-400 text-white ring-1 ring-sky-400/50 shadow-md'
                          : 'bg-zinc-900 border-zinc-750 text-zinc-300 hover:bg-zinc-850'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-sky-300">MERCADO PAGO (Point)</span>
                        {posProvider === 'mercadopago' && <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />}
                      </div>
                      <div className="text-[10px] text-zinc-400 mt-1">
                        Comisión Débito:{' '}
                        <strong className="text-zinc-200">
                          {settings.posMercadoPagoDebitFeePercent || 2.95}%
                        </strong>{' '}
                        (Crédito {settings.posMercadoPagoCreditFeePercent || 3.49}%)
                      </div>
                    </button>
                  </div>
                </div>

                {/* Authorization Code Input */}
                <div>
                  <label className="block text-zinc-200 text-[11px] font-bold mb-1 flex items-center justify-between">
                    <span>2. Ingrese Código de Autorización / N° Operación del Voucher: *</span>
                    <span className="text-[10px] text-amber-400 font-mono">
                      {authorizationCode.trim().length === 0 ? 'Requerido' : '✓ OK'}
                    </span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: 048291 (6 dígitos impresos en el voucher)"
                    value={authorizationCode}
                    onChange={(e) => setAuthorizationCode(e.target.value.toUpperCase())}
                    className={`w-full bg-zinc-950 border rounded-xl px-3 py-2 text-white font-mono font-bold text-sm tracking-wider focus:outline-none ${
                      authorizationCode.trim().length > 0
                        ? 'border-emerald-500/80 focus:border-emerald-400'
                        : 'border-amber-500/80 focus:border-amber-400'
                    }`}
                  />
                  <p className="text-[10px] text-zinc-400 mt-1">
                    Obligatorio para conciliar las transacciones con el depósito bancario y la liquidación del proveedor.
                  </p>
                </div>

                {/* Live POS Financial Deduction Breakdown */}
                <div className="bg-zinc-950/90 rounded-xl p-3 border border-zinc-800 text-xs space-y-1.5">
                  <div className="flex justify-between items-center text-zinc-300 text-[11px]">
                    <span>Monto Cobrado al Cliente (Bruto):</span>
                    <span className="font-mono font-bold text-zinc-100">{formatCLP(totalAmount)}</span>
                  </div>

                  <div className="flex justify-between items-center text-rose-300 text-[11px]">
                    <span className="flex items-center gap-1">
                      <span>Comisión {posProvider === 'tuu' ? 'Tuu' : 'Mercado Pago'} ({posFeeCalc.feePercent}%):</span>
                    </span>
                    <span className="font-mono font-bold text-rose-400">-{formatCLP(posFeeCalc.feeAmount)}</span>
                  </div>

                  <div className="flex justify-between items-center pt-1.5 border-t border-zinc-800 text-emerald-300">
                    <span className="font-bold">Monto Neto Real Recibido en Cuenta:</span>
                    <span className="font-mono font-extrabold text-sm text-emerald-400">{formatCLP(posFeeCalc.netAmount)}</span>
                  </div>
                </div>

                {!isPosAuthValid && (
                  <div className="bg-amber-950/60 border border-amber-500/60 text-amber-300 rounded-lg p-2 text-[11px] flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Debe ingresar el código de autorización del voucher POS para poder registrar la salida.</span>
                  </div>
                )}
              </div>
            )}

            {/* Cash calculator helper if cash is selected */}
            {paymentMethod === 'efectivo' && (
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-zinc-400 text-[10px] mb-1">
                    Monto Recibido en Efectivo:
                  </label>
                  <input
                    type="number"
                    placeholder="$20.000"
                    value={cashGiven}
                    onChange={(e) => setCashGiven(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-white font-mono font-bold focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="text-right">
                  <span className="text-zinc-400 text-[10px] block">Vuelto a Entregar:</span>
                  <span
                    className={`font-mono font-bold text-base ${
                      cashNumber >= totalAmount ? 'text-emerald-400' : 'text-zinc-500'
                    }`}
                  >
                    {cashNumber >= totalAmount ? formatCLP(cashChange) : '$0'}
                  </span>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 rounded-lg font-medium transition border border-zinc-750"
              >
                Cancelar
              </button>
              <button
                id="btn-confirm-checkout"
                disabled={isCardPayment && !isPosAuthValid}
                onClick={handleConfirmCheckout}
                className={`px-5 py-2 text-white rounded-lg font-bold shadow-lg transition active:scale-95 flex items-center gap-1.5 border ${
                  isCardPayment && !isPosAuthValid
                    ? 'bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed opacity-60'
                    : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30 border-rose-400/30'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                Registrar Pago & Liberar Puesto #{spotNumber}
              </button>
            </div>
          </div>
        ) : isSuccessReceipt && completedData ? (
          /* RECEIPT / TICKET VIEW */
          <div className="p-6 space-y-4 text-xs">
            <div className="bg-emerald-950/60 border border-emerald-800/80 rounded-xl p-3 flex items-center gap-2.5 text-emerald-300">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <div>
                <div className="font-bold">¡Pago Procesado Exitosamente!</div>
                <div className="text-[11px] text-emerald-400/80">
                  El Puesto #{completedData.spotNumber} ha sido liberado y registrado en caja.
                </div>
              </div>
            </div>

            {/* Printable Receipt Box */}
            <div
              id="printable-ticket"
              className="bg-[#FAFAFA] text-zinc-900 rounded-xl p-5 font-mono text-xs shadow-inner border border-zinc-300 space-y-3"
            >
              <div className="text-center border-b border-dashed border-zinc-400 pb-3">
                <div className="font-extrabold text-sm uppercase tracking-wider text-zinc-950">
                  {settings.parkingName || 'BAMO GARAGE SPA'}
                </div>
                <div className="text-[10.5px] font-semibold text-zinc-700">
                  RUT: {settings.rut || '78.084.649-6'}
                </div>
                <div className="text-[10px] text-zinc-600">
                  Dirección: {settings.address || 'Cobija 2058'}
                </div>
                <div className="text-[10px] text-zinc-600">
                  Unidad: {settings.siiOffice || 'SII Calama'} • Cel: {settings.phone || '+56993939952'}
                </div>
                <div className="text-xs font-bold text-zinc-900 mt-1.5 pt-1 border-t border-dotted border-zinc-300">
                  COMPROBANTE ELECTRÓNICO DE COBRO & SALIDA
                </div>
              </div>

              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Ticket N°:</span>
                  <span className="font-bold">{completedData.ticketNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>Puesto:</span>
                  <span className="font-bold">#{completedData.spotNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>Patente:</span>
                  <span className="font-bold">{completedData.plate}</span>
                </div>
                <div className="flex justify-between">
                  <span>Vehículo:</span>
                  <span>{completedData.brand} {completedData.model} ({completedData.color})</span>
                </div>
                {completedData.clientName && (
                  <div className="flex justify-between">
                    <span>Cliente:</span>
                    <span>{completedData.clientName}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Entrada:</span>
                  <span>{formatDateTime(completedData.entryTime)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Salida:</span>
                  <span>{formatDateTime(completedData.exitTime)}</span>
                </div>
              </div>

              {/* Breakdown */}
              <div className="border-t border-b border-dashed border-zinc-400 py-2 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>1er Tramo Fijo (0-30 min):</span>
                  <span>{formatCLP(completedData.baseTierCost)}</span>
                </div>
                {completedData.extraTiersCount > 0 && (
                  <div className="flex justify-between">
                    <span>{completedData.extraTiersCount} Tramos Extras (c/10m):</span>
                    <span>+{formatCLP(completedData.extraTierCost)}</span>
                  </div>
                )}
                {completedData.washOrders?.map((w: any, idx: number) => (
                  <div key={idx} className="flex justify-between">
                    <span>Lavado ({w.serviceName}):</span>
                    <span>+{formatCLP(w.price)}</span>
                  </div>
                ))}
                {completedData.accessorySales?.map((a: any, idx: number) => (
                  <div key={idx} className="flex justify-between">
                    <span>{a.quantity}x {a.productName}:</span>
                    <span>+{formatCLP(a.total)}</span>
                  </div>
                ))}
                {completedData.hasValetParking && (
                  <div className="flex justify-between text-amber-900 font-medium">
                    <span>Valet Parking{completedData.valetDriver ? ` (${completedData.valetDriver})` : ''}:</span>
                    <span>+{formatCLP(completedData.valetParkingFee || settings.valetParkingPrice || 2000)}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center text-sm font-extrabold pt-1">
                <span>TOTAL PAGADO:</span>
                <span>{formatCLP(completedData.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-zinc-600">
                <span>Método de Pago:</span>
                <span className="uppercase font-semibold">{completedData.paymentMethod.replace('_', ' ')}</span>
              </div>

              {/* POS Terminal & Authorization Code Details on Ticket */}
              {completedData.posProvider && (
                <div className="bg-zinc-100 p-2 rounded border border-zinc-300 space-y-0.5 text-[10px] text-zinc-700">
                  <div className="flex justify-between font-bold text-zinc-900">
                    <span>Terminal POS:</span>
                    <span>{completedData.posProvider === 'tuu' ? 'TUU (Redelcom)' : 'MERCADO PAGO (Point)'}</span>
                  </div>
                  {completedData.authorizationCode && (
                    <div className="flex justify-between">
                      <span>Cód. Autorización:</span>
                      <span className="font-mono font-bold tracking-wider">{completedData.authorizationCode}</span>
                    </div>
                  )}
                  {completedData.posFeeAmount !== undefined && completedData.posFeeAmount > 0 && (
                    <div className="flex justify-between text-zinc-600">
                      <span>Comisión Operador ({completedData.posFeePercent}%):</span>
                      <span>-{formatCLP(completedData.posFeeAmount)}</span>
                    </div>
                  )}
                  {completedData.netAmountReceived !== undefined && (
                    <div className="flex justify-between font-bold text-emerald-800 pt-0.5 border-t border-zinc-200">
                      <span>Neto Liquidado Empresa:</span>
                      <span>{formatCLP(completedData.netAmountReceived)}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="text-center text-[10px] text-zinc-500 pt-2 border-t border-zinc-200">
                ¡Gracias por su preferencia! Que tenga un excelente viaje.
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-4 py-2 bg-zinc-850 hover:bg-zinc-800 text-zinc-200 rounded-lg font-medium transition border border-zinc-750"
              >
                <Printer className="w-4 h-4 text-cyan-400" />
                Imprimir Comprobante
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsSuccessReceipt(false);
                  onClose();
                }}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold transition border border-indigo-400/30"
              >
                Finalizar y Cerrar
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
