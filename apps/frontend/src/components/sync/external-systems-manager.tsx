/**
 * External Systems Manager Component
 * Provides interface for managing ERP and other external system integrations
 */

import React, { useState } from 'react';
import { 
  useExternalSync,
  ExternalSystemConfig,
  SyncJob,
  EntityMapping,
  FieldMapping,
  SyncDirection,
  EntityType
} from '@/lib/sync/external-sync';
import { cn } from '@/lib/utils';
import { 
  Plus, 
  Settings, 
  Play, 
  Pause, 
  Trash2, 
  Edit, 
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  RotateCcw,
  Database,
  Cloud,
  Zap,
  Clock,
  TrendingUp,
  AlertTriangle,
  Webhook,
  Key,
  MapPin,
  Filter,
  ArrowLeftRight,
  ArrowRight,
  ArrowLeft,
  Download,
  Upload,
  Calculator,
  Package,
  ShoppingCart
} from 'lucide-react';

interface ExternalSystemsManagerProps {
  className?: string;
}

export function ExternalSystemsManager({ className }: ExternalSystemsManagerProps) {
  const {
    systems,
    jobs,
    activeJobs,
    addSystem,
    updateSystem,
    removeSystem,
    syncEntity,
    syncAllEntities,
    cancelJob,
    getSystemStats,
    resolveConflict,
    scheduleEntitySync,
    cancelEntitySchedule,
    getNextEntityScheduledSync
  } = useExternalSync();

  const [activeTab, setActiveTab] = useState<'systems' | 'jobs' | 'conflicts'>('systems');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSystem, setEditingSystem] = useState<ExternalSystemConfig | null>(null);
  const [selectedSystem, setSelectedSystem] = useState<string | null>(null);
  const [cronInputs, setCronInputs] = useState<Record<string, string>>({});

  const getScheduleKey = (systemId: string, entity: EntityType) => `${systemId}:${entity}`;
  const handleCronChange = (key: string, value: string) => {
    setCronInputs(prev => ({ ...prev, [key]: value }));
  };

  const handleCreateSystem = async (config: Omit<ExternalSystemConfig, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await addSystem(config);
      setShowCreateModal(false);
    } catch (error) {
      console.error('Failed to create external system:', error);
    }
  };

  const handleUpdateSystem = async (id: string, updates: Partial<ExternalSystemConfig>) => {
    try {
      await updateSystem(id, updates);
      setEditingSystem(null);
    } catch (error) {
      console.error('Failed to update external system:', error);
    }
  };

  const handleDeleteSystem = async (id: string) => {
    if (confirm('Are you sure you want to delete this external system integration?')) {
      try {
        await removeSystem(id);
      } catch (error) {
        console.error('Failed to delete external system:', error);
      }
    }
  };

  const handleSyncSystem = async (systemId: string) => {
    try {
      await syncAllEntities(systemId);
    } catch (error) {
      console.error('Failed to sync system:', error);
    }
  };

  const handleSyncEntity = async (systemId: string, entityType: EntityType, direction: SyncDirection) => {
    try {
      await syncEntity(systemId, entityType, direction);
    } catch (error) {
      console.error('Failed to sync entity:', error);
    }
  };

  const renderSystemCard = (system: ExternalSystemConfig) => {
    const stats = getSystemStats(system.id);
    const isActive = activeJobs.some(job => job.systemId === system.id);
    
    return (
      <div key={system.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <div className="flex items-center space-x-2">
                {getSystemIcon(system.type)}
                <h3 className="text-lg font-medium text-gray-900">{system.name}</h3>
              </div>
              <div className="flex items-center space-x-2">
                <span className={cn(
                  "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                  system.enabled 
                    ? "bg-green-100 text-green-800" 
                    : "bg-gray-100 text-gray-800"
                )}>
                  {system.enabled ? 'Active' : 'Inactive'}
                </span>
                {isActive && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    <RotateCcw className="w-3 h-3 mr-1 animate-spin" />
                    Syncing
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
              <span className="flex items-center">
                <Database className="w-4 h-4 mr-1" />
                {system.type.toUpperCase()}
              </span>
              <span className="flex items-center">
                {getSyncDirectionIcon(system.syncSettings.direction)}
                {formatSyncDirection(system.syncSettings.direction)}
              </span>
              <span className="flex items-center">
                <MapPin className="w-4 h-4 mr-1" />
                {system.mappings.filter(m => m.enabled).length} entities
              </span>
            </div>

            <div className="text-sm text-gray-600">
              {system.connection.baseUrl}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleSyncSystem(system.id)}
              disabled={!system.enabled || isActive}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              title="Sync all entities"
            >
              <Play className="w-4 h-4" />
            </button>
            <button
              onClick={() => setEditingSystem(system)}
              className="p-2 text-gray-600 hover:bg-gray-50 rounded-md"
              title="Edit system"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDeleteSystem(system.id)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-md"
              title="Delete system"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">{stats.totalJobs}</div>
            <div className="text-xs text-gray-500">Total Jobs</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-green-600">{stats.successfulJobs}</div>
            <div className="text-xs text-gray-500">Successful</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-red-600">{stats.failedJobs}</div>
            <div className="text-xs text-gray-500">Failed</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-blue-600">
              {stats.uptime.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500">Uptime</div>
          </div>
        </div>

        {/* Entity Mappings */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Entity Mappings</h4>
          <div className="flex flex-wrap gap-2">
            {system.mappings.filter(m => m.enabled).map(mapping => (
              <div key={mapping.id} className="flex items-center space-x-2">
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                  {mapping.localEntity}
                </span>
                <button
                  onClick={() => handleSyncEntity(system.id, mapping.localEntity, system.syncSettings.direction)}
                  disabled={!system.enabled || isActive}
                  className="p-1 text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50"
                  title={`Sync ${mapping.localEntity}`}
                >
                  <Play className="w-3 h-3" />
                </button>
                {/* Scheduling controls */}
                <input
                  type="text"
                  placeholder="*/15 * * * *"
                  className="px-2 py-1 text-xs border rounded"
                  value={cronInputs[getScheduleKey(system.id, mapping.localEntity)] || ''}
                  onChange={(e) => handleCronChange(getScheduleKey(system.id, mapping.localEntity), e.target.value)}
                  title="Cron expression"
                />
                <button
                  onClick={() => {
                    const key = getScheduleKey(system.id, mapping.localEntity);
                    const cron = cronInputs[key] && cronInputs[key].trim() ? cronInputs[key].trim() : '*/15 * * * *';
                    try {
                      scheduleEntitySync(system.id, mapping.localEntity, cron);
                    } catch (error) {
                      console.error('Failed to schedule entity sync', error);
                    }
                  }}
                  className="p-1 text-green-600 hover:bg-green-50 rounded"
                  title={`Schedule ${mapping.localEntity}`}
                >
                  <Clock className="w-3 h-3" />
                </button>
                <button
                  onClick={() => {
                    try {
                      cancelEntitySchedule(system.id, mapping.localEntity);
                    } catch (error) {
                      console.error('Failed to cancel entity schedule', error);
                    }
                  }}
                  className="p-1 text-gray-600 hover:bg-gray-50 rounded"
                  title={`Cancel schedule ${mapping.localEntity}`}
                >
                  <Pause className="w-3 h-3" />
                </button>
                {(() => {
                  const next = getNextEntityScheduledSync(system.id, mapping.localEntity);
                  return next ? (
                    <span className="text-xs text-gray-500">Next: {formatDateTime(next)}</span>
                  ) : null;
                })()}
              </div>
            ))}
          </div>
        </div>

        {/* Last sync info */}
        <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t border-gray-100 mt-4">
          <div>
            {stats.lastSyncAt && (
              <span className="flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                Last: {formatDateTime(stats.lastSyncAt)}
              </span>
            )}
          </div>
          <div>
            {stats.nextSyncAt && (
              <span>Next: {formatDateTime(stats.nextSyncAt)}</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderJobRow = (job: SyncJob) => {
    const system = systems.find(s => s.id === job.systemId);
    
    return (
      <tr key={job.id} className="hover:bg-gray-50">
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex items-center">
            {system && getSystemIcon(system.type)}
            <div className="ml-3">
              <div className="text-sm font-medium text-gray-900">
                {system?.name || 'Unknown System'}
              </div>
              <div className="text-sm text-gray-500">{job.entityType}</div>
            </div>
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex items-center">
            {getSyncDirectionIcon(job.direction)}
            <span className="ml-1 text-sm text-gray-900">
              {formatSyncDirection(job.direction)}
            </span>
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <span className={cn(
            "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
            job.status === 'success' && "bg-green-100 text-green-800",
            job.status === 'error' && "bg-red-100 text-red-800",
            job.status === 'syncing' && "bg-blue-100 text-blue-800",
            job.status === 'idle' && "bg-gray-100 text-gray-800",
            job.status === 'paused' && "bg-yellow-100 text-yellow-800"
          )}>
            {job.status === 'success' && <CheckCircle className="w-3 h-3 mr-1" />}
            {job.status === 'error' && <XCircle className="w-3 h-3 mr-1" />}
            {job.status === 'syncing' && <RotateCcw className="w-3 h-3 mr-1 animate-spin" />}
            {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
          </span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {job.progress.total > 0 && (
            <div className="flex items-center">
              <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${job.progress.percentage}%` }}
                />
              </div>
              <span>{Math.round(job.progress.percentage)}%</span>
            </div>
          )}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {formatDateTime(job.startedAt)}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {job.completedAt ? formatDateTime(job.completedAt) : '-'}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {job.result?.recordsProcessed || job.progress.processed || '-'}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
          {job.status === 'syncing' && (
            <button
              onClick={() => cancelJob(job.id)}
              className="text-red-600 hover:text-red-900"
            >
              Cancel
            </button>
          )}
          {job.result?.conflicts && job.result.conflicts.length > 0 && (
            <button className="text-yellow-600 hover:text-yellow-900 ml-2">
              Resolve ({job.result.conflicts.length})
            </button>
          )}
        </td>
      </tr>
    );
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">External Systems</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage integrations with ERP, CRM, and other business systems
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Integration
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('systems')}
            className={cn(
              "py-2 px-1 border-b-2 font-medium text-sm",
              activeTab === 'systems'
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            Systems ({systems.length})
          </button>
          <button
            onClick={() => setActiveTab('jobs')}
            className={cn(
              "py-2 px-1 border-b-2 font-medium text-sm",
              activeTab === 'jobs'
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            Sync Jobs ({jobs.length})
          </button>
          <button
            onClick={() => setActiveTab('conflicts')}
            className={cn(
              "py-2 px-1 border-b-2 font-medium text-sm",
              activeTab === 'conflicts'
                ? "border-[hsl(var(--primary))] text-[hsl(var(--primary))]"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            Conflicts
            {jobs.some(job => job.result?.conflicts?.length) && (
              <span className="ml-1 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                {jobs.reduce((sum, job) => sum + (job.result?.conflicts?.length || 0), 0)}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'systems' && (
        <div className="space-y-4">
          {systems.length === 0 ? (
            <div className="text-center py-12">
              <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No external systems</h3>
              <p className="text-sm text-gray-500 mb-4">
                Connect your first external system to start synchronizing data
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[hsl(var(--primary))] border border-transparent rounded-md hover:brightness-95"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Integration
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {systems.map(renderSystemCard)}
            </div>
          )}
        </div>
      )}

      {activeTab === 'jobs' && (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          {jobs.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No sync jobs</h3>
              <p className="text-sm text-gray-500">
                Sync jobs will appear here once you start synchronizing data
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      System
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Direction
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Progress
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Started
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Completed
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Records
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {jobs.map(renderJobRow)}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingSystem) && (
        <ExternalSystemModal
          system={editingSystem}
          onSave={editingSystem 
            ? (updates) => handleUpdateSystem(editingSystem.id, updates)
            : handleCreateSystem
          }
          onCancel={() => {
            setShowCreateModal(false);
            setEditingSystem(null);
          }}
        />
      )}
    </div>
  );
}

// Modal component for creating/editing external systems
interface ExternalSystemModalProps {
  system?: ExternalSystemConfig | null;
  onSave: (config: any) => void;
  onCancel: () => void;
}

function ExternalSystemModal({ system, onSave, onCancel }: ExternalSystemModalProps) {
  const [formData, setFormData] = useState({
    name: system?.name || '',
    type: system?.type || 'erp',
    enabled: system?.enabled ?? true,
    connection: {
      baseUrl: system?.connection.baseUrl || '',
      authentication: {
        type: system?.connection.authentication.type || 'api_key',
        credentials: system?.connection.authentication.credentials || {}
      },
      timeout: system?.connection.timeout || 30000,
      retryAttempts: system?.connection.retryAttempts || 3
    },
    syncSettings: {
      direction: system?.syncSettings.direction || 'bidirectional',
      triggers: system?.syncSettings.triggers || ['manual'],
      batchSize: system?.syncSettings.batchSize || 100,
      conflictResolution: system?.syncSettings.conflictResolution || 'timestamp'
    },
    mappings: system?.mappings || []
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {system ? 'Edit External System' : 'Add External System'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  System Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  System Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="erp">ERP System</option>
                  <option value="crm">CRM System</option>
                  <option value="accounting">Accounting System</option>
                  <option value="warehouse">Warehouse Management</option>
                  <option value="ecommerce">E-commerce Platform</option>
                  <option value="custom">Custom System</option>
                </select>
              </div>
            </div>

            {/* Connection Settings */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Connection Settings</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Base URL
                  </label>
                  <input
                    type="url"
                    value={formData.connection.baseUrl}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      connection: { ...prev.connection, baseUrl: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://api.example.com"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Authentication Type
                    </label>
                    <select
                      value={formData.connection.authentication.type}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        connection: {
                          ...prev.connection,
                          authentication: { ...prev.connection.authentication, type: e.target.value as any }
                        }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="api_key">API Key</option>
                      <option value="oauth2">OAuth 2.0</option>
                      <option value="basic">Basic Auth</option>
                      <option value="bearer">Bearer Token</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Timeout (ms)
                    </label>
                    <input
                      type="number"
                      value={formData.connection.timeout}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        connection: { ...prev.connection, timeout: parseInt(e.target.value) }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1000"
                      max="300000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Retry Attempts
                    </label>
                    <input
                      type="number"
                      value={formData.connection.retryAttempts}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        connection: { ...prev.connection, retryAttempts: parseInt(e.target.value) }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                      max="10"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sync Settings */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Sync Settings</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sync Direction
                  </label>
                  <select
                    value={formData.syncSettings.direction}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      syncSettings: { ...prev.syncSettings, direction: e.target.value as SyncDirection }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="bidirectional">Bidirectional</option>
                    <option value="inbound">Inbound Only</option>
                    <option value="outbound">Outbound Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Batch Size
                  </label>
                  <input
                    type="number"
                    value={formData.syncSettings.batchSize}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      syncSettings: { ...prev.syncSettings, batchSize: parseInt(e.target.value) }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                    max="1000"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
              >
                {system ? 'Update' : 'Create'} Integration
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Helper functions
function getSystemIcon(type: string) {
  switch (type) {
    case 'erp':
      return <Database className="w-5 h-5 text-blue-600" />;
    case 'crm':
      return <TrendingUp className="w-5 h-5 text-green-600" />;
    case 'accounting':
      return <Calculator className="w-5 h-5 text-yellow-600" />;
    case 'warehouse':
      return <Package className="w-5 h-5 text-purple-600" />;
    case 'ecommerce':
      return <ShoppingCart className="w-5 h-5 text-pink-600" />;
    default:
      return <Cloud className="w-5 h-5 text-gray-600" />;
  }
}

function getSyncDirectionIcon(direction: SyncDirection) {
  switch (direction) {
    case 'inbound':
      return <ArrowLeft className="w-4 h-4 text-blue-600" />;
    case 'outbound':
      return <ArrowRight className="w-4 h-4 text-green-600" />;
    case 'bidirectional':
      return <ArrowLeftRight className="w-4 h-4 text-purple-600" />;
    default:
      return <ArrowLeftRight className="w-4 h-4 text-gray-600" />;
  }
}

function formatSyncDirection(direction: SyncDirection): string {
  switch (direction) {
    case 'inbound':
      return 'Inbound';
    case 'outbound':
      return 'Outbound';
    case 'bidirectional':
      return 'Bidirectional';
    default:
      return 'Unknown';
  }
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}