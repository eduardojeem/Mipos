import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  try {
    // Clean existing data (in reverse order of dependencies)
    console.log('🧹 Cleaning existing data...');
    await prisma.inventoryMovement.deleteMany();
    await prisma.saleItem.deleteMany();
    await prisma.purchaseItem.deleteMany();
    await prisma.sale.deleteMany();
    await prisma.purchase.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.supplier.deleteMany();
    await prisma.user.deleteMany();

    // Create users in database (without Supabase Auth for now)
    console.log('👥 Creating users in database...');
    const users = await Promise.all([
      prisma.user.create({
        data: {
          id: 'admin-user-id',
          email: 'jeem101595@gmail.com',
          fullName: 'Jeem Admin User',
          role: "ADMIN"
        }
      }),
      prisma.user.create({
        data: {
          id: 'cashier-user-id',
          email: 'cashier@example.com',
          fullName: 'Cashier User',
          role: "CASHIER"
        }
      })
    ]);

    console.log(`✅ Created ${users.length} users`);

    // Create categories
    console.log('📂 Creating categories...');
    const categories = await Promise.all([
      prisma.category.create({
        data: {
          name: 'Maquillaje Facial',
          description: 'Base, corrector, polvo, rubor y productos para el rostro'
        }
      }),
      prisma.category.create({
        data: {
          name: 'Maquillaje de Ojos',
          description: 'Sombras, delineadores, máscaras de pestañas y productos para ojos'
        }
      }),
      prisma.category.create({
        data: {
          name: 'Maquillaje de Labios',
          description: 'Labiales, gloss, delineadores de labios y bálsamos'
        }
      }),
      prisma.category.create({
        data: {
          name: 'Cuidado Facial',
          description: 'Limpiadores, hidratantes, serums y tratamientos faciales'
        }
      }),
      prisma.category.create({
        data: {
          name: 'Perfumes y Fragancias',
          description: 'Perfumes, colonias, aguas de tocador y fragancias corporales'
        }
      }),
      prisma.category.create({
        data: {
          name: 'Cuidado Corporal',
          description: 'Cremas corporales, lociones, exfoliantes y productos para el cuerpo'
        }
      }),
      prisma.category.create({
        data: {
          name: 'Cuidado del Cabello',
          description: 'Shampoos, acondicionadores, mascarillas y productos capilares'
        }
      }),
      prisma.category.create({
        data: {
          name: 'Accesorios de Belleza',
          description: 'Brochas, esponjas, espejos y herramientas de maquillaje'
        }
      })
    ]);

    console.log(`✅ Created ${categories.length} categories`);

    // Create suppliers
    console.log('🏢 Creating suppliers...');
    const suppliers = await Promise.all([
      prisma.supplier.create({
        data: {
          name: 'Distribuidora Central',
          contactInfo: JSON.stringify({
            phone: '+1-555-0101',
            email: 'ventas@distribuidoracentral.com',
            address: 'Av. Principal 123, Ciudad'
          })
        }
      }),
      prisma.supplier.create({
        data: {
          name: 'TechSupply Corp',
          contactInfo: JSON.stringify({
            phone: '+1-555-0202',
            email: 'orders@techsupply.com',
            address: 'Tech Park 456, Silicon Valley'
          })
        }
      }),
      prisma.supplier.create({
        data: {
          name: 'Global Imports',
          contactInfo: JSON.stringify({
            phone: '+1-555-0303',
            email: 'info@globalimports.com',
            address: 'Import Plaza 789, Trade District'
          })
        }
      })
    ]);

    console.log(`✅ Created ${suppliers.length} suppliers`);

    // Create customers
    console.log('👤 Creating customers...');
    const customers = await Promise.all([
      prisma.customer.create({
        data: {
          name: 'Juan Pérez',
          phone: '+1-555-1001',
          email: 'juan.perez@email.com'
        }
      }),
      prisma.customer.create({
        data: {
          name: 'María García',
          phone: '+1-555-1002',
          email: 'maria.garcia@email.com'
        }
      }),
      prisma.customer.create({
        data: {
          name: 'Carlos López',
          phone: '+1-555-1003',
          email: 'carlos.lopez@email.com'
        }
      }),
      prisma.customer.create({
        data: {
          name: 'Ana Martínez',
          phone: '+1-555-1004',
          email: 'ana.martinez@email.com'
        }
      }),
      prisma.customer.create({
        data: {
          name: 'Luis Rodríguez',
          phone: '+1-555-1005',
          email: 'luis.rodriguez@email.com'
        }
      }),
      prisma.customer.create({
        data: {
          name: 'Carmen Sánchez',
          phone: '+1-555-1006',
          email: 'carmen.sanchez@email.com'
        }
      }),
      prisma.customer.create({
        data: {
          name: 'Roberto Torres',
          phone: '+1-555-1007',
          email: 'roberto.torres@email.com'
        }
      }),
      prisma.customer.create({
        data: {
          name: 'Elena Vargas',
          phone: '+1-555-1008',
          email: 'elena.vargas@email.com'
        }
      }),
      prisma.customer.create({
        data: {
          name: 'Miguel Herrera',
          phone: '+1-555-1009',
          email: 'miguel.herrera@email.com'
        }
      }),
      prisma.customer.create({
        data: {
          name: 'Patricia Morales',
          phone: '+1-555-1010',
          email: 'patricia.morales@email.com'
        }
      })
    ]);

    console.log(`✅ Created ${customers.length} customers`);

    // Create products
    console.log('📦 Creating products...');
    const products = [
      // Maquillaje Facial
      {
        name: 'Base de Maquillaje L\'Oréal',
        sku: 'MF001',
        description: 'Base de maquillaje líquida tono medio, cobertura completa',
        costPrice: 8.00,
        salePrice: 16.99,
        stockQuantity: 50,
        minStock: 10,
        categoryId: categories[0].id,
        images: 'https://via.placeholder.com/400x300/F4A460/FFFFFF?text=Base+Maquillaje',
        brand: 'L\'Oréal',
        shade: 'Medium',
        skinType: 'Mixta',
        ingredients: '["Agua", "Dimeticona", "Glicerina", "Niacinamida"]',
        volume: '30ml',
        finish: 'Mate',
        coverage: 'Completa',
        waterproof: false,
        vegan: false,
        crueltyFree: true
      },
      {
        name: 'Corrector Maybelline',
        sku: 'MF002',
        description: 'Corrector líquido anti-ojeras tono claro',
        costPrice: 5.00,
        salePrice: 10.99,
        stockQuantity: 75,
        minStock: 15,
        categoryId: categories[0].id,
        images: 'https://via.placeholder.com/400x300/FDBCB4/FFFFFF?text=Corrector',
        brand: 'Maybelline',
        shade: 'Fair',
        skinType: 'Todo tipo',
        ingredients: '["Agua", "Ciclopentasiloxano", "Glicerina"]',
        volume: '6.8ml',
        finish: 'Natural',
        coverage: 'Media',
        waterproof: true,
        vegan: false,
        crueltyFree: false
      },
      {
        name: 'Polvo Compacto Revlon',
        sku: 'MF003',
        description: 'Polvo compacto matificante tono natural',
        costPrice: 6.00,
        salePrice: 12.99,
        stockQuantity: 40,
        minStock: 8,
        categoryId: categories[0].id,
        images: 'https://via.placeholder.com/400x300/DEB887/FFFFFF?text=Polvo+Compacto',
        brand: 'Revlon',
        shade: 'Natural',
        skinType: 'Grasa',
        ingredients: '["Talco", "Mica", "Sílice"]',
        volume: '8.5g',
        finish: 'Mate',
        coverage: 'Ligera',
        waterproof: false,
        vegan: true,
        crueltyFree: true
      },
      {
        name: 'Rubor Milani',
        sku: 'MF004',
        description: 'Rubor en polvo color rosa coral',
        costPrice: 4.50,
        salePrice: 9.99,
        stockQuantity: 60,
        minStock: 12,
        categoryId: categories[0].id,
        images: 'https://via.placeholder.com/400x300/FF69B4/FFFFFF?text=Rubor',
        brand: 'Milani',
        shade: 'Rosa Coral',
        skinType: 'Todo tipo',
        ingredients: '["Talco", "Mica", "Óxidos de hierro"]',
        volume: '3.5g',
        finish: 'Satinado',
        coverage: 'Media',
        waterproof: false,
        vegan: true,
        crueltyFree: true
      },
      // Maquillaje de Ojos
      {
        name: 'Paleta de Sombras Urban Decay',
        sku: 'MO001',
        description: 'Paleta de 12 sombras tonos neutros y dorados',
        costPrice: 25.00,
        salePrice: 49.99,
        stockQuantity: 30,
        minStock: 6,
        categoryId: categories[1].id,
        images: 'https://via.placeholder.com/400x300/8B4513/FFFFFF?text=Paleta+Sombras',
        brand: 'Urban Decay',
        shade: 'Neutros/Dorados',
        skinType: 'Todo tipo',
        ingredients: '["Talco", "Mica", "Dimeticona", "Óxidos de hierro"]',
        volume: '12x1.3g',
        finish: 'Variado',
        coverage: 'Alta',
        waterproof: false,
        vegan: false,
        crueltyFree: true
      },
      {
        name: 'Delineador de Ojos MAC',
        sku: 'MO002',
        description: 'Delineador líquido negro resistente al agua',
        costPrice: 12.00,
        salePrice: 24.99,
        stockQuantity: 45,
        minStock: 9,
        categoryId: categories[1].id,
        images: 'https://via.placeholder.com/400x300/000000/FFFFFF?text=Delineador',
        brand: 'MAC',
        shade: 'Negro',
        skinType: 'Todo tipo',
        ingredients: '["Agua", "Acrilatos", "Óxido de hierro negro"]',
        volume: '2.5ml',
        finish: 'Mate',
        coverage: 'Completa',
        waterproof: true,
        vegan: false,
        crueltyFree: false
      },
      {
        name: 'Máscara de Pestañas Lancôme',
        sku: 'MO003',
        description: 'Máscara de pestañas voluminizadora color negro',
        costPrice: 15.00,
        salePrice: 29.99,
        stockQuantity: 35,
        minStock: 7,
        categoryId: categories[1].id,
        images: 'https://via.placeholder.com/400x300/2F4F4F/FFFFFF?text=Máscara',
        brand: 'Lancôme',
        shade: 'Negro',
        skinType: 'Todo tipo',
        ingredients: '["Agua", "Ceras", "Óxido de hierro negro"]',
        volume: '10ml',
        finish: 'Natural',
        coverage: 'Alta',
        waterproof: false,
        vegan: false,
        crueltyFree: false
      },
      {
        name: 'Lápiz de Cejas Anastasia',
        sku: 'MO004',
        description: 'Lápiz para cejas con cepillo tono castaño',
        costPrice: 8.00,
        salePrice: 16.99,
        stockQuantity: 50,
        minStock: 10,
        categoryId: categories[1].id,
        images: 'https://via.placeholder.com/400x300/8B4513/FFFFFF?text=Lápiz+Cejas',
        brand: 'Anastasia Beverly Hills',
        shade: 'Castaño',
        skinType: 'Todo tipo',
        ingredients: '["Ceras", "Óxidos de hierro", "Mica"]',
        volume: '0.085g',
        finish: 'Natural',
        coverage: 'Media',
        waterproof: true,
        vegan: false,
        crueltyFree: true
      },
      // Maquillaje de Labios
      {
        name: 'Labial Mate Fenty Beauty',
        sku: 'ML001',
        description: 'Labial líquido mate color rojo intenso',
        costPrice: 10.00,
        salePrice: 19.99,
        stockQuantity: 40,
        minStock: 8,
        categoryId: categories[2].id,
        images: 'https://via.placeholder.com/400x300/DC143C/FFFFFF?text=Labial+Mate',
        brand: 'Fenty Beauty',
        shade: 'Rojo Intenso',
        skinType: 'Todo tipo',
        ingredients: '["Dimeticona", "Ceras", "Pigmentos"]',
        volume: '5.6ml',
        finish: 'Mate',
        coverage: 'Completa',
        waterproof: true,
        vegan: true,
        crueltyFree: true
      },
      {
        name: 'Gloss Labial Glossier',
        sku: 'ML002',
        description: 'Gloss transparente con brillo natural',
        costPrice: 7.00,
        salePrice: 14.99,
        stockQuantity: 55,
        minStock: 11,
        categoryId: categories[2].id,
        images: 'https://via.placeholder.com/400x300/FFB6C1/FFFFFF?text=Gloss',
        brand: 'Glossier',
        shade: 'Transparente',
        skinType: 'Todo tipo',
        ingredients: '["Aceites", "Ceras", "Vitamina E"]',
        volume: '4.3ml',
        finish: 'Brillante',
        coverage: 'Ligera',
        waterproof: false,
        vegan: true,
        crueltyFree: true
      },
      {
        name: 'Delineador de Labios NYX',
        sku: 'ML003',
        description: 'Delineador de labios color nude',
        costPrice: 4.00,
        salePrice: 8.99,
        stockQuantity: 65,
        minStock: 13,
        categoryId: categories[2].id,
        images: 'https://via.placeholder.com/400x300/D2B48C/FFFFFF?text=Delineador+Labios',
        brand: 'NYX Professional Makeup',
        shade: 'Nude',
        skinType: 'Todo tipo',
        ingredients: '["Ceras", "Aceites", "Pigmentos"]',
        volume: '1.04g',
        finish: 'Mate',
        coverage: 'Media',
        waterproof: false,
        vegan: true,
        crueltyFree: true
      },
      {
        name: 'Bálsamo Labial Burt\'s Bees',
        sku: 'ML004',
        description: 'Bálsamo labial hidratante con miel',
        costPrice: 3.00,
        salePrice: 6.99,
        stockQuantity: 80,
        minStock: 16,
        categoryId: categories[2].id,
        images: 'https://via.placeholder.com/400x300/FFD700/FFFFFF?text=Bálsamo',
        brand: 'Burt\'s Bees',
        shade: 'Natural',
        skinType: 'Todo tipo',
        ingredients: '["Cera de abeja", "Aceite de coco", "Miel"]',
        volume: '4.25g',
        finish: 'Natural',
        coverage: 'Ligera',
        waterproof: false,
        vegan: false,
        crueltyFree: true
      },
      // Cuidado Facial
      {
        name: 'Limpiador Facial CeraVe',
        sku: 'CF001',
        description: 'Gel limpiador facial para piel grasa',
        costPrice: 8.00,
        salePrice: 15.99,
        stockQuantity: 45,
        minStock: 9,
        categoryId: categories[3].id,
        images: 'https://via.placeholder.com/400x300/87CEEB/FFFFFF?text=Limpiador',
        brand: 'CeraVe',
        shade: null,
        skinType: 'Grasa',
        ingredients: '["Agua", "Ceramidas", "Niacinamida", "Ácido hialurónico"]',
        volume: '236ml',
        finish: null,
        coverage: null,
        waterproof: null,
        vegan: false,
        crueltyFree: true
      },
      {
        name: 'Hidratante Neutrogena',
        sku: 'CF002',
        description: 'Crema hidratante facial con ácido hialurónico',
        costPrice: 12.00,
        salePrice: 22.99,
        stockQuantity: 35,
        minStock: 7,
        categoryId: categories[3].id,
        images: 'https://via.placeholder.com/400x300/E0E0E0/000000?text=Hidratante',
        brand: 'Neutrogena',
        shade: null,
        skinType: 'Seca',
        ingredients: '["Agua", "Ácido hialurónico", "Glicerina", "Ceramidas"]',
        volume: '50ml',
        finish: null,
        coverage: null,
        waterproof: null,
        vegan: false,
        crueltyFree: true
      },
      {
        name: 'Serum Vitamina C The Ordinary',
        sku: 'CF003',
        description: 'Serum facial con vitamina C al 23%',
        costPrice: 15.00,
        salePrice: 28.99,
        stockQuantity: 25,
        minStock: 5,
        categoryId: categories[3].id,
        images: 'https://via.placeholder.com/400x300/FFA500/FFFFFF?text=Serum+Vit+C',
        brand: 'The Ordinary',
        shade: null,
        skinType: 'Todo tipo',
        ingredients: '["L-Ascorbic Acid", "Agua", "Propanediol"]',
        volume: '30ml',
        finish: null,
        coverage: null,
        waterproof: null,
        vegan: true,
        crueltyFree: true
      },
      {
        name: 'Protector Solar La Roche-Posay',
        sku: 'CF004',
        description: 'Protector solar facial SPF 50+',
        costPrice: 18.00,
        salePrice: 34.99,
        stockQuantity: 30,
        minStock: 6,
        categoryId: categories[3].id,
        images: 'https://via.placeholder.com/400x300/FFFACD/000000?text=Protector+Solar',
        brand: 'La Roche-Posay',
        shade: null,
        skinType: 'Sensible',
        ingredients: '["Avobenzone", "Homosalate", "Octisalate", "Octocrylene"]',
        volume: '60ml',
        spf: 50,
        finish: 'Natural',
        coverage: null,
        waterproof: true,
        vegan: false,
        crueltyFree: true
      },
      // Perfumes y Fragancias
      {
        name: 'Perfume Chanel No. 5',
        sku: 'PF001',
        description: 'Eau de parfum clásico 50ml',
        costPrice: 80.00,
        salePrice: 149.99,
        stockQuantity: 15,
        minStock: 3,
        categoryId: categories[4].id,
        images: 'https://via.placeholder.com/400x300/FFD700/000000?text=Chanel+No5',
        brand: 'Chanel',
        shade: null,
        skinType: 'Todo tipo',
        ingredients: '["Alcohol", "Parfum", "Aqua", "Limonene", "Linalool"]',
        volume: '50ml',
        finish: null,
        coverage: null,
        waterproof: null,
        vegan: false,
        crueltyFree: false
      },
      {
        name: 'Colonia Victoria\'s Secret',
        sku: 'PF002',
        description: 'Body mist fragancia floral 250ml',
        costPrice: 12.00,
        salePrice: 24.99,
        stockQuantity: 40,
        minStock: 8,
        categoryId: categories[4].id,
        images: 'https://via.placeholder.com/400x300/FF1493/FFFFFF?text=Victoria+Secret',
        brand: 'Victoria\'s Secret',
        shade: null,
        skinType: 'Todo tipo',
        ingredients: '["Alcohol", "Aqua", "Parfum", "Glycerin"]',
        volume: '250ml',
        finish: null,
        coverage: null,
        waterproof: null,
        vegan: false,
        crueltyFree: false
      },
      {
        name: 'Agua de Tocador Adolfo Domínguez',
        sku: 'PF003',
        description: 'Fragancia fresca unisex 100ml',
        costPrice: 25.00,
        salePrice: 45.99,
        stockQuantity: 20,
        minStock: 4,
        categoryId: categories[4].id,
        images: 'https://via.placeholder.com/400x300/00CED1/FFFFFF?text=Adolfo+Dominguez',
        brand: 'Adolfo Domínguez',
        shade: null,
        skinType: 'Todo tipo',
        ingredients: '["Alcohol", "Aqua", "Parfum", "Limonene"]',
        volume: '100ml',
        finish: null,
        coverage: null,
        waterproof: null,
        vegan: false,
        crueltyFree: true
      },
      {
        name: 'Perfume Tom Ford',
        sku: 'PF004',
        description: 'Eau de parfum Black Orchid 30ml',
        costPrice: 60.00,
        salePrice: 119.99,
        stockQuantity: 10,
        minStock: 2,
        categoryId: categories[4].id,
        images: 'https://via.placeholder.com/400x300/4B0082/FFFFFF?text=Tom+Ford',
        brand: 'Tom Ford',
        shade: null,
        skinType: 'Todo tipo',
        ingredients: '["Alcohol", "Parfum", "Aqua", "Benzyl Salicylate"]',
        volume: '30ml',
        finish: null,
        coverage: null,
        waterproof: null,
        vegan: false,
        crueltyFree: false
      },
      // Cuidado Corporal
      {
        name: 'Crema Corporal Bath & Body Works',
        sku: 'CC001',
        description: 'Loción corporal hidratante aroma vainilla',
        costPrice: 8.00,
        salePrice: 16.99,
        stockQuantity: 50,
        minStock: 10,
        categoryId: categories[5].id,
        images: 'https://via.placeholder.com/400x300/DDA0DD/FFFFFF?text=Crema+Corporal',
        brand: 'Bath & Body Works',
        shade: null,
        skinType: 'Seca',
        ingredients: '["Agua", "Glicerina", "Shea Butter", "Fragancia"]',
        volume: '236ml',
        finish: null,
        coverage: null,
        waterproof: null,
        vegan: false,
        crueltyFree: false
      },
      {
        name: 'Exfoliante Corporal St. Ives',
        sku: 'CC002',
        description: 'Exfoliante corporal con albaricoque',
        costPrice: 5.00,
        salePrice: 10.99,
        stockQuantity: 35,
        minStock: 7,
        categoryId: categories[5].id,
        images: 'https://via.placeholder.com/400x300/FFA07A/FFFFFF?text=Exfoliante',
        brand: 'St. Ives',
        shade: null,
        skinType: 'Todo tipo',
        ingredients: '["Agua", "Partículas de albaricoque", "Glicerina"]',
        volume: '283g',
        finish: null,
        coverage: null,
        waterproof: null,
        vegan: true,
        crueltyFree: true
      },
      {
        name: 'Aceite Corporal Bio-Oil',
        sku: 'CC003',
        description: 'Aceite especializado para cicatrices 125ml',
        costPrice: 15.00,
        salePrice: 28.99,
        stockQuantity: 25,
        minStock: 5,
        categoryId: categories[5].id,
        images: 'https://via.placeholder.com/400x300/FFE4B5/000000?text=Bio+Oil',
        brand: 'Bio-Oil',
        shade: null,
        skinType: 'Todo tipo',
        ingredients: '["PurCellin Oil", "Vitamina A", "Vitamina E", "Caléndula"]',
        volume: '125ml',
        finish: null,
        coverage: null,
        waterproof: null,
        vegan: false,
        crueltyFree: true
      },
      {
        name: 'Desodorante Dove',
        sku: 'CC004',
        description: 'Desodorante antitranspirante 48h',
        costPrice: 3.50,
        salePrice: 7.99,
        stockQuantity: 70,
        minStock: 14,
        categoryId: categories[5].id,
        images: 'https://via.placeholder.com/400x300/E6E6FA/000000?text=Desodorante',
        brand: 'Dove',
        shade: null,
        skinType: 'Sensible',
        ingredients: '["Aluminum Chlorohydrate", "Stearyl Alcohol", "Fragancia"]',
        volume: '150ml',
        finish: null,
        coverage: null,
        waterproof: null,
        vegan: false,
        crueltyFree: false
      },
      // Cuidado del Cabello
      {
        name: 'Shampoo Pantene',
        sku: 'CH001',
        description: 'Shampoo reparación total 400ml',
        costPrice: 6.00,
        salePrice: 12.99,
        stockQuantity: 45,
        minStock: 9,
        categoryId: categories[6].id,
        images: 'https://via.placeholder.com/400x300/FFD700/000000?text=Shampoo+Pantene',
        brand: 'Pantene',
        shade: null,
        skinType: null,
        ingredients: '["Agua", "Sulfatos", "Pro-Vitamina B5", "Vitamina E"]',
        volume: '400ml',
        finish: null,
        coverage: null,
        waterproof: null,
        vegan: false,
        crueltyFree: false
      },
      {
        name: 'Acondicionador TRESemmé',
        sku: 'CH002',
        description: 'Acondicionador hidratación intensa 400ml',
        costPrice: 6.50,
        salePrice: 13.99,
        stockQuantity: 40,
        minStock: 8,
        categoryId: categories[6].id,
        images: 'https://via.placeholder.com/400x300/87CEEB/FFFFFF?text=Acondicionador',
        brand: 'TRESemmé',
        shade: null,
        skinType: null,
        ingredients: '["Agua", "Cetyl Alcohol", "Glicerina", "Proteínas"]',
        volume: '400ml',
        finish: null,
        coverage: null,
        waterproof: null,
        vegan: false,
        crueltyFree: false
      },
      {
        name: 'Mascarilla Capilar Olaplex',
        sku: 'CH003',
        description: 'Tratamiento reparador intensivo 100ml',
        costPrice: 20.00,
        salePrice: 39.99,
        stockQuantity: 20,
        minStock: 4,
        categoryId: categories[6].id,
        images: 'https://via.placeholder.com/400x300/9370DB/FFFFFF?text=Olaplex',
        brand: 'Olaplex',
        shade: null,
        skinType: null,
        ingredients: '["Agua", "Bis-Aminopropyl Diglycol Dimaleate", "Phenoxyethanol"]',
        volume: '100ml',
        finish: null,
        coverage: null,
        waterproof: null,
        vegan: true,
        crueltyFree: true
      },
      {
        name: 'Aceite Capilar Moroccanoil',
        sku: 'CH004',
        description: 'Aceite de argán para cabello 100ml',
        costPrice: 25.00,
        salePrice: 49.99,
        stockQuantity: 15,
        minStock: 3,
        categoryId: categories[6].id,
        images: 'https://via.placeholder.com/400x300/DAA520/FFFFFF?text=Moroccanoil',
        brand: 'Moroccanoil',
        shade: null,
        skinType: null,
        ingredients: '["Aceite de Argán", "Linum Usitatissimum", "Parfum"]',
        volume: '100ml',
        finish: null,
        coverage: null,
        waterproof: null,
        vegan: false,
        crueltyFree: true
      },
      // Accesorios de Belleza
      {
        name: 'Set de Brochas Real Techniques',
        sku: 'AB001',
        description: 'Kit de 5 brochas para maquillaje',
        costPrice: 15.00,
        salePrice: 29.99,
        stockQuantity: 30,
        minStock: 6,
        categoryId: categories[7].id,
        images: 'https://via.placeholder.com/400x300/FF69B4/FFFFFF?text=Brochas',
        brand: 'Real Techniques',
        shade: null,
        skinType: 'Todo tipo',
        ingredients: '["Fibras sintéticas", "Aluminio", "Madera"]',
        volume: '5 piezas',
        finish: null,
        coverage: null,
        waterproof: null,
        vegan: true,
        crueltyFree: true
      },
      {
        name: 'Esponja Beauty Blender',
        sku: 'AB002',
        description: 'Esponja para aplicar base de maquillaje',
        costPrice: 8.00,
        salePrice: 16.99,
        stockQuantity: 50,
        minStock: 10,
        categoryId: categories[7].id,
        images: 'https://via.placeholder.com/400x300/FF1493/FFFFFF?text=Beauty+Blender',
        brand: 'Beauty Blender',
        shade: 'Rosa',
        skinType: 'Todo tipo',
        ingredients: '["Espuma de poliuretano libre de látex"]',
        volume: '1 pieza',
        finish: null,
        coverage: null,
        waterproof: null,
        vegan: true,
        crueltyFree: true
      },
      {
        name: 'Espejo de Maquillaje con Luz',
        sku: 'AB003',
        description: 'Espejo LED con aumento 10x',
        costPrice: 25.00,
        salePrice: 49.99,
        stockQuantity: 20,
        minStock: 4,
        categoryId: categories[7].id,
        images: 'https://via.placeholder.com/400x300/C0C0C0/000000?text=Espejo+LED',
        brand: 'Generic',
        shade: null,
        skinType: 'Todo tipo',
        ingredients: '["Vidrio", "LED", "Plástico ABS"]',
        volume: '1 pieza',
        finish: null,
        coverage: null,
        waterproof: null,
        vegan: null,
        crueltyFree: null
      },
      {
        name: 'Rizador de Pestañas Shu Uemura',
        sku: 'AB004',
        description: 'Rizador de pestañas profesional',
        costPrice: 12.00,
        salePrice: 24.99,
        stockQuantity: 25,
        minStock: 5,
        categoryId: categories[7].id,
        images: 'https://via.placeholder.com/400x300/708090/FFFFFF?text=Rizador',
        brand: 'Shu Uemura',
        shade: null,
        skinType: 'Todo tipo',
        ingredients: '["Acero inoxidable", "Silicona"]',
        volume: '1 pieza',
        finish: null,
        coverage: null,
        waterproof: null,
        vegan: null,
        crueltyFree: true
      }
    ];

    const createdProducts = [];
    for (const productData of products) {
      const product = await prisma.product.create({
        data: productData
      });
      
      // Create initial inventory movement for each product
      await prisma.inventoryMovement.create({
        data: {
          productId: product.id,
          type: "IN",
          quantity: product.stockQuantity,
          reason: 'Initial stock'
        }
      });
      
      createdProducts.push(product);
    }

    console.log(`✅ Created ${createdProducts.length} products with initial inventory`);

    // Create some purchases
    console.log('🛒 Creating sample purchases...');
    const purchases = [];
    
    // Purchase 1: Restock beverages
    const purchase1 = await prisma.purchase.create({
      data: {
        supplierId: suppliers[0].id,
        userId: users[0].id,
        total: 200.00
      }
    });
    
    await Promise.all([
      prisma.purchaseItem.create({
        data: {
          purchaseId: purchase1.id,
          productId: createdProducts[0].id, // Coca Cola
          quantity: 50,
          unitCost: 0.75
        }
      }),
      prisma.purchaseItem.create({
        data: {
          purchaseId: purchase1.id,
          productId: createdProducts[1].id, // Agua Mineral
          quantity: 100,
          unitCost: 0.45
        }
      })
    ]);
    
    purchases.push(purchase1);

    // Purchase 2: Electronics restock
    const purchase2 = await prisma.purchase.create({
      data: {
        supplierId: suppliers[1].id,
        userId: users[0].id,
        total: 1500.00
      }
    });
    
    await Promise.all([
      prisma.purchaseItem.create({
        data: {
          purchaseId: purchase2.id,
          productId: createdProducts[4].id, // Smartphone
          quantity: 5,
          unitCost: 240.00
        }
      }),
      prisma.purchaseItem.create({
        data: {
          purchaseId: purchase2.id,
          productId: createdProducts[5].id, // Auriculares
          quantity: 10,
          unitCost: 42.00
        }
      })
    ]);
    
    purchases.push(purchase2);

    console.log(`✅ Created ${purchases.length} purchases`);

    // Create some sales
    console.log('💰 Creating sample sales...');
    const sales = [];
    
    // Sale 1: Mixed items
    const sale1 = await prisma.sale.create({
      data: {
        userId: users[1].id, // Cashier
        customerId: customers[0].id,
        subtotal: 25.48,
        total: 25.48,
        paymentMethod: "CASH",
        discount: 0
      }
    });
    
    await Promise.all([
      prisma.saleItem.create({
        data: {
          saleId: sale1.id,
          productId: createdProducts[0].id, // Coca Cola
          quantity: 2,
          unitPrice: 1.50
        }
      }),
      prisma.saleItem.create({
        data: {
          saleId: sale1.id,
          productId: createdProducts[13].id, // Llavero
          quantity: 1,
          unitPrice: 5.99
        }
      }),
      prisma.saleItem.create({
        data: {
          saleId: sale1.id,
          productId: createdProducts[15].id, // Camiseta
          quantity: 1,
          unitPrice: 18.99
        }
      })
    ]);
    
    // Update stock and create inventory movements
    await Promise.all([
      prisma.product.update({
        where: { id: createdProducts[0].id },
        data: { stockQuantity: { decrement: 2 } }
      }),
      prisma.product.update({
        where: { id: createdProducts[13].id },
        data: { stockQuantity: { decrement: 1 } }
      }),
      prisma.product.update({
        where: { id: createdProducts[15].id },
        data: { stockQuantity: { decrement: 1 } }
      }),
      prisma.inventoryMovement.create({
        data: {
          productId: createdProducts[0].id,
          type: "OUT",
          quantity: 2,
          reason: 'Sale',
          referenceId: sale1.id
        }
      }),
      prisma.inventoryMovement.create({
        data: {
          productId: createdProducts[13].id,
          type: "OUT",
          quantity: 1,
          reason: 'Sale',
          referenceId: sale1.id
        }
      }),
      prisma.inventoryMovement.create({
        data: {
          productId: createdProducts[15].id,
          type: "OUT",
          quantity: 1,
          reason: 'Sale',
          referenceId: sale1.id
        }
      })
    ]);
    
    sales.push(sale1);

    // Sale 2: Electronics
    const sale2 = await prisma.sale.create({
      data: {
        userId: users[1].id, // Cashier
        customerId: customers[1].id,
        subtotal: 459.98,
        total: 459.98,
        paymentMethod: "CARD",
        discount: 5 // 5% discount
      }
    });
    
    await Promise.all([
      prisma.saleItem.create({
        data: {
          saleId: sale2.id,
          productId: createdProducts[4].id, // Smartphone
          quantity: 1,
          unitPrice: 399.99
        }
      }),
      prisma.saleItem.create({
        data: {
          saleId: sale2.id,
          productId: createdProducts[5].id, // Auriculares
          quantity: 1,
          unitPrice: 89.99
        }
      })
    ]);
    
    // Update stock and create inventory movements
    await Promise.all([
      prisma.product.update({
        where: { id: createdProducts[4].id },
        data: { stockQuantity: { decrement: 1 } }
      }),
      prisma.product.update({
        where: { id: createdProducts[5].id },
        data: { stockQuantity: { decrement: 1 } }
      }),
      prisma.inventoryMovement.create({
        data: {
          productId: createdProducts[4].id,
          type: "OUT",
          quantity: 1,
          reason: 'Sale',
          referenceId: sale2.id
        }
      }),
      prisma.inventoryMovement.create({
        data: {
          productId: createdProducts[5].id,
          type: "OUT",
          quantity: 1,
          reason: 'Sale',
          referenceId: sale2.id
        }
      })
    ]);
    
    sales.push(sale2);

    // Sale 3: Walk-in customer (no customer ID)
    const sale3 = await prisma.sale.create({
      data: {
        userId: users[1].id, // Cashier
        customerId: null, // Walk-in customer
        subtotal: 3.00,
        total: 3.00,
        paymentMethod: "CASH",
        discount: 0
      }
    });
    
    await prisma.saleItem.create({
      data: {
        saleId: sale3.id,
        productId: createdProducts[3].id, // Jugo de Naranja
        quantity: 1,
        unitPrice: 3.00
      }
    });
    
    await Promise.all([
      prisma.product.update({
        where: { id: createdProducts[3].id },
        data: { stockQuantity: { decrement: 1 } }
      }),
      prisma.inventoryMovement.create({
        data: {
          productId: createdProducts[3].id,
          type: "OUT",
          quantity: 1,
          reason: 'Sale',
          referenceId: sale3.id
        }
      })
    ]);
    
    sales.push(sale3);

    // Sale 4: Clothing
    const sale4 = await prisma.sale.create({
      data: {
        userId: users[0].id, // Admin
        customerId: customers[2].id,
        subtotal: 119.97,
        total: 119.97,
        paymentMethod: "CARD",
        discount: 0
      }
    });
    
    await Promise.all([
      prisma.saleItem.create({
        data: {
          saleId: sale4.id,
          productId: createdProducts[16].id, // Jeans
          quantity: 1,
          unitPrice: 49.99
        }
      }),
      prisma.saleItem.create({
        data: {
          saleId: sale4.id,
          productId: createdProducts[18].id, // Zapatillas
          quantity: 1,
          unitPrice: 69.99
        }
      })
    ]);
    
    await Promise.all([
      prisma.product.update({
        where: { id: createdProducts[16].id },
        data: { stockQuantity: { decrement: 1 } }
      }),
      prisma.product.update({
        where: { id: createdProducts[18].id },
        data: { stockQuantity: { decrement: 1 } }
      }),
      prisma.inventoryMovement.create({
        data: {
          productId: createdProducts[16].id,
          type: "OUT",
          quantity: 1,
          reason: 'Sale',
          referenceId: sale4.id
        }
      }),
      prisma.inventoryMovement.create({
        data: {
          productId: createdProducts[18].id,
          type: "OUT",
          quantity: 1,
          reason: 'Sale',
          referenceId: sale4.id
        }
      })
    ]);
    
    sales.push(sale4);

    // Sale 5: Home items
    const sale5 = await prisma.sale.create({
      data: {
        userId: users[1].id, // Cashier
        customerId: customers[3].id,
        subtotal: 73.96,
        total: 73.96,
        paymentMethod: "CASH",
        discount: 10 // 10% discount
      }
    });
    
    await Promise.all([
      prisma.saleItem.create({
        data: {
          saleId: sale5.id,
          productId: createdProducts[8].id, // Lámpara LED
          quantity: 1,
          unitPrice: 29.99
        }
      }),
      prisma.saleItem.create({
        data: {
          saleId: sale5.id,
          productId: createdProducts[9].id, // Cojín
          quantity: 2,
          unitPrice: 16.99
        }
      }),
      prisma.saleItem.create({
        data: {
          saleId: sale5.id,
          productId: createdProducts[10].id, // Vela
          quantity: 2,
          unitPrice: 12.99
        }
      })
    ]);
    
    await Promise.all([
      prisma.product.update({
        where: { id: createdProducts[8].id },
        data: { stockQuantity: { decrement: 1 } }
      }),
      prisma.product.update({
        where: { id: createdProducts[9].id },
        data: { stockQuantity: { decrement: 2 } }
      }),
      prisma.product.update({
        where: { id: createdProducts[10].id },
        data: { stockQuantity: { decrement: 2 } }
      }),
      prisma.inventoryMovement.create({
        data: {
          productId: createdProducts[8].id,
          type: "OUT",
          quantity: 1,
          reason: 'Sale',
          referenceId: sale5.id
        }
      }),
      prisma.inventoryMovement.create({
        data: {
          productId: createdProducts[9].id,
          type: "OUT",
          quantity: 2,
          reason: 'Sale',
          referenceId: sale5.id
        }
      }),
      prisma.inventoryMovement.create({
        data: {
          productId: createdProducts[10].id,
          type: "OUT",
          quantity: 2,
          reason: 'Sale',
          referenceId: sale5.id
        }
      })
    ]);
    
    sales.push(sale5);

    console.log(`✅ Created ${sales.length} sales with inventory movements`);

    // Create some inventory adjustments
    console.log('📊 Creating inventory adjustments...');
    await Promise.all([
      prisma.inventoryMovement.create({
        data: {
          productId: createdProducts[7].id, // Tablet
          type: "ADJUSTMENT",
          quantity: 2,
          reason: 'Damaged items removed from inventory'
        }
      }),
      prisma.product.update({
        where: { id: createdProducts[7].id },
        data: { stockQuantity: { decrement: 2 } }
      })
    ]);

    console.log('✅ Created inventory adjustments');

    console.log('\n🎉 Database seeded successfully!');
    console.log('\n📊 Summary:');
    console.log(`   👥 Users: ${users.length}`);
    console.log(`   📂 Categories: ${categories.length}`);
    console.log(`   🏢 Suppliers: ${suppliers.length}`);
    console.log(`   👤 Customers: ${customers.length}`);
    console.log(`   📦 Products: ${createdProducts.length}`);
    console.log(`   🛒 Purchases: ${purchases.length}`);
    console.log(`   💰 Sales: ${sales.length}`);
    console.log('\n🔐 Test Credentials:');
    console.log('   Admin: jeem101595@gmail.com');
    console.log('   Cashier: cashier@example.com');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });