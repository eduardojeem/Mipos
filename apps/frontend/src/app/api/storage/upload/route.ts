import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const bucket = formData.get('bucket') as string || 'carousel';
    const fileName = formData.get('fileName') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
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

    // Generar nombre único si no se proporciona
    const finalFileName = fileName || `${Date.now()}-${file.name}`;

    // Subir archivo
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(finalFileName, file, {
        upsert: true,
        contentType: file.type
      });

    if (error) {
      console.error('Error uploading file:', error);
      return NextResponse.json(
        { error: 'Upload failed', details: error.message },
        { status: 500 }
      );
    }

    // Obtener URL pública
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(finalFileName);

    return NextResponse.json({
      success: true,
      data: {
        path: data.path,
        fullPath: data.fullPath,
        publicUrl,
        fileName: finalFileName,
        size: file.size,
        type: file.type
      }
    });

  } catch (error) {
    console.error('Error in upload API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get('fileName');
    const bucket = searchParams.get('bucket') || 'carousel';

    if (!fileName) {
      return NextResponse.json(
        { error: 'fileName parameter required' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { error } = await supabase.storage
      .from(bucket)
      .remove([fileName]);

    if (error) {
      return NextResponse.json(
        { error: 'Delete failed', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    console.error('Error in delete API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}