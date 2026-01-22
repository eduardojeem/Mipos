import { NextResponse } from 'next/server'
import { supabaseUtils } from '@/lib/supabase-utils'
import { isSupabaseActive } from '@/lib/env'

export async function GET() {
  const configured = isSupabaseActive()
  let connected = false
  let error: { message: string } | null = null

  if (configured) {
    const result = await supabaseUtils.testConnection()
    connected = result.connected
    if (result.error && (result.error as any)?.message) {
      error = { message: (result.error as any).message }
    }
  }

  const statusCode = configured ? (connected ? 200 : 502) : 200

  return NextResponse.json(
    {
      configured,
      connected,
      error,
      timestamp: new Date().toISOString(),
    },
    { status: statusCode }
  )
}
