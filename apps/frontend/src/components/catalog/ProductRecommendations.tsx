'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Star, ShoppingCart, Heart, Eye, TrendingUp, Clock, Users, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { ProductRating } from './ProductRating';
import type { Product } from '@/types';

interface ProductRecommendationsProps {
  currentProduct?: Product;
  userHistory?: Product[];
  onAddToCart?: (product: Product) => void;
  onToggleFavorite?: (product: Product) => void;
  onViewProduct?: (product: Product) => void;
  className?: string;
}

interface RecommendationSection {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  products: Product[];
  algorithm: 'similar' | 'trending' | 'recent' | 'popular' | 'personalized';
}

export const ProductRecommendations: React.FC<ProductRecommendationsProps> = ({
  currentProduct,
  userHistory = [],
  onAddToCart,
  onToggleFavorite,
  onViewProduct,
  className
}) => {
  const [recommendations, setRecommendations] = useState<RecommendationSection[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [scrollPositions, setScrollPositions] = useState<Record<string, number>>({});

  // Mock data - In a real app, this would come from an API
  const mockProducts: Product[] = [
    {
      id: '1',
      name: 'Smartphone Galaxy S24',
      sku: 'PHONE-001',
      cost_price: 700,
      sale_price: 899,
      stock_quantity: 15,
      min_stock: 5,
      category_id: '1',
      image_url: '/api/placeholder/300/300',
      is_active: true,
      created_at: new Date('2024-01-15').toISOString(),
      updated_at: new Date('2024-01-15').toISOString(),
      category: { 
        id: '1', 
        name: 'Electrónicos',
        is_active: true,
        created_at: new Date('2024-01-01').toISOString(),
        updated_at: new Date('2024-01-01').toISOString()
      },
      description: 'Último modelo con cámara avanzada'
    },
    {
      id: '2',
      name: 'Laptop Gaming ROG',
      sku: 'LAPTOP-001',
      cost_price: 1000,
      sale_price: 1299,
      stock_quantity: 8,
      min_stock: 3,
      category_id: '1',
      image_url: '/api/placeholder/300/300',
      is_active: true,
      created_at: new Date('2024-01-10').toISOString(),
      updated_at: new Date('2024-01-10').toISOString(),
      category: { 
        id: '1', 
        name: 'Electrónicos',
        is_active: true,
        created_at: new Date('2024-01-01').toISOString(),
        updated_at: new Date('2024-01-01').toISOString()
      },
      description: 'Potente laptop para gaming'
    },
    {
      id: '3',
      name: 'Auriculares Bluetooth',
      sku: 'AUDIO-001',
      cost_price: 150,
      sale_price: 199,
      stock_quantity: 25,
      min_stock: 10,
      category_id: '2',
      image_url: '/api/placeholder/300/300',
      is_active: true,
      created_at: new Date('2024-01-20').toISOString(),
      updated_at: new Date('2024-01-20').toISOString(),
      category: { 
        id: '2', 
        name: 'Audio',
        is_active: true,
        created_at: new Date('2024-01-01').toISOString(),
        updated_at: new Date('2024-01-01').toISOString()
      },
      description: 'Sonido de alta calidad'
    },
    {
      id: '4',
      name: 'Smartwatch Pro',
      sku: 'WATCH-001',
      cost_price: 250,
      sale_price: 349,
      stock_quantity: 12,
      min_stock: 5,
      category_id: '3',
      image_url: '/api/placeholder/300/300',
      is_active: true,
      created_at: new Date('2024-01-25').toISOString(),
      updated_at: new Date('2024-01-25').toISOString(),
      category: { 
        id: '3', 
        name: 'Wearables',
        is_active: true,
        created_at: new Date('2024-01-01').toISOString(),
        updated_at: new Date('2024-01-01').toISOString()
      },
      description: 'Monitoreo avanzado de salud'
    },
    {
      id: '5',
      name: 'Tablet Pro 12"',
      sku: 'TABLET-001',
      cost_price: 600,
      sale_price: 799,
      stock_quantity: 10,
      min_stock: 3,
      category_id: '1',
      image_url: '/api/placeholder/300/300',
      is_active: true,
      created_at: new Date('2024-01-18').toISOString(),
      updated_at: new Date('2024-01-18').toISOString(),
      category: { 
        id: '1', 
        name: 'Electrónicos',
        is_active: true,
        created_at: new Date('2024-01-01').toISOString(),
        updated_at: new Date('2024-01-01').toISOString()
      },
      description: 'Perfecta para trabajo y entretenimiento'
    }
  ];

  // Generate recommendations based on different algorithms
  useEffect(() => {
    const generateRecommendations = () => {
      const sections: RecommendationSection[] = [];

      // Similar products (based on current product category)
      if (currentProduct) {
        const similarProducts = mockProducts.filter(
          p => p.id !== currentProduct.id && 
          p.category?.name === currentProduct.category?.name
        ).slice(0, 6);

        if (similarProducts.length > 0) {
          sections.push({
            id: 'similar',
            title: 'Productos similares',
            description: `Otros productos en ${currentProduct.category?.name}`,
            icon: <Sparkles className="h-5 w-5" />,
            products: similarProducts,
            algorithm: 'similar'
          });
        }
      }

      // Trending products (sorted by created_at as a proxy for popularity)
      const trendingProducts = mockProducts
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 6);

      sections.push({
        id: 'trending',
        title: 'Productos en tendencia',
        description: 'Los más populares esta semana',
        icon: <TrendingUp className="h-5 w-5" />,
        products: trendingProducts,
        algorithm: 'trending'
      });

      // Recently viewed (based on user history)
      if (userHistory.length > 0) {
        const recentProducts = userHistory.slice(0, 6);
        sections.push({
          id: 'recent',
          title: 'Vistos recientemente',
          description: 'Productos que has visto antes',
          icon: <Clock className="h-5 w-5" />,
          products: recentProducts,
          algorithm: 'recent'
        });
      }

      // Popular products
      const popularProducts = mockProducts
        .sort((a, b) => (b.stock_quantity || 0) - (a.stock_quantity || 0))
        .slice(0, 6);

      sections.push({
        id: 'popular',
        title: 'Más vendidos',
        description: 'Los favoritos de nuestros clientes',
        icon: <Users className="h-5 w-5" />,
        products: popularProducts,
        algorithm: 'popular'
      });

      // Personalized recommendations (mock algorithm)
      const personalizedProducts = mockProducts
        .filter(p => !userHistory.some(h => h.id === p.id))
        .sort(() => Math.random() - 0.5)
        .slice(0, 6);

      if (personalizedProducts.length > 0) {
        sections.push({
          id: 'personalized',
          title: 'Recomendado para ti',
          description: 'Basado en tu historial de navegación',
          icon: <Star className="h-5 w-5" />,
          products: personalizedProducts,
          algorithm: 'personalized'
        });
      }

      setRecommendations(sections);
    };

    generateRecommendations();
  }, [currentProduct, userHistory]);

  const scrollSection = (sectionId: string, direction: 'left' | 'right') => {
    const container = document.getElementById(`scroll-${sectionId}`);
    if (!container) return;

    const scrollAmount = 300;
    const currentScroll = scrollPositions[sectionId] || 0;
    const newScroll = direction === 'left' 
      ? Math.max(0, currentScroll - scrollAmount)
      : currentScroll + scrollAmount;

    container.scrollTo({ left: newScroll, behavior: 'smooth' });
    setScrollPositions(prev => ({ ...prev, [sectionId]: newScroll }));
  };

  const ProductCard: React.FC<{ product: Product; compact?: boolean }> = ({ 
    product, 
    compact = false 
  }) => (
    <Card 
      className={cn(
        'group cursor-pointer hover:shadow-lg transition-all duration-200 flex-shrink-0',
        compact ? 'w-64' : 'w-72'
      )}
      onClick={() => onViewProduct?.(product)}
    >
      <div className="relative aspect-square">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover rounded-t-lg"
          />
        ) : (
          <div className="w-full h-full bg-muted rounded-t-lg flex items-center justify-center">
            <ShoppingCart className="h-12 w-12 text-muted-foreground" />
          </div>
        )}

        {/* Quick actions */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity space-y-1">
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleFavorite?.(product);
            }}
            className="h-8 w-8 p-0"
          >
            <Heart className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onViewProduct?.(product);
            }}
            className="h-8 w-8 p-0"
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>

        {/* Stock badge */}
        {product.stock_quantity !== undefined && product.stock_quantity <= 5 && (
                  <Badge 
                    variant={product.stock_quantity === 0 ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {product.stock_quantity === 0 ? 'Agotado' : `Solo ${product.stock_quantity}`}
          </Badge>
        )}
      </div>

      <CardContent className="p-4">
        <div className="space-y-2">
          <h3 className={cn(
            'font-semibold line-clamp-2 group-hover:text-primary transition-colors',
            compact ? 'text-sm' : 'text-base'
          )}>
            {product.name}
          </h3>

          {product.category && (
            <Badge variant="outline" className="text-xs">
              {product.category.name}
            </Badge>
          )}

          {product.sale_price && (
            <ProductRating
              rating={5}
              showCount={false}
              size="sm"
            />
          )}

          <div className={cn(
            'font-bold text-primary',
            compact ? 'text-lg' : 'text-xl'
          )}>
            ${product.sale_price?.toLocaleString()}
          </div>
        </div>

        <Button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onAddToCart?.(product);
          }}
          disabled={product.stock_quantity === 0}
          className="w-full mt-3"
          size={compact ? 'sm' : 'default'}
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          {product.stock_quantity === 0 ? 'Agotado' : 'Agregar'}
        </Button>
      </CardContent>
    </Card>
  );

  const filteredRecommendations = activeTab === 'all' 
    ? recommendations 
    : recommendations.filter(section => section.algorithm === activeTab);

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-8', className)}>
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">Recomendaciones</h2>
        <p className="text-muted-foreground">
          Productos seleccionados especialmente para ti
        </p>
      </div>

      {/* Filter tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6">
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="similar">Similares</TabsTrigger>
          <TabsTrigger value="trending">Tendencia</TabsTrigger>
          <TabsTrigger value="recent">Recientes</TabsTrigger>
          <TabsTrigger value="popular">Populares</TabsTrigger>
          <TabsTrigger value="personalized">Para ti</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-8 mt-8">
          {filteredRecommendations.map((section) => (
            <div key={section.id} className="space-y-4">
              {/* Section header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {section.icon}
                  <div>
                    <h3 className="text-xl font-semibold">{section.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {section.description}
                    </p>
                  </div>
                </div>

                {/* Scroll controls */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => scrollSection(section.id, 'left')}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => scrollSection(section.id, 'right')}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Products scroll container */}
              <div
                id={`scroll-${section.id}`}
                className="flex gap-4 overflow-x-auto scrollbar-hide pb-4"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {section.products.map((product) => (
                  <ProductCard
                    key={`${section.id}-${product.id}`}
                    product={product}
                    compact={section.algorithm === 'recent'}
                  />
                ))}
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>

      {/* Call to action */}
      <Card className="text-center p-8 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardContent className="space-y-4">
          <Sparkles className="h-12 w-12 mx-auto text-primary" />
          <h3 className="text-xl font-semibold">¿No encuentras lo que buscas?</h3>
          <p className="text-muted-foreground">
            Explora nuestro catálogo completo o usa la búsqueda avanzada
          </p>
          <div className="flex gap-4 justify-center">
            <Button onClick={() => window.location.href = '/products'}>
              Ver catálogo completo
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/search'}>
              Búsqueda avanzada
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductRecommendations;