#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno de Supabase (URL o SERVICE ROLE KEY)')
  process.exit(1)
}

async function main() {
  const args = process.argv.slice(2)
  if (args.length < 3) {
    console.log('\nUso: npm run create-auth-only <email> <password> <fullName> [role]\n')
    process.exit(1)
  }

  const [email, password, fullName, role = 'ADMIN'] = args

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  console.log('🚀 Creando usuario en Supabase Auth...')
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role }
  })

  if (error) {
    if (error.message.includes('already been registered') || error.message.includes('already exists')) {
      console.log('⚠️  Usuario ya registrado, intentando actualizar contraseña...')
      const { data: users, error: listErr } = await supabase.auth.admin.listUsers()
      if (listErr) {
        console.error('❌ Error listando usuarios:', listErr.message)
        process.exit(1)
      }
      const existing = users.users.find(u => u.email === email)
      if (!existing) {
        console.error('❌ Usuario existente no encontrado por email')
        process.exit(1)
      }
      const { error: updErr } = await supabase.auth.admin.updateUserById(existing.id, {
        password,
        user_metadata: { full_name: fullName, role }
      })
      if (updErr) {
        console.error('❌ Error actualizando usuario:', updErr.message)
        process.exit(1)
      }
      console.log('✅ Contraseña actualizada para usuario existente')
      console.log('🆔 User ID:', existing.id)
      console.log('📧 Email:', existing.email)
      console.log('👤 Nombre:', fullName)
      console.log('🔑 Password:', password)
      console.log('🧩 Role:', role)
      return
    }
    console.error('❌ Error creando usuario en Supabase Auth:', error.message)
    process.exit(1)
  }

  console.log('✅ Usuario creado en Supabase Auth')
  console.log('🆔 User ID:', data.user?.id)
  console.log('📧 Email:', data.user?.email)
  console.log('👤 Nombre:', fullName)
  console.log('🔑 Password:', password)
  console.log('🧩 Role:', role)
}

main()