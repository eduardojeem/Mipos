import { NextRequest, NextResponse } from 'next/server';
import { assertAdmin } from '@/app/api/_utils/auth';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    // ✅ SEGURIDAD: Solo ADMIN/SUPER_ADMIN pueden probar SMTP
    const authResult = await assertAdmin(request);
    if (!authResult.ok) {
      return NextResponse.json(authResult.body, { status: authResult.status });
    }

    const { smtp_host, smtp_port, smtp_user, smtp_password } = await request.json();

    // Validar que se proporcionen los datos necesarios
    if (!smtp_host || !smtp_port || !smtp_user || !smtp_password) {
      return NextResponse.json(
        { error: 'Faltan datos de configuración SMTP' },
        { status: 400 }
      );
    }

    // Crear transporter de nodemailer
    const transporter = nodemailer.createTransporter({
      host: smtp_host,
      port: Number(smtp_port),
      secure: Number(smtp_port) === 465, // true para 465, false para otros puertos
      auth: {
        user: smtp_user,
        pass: smtp_password,
      },
      // Timeout de 10 segundos
      connectionTimeout: 10000,
      greetingTimeout: 10000,
    });

    // Verificar la conexión
    await transporter.verify();

    return NextResponse.json({
      success: true,
      message: 'Conexión SMTP exitosa. El servidor está configurado correctamente.',
    });

  } catch (error: any) {
    console.error('SMTP test error:', error);

    // Mensajes de error más específicos
    let errorMessage = 'No se pudo conectar al servidor SMTP';
    
    if (error.code === 'EAUTH') {
      errorMessage = 'Error de autenticación. Verifica el usuario y contraseña.';
    } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
      errorMessage = 'No se pudo conectar al servidor. Verifica el host y puerto.';
    } else if (error.code === 'ESOCKET') {
      errorMessage = 'Error de conexión de red. Verifica tu conexión a internet.';
    } else if (error.message) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 400 }
    );
  }
}
