#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Cargar env: prioridad .env.local
const envCandidates = ['.env.local', 'apps/frontend/.env.local', '.env']
for (const p of envCandidates) {
  try {
    dotenv.config({ path: p })
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) break
  } catch {}
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

function getArg(name: string): string | undefined {
  const a = process.argv.find(arg => arg.startsWith(`--${name}=`))
  return a ? a.split('=')[1] : undefined
}

async function main() {
  const email = getArg('email') || 'jeem101595@gmail.com'
  const overrideFullName = getArg('fullName')
  const avatarUrl = getArg('avatarUrl')
  const applyUsersArg = getArg('applyUsers')
  const applyUsers = ['true', '1', 'yes', 'si'].includes((applyUsersArg || '').toLowerCase())

  console.log(`🔄 Sincronizando metadatos de Auth para: ${email}`)

  // Obtener usuario de Auth por email
  const { data: usersData, error: listErr } = await supabase.auth.admin.listUsers()
  if (listErr) {
    console.error('❌ Error listando usuarios:', listErr.message)
    process.exit(1)
  }
  const user = usersData.users.find(u => u.email === email)
  if (!user) {
    console.error(`❌ Usuario no encontrado en Auth: ${email}`)
    process.exit(1)
  }

  // Intentar tomar fullName de tabla local `users`
  let fullNameToSet = overrideFullName
  if (!fullNameToSet) {
    let rowFullName: string | undefined
    // Intento 1: snake_case 'full_name'
    const { data: rowsSnake, error: usersErrSnake } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', user.id)
      .limit(1)
    if (usersErrSnake) {
      console.warn('⚠️ No se pudo leer users.full_name:', usersErrSnake.message)
    } else {
      rowFullName = (rowsSnake as any)?.[0]?.full_name
    }
    // Intento 2: camelCase 'fullName' si snake_case no existe/está vacío
    if (!rowFullName) {
      const { data: rowsCamel, error: usersErrCamel } = await supabase
        .from('users')
        .select('fullName')
        .eq('id', user.id)
        .limit(1)
      if (usersErrCamel) {
        console.warn('⚠️ No se pudo leer users.fullName:', usersErrCamel.message)
      } else {
        rowFullName = (rowsCamel as any)?.[0]?.fullName
      }
    }
    fullNameToSet = rowFullName || (user as any).user_metadata?.full_name || 'Admin User'
  }

  const newMetadata: Record<string, any> = {
    ...user.user_metadata,
    full_name: fullNameToSet,
    ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
    profile_synced_at: new Date().toISOString(),
    profile_synced_by: 'metadata-sync-script'
  }

  const { error: updateErr } = await supabase.auth.admin.updateUserById(user.id, {
    user_metadata: newMetadata
  })
  if (updateErr) {
    console.error('❌ Error actualizando metadatos:', updateErr.message)
    process.exit(1)
  }

  if (applyUsers) {
    const { error: updUsersErr } = await supabase
      .from('users')
      .update({ full_name: fullNameToSet })
      .eq('id', user.id)
    if (updUsersErr) {
      console.warn('⚠️ No se pudo actualizar users.full_name:', updUsersErr.message)
    } else {
      console.log('✅ users.full_name actualizado a:', fullNameToSet)
    }
  }

  // Verificación
  const { data: verifyUsers, error: verifyErr } = await supabase.auth.admin.listUsers()
  if (verifyErr) {
    console.error('⚠️ No se pudo verificar:', verifyErr.message)
  } else {
    const updated = verifyUsers.users.find(u => u.id === user.id)
    console.log('✅ Metadatos actualizados:')
    console.log(`   🆔 ID: ${updated?.id}`)
    console.log(`   👤 full_name: ${updated?.user_metadata?.full_name}`)
    if (updated?.user_metadata?.avatar_url) {
      console.log(`   🖼️ avatar_url: ${updated?.user_metadata?.avatar_url}`)
    }
    console.log(`   🕒 profile_synced_at: ${updated?.user_metadata?.profile_synced_at}`)
  }
}

main().catch(err => {
  console.error('❌ Error fatal:', err?.message || err)
  process.exit(1)
})