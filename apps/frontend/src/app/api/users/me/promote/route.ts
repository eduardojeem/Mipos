import { NextResponse } from 'next/server'

// SECURITY: this endpoint previously let ANY authenticated user GET/POST it
// to set their own users.role and user_metadata.role to 'ADMIN'. That is a
// blatant privilege escalation — the entire point of role administration is
// that users do not assign roles to themselves. Disabled permanently.
//
// If a SUPER_ADMIN needs to grant ADMIN to a user, that should go through a
// dedicated, gated endpoint (see /api/superadmin/users/...) so it leaves
// audit trail and respects authorization.

function gone() {
  return NextResponse.json(
    {
      error: 'Endpoint deshabilitado por seguridad',
      details:
        'La auto-promoción de roles no está permitida. Solicitá la elevación a un super admin.',
    },
    { status: 410 }
  )
}

export async function POST() {
  return gone()
}

export async function GET() {
  return gone()
}
