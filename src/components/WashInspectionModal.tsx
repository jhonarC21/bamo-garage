import React, { useState, useRef } from 'react';
import {
  ShieldAlert,
  Camera,
  Upload,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ZoomIn,
  Printer,
  X,
  FileText,
  Car,
  Fuel,
  Gauge,
  UserCheck,
  Eye,
  Info,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  WashInspectionSheet,
  VehicleDamageItem,
  IntakePhoto,
  DamageZone,
  DamageType,
  DamageSeverity,
} from '../types';
import { formatDateTime } from '../utils/pricing';
import { compressImageFile } from '../utils/imageCompression';

interface WashInspectionModalProps {
  plate: string;
  orderId?: string;
  clientName?: string;
  clientPhone?: string;
  initialSheet?: WashInspectionSheet;
  currentInspectorName: string;
  onSave: (sheet: WashInspectionSheet) => void;
  onClose: () => void;
}

const ZONE_LABELS: Record<DamageZone, { label: string; desc: string }> = {
  frontal: { label: 'Frontal', desc: 'Capot, parachoque delantero, parrilla' },
  trasera: { label: 'Trasera', desc: 'Maletero, portalón, parachoque trasero' },
  lateral_izquierdo: { label: 'Lateral Izquierdo', desc: 'Puertas izq, tapabarro, zócalo' },
  lateral_derecho: { label: 'Lateral Derecho', desc: 'Puertas der, tapabarro, zócalo' },
  techo: { label: 'Techo', desc: 'Techo, sunroof, barras de portaequipajes' },
  vidrios: { label: 'Vidrios / Parabrisas', desc: 'Parabrisas, luneta, vidrios laterales' },
  llantas_neumaticos: { label: 'Llantas / Ruedas', desc: 'Llantas rayadas, tapas, neumáticos' },
  luces_focos: { label: 'Ópticos y Luces', desc: 'Focos delanteros, ópticos, neblineros' },
  espejos: { label: 'Espejos Retrovisores', desc: 'Carcasas, espejos laterales' },
  interior: { label: 'Interior / Habitáculo', desc: 'Tapiz, tablero, alfombra, manillas' },
};

const DAMAGE_TYPE_LABELS: Record<DamageType, string> = {
  rayon: 'Rayón / Arañazo',
  abolladura: 'Abolladura / Golpe',
  pintura_saltada: 'Pintura saltada / Picotazo',
  quebrado: 'Vidrio / Foco trizado o quebrado',
  pieza_faltante: 'Pieza o moldura faltante',
  mancha_quemadura: 'Mancha previa o quemadura',
  descuadre: 'Descuadre o parachoque suelto',
  otro: 'Otro defecto preexistente',
};

const SEVERITY_CONFIG: Record<DamageSeverity, { label: string; badgeClass: string }> = {
  leve: {
    label: 'Leve',
    badgeClass: 'bg-yellow-950 text-yellow-300 border-yellow-700/60',
  },
  moderado: {
    label: 'Moderado',
    badgeClass: 'bg-amber-950 text-amber-300 border-amber-600/70',
  },
  grave: {
    label: 'Grave',
    badgeClass: 'bg-red-950 text-red-300 border-red-600/70',
  },
};

export const WashInspectionModal: React.FC<WashInspectionModalProps> = ({
  plate,
  orderId,
  clientName,
  clientPhone,
  initialSheet,
  currentInspectorName,
  onSave,
  onClose,
}) => {
  // Tabs: 'damages' | 'photos' | 'intake' | 'print'
  const [activeTab, setActiveTab] = useState<'damages' | 'photos' | 'intake' | 'print'>('damages');

  // Inspection Sheet Form State
  const [damages, setDamages] = useState<VehicleDamageItem[]>(initialSheet?.damages || []);
  const [photos, setPhotos] = useState<IntakePhoto[]>(initialSheet?.photos || []);
  const [inspectorName, setInspectorName] = useState(
    initialSheet?.inspectorName || currentInspectorName || 'Inspector Lavado'
  );
  const [inspectedAt] = useState(initialSheet?.inspectedAt || new Date().toISOString());
  const [initialFuelLevel, setInitialFuelLevel] = useState<
    'vacio' | 'un_cuarto' | 'medio' | 'tres_cuartos' | 'lleno' | undefined
  >(initialSheet?.initialFuelLevel || 'medio');
  const [odometerKm, setOdometerKm] = useState<string>(
    initialSheet?.odometerKm ? String(initialSheet.odometerKm) : ''
  );
  const [valuableItemsDeclared, setValuableItemsDeclared] = useState(
    initialSheet?.valuableItemsDeclared || 'Vehículo entregado sin objetos de valor en habitáculo.'
  );
  const [custName, setCustName] = useState(initialSheet?.customerName || clientName || '');
  const [custPhone, setCustPhone] = useState(initialSheet?.customerPhone || clientPhone || '');
  const [customerSignatureAccepted, setCustomerSignatureAccepted] = useState(
    initialSheet?.customerSignatureAccepted ?? true
  );
  const [customerSignatureName, setCustomerSignatureName] = useState(
    initialSheet?.customerSignatureName || clientName || ''
  );
  const [observations, setObservations] = useState(initialSheet?.observations || '');

  // Active zone for interactive car body map
  const [selectedZone, setSelectedZone] = useState<DamageZone>('frontal');

  // Form to add a new damage item
  const [newDamageType, setNewDamageType] = useState<DamageType>('rayon');
  const [newDamageSeverity, setNewDamageSeverity] = useState<DamageSeverity>('leve');
  const [newDamageDesc, setNewDamageDesc] = useState('');
  const [newDamagePhotoUrl, setNewDamagePhotoUrl] = useState<string | undefined>(undefined);

  // Photo upload state
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [photoCaption, setPhotoCaption] = useState('');
  const [photoSelectedZone, setPhotoSelectedZone] = useState<DamageZone>('frontal');
  const [zoomedPhoto, setZoomedPhoto] = useState<IntakePhoto | null>(null);

  // File input refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const damagePhotoInputRef = useRef<HTMLInputElement>(null);

  // Add damage handler
  const handleAddDamage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDamageDesc.trim()) return;

    const newItem: VehicleDamageItem = {
      id: `dmg_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      zone: selectedZone,
      type: newDamageType,
      severity: newDamageSeverity,
      description: newDamageDesc.trim(),
      photoUrl: newDamagePhotoUrl,
    };

    setDamages((prev) => [newItem, ...prev]);
    setNewDamageDesc('');
    setNewDamagePhotoUrl(undefined);
  };

  const handleDeleteDamage = (id: string) => {
    setDamages((prev) => prev.filter((d) => d.id !== id));
  };

  // Photo upload & compression handler
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingPhoto(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const compressedBase64 = await compressImageFile(file, 1200, 1200, 0.75);

        const newPhoto: IntakePhoto = {
          id: `photo_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 4)}`,
          url: compressedBase64,
          caption: photoCaption.trim() || `Evidencia ${ZONE_LABELS[photoSelectedZone].label}`,
          zone: photoSelectedZone,
          takenAt: new Date().toISOString(),
        };

        setPhotos((prev) => [...prev, newPhoto]);
      }
      setPhotoCaption('');
    } catch (err) {
      console.error('Error al comprimir foto:', err);
    } finally {
      setIsProcessingPhoto(false);
      if (e.target) e.target.value = '';
    }
  };

  // Photo for specific damage item
  const handleDamagePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingPhoto(true);
    try {
      const compressedBase64 = await compressImageFile(file, 1000, 1000, 0.72);
      setNewDamagePhotoUrl(compressedBase64);

      // Also add to global photos pool automatically for redundancy
      const newPhoto: IntakePhoto = {
        id: `photo_dmg_${Date.now()}`,
        url: compressedBase64,
        caption: `Daño ${ZONE_LABELS[selectedZone].label} - ${newDamageDesc || 'Detalle'}`,
        zone: selectedZone,
        takenAt: new Date().toISOString(),
      };
      setPhotos((prev) => [...prev, newPhoto]);
    } catch (err) {
      console.error('Error al cargar foto de daño:', err);
    } finally {
      setIsProcessingPhoto(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleDeletePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  // Save full inspection sheet
  const handleSaveInspection = () => {
    const sheet: WashInspectionSheet = {
      id: initialSheet?.id || `insp_${Date.now()}`,
      orderId,
      plate: plate.toUpperCase(),
      inspectorName: inspectorName.trim() || 'Inspector',
      inspectedAt,
      damages,
      photos,
      initialFuelLevel,
      odometerKm: odometerKm ? Number(odometerKm) : undefined,
      valuableItemsDeclared: valuableItemsDeclared.trim(),
      customerName: custName.trim() || undefined,
      customerPhone: custPhone.trim() || undefined,
      customerSignatureAccepted,
      customerSignatureName: customerSignatureName.trim() || custName.trim() || undefined,
      observations: observations.trim() || undefined,
    };

    onSave(sheet);
    onClose();
  };

  // Count damages per zone
  const getZoneDamageCount = (zone: DamageZone) => {
    return damages.filter((d) => d.zone === zone).length;
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
      <div className="bg-[#10121A] border border-cyan-800/60 rounded-2xl max-w-5xl w-full max-h-[95vh] flex flex-col shadow-2xl overflow-hidden text-zinc-200">
        {/* HEADER */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 bg-[#0c0e14] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shrink-0 shadow-inner">
              <ShieldAlert className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  Ficha de Registro e Inspección de Ingreso
                </h2>
                <span className="font-mono font-black text-sm bg-zinc-950 text-cyan-300 px-2.5 py-0.5 rounded border border-cyan-700/60">
                  {plate.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Constancia de daños preexistentes y registro fotográfico anti-reclamos para el servicio de lavado.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* TABS NAVIGATION */}
        <div className="flex border-b border-zinc-800 bg-[#141722] px-4 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab('damages')}
            className={`py-3 px-4 flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              activeTab === 'damages'
                ? 'border-cyan-500 text-cyan-300 bg-cyan-950/30'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Car className="w-4 h-4" />
            <span>Daños y Carrocería ({damages.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('photos')}
            className={`py-3 px-4 flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              activeTab === 'photos'
                ? 'border-cyan-500 text-cyan-300 bg-cyan-950/30'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Evidencia Fotográfica ({photos.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('intake')}
            className={`py-3 px-4 flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              activeTab === 'intake'
                ? 'border-cyan-500 text-cyan-300 bg-cyan-950/30'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Checklist y Conformidad</span>
          </button>

          <button
            onClick={() => setActiveTab('print')}
            className={`py-3 px-4 flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              activeTab === 'print'
                ? 'border-cyan-500 text-cyan-300 bg-cyan-950/30'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>Vista de Impresión / Acta</span>
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: DAMAGES & CAR BODY MAP */}
          {activeTab === 'damages' && (
            <div className="space-y-6">
              {/* INTERACTIVE CAR BODY SCHEMATIC */}
              <div className="bg-[#141620] border border-zinc-800 rounded-2xl p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-cyan-400" />
                      Esquema de Zonas del Vehículo
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Selecciona una zona para revisar o ingresar los daños detectados antes de comenzar el lavado.
                    </p>
                  </div>
                  <span className="text-xs text-cyan-300 bg-cyan-950/80 px-2.5 py-1 rounded-full border border-cyan-800 self-start sm:self-auto font-mono">
                    Total: {damages.length} daño(s) registrado(s)
                  </span>
                </div>

                {/* ZONE BUTTONS GRID (VISUAL VEHICLE MAP) */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {(Object.keys(ZONE_LABELS) as DamageZone[]).map((zoneKey) => {
                    const count = getZoneDamageCount(zoneKey);
                    const isSelected = selectedZone === zoneKey;
                    return (
                      <button
                        key={zoneKey}
                        type="button"
                        onClick={() => setSelectedZone(zoneKey)}
                        className={`p-2.5 rounded-xl border text-left transition relative flex flex-col justify-between ${
                          isSelected
                            ? 'bg-cyan-950/80 border-cyan-500 text-white shadow-md shadow-cyan-950/40 ring-1 ring-cyan-500/40'
                            : 'bg-zinc-900/80 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-xs">{ZONE_LABELS[zoneKey].label}</span>
                          {count > 0 ? (
                            <span className="w-5 h-5 rounded-full bg-amber-500 text-black font-black text-[10px] flex items-center justify-center">
                              {count}
                            </span>
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-zinc-700"></span>
                          )}
                        </div>
                        <span className="text-[10px] text-zinc-400 truncate mt-1">
                          {ZONE_LABELS[zoneKey].desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ADD DAMAGE FORM FOR CURRENTLY SELECTED ZONE */}
              <div className="bg-[#141620] border border-cyan-900/40 rounded-2xl p-4 sm:p-5">
                <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-cyan-400" />
                  Agregar Daño en Zona: <span className="text-white underline">{ZONE_LABELS[selectedZone].label}</span>
                </h4>

                <form onSubmit={handleAddDamage} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                        Tipo de Defecto
                      </label>
                      <select
                        value={newDamageType}
                        onChange={(e) => setNewDamageType(e.target.value as DamageType)}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500"
                      >
                        {Object.entries(DAMAGE_TYPE_LABELS).map(([k, label]) => (
                          <option key={k} value={k}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                        Severidad / Magnitud
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(['leve', 'moderado', 'grave'] as DamageSeverity[]).map((sev) => (
                          <button
                            key={sev}
                            type="button"
                            onClick={() => setNewDamageSeverity(sev)}
                            className={`py-2 px-1 text-center rounded-lg text-xs font-bold capitalize border transition ${
                              newDamageSeverity === sev
                                ? SEVERITY_CONFIG[sev].badgeClass + ' ring-1'
                                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            {sev}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                        Foto Directa del Daño (Opcional)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          ref={damagePhotoInputRef}
                          onChange={handleDamagePhotoUpload}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => damagePhotoInputRef.current?.click()}
                          disabled={isProcessingPhoto}
                          className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                        >
                          <Camera className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{newDamagePhotoUrl ? 'Foto Adjunta ✓' : 'Tomar / Adjuntar Foto'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                      Descripción Específica del Daño
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newDamageDesc}
                        onChange={(e) => setNewDamageDesc(e.target.value)}
                        placeholder="Ej: Rayón de 10 cm en la puerta, abollón junto a la manilla, etc."
                        className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
                      />
                      <button
                        type="submit"
                        disabled={!newDamageDesc.trim()}
                        className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 transition shadow-md shadow-cyan-600/30"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Anotar Daño</span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              {/* LIST OF REGISTERED DAMAGES */}
              <div className="bg-[#141620] border border-zinc-800 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3 border-b border-zinc-800 pb-2">
                  <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                    Lista de Daños Registrados ({damages.length})
                  </h4>
                  {damages.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setDamages([])}
                      className="text-[11px] text-red-400 hover:text-red-300"
                    >
                      Limpiar lista
                    </button>
                  )}
                </div>

                {damages.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500 text-xs">
                    <Car className="w-8 h-8 mx-auto mb-2 opacity-30 text-cyan-400" />
                    No se han registrado daños preexistentes aún. Si el vehículo entra impecable, puedes dejarlo sin daños o registrar las fotos de respaldo.
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-800/80">
                    {damages.map((dmg) => (
                      <div
                        key={dmg.id}
                        className="py-3 flex items-start justify-between gap-3 text-xs hover:bg-zinc-900/40 p-2 rounded-lg transition"
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                              SEVERITY_CONFIG[dmg.severity].badgeClass
                            }`}
                          >
                            {dmg.severity}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-zinc-200">
                                {ZONE_LABELS[dmg.zone].label}
                              </span>
                              <span className="text-zinc-500">•</span>
                              <span className="text-cyan-400 font-medium">
                                {DAMAGE_TYPE_LABELS[dmg.type]}
                              </span>
                            </div>
                            <p className="text-zinc-300 text-xs mt-0.5">{dmg.description}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {dmg.photoUrl && (
                            <button
                              type="button"
                              onClick={() =>
                                setZoomedPhoto({
                                  id: dmg.id,
                                  url: dmg.photoUrl!,
                                  caption: `${ZONE_LABELS[dmg.zone].label} - ${dmg.description}`,
                                  takenAt: inspectedAt,
                                })
                              }
                              className="w-7 h-7 rounded bg-zinc-800 hover:bg-zinc-700 text-cyan-400 flex items-center justify-center"
                              title="Ver foto del daño"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteDamage(dmg.id)}
                            className="w-7 h-7 rounded bg-zinc-800 hover:bg-red-950 text-zinc-400 hover:text-red-400 flex items-center justify-center transition"
                            title="Eliminar registro"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PHOTOS EVIDENCE (ANTI-RECLAMOS) */}
          {activeTab === 'photos' && (
            <div className="space-y-6">
              {/* UPLOAD & CAMERA SECTION */}
              <div className="bg-[#141620] border border-cyan-900/40 rounded-2xl p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Camera className="w-4 h-4 text-cyan-400" />
                      Constancia Fotográfica de Ingreso
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Fotografías del vehículo tomadas al momento de recibirlo para certificar el estado original de la carrocería, llantas y cristales.
                    </p>
                  </div>
                  <span className="text-xs text-cyan-300 bg-cyan-950/80 px-2.5 py-1 rounded-full border border-cyan-800 self-start sm:self-auto font-mono">
                    {photos.length} foto(s) guardada(s)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                      Zona a Fotografiar
                    </label>
                    <select
                      value={photoSelectedZone}
                      onChange={(e) => setPhotoSelectedZone(e.target.value as DamageZone)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500"
                    >
                      {Object.entries(ZONE_LABELS).map(([k, z]) => (
                        <option key={k} value={k}>
                          {z.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                      Detalle o Comentario de la Foto
                    </label>
                    <input
                      type="text"
                      value={photoCaption}
                      onChange={(e) => setPhotoCaption(e.target.value)}
                      placeholder="Ej: Foto parachoques con raspones previos, llanta delantera derecha..."
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                {/* HIDDEN INPUTS FOR CAMERA & GALLERY */}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={cameraInputRef}
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  ref={fileInputRef}
                  onChange={handlePhotoUpload}
                  className="hidden"
                />

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={isProcessingPhoto}
                    className="flex-1 sm:flex-none bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/30 transition"
                  >
                    <Camera className="w-4 h-4" />
                    <span>{isProcessingPhoto ? 'Procesando...' : 'Tomar Foto con Cámara'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessingPhoto}
                    className="flex-1 sm:flex-none bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 border border-zinc-700 px-4 py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition"
                  >
                    <Upload className="w-4 h-4 text-cyan-400" />
                    <span>Subir desde Galería</span>
                  </button>
                </div>
              </div>

              {/* PHOTO GALLERY */}
              <div className="bg-[#141620] border border-zinc-800 rounded-2xl p-4">
                <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-cyan-400" />
                  Galería de Fotos de Evidencia ({photos.length})
                </h4>

                {photos.length === 0 ? (
                  <div className="text-center py-10 text-zinc-500 text-xs">
                    <Camera className="w-8 h-8 mx-auto mb-2 opacity-30 text-cyan-400" />
                    Aún no se han adjuntado fotos de constancia. Usa la cámara de tu tablet o teléfono para capturar cualquier detalle sospechoso.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {photos.map((photo) => (
                      <div
                        key={photo.id}
                        className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden group hover:border-cyan-700/60 transition flex flex-col"
                      >
                        <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                          <img
                            src={photo.url}
                            alt={photo.caption}
                            className="w-full h-full object-cover cursor-pointer group-hover:scale-105 transition duration-300"
                            onClick={() => setZoomedPhoto(photo)}
                          />
                          <button
                            type="button"
                            onClick={() => setZoomedPhoto(photo)}
                            className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/70 hover:bg-cyan-600 text-white transition"
                            title="Ampliar foto"
                          >
                            <ZoomIn className="w-3.5 h-3.5" />
                          </button>
                          {photo.zone && (
                            <span className="absolute top-2 left-2 bg-black/80 backdrop-blur-sm text-cyan-300 border border-cyan-800/80 text-[10px] font-bold px-2 py-0.5 rounded">
                              {photo.zone.replace('_', ' ')}
                            </span>
                          )}
                        </div>

                        <div className="p-2.5 flex items-start justify-between gap-2 flex-1">
                          <div>
                            <p className="text-xs font-medium text-white truncate max-w-[200px]" title={photo.caption}>
                              {photo.caption}
                            </p>
                            <span className="text-[10px] text-zinc-500 font-mono">
                              {formatDateTime(photo.takenAt)}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeletePhoto(photo.id)}
                            className="text-zinc-500 hover:text-red-400 p-1 transition"
                            title="Eliminar foto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: INTAKE CHECKLIST & CUSTOMER AGREEMENT */}
          {activeTab === 'intake' && (
            <div className="space-y-6">
              <div className="bg-[#141620] border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-cyan-400" />
                  Datos de Recepción y Control de Pertenencias
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                      Inspector / Responsable
                    </label>
                    <input
                      type="text"
                      value={inspectorName}
                      onChange={(e) => setInspectorName(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                      Kilometraje Opcional (Km)
                    </label>
                    <div className="relative">
                      <Gauge className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
                      <input
                        type="number"
                        value={odometerKm}
                        onChange={(e) => setOdometerKm(e.target.value)}
                        placeholder="Ej: 85400"
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                      Nivel de Estanque / Combustible
                    </label>
                    <div className="relative">
                      <Fuel className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
                      <select
                        value={initialFuelLevel}
                        onChange={(e) => setInitialFuelLevel(e.target.value as any)}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                      >
                        <option value="vacio">Vacío (Reserva)</option>
                        <option value="un_cuarto">1/4 Estanque</option>
                        <option value="medio">1/2 Estanque</option>
                        <option value="tres_cuartos">3/4 Estanque</option>
                        <option value="lleno">Lleno (Full)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1 flex items-center justify-between">
                    <span>Declaración de Objetos Personales / Artículos de Valor</span>
                    <span className="text-[10px] text-zinc-500">Crucial para evitar acusaciones</span>
                  </label>
                  <textarea
                    rows={2}
                    value={valuableItemsDeclared}
                    onChange={(e) => setValuableItemsDeclared(e.target.value)}
                    placeholder="Ej: Sin pertenencias de valor en cabina, o: Cliente deja mochila en maleta..."
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                      Nombre del Cliente / Conductor
                    </label>
                    <input
                      type="text"
                      value={custName}
                      onChange={(e) => setCustName(e.target.value)}
                      placeholder="Nombre del cliente"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                      Teléfono de Contacto
                    </label>
                    <input
                      type="text"
                      value={custPhone}
                      onChange={(e) => setCustPhone(e.target.value)}
                      placeholder="+56 9 1234 5678"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                    Observaciones Generales de Recepción
                  </label>
                  <textarea
                    rows={2}
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    placeholder="Cualquier otra indicación especial previa dada por el cliente..."
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* AGREEMENT / SIGNATURE BOX */}
                <div className="bg-cyan-950/40 border border-cyan-800/70 rounded-xl p-4 mt-2">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="check-signature"
                      checked={customerSignatureAccepted}
                      onChange={(e) => setCustomerSignatureAccepted(e.target.checked)}
                      className="mt-1 w-4 h-4 text-cyan-600 rounded bg-zinc-900 border-zinc-700 focus:ring-cyan-500"
                    />
                    <label htmlFor="check-signature" className="text-xs text-zinc-200 cursor-pointer">
                      <strong className="text-white block mb-0.5">
                        Conformidad y Aceptación de Daños Preexistentes
                      </strong>
                      Se deja constancia fehaciente de que el vehículo ingresa a las instalaciones de Bamo Garage SpA con los daños estéticos y mecánicos aquí catalogados y fotografiados. El cliente o receptor valida el estado previo registrado.
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PRINT / EXPORT RECEIPT VIEW */}
          {activeTab === 'print' && (
            <div className="space-y-4">
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 transition shadow-md"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir Ficha de Ingreso</span>
                </button>
              </div>

              {/* PRINTABLE CARD / RECEIPT */}
              <div className="bg-white text-black p-6 sm:p-8 rounded-xl shadow-lg font-sans border border-zinc-300 print:border-none print:shadow-none print:p-0">
                {/* Header */}
                <div className="border-b-2 border-black pb-4 mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-black tracking-tight uppercase">Bamo Garage SpA</h2>
                    <p className="text-xs text-zinc-700">
                      Estacionamiento & Centro de Lavado Automotriz • Santiago de Chile
                    </p>
                    <p className="text-xs font-semibold text-zinc-800 mt-1">
                      ACTA DE RECEPCIÓN E INSPECCIÓN DE INGRESO A LAVADO
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="inline-block border-2 border-black px-3 py-1 text-lg font-mono font-black">
                      {plate.toUpperCase()}
                    </div>
                    <div className="text-[11px] text-zinc-600 font-mono mt-1">
                      Fecha: {formatDateTime(inspectedAt)}
                    </div>
                  </div>
                </div>

                {/* Client & Inspector info */}
                <div className="grid grid-cols-2 gap-4 text-xs mb-4 border-b border-zinc-300 pb-3">
                  <div>
                    <p>
                      <strong>Cliente:</strong> {custName || 'Cliente Particular'}
                    </p>
                    <p>
                      <strong>Teléfono:</strong> {custPhone || 'No registrado'}
                    </p>
                  </div>
                  <div>
                    <p>
                      <strong>Inspector Responsable:</strong> {inspectorName}
                    </p>
                    <p>
                      <strong>Estanque / Km:</strong> {initialFuelLevel || 'Medio'} •{' '}
                      {odometerKm ? `${odometerKm} Km` : 'Sin odómetro'}
                    </p>
                  </div>
                </div>

                {/* Belongings statement */}
                <div className="mb-4 text-xs bg-zinc-100 p-2.5 rounded border border-zinc-300">
                  <strong>Declaración de Pertenencias:</strong> {valuableItemsDeclared}
                </div>

                {/* Damages table */}
                <div className="mb-4">
                  <h4 className="text-xs font-bold uppercase mb-1.5 border-b border-zinc-400 pb-1">
                    Daños y Defectos Preexistentes Catalogados ({damages.length})
                  </h4>
                  {damages.length === 0 ? (
                    <p className="text-xs italic text-zinc-600 py-2">
                      Vehículo ingresa sin daños aparentes exteriores detectados en inspección ocular inicial.
                    </p>
                  ) : (
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-300 text-zinc-600 text-[11px]">
                          <th className="py-1">Zona</th>
                          <th className="py-1">Tipo de Defecto</th>
                          <th className="py-1">Severidad</th>
                          <th className="py-1">Detalle</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200">
                        {damages.map((d) => (
                          <tr key={d.id}>
                            <td className="py-1.5 font-bold">{ZONE_LABELS[d.zone].label}</td>
                            <td className="py-1.5">{DAMAGE_TYPE_LABELS[d.type]}</td>
                            <td className="py-1.5 uppercase font-bold text-[10px]">{d.severity}</td>
                            <td className="py-1.5">{d.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Photos thumbnail preview on print */}
                {photos.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-xs font-bold uppercase mb-2 border-b border-zinc-400 pb-1">
                      Registro Fotográfico Testimonial ({photos.length} fotos)
                    </h4>
                    <div className="grid grid-cols-4 gap-2">
                      {photos.slice(0, 8).map((p, idx) => (
                        <div key={p.id} className="border border-zinc-300 rounded p-1 text-[10px]">
                          <img src={p.url} alt={p.caption} className="w-full h-20 object-cover rounded" />
                          <p className="truncate mt-1 font-semibold">{p.caption}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Observations */}
                {observations && (
                  <div className="mb-4 text-xs">
                    <strong>Observaciones adicionales:</strong> {observations}
                  </div>
                )}

                {/* Signature lines */}
                <div className="mt-8 pt-6 border-t-2 border-zinc-400 grid grid-cols-2 gap-8 text-xs text-center">
                  <div>
                    <div className="border-b border-black w-48 mx-auto mb-1"></div>
                    <p className="font-bold">Firma Operador / Inspector</p>
                    <p className="text-zinc-600 text-[10px]">{inspectorName}</p>
                  </div>
                  <div>
                    <div className="border-b border-black w-48 mx-auto mb-1"></div>
                    <p className="font-bold">Firma / Aceptación del Cliente</p>
                    <p className="text-zinc-600 text-[10px]">{custName || 'Conformidad de Estado'}</p>
                  </div>
                </div>

                <p className="text-[10px] text-zinc-500 text-center mt-6">
                  Documento emitido por Bamo Garage SpA para resguardo contractual del estado del vehículo antes del servicio.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-4 border-t border-zinc-800 bg-[#0c0e14] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-zinc-400">
            <ShieldAlert className="w-4 h-4 text-cyan-400" />
            <span>
              Resumen: <strong>{damages.length}</strong> daños anotados • <strong>{photos.length}</strong> fotos guardadas
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveInspection}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center justify-center gap-1.5 transition shadow-lg shadow-cyan-600/30"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Guardar Ficha de Inspección</span>
            </button>
          </div>
        </div>
      </div>

      {/* LIGHTBOX ZOOM MODAL */}
      {zoomedPhoto && (
        <div
          className="fixed inset-0 bg-black/95 z-60 flex flex-col items-center justify-center p-4 animate-fadeIn"
          onClick={() => setZoomedPhoto(null)}
        >
          <div className="relative max-w-4xl w-full max-h-[85vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <img
              src={zoomedPhoto.url}
              alt={zoomedPhoto.caption}
              className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-2xl border border-zinc-700"
            />
            <div className="mt-3 text-center">
              <p className="text-white text-sm font-bold">{zoomedPhoto.caption}</p>
              <span className="text-xs text-zinc-400 font-mono">{formatDateTime(zoomedPhoto.takenAt)}</span>
            </div>
            <button
              onClick={() => setZoomedPhoto(null)}
              className="absolute -top-10 right-0 text-zinc-400 hover:text-white text-xs font-bold px-3 py-1 rounded bg-zinc-800"
            >
              Cerrar ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
