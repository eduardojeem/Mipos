import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function DELETE(request: NextRequest) {
  try {
    const { fileNames } = await request.json();
    
    if (!fileNames || !Array.isArray(fileNames) || fileNames.length === 0) {
      return NextResponse.json(
        { error: 'Se requiere un array de nombres de archivos' },
        { status: 400 }
      );
    }

    // Crear cliente con service role key para bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log(`🗑️ Eliminando ${fileNames.length} archivo(s):`, fileNames);

    // Eliminar archivos del bucket carousel
    const { data, error } = await supabase.storage
      .from('carousel')
      .remove(fileNames);

    if (error) {
      console.error('Error deleting files:', error);
      return NextResponse.json(
        { error: 'Error al eliminar archivos', details: error.message },
        { status: 500 }
      );
    }

    console.log(`✅ ${fileNames.length} archivo(s) eliminado(s) exitosamente`);

    return NextResponse.json({
      success: true,
      message: `${fileNames.length} archivo(s) eliminado(s) exitosamente`,
      deleted: fileNames.length,
      data
    });

  } catch (error) {
    console.error('Error in delete API:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// Eliminar archivo individual
export async function POST(request: NextRequest) {
  try {
    const { fileName } = await request.json();
    
    if (!fileName) {
      return NextResponse.json(
        { error: 'Se requiere el nombre del archivo' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log(`🗑️ Eliminando archivo individual:`, fileName);

    const { error } = await supabase.storage
      .from('carousel')
      .remove([fileName]);

    if (error) {
      console.error('Error deleting file:', error);
      return NextResponse.json(
        { error: 'Error al eliminar archivo', details: error.message },
        { status: 500 }
      );
    }

    console.log(`✅ Archivo eliminado exitosamente:`, fileName);

    return NextResponse.json({
      success: true,
      message: 'Archivo eliminado exitosamente',
      fileName
    });

  } catch (error) {
    console.error('Error in single delete API:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}