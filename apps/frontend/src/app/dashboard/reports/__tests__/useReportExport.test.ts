import { renderHook, act } from '@testing-library/react';
import { useReportExport } from '../hooks/useReportExport';
import { useToast } from '@/components/ui/use-toast';

// Mock dependencies
jest.mock('@/components/ui/use-toast');
jest.mock('jspdf', () => {
  return jest.fn().mockImplementation(() => ({
    text: jest.fn(),
    save: jest.fn(),
    autoTable: jest.fn(),
  }));
});

jest.mock('xlsx', () => ({
  utils: {
    json_to_sheet: jest.fn(() => ({})),
    book_new: jest.fn(() => ({})),
    book_append_sheet: jest.fn(),
  },
  writeFile: jest.fn(),
}));

const mockToast = jest.fn();
(useToast as jest.Mock).mockReturnValue({ toast: mockToast });

describe('useReportExport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock URL.createObjectURL and URL.revokeObjectURL
    global.URL.createObjectURL = jest.fn(() => 'mock-url');
    global.URL.revokeObjectURL = jest.fn();
    
    // Mock document.createElement and click
    const mockLink = {
      href: '',
      download: '',
      click: jest.fn(),
    };
    jest.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
    jest.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
    jest.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should export data to CSV format', async () => {
    const { result } = renderHook(() => useReportExport());

    const testData = [
      { id: 1, name: 'Product 1', price: 100 },
      { id: 2, name: 'Product 2', price: 200 },
    ];

    await act(async () => {
      await result.current.exportToCSV(testData, 'test-report');
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Exportación exitosa',
      description: 'El archivo CSV ha sido descargado.',
    });
  });

  it('should export data to Excel format', async () => {
    const { result } = renderHook(() => useReportExport());

    const testData = [
      { id: 1, name: 'Product 1', price: 100 },
      { id: 2, name: 'Product 2', price: 200 },
    ];

    await act(async () => {
      await result.current.exportToExcel(testData, 'test-report');
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Exportación exitosa',
      description: 'El archivo Excel ha sido descargado.',
    });
  });

  it('should export data to PDF format', async () => {
    const { result } = renderHook(() => useReportExport());

    const testData = [
      { id: 1, name: 'Product 1', price: 100 },
      { id: 2, name: 'Product 2', price: 200 },
    ];

    const columns = [
      { header: 'ID', dataKey: 'id' },
      { header: 'Nombre', dataKey: 'name' },
      { header: 'Precio', dataKey: 'price' },
    ];

    await act(async () => {
      await result.current.exportToPDF(testData, columns, 'test-report');
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Exportación exitosa',
      description: 'El archivo PDF ha sido descargado.',
    });
  });

  it('should export data to JSON format', async () => {
    const { result } = renderHook(() => useReportExport());

    const testData = [
      { id: 1, name: 'Product 1', price: 100 },
      { id: 2, name: 'Product 2', price: 200 },
    ];

    await act(async () => {
      await result.current.exportToJSON(testData, 'test-report');
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Exportación exitosa',
      description: 'El archivo JSON ha sido descargado.',
    });
  });

  it('should handle export errors gracefully', async () => {
    const { result } = renderHook(() => useReportExport());

    // Mock an error in the export process
    jest.spyOn(document, 'createElement').mockImplementation(() => {
      throw new Error('Export failed');
    });

    const testData = [{ id: 1, name: 'Product 1' }];

    await act(async () => {
      await result.current.exportToCSV(testData, 'test-report');
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Error en la exportación',
      description: 'No se pudo exportar el archivo. Inténtalo de nuevo.',
      variant: 'destructive',
    });
  });

  it('should handle empty data arrays', async () => {
    const { result } = renderHook(() => useReportExport());

    await act(async () => {
      await result.current.exportToCSV([], 'empty-report');
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Sin datos para exportar',
      description: 'No hay datos disponibles para exportar.',
      variant: 'destructive',
    });
  });

  it('should track export state correctly', async () => {
    const { result } = renderHook(() => useReportExport());

    expect(result.current.isExporting).toBe(false);

    const exportPromise = act(async () => {
      return result.current.exportToCSV([{ id: 1, name: 'Test' }], 'test');
    });

    // During export, isExporting should be true
    expect(result.current.isExporting).toBe(true);

    await exportPromise;

    // After export, isExporting should be false
    expect(result.current.isExporting).toBe(false);
  });
});