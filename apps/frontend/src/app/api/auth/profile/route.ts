import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface UserProfileData {
  id: string;
  email: string;
  name: string;
  phone?: string;
  bio?: string;
  location?: string;
  avatar_url?: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verificar autenticación
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Intentar obtener datos del usuario desde la tabla users
    let userData: UserProfileData | null = null;
    
    try {
      const { data: userRecord, error: userError2 } = await supabase
        .from('users')
        .select(`
          id,
          email,
          name,
          phone,
          bio,
          location,
          avatar_url,
          role,
          created_at,
          updated_at
        `)
        .eq('id', user.id)
        .single();

      if (userRecord && !userError2) {
        userData = {
          ...(userRecord as any),
          bio: (userRecord as any)?.bio ?? user.user_metadata?.bio ?? '',
          location: (userRecord as any)?.location ?? user.user_metadata?.location ?? '',
        } as UserProfileData;
      }
    } catch (error) {
      console.warn('Could not fetch user from users table, using auth data');
    }

    // Fallback: usar datos de autenticación
    if (!userData) {
      userData = {
        id: user.id,
        email: user.email || '',
        name: (user.user_metadata as any)?.name || (user.user_metadata as any)?.full_name || 'Usuario',
        phone: (user.user_metadata as any)?.phone || (user as any).phone || '',
        bio: (user.user_metadata as any)?.bio || '',
        location: (user.user_metadata as any)?.location || '',
        avatar_url: (user.user_metadata as any)?.avatar_url || '',
        role: (user.user_metadata as any)?.role || 'user',
        created_at: (user as any).created_at,
        updated_at: (user as any).updated_at || (user as any).created_at
      };
    }

    return NextResponse.json({
      success: true,
      data: userData
    });

  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verificar autenticación
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { name, phone, avatar_url, bio, location } = body;

    // Validaciones básicas
    if (!name || name.trim().length < 2) {
      return NextResponse.json({ 
        error: 'El nombre debe tener al menos 2 caracteres' 
      }, { status: 400 });
    }

    if (phone && !/^\+?[\d\s\-\(\)]{8,}$/.test(phone)) {
      return NextResponse.json({ 
        error: 'Formato de teléfono inválido' 
      }, { status: 400 });
    }

    if (typeof bio === 'string' && bio.length > 500) {
      return NextResponse.json({ 
        error: 'La biografía no puede exceder 500 caracteres' 
      }, { status: 400 });
    }

    if (typeof location === 'string' && location.length > 100) {
      return NextResponse.json({ 
        error: 'La ubicación no puede exceder 100 caracteres' 
      }, { status: 400 });
    }

    // avatar_url opcional: si se envía, aceptar string (URL/http o data URI)
    const trimmedAvatarUrl = typeof avatar_url === 'string' ? avatar_url.trim() : undefined;

    const updateData = {
      name: name.trim(),
      phone: phone?.trim() || null,
      bio: typeof bio === 'string' ? bio : undefined,
      location: typeof location === 'string' ? location : undefined,
      avatar_url: typeof trimmedAvatarUrl === 'string' ? (trimmedAvatarUrl || null) : undefined,
      updated_at: new Date().toISOString()
    };

    // Intentar actualizar directamente en la tabla users (upsert por id)
    let updatedUser = null;
    try {
      const upsertPayload: any = {
        id: user.id,
        email: user.email || '',
        name: updateData.name,
        phone: updateData.phone,
        bio: updateData.bio ?? null,
        location: updateData.location ?? null,
        avatar_url: typeof trimmedAvatarUrl === 'string' ? (trimmedAvatarUrl || null) : null,
        role: (user.user_metadata as any)?.role || 'user',
        updated_at: updateData.updated_at,
      };

      const { data: userRecord, error: upsertError } = await supabase
        .from('users')
        .upsert(upsertPayload, { onConflict: 'id' })
        .select('*')
        .single();

      if (!upsertError && userRecord) {
        updatedUser = userRecord as any;
      }
    } catch (error) {
      console.warn('No se pudo upsert en users, usar fallback a user_metadata');
    }

    // Fallback: actualizar user_metadata
    if (!updatedUser) {
      const metadataUpdates: any = {
        ...(user.user_metadata as any),
        name: updateData.name,
        phone: updateData.phone,
        bio: updateData.bio ?? (user.user_metadata as any)?.bio,
        location: updateData.location ?? (user.user_metadata as any)?.location,
        updated_at: updateData.updated_at,
      };
      if (typeof trimmedAvatarUrl === 'string') {
        metadataUpdates.avatar_url = trimmedAvatarUrl || '';
      }

      const { data: authUpdateData, error: authUpdateError } = await supabase.auth.updateUser({
        data: metadataUpdates
      });

      if (authUpdateError) {
        console.error('Error updating user metadata:', authUpdateError);
        return NextResponse.json({
          success: false,
          error: 'Error al actualizar el perfil'
        }, { status: 500 });
      }

      updatedUser = {
        id: user.id,
        email: user.email,
        name: updateData.name,
        phone: updateData.phone,
        bio: updateData.bio ?? (user.user_metadata as any)?.bio ?? '',
        location: updateData.location ?? (user.user_metadata as any)?.location ?? '',
        avatar_url: typeof trimmedAvatarUrl === 'string' ? (trimmedAvatarUrl || '') : ((user.user_metadata as any)?.avatar_url || ''),
        role: (user.user_metadata as any)?.role || 'user',
        created_at: (user as any).created_at,
        updated_at: updateData.updated_at
      };
    }

    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: 'Perfil actualizado exitosamente'
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}