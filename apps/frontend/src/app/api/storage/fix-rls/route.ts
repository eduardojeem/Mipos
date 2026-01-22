import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST() {
  try {
    console.log('🔧 Iniciando corrección de políticas RLS...');

    // Crear cliente con service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Verificar conexión
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) {
      return NextResponse.json(
        { error: 'Error de conexión a Supabase', details: listError.message },
        { status: 500 }
      );
    }

    // Verificar que el bucket carousel existe
    const carouselBucket = buckets?.find(b => b.name === 'carousel');
    if (!carouselBucket) {
      return NextResponse.json(
        { error: 'Bucket "carousel" no encontrado' },
        { status: 404 }
      );
    }

    // Intentar crear políticas RLS usando SQL directo
    const policies = [
      // Política para lectura pública
      {
        name: 'carousel_public_read',
        sql: `
          CREATE POLICY "carousel_public_read" ON storage.objects
          FOR SELECT
          USING (bucket_id = 'carousel');
        `
      },
      // Política para subida autenticada
      {
        name: 'carousel_authenticated_upload',
        sql: `
          CREATE POLICY "carousel_authenticated_upload" ON storage.objects
          FOR INSERT
          WITH CHECK (
            bucket_id = 'carousel' 
            AND auth.role() = 'authenticated'
          );
        `
      }
    ];

    const results = [];

    // Primero, eliminar políticas existentes que puedan causar conflicto
    const dropPolicies = [
      'DROP POLICY IF EXISTS "carousel_policy_select" ON storage.objects;',
      'DROP POLICY IF EXISTS "carousel_policy_insert" ON storage.objects;',
      'DROP POLICY IF EXISTS "carousel_public_read" ON storage.objects;',
      'DROP POLICY IF EXISTS "carousel_authenticated_upload" ON storage.objects;'
    ];

    for (const dropSql of dropPolicies) {
      try {
        await supabase.rpc('exec_sql', { sql: dropSql });
      } catch (error) {
        // Ignorar errores de políticas que no existen
      }
    }

    // Crear nuevas políticas
    for (const policy of policies) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: policy.sql });
        if (error) {
          results.push({
            policy: policy.name,
            success: false,
            error: error.message
          });
        } else {
          results.push({
            policy: policy.name,
            success: true
          });
        }
      } catch (error) {
        results.push({
          policy: policy.name,
          success: false,
          error: (error as Error).message
        });
      }
    }

    // Asegurar que el bucket es público
    try {
      const { error: updateError } = await supabase
        .from('buckets')
        .update({ public: true })
        .eq('id', 'carousel');
      
      if (updateError) {
        console.warn('Advertencia al actualizar bucket público:', updateError);
      }
    } catch (error) {
      console.warn('No se pudo actualizar configuración pública del bucket');
    }

    // Probar subida de archivo
    const testFileName = `test-rls-${Date.now()}.txt`;
    const testFile = new Blob(['Test RLS'], { type: 'text/plain' });

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('carousel')
      .upload(testFileName, testFile, { upsert: true });

    let uploadTest = {
      success: false,
      error: null as string | null
    };

    if (uploadError) {
      uploadTest.error = uploadError.message;
    } else {
      uploadTest.success = true;
      // Limpiar archivo de prueba
      await supabase.storage.from('carousel').remove([testFileName]);
    }

    return NextResponse.json({
      success: true,
      message: 'Políticas RLS procesadas',
      results: {
        policies: results,
        uploadTest,
        bucket: {
          name: carouselBucket.name,
          public: carouselBucket.public,
          id: carouselBucket.id
        }
      }
    });

  } catch (error) {
    console.error('Error en corrección RLS:', error);
    return NextResponse.json(
      { 
        error: 'Error interno al corregir políticas RLS',
        details: (error as Error).message,
        solution: 'Ejecutar manualmente fix-storage-rls-policies.sql en Supabase Dashboard'
      },
      { status: 500 }
    );
  }
}