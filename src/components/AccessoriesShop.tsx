import React, { useState } from 'react';
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  Banknote,
  Smartphone,
  Car,
  Search,
  Package,
  ShieldCheck,
  AlertCircle,
  Image as ImageIcon,
  Edit2,
  X,
  Tag,
} from 'lucide-react';
import { useParking } from '../context/ParkingContext';
import { formatCLP, formatDateTime, calculatePOSFee } from '../utils/pricing';
import { AccessoryProduct, AccessorySaleItem, PaymentMethod, POSTerminalProvider } from '../types';
import confetti from 'canvas-confetti';

interface CartItem extends AccessorySaleItem {
  stock: number;
}

export const AccessoriesShop: React.FC = () => {
  const {
    accessoryProducts,
    accessorySales,
    spots,
    sellAccessories,
    addAccessoryProduct,
    updateAccessoryProduct,
    deleteAccessoryProduct,
    settings,
  } = useParking();

  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [chargeToSpot, setChargeToSpot] = useState<string>('');
  const [clientName, setClientName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('tarjeta_debito');
  const [posProvider, setPosProvider] = useState<POSTerminalProvider>('tuu');
  const [authorizationCode, setAuthorizationCode] = useState<string>('');
  const [saleSuccess, setSaleSuccess] = useState(false);

  // Catalog product modal state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AccessoryProduct | null>(null);
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('limpieza');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [stock, setStock] = useState('');
  const [minStock, setMinStock] = useState('5');
  const [image, setImage] = useState('');
  const [description, setDescription] = useState('');
  const [catalogSuccessMsg, setCatalogSuccessMsg] = useState<string | null>(null);

  const categories = [
    { id: 'todos', label: 'Todos' },
    { id: 'limpieza', label: 'Limpieza' },
    { id: 'aromas', label: 'Aromas' },
    { id: 'electronica', label: 'Electrónica' },
    { id: 'emergencia', label: 'Emergencia' },
    { id: 'confort', label: 'Confort' },
  ];

  const filteredProducts = accessoryProducts.filter((product) => {
    const matchesCat = selectedCategory === 'todos' || product.category === selectedCategory;
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const occupiedSpots = spots.filter((s) => s.status === 'occupied' && s.currentSession);

  const openNewProductModal = () => {
    setEditingProduct(null);
    setSku(`ACC-${Date.now().toString().slice(-4)}`);
    setName('');
    setCategory('limpieza');
    setPrice('');
    setCostPrice('');
    setStock('10');
    setMinStock('5');
    setImage('');
    setDescription('');
    setIsProductModalOpen(true);
  };

  const openEditProductModal = (product: AccessoryProduct) => {
    setEditingProduct(product);
    setSku(product.sku);
    setName(product.name);
    setCategory(product.category);
    setPrice(String(product.price));
    setCostPrice(product.costPrice ? String(product.costPrice) : '');
    setStock(String(product.stock));
    setMinStock(String(product.minStock));
    setImage(product.image || '');
    setDescription(product.description || '');
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(price);
    const stockNum = parseInt(stock, 10);
    const minStockNum = parseInt(minStock, 10) || 3;
    const costPriceNum = costPrice ? parseFloat(costPrice) : undefined;

    if (!name.trim() || isNaN(priceNum) || isNaN(stockNum)) return;

    if (editingProduct) {
      updateAccessoryProduct({
        ...editingProduct,
        sku: sku.trim() || editingProduct.sku,
        name: name.trim(),
        category,
        price: priceNum,
        costPrice: costPriceNum,
        stock: stockNum,
        minStock: minStockNum,
        image: image.trim() || undefined,
        description: description.trim(),
      });
      setCatalogSuccessMsg(`¡Producto "${name}" actualizado con éxito!`);
    } else {
      addAccessoryProduct({
        sku: sku.trim() || `ACC-${Date.now().toString().slice(-4)}`,
        name: name.trim(),
        category,
        price: priceNum,
        costPrice: costPriceNum,
        stock: stockNum,
        minStock: minStockNum,
        image: image.trim() || undefined,
        description: description.trim(),
      });
      setCatalogSuccessMsg(`¡Nuevo producto "${name}" agregado al catálogo!`);
    }

    setIsProductModalOpen(false);
    setTimeout(() => setCatalogSuccessMsg(null), 4000);
  };

  const handleDeleteProduct = (id: string, prodName: string) => {
    if (window.confirm(`¿Seguro que deseas eliminar "${prodName}" del catálogo de ventas?`)) {
      deleteAccessoryProduct(id);
      setCart((prev) => prev.filter((item) => item.productId !== id));
    }
  };

  // Cart operations
  const addToCart = (product: AccessoryProduct) => {
    if (product.stock <= 0) return;
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.unitPrice }
            : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          quantity: 1,
          unitPrice: product.price,
          total: product.price,
          stock: product.stock,
        },
      ];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > item.stock) return item;
            return {
              ...item,
              quantity: newQty,
              total: newQty * item.unitPrice,
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.total, 0);

  const isCardPayment = !chargeToSpot && (paymentMethod === 'tarjeta_debito' || paymentMethod === 'tarjeta_credito');
  const posFeeCalc = isCardPayment
    ? calculatePOSFee(cartTotal, paymentMethod, posProvider, settings)
    : { feePercent: 0, feeAmount: 0, netAmount: cartTotal };

  const isPosAuthValid = !isCardPayment || authorizationCode.trim().length >= 3;

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    if (isCardPayment && !isPosAuthValid) return;

    sellAccessories(
      cart.map(({ productId, productName, quantity, unitPrice, total }) => ({
        productId,
        productName,
        quantity,
        unitPrice,
        total,
      })),
      paymentMethod,
      chargeToSpot ? Number(chargeToSpot) : undefined,
      clientName.trim() || undefined,
      isCardPayment
        ? {
            provider: posProvider,
            authorizationCode: authorizationCode.trim(),
          }
        : undefined
    );

    setSaleSuccess(true);
    setCart([]);
    setChargeToSpot('');
    setClientName('');
    setAuthorizationCode('');

    try {
      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.8 },
      });
    } catch (e) {}

    setTimeout(() => setSaleSuccess(false), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#0F1117] border border-zinc-800 rounded-2xl p-5 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-amber-500/10 text-amber-400 text-xs px-2.5 py-1 rounded-full font-semibold border border-amber-500/20 flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
              Tienda & Catálogo de Accesorios
            </span>
            <span className="text-xs text-zinc-400">Punto de Venta (POS) & Stock</span>
          </div>
          <h2 className="text-xl font-bold text-zinc-100 mt-1 tracking-tight">
            Venta de Accesorios para Vehículos
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Venta directa en caja, cargo a puestos y administración del catálogo (SKU, imágenes, precios y stock).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {saleSuccess && (
            <div className="bg-emerald-950/80 border border-emerald-700/80 text-emerald-300 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 animate-bounce">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ¡Venta registrada exitosamente!
            </div>
          )}

          <button
            onClick={openNewProductModal}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-amber-600/30 transition active:scale-95 border border-amber-400/30"
          >
            <Plus className="w-4 h-4" />
            Nuevo Producto en Catálogo
          </button>
        </div>
      </div>

      {catalogSuccessMsg && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-600/60 rounded-xl text-emerald-200 text-xs flex items-center gap-2 shadow-lg animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{catalogSuccessMsg}</span>
        </div>
      )}

      {/* Main Shop Layout: Products Grid (Left) & Cart / POS (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PRODUCTS CATALOG (2 COLS) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters & Search */}
          <div className="bg-[#0F1117] border border-zinc-800 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition font-medium ${
                    selectedCategory === cat.id
                      ? 'bg-amber-600 text-white font-bold shadow-sm'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-56">
              <input
                type="text"
                placeholder="Buscar por nombre o SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-750 rounded-lg px-3 py-1.5 text-white text-xs pl-8 focus:outline-none focus:border-amber-500"
              />
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5" />
            </div>
          </div>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {filteredProducts.map((product) => {
              const isLowStock = product.stock <= product.minStock;
              const isOutOfStock = product.stock === 0;

              return (
                <div
                  key={product.id}
                  className="bg-[#0F1117] border border-zinc-800 rounded-xl p-4 flex flex-col justify-between space-y-3 hover:border-zinc-700 transition relative overflow-hidden group"
                >
                  <div>
                    <div className="flex gap-3 items-start">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-14 h-14 rounded-lg object-cover bg-zinc-900 border border-zinc-800 flex-shrink-0"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600 flex-shrink-0">
                          <Package className="w-6 h-6" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-1">
                          <h4 className="font-bold text-zinc-100 text-xs leading-snug line-clamp-2">
                            {product.name}
                          </h4>
                          <span className="font-mono font-bold text-emerald-400 text-sm whitespace-nowrap">
                            {formatCLP(product.price)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="bg-zinc-900 border border-zinc-800 text-amber-400/90 text-[9px] font-mono px-1.5 py-0.5 rounded">
                            SKU: {product.sku}
                          </span>
                          <span className="text-[9px] uppercase font-semibold text-zinc-400">
                            {product.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">
                          {product.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-zinc-800">
                    <div className="flex items-center justify-between text-[10px]">
                      <span
                        className={`font-semibold flex items-center gap-1 font-mono ${
                          isOutOfStock
                            ? 'text-rose-400'
                            : isLowStock
                            ? 'text-amber-400'
                            : 'text-zinc-400'
                        }`}
                      >
                        {isLowStock && <AlertTriangle className="w-3 h-3" />}
                        Stock: {product.stock} un.
                      </span>

                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                        <button
                          onClick={() => openEditProductModal(product)}
                          className="p-1 text-zinc-400 hover:text-amber-400 rounded hover:bg-zinc-800 transition"
                          title="Editar producto"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id, product.name)}
                          className="p-1 text-zinc-500 hover:text-rose-400 rounded hover:bg-zinc-800 transition"
                          title="Eliminar producto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={() => addToCart(product)}
                      disabled={isOutOfStock}
                      className={`w-full py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                        isOutOfStock
                          ? 'bg-zinc-850 text-zinc-500 cursor-not-allowed border border-zinc-750'
                          : 'bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/20 active:scale-95 border border-amber-400/30'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {isOutOfStock ? 'Sin Stock Disponible' : 'Agregar al Carrito'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CART & POS CHECKOUT (1 COL) */}
        <div className="bg-[#0F1117] border border-zinc-800 rounded-2xl p-5 text-white flex flex-col justify-between space-y-4 shadow-xl">
          <div>
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm text-zinc-100">Carrito de Ventas POS</h3>
              </div>
              <span className="text-xs text-amber-300 font-bold bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-800 font-mono">
                {cart.length} artículos
              </span>
            </div>

            {/* Cart Items List */}
            <div className="space-y-2 mt-3 max-h-60 overflow-y-auto pr-1">
              {cart.map((item) => (
                <div
                  key={item.productId}
                  className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-2.5 text-xs flex items-center justify-between gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-zinc-200 truncate">
                      {item.productName}
                    </div>
                    <div className="text-[10px] text-zinc-400 font-mono">
                      {formatCLP(item.unitPrice)} c/u
                    </div>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => updateQuantity(item.productId, -1)}
                      className="w-5 h-5 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-white border border-zinc-700"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-mono font-bold text-zinc-100 text-xs px-1">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.productId, 1)}
                      className="w-5 h-5 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-white border border-zinc-700"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="font-mono font-bold text-emerald-400 text-xs whitespace-nowrap pl-1">
                    {formatCLP(item.total)}
                  </div>

                  <button
                    onClick={() => removeFromCart(item.productId)}
                    className="text-zinc-500 hover:text-rose-400 transition ml-1 p-0.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {cart.length === 0 && (
                <div className="text-center py-10 text-zinc-500 text-xs">
                  <Package className="w-8 h-8 mx-auto text-zinc-600 mb-1" />
                  El carrito está vacío. Selecciona productos del catálogo.
                </div>
              )}
            </div>
          </div>

          {/* Checkout Options Form */}
          {cart.length > 0 && (
            <form onSubmit={handleCheckout} className="space-y-3 pt-3 border-t border-zinc-800 text-xs">
              {/* Charge Option: Spot vs Direct */}
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">
                  Destino del Cobro
                </label>
                <select
                  value={chargeToSpot}
                  onChange={(e) => setChargeToSpot(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-750 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- Venta Directa en Caja --</option>
                  {occupiedSpots.map((s) => (
                    <option key={s.number} value={s.number}>
                      Cargar a Puesto #{s.number} ({s.currentSession?.plate})
                    </option>
                  ))}
                </select>
              </div>

              {/* Client Name if direct */}
              {!chargeToSpot && (
                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1">
                    Nombre del Cliente (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Juan Pérez"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-750 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}

              {/* Payment Method (if direct sale) */}
              {!chargeToSpot && (
                <div className="space-y-2">
                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">
                      Método de Pago
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { id: 'tarjeta_debito', label: 'Débito' },
                        { id: 'tarjeta_credito', label: 'Crédito' },
                        { id: 'efectivo', label: 'Efectivo' },
                        { id: 'transferencia', label: 'Transfer.' },
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                          className={`py-1.5 px-2 rounded-lg border text-[11px] font-medium transition ${
                            paymentMethod === m.id
                              ? 'bg-amber-600 border-amber-400 text-white font-bold shadow'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-850'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* POS Options for Debit / Credit */}
                  {isCardPayment && (
                    <div className="bg-zinc-950 border border-amber-500/40 rounded-xl p-3 space-y-2.5">
                      <div className="flex items-center justify-between text-[11px] font-bold text-amber-300 border-b border-zinc-800 pb-1">
                        <span className="flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                          Terminal POS & Voucher
                        </span>
                        <span className="text-[10px] text-zinc-400">Exigido</span>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPosProvider('tuu')}
                          className={`p-2 rounded-lg border text-left text-[10px] transition ${
                            posProvider === 'tuu'
                              ? 'bg-cyan-950/80 border-cyan-400 text-cyan-200 font-bold'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                          }`}
                        >
                          <div className="font-bold text-white">POS TUU</div>
                          <div>Comisión: {settings.posTuuDebitFeePercent || 1.49}%</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPosProvider('mercadopago')}
                          className={`p-2 rounded-lg border text-left text-[10px] transition ${
                            posProvider === 'mercadopago'
                              ? 'bg-sky-950/80 border-sky-400 text-sky-200 font-bold'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                          }`}
                        >
                          <div className="font-bold text-white">MERCADO PAGO</div>
                          <div>Comisión: {settings.posMercadoPagoDebitFeePercent || 2.95}%</div>
                        </button>
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-zinc-300 mb-1">
                          Cód. Autorización / N° Operación *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ej: 849201"
                          value={authorizationCode}
                          onChange={(e) => setAuthorizationCode(e.target.value.toUpperCase())}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-white font-mono text-xs focus:border-amber-500 focus:outline-none"
                        />
                      </div>

                      <div className="bg-zinc-900/90 rounded-lg p-2 text-[10px] space-y-1 text-zinc-400">
                        <div className="flex justify-between">
                          <span>Comisión ({posFeeCalc.feePercent}%):</span>
                          <span className="text-rose-400 font-mono">-{formatCLP(posFeeCalc.feeAmount)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-emerald-400 pt-1 border-t border-zinc-800">
                          <span>Neto Real Recibido:</span>
                          <span className="font-mono">{formatCLP(posFeeCalc.netAmount)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Cart Total Summary */}
              <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-3 space-y-1">
                <div className="flex justify-between items-center text-zinc-300">
                  <span>Total Venta:</span>
                  <span className="font-mono font-extrabold text-base text-emerald-400">
                    {formatCLP(cartTotal)}
                  </span>
                </div>
                {chargeToSpot && (
                  <div className="text-[10px] text-amber-300/90">
                    ✓ Se sumará automáticamente a la cuenta del Puesto #{chargeToSpot}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isCardPayment && !isPosAuthValid}
                className={`w-full py-2.5 text-white font-bold rounded-xl shadow-lg transition active:scale-95 border ${
                  isCardPayment && !isPosAuthValid
                    ? 'bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed opacity-60'
                    : 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30 border-amber-400/30'
                }`}
              >
                {chargeToSpot
                  ? `Cargar ${formatCLP(cartTotal)} al Puesto #${chargeToSpot}`
                  : `Cobrar ${formatCLP(cartTotal)} Ahora`}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Modal: Add/Edit Product in Catalog */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0F1117] border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-400" />
                {editingProduct ? 'Editar Producto del Catálogo' : 'Agregar Nuevo Producto al Catálogo'}
              </h3>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">
                    Código SKU *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ACC-LAV-01"
                    value={sku}
                    onChange={(e) => setSku(e.target.value.toUpperCase())}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-amber-500 uppercase"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">
                    Categoría *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 capitalize"
                  >
                    <option value="limpieza">Limpieza</option>
                    <option value="aromas">Aromas</option>
                    <option value="electronica">Electrónica</option>
                    <option value="emergencia">Emergencia</option>
                    <option value="confort">Confort</option>
                    <option value="otros">Otros</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">
                  Nombre del Producto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Aromatizante Little Trees Black Ice"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">
                  URL de Imagen del Producto
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <ImageIcon className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                    <input
                      type="url"
                      placeholder="https://ejemplo.cl/imagen-producto.jpg"
                      value={image}
                      onChange={(e) => setImage(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  {image && (
                    <img
                      src={image}
                      alt="Preview"
                      className="w-10 h-10 rounded-lg object-cover bg-zinc-900 border border-zinc-700"
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">
                    Precio Venta ($ CLP) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="3500"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono font-bold text-emerald-400 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">
                    Costo Compra ($ CLP)
                  </label>
                  <input
                    type="number"
                    placeholder="1800"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">
                    Stock Disponible (unidades) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="15"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">
                    Stock Mínimo (Alerta)
                  </label>
                  <input
                    type="number"
                    placeholder="5"
                    value={minStock}
                    onChange={(e) => setMinStock(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Descripción</label>
                <textarea
                  rows={2}
                  placeholder="Detalles, aroma, durabilidad o compatibilidad..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold transition shadow-lg shadow-amber-600/30 border border-amber-400/30"
                >
                  {editingProduct ? 'Guardar Cambios' : 'Agregar al Catálogo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
