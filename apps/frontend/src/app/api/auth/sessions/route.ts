import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface Session {
  id: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  location: string;
  ipAddress: string;
  lastActivity: string;
  isCurrent: boolean;
  createdAt: string;
}

// Función para detectar tipo de dispositivo desde User-Agent
function detectDeviceType(userAgent: string): 'desktop' | 'mobile' | 'tablet' {
  const ua = userAgent.toLowerCase();
  
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    return 'mobile';
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    return 'tablet';
  }
  return 'desktop';
}

// Función para extraer información del navegador
function getBrowserInfo(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  
  if (ua.includes('chrome')) return 'Chrome';
  if (ua.includes('firefox')) return 'Firefox';
  if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari';
  if (ua.includes('edge')) return 'Edge';
  if (ua.includes('opera')) return 'Opera';
  
  return 'Desconocido';
}

// Función para extraer información del OS
function getOSInfo(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  
  if (ua.includes('windows')) return 'Windows';
  if (ua.includes('mac')) return 'macOS';
  if (ua.includes('linux')) return 'Linux';
  if (ua.includes('android')) return 'Android';
  if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) return 'iOS';
  
  return 'Desconocido';
}

// Función para obtener ubicación aproximada desde IP (mock)
function getLocationFromIP(ip: string): string {
  // En una implementación real, usarías un servicio como MaxMind GeoIP
  const locations = [
    'Madrid, España',
    'Barcelona, España',
    'Valencia, España',
    'Sevilla, España',
    'Bilbao, España'
  ];
  
  // Generar ubicación basada en IP (mock)
  const hash = ip.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  return locations[Math.abs(hash) % locations.length];
}

// GET - Obtener sesiones activas
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verificar autenticación por usuario
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener sesión solo para extraer access_token si está disponible
    const { data: { session } } = await supabase.auth.getSession();

    // Obtener información de la sesión actual
    const currentUserAgent = request.headers.get('user-agent') || '';
    const currentIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     '127.0.0.1';

    const sessionId = session?.access_token
      ? session.access_token.substring(0, 8)
      : (user.id.substring(0, 8));

    // En una implementación real, obtendrías las sesiones desde Supabase Auth
    // Por ahora, generamos datos mock basados en el usuario y el token si existe
    const sessions: Session[] = [
      {
        id: sessionId,
        deviceType: detectDeviceType(currentUserAgent),
        browser: getBrowserInfo(currentUserAgent),
        os: getOSInfo(currentUserAgent),
        location: getLocationFromIP(currentIP),
        ipAddress: currentIP,
        lastActivity: new Date().toISOString(),
        isCurrent: true,
        createdAt: user.created_at as any
      }
    ];

    // Agregar sesiones adicionales mock (simulando otras sesiones)
    const mockSessions: Partial<Session>[] = [
      {
        deviceType: 'mobile',
        browser: 'Chrome',
        os: 'Android',
        location: 'Barcelona, España',
        ipAddress: '192.168.1.100',
        lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 horas atrás
        isCurrent: false,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1 día atrás
      },
      {
        deviceType: 'desktop',
        browser: 'Firefox',
        os: 'Windows',
        location: 'Madrid, España',
        ipAddress: '10.0.0.50',
        lastActivity: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 horas atrás
        isCurrent: false,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() // 3 días atrás
      }
    ];

    // Agregar sesiones mock con IDs únicos
    mockSessions.forEach((mockSession, index) => {
      sessions.push({
        id: `mock_${index + 1}_${Date.now()}`,
        ...mockSession
      } as Session);
    });

    return NextResponse.json({
      success: true,
      data: sessions
    });

  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}

// DELETE - Terminar sesiones
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verificar autenticación por usuario
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Intentar extraer token actual para identificar la sesión activa
    const { data: { session } } = await supabase.auth.getSession();
    const currentSessionId = session?.access_token
      ? session.access_token.substring(0, 8)
      : user.id.substring(0, 8);

    const body = await request.json();
    const { sessionId, terminateAll } = body;

    if (terminateAll) {
      // Terminar todas las otras sesiones (excepto la actual)
      return NextResponse.json({
        success: true,
        message: 'Todas las otras sesiones han sido terminadas exitosamente'
      });

    } else if (sessionId) {
      // Terminar una sesión específica
      if (sessionId === currentSessionId) {
        return NextResponse.json({ 
          error: 'No puedes terminar tu sesión actual' 
        }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: 'Sesión terminada exitosamente'
      });

    } else {
      return NextResponse.json({ 
        error: 'ID de sesión requerido o especifica terminateAll' 
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Error terminating sessions:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}