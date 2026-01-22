#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Cargar variables de entorno desde .env.local, con fallback
const envCandidates = ['.env.local', 'apps/frontend/.env.local', '.env']
for (const p of envCandidates) {
  try {
    dotenv.config({ path: p })
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      break
    }
  } catch {}
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: Variables de entorno de Supabase no configuradas (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

function parseArgs() {
  const args = process.argv.slice(2)
  const email = args.find(a => a.startsWith('--email='))?.split('=')[1]
  if (!email) {
    console.error('❌ Falta argumento --email=')
    console.error('   Ejemplo: npx tsx scripts/ensure-super-admin-user-role.ts --email=jeem101595@gmail.com')
    process.exit(1)
  }
  return { email }
}

async function findUserByEmail(email: string) {
  let page = 1
  const perPage = 200
  while (page <= 10) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) throw new Error(error.message)
    const found = data?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())
    if (found) return found
    if (!data || data.users.length < perPage) break
    page++
  }
  return null
}

async function ensureSuperAdminRole() {
  const { data: roles, error } = await supabase
    .from('roles')
    .select('id, name, is_active')
    .eq('name', 'SUPER_ADMIN')
    .limit(1)

  if (error) throw new Error(`Error consultando roles: ${error.message}`)

  const existing = roles?.[0]
  if (existing && (existing as any).is_active !== false) {
    console.log(`✅ Rol SUPER_ADMIN existente (id: ${existing.id})`)
    return existing.id as string
  }

  if (existing) {
    const { data: updated, error: upErr } = await supabase
      .from('roles')
      .update({ is_active: true })
      .eq('id', existing.id)
      .select('id')
      .limit(1)

    if (upErr) throw new Error(`Error reactivando rol SUPER_ADMIN: ${upErr.message}`)
    const updatedRow = updated?.[0]
    console.log(`✅ Rol SUPER_ADMIN reactivado (id: ${updatedRow.id})`)
    return updatedRow.id as string
  }

  // Insertar rol si no existe
  const { data: inserted, error: insErr } = await supabase
    .from('roles')
    .insert([{ 
      name: 'SUPER_ADMIN', 
      description: 'Acceso completo al sistema con todos los permisos' 
    }])
    .select('id')
    .limit(1)

  if (insErr) throw new Error(`Error creando rol SUPER_ADMIN: ${insErr.message}`)
  const insertedRow = inserted?.[0]
  console.log(`✅ Rol SUPER_ADMIN creado (id: ${insertedRow.id})`)
  return insertedRow.id as string
}

async function upsertUserRole(userId: string, roleId: string) {
  const { data: existing, error: selErr } = await supabase
    .from('user_roles')
    .select('id, is_active')
    .eq('user_id', userId)
    .eq('role_id', roleId)
    .limit(1)

  if (selErr) throw new Error(`Error verificando user_roles: ${selErr.message}`)

  const row = existing?.[0]
  if (row) {
    if (row.is_active) {
      console.log('ℹ️  user_roles ya está activo para SUPER_ADMIN')
      return row.id as string
    }
    const { data: upd, error: updErr } = await supabase
      .from('user_roles')
      .update({ is_active: true, assigned_at: new Date().toISOString() })
      .eq('id', row.id)
      .select('id')
      .limit(1)
    if (updErr) throw new Error(`Error reactivando user_roles: ${updErr.message}`)
    console.log('✅ user_roles reactivado para SUPER_ADMIN')
    return upd?.[0]?.id as string
  }

  const { data: ins, error: insErr } = await supabase
    .from('user_roles')
    .insert([{ 
      user_id: userId, 
      role_id: roleId, 
      is_active: true, 
      assigned_at: new Date().toISOString(), 
      assigned_by: userId 
    }])
    .select('id')
    .limit(1)

  if (insErr) throw new Error(`Error insertando user_roles: ${insErr.message}`)
  console.log('✅ user_roles creado para SUPER_ADMIN')
  return ins?.[0]?.id as string
}

async function verifyAssignment(userId: string, roleId: string) {
  const { data: roles, error: roleErr } = await supabase
    .from('roles')
    .select('id, name')
    .eq('id', roleId)
    .limit(1)

  if (roleErr) throw new Error(`Error consultando rol verificación: ${roleErr.message}`)
  const r = roles?.[0]

  const { data: ur, error: urErr } = await supabase
    .from('user_roles')
    .select('id, is_active, assigned_at, assigned_by')
    .eq('user_id', userId)
    .eq('role_id', roleId)
    .limit(1)

  if (urErr) throw new Error(`Error verificando user_roles: ${urErr.message}`)
  const row = ur?.[0]

  if (row?.is_active || row?.is_active === undefined) {
    console.log(`🎉 Verificación OK: usuario tiene rol activo ${r?.name}`)
    return true
  }
  throw new Error('Verificación fallida: user_roles no activo')
}

async function main() {
  const { email } = parseArgs()
  console.log(`🔧 Alineando user_roles SUPER_ADMIN para: ${email}`)

  const user = await findUserByEmail(email)
  if (!user) {
    console.error(`❌ Usuario no encontrado en Supabase Auth: ${email}`)
    process.exit(1)
  }
  console.log(`✅ Usuario encontrado: ${user.email} (id: ${user.id})`)

  const roleId = await ensureSuperAdminRole()
  await upsertUserRole(user.id, roleId)
  await verifyAssignment(user.id, roleId)

  console.log('✔️ Proceso completado')
}

if (require.main === module) {
  main().catch(err => {
    console.error('❌ Error:', err.message || err)
    process.exit(1)
  })
}