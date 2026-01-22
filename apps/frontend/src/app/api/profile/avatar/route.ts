import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verificar autenticación
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('avatar') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó ningún archivo' }, { status: 400 });
    }

    // Validar tipo de archivo
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Tipo de archivo no permitido. Solo se permiten: JPG, PNG, WebP' 
      }, { status: 400 });
    }

    // Validar tamaño
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: 'El archivo es demasiado grande. Máximo 5MB' 
      }, { status: 400 });
    }

    // Crear directorio de uploads si no existe
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'avatars');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generar nombre único para el archivo
    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const fileName = `${session.user.id}_${timestamp}.${extension}`;
    const filePath = join(uploadsDir, fileName);

    // Guardar archivo
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // URL pública del avatar
    const avatarUrl = `/uploads/avatars/${fileName}`;

    // Actualizar avatar en la base de datos
    // Comentado temporalmente hasta configurar la tabla users en Supabase
    /*
    try {
      // Intentar actualizar en tabla users personalizada
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: avatarUrl })
        .eq('id', session.user.id);

      if (updateError) {
        console.warn('No se pudo actualizar en tabla users, usando user_metadata');
        
        // Fallback: actualizar en user_metadata
        const { error: metadataError } = await supabase.auth.updateUser({
          data: { avatar_url: avatarUrl }
        });

        if (metadataError) {
          throw metadataError;
        }
      }
    } catch (dbError) {
      console.error('Error updating avatar in database:', dbError);
      // El archivo ya se guardó, pero no se pudo actualizar la DB
      return NextResponse.json({ 
        success: true,
        avatarUrl,
        warning: 'Avatar guardado pero no se pudo actualizar en la base de datos'
      });
    }
    */

    // Fallback: actualizar en user_metadata
    try {
      const { error: metadataError } = await supabase.auth.updateUser({
        data: { avatar_url: avatarUrl }
      });

      if (metadataError) {
        throw metadataError;
      }
    } catch (error) {
      console.error('Error actualizando avatar:', error);
      return NextResponse.json(
        { error: 'Error actualizando avatar en la base de datos' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      avatarUrl,
      message: 'Avatar actualizado exitosamente'
    });

  } catch (error) {
    console.error('Error uploading avatar:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verificar autenticación
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Eliminar avatar de la base de datos
    // Comentado temporalmente hasta configurar la tabla users en Supabase
    /*
    try {
      // Intentar actualizar en tabla users personalizada
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: null })
        .eq('id', session.user.id);

      if (updateError) {
        console.warn('No se pudo actualizar en tabla users, usando user_metadata');
        
        // Fallback: actualizar en user_metadata
        const { error: metadataError } = await supabase.auth.updateUser({
          data: { avatar_url: null }
        });

        if (metadataError) {
          throw metadataError;
        }
      }
    } catch (dbError) {
      console.error('Error removing avatar from database:', dbError);
      return NextResponse.json({ 
        error: 'Error al eliminar avatar de la base de datos' 
      }, { status: 500 });
    }
    */

    // Fallback: actualizar en user_metadata
    try {
      const { error: metadataError } = await supabase.auth.updateUser({
        data: { avatar_url: null }
      });

      if (metadataError) {
        throw metadataError;
      }
    } catch (error) {
      console.error('Error eliminando avatar:', error);
      return NextResponse.json(
        { error: 'Error eliminando avatar de la base de datos' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: 'Avatar eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error deleting avatar:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 });
  }
}