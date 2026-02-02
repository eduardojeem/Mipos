import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const supabase = await createClient();

        // Obtener organizaciones para la sección de negocios asociados
        // Solo mostramos organizaciones activas con información pública
        const { data: organizations, error } = await supabase
            .from('organizations')
            .select('id, name, slug, created_at')
            .eq('subscription_status', 'ACTIVE')
            .order('created_at', { ascending: false })
            .limit(12); // Límite de organizaciones a mostrar

        if (error) {
            console.error('Error fetching organizations:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            organizations: organizations || [],
            count: organizations?.length || 0
        });

    } catch (error) {
        console.error('Error in public organizations API:', error);
        return NextResponse.json({
            error: 'Error interno del servidor'
        }, { status: 500 });
    }
}
