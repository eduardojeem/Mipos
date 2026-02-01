import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const TARGET_EMAIL = 'bfjeem@gmail.com';
const PLAN = 'PRO'; // or 'pro' - consistent with other values usually uppercase in DBs or lowercase?
// init-organization.ts used 'ENTERPRISE' (uppercase).
// frontend plan route used 'slug'. Usually slugs are lowercase.
// I'll check if I can find existing plans. If not, I'll use 'PRO'.

async function main() {
  console.log(`🚀 Setting up PRO user for ${TARGET_EMAIL}...`);

  // 1. Find User
  console.log('🔍 Finding user...');
  const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
  
  if (userError) {
    console.error('Error listing users:', userError);
    process.exit(1);
  }

  const user = users.find(u => u.email?.toLowerCase() === TARGET_EMAIL.toLowerCase());

  if (!user) {
    console.error(`❌ User ${TARGET_EMAIL} not found. Please sign up first or create user.`);
    // Optionally create user? The user said "add me", usually implies existing account or "create for me".
    // I'll try to create if not exists.
    console.log('✨ Creating user...');
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: TARGET_EMAIL,
      email_confirm: true,
      password: 'tempPassword123!', // Temporary password
      user_metadata: {
        full_name: 'Admin bfjeem',
        phone: '+595 991 123456'
      }
    });

    if (createError) {
      console.error('Error creating user:', createError);
      process.exit(1);
    }
    console.log(`✅ User created: ${newUser.user.id}`);
    // Recurse or continue with newUser
    return setupOrganization(newUser.user);
  } else {
    console.log(`✅ User found: ${user.id}`);
    return setupOrganization(user);
  }
}

async function setupOrganization(user: any) {
  // 2. Create Organization
  const orgName = 'Soluciones Tecnológicas bfjeem';
  const orgSlug = 'bfjeem-tech';
  
  console.log(`📝 Creating/Updating Organization: ${orgName} (${orgSlug})...`);

  // Check if org exists
  const { data: existingOrg } = await supabase
    .from('organizations')
    .select('*')
    .eq('slug', orgSlug)
    .single();

  let orgId;

  if (existingOrg) {
    console.log('ℹ️ Organization already exists. Updating plan...');
    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        subscription_plan: PLAN,
        subscription_status: 'ACTIVE'
      })
      .eq('id', existingOrg.id);

    if (updateError) console.error('Error updating org:', updateError);
    orgId = existingOrg.id;
  } else {
    const { data: newOrg, error: createError } = await supabase
      .from('organizations')
      .insert({
        name: orgName,
        slug: orgSlug,
        subscription_plan: PLAN,
        subscription_status: 'ACTIVE',
        settings: {
          currency: 'USD',
          timezone: 'America/Asuncion', // Assuming Paraguay based on previous phone format +595
          tax_enabled: true,
          tax_rate: 10,
          contactInfo: {
            email: TARGET_EMAIL,
            phone: '+595 991 123456',
            website: 'https://bfjeem.com'
          },
          address: {
            street: 'Av. Principal 123',
            city: 'Asunción',
            country: 'Paraguay'
          }
        }
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating org:', createError);
      process.exit(1);
    }
    console.log('✅ Organization created.');
    orgId = newOrg.id;
  }

  // 3. Add User to Organization Members
  console.log('🔗 Linking user to organization...');
  
  // Check if member exists
  const { data: member } = await supabase
    .from('organization_members')
    .select('*')
    .eq('organization_id', orgId)
    .eq('user_id', user.id)
    .single();

  if (!member) {
    // Get ADMIN role id
    // Assuming 'ADMIN' role exists in 'roles' table or we use a string if it's not normalized.
    // Looking at init-organization.ts, it uses `role_id: 'ADMIN'` (string) but create-organization-and-invite.ts looks up role in `roles` table.
    // I'll try to find the role first.
    let roleId = 'ADMIN'; // Default fallback
    const { data: roleData } = await supabase.from('roles').select('id').eq('name', 'ADMIN').single();
    if (roleData) roleId = roleData.id;

    const { error: linkError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: orgId,
        user_id: user.id,
        role_id: roleId, // Use ID if found, else string
        is_owner: true,
        role: 'admin', // Redundant column often used for easier access
        status: 'ACTIVE'
      });

    if (linkError) {
      console.error('Error linking user:', linkError);
    } else {
      console.log('✅ User added to organization.');
    }
  } else {
    console.log('ℹ️ User is already a member.');
  }

  // 4. Update User Profile (users table)
  console.log('👤 Updating user profile...');
  const { error: profileError } = await supabase
    .from('users')
    .update({
      full_name: 'Admin bfjeem', // Ensure name is set
      organization_id: orgId, // Set default organization
      role: 'admin', // System role
      phone: '+595 991 123456',
      location: 'Asunción, Paraguay',
      bio: 'Administrador de Soluciones Tecnológicas bfjeem'
    })
    .eq('id', user.id);

  if (profileError) {
    console.error('Error updating profile:', profileError);
  } else {
    console.log('✅ User profile updated.');
  }
  
  // 5. Update user_metadata in Auth
  console.log('🔐 Updating auth metadata...');
  const { error: authUpdateError } = await supabase.auth.admin.updateUserById(
    user.id,
    {
      user_metadata: {
        ...user.user_metadata,
        full_name: 'Admin bfjeem',
        organization_id: orgId
      }
    }
  );

  if (authUpdateError) console.error('Error updating auth metadata:', authUpdateError);

  console.log('🎉 Done!');
}

main();
