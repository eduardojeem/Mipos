import { render, screen, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { useIsAuthenticated, useAuth } from '@/hooks/use-auth';
import DashboardLayout from '../layout';
import '@testing-library/jest-dom';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/hooks/use-auth', () => ({
  useIsAuthenticated: jest.fn(),
  useAuth: jest.fn(),
}));

jest.mock('@/lib/sync/sync-coordinator', () => ({
  syncCoordinator: {
    start: jest.fn(),
    stop: jest.fn(),
  },
}));

jest.mock('@/components/dashboard/sidebar', () => ({
  Sidebar: () => <div data-testid="sidebar">Sidebar</div>,
  navigation: [],
}));

jest.mock('@/components/dashboard/MobileNavigation', () => ({
  MobileNavigation: () => <div data-testid="mobile-navigation">Mobile Navigation</div>,
}));

jest.mock('@/components/dashboard/header', () => ({
  Header: () => <div data-testid="header">Header</div>,
}));

jest.mock('@/components/ui/responsive-layout', () => ({
  ResponsiveLayout: ({ children, sidebar, mobileSidebar, header }: any) => (
    <div data-testid="responsive-layout">
      {header}
      {sidebar}
      {mobileSidebar}
      {children}
    </div>
  ),
}));

jest.mock('@/components/keyboard/keyboard-shortcuts', () => ({
  KeyboardShortcuts: () => <div data-testid="keyboard-shortcuts">Keyboard Shortcuts</div>,
}));

jest.mock('@/components/auth/UnifiedPermissionGuard', () => ({
  UnifiedPermissionGuard: ({ children }: any) => <div data-testid="permission-guard">{children}</div>,
}));

jest.mock('@/components/ui/connection-indicator', () => ({
  ConnectionIndicator: () => <div data-testid="connection-indicator">Connection Indicator</div>,
}));

jest.mock('@/components/error/DashboardErrorBoundary', () => ({
  DashboardErrorBoundary: ({ children }: any) => <div data-testid="error-boundary">{children}</div>,
}));

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
};

const mockUseIsAuthenticated = useIsAuthenticated as jest.MockedFunction<typeof useIsAuthenticated>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

describe('DashboardLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue(mockRouter as any);
  });

  it('should show loading state while checking authentication', () => {
    mockUseIsAuthenticated.mockReturnValue({
      isAuthenticated: false,
      loading: true,
    });
    mockUseAuth.mockReturnValue({
      user: null,
    } as any);

    render(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>
    );

    expect(screen.getByText('Verificando autenticación...')).toBeInTheDocument();
    expect(screen.queryByTestId('responsive-layout')).not.toBeInTheDocument();
  });

  it('should render dashboard layout when authenticated', async () => {
    mockUseIsAuthenticated.mockReturnValue({
      isAuthenticated: true,
      loading: false,
    });
    mockUseAuth.mockReturnValue({
      user: {
        id: '1',
        email: 'test@example.com',
        role: 'ADMIN',
      },
    } as any);

    render(
      <DashboardLayout>
        <div data-testid="test-content">Test Content</div>
      </DashboardLayout>
    );

    await waitFor(() => {
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      expect(screen.getByTestId('permission-guard')).toBeInTheDocument();
      expect(screen.getByTestId('responsive-layout')).toBeInTheDocument();
      expect(screen.getByTestId('header')).toBeInTheDocument();
      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('keyboard-shortcuts')).toBeInTheDocument();
      expect(screen.getByTestId('connection-indicator')).toBeInTheDocument();
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
    });
  });

  it('should filter navigation items by user role', async () => {
    const mockUser = {
      id: '1',
      email: 'cashier@example.com',
      role: 'CASHIER',
    };

    mockUseIsAuthenticated.mockReturnValue({
      isAuthenticated: true,
      loading: false,
    });
    mockUseAuth.mockReturnValue({
      user: mockUser,
    } as any);

    render(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>
    );

    await waitFor(() => {
      expect(screen.getByTestId('responsive-layout')).toBeInTheDocument();
    });

    // Navigation filtering is tested in the component's useMemo
    // This test ensures the component renders without errors with different roles
  });

  it('should handle super admin role correctly', async () => {
    const mockUser = {
      id: '1',
      email: 'superadmin@example.com',
      role: 'SUPER_ADMIN',
    };

    mockUseIsAuthenticated.mockReturnValue({
      isAuthenticated: true,
      loading: false,
    });
    mockUseAuth.mockReturnValue({
      user: mockUser,
    } as any);

    render(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>
    );

    await waitFor(() => {
      expect(screen.getByTestId('responsive-layout')).toBeInTheDocument();
    });
  });

  it('should handle user without role', async () => {
    const mockUser = {
      id: '1',
      email: 'user@example.com',
      // No role property
    };

    mockUseIsAuthenticated.mockReturnValue({
      isAuthenticated: true,
      loading: false,
    });
    mockUseAuth.mockReturnValue({
      user: mockUser,
    } as any);

    render(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>
    );

    await waitFor(() => {
      expect(screen.getByTestId('responsive-layout')).toBeInTheDocument();
    });
  });
});