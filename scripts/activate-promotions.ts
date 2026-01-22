/**
 * Script para activar promociones
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function activatePromotions() {
  console.log('🔄 Activando promociones...\n');

  // 1. Obtener todas las promociones
  const { data: allPromotions, error: fetchError } = await supabase
    .from('promotions')
    .select('*')
    .order('created_at', { ascending: false });

  if (fetchError) {
    console.error('❌ Error al obtener promociones:', fetchError);
    return;
  }

  console.log(`📋 Promociones encontradas: ${allPromotions?.length || 0}\n`);

  // 2. Obtener promociones con productos asociados
  const { data: promoProducts } = await supabase
    .from('promotions_products')
    .select('promotion_id');

  const promoIdsWithProducts = new Set(promoProducts?.map(pp => pp.promotion_id) || []);

  // 3. Activar promociones válidas
  const now = new Date();
  const promotionsToActivate: string[] = [];

  allPromotions?.forEach(promo => {
    const hasProducts = promoIdsWithProducts.has(promo.id);
    const startDate = promo.start_date ? new Date(promo.start_date) : null;
    const endDate = promo.end_date ? new Date(promo.end_date) : null;

    const isStarted = !startDate || startDate <= now;
    const isNotEnded = !endDate || endDate >= now;

    console.log(`📦 ${promo.name}`);
    console.log(`   ID: ${promo.id}`);
    console.log(`   Activa: ${promo.is_active ? '✅' : '❌'}`);
    console.log(`   Productos: ${hasProducts ? '✅' : '❌'}`);
    console.log(`   Iniciada: ${isStarted ? '✅' : '❌'} ${startDate ? `(${startDate.toLocaleDateString()})` : '(sin fecha)'}`);
    console.log(`   No finalizada: ${isNotEnded ? '✅' : '❌'} ${endDate ? `(${endDate.toLocaleDateString()})` : '(sin fecha)'}`);

    if (hasProducts && isStarted && isNotEnded && !promo.is_active) {
      promotionsToActivate.push(promo.id);
      console.log(`   ➡️  Se activará`);
    }
    console.log('');
  });

  if (promotionsToActivate.length === 0) {
    console.log('ℹ️  No hay promociones para activar');
    return;
  }

  console.log(`\n🔄 Activando ${promotionsToActivate.length} promociones...\n`);

  const { data: updated, error: updateError } = await supabase
    .from('promotions')
    .update({ is_active: true })
    .in('id', promotionsToActivate)
    .select();

  if (updateError) {
    console.error('❌ Error al activar promociones:', updateError);
    return;
  }

  console.log(`✅ Promociones activadas: ${updated?.length || 0}\n`);

  updated?.forEach(promo => {
    console.log(`   ✅ ${promo.name} (${promo.discount_type}: ${promo.discount_value})`);
  });

  // 4. Verificar resultado final
  const { data: activePromotions } = await supabase
    .from('promotions')
    .select('*')
    .eq('is_active', true);

  console.log(`\n📊 Total de promociones activas: ${activePromotions?.length || 0}`);
  console.log('\n✅ Proceso completado\n');
}

activatePromotions().catch(console.error);
