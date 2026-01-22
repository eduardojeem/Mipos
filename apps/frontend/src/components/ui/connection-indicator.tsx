/**
 * Connection Status Indicator Component
 * Displays real-time connection status with visual indicators
 */

import React from 'react';
import { useConnectionMonitor, ConnectionState, NetworkQuality, SyncStatus } from '@/lib/sync/connection-monitor';
import { cn } from '@/lib/utils';

const getStatusColor = (status: ConnectionState['status']) => {
  switch (status) {
    case 'connected':
      return 'text-green-500';
    case 'connecting':
      return 'text-yellow-500';
    case 'disconnected':
      return 'text-red-500';
    case 'error':
      return 'text-red-600';
    default:
      return 'text-gray-500';
  }
};

const getQualityColor = (quality: NetworkQuality) => {
  switch (quality) {
    case 'excellent':
      return 'text-green-600';
    case 'good':
      return 'text-green-500';
    case 'fair':
      return 'text-yellow-500';
    case 'poor':
      return 'text-orange-500';
    case 'offline':
      return 'text-red-500';
    default:
      return 'text-gray-500';
  }
};

const getSyncStatusColor = (syncStatus: SyncStatus) => {
  switch (syncStatus) {
    case 'synced':
      return 'text-green-500';
    case 'syncing':
      return 'text-blue-500';
    case 'pending':
      return 'text-yellow-500';
    case 'error':
      return 'text-red-500';
    case 'offline':
      return 'text-gray-500';
    default:
      return 'text-gray-500';
  }
};

const formatLatency = (latency: number) => {
  if (latency < 1000) {
    return `${Math.round(latency)}ms`;
  }
  return `${(latency / 1000).toFixed(1)}s`;
};

const formatBandwidth = (bandwidth: number) => {
  if (bandwidth < 1024) {
    return `${Math.round(bandwidth)} B/s`;
  } else if (bandwidth < 1024 * 1024) {
    return `${(bandwidth / 1024).toFixed(1)} KB/s`;
  } else {
    return `${(bandwidth / (1024 * 1024)).toFixed(1)} MB/s`;
  }
};

interface ConnectionIndicatorProps {
  showDetails?: boolean;
  showMetrics?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function ConnectionIndicator({ 
  showDetails = false, 
  showMetrics = false,
  className,
  size = 'md'
}: ConnectionIndicatorProps) {
  const connectionState = useConnectionMonitor();


  const getStatusIcon = (status: ConnectionState['status']) => {
    switch (status) {
      case 'connected':
        return (
          <div className="relative">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <div className="absolute inset-0 w-2 h-2 bg-green-500 rounded-full animate-ping opacity-75"></div>
          </div>
        );
      case 'connecting':
        return (
          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
        );
      case 'disconnected':
        return (
          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
        );
      case 'error':
        return (
          <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
        );
      default:
        return (
          <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
        );
    }
  };


  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  return (
    <div className={cn('flex items-center space-x-2', sizeClasses[size], className)}>
      {/* Status Indicator */}
      <div className="flex items-center space-x-1">
        {getStatusIcon(connectionState.status)}
        {showDetails && (
          <span className={getStatusColor(connectionState.status)}>
            {connectionState.status}
          </span>
        )}
      </div>

      {/* Network Quality */}
      {showDetails && (
        <div className="flex items-center space-x-1">
          <span className="text-gray-500">•</span>
          <span className={getQualityColor(connectionState.networkQuality)}>
            {connectionState.networkQuality}
          </span>
        </div>
      )}

      {/* Sync Status */}
      {showDetails && (
        <div className="flex items-center space-x-1">
          <span className="text-gray-500">•</span>
          <span className={getSyncStatusColor(connectionState.syncStatus)}>
            {connectionState.isRealtimeActive ? 'realtime' : 
             connectionState.isPollingActive ? 'polling' : 
             connectionState.syncStatus}
          </span>
        </div>
      )}

      {/* Metrics */}
      {showMetrics && connectionState.metrics.lastMeasured > 0 && (
        <div className="flex items-center space-x-2 text-xs text-gray-500">
          <span>•</span>
          <span>{formatLatency(connectionState.metrics.latency)}</span>
          {connectionState.metrics.bandwidth > 0 && (
            <>
              <span>•</span>
              <span>{formatBandwidth(connectionState.metrics.bandwidth)}</span>
            </>
          )}
        </div>
      )}

      {/* Error Message */}
      {connectionState.errorMessage && showDetails && (
        <div className="text-xs text-red-500 max-w-xs truncate">
          {connectionState.errorMessage}
        </div>
      )}
    </div>
  );
}

/**
 * Detailed Connection Status Panel
 */
interface ConnectionStatusPanelProps {
  className?: string;
}

export function ConnectionStatusPanel({ className }: ConnectionStatusPanelProps) {
  const connectionState = useConnectionMonitor();

  const formatTimestamp = (timestamp: number) => {
    if (timestamp === 0) return 'Never';
    return new Date(timestamp).toLocaleTimeString();
  };

  const getQualityBars = (quality: NetworkQuality) => {
    const bars = [];
    const levels = {
      excellent: 4,
      good: 3,
      fair: 2,
      poor: 1,
      offline: 0
    };
    
    const activeLevel = levels[quality];
    
    for (let i = 1; i <= 4; i++) {
      bars.push(
        <div
          key={i}
          className={cn(
            'w-1 h-3 rounded-sm',
            i <= activeLevel ? 'bg-green-500' : 'bg-gray-300'
          )}
        />
      );
    }
    
    return bars;
  };

  return (
    <div className={cn('bg-white rounded-lg shadow-sm border p-4 space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">Connection Status</h3>
        <ConnectionIndicator showDetails size="sm" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Connection Status */}
        <div className="space-y-2">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Status</div>
          <div className={cn('text-sm font-medium', getStatusColor(connectionState.status))}>
            {connectionState.status}
          </div>
        </div>

        {/* Network Quality */}
        <div className="space-y-2">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Quality</div>
          <div className="flex items-center space-x-2">
            <div className="flex space-x-1">
              {getQualityBars(connectionState.networkQuality)}
            </div>
            <span className={cn('text-sm', getQualityColor(connectionState.networkQuality))}>
              {connectionState.networkQuality}
            </span>
          </div>
        </div>

        {/* Sync Method */}
        <div className="space-y-2">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Sync Method</div>
          <div className="text-sm">
            {connectionState.isRealtimeActive ? (
              <span className="text-green-600">Real-time</span>
            ) : connectionState.isPollingActive ? (
              <span className="text-yellow-600">Polling</span>
            ) : (
              <span className="text-gray-500">Offline</span>
            )}
          </div>
        </div>

        {/* Last Connected */}
        <div className="space-y-2">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Last Connected</div>
          <div className="text-sm text-gray-700">
            {formatTimestamp(connectionState.lastConnected)}
          </div>
        </div>
      </div>

      {/* Metrics */}
      {connectionState.metrics.lastMeasured > 0 && (
        <div className="border-t pt-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Metrics</div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Latency:</span>
              <span className="ml-2 font-medium">
                {formatLatency(connectionState.metrics.latency)}
              </span>
            </div>
            {connectionState.metrics.bandwidth > 0 && (
              <div>
                <span className="text-gray-500">Bandwidth:</span>
                <span className="ml-2 font-medium">
                  {formatBandwidth(connectionState.metrics.bandwidth)}
                </span>
              </div>
            )}
            {connectionState.metrics.packetLoss > 0 && (
              <div>
                <span className="text-gray-500">Packet Loss:</span>
                <span className="ml-2 font-medium">
                  {connectionState.metrics.packetLoss.toFixed(1)}%
                </span>
              </div>
            )}
            {connectionState.reconnectAttempts > 0 && (
              <div>
                <span className="text-gray-500">Reconnect Attempts:</span>
                <span className="ml-2 font-medium">
                  {connectionState.reconnectAttempts}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {connectionState.errorMessage && (
        <div className="border-t pt-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Error</div>
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
            {connectionState.errorMessage}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Simple Connection Dot Indicator
 */
interface ConnectionDotProps {
  className?: string;
  size?: number;
}

export function ConnectionDot({ className, size = 8 }: ConnectionDotProps) {
  const { status } = useConnectionMonitor();

  const getColor = () => {
    switch (status) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
        return 'bg-yellow-500';
      case 'disconnected':
        return 'bg-red-500';
      case 'error':
        return 'bg-red-600';
      default:
        return 'bg-gray-500';
    }
  };

  const shouldAnimate = status === 'connecting' || status === 'error';

  return (
    <div
      className={cn(
        'rounded-full',
        getColor(),
        shouldAnimate && 'animate-pulse',
        className
      )}
      style={{ width: size, height: size }}
    />
  );
}