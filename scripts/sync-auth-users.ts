
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: 'apps/frontend/.env' });
dotenv.config({ path: 'apps/frontend/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function syncUsers() {
  console.log('Fetching auth users...');
  const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();
  
  if (authError) {
    console.error('Error fetching auth users:', authError);
    return;
  }

  console.log(`Found ${authUsers.length} auth users.`);

  // Get Super Admin Role ID
  const { data: roles } = await supabase.from('roles').select('id, name').eq('name', 'SUPER_ADMIN').single();
  const superAdminRoleId = roles?.id;

  if (!superAdminRoleId) {
      console.error('SUPER_ADMIN role not found in database!');
      return;
  }

  for (const user of authUsers) {
    if (!user.email) continue;
    
    console.log(`Processing ${user.email} (${user.id})...`);

    // Check if exists in public.users
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (!existingUser) {
      console.log(`Creating public profile for ${user.email} as SUPER_ADMIN...`);
      
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.email.split('@')[0],
          role: 'SUPER_ADMIN' // Enum cast handled by Supabase client usually
        });
        
      if (insertError) {
        console.error(`Error creating profile for ${user.email}:`, insertError);
      } else {
        console.log(`Created profile for ${user.email}`);
      }
    } else {
        console.log(`Profile exists for ${user.email}. Updating role to SUPER_ADMIN...`);
        const { error: updateError } = await supabase
            .from('users')
            .update({ role: 'SUPER_ADMIN' })
            .eq('id', user.id);
            
        if (updateError) {
            console.error(`Error updating role for ${user.email}:`, updateError);
        }
    }

    // Ensure entry in user_roles
    const { data: userRole } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id)
        .eq('role_id', superAdminRoleId)
        .single();

    if (!userRole) {
        console.log(`Assigning SUPER_ADMIN role in user_roles for ${user.email}...`);
        const { error: roleInsertError } = await supabase
            .from('user_roles')
            .insert({
                user_id: user.id,
                role_id: superAdminRoleId
            });
            
        if (roleInsertError) {
            console.error(`Error assigning role for ${user.email}:`, roleInsertError);
        }
    }
  }
  
  console.log('Sync complete.');
}

syncUsers();
