/**
 * Scheduled Export Manager Component
 * Provides interface for creating, managing, and monitoring scheduled exports
 */

import React, { useState } from 'react';
import { 
  useScheduledExports,
  ScheduledExportConfig,
  ScheduledExportJob,
  ExportSchedule,
  DeliveryConfig
} from '@/lib/import-export/scheduled-exports';
import { cn } from '@/lib/utils';
import { 
  Plus, 
  Calendar, 
  Clock, 
  Mail, 
  Webhook, 
  Download, 
  Play, 
  Pause, 
  Trash2, 
  Edit, 
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  RotateCcw
} from 'lucide-react';

interface ScheduledExportManagerProps {
  className?: string;
}

export function ScheduledExportManager({ className }: ScheduledExportManagerProps) {
  const {
    configs,
    jobs,
    createConfig,
    updateConfig,
    deleteConfig,
    triggerExport,
    cancelJob,
    getConfigStats
  } = useScheduledExports();

  const [activeTab, setActiveTab] = useState<'configs' | 'jobs'>('configs');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ScheduledExportConfig | null>(null);
  const [selectedConfig, setSelectedConfig] = useState<string | null>(null);

  const handleCreateConfig = async (config: Omit<ScheduledExportConfig, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await createConfig(config);
      setShowCreateModal(false);
    } catch (error) {
      console.error('Failed to create scheduled export:', error);
    }
  };

  const handleUpdateConfig = async (id: string, updates: Partial<ScheduledExportConfig>) => {
    try {
      await updateConfig(id, updates);
      setEditingConfig(null);
    } catch (error) {
      console.error('Failed to update scheduled export:', error);
    }
  };

  const handleDeleteConfig = async (id: string) => {
    if (confirm('Are you sure you want to delete this scheduled export?')) {
      try {
        await deleteConfig(id);
      } catch (error) {
        console.error('Failed to delete scheduled export:', error);
      }
    }
  };

  const handleTriggerExport = async (configId: string) => {
    try {
      await triggerExport(configId);
    } catch (error) {
      console.error('Failed to trigger export:', error);
    }
  };

  const renderConfigCard = (config: ScheduledExportConfig) => {
    const stats = getConfigStats(config.id!);
    
    return (
      <div key={config.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="text-lg font-medium text-gray-900">{config.name}</h3>
              <span className={cn(
                "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                config.enabled 
                  ? "bg-green-100 text-green-800" 
                  : "bg-gray-100 text-gray-800"
              )}>
                {config.enabled ? 'Active' : 'Inactive'}
              </span>
            </div>
            {config.description && (
              <p className="text-sm text-gray-500 mb-2">{config.description}</p>
            )}
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span className="flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                {formatSchedule(config.schedule)}
              </span>
              <span className="flex items-center">
                <Mail className="w-4 h-4 mr-1" />
                {formatDeliveryMethod(config.delivery)}
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleTriggerExport(config.id!)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-md"
              title="Run now"
            >
              <Play className="w-4 h-4" />
            </button>
            <button
              onClick={() => setEditingConfig(config)}
              className="p-2 text-gray-600 hover:bg-gray-50 rounded-md"
              title="Edit"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDeleteConfig(config.id!)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-md"
              title="Delete"
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
            <div className="text-lg font-semibold text-green-600">{stats.completedJobs}</div>
            <div className="text-xs text-gray-500">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-red-600">{stats.failedJobs}</div>
            <div className="text-xs text-gray-500">Failed</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-blue-600">
              {stats.averageExecutionTime > 0 
                ? `${Math.round(stats.averageExecutionTime / 1000)}s`
                : '-'
              }
            </div>
            <div className="text-xs text-gray-500">Avg Time</div>
          </div>
        </div>

        {/* Next run and last run */}
        <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t border-gray-100">
          <div>
            {stats.nextScheduledRun && (
              <span className="flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                Next: {formatDateTime(stats.nextScheduledRun)}
              </span>
            )}
          </div>
          <div>
            {stats.lastSuccessfulRun && (
              <span>Last: {formatDateTime(stats.lastSuccessfulRun)}</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderJobRow = (job: ScheduledExportJob) => {
    const config = configs.find(c => c.id === job.configId);
    
    return (
      <tr key={job.id} className="hover:bg-gray-50">
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="text-sm font-medium text-gray-900">
            {config?.name || 'Unknown Config'}
          </div>
          <div className="text-sm text-gray-500">{job.id}</div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <span className={cn(
            "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
            job.status === 'completed' && "bg-green-100 text-green-800",
            job.status === 'failed' && "bg-red-100 text-red-800",
            job.status === 'running' && "bg-blue-100 text-blue-800",
            job.status === 'pending' && "bg-yellow-100 text-yellow-800",
            job.status === 'cancelled' && "bg-gray-100 text-gray-800"
          )}>
            {job.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
            {job.status === 'failed' && <XCircle className="w-3 h-3 mr-1" />}
            {job.status === 'running' && <RotateCcw className="w-3 h-3 mr-1 animate-spin" />}
            {job.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
            {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
          </span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {formatDateTime(job.scheduledAt)}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {job.startedAt ? formatDateTime(job.startedAt) : '-'}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {job.completedAt ? formatDateTime(job.completedAt) : '-'}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {job.result?.recordCount || '-'}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {job.result?.fileSize ? formatFileSize(job.result.fileSize) : '-'}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
          {job.status === 'pending' && (
            <button
              onClick={() => cancelJob(job.id)}
              className="text-red-600 hover:text-red-900"
            >
              Cancel
            </button>
          )}
          {job.result?.success && job.result.filename && (
            <button className="text-blue-600 hover:text-blue-900 ml-2">
              Download
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
          <h2 className="text-2xl font-bold text-gray-900">Scheduled Exports</h2>
          <p className="text-sm text-gray-500 mt-1">
            Automate your data exports with configurable schedules
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Schedule
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('configs')}
            className={cn(
              "py-2 px-1 border-b-2 font-medium text-sm",
              activeTab === 'configs'
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            Configurations ({configs.length})
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
            Job History ({jobs.length})
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'configs' && (
        <div className="space-y-4">
          {configs.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No scheduled exports</h3>
              <p className="text-sm text-gray-500 mb-4">
                Create your first scheduled export to automate data exports
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Schedule
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {configs.map(renderConfigCard)}
            </div>
          )}
        </div>
      )}

      {activeTab === 'jobs' && (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          {jobs.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No export jobs</h3>
              <p className="text-sm text-gray-500">
                Export jobs will appear here once you create scheduled exports
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Configuration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Scheduled
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      File Size
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
      {(showCreateModal || editingConfig) && (
        <ScheduledExportModal
          config={editingConfig}
          onSave={editingConfig 
            ? (updates) => handleUpdateConfig(editingConfig.id!, updates)
            : handleCreateConfig
          }
          onCancel={() => {
            setShowCreateModal(false);
            setEditingConfig(null);
          }}
        />
      )}
    </div>
  );
}

// Modal component for creating/editing scheduled exports
interface ScheduledExportModalProps {
  config?: ScheduledExportConfig | null;
  onSave: (config: any) => void;
  onCancel: () => void;
}

function ScheduledExportModal({ config, onSave, onCancel }: ScheduledExportModalProps) {
  const [formData, setFormData] = useState({
    name: config?.name || '',
    description: config?.description || '',
    entityType: config?.entityType || 'products',
    format: config?.format || 'csv',
    enabled: config?.enabled ?? true,
    schedule: config?.schedule || {
      type: 'daily',
      time: '09:00'
    },
    delivery: config?.delivery || {
      method: 'download',
      notifyOnSuccess: true,
      notifyOnFailure: true
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {config ? 'Edit Scheduled Export' : 'Create Scheduled Export'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name
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
                  Entity Type
                </label>
                <select
                  value={formData.entityType}
                  onChange={(e) => setFormData(prev => ({ ...prev, entityType: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="products">Products</option>
                  <option value="customers">Customers</option>
                  <option value="sales">Sales</option>
                  <option value="categories">Categories</option>
                  <option value="inventory_movements">Inventory Movements</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>

            {/* Schedule */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Schedule</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Frequency
                  </label>
                  <select
                    value={formData.schedule.type}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      schedule: { ...prev.schedule, type: e.target.value as any }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="custom">Custom Interval</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time
                  </label>
                  <input
                    type="time"
                    value={formData.schedule.time || '09:00'}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      schedule: { ...prev.schedule, time: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Delivery */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Delivery</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Delivery Method
                  </label>
                  <select
                    value={formData.delivery.method}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      delivery: { ...prev.delivery, method: e.target.value as any }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="download">Download Link</option>
                    <option value="email">Email</option>
                    <option value="webhook">Webhook</option>
                    <option value="storage">Cloud Storage</option>
                  </select>
                </div>

                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.delivery.notifyOnSuccess}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        delivery: { ...prev.delivery, notifyOnSuccess: e.target.checked }
                      }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Notify on success</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.delivery.notifyOnFailure}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        delivery: { ...prev.delivery, notifyOnFailure: e.target.checked }
                      }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Notify on failure</span>
                  </label>
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
                {config ? 'Update' : 'Create'} Schedule
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Helper functions
function formatSchedule(schedule: ExportSchedule): string {
  switch (schedule.type) {
    case 'daily':
      return `Daily at ${schedule.time || '09:00'}`;
    case 'weekly':
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return `Weekly on ${days[schedule.dayOfWeek || 0]} at ${schedule.time || '09:00'}`;
    case 'monthly':
      return `Monthly on day ${schedule.dayOfMonth || 1} at ${schedule.time || '09:00'}`;
    case 'custom':
      return `Every ${schedule.interval || 60} minutes`;
    default:
      return 'Once';
  }
}

function formatDeliveryMethod(delivery: DeliveryConfig): string {
  switch (delivery.method) {
    case 'email':
      return `Email (${delivery.recipients?.length || 0} recipients)`;
    case 'webhook':
      return 'Webhook';
    case 'storage':
      return 'Cloud Storage';
    default:
      return 'Download';
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

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}