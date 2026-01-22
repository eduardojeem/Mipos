import { createClient } from '@supabase/supabase-js'
import { NextApiRequest, NextApiResponse } from 'next'

// Secure API endpoints for sync monitoring metrics insertion
// Uses service role key for elevated permissions

const getSupabase = () => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    // Return a mock or throw, depending on whether we want to fail hard at runtime
    // For build safety, we throw only when called
    throw new Error('Missing Supabase configuration');
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
};

// Helper function to validate API key
function validateApiKey(req: NextApiRequest): boolean {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '')
  return apiKey === process.env.SYNC_API_KEY
}

// Helper function to validate required fields
function validateRequiredFields(data: any, requiredFields: string[]): { valid: boolean; missing: string[] } {
  const missing = requiredFields.filter(field => !data[field])
  return { valid: missing.length === 0, missing }
}

// POST /api/sync/log-event
// Log a sync event (POS, Mobile, Admin systems)
export async function logSyncEvent(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!validateApiKey(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const { 
      entity_type, 
      entity_id, 
      operation, 
      source_system, 
      target_system,
      branch_id,
      pos_id,
      user_id,
      session_id,
      payload_size,
      latency_ms,
      metadata,
      idempotency_key
    } = req.body

    // Validate required fields
    const validation = validateRequiredFields(req.body, ['entity_type', 'entity_id', 'operation', 'source_system', 'target_system'])
    if (!validation.valid) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        missing: validation.missing 
      })
    }

    // Validate enum values
    const validEntityTypes = ['products', 'inventory', 'sales', 'customers', 'loyalty', 'settings', 'users', 'reports']
    const validOperations = ['CREATE', 'UPDATE', 'DELETE', 'SYNC', 'BATCH_SYNC']
    const validSystems = ['POS', 'MOBILE', 'ADMIN', 'API', 'EXTERNAL']

    if (!validEntityTypes.includes(entity_type)) {
      return res.status(400).json({ error: 'Invalid entity_type' })
    }
    if (!validOperations.includes(operation)) {
      return res.status(400).json({ error: 'Invalid operation' })
    }
    if (!validSystems.includes(source_system) || !validSystems.includes(target_system)) {
      return res.status(400).json({ error: 'Invalid system type' })
    }

    const { data, error } = await getSupabase()
      .rpc('log_sync_event', {
        p_entity_type: entity_type,
        p_entity_id: entity_id,
        p_operation: operation,
        p_source_system: source_system,
        p_target_system: target_system,
        p_branch_id: branch_id,
        p_pos_id: pos_id,
        p_user_id: user_id,
        p_session_id: session_id,
        p_payload_size: payload_size || 0,
        p_latency_ms: latency_ms,
        p_metadata: metadata || {},
        p_idempotency_key: idempotency_key
      })

    if (error) {
      console.error('Error logging sync event:', error)
      return res.status(500).json({ error: 'Failed to log sync event' })
    }

    return res.status(201).json({ 
      success: true, 
      sync_id: data,
      message: 'Sync event logged successfully'
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// POST /api/sync/update-status
// Update sync event status
export async function updateSyncStatus(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!validateApiKey(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const { sync_id, status, error_code, error_message, latency_ms } = req.body

    // Validate required fields
    if (!sync_id || !status) {
      return res.status(400).json({ 
        error: 'Missing required fields: sync_id and status are required' 
      })
    }

    // Validate enum values
    const validStatuses = ['PENDING', 'PROCESSING', 'SUCCESS', 'ERROR', 'TIMEOUT', 'CONFLICT']
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' })
    }

    const { data, error } = await getSupabase()
      .rpc('update_sync_status', {
        p_sync_id: sync_id,
        p_status: status,
        p_error_code: error_code,
        p_error_message: error_message,
        p_latency_ms: latency_ms
      })

    if (error) {
      console.error('Error updating sync status:', error)
      return res.status(500).json({ error: 'Failed to update sync status' })
    }

    return res.status(200).json({ 
      success: true, 
      updated: data,
      message: 'Sync status updated successfully'
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// POST /api/sync/heartbeat
// Record heartbeat from POS/Mobile/Admin systems
export async function recordHeartbeat(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!validateApiKey(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const { 
      branch_id, 
      pos_id, 
      system_type, 
      status, 
      ip_address,
      version,
      device_info,
      pending_count,
      error_count,
      latency_ms,
      network_type,
      battery_level,
      storage_used_mb,
      memory_usage_percent
    } = req.body

    // Validate required fields
    const validation = validateRequiredFields(req.body, ['branch_id', 'system_type'])
    if (!validation.valid) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        missing: validation.missing 
      })
    }

    // Validate enum values
    const validSystemTypes = ['POS', 'MOBILE', 'ADMIN', 'API']
    const validStatuses = ['ONLINE', 'OFFLINE', 'DEGRADED', 'MAINTENANCE']
    const validNetworkTypes = ['WIFI', 'ETHERNET', 'MOBILE_DATA', 'UNKNOWN', null]

    if (!validSystemTypes.includes(system_type)) {
      return res.status(400).json({ error: 'Invalid system_type' })
    }
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' })
    }
    if (network_type && !validNetworkTypes.includes(network_type)) {
      return res.status(400).json({ error: 'Invalid network_type' })
    }

    const { data, error } = await getSupabase()
      .rpc('record_heartbeat', {
        p_branch_id: branch_id,
        p_pos_id: pos_id,
        p_system_type: system_type,
        p_status: status || 'ONLINE',
        p_ip_address: ip_address,
        p_version: version,
        p_device_info: device_info || {},
        p_pending_count: pending_count || 0,
        p_error_count: error_count || 0,
        p_latency_ms: latency_ms,
        p_network_type: network_type,
        p_battery_level: battery_level,
        p_storage_used_mb: storage_used_mb,
        p_memory_usage_percent: memory_usage_percent
      })

    if (error) {
      console.error('Error recording heartbeat:', error)
      return res.status(500).json({ error: 'Failed to record heartbeat' })
    }

    return res.status(200).json({ 
      success: true, 
      heartbeat_id: data,
      message: 'Heartbeat recorded successfully'
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// GET /api/sync/dashboard-summary
// Get dashboard summary data
export async function getDashboardSummary(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // This endpoint doesn't require API key as it's for authenticated users
  // You might want to add JWT validation here

  try {
    const { branch_id, hours_back = 24 } = req.query

    const { data, error } = await getSupabase()
      .rpc('dashboard_sync_summary', {
        p_branch_id: branch_id as string,
        p_hours_back: parseInt(hours_back as string) || 24
      })

    if (error) {
      console.error('Error getting dashboard summary:', error)
      return res.status(500).json({ error: 'Failed to get dashboard summary' })
    }

    return res.status(200).json({ 
      success: true, 
      data: data,
      message: 'Dashboard summary retrieved successfully'
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// POST /api/sync/retry-failed
// Retry failed sync operations
export async function retryFailedSyncs(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!validateApiKey(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const { branch_id, max_retries = 3 } = req.body

    const { data, error } = await getSupabase()
      .rpc('retry_failed_syncs', {
        p_branch_id: branch_id,
        p_max_retries: max_retries
      })

    if (error) {
      console.error('Error retrying failed syncs:', error)
      return res.status(500).json({ error: 'Failed to retry failed syncs' })
    }

    return res.status(200).json({ 
      success: true, 
      retried_syncs: data || [],
      count: (data || []).length,
      message: 'Failed syncs retried successfully'
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// Export handler for Next.js API routes
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { pathname } = new URL(req.url || '', `http://${req.headers.host}`)
  
  try {
    if (pathname.includes('/log-event')) {
      return await logSyncEvent(req, res)
    } else if (pathname.includes('/update-status')) {
      return await updateSyncStatus(req, res)
    } else if (pathname.includes('/heartbeat')) {
      return await recordHeartbeat(req, res)
    } else if (pathname.includes('/dashboard-summary')) {
      return await getDashboardSummary(req, res)
    } else if (pathname.includes('/retry-failed')) {
      return await retryFailedSyncs(req, res)
    } else {
      return res.status(404).json({ error: 'Endpoint not found' })
    }
  } catch (error) {
    console.error('API handler error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}