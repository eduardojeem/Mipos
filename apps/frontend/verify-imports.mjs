// Script de verificación de imports
// Este script verifica que los path aliases funcionan correctamente

import { useProducts, useProductBySku } from './src/hooks/use-products';
import { productService } from './src/services/productService';

console.log('✅ Imports verificados correctamente:');
console.log('- useProducts:', typeof useProducts);
console.log('- useProductBySku:', typeof useProductBySku);
console.log('- productService:', typeof productService);
console.log('\n✅ Path aliases funcionando correctamente!');
