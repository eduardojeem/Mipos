import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET() {
  try {
    // Crear cliente con service role key para operaciones administrativas
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Listar buckets disponibles
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error('Error listando buckets:', error);
      return NextResponse.json(
        { error: 'Error al listar buckets', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      buckets: buckets?.map(bucket => ({
        name: bucket.name,
        id: bucket.id,
        public: bucket.public,
        created_at: bucket.created_at,
        updated_at: bucket.updated_at
      })) || []
    });

  } catch (error) {
    console.error('Error en API de buckets:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { bucketName, options } = await request.json();
    
    if (!bucketName) {
      return NextResponse.json(
        { error: 'Nombre del bucket requerido' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Crear bucket
    const { data, error } = await supabase.storage.createBucket(bucketName, {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      fileSizeLimit: 10485760, // 10MB
      ...options
    });

    if (error) {
      console.error('Error creando bucket:', error);
      return NextResponse.json(
        { error: 'Error al crear bucket', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      bucket: data
    });

  } catch (error) {
    console.error('Error en creación de bucket:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}