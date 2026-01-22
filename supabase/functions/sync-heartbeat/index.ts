import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Environment variables
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SYNC_API_KEY = Deno.env.get('SYNC_API_KEY')!

// Validate API key
function validateApiKey(request: Request): boolean {
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '')
  return apiKey === SYNC_API_KEY
}

// Handle CORS preflight requests
function handleCors(request: Request): Response {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  return new Response(null, { status: 204 })
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Validate API key
    if (!validateApiKey(req)) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const body = await req.json()

    const { 
      branch_id, 
      pos_id, 
      system_type, 
      status = 'ONLINE', 
      ip_address,
      version,
      device_info = {},
      pending_count = 0,
      error_count = 0,
      latency_ms,
      network_type,
      battery_level,
      storage_used_mb,
      memory_usage_percent
    } = body

    // Validate required fields
    if (!branch_id || !system_type) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields', 
          missing: ['branch_id', 'system_type'].filter(field => !body[field])
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate enum values
    const validSystemTypes = ['POS', 'MOBILE', 'ADMIN', 'API']
    const validStatuses = ['ONLINE', 'OFFLINE', 'DEGRADED', 'MAINTENANCE']
    const validNetworkTypes = ['WIFI', 'ETHERNET', 'MOBILE_DATA', 'UNKNOWN']

    if (!validSystemTypes.includes(system_type)) {
      return new Response(
        JSON.stringify({ error: 'Invalid system_type' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (status && !validStatuses.includes(status)) {
      return new Response(
        JSON.stringify({ error: 'Invalid status' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (network_type && !validNetworkTypes.includes(network_type)) {
      return new Response(
        JSON.stringify({ error: 'Invalid network_type' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Call the record_heartbeat function
    const { data: heartbeat_id, error } = await supabase
      .rpc('record_heartbeat', {
        p_branch_id: branch_id,
        p_pos_id: pos_id,
        p_system_type: system_type,
        p_status: status,
        p_ip_address: ip_address,
        p_version: version,
        p_device_info: device_info,
        p_pending_count: pending_count,
        p_error_count: error_count,
        p_latency_ms: latency_ms,
        p_network_type: network_type,
        p_battery_level: battery_level,
        p_storage_used_mb: storage_used_mb,
        p_memory_usage_percent: memory_usage_percent
      })

    if (error) {
      console.error('Error recording heartbeat:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to record heartbeat' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get current system status for response
    const { data: systemHealth, error: healthError } = await supabase
      .rpc('get_system_health_summary')
      .eq('branch_id', branch_id)
      .eq('pos_id', pos_id)
      .eq('system_type', system_type)
      .single()

    if (healthError) {
      console.error('Error getting system health:', healthError)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        heartbeat_id: heartbeat_id,
        system_status: systemHealth || null,
        message: 'Heartbeat recorded successfully',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Unexpected error in heartbeat function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

// Deno deploy configuration
export const config = {
  path: '/sync-heartbeat',
}