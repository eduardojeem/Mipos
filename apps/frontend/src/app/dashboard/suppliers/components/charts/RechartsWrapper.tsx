'use client';

/**
 * Wrapper simplificado para componentes de Recharts
 * Re-exporta directamente para evitar problemas de tipos complejos
 * 
 * Nota: Para usar lazy loading, importa directamente desde 'recharts' 
 * con dynamic() en el componente que lo necesite.
 */

// Re-exportar todos los componentes de Recharts
export {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  ScatterChart,
  Scatter,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

/**
 * Componente de loading para gráficos
 */
export const ChartLoader = () => (
  <div className="flex items-center justify-center h-64 bg-muted/20 rounded-lg animate-pulse">
    <div className="text-sm text-muted-foreground">Cargando gráfico...</div>
  </div>
);

/**
 * Uso con lazy loading (recomendado para páginas grandes):
 * 
 * import dynamic from 'next/dynamic';
 * import { ChartLoader } from './RechartsWrapper';
 * 
 * const Chart = dynamic(
 *   () => import('./MyChart'),
 *   { ssr: false, loading: ChartLoader }
 * );
 * 
 * Uso directo (para componentes pequeños):
 * 
 * import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from './RechartsWrapper';
 * 
 * <ResponsiveContainer width="100%" height={300}>
 *   <BarChart data={data}>
 *     <CartesianGrid strokeDasharray="3 3" />
 *     <XAxis dataKey="name" />
 *     <YAxis />
 *     <Tooltip />
 *     <Legend />
 *     <Bar dataKey="value" fill="#8884d8" />
 *   </BarChart>
 * </ResponsiveContainer>
 */
