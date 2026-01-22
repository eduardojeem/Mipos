import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    return NextResponse.json({
      success: true,
      environment: {
        hasUrl: !!supabaseUrl,
        hasAnonKey: !!supabaseAnonKey,
        hasServiceKey: !!supabaseServiceKey,
        url: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'missing',
        nodeEnv: process.env.NODE_ENV
      },
      message: 'Environment check completed'
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Environment check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}