import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Supabase-based database operations that mimic Prisma interface
export class SupabasePrismaAdapter {
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.warn('Missing Supabase environment variables. Adapter will fail on requests.');
      // Don't throw here to allow app to start, but subsequent calls will fail if client isn't created.
      // We'll create a dummy client or let it fail later.
    }
    
    // @ts-ignore
    this.supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;
  }

  // Helper method to map Prisma field names to database column names
  private mapPrismaFieldToDbColumn(prismaField: string): string {
    const fieldMapping: { [key: string]: string } = {
      // Customer fields
      'isActive': 'is_active',
      'customerType': 'customer_type',
      'customerCode': 'customer_code',
      'birthDate': 'birth_date',
      'createdAt': 'created_at',
      'updatedAt': 'updated_at',
      'taxId': 'tax_id',
      'totalPurchases': 'total_purchases',
      'lastPurchase': 'last_purchase',
      
      // Inventory fields
      'categoryId': 'category_id',
      'supplierId': 'supplier_id',
      'productCode': 'product_code',
      'costPrice': 'cost_price',
      'salePrice': 'sale_price',
      'minStock': 'min_stock',
      'maxStock': 'max_stock',
      'currentStock': 'current_stock',
      'referenceId': 'reference_id',
      
      // Sale Item fields
      'saleId': 'sale_id',
      'unitPrice': 'unit_price',
      
      // User fields
      'firstName': 'first_name',
      'lastName': 'last_name',
      'phoneNumber': 'phone_number',
      'dateOfBirth': 'date_of_birth',
      'profilePicture': 'profile_picture',
      'lastLogin': 'last_login',
      
      // Sale fields
      'customerId': 'customer_id',
      'userId': 'user_id',
      'date': 'created_at', // Map Prisma 'date' field to database 'created_at' column
      'saleDate': 'sale_date',
      'totalAmount': 'total_amount',
      'discountAmount': 'discount_amount',
      'taxAmount': 'tax_amount',
      'paymentMethod': 'payment_method',
      'paymentStatus': 'payment_status',
      
      // Additional inventory aliases
      'stockQuantity': 'current_stock',
      
      // Returns fields
      'originalSaleId': 'original_sale_id',
      'refundMethod': 'refund_method',
      'returnId': 'return_id',
      'originalSaleItemId': 'original_sale_item_id',
      
      // Cash management fields
      'openedBy': 'opened_by',
      'closedBy': 'closed_by',
      'openedAt': 'opened_at',
      'closedAt': 'closed_at',
      'openingAmount': 'opening_amount',
      'closingAmount': 'closing_amount',
      'systemExpected': 'system_expected',
      'discrepancyAmount': 'discrepancy_amount',
      'sessionId': 'session_id',
      'reportedBy': 'reported_by',
      'createdBy': 'created_by',
      'referenceType': 'reference_type',
      
      // Add more mappings as needed
    };
    
    return fieldMapping[prismaField] || prismaField;
  }

  // Helper to map an object with Prisma-style keys to DB column names
  private mapDataToDb<T extends Record<string, any>>(data: T): T {
    const mapped: Record<string, any> = {};
    Object.keys(data || {}).forEach((key) => {
      const dbKey = this.mapPrismaFieldToDbColumn(key);
      mapped[dbKey] = data[key];
    });
    return mapped as T;
  }

  // Categories operations
  category = {
    findMany: async (options?: { where?: any; select?: any; orderBy?: any; include?: any; skip?: number; take?: number }) => {
      if (!this.supabase) throw new Error('Supabase client not initialized');
      let query = this.supabase.from('categories').select('*');
      
      if (options?.where) {
        Object.entries(options.where).forEach(([key, value]) => {
          if (key === 'OR' && Array.isArray(value)) {
            // Build OR query string: "name.ilike.%search%,description.ilike.%search%"
            const orParts: string[] = [];
            value.forEach((cond: any) => {
              Object.entries(cond).forEach(([k, v]: [string, any]) => {
                const dbK = this.mapPrismaFieldToDbColumn(k);
                if (typeof v === 'object' && v !== null && 'contains' in v) {
                  orParts.push(`${dbK}.ilike.%${v.contains}%`);
                } else if (typeof v === 'object' && v !== null && 'mode' in v) {
                  // Skip mode, handled by ilike/like choice usually
                } else {
                  orParts.push(`${dbK}.eq.${v}`);
                }
              });
            });
            if (orParts.length > 0) {
              query = query.or(orParts.join(','));
            }
          } else if (key === 'name' || key === 'description') {
             // Handle direct filters if any
             if (typeof value === 'object' && value !== null && 'contains' in value) {
                query = query.ilike(key, `%${(value as any).contains}%`);
             } else {
                query = query.eq(key, value);
             }
          } else {
            query = query.eq(key, value);
          }
        });
      }
      
      if (options?.orderBy) {
        const orderField = Object.keys(options.orderBy)[0];
        const orderDirection = options.orderBy[orderField];
        const dbOrderField = this.mapPrismaFieldToDbColumn(orderField);
        query = query.order(dbOrderField, { ascending: orderDirection === 'asc' });
      }

      if (options?.skip !== undefined) {
        query = query.range(options.skip, options.skip + (options.take || 20) - 1);
      } else if (options?.take !== undefined) {
        query = query.limit(options.take);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('SupabaseAdapter.category.findMany error:', error);
        throw new Error(`Database query failed: ${error.message}`);
      }

      let categories = data || [];

      // Handle include with _count for products
      if (options?.include?._count?.select?.products) {
        const categoriesWithCount = await Promise.all(
          categories.map(async (category) => {
            const { count, error: countError } = await this.supabase
              .from('products')
              .select('*', { count: 'exact', head: true })
              .eq('category_id', category.id);
            
            if (countError) {
              console.warn(`Failed to count products for category ${category.id}:`, countError);
            }
            
            return {
              ...category,
              _count: {
                products: count || 0
              }
            };
          })
        );
        return categoriesWithCount;
      }
      
      return categories;
    },

    findUnique: async (options: { where: { id: string }; include?: any; select?: any }) => {
      if (!this.supabase) throw new Error('Supabase client not initialized');
      const { data, error } = await this.supabase
        .from('categories')
        .select('*')
        .eq('id', options.where.id)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        throw new Error(`Database query failed: ${error.message}`);
      }
      
      if (!data) return null;

      let result: any = { ...data };

      // Handle include: products list
      if (options.include?.products) {
        const prodSelect = options.include.products.select;
        const orderBy = options.include.products.orderBy;
        let query = this.supabase
          .from('products')
          .select('*')
          .eq('category_id', data.id);
        if (orderBy) {
          const field = Object.keys(orderBy)[0];
          const dir = orderBy[field];
          const dbField = this.mapPrismaFieldToDbColumn(field);
          query = query.order(dbField, { ascending: dir === 'asc' });
        }
        const { data: productsData } = await query;
        let products = productsData || [];
        if (prodSelect) {
          products = products.map((p: any) => {
            const projected: any = {};
            Object.keys(prodSelect).forEach((key: string) => {
              if (prodSelect[key]) {
                projected[key] = p[this.mapPrismaFieldToDbColumn(key)] ?? p[key];
              }
            });
            return projected;
          });
        }
        result.products = products;
      }

      // Handle include: _count.products
      if (options.include?._count?.select?.products) {
        const { count } = await this.supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('category_id', data.id);
        result._count = { products: count || 0 };
      }

      // Handle select on category fields
      if (options.select) {
        const projected: any = {};
        Object.keys(options.select).forEach((key: string) => {
          if (options.select[key]) {
            projected[key] = data[this.mapPrismaFieldToDbColumn(key)] ?? data[key];
          }
        });
        // Preserve included relations if any
        if (result.products !== undefined) projected.products = result.products;
        if (result._count !== undefined) projected._count = result._count;
        result = projected;
      }

      return result;
    },

    create: async (options: { data: any; include?: any; select?: any }) => {
      const { data, error } = await this.supabase
        .from('categories')
        .insert(options.data)
        .select()
        .single();
      
      if (error) {
        throw new Error(`Database insert failed: ${error.message}`);
      }
      let result: any = data;

      // Handle include: _count.products
      if (options.include?._count?.select?.products) {
        const { count } = await this.supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('category_id', data.id);
        result = { ...result, _count: { products: count || 0 } };
      }

      // Handle select
      if (options.select) {
        const projected: any = {};
        Object.keys(options.select).forEach((key: string) => {
          if (options.select[key]) {
            projected[key] = result[this.mapPrismaFieldToDbColumn(key)] ?? result[key];
          }
        });
        if (result._count !== undefined) projected._count = result._count;
        result = projected;
      }

      return result;
    },

    update: async (options: { where: { id: string }; data: any; include?: any; select?: any }) => {
      const { data, error } = await this.supabase
        .from('categories')
        .update(options.data)
        .eq('id', options.where.id)
        .select()
        .single();
      
      if (error) {
        throw new Error(`Database update failed: ${error.message}`);
      }
      let result: any = data;

      // Handle include: _count.products
      if (options.include?._count?.select?.products) {
        const { count } = await this.supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('category_id', data.id);
        result = { ...result, _count: { products: count || 0 } };
      }

      // Handle select
      if (options.select) {
        const projected: any = {};
        Object.keys(options.select).forEach((key: string) => {
          if (options.select[key]) {
            projected[key] = result[this.mapPrismaFieldToDbColumn(key)] ?? result[key];
          }
        });
        if (result._count !== undefined) projected._count = result._count;
        result = projected;
      }

      return result;
    },

    delete: async (options: { where: { id: string } }) => {
      const { data, error } = await this.supabase
        .from('categories')
        .delete()
        .eq('id', options.where.id)
        .select()
        .single();
      
      if (error) {
        throw new Error(`Database delete failed: ${error.message}`);
      }
      
      return data;
    },

    count: async (options?: { where?: any }) => {
      if (!this.supabase) throw new Error('Supabase client not initialized');
      let query = this.supabase.from('categories').select('*', { count: 'exact', head: true });
      
      if (options?.where) {
        Object.entries(options.where).forEach(([key, value]) => {
          if (key === 'OR' && Array.isArray(value)) {
            const orParts: string[] = [];
            value.forEach((cond: any) => {
              Object.entries(cond).forEach(([k, v]: [string, any]) => {
                const dbK = this.mapPrismaFieldToDbColumn(k);
                if (typeof v === 'object' && v !== null && 'contains' in v) {
                  orParts.push(`${dbK}.ilike.%${v.contains}%`);
                } else if (typeof v === 'object' && v !== null && 'mode' in v) {
                  // Skip mode
                } else {
                  orParts.push(`${dbK}.eq.${v}`);
                }
              });
            });
            if (orParts.length > 0) {
              query = query.or(orParts.join(','));
            }
          } else if (key === 'name' || key === 'description') {
             if (typeof value === 'object' && value !== null && 'contains' in value) {
                query = query.ilike(key, `%${(value as any).contains}%`);
             } else {
                query = query.eq(key, value);
             }
          } else {
            query = query.eq(key, value);
          }
        });
      }
      
      const { count, error } = await query;
      
      if (error) {
        console.error('SupabaseAdapter.category.count error:', error);
        throw new Error(`Database count failed: ${error.message}`);
      }
      
      return count || 0;
    }
  };

  // Cash session operations
  cashSession: any = {
    findFirst: async (options?: { where?: any; orderBy?: any }) => {
      let query = this.supabase.from('cash_sessions').select('*');

      if (options?.where) {
        Object.entries(options.where).forEach(([key, value]) => {
          const dbKey = this.mapPrismaFieldToDbColumn(key);
          if (typeof value === 'object' && value !== null) {
            if ('gte' in value) query = query.gte(dbKey, value.gte);
            else if ('lte' in value) query = query.lte(dbKey, value.lte);
            else if ('in' in value && Array.isArray(value.in)) query = query.in(dbKey, value.in);
            else if ('contains' in value) query = query.ilike(dbKey, `%${value.contains}%`);
            else query = query.eq(dbKey, value);
          } else {
            query = query.eq(dbKey, value);
          }
        });
      }

      if (options?.orderBy) {
        const field = Object.keys(options.orderBy)[0];
        const dir = options.orderBy[field];
        const dbField = this.mapPrismaFieldToDbColumn(field);
        query = query.order(dbField, { ascending: dir === 'asc' });
      }

      const { data, error } = await query.limit(1);
      if (error) throw new Error(`Database query failed: ${error.message}`);
      return (data && data[0]) || null;
    },

    findUnique: async (options: { where: { id: string }; include?: any }) => {
      const { id } = options.where;
      const { data, error } = await this.supabase.from('cash_sessions').select('*').eq('id', id).single();
      if (error && error.code !== 'PGRST116') {
        throw new Error(`Database query failed: ${error.message}`);
      }
      const session = data || null;

      if (!session) return null;

      if (options?.include) {
        const include = options.include;
        const tasks: Promise<any>[] = [];

        if (include.openedByUser) {
          tasks.push((async () => {
            const { data } = await this.supabase
              .from('users')
              .select('*')
              .eq('id', session.opened_by || session.openedBy)
              .single();
            return { key: 'openedByUser', data };
          })());
        }

        if (include.closedByUser) {
          tasks.push((async () => {
            const { data } = await this.supabase
              .from('users')
              .select('*')
              .eq('id', session.closed_by || session.closedBy)
              .single();
            return { key: 'closedByUser', data };
          })());
        }

        if (include.movements) {
          let mvQuery = this.supabase.from('cash_movements').select('*').eq('session_id', session.id);
          if (include.movements.orderBy) {
            const f = Object.keys(include.movements.orderBy)[0];
            const d = include.movements.orderBy[f];
            mvQuery = mvQuery.order(this.mapPrismaFieldToDbColumn(f), { ascending: d === 'asc' });
          }
          tasks.push((async () => {
            const { data } = await mvQuery;
            return { key: 'movements', data: data || [] };
          })());
        }

        if (include.counts) {
          tasks.push((async () => {
            const { data } = await this.supabase
              .from('cash_counts')
              .select('*')
              .eq('session_id', session.id);
            return { key: 'counts', data: data || [] };
          })());
        }

        const results = await Promise.all(tasks);
        const enriched: any = { ...session };
        results.forEach(r => { enriched[r.key] = r.data; });
        return enriched;
      }

      return session;
    },

    findMany: async (options?: { where?: any; include?: any; orderBy?: any; skip?: number; take?: number }) => {
      let query = this.supabase.from('cash_sessions').select('*');

      if (options?.where) {
        Object.entries(options.where).forEach(([key, value]) => {
          const dbKey = this.mapPrismaFieldToDbColumn(key);
          if (key === 'OR' && Array.isArray(value)) {
            // Fallback: use first OR condition
            const first = value[0];
            if (first) {
              Object.entries(first).forEach(([k, v]) => {
                const dbK = this.mapPrismaFieldToDbColumn(k);
                if (typeof v === 'object' && v !== null) {
                  if ('gte' in v) query = query.gte(dbK, v.gte);
                  else if ('lte' in v) query = query.lte(dbK, v.lte);
                  else if ('contains' in v) query = query.ilike(dbK, `%${v.contains}%`);
                } else {
                  query = query.eq(dbK, v);
                }
              });
            }
          } else if (typeof value === 'object' && value !== null) {
            if ('gte' in value) query = query.gte(dbKey, value.gte);
            else if ('lte' in value) query = query.lte(dbKey, value.lte);
            else if ('contains' in value) query = query.ilike(dbKey, `%${value.contains}%`);
            else if ('in' in value && Array.isArray(value.in)) query = query.in(dbKey, value.in);
            else query = query.eq(dbKey, value);
          } else {
            query = query.eq(dbKey, value);
          }
        });
      }

      if (options?.orderBy) {
        const field = Object.keys(options.orderBy)[0];
        const dir = options.orderBy[field];
        const dbField = this.mapPrismaFieldToDbColumn(field);
        query = query.order(dbField, { ascending: dir === 'asc' });
      }

      if (options?.skip !== undefined) {
        query = query.range(options.skip, options.skip + (options.take || 20) - 1);
      } else if (options?.take !== undefined) {
        query = query.limit(options.take);
      }

      const { data, error } = await query;
      if (error) throw new Error(`Database query failed: ${error.message}`);
      const sessions = data || [];

      if (options?.include) {
        const include = options.include;
        const enriched = await Promise.all(
          sessions.map(async (s: any) => {
            const tasks: Promise<any>[] = [];
            if (include.openedByUser) {
              tasks.push((async () => {
                const { data } = await this.supabase.from('users').select('*').eq('id', s.opened_by || s.openedBy).single();
                return { key: 'openedByUser', data };
              })());
            }
            if (include.closedByUser) {
              tasks.push((async () => {
                const { data } = await this.supabase.from('users').select('*').eq('id', s.closed_by || s.closedBy).single();
                return { key: 'closedByUser', data };
              })());
            }
            if (include.movements) {
              let mvQuery = this.supabase.from('cash_movements').select('*').eq('session_id', s.id);
              if (include.movements.orderBy) {
                const f = Object.keys(include.movements.orderBy)[0];
                const d = include.movements.orderBy[f];
                mvQuery = mvQuery.order(this.mapPrismaFieldToDbColumn(f), { ascending: d === 'asc' });
              }
              tasks.push((async () => {
                const { data } = await mvQuery;
                return { key: 'movements', data: data || [] };
              })());
            }
            if (include.counts) {
              tasks.push((async () => {
                const { data } = await this.supabase.from('cash_counts').select('*').eq('session_id', s.id);
                return { key: 'counts', data: data || [] };
              })());
            }
            const results = await Promise.all(tasks);
            const o: any = { ...s };
            results.forEach(r => { o[r.key] = r.data; });
            return o;
          })
        );
        return enriched;
      }

      return sessions;
    },

    create: async (options: { data: any }) => {
      const payload = this.mapDataToDb(options.data);
      const { data, error } = await this.supabase.from('cash_sessions').insert(payload).select('*').single();
      if (error) throw new Error(`Database insert failed: ${error.message}`);
      return data;
    },

    update: async (options: { where: { id: string }; data: any }) => {
      const { id } = options.where;
      const payload = this.mapDataToDb(options.data);
      const { data, error } = await this.supabase.from('cash_sessions').update(payload).eq('id', id).select('*').single();
      if (error) throw new Error(`Database update failed: ${error.message}`);
      return data;
    },

    count: async (options?: { where?: any }) => {
      let query = this.supabase.from('cash_sessions').select('*', { count: 'exact', head: true });
      if (options?.where) {
        Object.entries(options.where).forEach(([key, value]) => {
          const dbKey = this.mapPrismaFieldToDbColumn(key);
          if (typeof value === 'object' && value !== null) {
            if ('gte' in value) query = query.gte(dbKey, value.gte);
            else if ('lte' in value) query = query.lte(dbKey, value.lte);
            else if ('in' in value && Array.isArray(value.in)) query = query.in(dbKey, value.in);
            else if ('contains' in value) query = query.ilike(dbKey, `%${value.contains}%`);
            else query = query.eq(dbKey, value);
          } else {
            query = query.eq(dbKey, value);
          }
        });
      }
      const { count, error } = await query;
      if (error) throw new Error(`Database count failed: ${error.message}`);
      return count || 0;
    }
  };

  // Cash movement operations
  cashMovement: any = {
    create: async (options: { data: any }) => {
      const payload = this.mapDataToDb(options.data);
      const { data, error } = await this.supabase.from('cash_movements').insert(payload).select('*').single();
      if (error) throw new Error(`Database insert failed: ${error.message}`);
      return data;
    },

    findMany: async (options?: { where?: any; orderBy?: any }) => {
      let query = this.supabase.from('cash_movements').select('*');
      if (options?.where) {
        Object.entries(options.where).forEach(([key, value]) => {
          const dbKey = this.mapPrismaFieldToDbColumn(key);
          if (typeof value === 'object' && value !== null) {
            if ('gte' in value) query = query.gte(dbKey, value.gte);
            else if ('lte' in value) query = query.lte(dbKey, value.lte);
            else if ('in' in value && Array.isArray(value.in)) query = query.in(dbKey, value.in);
            else if ('contains' in value) query = query.ilike(dbKey, `%${value.contains}%`);
            else query = query.eq(dbKey, value);
          } else {
            query = query.eq(dbKey, value);
          }
        });
      }
      if (options?.orderBy) {
        const field = Object.keys(options.orderBy)[0];
        const dir = options.orderBy[field];
        const dbField = this.mapPrismaFieldToDbColumn(field);
        query = query.order(dbField, { ascending: dir === 'asc' });
      }
      const { data, error } = await query;
      if (error) throw new Error(`Database query failed: ${error.message}`);
      return data || [];
    }
  };

  // Cash count operations
  cashCount: any = {
    createMany: async (options: { data: any[] }) => {
      const payload = (options.data || []).map((row) => this.mapDataToDb(row));
      const { data, error } = await this.supabase.from('cash_counts').insert(payload).select('*');
      if (error) throw new Error(`Database insert failed: ${error.message}`);
      return { count: Array.isArray(data) ? data.length : 0 } as any;
    },

    deleteMany: async (options: { where?: any }) => {
      let query = this.supabase.from('cash_counts').delete();
      if (options?.where) {
        Object.entries(options.where).forEach(([key, value]) => {
          const dbKey = this.mapPrismaFieldToDbColumn(key);
          if (Array.isArray(value)) {
            query = query.in(dbKey, value);
          } else {
            query = query.eq(dbKey, value);
          }
        });
      }
      const { error } = await query;
      if (error) throw new Error(`Database delete failed: ${error.message}`);
      return { count: 0 } as any;
    },

    findMany: async (options?: { where?: any }) => {
      let query = this.supabase.from('cash_counts').select('*');
      if (options?.where) {
        Object.entries(options.where).forEach(([key, value]) => {
          const dbKey = this.mapPrismaFieldToDbColumn(key);
          query = query.eq(dbKey, value);
        });
      }
      const { data, error } = await query;
      if (error) throw new Error(`Database query failed: ${error.message}`);
      return data || [];
    }
  };

  // Cash discrepancy operations
  cashDiscrepancy: any = {
    create: async (options: { data: any }) => {
      const { data, error } = await this.supabase.from('cash_discrepancies').insert(options.data).select('*').single();
      if (error) throw new Error(`Database insert failed: ${error.message}`);
      return data;
    }
  };

  // Products operations
  product = {
    findMany: async (options?: { where?: any; select?: any; orderBy?: any; include?: any; skip?: number; take?: number }) => {
      let query = this.supabase.from('products').select('*');
      
      if (options?.where) {
        Object.entries(options.where).forEach(([key, value]) => {
          if (typeof value === 'object' && value !== null) {
            // Handle complex where conditions
            if ('contains' in value) {
              query = query.ilike(key, `%${value.contains}%`);
            } else if ('gte' in value) {
              query = query.gte(key, value.gte);
            } else if ('lte' in value) {
              query = query.lte(key, value.lte);
            } else if ('in' in value && Array.isArray(value.in)) {
              query = query.in(key, value.in);
            }
          } else {
            query = query.eq(key, value);
          }
        });
      }
      
      if (options?.orderBy) {
        const orderField = Object.keys(options.orderBy)[0];
        const orderDirection = options.orderBy[orderField];
        const dbOrderField = this.mapPrismaFieldToDbColumn(orderField);
        query = query.order(dbOrderField, { ascending: orderDirection === 'asc' });
      }

      // Add pagination support
      if (options?.skip !== undefined) {
        query = query.range(options.skip, options.skip + (options.take || 10) - 1);
      } else if (options?.take !== undefined) {
        query = query.limit(options.take);
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }
      let rows = (data || []) as any[];

      // Handle cross-field comparison: stockQuantity.lte = fields.minStock
      if (options?.where && typeof options.where.stockQuantity === 'object' && options.where.stockQuantity !== null) {
        const cond = options.where.stockQuantity as any;
        const lteVal = cond.lte;
        if (typeof lteVal === 'string' && lteVal === 'min_stock') {
          rows = rows.filter((r: any) => {
            const current = Number(r.current_stock ?? 0);
            const min = Number(r.min_stock ?? 0);
            const gtOk = typeof cond.gt === 'number' ? current > cond.gt : true;
            return gtOk && current <= min;
          });
        }
      }

      // Handle include: category (id, name)
      if (options?.include?.category) {
        const select = options.include.category.select;
        const needId = select?.id;
        const needName = select?.name;
        rows = await Promise.all(rows.map(async (row: any) => {
          const catId = row.category_id;
          let category: any = null;
          if (catId) {
            const fields = [needId ? 'id' : null, needName ? 'name' : null].filter(Boolean).join(', ');
            const { data: cat } = await this.supabase
              .from('categories')
              .select(fields || '*')
              .eq('id', catId)
              .single();
            category = cat || null;
          }
          return { ...row, category };
        }));
      }

      return rows;
    },

    findUnique: async (options: { where: { id?: string; sku?: string }; include?: any; select?: any }) => {
      let selectFields = '*';
      
      // Handle select option
      if (options.select) {
        const selectedFields = Object.keys(options.select).filter(key => options.select[key] === true);
        if (selectedFields.length > 0) {
          selectFields = selectedFields.join(', ');
        }
      }
      
      // Support lookup by either id or sku
      const filterField = options.where.id ? 'id' : (options.where.sku ? 'sku' : 'id');
      const filterValue = (options.where.id ?? options.where.sku) as any;
      const { data, error } = await this.supabase
        .from('products')
        .select(selectFields)
        .eq(filterField, filterValue)
        .single();
      
      if (error) {
        if ((error as any).code === 'PGRST116') {
          return null;
        }
        throw new Error(`Database query failed: ${error.message}`);
      }
      
      const row = data as Record<string, any> | null;
      if (!row) return null;

      if (options?.include) {
        const include = options.include;
        const enriched: any = { ...(row as Record<string, any>) };
        if (include.category) {
          const categoryId = (row as any).category_id ?? (row as any).categoryId;
          if (categoryId) {
            const { data: categoryRow } = await this.supabase
              .from('categories')
              .select('id, name')
              .eq('id', categoryId)
              .single();
            enriched.category = categoryRow || null;
          } else {
            enriched.category = null;
          }
        }
        if (include.saleItems) {
          const { data: saleItems } = await this.supabase
            .from('sale_items')
            .select('*')
            .eq('product_id', (row as any).id);
          enriched.saleItems = saleItems || [];
        }
        if (include.purchaseItems) {
          const { data: purchaseItems } = await this.supabase
            .from('purchase_items')
            .select('*')
            .eq('product_id', (row as any).id);
          enriched.purchaseItems = purchaseItems || [];
        }
        return enriched;
      }
      
      return row;
    },

    create: async (options: { data: any; include?: any }) => {
      // Map Prisma field names to database column names
      const mappedData = { ...options.data };
      Object.keys(mappedData).forEach(key => {
        const dbColumnName = this.mapPrismaFieldToDbColumn(key);
        if (dbColumnName !== key) {
          mappedData[dbColumnName] = mappedData[key];
          delete mappedData[key];
        }
      });

      const { data, error } = await this.supabase
        .from('products')
        .insert(mappedData)
        .select()
        .single();
      
      if (error) {
        throw new Error(`Database insert failed: ${error.message}`);
      }
      
      return data;
    },

    update: async (options: { where: { id: string }; data: any; include?: any }) => {
      // Handle atomic increment/decrement and map fields to DB columns
      const mappedData: any = {};

      // If stockQuantity uses atomic operators, compute new value
      if (options.data && typeof options.data.stockQuantity === 'object' && options.data.stockQuantity !== null) {
        const inc = (options.data.stockQuantity.increment ?? 0) as number;
        const dec = (options.data.stockQuantity.decrement ?? 0) as number;
        if (inc !== 0 || dec !== 0) {
          const { data: currentRow, error: fetchErr } = await this.supabase
            .from('products')
            .select('current_stock')
            .eq('id', options.where.id)
            .single();
          if (fetchErr) {
            throw new Error(`Database read failed: ${fetchErr.message}`);
          }
          const current = (currentRow?.current_stock ?? 0) as number;
          const next = current + inc - dec;
          mappedData['current_stock'] = next < 0 ? 0 : next;
        }
      }

      // Map other fields
      Object.entries(options.data || {}).forEach(([key, value]) => {
        if (key === 'stockQuantity' && typeof value === 'object' && value !== null) {
          // already handled above
          return;
        }
        const dbKey = this.mapPrismaFieldToDbColumn(key);
        mappedData[dbKey] = value as any;
      });

      const { data, error } = await this.supabase
        .from('products')
        .update(mappedData)
        .eq('id', options.where.id)
        .select()
        .single();
      
      if (error) {
        throw new Error(`Database update failed: ${error.message}`);
      }
      
      return data;
    },

    delete: async (options: { where: { id: string } }) => {
      const { data, error } = await this.supabase
        .from('products')
        .delete()
        .eq('id', options.where.id)
        .select()
        .single();
      
      if (error) {
        throw new Error(`Database delete failed: ${error.message}`);
      }
      
      return data;
    },

    count: async (options?: { where?: any }) => {
      // Special handling for cross-field comparison in low stock queries
      if (options?.where && typeof options.where.stockQuantity === 'object' && options.where.stockQuantity !== null) {
        const cond = options.where.stockQuantity as any;
        const lteVal = cond.lte;
        if (typeof lteVal === 'string' && lteVal === 'min_stock') {
          let query = this.supabase.from('products').select('current_stock, min_stock');
          if (typeof cond.gt === 'number') {
            query = query.gt('current_stock', cond.gt);
          }
          const { data, error } = await query;
          if (error) {
            throw new Error(`Database count failed: ${error.message}`);
          }
          const rows = (data || []) as Array<{ current_stock?: number; min_stock?: number }>;
          const filtered = rows.filter(r => (r.current_stock ?? 0) <= (r.min_stock ?? 0));
          return filtered.length;
        }
      }

      let query = this.supabase.from('products').select('id', { count: 'exact', head: true });
      
      if (options?.where) {
        Object.entries(options.where).forEach(([key, value]) => {
          const dbKey = this.mapPrismaFieldToDbColumn(key);
          if (typeof value === 'object' && value !== null) {
            if ('contains' in value) {
              query = query.ilike(dbKey, `%${(value as any).contains}%`);
            } else if ('gte' in value) {
              query = query.gte(dbKey, (value as any).gte);
            } else if ('lte' in value) {
              query = query.lte(dbKey, (value as any).lte);
            } else if ('in' in value && Array.isArray((value as any).in)) {
              query = query.in(dbKey, (value as any).in);
            } else if ('gt' in value) {
              query = query.gt(dbKey, (value as any).gt);
            }
          } else {
            query = query.eq(dbKey, value as any);
          }
        });
      }
      
      const { count, error } = await query;
      if (error) {
        throw new Error(`Database count failed: ${error.message}`);
      }
      return count || 0;
    },

    // Expose field mappings for cross-field comparisons in routes
    fields: {
      minStock: 'min_stock',
      stockQuantity: 'current_stock'
    },

    // Minimal findFirst implementation (supports simple OR by using first condition)
    findFirst: async (options: { where?: any; include?: any; select?: any; orderBy?: any }) => {
      let query = this.supabase.from('products').select('*');

      const where = options?.where || {};
      if (where.OR && Array.isArray(where.OR) && where.OR.length > 0) {
        const first = where.OR[0];
        Object.entries(first).forEach(([key, value]) => {
          const dbKey = this.mapPrismaFieldToDbColumn(key);
          query = query.eq(dbKey, value as any);
        });
      } else {
        Object.entries(where).forEach(([key, value]) => {
          const dbKey = this.mapPrismaFieldToDbColumn(key);
          if (typeof value === 'object' && value !== null) {
            if ('contains' in value) {
              query = query.ilike(dbKey, `%${(value as any).contains}%`);
            } else if ('gte' in value) {
              query = query.gte(dbKey, (value as any).gte);
            } else if ('lte' in value) {
              query = query.lte(dbKey, (value as any).lte);
            } else if ('in' in value && Array.isArray((value as any).in)) {
              query = query.in(dbKey, (value as any).in);
            }
          } else {
            query = query.eq(dbKey, value as any);
          }
        });
      }

      if (options?.orderBy) {
        const orderField = Object.keys(options.orderBy)[0];
        const orderDirection = options.orderBy[orderField];
        const dbOrderField = this.mapPrismaFieldToDbColumn(orderField);
        query = query.order(dbOrderField, { ascending: orderDirection === 'asc' });
      }

      // Limit to 1 and return first row
      const { data, error } = await query.limit(1);
      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }
      const row = (data || [])[0] || null;
      if (!row) return null;

      if (options?.include) {
        const include = options.include;
        const enriched: any = { ...(row as Record<string, any>) };
        if (include.category) {
          const { data: cat } = await this.supabase
            .from('categories')
            .select('id, name')
            .eq('id', row.category_id)
            .single();
          enriched.category = cat || null;
        }
        return enriched;
      }
      return row;
    },

    // Minimal aggregate implementation for supported aggregations
    aggregate: async (options?: { where?: any; _sum?: any; _avg?: any; _count?: any }) => {
      let query = this.supabase.from('products').select('current_stock, min_stock');

      if (options?.where) {
        Object.entries(options.where).forEach(([key, value]) => {
          const dbKey = this.mapPrismaFieldToDbColumn(key);
          if (typeof value === 'object' && value !== null) {
            if ('contains' in value) {
              query = query.ilike(dbKey, `%${(value as any).contains}%`);
            } else if ('gte' in value) {
              query = query.gte(dbKey, (value as any).gte);
            } else if ('lte' in value) {
              // Special case: lte other field like min_stock
              const lteVal = (value as any).lte;
              if (typeof lteVal === 'string') {
                // Supabase can't do column-to-column comparison; filter later in JS
              } else {
                query = query.lte(dbKey, lteVal);
              }
            } else if ('in' in value && Array.isArray((value as any).in)) {
              query = query.in(dbKey, (value as any).in);
            } else if ('gt' in value) {
              query = query.gt(dbKey, (value as any).gt);
            }
          } else {
            query = query.eq(dbKey, value as any);
          }
        });
      }

      const { data, error } = await query;
      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }

      const rows = (data || []) as Array<{ current_stock?: number; min_stock?: number }>;
      const result: any = {};

      if (options?._sum) {
        result._sum = {};
        Object.keys(options._sum).forEach((field) => {
          const dbField = this.mapPrismaFieldToDbColumn(field);
          if (dbField === 'current_stock') {
            result._sum[field] = rows.reduce((acc, r) => acc + (r.current_stock || 0), 0);
          } else {
            result._sum[field] = 0;
          }
        });
      }

      if (options?._count) {
        result._count = {};
        Object.keys(options._count).forEach((field) => {
          result._count[field] = rows.length;
        });
      }

      if (options?._avg) {
        result._avg = {};
        Object.keys(options._avg).forEach((field) => {
          const dbField = this.mapPrismaFieldToDbColumn(field);
          if (dbField === 'current_stock') {
            const total = rows.reduce((acc, r) => acc + (r.current_stock || 0), 0);
            result._avg[field] = rows.length ? total / rows.length : 0;
          } else {
            result._avg[field] = 0;
          }
        });
      }

      return result;
    }
  };

  // Customers operations
  customer = {
    findMany: async (options?: { where?: any; select?: any; orderBy?: any; include?: any; skip?: number; take?: number }) => {
      let query = this.supabase.from('customers').select('*');
      
      if (options?.where) {
        Object.entries(options.where).forEach(([key, value]) => {
          // Map Prisma field names to database column names
          const dbColumnName = this.mapPrismaFieldToDbColumn(key);
          
          if (key === 'OR' && Array.isArray(value)) {
            // Handle OR conditions - Supabase doesn't support OR directly, so we'll do multiple queries
            // For now, we'll just use the first condition as a fallback
            if (value.length > 0) {
              const firstCondition = value[0];
              Object.entries(firstCondition).forEach(([orKey, orValue]) => {
                const dbOrKey = this.mapPrismaFieldToDbColumn(orKey);
                if (typeof orValue === 'object' && orValue !== null && 'contains' in orValue) {
                  query = query.ilike(dbOrKey, `%${orValue.contains}%`);
                }
              });
            }
          } else if (typeof value === 'object' && value !== null) {
            // Handle complex where conditions
            if ('contains' in value) {
              query = query.ilike(dbColumnName, `%${value.contains}%`);
            } else if ('gte' in value) {
              query = query.gte(dbColumnName, value.gte);
            } else if ('lte' in value) {
              query = query.lte(dbColumnName, value.lte);
            } else if ('in' in value && Array.isArray(value.in)) {
              query = query.in(dbColumnName, value.in);
            }
          } else {
            query = query.eq(dbColumnName, value);
          }
        });
      }
      
      if (options?.orderBy) {
        const orderField = Object.keys(options.orderBy)[0];
        const dbOrderField = this.mapPrismaFieldToDbColumn(orderField);
        const orderDirection = options.orderBy[orderField];
        query = query.order(dbOrderField, { ascending: orderDirection === 'asc' });
      }
      
      if (options?.skip) {
        query = query.range(options.skip, (options.skip + (options?.take || 10)) - 1);
      } else if (options?.take) {
        query = query.limit(options.take);
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }
      
      // If select includes _count, we need to simulate it
      if (options?.select && options.select._count) {
        const customers = data || [];
        // For now, we'll return customers with a mock _count
        return customers.map(customer => ({
          ...customer,
          _count: {
            sales: 0 // Mock count - in a real implementation, you'd query the sales table
          }
        }));
      }
      
      return data || [];
    },

    findUnique: async (options: { where: any; include?: any; select?: any }) => {
      // Support additional where filters beyond id (e.g., isActive)
      let selectFields = '*';
      if (options.select) {
        const selectedFields = Object.keys(options.select).filter(key => options.select[key] === true);
        if (selectedFields.length > 0) {
          selectFields = selectedFields.join(', ');
        }
      }

      let query = this.supabase.from('customers').select(selectFields);
      const where = options.where || {};
      Object.entries(where).forEach(([key, value]) => {
        const dbKey = this.mapPrismaFieldToDbColumn(key);
        if (typeof value === 'object' && value !== null) {
          if ('gte' in value) {
            query = query.gte(dbKey, (value as any).gte);
          } else if ('lte' in value) {
            query = query.lte(dbKey, (value as any).lte);
          } else if ('contains' in value) {
            query = query.ilike(dbKey, `%${(value as any).contains}%`);
          } else if ('in' in value && Array.isArray((value as any).in)) {
            query = query.in(dbKey, (value as any).in);
          } else {
            // Fallback equality for nested objects we don't explicitly support
            query = query.eq(dbKey, value as any);
          }
        } else {
          query = query.eq(dbKey, value as any);
        }
      });

      const { data, error } = await query.single();
      if (error && (error as any).code !== 'PGRST116') { // PGRST116 is "not found"
        throw new Error(`Database query failed: ${error.message}`);
      }
      const row = data || null;
      if (!row) return null;

      // Handle include for sales and _count
      if (options?.include) {
        const include = options.include;
        const enriched: any = { ...(row as Record<string, any>) };

        // _count support (currently only sales)
        if (include._count && include._count.select && include._count.select.sales) {
          const { count, error: countError } = await this.supabase
            .from('sales')
            .select('id', { count: 'exact', head: true })
            .eq('customer_id', (row as any).id);
          if (countError) {
            throw new Error(`Database count failed: ${countError.message}`);
          }
          enriched._count = { select: { sales: count || 0 }, sales: count || 0 };
        }

        // Include recent sales with nested saleItems and product
        if (include.sales) {
          const orderBy = include.sales.orderBy || { date: 'desc' };
          const take = include.sales.take || 10;
          const salesSelect = include.sales.select || {};
          const { data: salesRows, error: salesErr } = await this.supabase
            .from('sales')
            .select('id, total, date, payment_method, created_at')
            .eq('customer_id', (row as any).id)
            .order(orderBy.date === 'asc' ? 'created_at' : 'created_at', { ascending: orderBy.date === 'asc' })
            .limit(take);
          if (salesErr) {
            throw new Error(`Database query failed: ${salesErr.message}`);
          }

          const salesWithItems = [] as any[];
          for (const s of (salesRows || [])) {
            const saleObj: any = {};
            if (salesSelect.id) saleObj.id = s.id;
            if (salesSelect.total) saleObj.total = s.total;
            if (salesSelect.date) saleObj.date = s.date ?? s.created_at;
            if (salesSelect.paymentMethod) saleObj.paymentMethod = s.payment_method;

            if (salesSelect.saleItems && salesSelect.saleItems.select) {
              const siSel = salesSelect.saleItems.select;
              const { data: itemsRows, error: itemsErr } = await this.supabase
                .from('sale_items')
                .select('id, quantity, unit_price, product_id')
                .eq('sale_id', s.id);
              if (itemsErr) {
                throw new Error(`Database query failed: ${itemsErr.message}`);
              }
              const items = [] as any[];
              for (const it of (itemsRows || [])) {
                const itemObj: any = {};
                if (siSel.id) itemObj.id = it.id;
                if (siSel.quantity) itemObj.quantity = it.quantity;
                if (siSel.unitPrice) itemObj.unitPrice = it.unit_price;
                if (siSel.product && siSel.product.select) {
                  const pSel = siSel.product.select;
                  const { data: pRow, error: pErr } = await this.supabase
                    .from('products')
                    .select('id, name, sku')
                    .eq('id', it.product_id)
                    .single();
                  if (pErr && (pErr as any).code !== 'PGRST116') {
                    throw new Error(`Database query failed: ${pErr.message}`);
                  }
                  const prodObj: any = {};
                  if (pSel.id) prodObj.id = pRow?.id || it.product_id;
                  if (pSel.name) prodObj.name = pRow?.name || null;
                  if (pSel.sku) prodObj.sku = pRow?.sku || null;
                  itemObj.product = prodObj;
                }
                items.push(itemObj);
              }
              saleObj.saleItems = items;
            }

            salesWithItems.push(saleObj);
          }
          enriched.sales = salesWithItems;
        }

        return enriched;
      }

      return row;
    },

    create: async (options: { data: any; include?: any }) => {
      const { data, error } = await this.supabase
        .from('customers')
        .insert(options.data)
        .select()
        .single();
      
      if (error) {
        throw new Error(`Database insert failed: ${error.message}`);
      }
      
      return data;
    },

    update: async (options: { where: { id: string }; data: any; include?: any }) => {
      const { data, error } = await this.supabase
        .from('customers')
        .update(options.data)
        .eq('id', options.where.id)
        .select()
        .single();
      
      if (error) {
        throw new Error(`Database update failed: ${error.message}`);
      }
      
      return data;
    },

    // Minimal findFirst for customers (supports OR and AND arrays)
    findFirst: async (options?: { where?: any; select?: any; orderBy?: any }) => {
      let query = this.supabase.from('customers').select('*');

      const where = options?.where || {};
      // Handle AND array
      if (where.AND && Array.isArray(where.AND)) {
        for (const cond of where.AND) {
          Object.entries(cond).forEach(([key, value]) => {
            if (key === 'OR' && Array.isArray(value)) {
              // Apply the first OR condition
              const first = (value as any[])[0] || {};
              Object.entries(first).forEach(([k, v]) => {
                query = query.eq(this.mapPrismaFieldToDbColumn(k), v as any);
              });
            } else if (typeof value === 'object' && value !== null && 'not' in value) {
              // Skip NOT for simplicity
            } else {
              query = query.eq(this.mapPrismaFieldToDbColumn(key), value as any);
            }
          });
        }
      } else if (where.OR && Array.isArray(where.OR)) {
        // Apply the first OR condition
        const first = where.OR[0] || {};
        Object.entries(first).forEach(([key, value]) => {
          query = query.eq(this.mapPrismaFieldToDbColumn(key), value as any);
        });
      } else {
        Object.entries(where).forEach(([key, value]) => {
          const dbKey = this.mapPrismaFieldToDbColumn(key);
          if (typeof value === 'object' && value !== null) {
            if ('contains' in value) {
              query = query.ilike(dbKey, `%${(value as any).contains}%`);
            } else if ('gte' in value) {
              query = query.gte(dbKey, (value as any).gte);
            } else if ('lte' in value) {
              query = query.lte(dbKey, (value as any).lte);
            } else if ('in' in value && Array.isArray((value as any).in)) {
              query = query.in(dbKey, (value as any).in);
            }
          } else {
            query = query.eq(dbKey, value as any);
          }
        });
      }

      if (options?.orderBy) {
        const orderField = Object.keys(options.orderBy)[0];
        const dbOrderField = this.mapPrismaFieldToDbColumn(orderField);
        const orderDirection = options.orderBy[orderField];
        query = query.order(dbOrderField, { ascending: orderDirection === 'asc' });
      }

      const { data, error } = await query.limit(1);
      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }
      return (data || [])[0] || null;
    },

    // Aggregate operations for customers (supports _sum, _avg, _count)
    aggregate: async (options?: { where?: any; _sum?: any; _avg?: any; _count?: any }) => {
      let query = this.supabase.from('customers').select('*');

      // Apply filters based on mapped Prisma -> DB columns
      const where = options?.where || {};
      if (where) {
        Object.entries(where).forEach(([key, value]) => {
          const dbKey = this.mapPrismaFieldToDbColumn(key);
          if (typeof value === 'object' && value !== null) {
            if ('gte' in value) {
              query = query.gte(dbKey, (value as any).gte);
            } else if ('lte' in value) {
              query = query.lte(dbKey, (value as any).lte);
            } else if ('contains' in value) {
              query = query.ilike(dbKey, `%${(value as any).contains}%`);
            } else if ('in' in value && Array.isArray((value as any).in)) {
              query = query.in(dbKey, (value as any).in);
            } else {
              query = query.eq(dbKey, value as any);
            }
          } else {
            query = query.eq(dbKey, value as any);
          }
        });
      }

      const { data, error } = await query;
      if (error) {
        throw new Error(`Database aggregate query failed: ${error.message}`);
      }

      const rows = data || [];
      const result: any = { _sum: {}, _avg: {}, _count: {} };

      // _sum support (e.g., totalPurchases)
      if (options?._sum) {
        Object.keys(options._sum).forEach((field) => {
          const dbField = this.mapPrismaFieldToDbColumn(field);
          result._sum[field] = rows.reduce((acc: number, row: any) => acc + (Number(row[dbField]) || 0), 0);
        });
      }

      // _avg support
      if (options?._avg) {
        Object.keys(options._avg).forEach((field) => {
          const dbField = this.mapPrismaFieldToDbColumn(field);
          const sum = rows.reduce((acc: number, row: any) => acc + (Number(row[dbField]) || 0), 0);
          result._avg[field] = rows.length > 0 ? sum / rows.length : null;
        });
      }

      // _count support
      if (options?._count) {
        Object.keys(options._count).forEach((field) => {
          if (field === 'id') {
            result._count[field] = rows.length;
          } else {
            const dbField = this.mapPrismaFieldToDbColumn(field);
            result._count[field] = rows.filter((row: any) => row[dbField] !== null && row[dbField] !== undefined).length;
          }
        });
      }

      return result;
    },

    delete: async (options: { where: { id: string } }) => {
      const { data, error } = await this.supabase
        .from('customers')
        .delete()
        .eq('id', options.where.id)
        .select()
        .single();
      
      if (error) {
        throw new Error(`Database delete failed: ${error.message}`);
      }
      
      return data;
    },

    count: async (options?: { where?: any }) => {
      let query = this.supabase.from('customers').select('id', { count: 'exact', head: true });
      
      if (options?.where) {
        Object.entries(options.where).forEach(([key, value]) => {
          // Map Prisma field names to database column names
          const dbColumnName = this.mapPrismaFieldToDbColumn(key);
          
          if (key === 'OR' && Array.isArray(value)) {
            // Handle OR conditions - for count, we'll use the first condition as fallback
            if (value.length > 0) {
              const firstCondition = value[0];
              Object.entries(firstCondition).forEach(([orKey, orValue]) => {
                const dbOrKey = this.mapPrismaFieldToDbColumn(orKey);
                if (typeof orValue === 'object' && orValue !== null && 'contains' in orValue) {
                  query = query.ilike(dbOrKey, `%${orValue.contains}%`);
                }
              });
            }
          } else if (typeof value === 'object' && value !== null) {
            if ('contains' in value) {
              query = query.ilike(dbColumnName, `%${value.contains}%`);
            } else if ('gte' in value) {
              query = query.gte(dbColumnName, value.gte);
            } else if ('lte' in value) {
              query = query.lte(dbColumnName, value.lte);
            }
          } else {
            query = query.eq(dbColumnName, value);
          }
        });
      }
      
      const { count, error } = await query;
      
      if (error) {
        throw new Error(`Database count failed: ${error.message}`);
      }
      
      return count || 0;
    },

    groupBy: async (options: { by: string[]; where?: any; _count?: any; _sum?: any; _max?: any; orderBy?: any; take?: number }) => {
      let query = this.supabase.from('customers').select('*');
      
      if (options?.where) {
        Object.entries(options.where).forEach(([key, value]) => {
          const dbColumnName = this.mapPrismaFieldToDbColumn(key);
          if (typeof value === 'object' && value !== null) {
            if ('contains' in value) {
              query = query.ilike(dbColumnName, `%${(value as any).contains}%`);
            } else if ('gte' in value) {
              query = query.gte(dbColumnName, (value as any).gte);
            } else if ('lte' in value) {
              query = query.lte(dbColumnName, (value as any).lte);
            } else if ('in' in value && Array.isArray((value as any).in)) {
              query = query.in(dbColumnName, (value as any).in);
            }
          } else {
            query = query.eq(dbColumnName, value as any);
          }
        });
      }

      const { data, error } = await query;
      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }

      const grouped = new Map<string, any>();
      (data || []).forEach((item: any) => {
        const key = options.by.map(field => {
          const dbField = this.mapPrismaFieldToDbColumn(field);
          return item[dbField];
        }).join('|');
        if (!grouped.has(key)) {
          const groupItem: any = {};
          options.by.forEach(field => {
            const dbField = this.mapPrismaFieldToDbColumn(field);
            groupItem[field] = item[dbField];
          });
          if (options._sum) {
            groupItem._sum = {};
            Object.keys(options._sum).forEach(sumField => {
              groupItem._sum[sumField] = 0;
            });
          }
          if (options._max) {
            groupItem._max = {};
            Object.keys(options._max).forEach(maxField => {
              groupItem._max[maxField] = null;
            });
          }
          if (options._count) {
            groupItem._count = {};
            Object.keys(options._count).forEach(countField => {
              groupItem._count[countField] = 0;
            });
          }
          grouped.set(key, groupItem);
        }
        const groupItem = grouped.get(key);
        if (options._sum) {
          Object.keys(options._sum).forEach(sumField => {
            const dbField = this.mapPrismaFieldToDbColumn(sumField);
            groupItem._sum[sumField] += item[dbField] || 0;
          });
        }
        if (options._max) {
          Object.keys(options._max).forEach(maxField => {
            const dbField = this.mapPrismaFieldToDbColumn(maxField);
            const current = groupItem._max[maxField];
            if (!current || item[dbField] > current) {
              groupItem._max[maxField] = item[dbField];
            }
          });
        }
        if (options._count) {
          Object.keys(options._count).forEach(countField => {
            groupItem._count[countField] += 1;
          });
        }
      });

      let results = Array.from(grouped.values());
      if (options.orderBy?.['_sum']) {
        const sumOrder = options.orderBy._sum;
        const field = Object.keys(sumOrder)[0];
        const dir = (sumOrder as any)[field];
        results.sort((a, b) => {
          const av = a._sum?.[field] ?? 0;
          const bv = b._sum?.[field] ?? 0;
          return dir === 'asc' ? av - bv : bv - av;
        });
      }
      if (typeof options.take === 'number') {
        results = results.slice(0, options.take);
      }
      return results;
    }
  };

  // Users operations
  user = {
    findMany: async (options?: { where?: any; select?: any; orderBy?: any }) => {
      let query = this.supabase.from('users').select('*');
      
      if (options?.where) {
        Object.entries(options.where).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }
      
      if (options?.orderBy) {
        const orderField = Object.keys(options.orderBy)[0];
        const orderDirection = options.orderBy[orderField];
        query = query.order(orderField, { ascending: orderDirection === 'asc' });
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }
      
      return data || [];
    },

    findUnique: async (options: { where: { id: string }; select?: any }) => {
      // Handle complex select queries with relations (like userRoles)
      if (options.select && options.select.userRoles) {
        // Since the role system tables don't exist in Supabase, 
        // we'll use the role field from the users table as a fallback
        
        // First get the user
        const { data: userData, error: userError } = await this.supabase
          .from('users')
          .select('id, email, full_name, role')
          .eq('id', options.where.id)
          .single();
        
        if (userError && userError.code !== 'PGRST116') {
          throw new Error(`Database query failed: ${userError.message}`);
        }
        
        if (!userData) {
          return null;
        }
        
        // Create mock role structure based on the user's role field
        const mockUserRoles = [];
        if (userData.role) {
          // Define permissions based on role
          const rolePermissions = {
            'ADMIN': [
              { id: 1, name: 'products:read', resource: 'products', action: 'read' },
              { id: 2, name: 'products:create', resource: 'products', action: 'create' },
              { id: 3, name: 'products:update', resource: 'products', action: 'update' },
              { id: 4, name: 'products:delete', resource: 'products', action: 'delete' },
              { id: 5, name: 'customers:read', resource: 'customers', action: 'read' },
              { id: 6, name: 'customers:create', resource: 'customers', action: 'create' },
              { id: 7, name: 'customers:update', resource: 'customers', action: 'update' },
              { id: 8, name: 'customers:delete', resource: 'customers', action: 'delete' },
              { id: 9, name: 'inventory:read', resource: 'inventory', action: 'read' },
              { id: 10, name: 'inventory:create', resource: 'inventory', action: 'create' },
              { id: 11, name: 'inventory:update', resource: 'inventory', action: 'update' },
              { id: 12, name: 'inventory:delete', resource: 'inventory', action: 'delete' },
              { id: 13, name: 'sales:read', resource: 'sales', action: 'read' },
              { id: 14, name: 'sales:create', resource: 'sales', action: 'create' },
              { id: 15, name: 'sales:update', resource: 'sales', action: 'update' },
              { id: 16, name: 'sales:delete', resource: 'sales', action: 'delete' },
              { id: 17, name: 'reports:read', resource: 'reports', action: 'read' },
              { id: 18, name: 'reports:create', resource: 'reports', action: 'create' },
              { id: 19, name: 'users:read', resource: 'users', action: 'read' },
              { id: 20, name: 'users:create', resource: 'users', action: 'create' },
              { id: 21, name: 'users:update', resource: 'users', action: 'update' },
              { id: 22, name: 'users:delete', resource: 'users', action: 'delete' },
              { id: 23, name: 'roles:read', resource: 'roles', action: 'read' },
              { id: 24, name: 'roles:create', resource: 'roles', action: 'create' },
              { id: 25, name: 'roles:update', resource: 'roles', action: 'update' },
              { id: 26, name: 'roles:delete', resource: 'roles', action: 'delete' },
              { id: 27, name: 'settings:read', resource: 'settings', action: 'read' },
              { id: 28, name: 'settings:update', resource: 'settings', action: 'update' }
            ],
            'MANAGER': [
              { id: 1, name: 'products:read', resource: 'products', action: 'read' },
              { id: 2, name: 'products:create', resource: 'products', action: 'create' },
              { id: 3, name: 'products:update', resource: 'products', action: 'update' },
              { id: 5, name: 'customers:read', resource: 'customers', action: 'read' },
              { id: 6, name: 'customers:create', resource: 'customers', action: 'create' },
              { id: 7, name: 'customers:update', resource: 'customers', action: 'update' },
              { id: 9, name: 'inventory:read', resource: 'inventory', action: 'read' },
              { id: 10, name: 'inventory:create', resource: 'inventory', action: 'create' },
              { id: 11, name: 'inventory:update', resource: 'inventory', action: 'update' },
              { id: 13, name: 'sales:read', resource: 'sales', action: 'read' },
              { id: 14, name: 'sales:create', resource: 'sales', action: 'create' },
              { id: 15, name: 'sales:update', resource: 'sales', action: 'update' },
              { id: 17, name: 'reports:read', resource: 'reports', action: 'read' },
              { id: 18, name: 'reports:create', resource: 'reports', action: 'create' }
            ],
            'EMPLOYEE': [
              { id: 1, name: 'products:read', resource: 'products', action: 'read' },
              { id: 5, name: 'customers:read', resource: 'customers', action: 'read' },
              { id: 6, name: 'customers:create', resource: 'customers', action: 'create' },
              { id: 9, name: 'inventory:read', resource: 'inventory', action: 'read' },
              { id: 13, name: 'sales:read', resource: 'sales', action: 'read' },
              { id: 14, name: 'sales:create', resource: 'sales', action: 'create' }
            ]
          };
          
          const permissions = rolePermissions[userData.role as keyof typeof rolePermissions] || [];
          
          mockUserRoles.push({
            role: {
              id: userData.role === 'ADMIN' ? 1 : userData.role === 'MANAGER' ? 2 : 3,
              name: userData.role,
              permissions: permissions.map(permission => ({
                permission: permission
              }))
            }
          });
        }
        
        return {
          id: userData.id,
          email: userData.email,
          fullName: userData.full_name,
          userRoles: mockUserRoles
        };
      }
      
      // Simple query without relations
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', options.where.id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw new Error(`Database query failed: ${error.message}`);
      }
      
      return data;
    },

    create: async (options: { data: any }) => {
      const { data, error } = await this.supabase
        .from('users')
        .insert(options.data)
        .select()
        .single();
      
      if (error) {
        throw new Error(`Database insert failed: ${error.message}`);
      }
      
      return data;
    },

    update: async (options: { where: { id: string }; data: any; select?: any }) => {
      const { data, error } = await this.supabase
        .from('users')
        .update(options.data)
        .eq('id', options.where.id)
        .select()
        .single();
      
      if (error) {
        throw new Error(`Database update failed: ${error.message}`);
      }
      
      // Project selected fields if select specified
      if (options.select && data) {
        const projected: any = {};
        Object.keys(options.select).forEach(key => {
          if (options.select[key] === true) {
            projected[key] = (data as any)[this.mapPrismaFieldToDbColumn(key)] ?? (data as any)[key];
          }
        });
        return projected;
      }

      return data;
    },

    count: async (options?: { where?: any }) => {
      let query = this.supabase.from('users').select('id', { count: 'exact', head: true });
      
      if (options?.where) {
        Object.entries(options.where).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }
      
      const { count, error } = await query;
      
      if (error) {
        throw new Error(`Database count failed: ${error.message}`);
      }
      
      return count || 0;
    },

    delete: async (options: { where: { id: string } }) => {
      const { data, error } = await this.supabase
        .from('users')
        .delete()
        .eq('id', options.where.id)
        .select()
        .single();
      
      if (error) {
        throw new Error(`Database delete failed: ${error.message}`);
      }
      
      return data;
    },

    groupBy: async (options: { by: string[]; _count?: any; where?: any }) => {
      // Supabase doesn't have native groupBy, so we'll simulate it
      let query = this.supabase.from('users').select('*');
      
      if (options.where) {
        Object.entries(options.where).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }
      
      // Group the data manually
      const grouped: { [key: string]: any } = {};
      (data || []).forEach((item: any) => {
        const groupKey = options.by.map(field => item[field]).join('|');
        if (!grouped[groupKey]) {
          grouped[groupKey] = {
            ...options.by.reduce((acc, field) => ({ ...acc, [field]: item[field] }), {}),
            _count: { _all: 0 }
          };
        }
        grouped[groupKey]._count._all++;
      });
      
      return Object.values(grouped);
    }
  };

  // Sales operations
  sale = {
    findMany: async (options?: { where?: any; select?: any; orderBy?: any; include?: any; skip?: number; take?: number }) => {
      let query = this.supabase.from('sales').select('*');
      
      if (options?.where) {
        Object.entries(options.where).forEach(([key, value]) => {
          // Map Prisma field names to database column names
          const dbColumnName = this.mapPrismaFieldToDbColumn(key);
          
          if (typeof value === 'object' && value !== null) {
            if ('gte' in value) {
              query = query.gte(dbColumnName, value.gte);
            } else if ('lte' in value) {
              query = query.lte(dbColumnName, value.lte);
            } else if ('in' in value && Array.isArray(value.in)) {
              query = query.in(dbColumnName, value.in);
            }
          } else {
            query = query.eq(dbColumnName, value);
          }
        });
      }
      
      if (options?.orderBy) {
        const orderField = Object.keys(options.orderBy)[0];
        const dbOrderField = this.mapPrismaFieldToDbColumn(orderField);
        const orderDirection = options.orderBy[orderField];
        query = query.order(dbOrderField, { ascending: orderDirection === 'asc' });
      }
      
      if (options?.skip) {
        query = query.range(options.skip, options.skip + (options.take || 20) - 1);
      } else if (options?.take) {
        query = query.limit(options.take);
      }

      const { data, error } = await query;
      
      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }
      
      return data || [];
    },

    findUnique: async (options: { where: { id: string }; include?: any }) => {
      const { data, error } = await this.supabase
        .from('sales')
        .select('*')
        .eq('id', options.where.id)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No rows found
        }
        throw new Error(`Database query failed: ${error.message}`);
      }
      
      return data;
    },

    create: async (options: { data: any; include?: any }) => {
      const { data, error } = await this.supabase
        .from('sales')
        .insert([options.data])
        .select()
        .single();
      
      if (error) {
        throw new Error(`Database insert failed: ${error.message}`);
      }
      
      return data;
    },

    update: async (options: { where: { id: string }; data: any; include?: any }) => {
      const { data, error } = await this.supabase
        .from('sales')
        .update(options.data)
        .eq('id', options.where.id)
        .select()
        .single();
      
      if (error) {
        throw new Error(`Database update failed: ${error.message}`);
      }
      
      return data;
    },

    groupBy: async (options: { by: string[]; where?: any; _sum?: any; _max?: any; _count?: any }) => {
      // Supabase doesn't have direct groupBy, so we'll simulate it
      let query = this.supabase.from('sales').select('*');
      
      if (options.where) {
        Object.entries(options.where).forEach(([key, value]) => {
          // Map Prisma field names to database column names
          const dbColumnName = this.mapPrismaFieldToDbColumn(key);
          
          if (typeof value === 'object' && value !== null && 'in' in value && Array.isArray(value.in)) {
            query = query.in(dbColumnName, value.in);
          } else {
            query = query.eq(dbColumnName, value);
          }
        });
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }
      
      // Group the data manually
      const grouped = new Map();
      data?.forEach(item => {
        const key = options.by.map(field => {
          // Map back to database column names for grouping
          const dbField = this.mapPrismaFieldToDbColumn(field);
          return item[dbField];
        }).join('|');
        if (!grouped.has(key)) {
          const groupItem: any = {};
          options.by.forEach(field => {
            groupItem[field] = item[field];
          });
          if (options._sum) {
            groupItem._sum = {};
            Object.keys(options._sum).forEach(sumField => {
              groupItem._sum[sumField] = 0;
            });
          }
          if (options._max) {
            groupItem._max = {};
            Object.keys(options._max).forEach(maxField => {
              groupItem._max[maxField] = null;
            });
          }
          if (options._count) {
            groupItem._count = { _all: 0 };
          }
          grouped.set(key, groupItem);
        }
        
        const groupItem = grouped.get(key);
        if (options._sum) {
          Object.keys(options._sum).forEach(sumField => {
            groupItem._sum[sumField] += item[sumField] || 0;
          });
        }
        if (options._max) {
          Object.keys(options._max).forEach(maxField => {
            if (!groupItem._max[maxField] || item[maxField] > groupItem._max[maxField]) {
              groupItem._max[maxField] = item[maxField];
            }
          });
        }
        if (options._count) {
          groupItem._count._all++;
        }
      });
      
      return Array.from(grouped.values());
    },

    count: async (options?: { where?: any }) => {
      let query = this.supabase.from('sales').select('*', { count: 'exact', head: true });
      
      if (options?.where) {
        Object.entries(options.where).forEach(([key, value]) => {
          // Map Prisma field names to database column names
          const dbColumnName = this.mapPrismaFieldToDbColumn(key);
          
          if (typeof value === 'object' && value !== null) {
            if ('gte' in value) {
              query = query.gte(dbColumnName, value.gte);
            } else if ('lte' in value) {
              query = query.lte(dbColumnName, value.lte);
            } else if ('in' in value && Array.isArray(value.in)) {
              query = query.in(dbColumnName, value.in);
            }
          } else {
            query = query.eq(dbColumnName, value);
          }
        });
      }
      
      const { count, error } = await query;
      
      if (error) {
        throw new Error(`Database count failed: ${error.message}`);
      }
      
      return count || 0;
    },

    aggregate: async (options?: { where?: any; _sum?: any; _avg?: any; _count?: any }) => {
      let query = this.supabase.from('sales').select('*');
      
      if (options?.where) {
        Object.entries(options.where).forEach(([key, value]) => {
          // Map Prisma field names to database column names
          const dbColumnName = this.mapPrismaFieldToDbColumn(key);
          
          if (typeof value === 'object' && value !== null) {
            if ('gte' in value) {
              query = query.gte(dbColumnName, value.gte);
            } else if ('lte' in value) {
              query = query.lte(dbColumnName, value.lte);
            } else if ('in' in value && Array.isArray(value.in)) {
              query = query.in(dbColumnName, value.in);
            }
          } else {
            query = query.eq(dbColumnName, value);
          }
        });
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }
      
      const result: any = {};
      
      if (options?._sum) {
        result._sum = {};
        Object.keys(options._sum).forEach(field => {
          result._sum[field] = data?.reduce((sum, item) => sum + (item[field] || 0), 0) || 0;
        });
      }
      
      if (options?._avg) {
        result._avg = {};
        Object.keys(options._avg).forEach(field => {
          const sum = data?.reduce((sum, item) => sum + (item[field] || 0), 0) || 0;
          result._avg[field] = data && data.length > 0 ? sum / data.length : 0;
        });
      }
      
      if (options?._count) {
        result._count = {};
        Object.keys(options._count).forEach(field => {
          result._count[field] = data?.length || 0;
        });
      }
      
      return result;
    }
  };

  // Suppliers operations
  supplier = {
    findMany: async (options?: { where?: any; select?: any; orderBy?: any; include?: any; skip?: number; take?: number }) => {
      let query = this.supabase.from('suppliers').select('*');
      
      if (options?.where) {
        Object.entries(options.where).forEach(([key, value]) => {
          if (typeof value === 'object' && value !== null) {
            if ('contains' in value) {
              query = query.ilike(key, `%${value.contains}%`);
            }
          } else {
            query = query.eq(key, value);
          }
        });
      }
      
      if (options?.orderBy) {
        const orderField = Object.keys(options.orderBy)[0];
        const orderDirection = options.orderBy[orderField];
        query = query.order(orderField, { ascending: orderDirection === 'asc' });
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }
      
      return data || [];
    },

    findUnique: async (options: { where: { id: string }; include?: any; select?: any }) => {
      const { data, error } = await this.supabase
        .from('suppliers')
        .select('*')
        .eq('id', options.where.id)
        .single();

      if (error) {
        if ((error as any).code === 'PGRST116') {
          return null;
        }
        throw new Error(`Database query failed: ${error.message}`);
      }

      // Project selected fields if select is specified
      if (options.select && data) {
        const projected: any = {};
        Object.keys(options.select).forEach(key => {
          if (options.select[key] === true) {
            projected[key] = (data as any)[this.mapPrismaFieldToDbColumn(key)] ?? (data as any)[key];
          }
        });
        return projected;
      }
      return data;
    },

    create: async (options: { data: any; include?: any }) => {
      const { data, error } = await this.supabase
        .from('suppliers')
        .insert([options.data])
        .select()
        .single();

      if (error) {
        throw new Error(`Database insert failed: ${error.message}`);
      }

      return data;
    },

    update: async (options: { where: { id: string }; data: any; include?: any }) => {
      const { data, error } = await this.supabase
        .from('suppliers')
        .update(options.data)
        .eq('id', options.where.id)
        .select()
        .single();

      if (error) {
        throw new Error(`Database update failed: ${error.message}`);
      }

      return data;
    },

    delete: async (options: { where: { id: string } }) => {
      const { data, error } = await this.supabase
        .from('suppliers')
        .delete()
        .eq('id', options.where.id)
        .select()
        .single();

      if (error) {
        throw new Error(`Database delete failed: ${error.message}`);
      }

      return data;
    },

    count: async (options?: { where?: any }) => {
      let query = this.supabase.from('suppliers').select('*', { count: 'exact', head: true });

      if (options?.where) {
        Object.entries(options.where).forEach(([key, value]) => {
          const dbKey = this.mapPrismaFieldToDbColumn(key);
          query = query.eq(dbKey, value as any);
        });
      }

      const { count, error } = await query;

      if (error) {
        throw new Error(`Database count failed: ${error.message}`);
      }

      return count || 0;
    }
  };

  customerCredit = {
    fields: {
      customerId: 'customer_id',
      totalAmount: 'total_amount',
      paidAmount: 'paid_amount',
      remainingAmount: 'remaining_amount',
      dueDate: 'due_date',
      createdBy: 'created_by',
      paidAt: 'paid_at',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },

    findMany: async (options?: { where?: any; include?: any; orderBy?: any; skip?: number; take?: number }) => {
      let query = this.supabase.from('customer_credits').select('*');

      // where filters
      if (options?.where) {
        const where = options.where;
        Object.entries(where).forEach(([key, value]) => {
          const v: any = value as any;
          if (key === 'createdAt' && typeof value === 'object') {
            if (v.gte) query = query.gte('created_at', v.gte as any);
            if (v.lte) query = query.lte('created_at', v.lte as any);
          } else if (key === 'dueDate' && typeof value === 'object') {
            if (v.lt) query = query.lt('due_date', v.lt as any);
            if (v.gt) query = query.gt('due_date', v.gt as any);
          } else if (key === 'status' && typeof value === 'object' && v.in) {
            query = query.in('status', v.in as any[]);
          } else {
            const dbKey = (this.customerCredit as any).fields[key] || key;
            query = (query as any).eq(dbKey, value as any);
          }
        });
      }

      // orderBy
      if (options?.orderBy) {
        const orderKey = Object.keys(options.orderBy)[0];
        const dir = (options.orderBy as any)[orderKey] === 'desc' ? false : true;
        const dbKey = (this.customerCredit as any).fields[orderKey] || orderKey;
        query = query.order(dbKey, { ascending: dir });
      }

      // pagination
      if (typeof options?.skip === 'number' || typeof options?.take === 'number') {
        const from = options?.skip || 0;
        const to = options?.take ? from + options.take - 1 : from + 49;
        query = query.range(from, to);
      }

      const { data, error } = await query;
      if (error) throw new Error(`Database query failed: ${error.message}`);
      let rows = (data || []) as any[];

      // include relations
      if (options?.include) {
        const includes = options.include;
        if (includes.customer) {
          const ids = rows.map(r => r.customer_id);
          const { data: customers, error: custErr } = await this.supabase
            .from('customers')
            .select(includes.customer.select ? Object.keys(includes.customer.select).filter(k => includes.customer.select[k]).join(',') : '*')
            .in('id', ids);
          if (custErr) throw new Error(`Include customer failed: ${custErr.message}`);
          rows = rows.map(r => ({
            ...r,
            customer: ((customers || []) as any[]).find((c: any) => c.id === r.customer_id) || null
          }));
        }
        if (includes.payments) {
          const creditIds = rows.map(r => r.id);
          let payQuery = this.supabase.from('credit_payments').select('*').in('credit_id', creditIds);
          if (includes.payments.orderBy) {
            const orderKey = Object.keys(includes.payments.orderBy)[0];
            const dir = (includes.payments.orderBy as any)[orderKey] === 'desc' ? false : true;
            const dbKey = orderKey === 'createdAt' ? 'created_at' : orderKey;
            payQuery = payQuery.order(dbKey, { ascending: dir });
          }
          if (includes.payments.take) {
            payQuery = payQuery.limit(includes.payments.take);
          }
          const { data: payments, error: payErr } = await payQuery;
          if (payErr) throw new Error(`Include payments failed: ${payErr.message}`);
          rows = rows.map(r => ({
            ...r,
            payments: (payments || []).filter(p => p.credit_id === r.id)
          }));
        }
      }

      return rows;
    },

    findUnique: async (options: { where: { id: string }; include?: any }) => {
      const { id } = options.where;
      const { data, error } = await this.supabase
        .from('customer_credits')
        .select('*')
        .eq('id', id)
        .single();
      if (error && error.code !== 'PGRST116') throw new Error(`Database query failed: ${error.message}`);
      let row = data || null;
      if (!row) return null;

      if (options.include) {
        const inc = options.include;
        if (inc.customer) {
          const { data: cust, error: custErr } = await this.supabase
            .from('customers')
            .select(inc.customer.select ? Object.keys(inc.customer.select).filter(k => inc.customer.select[k]).join(',') : '*')
            .eq('id', row.customer_id)
            .single();
          if (custErr && custErr.code !== 'PGRST116') throw new Error(`Include customer failed: ${custErr.message}`);
          row = { ...row, customer: cust || null };
        }
        if (inc.payments) {
          let payQuery = this.supabase.from('credit_payments').select('*').eq('credit_id', row.id);
          if (inc.payments.orderBy) {
            const orderKey = Object.keys(inc.payments.orderBy)[0];
            const dir = (inc.payments.orderBy as any)[orderKey] === 'desc' ? false : true;
            const dbKey = orderKey === 'createdAt' ? 'created_at' : orderKey;
            payQuery = payQuery.order(dbKey, { ascending: dir });
          }
          const { data: pays, error: payErr } = await payQuery;
          if (payErr) throw new Error(`Include payments failed: ${payErr.message}`);
          let paymentsRows = pays || [];
          if (inc.payments.include?.createdByUser?.select) {
            const userFields = Object.keys(inc.payments.include.createdByUser.select).filter(k => inc.payments.include.createdByUser.select[k]).join(',');
            const userIds = paymentsRows.map(p => p.created_by);
            const { data: users, error: usrErr } = await this.supabase.from('users').select(userFields || '*').in('id', userIds);
            if (usrErr) throw new Error(`Include createdByUser failed: ${usrErr.message}`);
            paymentsRows = paymentsRows.map(p => ({
              ...p,
              createdByUser: ((users || []) as any[]).find((u: any) => u.id === p.created_by) || null
            }));
          }
          row = { ...row, payments: paymentsRows };
        }
        if (inc.createdByUser?.select) {
          const fields = Object.keys(inc.createdByUser.select).filter(k => inc.createdByUser.select[k]).join(',');
          const { data: user, error: userErr } = await this.supabase.from('users').select(fields || '*').eq('id', row.created_by).single();
          if (userErr && userErr.code !== 'PGRST116') throw new Error(`Include createdByUser failed: ${userErr.message}`);
          row = { ...row, createdByUser: user || null };
        }
      }

      return row;
    },

    create: async (options: { data: any; include?: any }) => {
      const dataToInsert = {
        customer_id: options.data.customerId,
        total_amount: options.data.totalAmount,
        paid_amount: options.data.paidAmount ?? 0,
        remaining_amount: options.data.remainingAmount,
        status: options.data.status ?? 'PENDING',
        description: options.data.description ?? null,
        due_date: options.data.dueDate ?? null,
        created_by: options.data.createdBy,
      };
      const { data, error } = await this.supabase.from('customer_credits').insert([dataToInsert]).select('*');
      if (error) throw new Error(`Database insert failed: ${error.message}`);
      let row = (data || [])[0] || null;
      if (!row) return null;
      if (options.include?.customer) {
        const fields = Object.keys(options.include.customer.select || {}).filter(k => options.include.customer.select[k]).join(',');
        const { data: cust, error: custErr } = await this.supabase.from('customers').select(fields || '*').eq('id', row.customer_id).single();
        if (custErr && custErr.code !== 'PGRST116') throw new Error(`Include customer failed: ${custErr.message}`);
        row = { ...row, customer: cust || null };
      }
      return row;
    },

    update: async (options: { where: { id: string }; data: any; include?: any }) => {
      const { id } = options.where;
      const updates: any = {};
      Object.entries(options.data || {}).forEach(([key, value]) => {
        const dbKey = (this.customerCredit as any).fields[key] || key;
        updates[dbKey] = value;
      });
      const { data, error } = await this.supabase.from('customer_credits').update(updates).eq('id', id).select('*');
      if (error) throw new Error(`Database update failed: ${error.message}`);
      let row = (data || [])[0] || null;
      if (!row) return null;
      if (options.include?.customer) {
        const fields = Object.keys(options.include.customer.select || {}).filter(k => options.include.customer.select[k]).join(',');
        const { data: cust, error: custErr } = await this.supabase.from('customers').select(fields || '*').eq('id', row.customer_id).single();
        if (custErr && custErr.code !== 'PGRST116') throw new Error(`Include customer failed: ${custErr.message}`);
        row = { ...row, customer: cust || null };
      }
      return row;
    },

    count: async (options?: { where?: any }) => {
      let query = this.supabase.from('customer_credits').select('id', { count: 'exact', head: true });
      if (options?.where) {
        Object.entries(options.where).forEach(([key, value]) => {
          const v: any = value as any;
          if (key === 'createdAt' && typeof value === 'object') {
            if (v?.gte) query = (query as any).gte('created_at', v.gte as any);
            if (v?.lte) query = (query as any).lte('created_at', v.lte as any);
          } else if (key === 'dueDate' && typeof value === 'object') {
            if (v?.lt) query = (query as any).lt('due_date', v.lt as any);
            if (v?.gt) query = (query as any).gt('due_date', v.gt as any);
          } else if (key === 'status' && typeof value === 'object' && v?.in) {
            query = (query as any).in('status', v.in as any[]);
          } else {
            const dbKey = (this.customerCredit as any).fields[key] || key;
            query = (query as any).eq(dbKey, value as any);
          }
        });
      }
      const { count, error } = await query;
      if (error) throw new Error(`Database count failed: ${error.message}`);
      return count || 0;
    },

    aggregate: async (options?: { where?: any; _sum?: any; _count?: any }) => {
      let query = this.supabase.from('customer_credits').select('*');
      if (options?.where) {
        Object.entries(options.where).forEach(([key, value]) => {
          const v: any = value as any;
          if (key === 'createdAt' && typeof value === 'object') {
            if (v?.gte) query = (query as any).gte('created_at', v.gte as any);
            if (v?.lte) query = (query as any).lte('created_at', v.lte as any);
          } else if (key === 'status' && typeof value === 'object' && v?.in) {
            query = (query as any).in('status', v.in as any[]);
          } else {
            const dbKey = (this.customerCredit as any).fields[key] || key;
            query = (query as any).eq(dbKey, value as any);
          }
        });
      }
      const { data, error } = await query;
      if (error) throw new Error(`Database query failed: ${error.message}`);
      const rows = (data || []) as any[];
      const result: any = { _sum: {}, _count: {} };
      if (options?._sum) {
        Object.keys(options._sum).forEach(k => {
          const dbKey = (this.customerCredit as any).fields[k] || k;
          result._sum[k] = rows.reduce((acc, r) => acc + (Number(r[dbKey]) || 0), 0);
        });
      }
      if (options?._count) {
        Object.keys(options._count).forEach(k => {
          if (k === 'id') result._count[k] = rows.length;
          else result._count[k] = rows.filter(r => r[k] != null).length;
        });
      }
      return result;
    },

    groupBy: async (options: { by: string[]; where?: any; _sum?: any; orderBy?: any; take?: number }) => {
      let query = this.supabase.from('customer_credits').select('*');
      if (options?.where) {
        Object.entries(options.where).forEach(([key, value]) => {
          const v: any = value as any;
          if (key === 'status' && typeof value === 'object' && v?.in) {
            query = (query as any).in('status', v.in as any[]);
          } else {
            const dbKey = (this.customerCredit as any).fields[key] || key;
            query = (query as any).eq(dbKey, value as any);
          }
        });
      }
      const { data, error } = await query;
      if (error) throw new Error(`Database query failed: ${error.message}`);
      const rows = (data || []) as any[];
      // only support groupBy by customerId
      const groups = new Map<string, any>();
      for (const r of rows) {
        const key = r.customer_id;
        const current = groups.get(key) || { customerId: key, _sum: {} };
        if (options._sum?.remainingAmount) {
          current._sum.remainingAmount = (current._sum.remainingAmount || 0) + (Number(r.remaining_amount) || 0);
        }
        groups.set(key, current);
      }
      let result = Array.from(groups.values());
      if (options.orderBy?._sum?.remainingAmount) {
        const dir = options.orderBy._sum.remainingAmount === 'desc' ? -1 : 1;
        result.sort((a, b) => (a._sum.remainingAmount - b._sum.remainingAmount) * dir);
      }
      if (options.take) {
        result = result.slice(0, options.take);
      }
      return result;
    },
  };

  creditPayment = {
    create: async (options: { data: any }) => {
      const dataToInsert = {
        credit_id: options.data.creditId,
        amount: options.data.amount,
        payment_method: options.data.paymentMethod ?? 'CASH',
        notes: options.data.notes ?? null,
        created_by: options.data.createdBy,
      };
      const { data, error } = await this.supabase.from('credit_payments').insert([dataToInsert]).select('*');
      if (error) throw new Error(`Database insert failed: ${error.message}`);
      return (data || [])[0] || null;
    }
  };

  // Purchases operations
  purchase = {
    findMany: async (options?: { where?: any; select?: any; orderBy?: any; include?: any; skip?: number; take?: number }) => {
      let query = this.supabase.from('purchases').select('*');
      
      if (options?.where) {
        Object.entries(options.where).forEach(([key, value]) => {
          if (typeof value === 'object' && value !== null) {
            if ('gte' in value) {
              query = query.gte(this.mapPrismaFieldToDbColumn(key), value.gte);
            } else if ('lte' in value) {
              query = query.lte(this.mapPrismaFieldToDbColumn(key), value.lte);
            }
          } else {
            const dbKey = this.mapPrismaFieldToDbColumn(key);
            query = query.eq(dbKey, value);
          }
        });
      }
      
      if (options?.orderBy) {
        const orderField = Object.keys(options.orderBy)[0];
        const orderDirection = options.orderBy[orderField];
        const dbOrderField = this.mapPrismaFieldToDbColumn(orderField);
        query = query.order(dbOrderField, { ascending: orderDirection === 'asc' });
      }
      
      // Pagination support
      if (typeof options?.skip === 'number') {
        const start = options.skip;
        const end = start + (options.take || 10) - 1;
        query = query.range(start, end);
      } else if (typeof options?.take === 'number') {
        query = query.limit(options.take);
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }
      
      return data || [];
    },

    findUnique: async (options: { where: { id: string }; include?: any; select?: any }) => {
      // Fetch the purchase row
      const { data, error } = await this.supabase
        .from('purchases')
        .select('*')
        .eq('id', options.where.id)
        .single();

      if (error) {
        if ((error as any).code === 'PGRST116') {
          return null; // not found
        }
        throw new Error(`Database query failed: ${error.message}`);
      }

      const row = data;
      if (!row) return null;

      // Enrich with includes
      if (options?.include) {
        const include = options.include;
        const enriched: any = { ...(row as Record<string, any>) };

        if (include.user) {
          const { data: user } = await this.supabase
            .from('users')
            .select('*')
            .eq('id', row.user_id)
            .single();
          if (include.user.select && user) {
            const projected: any = {};
            Object.keys(include.user.select).forEach(key => {
              if (include.user.select[key]) projected[key] = (user as any)[this.mapPrismaFieldToDbColumn(key)] ?? (user as any)[key];
            });
            enriched.user = projected;
          } else {
            enriched.user = user || null;
          }
        }

        if (include.supplier) {
          const { data: supplier } = await this.supabase
            .from('suppliers')
            .select('*')
            .eq('id', row.supplier_id)
            .single();
          if (include.supplier.select && supplier) {
            const projected: any = {};
            Object.keys(include.supplier.select).forEach(key => {
              if (include.supplier.select[key]) projected[key] = (supplier as any)[this.mapPrismaFieldToDbColumn(key)] ?? (supplier as any)[key];
            });
            enriched.supplier = projected;
          } else {
            enriched.supplier = supplier || null;
          }
        }

        if (include.purchaseItems) {
          const { data: itemsData } = await this.supabase
            .from('purchase_items')
            .select('*')
            .eq('purchase_id', row.id);

          let items = itemsData || [];

          // Attach product if requested
          const nested = include.purchaseItems.include || {};
          if (nested.product) {
            const productIds = items.map((i: any) => i.product_id).filter(Boolean);
            let productsMap = new Map<string, any>();
            if (productIds.length > 0) {
              const { data: products } = await this.supabase
                .from('products')
                .select('*')
                .in('id', productIds);
              (products || []).forEach((p: any) => productsMap.set(p.id, p));
            }

            items = items.map((i: any) => {
              let prod = productsMap.get(i.product_id) || null;
              // Project product fields if select provided
              if (nested.product.select && prod) {
                const projected: any = {};
                Object.keys(nested.product.select).forEach((key: string) => {
                  if (nested.product.select[key]) projected[key] = (prod as any)[this.mapPrismaFieldToDbColumn(key)] ?? (prod as any)[key];
                });
                prod = projected;
              }
              return { ...i, product: prod };
            });
          }

          enriched.purchaseItems = items;
        }

        return enriched;
      }

      // No includes requested, return base row
      return row;
    },

    count: async (options?: { where?: any }) => {
      let query = this.supabase.from('purchases').select('*', { count: 'exact', head: true });

      if (options?.where) {
        Object.entries(options.where).forEach(([key, value]) => {
          const dbKey = this.mapPrismaFieldToDbColumn(key);
          query = query.eq(dbKey, value as any);
        });
      }

      const { count, error } = await query;

      if (error) {
        throw new Error(`Database count failed: ${error.message}`);
      }

      return count || 0;
    },

    groupBy: async (options: { by: string[]; where?: any; _sum?: any; _count?: any; orderBy?: any; take?: number }) => {
      // Simulate groupBy for purchases
      let query = this.supabase.from('purchases').select('*');

      if (options.where) {
        Object.entries(options.where).forEach(([key, value]) => {
          const dbColumnName = this.mapPrismaFieldToDbColumn(key);
          if (typeof value === 'object' && value !== null) {
            if ('gte' in (value as any)) {
              query = query.gte(dbColumnName, (value as any).gte);
            } else if ('lte' in (value as any)) {
              query = query.lte(dbColumnName, (value as any).lte);
            } else if ('in' in (value as any) && Array.isArray((value as any).in)) {
              query = query.in(dbColumnName, (value as any).in);
            }
          } else {
            query = query.eq(dbColumnName, value as any);
          }
        });
      }

      const { data, error } = await query;
      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }

      const grouped = new Map<string, any>();
      (data || []).forEach((item: any) => {
        const key = options.by.map(field => {
          const dbField = this.mapPrismaFieldToDbColumn(field);
          return item[dbField];
        }).join('|');
        if (!grouped.has(key)) {
          const groupItem: any = {};
          options.by.forEach(field => {
            const dbField = this.mapPrismaFieldToDbColumn(field);
            groupItem[field] = item[dbField];
          });
          if (options._sum) {
            groupItem._sum = {};
            Object.keys(options._sum).forEach(sumField => {
              groupItem._sum[sumField] = 0;
            });
          }
          if (options._count) {
            groupItem._count = {};
            Object.keys(options._count).forEach(countField => {
              groupItem._count[countField] = 0;
            });
          }
          grouped.set(key, groupItem);
        }
        const groupItem = grouped.get(key);
        if (options._sum) {
          Object.keys(options._sum).forEach(sumField => {
            const dbField = this.mapPrismaFieldToDbColumn(sumField);
            groupItem._sum[sumField] += item[dbField] || 0;
          });
        }
        if (options._count) {
          Object.keys(options._count).forEach(countField => {
            groupItem._count[countField] += 1;
          });
        }
      });

      let results = Array.from(grouped.values());
      // Apply ordering on _sum if specified
      if (options.orderBy?.['_sum']) {
        const sumOrder = options.orderBy._sum;
        const field = Object.keys(sumOrder)[0];
        const dir = (sumOrder as any)[field];
        results.sort((a, b) => {
          const av = a._sum?.[field] ?? 0;
          const bv = b._sum?.[field] ?? 0;
          return dir === 'asc' ? av - bv : bv - av;
        });
      }
      // Limit results if take specified
      if (typeof options.take === 'number') {
        results = results.slice(0, options.take);
      }
      return results;
    },
  
    aggregate: async (options?: { where?: any; _sum?: any; _avg?: any; _count?: any }) => {
      let query = this.supabase.from('purchases').select('*');

      if (options?.where) {
        Object.entries(options.where).forEach(([key, value]) => {
          const dbColumnName = this.mapPrismaFieldToDbColumn(key);

          if (typeof value === 'object' && value !== null) {
            if ('gte' in value) {
              query = query.gte(dbColumnName, (value as any).gte);
            } else if ('lte' in value) {
              query = query.lte(dbColumnName, (value as any).lte);
            } else if ('in' in value && Array.isArray((value as any).in)) {
              query = query.in(dbColumnName, (value as any).in);
            }
          } else {
            query = query.eq(dbColumnName, value as any);
          }
        });
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }

      const result: any = {};

      if (options?._sum) {
        result._sum = {};
        Object.keys(options._sum).forEach(field => {
          result._sum[field] = data?.reduce((sum, item) => sum + (item[field] || 0), 0) || 0;
        });
      }

      if (options?._avg) {
        result._avg = {};
        Object.keys(options._avg).forEach(field => {
          const sum = data?.reduce((sum, item) => sum + (item[field] || 0), 0) || 0;
          result._avg[field] = data && data.length > 0 ? sum / data.length : 0;
        });
      }

      if (options?._count) {
        result._count = {};
        Object.keys(options._count).forEach(field => {
          result._count[field] = data?.length || 0;
        });
      }

      return result;
    }
  };

  // Sale Items operations
  saleItem = {
    findMany: async (options?: { where?: any; select?: any; orderBy?: any; include?: any }) => {
      let query = this.supabase.from('sale_items').select('*');
      
      if (options?.where) {
        Object.entries(options.where).forEach(([key, value]) => {
          // Map Prisma field names to database column names
          const dbColumnName = this.mapPrismaFieldToDbColumn(key);
          
          if (typeof value === 'object' && value !== null) {
            if ('gte' in value) {
              query = query.gte(dbColumnName, value.gte);
            } else if ('lte' in value) {
              query = query.lte(dbColumnName, value.lte);
            } else if ('in' in value && Array.isArray(value.in)) {
              query = query.in(dbColumnName, value.in);
            }
          } else {
            query = query.eq(dbColumnName, value);
          }
        });
      }
      
      if (options?.orderBy) {
        const orderField = Object.keys(options.orderBy)[0];
        const dbOrderField = this.mapPrismaFieldToDbColumn(orderField);
        const orderDirection = options.orderBy[orderField];
        query = query.order(dbOrderField, { ascending: orderDirection === 'asc' });
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }
      
      return data || [];
    },

    create: async (options: { data: any }) => {
      const mappedData: any = {};
      Object.entries(options.data || {}).forEach(([key, value]) => {
        const dbKey = this.mapPrismaFieldToDbColumn(key);
        mappedData[dbKey] = value as any;
      });

      const { data, error } = await this.supabase
        .from('sale_items')
        .insert(mappedData)
        .select()
        .single();

      if (error) {
        throw new Error(`Database insert failed: ${error.message}`);
      }

      return data;
    },

    groupBy: async (options: { by: string[]; where?: any; _count?: any; _sum?: any; orderBy?: any; take?: number }) => {
      // Supabase doesn't have direct groupBy, so we'll simulate it
      let query = this.supabase.from('sale_items').select('*');

      // Support nested filtering by related sale's createdAt
      if (options?.where?.sale && typeof options.where.sale === 'object') {
        const saleWhere = options.where.sale;
        if (saleWhere.createdAt && typeof saleWhere.createdAt === 'object') {
          let saleQuery = this.supabase.from('sales').select('id');
          const created = saleWhere.createdAt;
          if ('gte' in created) {
            saleQuery = saleQuery.gte('created_at', created.gte);
          }
          if ('lte' in created) {
            saleQuery = saleQuery.lte('created_at', created.lte);
          }
          const { data: salesFilter, error: saleErr } = await saleQuery;
          if (saleErr) {
            throw new Error(`Database query failed: ${saleErr.message}`);
          }
          const saleIds = (salesFilter || []).map((s: any) => s.id);
          if (saleIds.length > 0) {
            query = query.in('sale_id', saleIds);
          } else {
            // No matching sales; return empty result early
            return [] as any[];
          }
        }
        // Remove processed relation condition to avoid mis-mapping below
        const { sale, ...rest } = options.where;
        options.where = rest;
      }

      if (options.where) {
        Object.entries(options.where).forEach(([key, value]) => {
          // Map Prisma field names to database column names
          const dbColumnName = this.mapPrismaFieldToDbColumn(key);

          if (typeof value === 'object' && value !== null) {
            if ('gte' in value) {
              query = query.gte(dbColumnName, (value as any).gte);
            } else if ('lte' in value) {
              query = query.lte(dbColumnName, (value as any).lte);
            } else if ('in' in value && Array.isArray((value as any).in)) {
              query = query.in(dbColumnName, (value as any).in);
            }
          } else {
            query = query.eq(dbColumnName, value as any);
          }
        });
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }
      
      // Group the data manually
      const grouped = new Map();
      data?.forEach(item => {
        const key = options.by.map(field => {
          // Map back to database column names for grouping
          const dbField = this.mapPrismaFieldToDbColumn(field);
          return item[dbField];
        }).join('|');
        if (!grouped.has(key)) {
          const groupItem: any = {};
          options.by.forEach(field => {
            const dbField = this.mapPrismaFieldToDbColumn(field);
            groupItem[field] = item[dbField];
          });
          if (options._sum) {
            groupItem._sum = {};
            Object.keys(options._sum).forEach(sumField => {
              groupItem._sum[sumField] = 0;
            });
          }
          if (options._count) {
            groupItem._count = {};
            Object.keys(options._count).forEach(countField => {
              groupItem._count[countField] = 0;
            });
          }
          grouped.set(key, groupItem);
        }
        
        const groupItem = grouped.get(key);
        if (options._sum) {
          Object.keys(options._sum).forEach(sumField => {
            const dbField = this.mapPrismaFieldToDbColumn(sumField);
            groupItem._sum[sumField] += item[dbField] || 0;
          });
        }
        if (options._count) {
          Object.keys(options._count).forEach(countField => {
            groupItem._count[countField] += 1;
          });
        }
      });
      
      let results = Array.from(grouped.values());
      // Apply in-memory ordering if requested
      if (options.orderBy?.['_sum']) {
        const sumOrder = options.orderBy._sum;
        const field = Object.keys(sumOrder)[0];
        const dir = sumOrder[field];
        results.sort((a, b) => {
          const av = a._sum?.[field] ?? 0;
          const bv = b._sum?.[field] ?? 0;
          return dir === 'asc' ? av - bv : bv - av;
        });
      }
      // Limit results if take is specified
      if (typeof options.take === 'number') {
        results = results.slice(0, options.take);
      }

      return results;
    }
  };

  // Connection methods to maintain compatibility
  $connect = async () => {
    // Test connection with a simple query
    const { error } = await this.supabase.from('categories').select('count').limit(1);
    if (error && !error.message.includes('relation "categories" does not exist')) {
      throw new Error(`Connection failed: ${error.message}`);
    }
  };

  $disconnect = async () => {
    // Supabase client doesn't need explicit disconnection
    return Promise.resolve();
  };

  // Inventory movements operations
  inventoryMovement = {
    findMany: async (options?: { where?: any; select?: any; orderBy?: any; include?: any; skip?: number; take?: number }) => {
      let query = this.supabase.from('inventory_movements').select('*');
      
      if (options?.where) {
        Object.entries(options.where).forEach(([key, value]) => {
          if (typeof value === 'object' && value !== null) {
            const dbKey = this.mapPrismaFieldToDbColumn(key);
            if ('contains' in value) {
              query = query.ilike(dbKey, `%${(value as any).contains}%`);
            } else if ('gte' in value) {
              const v = (value as any).gte instanceof Date ? (value as any).gte.toISOString() : (value as any).gte;
              query = query.gte(dbKey, v);
            } else if ('lte' in value) {
              const v = (value as any).lte instanceof Date ? (value as any).lte.toISOString() : (value as any).lte;
              query = query.lte(dbKey, v);
            } else if ('in' in value && Array.isArray((value as any).in)) {
              query = query.in(dbKey, (value as any).in);
            }
          } else {
            const dbKey = this.mapPrismaFieldToDbColumn(key);
            query = query.eq(dbKey, value);
          }
        });
      }
      
      if (options?.orderBy) {
        const orderField = Object.keys(options.orderBy)[0];
        const orderDirection = options.orderBy[orderField];
        const dbOrderField = this.mapPrismaFieldToDbColumn(orderField);
        query = query.order(dbOrderField, { ascending: orderDirection === 'asc' });
      }

      // Add pagination support
      if (options?.skip !== undefined) {
        query = query.range(options.skip, options.skip + (options.take || 10) - 1);
      } else if (options?.take !== undefined) {
        query = query.limit(options.take);
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }
      
      return data || [];
    },

    findUnique: async (options: { where: { id: string }; include?: any }) => {
      const { data, error } = await this.supabase
        .from('inventory_movements')
        .select('*')
        .eq('id', options.where.id)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        throw new Error(`Database query failed: ${error.message}`);
      }
      
      return data;
    },

    create: async (options: { data: any; include?: any }) => {
      // Map Prisma field names to database column names
      const mappedData = {
        product_id: options.data.productId,
        type: options.data.type,
        quantity: options.data.quantity,
        reason: options.data.reason,
        reference_id: options.data.referenceId
      };

      const { data, error } = await this.supabase
        .from('inventory_movements')
        .insert(mappedData)
        .select()
        .single();
      
      if (error) {
        throw new Error(`Database insert failed: ${error.message}`);
      }
      
      return data;
    },

    update: async (options: { where: { id: string }; data: any; include?: any }) => {
      // Map Prisma field names to database column names
      const mappedData: any = {};
      if (options.data.productId !== undefined) mappedData.product_id = options.data.productId;
      if (options.data.type !== undefined) mappedData.type = options.data.type;
      if (options.data.quantity !== undefined) mappedData.quantity = options.data.quantity;
      if (options.data.reason !== undefined) mappedData.reason = options.data.reason;
      if (options.data.referenceId !== undefined) mappedData.reference_id = options.data.referenceId;

      const { data, error } = await this.supabase
        .from('inventory_movements')
        .update(mappedData)
        .eq('id', options.where.id)
        .select()
        .single();
      
      if (error) {
        throw new Error(`Database update failed: ${error.message}`);
      }
      
      return data;
    },

    delete: async (options: { where: { id: string } }) => {
      const { data, error } = await this.supabase
        .from('inventory_movements')
        .delete()
        .eq('id', options.where.id)
        .select()
        .single();
      
      if (error) {
        throw new Error(`Database delete failed: ${error.message}`);
      }
      
      return data;
    },

    count: async (options?: { where?: any }) => {
      let query = this.supabase.from('inventory_movements').select('*', { count: 'exact', head: true });
      
      if (options?.where) {
        Object.entries(options.where).forEach(([key, value]) => {
          const dbKey = this.mapPrismaFieldToDbColumn(key);
          if (typeof value === 'object' && value !== null) {
            if ('contains' in value) {
              query = query.ilike(dbKey, `%${(value as any).contains}%`);
            } else if ('gte' in value) {
              const v = (value as any).gte instanceof Date ? (value as any).gte.toISOString() : (value as any).gte;
              query = query.gte(dbKey, v);
            } else if ('lte' in value) {
              const v = (value as any).lte instanceof Date ? (value as any).lte.toISOString() : (value as any).lte;
              query = query.lte(dbKey, v);
            } else if ('in' in value && Array.isArray((value as any).in)) {
              query = query.in(dbKey, (value as any).in);
            } else if ('equals' in value) {
              const v = (value as any).equals instanceof Date ? (value as any).equals.toISOString() : (value as any).equals;
              query = query.eq(dbKey, v);
            }
          } else {
            query = query.eq(dbKey, value as any);
          }
        });
      }
      
      const { count, error } = await query;
      
      if (error) {
        throw new Error(`Database count failed: ${error.message}`);
      }
      
      return count || 0;
    }
  };

  // Returns operations
  return = {
    findMany: async (options?: { where?: any; select?: any; orderBy?: any; include?: any; skip?: number; take?: number }) => {
      let query = this.supabase.from('returns').select('*');

      if (options?.where) {
        Object.entries(options.where).forEach(([key, value]) => {
          const dbKey = this.mapPrismaFieldToDbColumn(key);
          if (typeof value === 'object' && value !== null) {
            if ('contains' in value) {
              query = query.ilike(dbKey, `%${(value as any).contains}%`);
            } else if ('gte' in value) {
              query = query.gte(dbKey, (value as any).gte);
            } else if ('lte' in value) {
              query = query.lte(dbKey, (value as any).lte);
            } else if ('in' in value && Array.isArray((value as any).in)) {
              query = query.in(dbKey, (value as any).in);
            } else {
              // fallback eq for other operators not supported
              if ('equals' in value) query = query.eq(dbKey, (value as any).equals);
            }
          } else {
            query = query.eq(dbKey, value as any);
          }
        });
      }

      if (options?.orderBy) {
        const orderField = Object.keys(options.orderBy)[0];
        const dbOrderField = this.mapPrismaFieldToDbColumn(orderField);
        const orderDirection = (options.orderBy as any)[orderField];
        query = query.order(dbOrderField, { ascending: orderDirection === 'asc' });
      }

      if (options?.skip !== undefined) {
        query = query.range(options.skip, options.skip + (options.take || 10) - 1);
      } else if (options?.take !== undefined) {
        query = query.limit(options.take);
      }

      const { data, error } = await query;
      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }

      const rows = data || [];

      // Handle include relations for commonly used fields
      if (options?.include && rows.length > 0) {
        const include = options.include;
        const saleIds = rows.map((r: any) => r.original_sale_id).filter(Boolean);
        const customerIds = rows.map((r: any) => r.customer_id).filter(Boolean);
        const userIds = rows.map((r: any) => r.user_id).filter(Boolean);
        const returnIds = rows.map((r: any) => r.id);

        let salesMap = new Map<string, any>();
        let customersMap = new Map<string, any>();
        let usersMap = new Map<string, any>();
        let itemsByReturnId = new Map<string, any[]>();

        if (include.originalSale && saleIds.length > 0) {
          const { data: salesData } = await this.supabase.from('sales').select('*').in('id', saleIds);
          (salesData || []).forEach((s: any) => salesMap.set(s.id, s));
        }
        if (include.customer && customerIds.length > 0) {
          const { data: customersData } = await this.supabase.from('customers').select('*').in('id', customerIds);
          (customersData || []).forEach((c: any) => customersMap.set(c.id, c));
        }
        if (include.user && userIds.length > 0) {
          const { data: usersData } = await this.supabase.from('users').select('*').in('id', userIds);
          (usersData || []).forEach((u: any) => usersMap.set(u.id, u));
        }
        if (include.returnItems) {
          const { data: itemsData } = await this.supabase.from('return_items').select('*').in('return_id', returnIds);
          (itemsData || []).forEach((it: any) => {
            const arr = itemsByReturnId.get(it.return_id) || [];
            arr.push(it);
            itemsByReturnId.set(it.return_id, arr);
          });
        }

        return await Promise.all(rows.map(async (r: any) => {
          const enriched: any = { ...r };
          if (include.originalSale) {
            enriched.originalSale = salesMap.get(r.original_sale_id) || null;
          }
          if (include.customer) {
            enriched.customer = customersMap.get(r.customer_id) || null;
          }
          if (include.user) {
            enriched.user = usersMap.get(r.user_id) || null;
          }
          if (include.returnItems) {
            const items = itemsByReturnId.get(r.id) || [];
            if (include.returnItems?.include?.product) {
              // attach product info
              const productIds = items.map((i: any) => i.product_id);
              const { data: productsData } = await this.supabase.from('products').select('*').in('id', productIds);
              const pMap = new Map<string, any>();
              (productsData || []).forEach((p: any) => pMap.set(p.id, p));
              enriched.returnItems = items.map((i: any) => ({ ...i, product: pMap.get(i.product_id) || null }));
            } else {
              enriched.returnItems = items;
            }
          }
          return enriched;
        }));
      }

      return rows;
    },

    findUnique: async (options: { where: { id: string }; include?: any; select?: any }) => {
      const { data, error } = await this.supabase
        .from('returns')
        .select('*')
        .eq('id', options.where.id)
        .single();
      if (error && error.code !== 'PGRST116') {
        throw new Error(`Database query failed: ${error.message}`);
      }
      const row = data;
      if (!row) return null;

      if (options?.include) {
        const include = options.include;
        const enriched: any = { ...(row as Record<string, any>) };
        if (include.originalSale) {
          const { data: sale } = await this.supabase.from('sales').select('*').eq('id', row.original_sale_id).single();
          enriched.originalSale = sale || null;
        }
        if (include.customer) {
          const { data: customer } = await this.supabase.from('customers').select('*').eq('id', row.customer_id).single();
          enriched.customer = customer || null;
        }
        if (include.user) {
          const { data: user } = await this.supabase.from('users').select('*').eq('id', row.user_id).single();
          enriched.user = user || null;
        }
        if (include.returnItems) {
          const returnId: any = (row as any)?.id;
          const { data: items } = await this.supabase.from('return_items').select('*').eq('return_id', returnId);
          if (include.returnItems?.include?.product) {
            const productIds = (items || []).map((i: any) => i.product_id);
            const { data: productsData } = await this.supabase.from('products').select('*').in('id', productIds);
            const pMap = new Map<string, any>();
            (productsData || []).forEach((p: any) => pMap.set(p.id, p));
            enriched.returnItems = (items || []).map((i: any) => ({ ...i, product: pMap.get(i.product_id) || null }));
          } else {
            enriched.returnItems = items || [];
          }
        }
        return enriched;
      }

      return row;
    },

    create: async (options: { data: any }) => {
      const mapped: any = {};
      Object.entries(options.data || {}).forEach(([key, value]) => {
        const dbKey = this.mapPrismaFieldToDbColumn(key);
        mapped[dbKey] = value as any;
      });
      const { data, error } = await this.supabase
        .from('returns')
        .insert(mapped)
        .select()
        .single();
      if (error) {
        throw new Error(`Database insert failed: ${error.message}`);
      }
      return data;
    },

    update: async (options: { where: { id: string }; data: any }) => {
      const mapped: any = {};
      Object.entries(options.data || {}).forEach(([key, value]) => {
        const dbKey = this.mapPrismaFieldToDbColumn(key);
        mapped[dbKey] = value as any;
      });
      const { data, error } = await this.supabase
        .from('returns')
        .update(mapped)
        .eq('id', options.where.id)
        .select()
        .single();
      if (error) {
        throw new Error(`Database update failed: ${error.message}`);
      }
      return data;
    },

    delete: async (options: { where: { id: string } }) => {
      const { data, error } = await this.supabase
        .from('returns')
        .delete()
        .eq('id', options.where.id)
        .select()
        .single();
      if (error) {
        throw new Error(`Database delete failed: ${error.message}`);
      }
      return data;
    },

    count: async (options?: { where?: any }) => {
      let query = this.supabase.from('returns').select('*', { count: 'exact', head: true });
      if (options?.where) {
        Object.entries(options.where).forEach(([key, value]) => {
          const dbKey = this.mapPrismaFieldToDbColumn(key);
          if (typeof value === 'object' && value !== null) {
            if ('gte' in value) query = query.gte(dbKey, (value as any).gte);
            else if ('lte' in value) query = query.lte(dbKey, (value as any).lte);
          } else {
            query = query.eq(dbKey, value as any);
          }
        });
      }
      const { count, error } = await query;
      if (error) {
        throw new Error(`Database count failed: ${error.message}`);
      }
      return count || 0;
    }
  };

  // Return items operations
  returnItem = {
    create: async (options: { data: any }) => {
      const mapped: any = {};
      Object.entries(options.data || {}).forEach(([key, value]) => {
        const dbKey = this.mapPrismaFieldToDbColumn(key);
        mapped[dbKey] = value as any;
      });
      const { data, error } = await this.supabase
        .from('return_items')
        .insert(mapped)
        .select()
        .single();
      if (error) {
        throw new Error(`Database insert failed: ${error.message}`);
      }
      return data;
    },

    findMany: async (options?: { where?: any }) => {
      let query = this.supabase.from('return_items').select('*');
      if (options?.where) {
        Object.entries(options.where).forEach(([key, value]) => {
          const dbKey = this.mapPrismaFieldToDbColumn(key);
          query = query.eq(dbKey, value as any);
        });
      }
      const { data, error } = await query;
      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }
      return data || [];
    }
  };

  // Audit Log operations - Direct Supabase queries
  auditLog = {
    findMany: async (options?: { where?: any; orderBy?: any; take?: number; skip?: number }) => {
      let query = this.supabase.from('audit_logs').select('*');

      if (options?.where) {
        Object.entries(options.where).forEach(([key, value]) => {
          const dbKey = this.mapPrismaFieldToDbColumn(key);
          if (key === 'OR' && Array.isArray(value)) {
            // Handle OR conditions - use first for simplicity
            const first = value[0];
            if (first) {
              Object.entries(first).forEach(([k, v]) => {
                const dbK = this.mapPrismaFieldToDbColumn(k);
                if (typeof v === 'object' && v !== null) {
                  if ('contains' in v) query = query.ilike(dbK, `%${(v as any).contains}%`);
                } else {
                  query = query.eq(dbK, v as any);
                }
              });
            }
          } else if (typeof value === 'object' && value !== null) {
            if ('gte' in value) query = query.gte(dbKey, (value as any).gte);
            else if ('lte' in value) query = query.lte(dbKey, (value as any).lte);
            else if ('contains' in value) query = query.ilike(dbKey, `%${(value as any).contains}%`);
            else if ('in' in value && Array.isArray((value as any).in)) query = query.in(dbKey, (value as any).in);
            else query = query.eq(dbKey, value as any);
          } else {
            query = query.eq(dbKey, value as any);
          }
        });
      }

      if (options?.orderBy) {
        const field = Object.keys(options.orderBy)[0];
        const dir = options.orderBy[field];
        const dbField = this.mapPrismaFieldToDbColumn(field);
        query = query.order(dbField, { ascending: dir === 'asc' });
      } else {
        query = query.order('timestamp', { ascending: false });
      }

      if (options?.skip !== undefined) {
        query = query.range(options.skip, options.skip + (options.take || 20) - 1);
      } else if (options?.take !== undefined) {
        query = query.limit(options.take);
      }

      const { data, error } = await query;
      if (error) throw new Error(`Database query failed: ${error.message}`);
      
      // Map DB columns back to Prisma field names
      return (data || []).map((row: any) => ({
        id: row.id,
        action: row.action,
        entityType: row.entity_type,
        entityId: row.entity_id,
        userId: row.user_id,
        userEmail: row.user_email,
        userRole: row.user_role,
        ipAddress: row.ip_address,
        changes: row.changes,
        oldData: row.old_data,
        newData: row.new_data,
        timestamp: row.timestamp,
        createdAt: row.created_at,
      }));
    },

    count: async (options?: { where?: any }) => {
      let query = this.supabase.from('audit_logs').select('id', { count: 'exact', head: true });

      if (options?.where) {
        Object.entries(options.where).forEach(([key, value]) => {
          const dbKey = this.mapPrismaFieldToDbColumn(key);
          if (key === 'OR' && Array.isArray(value)) {
            const first = value[0];
            if (first) {
              Object.entries(first).forEach(([k, v]) => {
                const dbK = this.mapPrismaFieldToDbColumn(k);
                if (typeof v === 'object' && v !== null) {
                  if ('contains' in v) query = query.ilike(dbK, `%${(v as any).contains}%`);
                } else {
                  query = query.eq(dbK, v as any);
                }
              });
            }
          } else if (typeof value === 'object' && value !== null) {
            if ('gte' in value) query = query.gte(dbKey, (value as any).gte);
            else if ('lte' in value) query = query.lte(dbKey, (value as any).lte);
            else if ('contains' in value) query = query.ilike(dbKey, `%${(value as any).contains}%`);
            else if ('in' in value && Array.isArray((value as any).in)) query = query.in(dbKey, (value as any).in);
            else query = query.eq(dbKey, value as any);
          } else {
            query = query.eq(dbKey, value as any);
          }
        });
      }

      const { count, error } = await query;
      if (error) throw new Error(`Database count failed: ${error.message}`);
      return count || 0;
    },

    create: async (options: { data: any }) => {
      const mappedData = {
        action: options.data.action,
        entity_type: options.data.entityType,
        entity_id: options.data.entityId || '',
        user_id: options.data.userId,
        user_email: options.data.userEmail,
        user_role: options.data.userRole,
        ip_address: options.data.ipAddress,
        changes: options.data.changes,
        old_data: options.data.oldData,
        new_data: options.data.newData,
        timestamp: options.data.timestamp || new Date().toISOString(),
      };

      const { data, error } = await this.supabase
        .from('audit_logs')
        .insert(mappedData)
        .select()
        .single();

      if (error) throw new Error(`Database insert failed: ${error.message}`);
      return data;
    },

    groupBy: async (options: { by: string[]; _count?: any; where?: any; orderBy?: any; take?: number }) => {
      const field = options.by[0];
      const dbField = this.mapPrismaFieldToDbColumn(field);
      
      let query = this.supabase.from('audit_logs').select(dbField);

      if (options.where) {
        Object.entries(options.where).forEach(([key, value]) => {
          const dbKey = this.mapPrismaFieldToDbColumn(key);
          if (typeof value === 'object' && value !== null) {
            if ('gte' in value) query = query.gte(dbKey, (value as any).gte);
            else if ('lte' in value) query = query.lte(dbKey, (value as any).lte);
          } else {
            query = query.eq(dbKey, value as any);
          }
        });
      }

      const { data, error } = await query;
      if (error) throw new Error(`Database query failed: ${error.message}`);

      // Group manually
      const grouped = new Map<string, number>();
      (data || []).forEach((row: any) => {
        const val = row[dbField] || 'UNKNOWN';
        grouped.set(val, (grouped.get(val) || 0) + 1);
      });

      let result = Array.from(grouped.entries()).map(([val, count]) => ({
        [field]: val,
        _count: { [field]: count },
      }));

      // Sort by count descending
      if (options.orderBy?._count) {
        result.sort((a, b) => b._count[field] - a._count[field]);
      }

      if (options.take) {
        result = result.slice(0, options.take);
      }

      return result;
    },

    deleteMany: async (options?: { where?: any }) => {
      let query = this.supabase.from('audit_logs').delete();

      if (options?.where) {
        Object.entries(options.where).forEach(([key, value]) => {
          const dbKey = this.mapPrismaFieldToDbColumn(key);
          if (typeof value === 'object' && value !== null) {
            if ('lt' in value) query = query.lt(dbKey, (value as any).lt);
            else if ('lte' in value) query = query.lte(dbKey, (value as any).lte);
          } else {
            query = query.eq(dbKey, value as any);
          }
        });
      }

      const { error, count } = await query;
      if (error) throw new Error(`Database delete failed: ${error.message}`);
      return { count: count || 0 };
    },
  };

  $queryRaw = async (query: any) => {
    // For simple queries like SELECT 1, just return a mock result
    if (query.toString().includes('SELECT 1')) {
      return [{ '?column?': 1 }];
    }
    throw new Error('Raw queries not supported in Supabase adapter');
  };

  // Emulación limitada de consultas raw inseguras usadas en customer-history
  $queryRawUnsafe = async (query: string, ...params: any[]) => {
    const q = String(query);

    const getParamByIndex = (placeholder: number) => params[placeholder - 1];

    // Timeline: UNION de eventos + interacciones + notas, con filtros y paginación
    if (q.includes('FROM customer_history_events') && q.includes('UNION ALL') && q.includes('FROM customer_interactions') && q.includes('FROM customer_notes')) {
      const customerId = params[0];
      const limit = params[params.length - 2] ?? 20;
      const offset = params[params.length - 1] ?? 0;

      const eventTypeIdx = (() => { const m = q.match(/event_type\s*=\s*\$(\d+)/); return m ? Number(m[1]) : undefined; })();
      const categoryIdx = (() => { const m = q.match(/event_category\s*=\s*\$(\d+)/); return m ? Number(m[1]) : undefined; })();
      const startDateIdx = (() => { const m = q.match(/created_at\s*>=\s*\$(\d+)/); return m ? Number(m[1]) : undefined; })();
      const endDateIdx = (() => { const m = q.match(/created_at\s*<=\s*\$(\d+)/); return m ? Number(m[1]) : undefined; })();
      const ilikeIdx = (() => { const m = q.match(/ILIKE\s*\$(\d+)/); return m ? Number(m[1]) : undefined; })();

      const eventType = eventTypeIdx ? getParamByIndex(eventTypeIdx) : undefined;
      const category = categoryIdx ? getParamByIndex(categoryIdx) : undefined;
      const startDate = startDateIdx ? getParamByIndex(startDateIdx) : undefined;
      const endDate = endDateIdx ? getParamByIndex(endDateIdx) : undefined;
      const search = ilikeIdx ? getParamByIndex(ilikeIdx) : undefined;

      const prefetchLimit = Number(limit) + Number(offset);

      // Eventos
      let evQuery = this.supabase
        .from('customer_history_events')
        .select('*')
        .eq('customer_id', customerId);
      if (eventType) evQuery = evQuery.eq('event_type', eventType);
      if (category) evQuery = evQuery.eq('event_category', category);
      if (startDate) evQuery = evQuery.gte('created_at', startDate);
      if (endDate) evQuery = evQuery.lte('created_at', endDate);
      const { data: evRows, error: evErr } = await evQuery.order('created_at', { ascending: false }).limit(prefetchLimit);
      if (evErr) throw new Error(`Database query failed: ${evErr.message}`);

      // Interacciones
      let inQuery = this.supabase
        .from('customer_interactions')
        .select('*')
        .eq('customer_id', customerId);
      if (startDate) inQuery = inQuery.gte('created_at', startDate);
      if (endDate) inQuery = inQuery.lte('created_at', endDate);
      const { data: inRows, error: inErr } = await inQuery.order('created_at', { ascending: false }).limit(prefetchLimit);
      if (inErr) throw new Error(`Database query failed: ${inErr.message}`);

      // Notas
      let noQuery = this.supabase
        .from('customer_notes')
        .select('*')
        .eq('customer_id', customerId);
      if (startDate) noQuery = noQuery.gte('created_at', startDate);
      if (endDate) noQuery = noQuery.lte('created_at', endDate);
      const { data: noRows, error: noErr } = await noQuery.order('created_at', { ascending: false }).limit(prefetchLimit);
      if (noErr) throw new Error(`Database query failed: ${noErr.message}`);

      const merged = [
        ...(evRows || []).map((r: any) => ({
          source_type: 'event',
          id: r.id,
          customer_id: r.customer_id,
          type: r.event_type,
          title: r.title,
          description: r.description,
          amount: r.amount,
          reference_id: r.reference_id,
          reference_type: r.reference_type,
          metadata: r.metadata,
          created_by: r.created_by,
          created_at: r.created_at,
          updated_at: r.created_at
        })),
        ...(inRows || []).map((r: any) => ({
          source_type: 'interaction',
          id: r.id,
          customer_id: r.customer_id,
          type: r.interaction_type,
          title: r.subject,
          description: r.content,
          amount: null,
          reference_id: null,
          reference_type: r.channel,
          metadata: { status: r.status, priority: r.priority, outcome: r.outcome, tags: r.tags },
          created_by: r.created_by,
          created_at: r.created_at,
          updated_at: r.updated_at
        })),
        ...(noRows || []).map((r: any) => ({
          source_type: 'note',
          id: r.id,
          customer_id: r.customer_id,
          type: r.note_type,
          title: r.title ?? 'Nota',
          description: r.content,
          amount: null,
          reference_id: null,
          reference_type: null,
          metadata: { is_private: r.is_private, is_important: r.is_important, tags: r.tags },
          created_by: r.created_by,
          created_at: r.created_at,
          updated_at: r.updated_at
        }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const filtered = search ? merged.filter(m => {
        const s = String(search).replace(/%/g, '').toLowerCase();
        return (
          (m.title && String(m.title).toLowerCase().includes(s)) ||
          (m.description && String(m.description).toLowerCase().includes(s))
        );
      }) : merged;

      return filtered.slice(Number(offset), Number(offset) + Number(limit));
    }

    // Conteo para timeline (eventos + interacciones + notas)
    if (q.includes('SELECT COUNT(*) as count FROM') && q.includes('customer_history_events') && q.includes('customer_interactions') && q.includes('customer_notes')) {
      const customerId = params[0];
      const { count: eventsCount, error: evErr } = await this.supabase
        .from('customer_history_events')
        .select('id', { count: 'exact', head: true })
        .eq('customer_id', customerId);
      if (evErr) throw new Error(`Database count failed: ${evErr.message}`);
      const { count: interactionsCount, error: inErr } = await this.supabase
        .from('customer_interactions')
        .select('id', { count: 'exact', head: true })
        .eq('customer_id', customerId);
      if (inErr) throw new Error(`Database count failed: ${inErr.message}`);
      const { count: notesCount, error: noErr } = await this.supabase
        .from('customer_notes')
        .select('id', { count: 'exact', head: true })
        .eq('customer_id', customerId);
      if (noErr) throw new Error(`Database count failed: ${noErr.message}`);
      return [{ count: (eventsCount || 0) + (interactionsCount || 0) + (notesCount || 0) }];
    }

    // Listado de interacciones con búsqueda y paginación
    if (q.includes('FROM customer_interactions') && q.includes('SELECT *')) {
      const customerId = params[0];
      const limit = params[params.length - 2] ?? 20;
      const offset = params[params.length - 1] ?? 0;
      const ilikeIdx = (() => { const m = q.match(/ILIKE\s*\$(\d+)/); return m ? Number(m[1]) : undefined; })();
      const search = ilikeIdx ? params[ilikeIdx - 1] : undefined;

      let queryBuilder = this.supabase.from('customer_interactions').select('*').eq('customer_id', customerId).order('created_at', { ascending: false });
      const { data, error } = await queryBuilder;
      if (error) throw new Error(`Database query failed: ${error.message}`);
      let rows = (data || []) as any[];
      if (search) {
        const s = String(search).replace(/%/g, '').toLowerCase();
        rows = rows.filter(r => (r.subject && String(r.subject).toLowerCase().includes(s)) || (r.content && String(r.content).toLowerCase().includes(s)));
      }
      return rows.slice(Number(offset), Number(offset) + Number(limit));
    }

    // Conteo de interacciones con búsqueda
    if (q.includes('SELECT COUNT(*) as count FROM customer_interactions')) {
      const customerId = params[0];
      const ilikeIdx = (() => { const m = q.match(/ILIKE\s*\$(\d+)/); return m ? Number(m[1]) : undefined; })();
      const search = ilikeIdx ? params[ilikeIdx - 1] : undefined;
      const { count, error } = await this.supabase.from('customer_interactions').select('id', { count: 'exact', head: true }).eq('customer_id', customerId);
      if (error) throw new Error(`Database count failed: ${error.message}`);
      let total = count || 0;
      if (search) {
        const { data: rows } = await this.supabase.from('customer_interactions').select('subject, content').eq('customer_id', customerId);
        const s = String(search).replace(/%/g, '').toLowerCase();
        total = (rows || []).filter(r => (r.subject && String(r.subject).toLowerCase().includes(s)) || (r.content && String(r.content).toLowerCase().includes(s))).length;
      }
      return [{ count: total }];
    }

    // Listado de notas con join a users para created_by_name
    if (q.includes('FROM customer_notes') && q.includes('SELECT n.*')) {
      const customerId = params[0];
      const limit = params[params.length - 2] ?? 20;
      const offset = params[params.length - 1] ?? 0;
      const ilikeIdx = (() => { const m = q.match(/ILIKE\s*\$(\d+)/); return m ? Number(m[1]) : undefined; })();
      const search = ilikeIdx ? params[ilikeIdx - 1] : undefined;

      const { data, error } = await this.supabase.from('customer_notes').select('*').eq('customer_id', customerId);
      if (error) throw new Error(`Database query failed: ${error.message}`);
      let rows = (data || []) as any[];
      if (search) {
        const s = String(search).replace(/%/g, '').toLowerCase();
        rows = rows.filter(r => (r.title && String(r.title).toLowerCase().includes(s)) || (r.content && String(r.content).toLowerCase().includes(s)));
      }
      // Obtener nombres de usuarios para created_by
      const userIds = Array.from(new Set(rows.map(r => r.created_by).filter(Boolean)));
      let userMap: Record<string, string> = {};
      if (userIds.length) {
        const { data: users, error: userErr } = await this.supabase.from('users').select('id, full_name').in('id', userIds);
        if (userErr) throw new Error(`Database query failed: ${userErr.message}`);
        (users || []).forEach((u: any) => { userMap[u.id] = u.full_name; });
      }

      rows = rows.map(r => ({ ...r, created_by_name: userMap[r.created_by] || null }));
      rows.sort((a, b) => {
        if ((b.is_important ? 1 : 0) !== (a.is_important ? 1 : 0)) return (b.is_important ? 1 : 0) - (a.is_important ? 1 : 0);
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      return rows.slice(Number(offset), Number(offset) + Number(limit));
    }

    // Conteo de notas con búsqueda
    if (q.includes('SELECT COUNT(*) as count FROM customer_notes')) {
      const customerId = params[0];
      const ilikeIdx = (() => { const m = q.match(/ILIKE\s*\$(\d+)/); return m ? Number(m[1]) : undefined; })();
      const search = ilikeIdx ? params[ilikeIdx - 1] : undefined;
      const { count, error } = await this.supabase.from('customer_notes').select('id', { count: 'exact', head: true }).eq('customer_id', customerId);
      if (error) throw new Error(`Database count failed: ${error.message}`);
      let total = count || 0;
      if (search) {
        const { data: rows } = await this.supabase.from('customer_notes').select('title, content').eq('customer_id', customerId);
        const s = String(search).replace(/%/g, '').toLowerCase();
        total = (rows || []).filter(r => (r.title && String(r.title).toLowerCase().includes(s)) || (r.content && String(r.content).toLowerCase().includes(s))).length;
      }
      return [{ count: total }];
    }

    // Preferencias: SELECT
    if (q.includes('SELECT * FROM customer_preferences')) {
      const customerId = params[0];
      const { data, error } = await this.supabase.from('customer_preferences').select('*').eq('customer_id', customerId);
      if (error) throw new Error(`Database query failed: ${error.message}`);
      return data || [];
    }

    // Analytics de eventos
    if (q.includes('FROM customer_history_events') && q.includes('COUNT(') && q.includes('SUM(') && q.includes('AVG(')) {
      const customerId = params[0];
      const { data, error } = await this.supabase.from('customer_history_events').select('*').eq('customer_id', customerId);
      if (error) throw new Error(`Database query failed: ${error.message}`);
      const rows = (data || []) as any[];
      const total_events = rows.length;
      const total_purchases = rows.filter(r => r.event_type === 'purchase').length;
      const total_returns = rows.filter(r => r.event_type === 'return').length;
      const total_communications = rows.filter(r => r.event_type === 'communication').length;
      const purchaseRows = rows.filter(r => r.event_type === 'purchase');
      const total_spent = purchaseRows.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
      const avg_purchase_amount = purchaseRows.length ? (total_spent / purchaseRows.length) : null;
      const createdAts = rows.map(r => new Date(r.created_at).getTime()).sort((a, b) => a - b);
      const first_event = createdAts.length ? new Date(createdAts[0]).toISOString() : null;
      const last_event = createdAts.length ? new Date(createdAts[createdAts.length - 1]).toISOString() : null;
      const last_purchaseRow = purchaseRows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
      const last_purchase = last_purchaseRow ? last_purchaseRow.created_at : null;
      return [{ total_events, total_purchases, total_returns, total_communications, total_spent, avg_purchase_amount, first_event, last_event, last_purchase }];
    }

    // Analytics de interacciones
    if (q.includes('FROM customer_interactions') && q.includes('total_interactions')) {
      const customerId = params[0];
      const { data, error } = await this.supabase.from('customer_interactions').select('*').eq('customer_id', customerId);
      if (error) throw new Error(`Database query failed: ${error.message}`);
      const rows = (data || []) as any[];
      const total_interactions = rows.length;
      const completed_interactions = rows.filter(r => r.status === 'completed').length;
      const high_priority_interactions = rows.filter(r => r.priority === 'high' || r.priority === 'urgent').length;
      return [{ total_interactions, completed_interactions, high_priority_interactions }];
    }

    // Analytics de notas
    if (q.includes('FROM customer_notes') && q.includes('total_notes')) {
      const customerId = params[0];
      const { data, error } = await this.supabase.from('customer_notes').select('*').eq('customer_id', customerId);
      if (error) throw new Error(`Database query failed: ${error.message}`);
      const rows = (data || []) as any[];
      const total_notes = rows.length;
      const important_notes = rows.filter(r => r.is_important === true).length;
      return [{ total_notes, important_notes }];
    }

    throw new Error('Unsafe raw query not supported in Supabase adapter');
  };

  // Emulación limitada de executeRawUnsafe para inserts/updates
  $executeRawUnsafe = async (query: string, ...params: any[]) => {
    const q = String(query);

    // Insertar evento de historial
    if (q.includes('INSERT INTO customer_history_events')) {
      const [customer_id, event_type, event_category, title, description, amount, reference_id, reference_type, metadata, created_by] = params;
      const metaObj = typeof metadata === 'string' ? (() => { try { return JSON.parse(metadata); } catch { return {}; } })() : (metadata || {});
      const { data, error } = await this.supabase
        .from('customer_history_events')
        .insert([{ customer_id, event_type, event_category, title, description, amount, reference_id, reference_type, metadata: metaObj, created_by }]);
      if (error) throw new Error(`Database insert failed: ${error.message}`);
      return data;
    }

    // Insertar interacción
    if (q.includes('INSERT INTO customer_interactions')) {
      const [customer_id, interaction_type, channel, subject, content, status, priority, outcome, follow_up_date, tags, created_by, assigned_to] = params;
      const tagsArr = typeof tags === 'string' ? (() => { try { return JSON.parse(tags); } catch { return []; } })() : (tags || []);
      const { data, error } = await this.supabase
        .from('customer_interactions')
        .insert([{ customer_id, interaction_type, channel, subject, content, status, priority, outcome, follow_up_date, tags: tagsArr, created_by, assigned_to }]);
      if (error) throw new Error(`Database insert failed: ${error.message}`);
      return data;
    }

    // Insertar nota
    if (q.includes('INSERT INTO customer_notes')) {
      const [customer_id, note_type, title, content, is_private, is_important, tags, created_by] = params;
      const tagsArr = typeof tags === 'string' ? (() => { try { return JSON.parse(tags); } catch { return []; } })() : (tags || []);
      const { data, error } = await this.supabase
        .from('customer_notes')
        .insert([{ customer_id, note_type, title, content, is_private, is_important, tags: tagsArr, created_by }]);
      if (error) throw new Error(`Database insert failed: ${error.message}`);
      return data;
    }

    // Insertar preferencias por defecto
    if (q.includes('INSERT INTO customer_preferences')) {
      const [customer_id] = params;
      const { data, error } = await this.supabase
        .from('customer_preferences')
        .insert([{ customer_id }]);
      if (error) throw new Error(`Database insert failed: ${error.message}`);
      return data;
    }

    // Actualizar preferencias dinámicas
    if (q.includes('UPDATE customer_preferences')) {
      const setMatch = q.match(/SET\s+([\s\S]+?)\s+WHERE/i);
      const whereMatch = q.match(/WHERE\s+customer_id\s*=\s*\$(\d+)/i);
      const customerIdIdx = whereMatch ? Number(whereMatch[1]) : params.length;
      const customer_id = params[customerIdIdx - 1];

      const updateObj: any = {};
      if (setMatch) {
        const setClause = setMatch[1];
        const pairs = setClause.split(',');
        for (const rawPair of pairs) {
          const pair = rawPair.trim();
          const m = pair.match(/(\w+)\s*=\s*\$(\d+)/);
          if (m) {
            const col = m[1];
            const idx = Number(m[2]);
            let val = params[idx - 1];
            // Intentar parsear JSON si aplica
            if (typeof val === 'string') {
              const trimmed = val.trim();
              if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
                try { val = JSON.parse(trimmed); } catch { /* ignore */ }
              }
            }
            updateObj[col] = val;
          } else if (/updated_at\s*=\s*NOW\(\)/i.test(pair)) {
            updateObj['updated_at'] = new Date().toISOString();
          }
        }
      }

      const { data, error } = await this.supabase
        .from('customer_preferences')
        .update(updateObj)
        .eq('customer_id', customer_id);
      if (error) throw new Error(`Database update failed: ${error.message}`);
      return data;
    }

    throw new Error('Unsafe execute query not supported in Supabase adapter');
  };

  $transaction = async (operations: any[] | ((tx: any) => Promise<any>)) => {
    // Supabase doesn't support transactions in the same way
    if (Array.isArray(operations)) {
      // Handle array of operations
      const results = [];
      for (const operation of operations) {
        results.push(await operation);
      }
      return results;
    } else {
      // Handle callback function
      return operations(this);
    }
  };

  // Role operations
  role = {
    findUnique: async (options: { where: { name: string }; select?: any }) => {
      // Mock role data based on the role name
      const rolePermissions = {
        'ADMIN': [
          { id: 1, name: 'products:read', resource: 'products', action: 'read' },
          { id: 2, name: 'products:create', resource: 'products', action: 'create' },
          { id: 3, name: 'products:update', resource: 'products', action: 'update' },
          { id: 4, name: 'products:delete', resource: 'products', action: 'delete' },
          { id: 5, name: 'customers:read', resource: 'customers', action: 'read' },
          { id: 6, name: 'customers:create', resource: 'customers', action: 'create' },
          { id: 7, name: 'customers:update', resource: 'customers', action: 'update' },
          { id: 8, name: 'customers:delete', resource: 'customers', action: 'delete' },
          { id: 9, name: 'inventory:read', resource: 'inventory', action: 'read' },
          { id: 10, name: 'inventory:create', resource: 'inventory', action: 'create' },
          { id: 11, name: 'inventory:update', resource: 'inventory', action: 'update' },
          { id: 12, name: 'inventory:delete', resource: 'inventory', action: 'delete' },
          { id: 13, name: 'sales:read', resource: 'sales', action: 'read' },
          { id: 14, name: 'sales:create', resource: 'sales', action: 'create' },
          { id: 15, name: 'sales:update', resource: 'sales', action: 'update' },
          { id: 16, name: 'sales:delete', resource: 'sales', action: 'delete' },
          { id: 17, name: 'reports:read', resource: 'reports', action: 'read' },
          { id: 18, name: 'reports:create', resource: 'reports', action: 'create' },
          { id: 19, name: 'users:read', resource: 'users', action: 'read' },
          { id: 20, name: 'users:create', resource: 'users', action: 'create' },
          { id: 21, name: 'users:update', resource: 'users', action: 'update' },
          { id: 22, name: 'users:delete', resource: 'users', action: 'delete' },
          { id: 23, name: 'roles:read', resource: 'roles', action: 'read' },
          { id: 24, name: 'roles:create', resource: 'roles', action: 'create' },
          { id: 25, name: 'roles:update', resource: 'roles', action: 'update' },
          { id: 26, name: 'roles:delete', resource: 'roles', action: 'delete' },
          { id: 27, name: 'settings:read', resource: 'settings', action: 'read' },
          { id: 28, name: 'settings:update', resource: 'settings', action: 'update' }
        ],
        'MANAGER': [
          { id: 1, name: 'products:read', resource: 'products', action: 'read' },
          { id: 2, name: 'products:create', resource: 'products', action: 'create' },
          { id: 3, name: 'products:update', resource: 'products', action: 'update' },
          { id: 5, name: 'customers:read', resource: 'customers', action: 'read' },
          { id: 6, name: 'customers:create', resource: 'customers', action: 'create' },
          { id: 7, name: 'customers:update', resource: 'customers', action: 'update' },
          { id: 9, name: 'inventory:read', resource: 'inventory', action: 'read' },
          { id: 10, name: 'inventory:create', resource: 'inventory', action: 'create' },
          { id: 11, name: 'inventory:update', resource: 'inventory', action: 'update' },
          { id: 13, name: 'sales:read', resource: 'sales', action: 'read' },
          { id: 14, name: 'sales:create', resource: 'sales', action: 'create' },
          { id: 15, name: 'sales:update', resource: 'sales', action: 'update' },
          { id: 17, name: 'reports:read', resource: 'reports', action: 'read' },
          { id: 18, name: 'reports:create', resource: 'reports', action: 'create' }
        ],
        'EMPLOYEE': [
          { id: 1, name: 'products:read', resource: 'products', action: 'read' },
          { id: 5, name: 'customers:read', resource: 'customers', action: 'read' },
          { id: 6, name: 'customers:create', resource: 'customers', action: 'create' },
          { id: 9, name: 'inventory:read', resource: 'inventory', action: 'read' },
          { id: 13, name: 'sales:read', resource: 'sales', action: 'read' },
          { id: 14, name: 'sales:create', resource: 'sales', action: 'create' }
        ]
      };

      const roleName = options.where.name;
      const permissions = rolePermissions[roleName as keyof typeof rolePermissions] || [];

      if (!permissions.length) {
        return null;
      }

      // Create mock role structure
      const roleData = {
        id: roleName === 'ADMIN' ? 1 : roleName === 'MANAGER' ? 2 : 3,
        name: roleName,
        permissions: permissions.map(permission => ({
          id: permission.id,
          roleId: roleName === 'ADMIN' ? 1 : roleName === 'MANAGER' ? 2 : 3,
          permissionId: permission.id,
          isActive: true,
          permission: {
            id: permission.id,
            name: permission.name,
            resource: permission.resource,
            action: permission.action,
            description: `${permission.action} access to ${permission.resource}`,
            isActive: true
          }
        }))
      };

      return roleData;
    }
  };
}

// Export singleton instance
// NOTE:
// We intentionally avoid creating a singleton instance at module import time.
// Doing so would throw when Supabase environment variables are missing.
// Consumers should instantiate `new SupabasePrismaAdapter()` conditionally.
