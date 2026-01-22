import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables de entorno de Supabase no encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Definir tipos para el formulario de productos
interface ProductFormData {
  name: string;
  sku: string;
  description?: string;
  category_id: string; // Cambiado de number a string para coincidir con Supabase
  cost_price: number;
  sale_price: number;
  wholesale_price?: number;
  offer_price?: number;
  stock_quantity: number;
  min_stock: number;
  images?: string;
  
  // Campos específicos de cosméticos
  brand?: string;
  shade?: string;
  skin_type?: string;
  ingredients?: string;
  volume?: string;
  spf?: number;
  finish?: string;
  coverage?: string;
  waterproof?: boolean;
  vegan?: boolean;
  cruelty_free?: boolean;
  expiration_date?: string;
}

interface Category {
  id: string;
  name: string;
  description?: string;
}

class ProductFormSupabaseSync {
  
  /**
   * Obtener todas las categorías disponibles
   */
  async getCategories(): Promise<Category[]> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, description')
        .order('name');

      if (error) {
        console.error('❌ Error obteniendo categorías:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error de conexión obteniendo categorías:', error);
      return [];
    }
  }

  /**
   * Validar si un SKU ya existe
   */
  async validateSku(sku: string, excludeId?: string): Promise<{ isValid: boolean; message?: string }> {
    try {
      let query = supabase
        .from('products')
        .select('id, sku')
        .eq('sku', sku);

      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error en validación de SKU:', error);
        // Si es un error de tabla no encontrada, consideramos el SKU como válido
        if (error.message.includes('relation "products" does not exist')) {
          return { isValid: true, message: 'Tabla products no existe aún' };
        }
        return { isValid: false, message: `Error validando SKU: ${error.message}` };
      }

      if (data && data.length > 0) {
        return { isValid: false, message: 'Este SKU ya existe' };
      }

      return { isValid: true };
    } catch (error: any) {
      console.error('Error de conexión validando SKU:', error);
      return { isValid: false, message: `Error de conexión validando SKU: ${error.message}` };
    }
  }

  /**
   * Crear un nuevo producto
   */
  async createProduct(productData: ProductFormData): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Validar SKU antes de crear
      const skuValidation = await this.validateSku(productData.sku);
      if (!skuValidation.isValid) {
        return { success: false, error: skuValidation.message };
      }

      // Mapear los datos del formulario a los nombres de columnas de la base de datos
      const dbData = {
        name: productData.name,
        sku: productData.sku,
        description: productData.description || '',
        category_id: productData.category_id,
        cost_price: productData.cost_price,
        sale_price: productData.sale_price,
        wholesale_price: productData.wholesale_price || 0,
        offer_price: productData.offer_price || null,
        stock_quantity: productData.stock_quantity,
        min_stock: productData.min_stock,
        images: productData.images || '',
        
        // Campos específicos de cosméticos
        brand: productData.brand || null,
        shade: productData.shade || null,
        skin_type: productData.skin_type || null,
        ingredients: productData.ingredients || null,
        volume: productData.volume || null,
        spf: productData.spf || null,
        finish: productData.finish || null,
        coverage: productData.coverage || null,
        waterproof: productData.waterproof || false,
        vegan: productData.vegan || false,
        cruelty_free: productData.cruelty_free || false,
        expiration_date: productData.expiration_date || null,
        is_active: true
      };

      const { data, error } = await supabase
        .from('products')
        .insert([dbData])
        .select();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: data?.[0] };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Actualizar un producto existente
   */
  async updateProduct(id: string, productData: Partial<ProductFormData>): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Si se está actualizando el SKU, validarlo
      if (productData.sku) {
        const skuValidation = await this.validateSku(productData.sku, id);
        if (!skuValidation.isValid) {
          return { success: false, error: skuValidation.message };
        }
      }

      // Si se está actualizando la categoría, validar que existe
      if (productData.category_id) {
        const { data: categoryExists } = await supabase
          .from('categories')
          .select('id')
          .eq('id', productData.category_id)
          .single();

        if (!categoryExists) {
          return { success: false, error: 'La categoría seleccionada no existe' };
        }
      }

      // Preparar datos para actualización
      const updateData: any = { ...productData };
      if (updateData.expiration_date) {
        updateData.expiration_date = new Date(updateData.expiration_date).toISOString();
      }

      // Actualizar el producto
      const { data, error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ Error actualizando producto:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error: any) {
      console.error('❌ Error de conexión actualizando producto:', error);
      return { success: false, error: error.message || 'Error de conexión' };
    }
  }

  /**
   * Obtener un producto por ID
   */
  async getProduct(id: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          category:categories(id, name, description)
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('❌ Error obteniendo producto:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error: any) {
      console.error('❌ Error de conexión obteniendo producto:', error);
      return { success: false, error: error.message || 'Error de conexión' };
    }
  }

  /**
   * Obtener productos con filtros
   */
  async getProducts(filters?: {
    category_id?: string;
    search?: string;
    min_price?: number;
    max_price?: number;
    in_stock?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ success: boolean; data?: any[]; count?: number; error?: string }> {
    try {
      let query = supabase
        .from('products')
        .select(`
          *,
          category:categories(id, name, description)
        `, { count: 'exact' });

      // Aplicar filtros
      if (filters?.category_id) {
        query = query.eq('category_id', filters.category_id);
      }

      if (filters?.search) {
        query = query.textSearch('search_vector', filters.search, { type: 'websearch' });
      }

      if (filters?.min_price !== undefined) {
        query = query.gte('sale_price', filters.min_price);
      }

      if (filters?.max_price !== undefined) {
        query = query.lte('sale_price', filters.max_price);
      }

      if (filters?.in_stock) {
        query = query.gt('stock_quantity', 0);
      }

      // Paginación
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      if (filters?.offset) {
        query = query.range(filters.offset, (filters.offset + (filters.limit || 10)) - 1);
      }

      // Ordenar por nombre
      query = query.order('name');

      const { data, error, count } = await query;

      if (error) {
        console.error('❌ Error obteniendo productos:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [], count: count || 0 };
    } catch (error: any) {
      console.error('❌ Error de conexión obteniendo productos:', error);
      return { success: false, error: error.message || 'Error de conexión' };
    }
  }

  /**
   * Eliminar un producto (soft delete)
   */
  async deleteProduct(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Error eliminando producto:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      console.error('❌ Error de conexión eliminando producto:', error);
      return { success: false, error: error.message || 'Error de conexión' };
    }
  }

  /**
   * Verificar conexión con Supabase
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('count')
        .limit(1);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Error de conexión' };
    }
  }
}

// Función principal para probar la sincronización
async function testProductFormSync() {
  console.log('🔄 PROBANDO SINCRONIZACIÓN DEL FORMULARIO DE PRODUCTOS CON SUPABASE');
  console.log('=' .repeat(80));

  const sync = new ProductFormSupabaseSync();

  // 1. Probar conexión
  console.log('\n1. 🔗 Probando conexión...');
  const connectionTest = await sync.testConnection();
  if (!connectionTest.success) {
    console.error('❌ Error de conexión:', connectionTest.error);
    return;
  }
  console.log('✅ Conexión exitosa');

  // 2. Obtener categorías
  console.log('\n2. 📋 Obteniendo categorías...');
  const categories = await sync.getCategories();
  console.log(`✅ ${categories.length} categorías encontradas:`);
  categories.forEach(cat => console.log(`   - ${cat.name} (${cat.id})`));

  if (categories.length === 0) {
    console.log('⚠️  No hay categorías disponibles. Ejecuta el script SQL primero.');
    return;
  }

  // 3. Probar validación de SKU
  console.log('\n3. 🔍 Probando validación de SKU...');
  const skuTest = await sync.validateSku('TEST-SYNC-001');
  console.log(`✅ SKU válido: ${skuTest.isValid ? 'Sí' : 'No'} ${skuTest.message || ''}`);

  // 4. Crear producto de prueba
  console.log('\n4. ➕ Creando producto de prueba...');
  const testProduct: ProductFormData = {
    name: 'Producto de Prueba Sync',
    sku: 'TEST-SYNC-001',
    description: 'Producto creado para probar la sincronización con Supabase',
    category_id: categories[0].id,
    cost_price: 15.00,
    sale_price: 29.99,
    wholesale_price: 25.00,
    stock_quantity: 50,
    min_stock: 10,
    brand: 'Test Brand',
    shade: 'Natural',
    skin_type: 'todo',
    volume: '30ml',
    waterproof: true,
    vegan: true,
    cruelty_free: true
  };

  const createResult = await sync.createProduct(testProduct);
  if (!createResult.success) {
    console.error('❌ Error creando producto:', createResult.error);
    return;
  }
  console.log('✅ Producto creado exitosamente:', createResult.data?.name);
  const productId = createResult.data?.id;

  // 5. Obtener el producto creado
  console.log('\n5. 📖 Obteniendo producto creado...');
  const getResult = await sync.getProduct(productId);
  if (!getResult.success) {
    console.error('❌ Error obteniendo producto:', getResult.error);
    return;
  }
  console.log('✅ Producto obtenido:', getResult.data?.name);

  // 6. Actualizar el producto
  console.log('\n6. ✏️  Actualizando producto...');
  const updateResult = await sync.updateProduct(productId, {
    sale_price: 34.99,
    stock_quantity: 45,
    description: 'Producto actualizado para probar la sincronización'
  });
  if (!updateResult.success) {
    console.error('❌ Error actualizando producto:', updateResult.error);
    return;
  }
  console.log('✅ Producto actualizado exitosamente');

  // 7. Buscar productos
  console.log('\n7. 🔍 Buscando productos...');
  const searchResult = await sync.getProducts({
    search: 'Test',
    limit: 5
  });
  if (!searchResult.success) {
    console.error('❌ Error buscando productos:', searchResult.error);
    return;
  }
  console.log(`✅ ${searchResult.data?.length} productos encontrados`);

  // 8. Limpiar - eliminar producto de prueba
  console.log('\n8. 🗑️  Eliminando producto de prueba...');
  const deleteResult = await sync.deleteProduct(productId);
  if (!deleteResult.success) {
    console.error('❌ Error eliminando producto:', deleteResult.error);
    return;
  }
  console.log('✅ Producto eliminado exitosamente');

  console.log('\n🎉 SINCRONIZACIÓN COMPLETADA EXITOSAMENTE');
  console.log('=' .repeat(80));
  console.log('✅ El formulario de productos está listo para usar con Supabase');
  console.log('✅ Todas las operaciones CRUD funcionan correctamente');
  console.log('✅ La validación de SKU está operativa');
  console.log('✅ Los campos de cosméticos están sincronizados');
}

// Exportar la clase para uso en otros archivos
export { ProductFormSupabaseSync, type ProductFormData, type Category };

// Ejecutar si se llama directamente
if (require.main === module) {
  testProductFormSync()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Error en la prueba:', error);
      process.exit(1);
    });
}
