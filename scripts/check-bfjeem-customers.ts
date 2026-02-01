
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

async function main() {
  console.log(`🚀 Checking customers for ${TARGET_EMAIL}...`);

  // 1. Get User
  const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
  if (userError) throw userError;
  
  const user = users.find(u => u.email?.toLowerCase() === TARGET_EMAIL.toLowerCase());

  if (!user) {
    console.error(`❌ User ${TARGET_EMAIL} not found.`);
    process.exit(1);
  }
  console.log(`✅ User found: ${user.id}`);

  // 2. Get Organization
  let orgId = user.user_metadata?.organization_id;
  
  if (!orgId) {
    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();
    
    if (member) orgId = member.organization_id;
  }

  if (!orgId) {
    console.error(`❌ User has no organization linked.`);
    process.exit(1);
  }
  console.log(`✅ Organization found: ${orgId}`);

  // 3. Get Customers
  const { data: customers, error: custError, count } = await supabase
    .from('customers')
    .select('*', { count: 'exact' })
    .eq('organization_id', orgId);

  if (custError) {
    console.error('❌ Error fetching customers:', custError.message);
    process.exit(1);
  }

  console.log(`\n📊 Total customers found: ${count}`);
  
  if (customers && customers.length > 0) {
    console.log('\nCustomer List:');
    customers.forEach((c, index) => {
      console.log(`${index + 1}. ${c.name} (${c.email || 'No email'}) - ID: ${c.id}`);
    });
  } else {
    console.log('⚠️ No customers found for this organization.');
  }
}

main().catch(console.error);
