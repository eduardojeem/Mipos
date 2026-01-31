import { createClient } from '@/lib/supabase';
import type { 
  Product, 
  Category, 
  Customer, 
  Supplier,
  CreateProductData,
  UpdateProductData,
  CreateCategoryData,
  UpdateCategoryData,
  CreateCustomerData,
  UpdateCustomerData,
  ProductFilters
} from '@/types/supabase';

const supabase = createClient();
const pickRel = (err: any, target: string): string | null => {
  const det = err?.details;
  let cands: string[] = [];
  if (Array.isArray(det)) {
    cands = det.map((x: any) => typeof x === 'string' ? x : (x?.relationship || x?.name || x?.constraint || x?.to || ''))
      .filter((s: any) => !!s);
  }
  const hint: string = String(err?.hint || '');
  const m = hint.match(/one of the following:(.*)/i);
  if (m && m[1]) {
    cands = cands.concat(String(m[1]).split(/[\n,]+/).map((s: string) => s.trim()).filter(Boolean));
  }
  cands = cands.filter((s: string) => s.toLowerCase().includes(target.toLowerCase()));
  return cands[0] || null;
};

// ============================================================================
// PRODUCTOS
// ============================================================================

export const productService = {
  async getAll(filters?: ProductFilters) {

    let query = supabase
      .from('products')
      .select(`
        *,
        category:categories!products_category_id_fkey(*)
      `)
      .eq('is_active', true);

    try {
      if (typeof window !== 'undefined') {
        const raw = window.localStorage.getItem('selected_organization');
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            const orgId = parsed?.id || parsed?.organization_id || raw;
            if (orgId) query = query.eq('organization_id', orgId);
          } catch {
            const orgId = raw;
            if (orgId) query = query.eq('organization_id', orgId);
          }
        }
      }
    } catch {}

    if (filters?.category_id) {
      query = query.eq('category_id', filters.category_id);
    }

    if (filters?.supplier_id) {
      query = query.eq('supplier_id', filters.supplier_id);
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

    if (filters?.min_stock !== undefined) {
      query = query.gte('stock_quantity', filters.min_stock);
    }

    if (filters?.max_stock !== undefined) {
      query = query.lte('stock_quantity', filters.max_stock);
    }

    const page = Number(filters?.page || 1) || 1;
    const limit = Number(filters?.limit || 50) || 50;
    const sort = String(filters?.sort || 'updated_at');
    const orderAsc = String(filters?.order || 'desc').toLowerCase() === 'asc';
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let { data, error } = await query.order(sort, { ascending: orderAsc }).range(from, to);

    if (error && (((error as any)?.code === 'PGRST200') || ((error as any)?.code === '42501') || ((error as any)?.code === 'PGRST201'))) {
      const relCat = pickRel(error, 'categories');
      const relSup = pickRel(error, 'suppliers');
      let fb = supabase
        .from('products')
        .select(`
          *,
          category:categories${relCat ? `!${relCat}` : '!products_category_id_fkey'}(*)${relSup ? `, supplier:suppliers!${relSup}(*)` : ''}
        `)
        .eq('is_active', true);
      if (filters?.category_id) {
        fb = fb.eq('category_id', filters.category_id);
      }
      if (filters?.supplier_id) {
        fb = fb.eq('supplier_id', filters.supplier_id);
      }
      if (filters?.search) {
        fb = fb.or(`name.ilike.%${filters.search}%,sku.ilike.%${filters.search}%,barcode.ilike.%${filters.search}%`);
      }
      if (filters?.min_price !== undefined) {
        fb = fb.gte('sale_price', filters.min_price);
      }
      if (filters?.max_price !== undefined) {
        fb = fb.lte('sale_price', filters.max_price);
      }
      if (filters?.min_stock !== undefined) {
        fb = fb.gte('stock_quantity', filters.min_stock);
      }
      if (filters?.max_stock !== undefined) {
        fb = fb.lte('stock_quantity', filters.max_stock);
      }
      const r = await fb.order(sort, { ascending: orderAsc }).range(from, to);
      data = r.data;
      error = r.error;
    }
    return { data: data as Product[], error };
  },

  async getById(id: string) {
    let base = supabase
      .from('products')
      .select(`
        *,
        category:categories!products_category_id_fkey(*)
      `)
      .eq('id', id);

    try {
      if (typeof window !== 'undefined') {
        const raw = window.localStorage.getItem('selected_organization');
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            const orgId = parsed?.id || parsed?.organization_id || raw;
            if (orgId) base = base.eq('organization_id', orgId);
          } catch {
            const orgId = raw;
            if (orgId) base = base.eq('organization_id', orgId);
          }
        }
      }
    } catch {}

    let { data, error } = await base.single();

    if (error) {
      console.error('Error fetching product by id:', {
        message: (error as any)?.message,
        code: (error as any)?.code,
        details: (error as any)?.details,
        hint: (error as any)?.hint
      });
      if (((error as any)?.code === 'PGRST200') || ((error as any)?.code === '42501') || ((error as any)?.code === 'PGRST201')) {
        const relCat = pickRel(error, 'categories');
        const relSup = pickRel(error, 'suppliers');
        const r = await supabase
          .from('products')
          .select(`
            *,
            category:categories${relCat ? `!${relCat}` : '!products_category_id_fkey'}(*)${relSup ? `, supplier:suppliers!${relSup}(*)` : ''}
          `)
          .eq('id', id)
          .single();
        data = r.data as any;
        error = r.error as any;
      }
    }

    return { data: data as Product, error };
  },

  async create(productData: CreateProductData) {
    const { data, error } = await supabase
      .from('products')
      .insert(productData)
      .select()
      .single();

    if (error) {
      console.error('Error creating product (utils):', {
        message: (error as any)?.message,
        code: (error as any)?.code,
        details: (error as any)?.details,
        hint: (error as any)?.hint
      });
    }

    return { data: data as Product, error };
  },

  async update(id: string, productData: UpdateProductData) {
    const { data, error } = await supabase
      .from('products')
      .update(productData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating product (utils):', {
        message: (error as any)?.message,
        code: (error as any)?.code,
        details: (error as any)?.details,
        hint: (error as any)?.hint
      });
    }

    return { data: data as Product, error };
  },

  async delete(id: string) {
    const { data, error } = await supabase
      .from('products')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error deleting product (utils):', {
        message: (error as any)?.message,
        code: (error as any)?.code,
        details: (error as any)?.details,
        hint: (error as any)?.hint
      });
    }

    return { data: data as Product, error };
  },

  async getLowStock(threshold?: number) {
    const minStock = threshold || 10;
    let { data, error } = await supabase
      .from('products')
      .select(`
        *,
        category:categories!products_category_id_fkey(*)
      `)
      .lte('stock_quantity', minStock)
      .eq('is_active', true)
      .order('stock_quantity');

    if (error) {
      console.error('Error fetching low stock products:', {
        message: (error as any)?.message,
        code: (error as any)?.code,
        details: (error as any)?.details,
        hint: (error as any)?.hint
      });
      if ((error as any)?.code === 'PGRST200' || (error as any)?.code === 'PGRST201') {
        const relCat = pickRel(error, 'categories');
        const relSup = pickRel(error, 'suppliers');
        const r = await supabase
          .from('products')
          .select(`
            *,
            category:categories${relCat ? `!${relCat}` : '!products_category_id_fkey'}(*)${relSup ? `, supplier:suppliers!${relSup}(*)` : ''}
          `)
          .lte('stock_quantity', minStock)
          .eq('is_active', true)
          .order('stock_quantity');
        data = r.data as any;
        error = r.error as any;
      }
    }

    return { data: data as Product[], error };
  }
};

// ============================================================================
// CATEGORÍAS
// ============================================================================

export const categoryService = {
  async getAll() {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('name');

    return { data: data as Category[], error };
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .single();

    return { data: data as Category, error };
  },

  async create(categoryData: CreateCategoryData) {
    const { data, error } = await supabase
      .from('categories')
      .insert(categoryData)
      .select()
      .single();

    return { data: data as Category, error };
  },

  async update(id: string, categoryData: UpdateCategoryData) {
    const { data, error } = await supabase
      .from('categories')
      .update(categoryData)
      .eq('id', id)
      .select()
      .single();

    return { data: data as Category, error };
  },

  async delete(id: string) {
    const { data, error } = await supabase
      .from('categories')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single();

    return { data: data as Category, error };
  }
};

// ============================================================================
// CLIENTES
// ============================================================================

export const customerService = {
  async getAll() {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching customers:', {
        message: (error as any)?.message,
        code: (error as any)?.code,
        details: (error as any)?.details,
        hint: (error as any)?.hint
      });
    }

    return { data: data as Customer[], error };
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();

    return { data: data as Customer, error };
  },

  async create(customerData: CreateCustomerData) {
    const { data, error } = await supabase
      .from('customers')
      .insert(customerData)
      .select()
      .single();

    return { data: data as Customer, error };
  },

  async update(id: string, customerData: UpdateCustomerData) {
    const { data, error } = await supabase
      .from('customers')
      .update(customerData)
      .eq('id', id)
      .select()
      .single();

    return { data: data as Customer, error };
  },

  async delete(id: string) {
    const { data, error } = await supabase
      .from('customers')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single();

    return { data: data as Customer, error };
  }
};

// ============================================================================
// PROVEEDORES
// ============================================================================

export const supplierService = {
  async getAll() {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching suppliers:', {
        message: (error as any)?.message,
        code: (error as any)?.code,
        details: (error as any)?.details,
        hint: (error as any)?.hint
      });
    }

    return { data: data as Supplier[], error };
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .single();

    return { data: data as Supplier, error };
  },

  async create(supplierData: any) {
    const { data, error } = await supabase
      .from('suppliers')
      .insert(supplierData)
      .select()
      .single();

    return { data: data as Supplier, error };
  },

  async update(id: string, supplierData: any) {
    const { data, error } = await supabase
      .from('suppliers')
      .update(supplierData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating supplier:', {
        message: (error as any)?.message,
        code: (error as any)?.code,
        details: (error as any)?.details,
        hint: (error as any)?.hint
      });
    }

    return { data: data as Supplier, error };
  },

  async delete(id: string) {
    const { data, error } = await supabase
      .from('suppliers')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error deleting supplier:', {
        message: (error as any)?.message,
        code: (error as any)?.code,
        details: (error as any)?.details,
        hint: (error as any)?.hint
      });
    }

    return { data: data as Supplier, error };
  }
};

// ============================================================================
// UTILIDADES GENERALES
// ============================================================================

export const supabaseUtils = {
  // Verificar conexión
  async testConnection() {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('count')
        .limit(1);

      return { connected: !error, error };
    } catch (err) {
      return { connected: false, error: err };
    }
  },

  // Obtener estadísticas generales
  async getStats() {
    try {
      const [productsResult, categoriesResult, customersResult] = await Promise.all([
        supabase.from('products').select('count').eq('is_active', true),
        supabase.from('categories').select('count').eq('is_active', true),
        supabase.from('customers').select('count').eq('is_active', true)
      ]);

      return {
        products: productsResult.data?.[0]?.count || 0,
        categories: categoriesResult.data?.[0]?.count || 0,
        customers: customersResult.data?.[0]?.count || 0,
        error: null
      };
    } catch (error) {
      return {
        products: 0,
        categories: 0,
        customers: 0,
        error
      };
    }
  }
};
