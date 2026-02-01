
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const TARGET_EMAIL = 'bfjeem@gmail.com';

async function main() {
  console.log(`🚀 Seeding data for ${TARGET_EMAIL}...`);

  // 1. Get User and Organization
  console.log('🔍 Finding user and organization...');
  const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
  
  if (userError) throw userError;
  const user = users.find(u => u.email?.toLowerCase() === TARGET_EMAIL.toLowerCase());

  if (!user) {
    console.error(`❌ User ${TARGET_EMAIL} not found. Please run setup-pro-user.ts first.`);
    process.exit(1);
  }

  // Find organization via user metadata or querying members
  let orgId = user.user_metadata?.organization_id;
  
  if (!orgId) {
    // Try to find in members
    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();
    
    if (member) orgId = member.organization_id;
  }

  if (!orgId) {
    console.error(`❌ User ${TARGET_EMAIL} has no organization. Run setup-pro-user.ts.`);
    process.exit(1);
  }

  console.log(`✅ Found User: ${user.id}`);
  console.log(`✅ Found Org: ${orgId}`);

  // 2. Insert Categories
  console.log('\n📦 Seeding Categories...');
  const categoriesData = [
    { name: 'Electrónica', description: 'Gadgets y dispositivos', organization_id: orgId },
    { name: 'Ropa', description: 'Moda y accesorios', organization_id: orgId },
    { name: 'Hogar', description: 'Muebles y decoración', organization_id: orgId },
    { name: 'Alimentos', description: 'Comestibles y bebidas', organization_id: orgId }
  ];

  const categories = [];
  for (const cat of categoriesData) {
    // Check if exists first
    const { data: existing } = await supabase
        .from('categories')
        .select()
        .eq('name', cat.name)
        .eq('organization_id', orgId)
        .single();
    
    if (existing) {
        categories.push(existing);
        continue;
    }

    const { data, error } = await supabase
      .from('categories')
      .insert(cat)
      .select()
      .single();
    
    if (error) {
        console.error(`Error inserting category ${cat.name}:`, error.message);
    } else if (data) {
        categories.push(data);
    }
  }
  console.log(`✅ ${categories.length} Categories ready.`);

  // 3. Insert Suppliers
  console.log('\n🚛 Seeding Suppliers...');
  const suppliersData = [
    { name: 'Proveedor Local SA', email: 'contacto@local.com', phone: '0981111111', organization_id: orgId },
    { name: 'Importadora Global', email: 'ventas@global.com', phone: '0971222222', organization_id: orgId },
    { name: 'Distribuidora Express', email: 'pedidos@express.com', phone: '0961333333', organization_id: orgId }
  ];

  const suppliers = [];
  for (const sup of suppliersData) {
    const { data, error } = await supabase.from('suppliers').insert(sup).select().single();
    if (!error) suppliers.push(data);
    else if (error.code === '23505') {
       const { data: existing } = await supabase.from('suppliers').select().eq('name', sup.name).eq('organization_id', orgId).single();
       if (existing) suppliers.push(existing);
    }
  }
  console.log(`✅ ${suppliers.length} Suppliers ready.`);

  // 4. Insert Products
  console.log('\n🏷️ Seeding Products...');
  const productsData = [
    { name: 'Smartphone X', sale_price: 500, cost_price: 300, stock_quantity: 50, min_stock: 5, category_name: 'Electrónica' },
    { name: 'Laptop Pro', sale_price: 1200, cost_price: 900, stock_quantity: 20, min_stock: 2, category_name: 'Electrónica' },
    { name: 'Camiseta Básica', sale_price: 20, cost_price: 8, stock_quantity: 100, min_stock: 10, category_name: 'Ropa' },
    { name: 'Jeans Denim', sale_price: 45, cost_price: 20, stock_quantity: 60, min_stock: 5, category_name: 'Ropa' },
    { name: 'Cafetera Auto', sale_price: 80, cost_price: 50, stock_quantity: 15, min_stock: 3, category_name: 'Hogar' },
    { name: 'Juego de Sábanas', sale_price: 35, cost_price: 15, stock_quantity: 30, min_stock: 5, category_name: 'Hogar' },
    { name: 'Pack Refrescos', sale_price: 10, cost_price: 6, stock_quantity: 200, min_stock: 20, category_name: 'Alimentos' },
    { name: 'Caja Chocolates', sale_price: 15, cost_price: 9, stock_quantity: 80, min_stock: 10, category_name: 'Alimentos' }
  ];

  const products = [];
  for (const p of productsData) {
    const cat = categories.find(c => c.name === p.category_name);
    if (!cat) continue;

    const payload = {
        name: p.name,
        sale_price: p.sale_price,
        cost_price: p.cost_price,
        stock_quantity: p.stock_quantity,
        min_stock: p.min_stock,
        category_id: cat.id,
        organization_id: orgId,
        is_active: true,
        sku: `SKU-${Math.floor(Math.random() * 10000)}`
    };

    const { data, error } = await supabase.from('products').insert(payload).select().single();
    if (!error) products.push(data);
    else console.error(`Error inserting product ${p.name}:`, error.message);
  }
  console.log(`✅ ${products.length} Products ready.`);

  // 5. Insert Customers
  console.log('\n👥 Seeding Customers...');
  const customersData = [
    { name: 'Juan Pérez', email: 'juan@test.com', phone: '0991111111', organization_id: orgId },
    { name: 'Maria Gómez', email: 'maria@test.com', phone: '0992222222', organization_id: orgId },
    { name: 'Carlos López', email: 'carlos@test.com', phone: '0993333333', organization_id: orgId },
    { name: 'Ana Torres', email: 'ana@test.com', phone: '0994444444', organization_id: orgId },
    { name: 'Cliente Ocasional', email: null, phone: null, organization_id: orgId }
  ];

  const customers = [];
  for (const c of customersData) {
    const { data, error } = await supabase.from('customers').insert(c).select().single();
    if (!error) customers.push(data);
    else if (error.code === '23505') {
       const { data: existing } = await supabase.from('customers').select().eq('name', c.name).eq('organization_id', orgId).single();
       if (existing) customers.push(existing);
    }
  }
  console.log(`✅ ${customers.length} Customers ready.`);

  // 6. Insert Cash Sessions (Closed)
  console.log('\n💵 Seeding Cash Sessions...');
  // Create a closed session for yesterday
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const openTime = new Date(yesterday);
  openTime.setHours(8, 0, 0);
  const closeTime = new Date(yesterday);
  closeTime.setHours(20, 0, 0);

  const { data: session, error: sessError } = await supabase
    .from('cash_sessions')
    .insert({
        user_id: user.id,
        opened_by: user.id,
        closed_by: user.id,
        opening_amount: 100000,
        closing_amount: 500000, // Arbitrary
        status: 'CLOSED',
        opening_time: openTime.toISOString(),
        closing_time: closeTime.toISOString(),
        notes: 'Cierre de ayer (Demo)',
        organization_id: orgId
    })
    .select()
    .single();
  
  if (sessError) console.error('Error creating session:', sessError.message);
  else console.log(`✅ Closed Session created: ${session.id}`);

  // 7. Insert Sales (Linked to session if possible, or just historical)
  console.log('\n🛒 Seeding Sales...');
  if (products.length > 0 && customers.length > 0) {
      const numSales = 20;
      for (let i = 0; i < numSales; i++) {
          const customer = customers[Math.floor(Math.random() * customers.length)];
          const numItems = Math.floor(Math.random() * 3) + 1;
          let totalAmount = 0;
          const items = [];

          for (let j = 0; j < numItems; j++) {
              const prod = products[Math.floor(Math.random() * products.length)];
              const qty = Math.floor(Math.random() * 2) + 1;
              const price = Number(prod.sale_price);
              const subtotal = price * qty;
              totalAmount += subtotal;
              items.push({
                  product_id: prod.id,
                  quantity: qty,
                  unit_price: price
              });
          }

          // Random date within last 30 days
          const date = new Date();
          date.setDate(date.getDate() - Math.floor(Math.random() * 30));

          const { data: sale, error: saleError } = await supabase
            .from('sales')
            .insert({
                customer_id: customer.id,
                user_id: user.id,
                total_amount: totalAmount,
                status: 'COMPLETED',
                payment_method: ['CASH', 'CARD', 'QR'][Math.floor(Math.random() * 3)],
                created_at: date.toISOString(),
                organization_id: orgId
            })
            .select()
            .single();

          if (!saleError && sale) {
              const itemsWithSaleId = items.map(it => ({ ...it, sale_id: sale.id }));
              await supabase.from('sale_items').insert(itemsWithSaleId);
          }
      }
      console.log(`✅ ${numSales} Sales created.`);
  }

  // 8. Insert Loyalty Program
  console.log('\n💎 Seeding Loyalty Program...');
  const { error: loyaltyError } = await supabase
    .from('loyalty_programs')
    .insert({
        name: 'Cliente VIP',
        description: 'Programa de puntos para clientes frecuentes',
        points_per_purchase: 1, // 1 point per currency unit
        minimum_purchase: 10,
        organization_id: orgId,
        is_active: true
    });
  
  if (loyaltyError) console.error('Error creating loyalty program:', loyaltyError.message);
  else console.log('✅ Loyalty Program created.');

  console.log('\n✨ Seeding completed successfully!');
}

main().catch(console.error);
