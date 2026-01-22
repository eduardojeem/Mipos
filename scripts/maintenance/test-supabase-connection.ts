import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function testConnection() {
  try {
    console.log('🔄 Probando conexión a Supabase...');
    
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Conexión establecida exitosamente');
    
    // Test query execution
    console.log('🔄 Probando consulta básica...');
    const result = await prisma.$queryRaw`SELECT version()`;
    console.log('✅ Consulta ejecutada:', result);
    
    // Test if tables exist
    console.log('🔄 Verificando tablas existentes...');
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log('📋 Tablas encontradas:', tables);
    
  } catch (error) {
    console.error('❌ Error de conexión:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Tenant or user not found')) {
        console.log('\n🔧 Sugerencias para resolver el error:');
        console.log('1. Verificar que las credenciales de Supabase sean correctas');
        console.log('2. Asegurarse de que el proyecto de Supabase esté activo');
        console.log('3. Verificar el formato de la URL de conexión');
        console.log('4. Comprobar que la contraseña no haya expirado');
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();