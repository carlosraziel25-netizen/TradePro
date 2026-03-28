export type ReportType = 'degustacion' | 'amarre' | 'valor_agregado' | 'muestreo';

export interface Report {
  id: string;
  type: ReportType;
  storeName: string;
  productName: string;
  quantity: number;
  notes: string;
  timestamp: number;
  userId: string;
  images?: string[];
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface DashboardStats {
  totalDegustaciones: number;
  totalAmarres: number;
  totalMuestreos: number;
  totalValoresAgregados: number;
  storesVisited: number;
}
