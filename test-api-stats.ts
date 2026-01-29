
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  try {
    console.log('1. Organizations count...');
    const { count: totalOrgs, error: orgsError } = await supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true });
    if (orgsError) throw orgsError;
    console.log('Total orgs:', totalOrgs);

    console.log('2. Active organizations count...');
    const { count: activeOrgs, error: activeOrgsError } = await supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true })
      .eq('subscription_status', 'ACTIVE');
    if (activeOrgsError) throw activeOrgsError;
    console.log('Active orgs:', activeOrgs);

    console.log('3. Users count...');
    const { count: totalUsers, error: usersError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    if (usersError) throw usersError;
    console.log('Total users:', totalUsers);

    console.log('4. Subscriptions join...');
    const { data: subscriptions, error: subsError } = await supabase
      .from('saas_subscriptions')
      .select('plan_id, billing_cycle, saas_plans(price_monthly, price_yearly)')
      .eq('status', 'active');
    
    if (subsError) throw subsError;
    console.log('Subscriptions found:', subscriptions?.length);

    console.log('✅ All queries successful');
  } catch (error) {
    console.error('❌ FATAL ERROR:', error);
  }
}

test();
