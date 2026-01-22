// Script para verificar el balance de caja después de registrar un movimiento
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testBalanceCalculation() {
    console.log('🔍 Verificando cálculo de balance...\n');

    // 1. Obtener sesión activa
    const { data: sessions, error: sessionError } = await supabase
        .from('cash_sessions')
        .select('*')
        .eq('status', 'OPEN')
        .order('created_at', { ascending: false })
        .limit(1);

    if (sessionError || !sessions || sessions.length === 0) {
        console.error('❌ No hay sesión abierta');
        return;
    }

    const session = sessions[0];
    console.log('✅ Sesión encontrada:', session.id);
    console.log('   Monto de apertura:', session.opening_amount);

    // 2. Obtener todos los movimientos de la sesión
    const { data: movements, error: movError } = await supabase
        .from('cash_movements')
        .select('*')
        .eq('session_id', session.id)
        .order('created_at', { ascending: false });

    if (movError) {
        console.error('❌ Error obteniendo movimientos:', movError);
        return;
    }

    console.log(`\n📊 Movimientos encontrados: ${movements?.length || 0}\n`);

    // 3. Calcular balance manualmente
    let balance = Number(session.opening_amount) || 0;
    let totalIn = 0;
    let totalOut = 0;
    let totalSale = 0;
    let totalReturn = 0;
    let totalAdjustment = 0;

    movements?.forEach((m, index) => {
        const amount = Number(m.amount) || 0;
        const absAmount = Math.abs(amount);

        console.log(`${index + 1}. ${m.type.padEnd(12)} | Monto: ${amount.toString().padStart(10)} | Fecha: ${new Date(m.created_at).toLocaleString()}`);

        switch (m.type) {
            case 'IN':
                totalIn += absAmount;
                balance += absAmount;
                break;
            case 'OUT':
                totalOut += absAmount;
                balance -= absAmount;
                break;
            case 'SALE':
                totalSale += absAmount;
                balance += absAmount;
                break;
            case 'RETURN':
                totalReturn += absAmount;
                balance -= absAmount;
                break;
            case 'ADJUSTMENT':
                totalAdjustment += amount; // Preserva el signo
                balance += amount;
                break;
        }
    });

    console.log('\n📈 Resumen:');
    console.log('─'.repeat(50));
    console.log(`Apertura:        ${session.opening_amount}`);
    console.log(`Ingresos (IN):   +${totalIn}`);
    console.log(`Ventas (SALE):   +${totalSale}`);
    console.log(`Egresos (OUT):   -${totalOut}`);
    console.log(`Devoluciones:    -${totalReturn}`);
    console.log(`Ajustes:         ${totalAdjustment >= 0 ? '+' : ''}${totalAdjustment}`);
    console.log('─'.repeat(50));
    console.log(`BALANCE FINAL:   ${balance}`);
    console.log('─'.repeat(50));

    // 4. Verificar si coincide con el balance esperado
    const expectedBalance = Number(session.opening_amount) + totalIn + totalSale - totalOut - totalReturn + totalAdjustment;

    if (Math.abs(balance - expectedBalance) < 0.01) {
        console.log('\n✅ El cálculo de balance es CORRECTO');
    } else {
        console.log('\n❌ ERROR: Discrepancia en el cálculo');
        console.log(`   Calculado: ${balance}`);
        console.log(`   Esperado:  ${expectedBalance}`);
    }
}

testBalanceCalculation().catch(console.error);
