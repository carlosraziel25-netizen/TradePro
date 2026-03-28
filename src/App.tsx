/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  ClipboardList, 
  History, 
  PlusCircle, 
  MapPin, 
  Package, 
  Users, 
  Gift, 
  TrendingUp,
  ChevronRight,
  Store,
  Clock,
  Search,
  CheckCircle2,
  AlertCircle,
  LogOut,
  LogIn,
  Camera,
  X,
  Image as ImageIcon,
  Loader2,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'sonner';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Report, ReportType, DashboardStats } from './types';
import { PRODUCTS } from './constants';
import { POINTS_OF_SALE } from './pdv_constants';

// Firebase Imports
import { auth, db, storage } from './firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  orderBy,
  Timestamp,
  serverTimestamp,
  getDocFromServer,
  doc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Tab = 'dashboard' | 'reports' | 'history' | 'products';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [reports, setReports] = useState<Report[]>([]);
  const [showReportForm, setShowReportForm] = useState<ReportType | null>(null);
  const [prefilledProduct, setPrefilledProduct] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Test Connection
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Update clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Real-time Reports Listener
  useEffect(() => {
    if (!user) {
      setReports([]);
      return;
    }

    const q = query(
      collection(db, 'reports'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedReports: Report[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        fetchedReports.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toMillis() || Date.now()
        } as Report);
      });
      setReports(fetchedReports);
    }, (error) => {
      console.error("Firestore Error:", error);
      toast.error("Error al cargar reportes");
    });

    return () => unsubscribe();
  }, [user]);

  const stats: DashboardStats = {
    totalDegustaciones: reports.filter(r => r.type === 'degustacion').reduce((acc, r) => acc + r.quantity, 0),
    totalAmarres: reports.filter(r => r.type === 'amarre').length,
    totalMuestreos: reports.filter(r => r.type === 'muestreo').reduce((acc, r) => acc + r.quantity, 0),
    totalValoresAgregados: reports.filter(r => r.type === 'valor_agregado').length,
    storesVisited: new Set(reports.map(r => r.storeName)).size
  };

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast.success('Sesión iniciada correctamente');
    } catch (error) {
      console.error(error);
      toast.error('Error al iniciar sesión');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.info('Sesión cerrada');
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddReport = async (reportData: Omit<Report, 'id' | 'timestamp' | 'userId'>) => {
    if (!user) return;

    try {
      await addDoc(collection(db, 'reports'), {
        ...reportData,
        userId: user.uid,
        timestamp: serverTimestamp()
      });
      
      setShowReportForm(null);
      toast.success('Reporte enviado con éxito', {
        description: `Se registró ${reportData.type} en ${reportData.storeName}`,
        icon: <CheckCircle2 className="w-5 h-5 text-green-500" />
      });
    } catch (error) {
      console.error(error);
      toast.error('Error al enviar el reporte');
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center shadow-xl shadow-blue-200 mb-8">
          <TrendingUp className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold mb-2">TradePro</h1>
        <p className="text-gray-500 mb-8 max-w-xs">Gestiona tus reportes de trade marketing de forma profesional y en tiempo real.</p>
        <button 
          onClick={handleLogin}
          className="w-full max-w-xs flex items-center justify-center gap-3 py-4 bg-white border border-gray-200 rounded-2xl font-bold shadow-sm hover:bg-gray-50 transition-all active:scale-95"
        >
          <LogIn className="w-5 h-5 text-blue-600" />
          Iniciar con Google
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans pb-24">
      <Toaster position="top-center" />
      
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 px-6 py-4 flex justify-between items-center shadow-sm">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-blue-600">TradePro</h1>
          <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
            <Clock className="w-3 h-3" />
            <span>{format(currentTime, 'HH:mm:ss')}</span>
            <span className="mx-1">•</span>
            <span>{format(currentTime, 'dd MMM yyyy')}</span>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <LogOut className="w-5 h-5 text-gray-400" />
        </button>
      </header>

      <main className="max-w-md mx-auto p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <section>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">Resumen del Día</h2>
                <div className="grid grid-cols-2 gap-4">
                  <StatCard 
                    title="Degustaciones" 
                    value={stats.totalDegustaciones} 
                    icon={<Users className="w-5 h-5 text-blue-500" />}
                    color="bg-blue-50"
                  />
                  <StatCard 
                    title="Amarres" 
                    value={stats.totalAmarres} 
                    icon={<Package className="w-5 h-5 text-orange-500" />}
                    color="bg-orange-50"
                  />
                  <StatCard 
                    title="Muestreos" 
                    value={stats.totalMuestreos} 
                    icon={<Gift className="w-5 h-5 text-purple-500" />}
                    color="bg-purple-50"
                  />
                  <StatCard 
                    title="Tiendas" 
                    value={stats.storesVisited} 
                    icon={<Store className="w-5 h-5 text-green-500" />}
                    color="bg-green-50"
                  />
                </div>
              </section>

              <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    Metas de Hoy
                  </h3>
                  <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                    {Math.min(Math.round(((stats.totalDegustaciones/100 + stats.totalAmarres/20 + stats.totalMuestreos/50)/3)*100), 100)}% Completado
                  </span>
                </div>
                <div className="space-y-4">
                  <ProgressBar label="Degustaciones" current={stats.totalDegustaciones} target={100} color="bg-blue-500" />
                  <ProgressBar label="Amarres" current={stats.totalAmarres} target={20} color="bg-orange-500" />
                  <ProgressBar label="Muestreos" current={stats.totalMuestreos} target={50} color="bg-purple-500" />
                </div>
              </section>

              <section>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">Acciones Rápidas</h2>
                <div className="grid grid-cols-4 gap-2">
                  <QuickAction icon={<Users />} label="Degust." onClick={() => { setActiveTab('reports'); setShowReportForm('degustacion'); }} />
                  <QuickAction icon={<Package />} label="Amarre" onClick={() => { setActiveTab('reports'); setShowReportForm('amarre'); }} />
                  <QuickAction icon={<Gift />} label="Muestreo" onClick={() => { setActiveTab('reports'); setShowReportForm('muestreo'); }} />
                  <QuickAction icon={<PlusCircle />} label="Valor" onClick={() => { setActiveTab('reports'); setShowReportForm('valor_agregado'); }} />
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'reports' && (
            <motion.div
              key="reports"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {!showReportForm ? (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold">Nuevo Reporte</h2>
                  <p className="text-gray-500 text-sm">Selecciona el tipo de actividad que deseas reportar en el punto de venta.</p>
                  
                  <div className="space-y-3">
                    <ReportTypeButton 
                      type="degustacion" 
                      title="Reporte de Degustaciones" 
                      desc="Registro de pruebas de producto con clientes."
                      icon={<Users className="w-6 h-6" />}
                      onClick={() => { setShowReportForm('degustacion'); setPrefilledProduct(''); }}
                    />
                    <ReportTypeButton 
                      type="amarre" 
                      title="Reporte de Amarres" 
                      desc="Control de promociones y packs armados."
                      icon={<Package className="w-6 h-6" />}
                      onClick={() => { setShowReportForm('amarre'); setPrefilledProduct(''); }}
                    />
                    <ReportTypeButton 
                      type="muestreo" 
                      title="Muestreo de Productos" 
                      desc="Seguimiento de distribución de muestras."
                      icon={<Gift className="w-6 h-6" />}
                      onClick={() => { setShowReportForm('muestreo'); setPrefilledProduct(''); }}
                    />
                    <ReportTypeButton 
                      type="valor_agregado" 
                      title="Valores Agregados" 
                      desc="Actividades adicionales en tienda."
                      icon={<PlusCircle className="w-6 h-6" />}
                      onClick={() => { setShowReportForm('valor_agregado'); setPrefilledProduct(''); }}
                    />
                  </div>
                </div>
              ) : (
                <ReportForm 
                  type={showReportForm} 
                  prefilledProduct={prefilledProduct}
                  onCancel={() => { setShowReportForm(null); setPrefilledProduct(''); }} 
                  onSubmit={handleAddReport}
                />
              )}
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex flex-col gap-4">
                <h2 className="text-xl font-bold">Historial de Actividad</h2>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Buscar por tienda o producto..."
                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-3">
                {reports
                  .filter(r => 
                    r.storeName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    r.productName.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((report) => (
                    <HistoryItem key={report.id} report={report} />
                  ))}
                {reports.length === 0 && (
                  <div className="text-center py-12">
                    <ClipboardList className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">No hay reportes registrados hoy.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
          {activeTab === 'products' && (
            <motion.div
              key="products"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex flex-col gap-4">
                <h2 className="text-xl font-bold">Catálogo de Productos</h2>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Buscar producto..."
                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="divide-y divide-gray-50">
                  {PRODUCTS
                    .filter(p => p.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((product, index) => (
                      <div 
                        key={index} 
                        className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between group cursor-pointer"
                        onClick={() => {
                          setActiveTab('reports');
                          setShowReportForm('degustacion'); // Default to degustacion or let them pick?
                          // We need a way to pass the product to the form. 
                          // Let's add a state for prefilledProduct.
                          setPrefilledProduct(product);
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                            <Package className="w-4 h-4" />
                          </div>
                          <span className="text-sm font-medium text-gray-700">{product}</span>
                        </div>
                        <PlusCircle className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
                      </div>
                    ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 flex justify-around items-center z-40 shadow-[0_-4px_10px_rgba(0,0,0,0.03)]">
        <NavButton 
          active={activeTab === 'dashboard'} 
          onClick={() => { setActiveTab('dashboard'); setShowReportForm(null); setPrefilledProduct(''); }} 
          icon={<LayoutDashboard />} 
          label="Inicio" 
        />
        <NavButton 
          active={activeTab === 'products'} 
          onClick={() => { setActiveTab('products'); setShowReportForm(null); setPrefilledProduct(''); }} 
          icon={<BookOpen />} 
          label="Catálogo" 
        />
        <NavButton 
          active={activeTab === 'reports'} 
          onClick={() => { setActiveTab('reports'); setShowReportForm(null); setPrefilledProduct(''); }} 
          icon={<PlusCircle />} 
          label="Reportar" 
        />
        <NavButton 
          active={activeTab === 'history'} 
          onClick={() => { setActiveTab('history'); setShowReportForm(null); setPrefilledProduct(''); }} 
          icon={<History />} 
          label="Historial" 
        />
      </nav>
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string, value: number, icon: React.ReactNode, color: string }) {
  return (
    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", color)}>
        {icon}
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-gray-500 font-medium">{title}</p>
    </div>
  );
}

function ProgressBar({ label, current, target, color }: { label: string, current: number, target: number, color: string }) {
  const percentage = Math.min(Math.round((current / target) * 100), 100);
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs font-medium">
        <span className="text-gray-600">{label}</span>
        <span className="text-gray-400">{current}/{target}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          className={cn("h-full rounded-full", color)}
        />
      </div>
    </div>
  );
}

function QuickAction({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-3 bg-white rounded-xl border border-gray-100 shadow-sm hover:border-blue-200 hover:bg-blue-50 transition-all active:scale-95"
    >
      <div className="text-blue-600">{icon}</div>
      <span className="text-[10px] font-bold uppercase tracking-tight text-gray-500">{label}</span>
    </button>
  );
}

function ReportTypeButton({ type, title, desc, icon, onClick }: { type: ReportType, title: string, desc: string, icon: React.ReactNode, onClick: () => void }) {
  const colors = {
    degustacion: "text-blue-600 bg-blue-50",
    amarre: "text-orange-600 bg-orange-50",
    muestreo: "text-purple-600 bg-purple-50",
    valor_agregado: "text-green-600 bg-green-50"
  };

  return (
    <button 
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:border-blue-200 transition-all active:scale-[0.98] text-left"
    >
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", colors[type])}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-gray-900">{title}</h3>
        <p className="text-xs text-gray-500 truncate">{desc}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-gray-300" />
    </button>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactElement, label: string }) {
  return (
    <button 
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 transition-all relative",
        active ? "text-blue-600" : "text-gray-400"
      )}
    >
      {React.cloneElement(icon, { className: "w-6 h-6" })}
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      {active && (
        <motion.div 
          layoutId="nav-indicator"
          className="absolute -top-3 w-1 h-1 bg-blue-600 rounded-full"
        />
      )}
    </button>
  );
}

function ReportForm({ type, prefilledProduct, onCancel, onSubmit }: { type: ReportType, prefilledProduct?: string, onCancel: () => void, onSubmit: (report: Omit<Report, 'id' | 'timestamp' | 'userId'>) => void }) {
  const [formData, setFormData] = useState({
    storeName: '',
    productName: prefilledProduct || '',
    quantity: 0,
    notes: ''
  });
  const [isCapturingLocation, setIsCapturingLocation] = useState(false);
  const [location, setLocation] = useState<{ latitude: number, longitude: number } | undefined>();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [productSearch, setProductSearch] = useState(prefilledProduct || '');
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const [storeSearch, setStoreSearch] = useState('');
  const [showStoreSuggestions, setShowStoreSuggestions] = useState(false);

  useEffect(() => {
    if (prefilledProduct) {
      setFormData(prev => ({ ...prev, productName: prefilledProduct }));
      setProductSearch(prefilledProduct);
    }
  }, [prefilledProduct]);

  const filteredProducts = PRODUCTS.filter(p => 
    p.toLowerCase().includes(productSearch.toLowerCase())
  ).slice(0, 10);

  const filteredStores = POINTS_OF_SALE.filter(s => 
    s.toLowerCase().includes(storeSearch.toLowerCase())
  ).slice(0, 10);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (selectedFiles.length + files.length > 3) {
      toast.error('Máximo 3 fotos por reporte');
      return;
    }

    const newFiles = [...selectedFiles, ...files];
    setSelectedFiles(newFiles);

    const newPreviews = files.map(file => URL.createObjectURL(file));
    setPreviews([...previews, ...newPreviews]);
  };

  const removeImage = (index: number) => {
    const newFiles = [...selectedFiles];
    newFiles.splice(index, 1);
    setSelectedFiles(newFiles);

    const newPreviews = [...previews];
    URL.revokeObjectURL(newPreviews[index]);
    newPreviews.splice(index, 1);
    setPreviews(newPreviews);
  };

  const handleCaptureLocation = () => {
    setIsCapturingLocation(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          setIsCapturingLocation(false);
          toast.success('Ubicación capturada');
        },
        (error) => {
          console.error(error);
          setIsCapturingLocation(false);
          toast.error('Error al capturar ubicación');
        }
      );
    } else {
      setIsCapturingLocation(false);
      toast.error('Geolocalización no disponible');
    }
  };

  const uploadImages = async (): Promise<string[]> => {
    const uploadPromises = selectedFiles.map(async (file) => {
      const storageRef = ref(storage, `reports/${auth.currentUser?.uid}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      return getDownloadURL(snapshot.ref);
    });
    return Promise.all(uploadPromises);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.storeName || !formData.productName) {
      toast.error('Por favor completa los campos obligatorios');
      return;
    }

    setIsUploading(true);
    try {
      const imageUrls = await uploadImages();
      onSubmit({
        type,
        ...formData,
        location,
        images: imageUrls
      });
    } catch (error) {
      console.error(error);
      toast.error('Error al subir imágenes o enviar reporte');
    } finally {
      setIsUploading(false);
    }
  };

  const titles = {
    degustacion: "Reporte de Degustación",
    amarre: "Reporte de Amarre",
    muestreo: "Reporte de Muestreo",
    valor_agregado: "Reporte de Valor Agregado"
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100"
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">{titles[type]}</h2>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <X className="w-6 h-6" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5 relative">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500 ml-1">Tienda / Punto de Venta *</label>
          <div className="relative">
            <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              required
              placeholder="Buscar tienda..."
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              value={storeSearch}
              onChange={e => {
                setStoreSearch(e.target.value);
                setFormData({...formData, storeName: e.target.value});
                setShowStoreSuggestions(true);
              }}
              onFocus={() => setShowStoreSuggestions(true)}
            />
          </div>
          {showStoreSuggestions && storeSearch && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
              {filteredStores.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0"
                  onClick={() => {
                    setFormData({...formData, storeName: s});
                    setStoreSearch(s);
                    setShowStoreSuggestions(false);
                  }}
                >
                  {s}
                </button>
              ))}
              {filteredStores.length === 0 && (
                <div className="px-4 py-2 text-sm text-gray-400 italic">No se encontraron tiendas</div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-1.5 relative">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500 ml-1">Producto *</label>
          <div className="relative">
            <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              required
              placeholder="Buscar producto..."
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              value={productSearch}
              onChange={e => {
                setProductSearch(e.target.value);
                setFormData({...formData, productName: e.target.value});
                setShowProductSuggestions(true);
              }}
              onFocus={() => setShowProductSuggestions(true)}
            />
          </div>
          {showProductSuggestions && productSearch && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
              {filteredProducts.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0"
                  onClick={() => {
                    setFormData({...formData, productName: p});
                    setProductSearch(p);
                    setShowProductSuggestions(false);
                  }}
                >
                  {p}
                </button>
              ))}
              {filteredProducts.length === 0 && (
                <div className="px-4 py-2 text-sm text-gray-400 italic">No se encontraron productos</div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500 ml-1">Cantidad / Impactos</label>
            <input 
              type="number" 
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              value={formData.quantity || ''}
              onChange={e => setFormData({...formData, quantity: parseInt(e.target.value) || 0})}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500 ml-1">Ubicación GPS</label>
            <button 
              type="button"
              onClick={handleCaptureLocation}
              disabled={isCapturingLocation}
              className={cn(
                "w-full flex items-center justify-center gap-2 py-3 rounded-xl border transition-all text-sm font-medium",
                location 
                  ? "bg-green-50 border-green-200 text-green-700" 
                  : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
              )}
            >
              <MapPin className={cn("w-4 h-4", isCapturingLocation && "animate-bounce")} />
              {location ? "Capturado" : isCapturingLocation ? "Capturando..." : "Capturar"}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500 ml-1">Fotos (Máx. 3)</label>
          <div className="flex gap-3">
            <label className="flex-1 flex flex-col items-center justify-center gap-1 p-4 border-2 border-dashed border-gray-200 rounded-2xl hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer">
              <Camera className="w-6 h-6 text-gray-400" />
              <span className="text-[10px] font-bold text-gray-500 uppercase">Añadir Foto</span>
              <input 
                type="file" 
                accept="image/*" 
                multiple 
                className="hidden" 
                onChange={handleFileChange}
                disabled={selectedFiles.length >= 3}
              />
            </label>
            <div className="flex gap-2">
              {previews.map((preview, index) => (
                <div key={index} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                  <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                  <button 
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500 ml-1">Notas / Observaciones</label>
          <textarea 
            rows={3}
            placeholder="Detalles adicionales..."
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
            value={formData.notes}
            onChange={e => setFormData({...formData, notes: e.target.value})}
          />
        </div>

        <div className="pt-4 flex gap-3">
          <button 
            type="button"
            onClick={onCancel}
            disabled={isUploading}
            className="flex-1 py-3 px-4 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition-all disabled:opacity-50"
          >
            Cancelar
          </button>
          <button 
            type="submit"
            disabled={isUploading}
            className="flex-[2] py-3 px-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Enviando...
              </>
            ) : (
              "Enviar Reporte"
            )}
          </button>
        </div>
      </form>
    </motion.div>
  );
}

const HistoryItem: React.FC<{ report: Report }> = ({ report }) => {
  const typeLabels = {
    degustacion: { label: "Degustación", color: "text-blue-600 bg-blue-50" },
    amarre: { label: "Amarre", color: "text-orange-600 bg-orange-50" },
    muestreo: { label: "Muestreo", color: "text-purple-600 bg-purple-50" },
    valor_agregado: { label: "Valor Agregado", color: "text-green-600 bg-green-50" }
  };

  const { label, color } = typeLabels[report.type];

  return (
    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-3">
      <div className="flex gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-1">
            <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full", color)}>
              {label}
            </span>
            <span className="text-[10px] text-gray-400 font-medium">
              {format(report.timestamp, 'HH:mm')}
            </span>
          </div>
          <h4 className="font-bold text-gray-900 truncate">{report.storeName}</h4>
          <p className="text-xs text-gray-500 mb-2">{report.productName} • {report.quantity} unidades</p>
          {report.notes && (
            <p className="text-[11px] text-gray-400 italic line-clamp-1">"{report.notes}"</p>
          )}
        </div>
        {report.location && (
          <div className="flex items-center justify-center shrink-0">
            <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center" title="Verificado con GPS">
              <MapPin className="w-4 h-4 text-green-500" />
            </div>
          </div>
        )}
      </div>
      
      {report.images && report.images.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {report.images.map((url, idx) => (
            <div key={idx} className="relative w-24 h-24 shrink-0 rounded-xl overflow-hidden border border-gray-100">
              <img 
                src={url} 
                alt={`Reporte ${idx + 1}`} 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
