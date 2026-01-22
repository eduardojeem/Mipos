import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET() {
  try {
    // Crear cliente con service role key para acceso completo
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Listar archivos en el bucket carousel
    const { data: files, error } = await supabase.storage
      .from('carousel')
      .list('', {
        limit: 200,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (error) {
      console.error('Error listing files:', error);
      return NextResponse.json(
        { error: 'Error al listar archivos', details: error.message },
        { status: 500 }
      );
    }

    // Filtrar solo imágenes y generar URLs públicas
    const imageFiles = files?.filter(file => {
      const isImage = file.metadata?.mimetype?.startsWith('image/') || 
                     /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name);
      return isImage && file.name !== '.emptyFolderPlaceholder';
    }) || [];

    // Generar información completa de cada imagen
    const imagesWithUrls = imageFiles.map(file => {
      const { data: { publicUrl } } = supabase.storage
        .from('carousel')
        .getPublicUrl(file.name);

      return {
        id: file.id || file.name,
        name: file.name,
        url: publicUrl,
        created_at: file.created_at,
        updated_at: file.updated_at,
        size: file.metadata?.size || 0,
        metadata: {
          width: file.metadata?.width,
          height: file.metadata?.height,
          mimetype: file.metadata?.mimetype,
          eTag: file.metadata?.eTag,
          cacheControl: file.metadata?.cacheControl,
          lastModified: file.metadata?.lastModified
        }
      };
    });

    return NextResponse.json({
      success: true,
      images: imagesWithUrls,
      total: imagesWithUrls.length,
      bucket: 'carousel'
    });

  } catch (error) {
    console.error('Error in carousel list API:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Listar todos los archivos
    const { data: files, error: listError } = await supabase.storage
      .from('carousel')
      .list('');

    if (listError) {
      return NextResponse.json(
        { error: 'Error al listar archivos para eliminación' },
        { status: 500 }
      );
    }

    if (!files || files.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hay archivos para eliminar',
        deleted: 0
      });
    }

    // Eliminar todos los archivos
    const fileNames = files
      .filter(file => file.name !== '.emptyFolderPlaceholder')
      .map(file => file.name);

    if (fileNames.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hay archivos para eliminar',
        deleted: 0
      });
    }

    const { error: deleteError } = await supabase.storage
      .from('carousel')
      .remove(fileNames);

    if (deleteError) {
      return NextResponse.json(
        { error: 'Error al eliminar archivos', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${fileNames.length} archivos eliminados exitosamente`,
      deleted: fileNames.length
    });

  } catch (error) {
    console.error('Error in bulk delete:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}