import React, { useState, useEffect, useRef } from 'react';
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
  Camera,
  Upload,
  Sparkles,
  Bluetooth,
  RefreshCw,
} from 'lucide-react';
import { useParking } from '../context/ParkingContext';
import { formatCLP, formatDateTime, calculatePOSFee } from '../utils/pricing';
import { AccessoryProduct, AccessoryCategory, AccessorySaleItem, PaymentMethod, POSTerminalProvider } from '../types';
import { bluetoothScanner } from '../utils/bluetoothScanner';
import { BluetoothScannerModal } from './BluetoothScannerModal';
import confetti from 'canvas-confetti';

interface CartItem extends AccessorySaleItem {
  stock: number;
}

// Preset visual icons/images for vehicle accessories when user doesn't have a photo
const PRODUCT_IMAGE_PRESETS = [
  {
    name: 'Aromatizante',
    url: 'https://images.unsplash.com/photo-1615397349754-cfa2066a298e?w=300&auto=format&fit=crop&q=80',
  },
  {
    name: 'Silicona & Cera',
    url: 'https://images.unsplash.com/photo-1607860108855-64acf2078ed9?w=300&auto=format&fit=crop&q=80',
  },
  {
    name: 'Paño Microfibra',
    url: 'https://images.unsplash.com/photo-1585421514738-01798e348b17?w=300&auto=format&fit=crop&q=80',
  },
  {
    name: 'Cargador / Cable USB',
    url: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=300&auto=format&fit=crop&q=80',
  },
  {
    name: 'Inflador / Medidor Aire',
    url: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=300&auto=format&fit=crop&q=80',
  },
  {
    name: 'Refrigerante / Líquido',
    url: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=300&auto=format&fit=crop&q=80',
  },
];

export const AccessoriesShop: React.FC = () => {
  const {
    accessoryProducts,
    accessorySales,
    spots,
    sellAccessories,
    cancelAccessorySale,
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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo');
  const [posProvider, setPosProvider] = useState<POSTerminalProvider>('tuu');
  const [authorizationCode, setAuthorizationCode] = useState<string>('');
  const [saleSuccess, setSaleSuccess] = useState(false);
  const [catalogSuccessMsg, setCatalogSuccessMsg] = useState<string | null>(null);
  const [isBluetoothModalOpen, setIsBluetoothModalOpen] = useState(false);

  // Catalog product modal state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AccessoryProduct | null>(null);
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<AccessoryCategory>('limpieza');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [stock, setStock] = useState('10');
  const [minStock, setMinStock] = useState('5');
  const [image, setImage] = useState('');
  const [description, setDescription] = useState('');
  const [imageTab, setImageTab] = useState<'device' | 'url' | 'presets'>('device');
  const [isDraggingImage, setIsDraggingImage] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Subscribe to Bluetooth Laser Scanner for auto-adding scanned items
  useEffect(() => {
    const unsub = bluetoothScanner.onScan((scannedCode) => {
      const codeClean = (scannedCode || '').trim().toUpperCase();
      if (!codeClean) return;
      const match = (accessoryProducts || []).find((p) => {
        if (!p) return false;
        const pSku = (p.sku || '').toUpperCase();
        const pName = (p.name || '').toUpperCase();
        return pSku === codeClean || (codeClean.length >= 3 && pName.includes(codeClean));
      });
      if (match) {
        if (match.stock > 0) {
          addToCart(match);
          setCatalogSuccessMsg(`¡Láser Bluetooth escaneó: ${match.name || 'Producto'} (+1 al carrito)!`);
          setTimeout(() => setCatalogSuccessMsg(null), 3500);
        } else {
          setCatalogSuccessMsg(`¡Láser Bluetooth detectó ${match.name || 'Producto'}, pero no tiene stock disponible!`);
          setTimeout(() => setCatalogSuccessMsg(null), 3500);
        }
      }
    });
    return () => unsub();
  }, [accessoryProducts]);

  const categories = [
    { id: 'todos', label: 'Todos' },
    { id: 'limpieza', label: 'Limpieza' },
    { id: 'aromas', label: 'Aromas' },
    { id: 'electronica', label: 'Electrónica' },
    { id: 'emergencia', label: 'Emergencia' },
    { id: 'confort', label: 'Confort' },
  ];

  const filteredProducts = (accessoryProducts || []).filter((product) => {
    if (!product) return false;
    const matchesCat = selectedCategory === 'todos' || product.category === selectedCategory;
    const pName = (product.name || '').toLowerCase();
    const pSku = (product.sku || '').toLowerCase();
    const pDesc = (product.description || '').toLowerCase();
    const q = (searchQuery || '').trim().toLowerCase();
    const matchesSearch = !q || pName.includes(q) || pSku.includes(q) || pDesc.includes(q);
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
    setImageTab('device');
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
    setImageTab(product.image ? 'device' : 'presets');
    setIsProductModalOpen(true);
  };

  // Helper to process uploaded file (from device picker or camera) and compress via Canvas
  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido (JPG, PNG, WEBP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 600;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
          setImage(compressedDataUrl);
        } else {
          setImage(rawDataUrl);
        }
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleDeviceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleDropImage = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingImage(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
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

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-56">
                <input
                  type="text"
                  placeholder="Buscar por nombre o SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-750 rounded-lg px-3 py-1.5 text-white text-xs pl-8 focus:outline-none focus:border-amber-500"
                />
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5" />
              </div>

              <button
                type="button"
                onClick={() => setIsBluetoothModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-850 hover:bg-zinc-800 text-cyan-300 hover:text-cyan-200 border border-cyan-500/30 rounded-lg text-xs font-semibold shadow-sm transition whitespace-nowrap active:scale-95"
                title="Conectar o configurar Lector Láser Bluetooth"
              >
                <Bluetooth className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Lector Láser BT</span>
              </button>
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
                        { id: 'efectivo', label: 'Efectivo' },
                        { id: 'tarjeta_debito', label: 'Débito' },
                        { id: 'tarjeta_credito', label: 'Crédito' },
                        { id: 'transferencia', label: 'Transfer.' },
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                          className={`py-1.5 px-2 rounded-lg border text-[11px] font-medium transition ${
                            paymentMethod === m.id
                              ? m.id === 'efectivo'
                                ? 'bg-emerald-600 border-emerald-400 text-white font-bold shadow'
                                : 'bg-amber-600 border-amber-400 text-white font-bold shadow'
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

      {/* Historial de Ventas Directas y Gestión de Anulaciones */}
      {accessorySales.length > 0 && (
        <div className="bg-[#0F1117] border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div>
              <h3 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-amber-400" />
                Historial de Ventas de Accesorios & Anulación
              </h3>
              <p className="text-[11px] text-zinc-400">
                Permite anular ventas o pedidos ingresados por error. Al anular, se restituye automáticamente el stock.
              </p>
            </div>
            <span className="text-xs bg-zinc-900 border border-zinc-800 text-zinc-300 px-2.5 py-1 rounded-full font-mono">
              {accessorySales.length} ventas registradas
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="pb-2">Fecha y Hora</th>
                  <th className="pb-2">Destino / Cliente</th>
                  <th className="pb-2">Artículos</th>
                  <th className="pb-2">Total</th>
                  <th className="pb-2">Método</th>
                  <th className="pb-2 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {accessorySales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-zinc-900/40 transition">
                    <td className="py-2.5 text-zinc-300 font-mono text-[11px]">
                      {formatDateTime(sale.date || sale.soldAt || '')}
                    </td>
                    <td className="py-2.5">
                      {sale.spotNumber ? (
                        <span className="bg-indigo-950/80 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded text-[10px] font-bold font-mono">
                          Puesto #{sale.spotNumber}
                        </span>
                      ) : (
                        <span className="text-zinc-300 text-xs">
                          {sale.clientName || 'Venta directa en caja'}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 text-zinc-200">
                      <div className="space-y-0.5">
                        {sale.items.map((it, i) => (
                          <div key={i} className="text-[11px]">
                            <span className="font-semibold text-amber-300">{it.quantity}x</span> {it.productName} ({formatCLP(it.total)})
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-2.5 font-bold font-mono text-emerald-400 text-xs">
                      {formatCLP(sale.total || sale.totalAmount || 0)}
                    </td>
                    <td className="py-2.5 text-zinc-400 capitalize text-[11px]">
                      {sale.paymentMethod.replace('_', ' ')}
                    </td>
                    <td className="py-2.5 text-right">
                      <button
                        onClick={() => cancelAccessorySale(sale.id)}
                        className="px-2.5 py-1 bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-800/70 rounded-lg text-[10px] font-bold transition inline-flex items-center gap-1 shadow-sm"
                        title="Anular venta y reponer stock"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Anular Venta</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
                    onChange={(e) => setCategory(e.target.value as AccessoryCategory)}
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

              {/* Product Photo Upload Section */}
              <div className="space-y-2 bg-zinc-900/80 p-3.5 rounded-2xl border border-zinc-800">
                <div className="flex items-center justify-between">
                  <label className="block text-zinc-200 font-bold text-xs flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-amber-400" />
                    <span>Foto o Imagen del Producto</span>
                  </label>
                  {image && (
                    <button
                      type="button"
                      onClick={() => setImage('')}
                      className="text-[11px] text-rose-400 hover:text-rose-300 transition underline"
                    >
                      Quitar foto
                    </button>
                  )}
                </div>

                {/* Tab selector */}
                <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setImageTab('device')}
                    className={`flex-1 py-1 px-2 rounded-lg font-semibold transition flex items-center justify-center gap-1.5 ${
                      imageTab === 'device'
                        ? 'bg-amber-600 text-white shadow'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Desde Dispositivo / Cámara</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setImageTab('presets')}
                    className={`flex-1 py-1 px-2 rounded-lg font-semibold transition flex items-center justify-center gap-1.5 ${
                      imageTab === 'presets'
                        ? 'bg-amber-600 text-white shadow'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Fotos Listas</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setImageTab('url')}
                    className={`flex-1 py-1 px-2 rounded-lg font-semibold transition flex items-center justify-center gap-1.5 ${
                      imageTab === 'url'
                        ? 'bg-amber-600 text-white shadow'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>URL Web</span>
                  </button>
                </div>

                {/* Tab 1: Device / Camera upload */}
                {imageTab === 'device' && (
                  <div className="space-y-3">
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDraggingImage(true);
                      }}
                      onDragLeave={() => setIsDraggingImage(false)}
                      onDrop={handleDropImage}
                      className={`border-2 border-dashed rounded-xl p-4 text-center transition-all ${
                        isDraggingImage
                          ? 'border-amber-400 bg-amber-950/30'
                          : 'border-zinc-700 hover:border-zinc-500 bg-zinc-950/50'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        {image ? (
                          <div className="relative group">
                            <img
                              src={image}
                              alt="Vista previa"
                              className="w-24 h-24 rounded-xl object-cover border-2 border-amber-500/60 shadow-lg"
                            />
                            <div className="text-[10px] text-emerald-400 font-bold mt-1 flex items-center justify-center gap-1">
                              <span>✓ Imagen cargada y optimizada</span>
                            </div>
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-zinc-850 flex items-center justify-center text-zinc-400">
                            <Upload className="w-5 h-5 text-amber-400" />
                          </div>
                        )}

                        <p className="text-zinc-300 text-xs font-semibold">
                          Arrastra y suelta una imagen o selecciónala de tu equipo
                        </p>
                        <p className="text-zinc-400 text-[10px]">
                          Formatos JPG, PNG, WEBP (se optimiza automáticamente)
                        </p>

                        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-bold text-xs transition flex items-center gap-1.5 border border-zinc-700"
                          >
                            <Upload className="w-3.5 h-3.5 text-amber-400" />
                            Buscar en Archivos / Galería
                          </button>

                          <button
                            type="button"
                            onClick={() => cameraInputRef.current?.click()}
                            className="px-3 py-1.5 bg-amber-950/80 hover:bg-amber-900 text-amber-200 rounded-lg font-bold text-xs transition flex items-center gap-1.5 border border-amber-700/60"
                          >
                            <Camera className="w-3.5 h-3.5 text-amber-400" />
                            Tomar Foto con Cámara
                          </button>
                        </div>

                        {/* Hidden Inputs */}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleDeviceFileChange}
                          className="hidden"
                        />
                        <input
                          ref={cameraInputRef}
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handleDeviceFileChange}
                          className="hidden"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 2: Presets */}
                {imageTab === 'presets' && (
                  <div className="space-y-2">
                    <p className="text-zinc-400 text-[11px]">
                      Selecciona una foto automotriz predeterminada de alta calidad:
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {PRODUCT_IMAGE_PRESETS.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setImage(preset.url)}
                          className={`p-1.5 rounded-xl border text-left transition flex flex-col items-center gap-1 group ${
                            image === preset.url
                              ? 'bg-amber-950/80 border-amber-500 ring-1 ring-amber-500'
                              : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                          }`}
                        >
                          <img
                            src={preset.url}
                            alt={preset.name}
                            className="w-full h-14 rounded-lg object-cover group-hover:scale-105 transition"
                          />
                          <span className="text-[10px] text-zinc-300 font-semibold truncate w-full text-center">
                            {preset.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tab 3: Direct URL */}
                {imageTab === 'url' && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <ImageIcon className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                        <input
                          type="url"
                          placeholder="https://ejemplo.cl/imagen-producto.jpg"
                          value={image}
                          onChange={(e) => setImage(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-xl pl-9 pr-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500"
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
                )}
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
