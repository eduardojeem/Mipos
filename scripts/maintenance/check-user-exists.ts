import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function checkUserExists() {
  try {
    console.log('🔍 Verificando si el usuario existe en la base de datos local...\n');

    const userId = '01041242-4be1-4fea-a91d-b0c8d6d2c320';
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    });

    if (user) {
      console.log('✅ Usuario encontrado:');
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   🆔 ID: ${user.id}`);
      console.log(`   👤 Nombre: ${user.fullName}`);
      console.log(`   🔐 Roles: ${user.userRoles.map(ur => ur.role.name).join(', ')}`);
    } else {
      console.log('❌ Usuario NO encontrado en la base de datos local');
      
      // Verificar si hay usuarios en la base de datos
      const totalUsers = await prisma.user.count();
      console.log(`📊 Total de usuarios en la base de datos: ${totalUsers}`);
      
      if (totalUsers > 0) {
        console.log('\n📋 Usuarios existentes:');
        const users = await prisma.user.findMany({
          select: {
            id: true,
            email: true,
            fullName: true
          },
          take: 5
        });
        
        users.forEach((u, index) => {
          console.log(`   ${index + 1}. ${u.email} (ID: ${u.id})`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserExists();