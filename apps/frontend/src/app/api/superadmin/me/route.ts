import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { assertSuperAdmin } from '@/app/api/_utils/auth'

export async function GET(request: NextRequest) {
  const auth = await assertSuperAdmin(request);
  
  // Si no es super admin, devolvemos isSuperAdmin: false en lugar de 403
  // para que el cliente pueda manejarlo sin error HTTP si lo prefiere,
  // aunque el Guard maneja ambos casos.
  // Sin embargo, para consistencia con otros endpoints, y dado que el Guard
  // maneja el error 403 correctamente (r.ok es false), podemos usar el comportamiento estándar.
  // Pero el endpoint "me" suele ser especial.
  
  // Si assertSuperAdmin falla, devolvemos 403 como los demás endpoints
  if (!('ok' in auth) || auth.ok === false) {
      return NextResponse.json(auth.body, { status: auth.status });
  }

  // Si pasa, es super admin
  return NextResponse.json({ 
    success: true, 
    isSuperAdmin: true, 
    role: 'SUPER_ADMIN',
    source: 'assertSuperAdmin' 
  })
}
