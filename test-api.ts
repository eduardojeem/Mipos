
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
  console.log('Testing organizations...');
  const { count: totalOrgs, error: orgsError } = await supabase
    .from('organizations')
    .select('*', { count: 'exact', head: true });
  
  if (orgsError) console.error('Orgs error:', orgsError);
  else console.log('Total orgs:', totalOrgs);

  console.log('Testing users...');
  const { count: totalUsers, error: usersError } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });
  
  if (usersError) console.error('Users error:', usersError);
  else console.log('Total users:', totalUsers);

  console.log('Testing subscriptions...');
  try {
    const { data: subscriptions, error: subsError } = await supabase
      .from('saas_subscriptions')
      .select('plan_id, billing_cycle, saas_plans(price_monthly, price_yearly)')
      .eq('status', 'active');
    
    if (subsError) console.error('Subs error:', subsError);
    else console.log('Subscriptions found:', subscriptions?.length);
  } catch (e) {
    console.error('Subs catch error:', e);
  }
}

test();
