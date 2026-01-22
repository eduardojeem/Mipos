/**
 * Unit tests for data transformer utilities
 * Tests transformation functions with various API response formats
 */

import {
  transformApiOfferToSpecialOffer,
  transformSupabaseRowToPublicOffer,
  transformProductToFeaturedProduct,
  getValidImageUrl,
} from '../dataTransformers';

describe('dataTransformers', () => {
  const mockFormatCurrency = (n: number) => `₲${n.toLocaleString('es-PY')}`;

  describe('transformApiOfferToSpecialOffer', () => {
    it('should transform complete API offer', () => {
      const apiOffer = {
        name: 'Test Product',
        salePrice: 100000,
        offerPrice: 80000,
        promotion: {
          name: 'Black Friday',
          endDate: '2024-12-31T23:59:59Z',
        },
        image: 'https://example.com/image.jpg',
      };

      const result = transformApiOfferToSpecialOffer(apiOffer, mockFormatCurrency);

      expect(result.title).toBe('Test Product');
      expect(result.description).toContain('₲100.000');
      expect(result.description).toContain('₲80.000');
      expect(result.description).toContain('Black Friday');
      expect(result.validUntil).toBe('2024-12-31');
      expect(result.image).toBe('https://example.com/image.jpg');
    });

    it('should handle missing offer price', () => {
      const apiOffer = {
        name: 'Test Product',
        salePrice: 100000,
        image: '/test.jpg',
      };

      const result = transformApiOfferToSpecialOffer(apiOffer, mockFormatCurrency);

      expect(result.title).toBe('Test Product');
      expect(result.description).toContain('Precio');
      expect(result.description).not.toContain('Antes');
    });

    it('should use fallback for missing image', () => {
      const apiOffer = {
        name: 'Test Product',
        salePrice: 100000,
      };

      const result = transformApiOfferToSpecialOffer(apiOffer, mockFormatCurrency);

      expect(result.image).toBe('/api/placeholder/400/200');
    });

    it('should handle missing promotion name', () => {
      const apiOffer = {
        name: 'Test Product',
        salePrice: 100000,
        offerPrice: 80000,
        promotion: {
          endDate: '2024-12-31',
        },
      };

      const result = transformApiOfferToSpecialOffer(apiOffer, mockFormatCurrency);

      expect(result.description).not.toContain('—');
    });

    it('should use default title for missing name', () => {
      const apiOffer = {
        salePrice: 100000,
      };

      const result = transformApiOfferToSpecialOffer(apiOffer, mockFormatCurrency);

      expect(result.title).toBe('Producto en oferta');
    });
  });

  describe('transformSupabaseRowToPublicOffer', () => {
    it('should transform complete Supabase row with percentage discount', () => {
      const row = {
        product: {
          id: '123',
          name: 'Test Product',
          sale_price: 100000,
          image_url: '/test.jpg',
          images: [{ url: '/test-1.jpg' }],
        },
        promotions: {
          id: 'promo-1',
          name: 'Summer Sale',
          discount_type: 'PERCENTAGE',
          discount_value: 20,
          start_date: '2024-01-01',
          end_date: '2024-12-31',
          is_active: true,
        },
      };

      const result = transformSupabaseRowToPublicOffer(row);

      expect(result.product.id).toBe('123');
      expect(result.product.name).toBe('Test Product');
      expect(result.basePrice).toBe(100000);
      expect(result.offerPrice).toBe(80000); // 20% off
      expect(result.discountPercent).toBe(20);
      expect(result.promotion).not.toBeNull();
      expect(result.promotion?.name).toBe('Summer Sale');
    });

    it('should transform row with fixed amount discount', () => {
      const row = {
        product: {
          id: '123',
          name: 'Test Product',
          sale_price: 100000,
        },
        promotions: {
          id: 'promo-1',
          name: 'Fixed Discount',
          discount_type: 'FIXED_AMOUNT',
          discount_value: 15000,
          is_active: true,
        },
      };

      const result = transformSupabaseRowToPublicOffer(row);

      expect(result.offerPrice).toBe(85000); // 100000 - 15000
      expect(result.discountPercent).toBe(15); // 15000/100000 * 100
    });

    it('should handle inactive promotion', () => {
      const row = {
        product: {
          id: '123',
          name: 'Test Product',
          sale_price: 100000,
        },
        promotions: {
          id: 'promo-1',
          name: 'Inactive',
          discount_type: 'PERCENTAGE',
          discount_value: 20,
          is_active: false,
        },
      };

      const result = transformSupabaseRowToPublicOffer(row);

      expect(result.promotion).toBeNull();
      expect(result.offerPrice).toBe(100000); // No discount
      expect(result.discountPercent).toBe(0);
    });

    it('should handle missing promotion', () => {
      const row = {
        product: {
          id: '123',
          name: 'Test Product',
          sale_price: 100000,
        },
      };

      const result = transformSupabaseRowToPublicOffer(row);

      expect(result.promotion).toBeNull();
      expect(result.offerPrice).toBe(100000);
      expect(result.discountPercent).toBe(0);
    });

    it('should prevent negative prices', () => {
      const row = {
        product: {
          id: '123',
          name: 'Test Product',
          sale_price: 10000,
        },
        promotions: {
          id: 'promo-1',
          name: 'Huge Discount',
          discount_type: 'FIXED_AMOUNT',
          discount_value: 20000, // More than base price
          is_active: true,
        },
      };

      const result = transformSupabaseRowToPublicOffer(row);

      expect(result.offerPrice).toBe(0); // Clamped to 0
    });
  });

  describe('transformProductToFeaturedProduct', () => {
    it('should transform complete product', () => {
      const product = {
        id: 123,
        name: 'Test Product',
        sale_price: 100000,
        offer_price: 80000,
        images: [{ url: '/test.jpg' }],
        rating: 4.5,
        reviews: 42,
        category: 'Electronics',
      };

      const result = transformProductToFeaturedProduct(product);

      expect(result.id).toBe(123);
      expect(result.name).toBe('Test Product');
      expect(result.price).toBe(80000);
      expect(result.originalPrice).toBe(100000);
      expect(result.discount).toBe(20);
      expect(result.image).toBe('/test.jpg');
      expect(result.rating).toBe(4.5);
      expect(result.reviews).toBe(42);
      expect(result.category).toBe('Electronics');
    });

    it('should handle missing offer price', () => {
      const product = {
        id: 123,
        name: 'Test Product',
        sale_price: 100000,
      };

      const result = transformProductToFeaturedProduct(product);

      expect(result.price).toBe(100000);
      expect(result.originalPrice).toBe(100000);
      expect(result.discount).toBe(0);
    });

    it('should use fallback image', () => {
      const product = {
        id: 123,
        name: 'Test Product',
        sale_price: 100000,
      };

      const result = transformProductToFeaturedProduct(product);

      expect(result.image).toBe('/api/placeholder/300/300');
    });

    it('should use default values for missing fields', () => {
      const product = {
        id: 123,
        sale_price: 100000,
      };

      const result = transformProductToFeaturedProduct(product);

      expect(result.name).toBe('Producto');
      expect(result.rating).toBe(4.5);
      expect(result.reviews).toBe(0);
      expect(result.category).toBe('General');
    });

    it('should clamp discount percentage to 0-100', () => {
      const product1 = {
        id: 123,
        name: 'Test',
        sale_price: 100000,
        offer_price: 120000, // Higher than base (invalid)
      };

      const result1 = transformProductToFeaturedProduct(product1);
      expect(result1.discount).toBe(0);

      const product2 = {
        id: 123,
        name: 'Test',
        sale_price: 100000,
        offer_price: -10000, // Negative (invalid)
      };

      const result2 = transformProductToFeaturedProduct(product2);
      expect(result2.discount).toBeGreaterThanOrEqual(0);
      expect(result2.discount).toBeLessThanOrEqual(100);
    });
  });

  describe('getValidImageUrl', () => {
    it('should return first image from images array', () => {
      const images = [
        { url: '/first.jpg' },
        { url: '/second.jpg' },
      ];

      const result = getValidImageUrl(images);

      expect(result).toBe('/first.jpg');
    });

    it('should return imageUrl if images array is empty', () => {
      const result = getValidImageUrl([], '/direct.jpg');

      expect(result).toBe('/direct.jpg');
    });

    it('should return imageUrl if images array is invalid', () => {
      const result = getValidImageUrl(undefined, '/direct.jpg');

      expect(result).toBe('/direct.jpg');
    });

    it('should return fallback if both are missing', () => {
      const result = getValidImageUrl(undefined, undefined, '/fallback.jpg');

      expect(result).toBe('/fallback.jpg');
    });

    it('should use default fallback if not provided', () => {
      const result = getValidImageUrl();

      expect(result).toBe('/api/placeholder/300/300');
    });

    it('should validate image URLs', () => {
      const images = [{ url: 'invalid-url' }];

      const result = getValidImageUrl(images, undefined, '/fallback.jpg');

      expect(result).toBe('/fallback.jpg');
    });
  });
});
