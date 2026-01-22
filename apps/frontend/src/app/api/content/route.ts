import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    let query = supabase
      .from('content_items')
      .select('*')
      .order('updated_at', { ascending: false });

    // Apply filters
    if (type && type !== 'all') {
      query = query.eq('type', type);
    }
    
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }
    
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching content:', error);
      return NextResponse.json({ error: 'Error fetching content' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    
    const {
      title,
      description,
      content,
      type,
      status = 'draft',
      tags = [],
      category,
      metadata = {}
    } = body;

    // Validate required fields
    if (!title || !type) {
      return NextResponse.json(
        { error: 'Title and type are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('content_items')
      .insert({
        title,
        description,
        content,
        type,
        status,
        tags,
        category,
        metadata,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating content:', error);
      return NextResponse.json({ error: 'Error creating content' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}