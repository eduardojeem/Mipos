import { NextRequest, NextResponse } from 'next/server'
import {
  listUserSessions,
  resolveSessionKey,
  syncCurrentSession,
  terminateOtherUserSessions,
  terminateOwnSession,
  type CurrentSessionContext,
} from '@/app/api/admin/_services/sessions'
import { createClient } from '@/lib/supabase/server'

interface ProfileSession {
  id: string
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown'
  browser: string
  os: string
  location: string
  ipAddress: string
  lastActivity: string
  isCurrent: boolean
  createdAt: string
}

function buildCurrentSessionContext(
  request: NextRequest,
  userId: string,
  sessionKey?: string | null
): CurrentSessionContext {
  return {
    userId,
    userAgent: request.headers.get('user-agent') || '',
    ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '',
    sessionKey,
  }
}

function mapProfileSession(session: Awaited<ReturnType<typeof listUserSessions>>['items'][number]): ProfileSession {
  return {
    id: session.id,
    deviceType: session.deviceType,
    browser: session.browser,
    os: session.os,
    location: '',
    ipAddress: session.ipAddress,
    lastActivity: session.lastActivityAt,
    isCurrent: session.isCurrent,
    createdAt: session.createdAt,
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
    }

    const { data: { session } } = await supabase.auth.getSession()
    const sessionKey = resolveSessionKey(session?.access_token, session?.refresh_token)
    const currentSession = buildCurrentSessionContext(
      request,
      user.id,
      sessionKey
    )
    await syncCurrentSession({
      userId: user.id,
      accessToken: session?.access_token,
      refreshToken: session?.refresh_token,
      expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
      ipAddress: currentSession.ipAddress,
      userAgent: currentSession.userAgent,
    })
    const result = await listUserSessions(user.id, currentSession)

    return NextResponse.json({
      success: true,
      data: result.items.map(mapProfileSession),
      summary: result.summary,
    })
  } catch (error) {
    console.error('Error fetching user sessions:', error)
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { sessionId, terminateAll } = body as { sessionId?: string; terminateAll?: boolean }
    const { data: { session } } = await supabase.auth.getSession()
    const currentSession = buildCurrentSessionContext(
      request,
      user.id,
      resolveSessionKey(session?.access_token, session?.refresh_token)
    )

    if (terminateAll) {
      const result = await terminateOtherUserSessions(user.id, currentSession)
      if (!result.ok) {
        return NextResponse.json({ success: false, error: result.error }, { status: result.status })
      }

      return NextResponse.json({
        success: true,
        message: result.affected === 1
          ? 'Se cerro 1 sesion adicional.'
          : `Se cerraron ${result.affected} sesiones adicionales.`,
      })
    }

    if (sessionId) {
      const result = await terminateOwnSession(sessionId, user.id, currentSession)
      if (!result.ok) {
        return NextResponse.json({ success: false, error: result.error }, { status: result.status })
      }

      return NextResponse.json({
        success: true,
        message: 'Sesion terminada exitosamente',
      })
    }

    return NextResponse.json({
      success: false,
      error: 'ID de sesion requerido o especifica terminateAll',
    }, { status: 400 })
  } catch (error) {
    console.error('Error terminating user sessions:', error)
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
    }, { status: 500 })
  }
}
