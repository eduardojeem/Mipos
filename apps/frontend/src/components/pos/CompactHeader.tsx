import { useState } from 'react';
import { User, Bell } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

export default function CompactHeader() {
  const { user } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="pos-header h-[60px] bg-white border-b border-gray-200 px-4 flex items-center justify-between shadow-sm">
      {/* Logo */}
      <div className="flex items-center">
        <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-lg">POS</span>
        </div>
      </div>

      {/* Usuario y notificaciones */}
      <div className="flex items-center space-x-4">
        {/* Notificaciones solo críticas */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-gray-600 hover:text-gray-800 transition-colors relative"
          >
            <Bell className="w-5 h-5" />
            {/* Indicador de notificación crítica */}
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
          </button>
          
          {/* Dropdown de notificaciones */}
          {showNotifications && (
            <div className="absolute right-0 top-12 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
              <div className="p-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900">Notificaciones</h3>
              </div>
              <div className="p-4">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                  <div>
                    <p className="text-sm text-gray-900">Caja cerrada</p>
                    <p className="text-xs text-gray-500">Hace 5 minutos</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Información del usuario */}
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-gray-600" />
          </div>
          <span className="text-sm font-medium text-gray-700">
            {user?.name || 'Usuario'}
          </span>
        </div>
      </div>
    </header>
  );
}