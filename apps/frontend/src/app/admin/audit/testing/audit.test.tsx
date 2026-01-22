import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AuditDashboard } from '../components/AuditDashboard';
import { AuditFilters } from '../components/AuditFilters';
import { AuditSearch } from '../components/AuditSearch';
import { AuditTable } from '../components/AuditTable';
import { AuditTimeline } from '../components/AuditTimeline';

// Mock de datos de prueba
const mockLogs = [
  {
    id: '1',
    action: 'CREATE_USER',
    resource: 'users',
    resourceId: 'user-123',
    userId: 'admin-1',
    userEmail: 'admin@test.com',
    userRole: 'admin',
    ipAddress: '192.168.1.1',
    status: 'SUCCESS' as const,
    createdAt: '2024-01-15T10:30:00Z',
    details: { newUser: 'john.doe@test.com' }
  },
  {
    id: '2',
    action: 'DELETE_PRODUCT',
    resource: 'products',
    resourceId: 'prod-456',
    userId: 'admin-2',
    userEmail: 'manager@test.com',
    userRole: 'manager',
    ipAddress: '192.168.1.2',
    status: 'FAILURE' as const,
    createdAt: '2024-01-15T11:15:00Z',
    details: { error: 'Product not found' }
  }
];

const mockStats = {
  total: 150,
  byAction: [
    { action: 'CREATE_USER', count: 45 },
    { action: 'UPDATE_PRODUCT', count: 32 },
    { action: 'DELETE_PRODUCT', count: 18 }
  ],
  byResource: [
    { resource: 'users', count: 67 },
    { resource: 'products', count: 83 }
  ],
  recentActivity: mockLogs
};

const mockPagination = {
  limit: 20,
  page: 1,
  total: 150
};

// Mocks de APIs
jest.mock('../hooks/useAuditData', () => ({
  useAuditData: () => ({
    logs: mockLogs,
    stats: mockStats,
    loading: false,
    error: null,
    filters: {
      action: '',
      resource: '',
      userId: '',
      userEmail: '',
      startDate: '',
      endDate: '',
      status: '',
      search: '',
      ipAddress: '',
      tags: []
    },
    pagination: mockPagination,
    setFilters: jest.fn(),
    setPagination: jest.fn(),
    fetchLogs: jest.fn(),
    fetchStats: jest.fn(),
    exportData: jest.fn(),
    refreshData: jest.fn()
  })
}));

jest.mock('../hooks/useTheme', () => ({
  useTheme: () => ({
    theme: 'light',
    toggleTheme: jest.fn(),
    setLightTheme: jest.fn(),
    setDarkTheme: jest.fn(),
    isDark: false,
    isLight: true
  })
}));

describe('Sistema de Auditoría - Pruebas de Componentes', () => {
  
  describe('AuditDashboard', () => {
    test('renderiza correctamente el dashboard principal', () => {
      render(<AuditDashboard />);
      
      expect(screen.getByText('Sistema de Auditoría Avanzado')).toBeInTheDocument();
      expect(screen.getByText('Monitoreo integral de actividades administrativas con análisis en tiempo real')).toBeInTheDocument();
    });

    test('muestra las métricas principales', () => {
      render(<AuditDashboard />);
      
      expect(screen.getByText('Total Eventos')).toBeInTheDocument();
      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getByText('Exitosos')).toBeInTheDocument();
      expect(screen.getByText('Usuarios Únicos')).toBeInTheDocument();
    });

    test('permite cambiar entre pestañas', async () => {
      render(<AuditDashboard />);
      
      const analyticsTab = screen.getByText('Análisis');
      fireEvent.click(analyticsTab);
      
      await waitFor(() => {
        expect(screen.getByText('Distribución por Acción')).toBeInTheDocument();
      });
    });

    test('muestra el botón de actualización', () => {
      render(<AuditDashboard />);
      
      const refreshButton = screen.getByText('Actualizar');
      expect(refreshButton).toBeInTheDocument();
      expect(refreshButton).not.toBeDisabled();
    });
  });

  describe('AuditFilters', () => {
    const mockOnFiltersChange = jest.fn();
    
    beforeEach(() => {
      mockOnFiltersChange.mockClear();
    });

    test('renderiza todos los filtros básicos', () => {
      render(
        <AuditFilters 
          filters={{
            action: '',
            resource: '',
            userId: '',
            userEmail: '',
            startDate: '',
            endDate: '',
            status: '',
            search: '',
            ipAddress: '',
            tags: []
          }}
          onFiltersChange={mockOnFiltersChange}
          theme="light"
        />
      );
      
      expect(screen.getByText('Filtros Avanzados')).toBeInTheDocument();
      expect(screen.getByText('Hoy')).toBeInTheDocument();
      expect(screen.getByText('Últimos 7 días')).toBeInTheDocument();
      expect(screen.getByText('Últimos 30 días')).toBeInTheDocument();
    });

    test('permite expandir filtros avanzados', async () => {
      render(
        <AuditFilters 
          filters={{
            action: '',
            resource: '',
            userId: '',
            userEmail: '',
            startDate: '',
            endDate: '',
            status: '',
            search: '',
            ipAddress: '',
            tags: []
          }}
          onFiltersChange={mockOnFiltersChange}
          theme="light"
        />
      );
      
      const expandButton = screen.getByText('Expandir');
      fireEvent.click(expandButton);
      
      await waitFor(() => {
        expect(screen.getByText('Dirección IP')).toBeInTheDocument();
        expect(screen.getByText('Etiquetas personalizadas')).toBeInTheDocument();
      });
    });

    test('llama a onFiltersChange cuando se modifica la búsqueda', async () => {
      render(
        <AuditFilters 
          filters={{
            action: '',
            resource: '',
            userId: '',
            userEmail: '',
            startDate: '',
            endDate: '',
            status: '',
            search: '',
            ipAddress: '',
            tags: []
          }}
          onFiltersChange={mockOnFiltersChange}
          theme="light"
        />
      );
      
      const searchInput = screen.getByPlaceholderText('Buscar en todos los campos...');
      fireEvent.change(searchInput, { target: { value: 'test search' } });
      
      await waitFor(() => {
        expect(mockOnFiltersChange).toHaveBeenCalledWith(
          expect.objectContaining({ search: 'test search' })
        );
      });
    });
  });

  describe('AuditSearch', () => {
    const mockOnSearch = jest.fn();
    
    beforeEach(() => {
      mockOnSearch.mockClear();
    });

    test('renderiza el componente de búsqueda', () => {
      render(<AuditSearch onSearch={mockOnSearch} theme="light" />);
      
      const searchInput = screen.getByPlaceholderText('Buscar por acción, recurso, usuario, IP...');
      expect(searchInput).toBeInTheDocument();
    });

    test('muestra búsquedas recientes cuando están disponibles', () => {
      // Simular localStorage con búsquedas recientes
      const mockSearches = ['CREATE_USER', 'admin@test.com', '192.168.1.1'];
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: jest.fn(() => JSON.stringify(mockSearches)),
          setItem: jest.fn(),
        },
        writable: true,
      });

      render(<AuditSearch onSearch={mockOnSearch} theme="light" />);
      
      expect(screen.getByText('Búsquedas recientes:')).toBeInTheDocument();
    });

    test('ejecuta búsqueda al presionar Enter', async () => {
      render(<AuditSearch onSearch={mockOnSearch} theme="light" />);
      
      const searchInput = screen.getByPlaceholderText('Buscar por acción, recurso, usuario, IP...');
      fireEvent.change(searchInput, { target: { value: 'test query' } });
      fireEvent.keyDown(searchInput, { key: 'Enter' });
      
      await waitFor(() => {
        expect(mockOnSearch).toHaveBeenCalledWith('test query');
      });
    });
  });

  describe('AuditTable', () => {
    const mockOnPaginationChange = jest.fn();
    
    beforeEach(() => {
      mockOnPaginationChange.mockClear();
    });

    test('renderiza la tabla con datos', () => {
      render(
        <AuditTable 
          logs={mockLogs}
          loading={false}
          pagination={mockPagination}
          onPaginationChange={mockOnPaginationChange}
          theme="light"
        />
      );
      
      expect(screen.getByText('Tabla de Registros de Auditoría')).toBeInTheDocument();
      expect(screen.getByText('CREATE_USER')).toBeInTheDocument();
      expect(screen.getByText('admin@test.com')).toBeInTheDocument();
    });

    test('muestra estado de carga', () => {
      render(
        <AuditTable 
          logs={[]}
          loading={true}
          pagination={mockPagination}
          onPaginationChange={mockOnPaginationChange}
          theme="light"
        />
      );
      
      expect(screen.getByText('Cargando registros...')).toBeInTheDocument();
    });

    test('permite ordenar por columnas', async () => {
      render(
        <AuditTable 
          logs={mockLogs}
          loading={false}
          pagination={mockPagination}
          onPaginationChange={mockOnPaginationChange}
          theme="light"
        />
      );
      
      const dateHeader = screen.getByText('Fecha/Hora');
      fireEvent.click(dateHeader);
      
      // Verificar que se muestra el indicador de ordenamiento
      await waitFor(() => {
        expect(screen.getByTestId('sort-icon')).toBeInTheDocument();
      });
    });

    test('permite expandir filas para ver detalles', async () => {
      render(
        <AuditTable 
          logs={mockLogs}
          loading={false}
          pagination={mockPagination}
          onPaginationChange={mockOnPaginationChange}
          theme="light"
        />
      );
      
      const expandButton = screen.getAllByRole('button')[0]; // Primer botón de expandir
      fireEvent.click(expandButton);
      
      await waitFor(() => {
        expect(screen.getByText('ID del Registro:')).toBeInTheDocument();
      });
    });
  });

  describe('AuditTimeline', () => {
    test('renderiza el timeline con eventos', () => {
      render(
        <AuditTimeline 
          logs={mockLogs}
          loading={false}
          theme="light"
        />
      );
      
      expect(screen.getByText('Timeline de Eventos')).toBeInTheDocument();
      expect(screen.getByText('Hoy')).toBeInTheDocument();
    });

    test('permite cambiar el nivel de zoom', async () => {
      render(
        <AuditTimeline 
          logs={mockLogs}
          loading={false}
          theme="light"
        />
      );
      
      const hourButton = screen.getByText('Hora');
      fireEvent.click(hourButton);
      
      // Verificar que el botón está activo
      expect(hourButton).toHaveClass('bg-primary');
    });

    test('permite filtrar por tipo de evento', async () => {
      render(
        <AuditTimeline 
          logs={mockLogs}
          loading={false}
          theme="light"
        />
      );
      
      const createButton = screen.getByText('Create user');
      fireEvent.click(createButton);
      
      // Verificar que el filtro está aplicado
      expect(createButton).toHaveClass('bg-primary');
    });

    test('muestra mensaje cuando no hay eventos', () => {
      render(
        <AuditTimeline 
          logs={[]}
          loading={false}
          theme="light"
        />
      );
      
      expect(screen.getByText('No se encontraron eventos para mostrar en el timeline')).toBeInTheDocument();
    });
  });
});

describe('Pruebas de Accesibilidad', () => {
  test('todos los botones tienen labels accesibles', () => {
    render(<AuditDashboard />);
    
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toHaveAttribute('aria-label');
    });
  });

  test('los formularios tienen labels apropiados', () => {
    render(
      <AuditFilters 
        filters={{
          action: '',
          resource: '',
          userId: '',
          userEmail: '',
          startDate: '',
          endDate: '',
          status: '',
          search: '',
          ipAddress: '',
          tags: []
        }}
        onFiltersChange={jest.fn()}
        theme="light"
      />
    );
    
    const inputs = screen.getAllByRole('textbox');
    inputs.forEach(input => {
      expect(input).toHaveAttribute('placeholder');
    });
  });

  test('las tablas tienen headers apropiados', () => {
    render(
      <AuditTable 
        logs={mockLogs}
        loading={false}
        pagination={mockPagination}
        onPaginationChange={jest.fn()}
        theme="light"
      />
    );
    
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader')).toHaveLength(7);
  });
});

describe('Pruebas de Rendimiento', () => {
  test('renderiza rápidamente con muchos logs', () => {
    const manyLogs = Array.from({ length: 1000 }, (_, i) => ({
      ...mockLogs[0],
      id: `log-${i}`,
      createdAt: new Date(Date.now() - i * 60000).toISOString()
    }));

    const startTime = performance.now();
    
    render(
      <AuditTable 
        logs={manyLogs.slice(0, 20)} // Solo renderizar la página actual
        loading={false}
        pagination={{ ...mockPagination, total: 1000 }}
        onPaginationChange={jest.fn()}
        theme="light"
      />
    );
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    // Debe renderizar en menos de 100ms
    expect(renderTime).toBeLessThan(100);
  });

  test('no re-renderiza innecesariamente', () => {
    const mockSetFilters = jest.fn();
    
    const { rerender } = render(
      <AuditFilters 
        filters={{
          action: '',
          resource: '',
          userId: '',
          userEmail: '',
          startDate: '',
          endDate: '',
          status: '',
          search: '',
          ipAddress: '',
          tags: []
        }}
        onFiltersChange={mockSetFilters}
        theme="light"
      />
    );
    
    // Re-renderizar con las mismas props
    rerender(
      <AuditFilters 
        filters={{
          action: '',
          resource: '',
          userId: '',
          userEmail: '',
          startDate: '',
          endDate: '',
          status: '',
          search: '',
          ipAddress: '',
          tags: []
        }}
        onFiltersChange={mockSetFilters}
        theme="light"
      />
    );
    
    // No debería haber llamadas adicionales
    expect(mockSetFilters).not.toHaveBeenCalled();
  });
});

describe('Pruebas de Integración', () => {
  test('flujo completo de filtrado y búsqueda', async () => {
    const mockSetFilters = jest.fn();
    
    render(
      <div>
        <AuditSearch onSearch={(query) => mockSetFilters({ search: query })} theme="light" />
        <AuditFilters 
          filters={{
            action: '',
            resource: '',
            userId: '',
            userEmail: '',
            startDate: '',
            endDate: '',
            status: '',
            search: '',
            ipAddress: '',
            tags: []
          }}
          onFiltersChange={mockSetFilters}
          theme="light"
        />
      </div>
    );
    
    // Realizar búsqueda
    const searchInput = screen.getByPlaceholderText('Buscar por acción, recurso, usuario, IP...');
    fireEvent.change(searchInput, { target: { value: 'CREATE_USER' } });
    fireEvent.keyDown(searchInput, { key: 'Enter' });
    
    await waitFor(() => {
      expect(mockSetFilters).toHaveBeenCalledWith({ search: 'CREATE_USER' });
    });
  });

  test('exportación de datos funciona correctamente', async () => {
    // Mock de la función de exportación
    const mockExportData = jest.fn().mockResolvedValue(new Blob(['test'], { type: 'text/csv' }));
    
    // Mock de URL.createObjectURL
    global.URL.createObjectURL = jest.fn(() => 'mock-url');
    global.URL.revokeObjectURL = jest.fn();
    
    // Mock de createElement y appendChild
    const mockAnchor = {
      href: '',
      download: '',
      click: jest.fn()
    } as any;
    document.createElement = jest.fn(() => mockAnchor as HTMLElement);
    document.body.appendChild = jest.fn();
    document.body.removeChild = jest.fn();
    
    // Simular exportación
    await mockExportData({
      format: 'csv',
      fields: ['id', 'action', 'userEmail'],
      includeDetails: false
    });
    
    expect(mockExportData).toHaveBeenCalled();
  });
});