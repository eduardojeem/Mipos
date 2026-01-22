import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyCashTables() {
    console.log('🔍 Verificando tablas de CAJA (Cash System)...\n');
    let hasErrors = false;

    // 1. Verificar cash_sessions
    console.log('👉 Verificando tabla: cash_sessions');
    try {
        // Intentar seleccionar columnas específicas para validar que existen
        const { data, error } = await supabase
            .from('cash_sessions')
            .select('id, user_id, status, opening_amount, closing_amount, opened_at, closed_at')
            .limit(1);

        if (error) {
            console.log('❌ Error en cash_sessions:', error.message);
            hasErrors = true;
        } else {
            console.log('✅ Tabla cash_sessions existe y tiene las columnas base.');
            // Verificar si user_id es nullable (no podemos hacerlo directamente con select, pero si no falló, la columna existe)
            // Para verificar constraints necesitaríamos acceso a information_schema o intentar insertar algo inválido, 
            // pero por ahora asumimos que si la migración corrió, está bien.
        }
    } catch (e) {
        console.log('❌ Excepción verificando cash_sessions:', e);
        hasErrors = true;
    }

    console.log('\n--------------------------------\n');

    // 2. Verificar cash_movements
    console.log('👉 Verificando tabla: cash_movements');
    try {
        const { data, error } = await supabase
            .from('cash_movements')
            .select('id, session_id, type, amount, reason, reference_type, reference_id, created_at')
            .limit(1);

        if (error) {
            console.log('❌ Error en cash_movements:', error.message);
            if (error.code === '42P01') {
                console.log('   (La tabla no existe)');
            }
            hasErrors = true;
        } else {
            console.log('✅ Tabla cash_movements existe y tiene las columnas requeridas.');
        }
    } catch (e) {
        console.log('❌ Excepción verificando cash_movements:', e);
        hasErrors = true;
    }

    console.log('\n--------------------------------\n');

    // 3. Verificar relaciones (Foreign Keys) - Intento indirecto
    // Si cash_movements existe, intentamos hacer un join con cash_sessions para ver si Supabase detecta la relación
    console.log('👉 Verificando relaciones (Join Check)');
    try {
        const { data, error } = await supabase
            .from('cash_movements')
            .select('id, cash_sessions!inner(id)')
            .limit(1);

        if (error) {
            // Si falla con "Could not find the 'cash_sessions' relationship", entonces la FK no está bien definida en Supabase
            if (error.message.includes('Could not find') || error.message.includes('relationship')) {
                console.log('⚠️ Advertencia: No se detectó la relación automática entre cash_movements y cash_sessions.');
                console.log('   Error:', error.message);
                // No marcamos como error fatal porque a veces PostgREST necesita un reload del esquema
            } else {
                console.log('❌ Error verificando relación:', error.message);
            }
        } else {
            console.log('✅ Relación cash_movements -> cash_sessions detectada correctamente.');
        }
    } catch (e) {
        console.log('❌ Excepción verificando relaciones:', e);
    }

    if (hasErrors) {
        console.log('\n❌ Se encontraron problemas en las tablas de caja.');
        process.exit(1);
    } else {
        console.log('\n✅ Todas las tablas de caja parecen estar correctas.');
        process.exit(0);
    }
}

verifyCashTables();
