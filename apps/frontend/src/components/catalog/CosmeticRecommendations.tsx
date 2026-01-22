'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, 
  Palette, 
  Heart, 
  Search, 
  Filter, 
  Star, 
  ShoppingCart, 
  Eye,
  User,
  Droplets,
  Sun,
  Leaf,
  Award
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { ProductRating } from './ProductRating';
import { CardSkeleton, useLazyLoading } from '@/components/ui/lazy-loading';
import { Carousel } from '@/app/home/components/Carousel';
import { useInteractionTracking } from '@/hooks/use-performance';
import { cn } from '@/lib/utils';
import type { Product } from '@/types';

interface CosmeticProduct extends Product {
  brand?: string;
  shade?: string;
  skin_type?: 'grasa' | 'seca' | 'mixta' | 'sensible' | 'normal' | 'todo_tipo';
  ingredients?: string;
  volume?: string;
  spf?: number;
  finish?: 'mate' | 'satinado' | 'brillante' | 'natural';
  coverage?: 'ligera' | 'media' | 'completa';
  waterproof?: boolean;
  vegan?: boolean;
  cruelty_free?: boolean;
  expiration_date?: string;
}

interface CosmeticRecommendationsProps {
  products: CosmeticProduct[];
  userSkinType?: string;
  userShadePreference?: string;
  onProductSelect?: (product: CosmeticProduct) => void;
  onAddToCart?: (product: CosmeticProduct) => void;
  onToggleFavorite?: (product: CosmeticProduct) => void;
  className?: string;
}

interface RecommendationCategory {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  products: CosmeticProduct[];
  criteria: string;
}

export const CosmeticRecommendations: React.FC<CosmeticRecommendationsProps> = ({
  products,
  userSkinType,
  userShadePreference,
  onProductSelect,
  onAddToCart,
  onToggleFavorite,
  className
}) => {
  const [selectedSkinType, setSelectedSkinType] = useState(userSkinType || '');
  const [shadeSearch, setShadeSearch] = useState(userShadePreference || '');
  const [recommendations, setRecommendations] = useState<RecommendationCategory[]>([]);
  const [activeTab, setActiveTab] = useState('skin-type');
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 0]);
  const { ref, isVisible } = useLazyLoading(0.1);
  const { trackInteraction } = useInteractionTracking('CosmeticRecommendations');

  const brands = useMemo(() => {
    const setB = new Set<string>();
    products.forEach(p => p.brand && setB.add(p.brand));
    return Array.from(setB).sort();
  }, [products]);

  const categories = useMemo(() => {
    const setC = new Set<string>();
    products.forEach(p => p.category?.name && setC.add(p.category.name));
    return Array.from(setC).sort();
  }, [products]);

  const minMaxPrice = useMemo(() => {
    const prices = products.map(p => p.sale_price).filter(Boolean);
    const min = prices.length ? Math.min(...prices) : 0;
    const max = prices.length ? Math.max(...prices) : 0;
    return [min, max] as [number, number];
  }, [products]);

  useEffect(() => {
    if (priceRange[1] === 0 && minMaxPrice[1] > 0) {
      setPriceRange([minMaxPrice[0], minMaxPrice[1]]);
    }
  }, [minMaxPrice, priceRange]);

  useEffect(() => {
    const filtered = products.filter(p => {
      if (dismissed.has(p.id)) return false;
      const brandOk = selectedBrand && selectedBrand !== 'all' ? p.brand === selectedBrand : true;
      const catOk = selectedCategory && selectedCategory !== 'all' ? p.category?.name === selectedCategory : true;
      const priceOk = p.sale_price >= priceRange[0] && p.sale_price <= priceRange[1];
      const skinOk = selectedSkinType && selectedSkinType !== 'all' ? (p.skin_type === selectedSkinType || p.skin_type === 'todo_tipo') : true;
      const shadeOk = shadeSearch ? ((p.shade || '').toLowerCase().includes(shadeSearch.toLowerCase()) || p.name.toLowerCase().includes(shadeSearch.toLowerCase())) : true;
      return brandOk && catOk && priceOk && skinOk && shadeOk;
    });

    const scored = filtered.map(p => {
      const matchSkin = selectedSkinType && selectedSkinType !== 'all' ? (p.skin_type === selectedSkinType ? 1 : p.skin_type === 'todo_tipo' ? 0.5 : 0) : 0;
      const matchShade = shadeSearch ? (((p.shade || '').toLowerCase().includes(shadeSearch.toLowerCase()) || p.name.toLowerCase().includes(shadeSearch.toLowerCase())) ? 1 : 0) : 0;
      const ethical = (p.vegan ? 0.3 : 0) + (p.cruelty_free ? 0.3 : 0);
      const discount = (p.discount_percentage || 0) / 100;
      const ratingScore = (p.rating || 0) / 5;
      const stockOk = p.stock_quantity > 0 ? 0.2 : -0.5;
      const spfScore = p.spf && p.spf > 0 ? Math.min(0.4, (p.spf || 0) / 100) : 0;
      const score = matchSkin + matchShade + ethical + discount + ratingScore + stockOk + spfScore;
      return { p, score };
    }).sort((a, b) => b.score - a.score).map(x => x.p);

    const cats: RecommendationCategory[] = [];

    if (selectedSkinType) {
      const skinTypeProducts = scored.filter(product => product.skin_type === selectedSkinType || product.skin_type === 'todo_tipo').slice(0, 8);
      if (skinTypeProducts.length > 0) {
        cats.push({
          id: 'skin-type',
          title: `Perfecto para piel ${selectedSkinType}`,
          description: `Productos especialmente formulados para tu tipo de piel`,
          icon: <User className="h-5 w-5" />,
          products: skinTypeProducts,
          criteria: `Tipo de piel: ${selectedSkinType}`
        });
      }
    }

    if (shadeSearch) {
      const shadeProducts = scored.filter(product => (product.shade || '').toLowerCase().includes(shadeSearch.toLowerCase()) || product.name.toLowerCase().includes(shadeSearch.toLowerCase())).slice(0, 8);
      if (shadeProducts.length > 0) {
        cats.push({
          id: 'shade-match',
          title: 'Tonos que coinciden',
          description: `Productos en tonos similares a "${shadeSearch}"`,
          icon: <Palette className="h-5 w-5" />,
          products: shadeProducts,
          criteria: `Tono: ${shadeSearch}`
        });
      }
    }

    const spfProducts = scored.filter(product => product.spf && product.spf > 0).sort((a, b) => (b.spf || 0) - (a.spf || 0)).slice(0, 6);
    if (spfProducts.length > 0) {
      cats.push({
        id: 'spf-protection',
        title: 'Protección solar',
        description: 'Productos con factor de protección solar',
        icon: <Sun className="h-5 w-5" />,
        products: spfProducts,
        criteria: 'Con protección SPF'
      });
    }

    const ethicalProducts = scored.filter(product => product.vegan || product.cruelty_free).slice(0, 6);
    if (ethicalProducts.length > 0) {
      cats.push({
        id: 'ethical',
        title: 'Cosméticos éticos',
        description: 'Productos veganos y libres de crueldad animal',
        icon: <Leaf className="h-5 w-5" />,
        products: ethicalProducts,
        criteria: 'Vegano o Cruelty-free'
      });
    }

    const waterproofProducts = scored.filter(product => product.waterproof).slice(0, 6);
    if (waterproofProducts.length > 0) {
      cats.push({
        id: 'waterproof',
        title: 'A prueba de agua',
        description: 'Productos resistentes al agua y sudor',
        icon: <Droplets className="h-5 w-5" />,
        products: waterproofProducts,
        criteria: 'Resistente al agua'
      });
    }

    const premiumBrands = ['MAC', 'Dior', 'Chanel', 'YSL', 'Tom Ford', 'Charlotte Tilbury'];
    const premiumProducts = scored.filter(product => product.brand && premiumBrands.some(brand => product.brand?.toLowerCase().includes(brand.toLowerCase()))).slice(0, 6);
    if (premiumProducts.length > 0) {
      cats.push({
        id: 'premium',
        title: 'Marcas premium',
        description: 'Lo mejor en cosmética de lujo',
        icon: <Award className="h-5 w-5" />,
        products: premiumProducts,
        criteria: 'Marcas de lujo'
      });
    }

    setRecommendations(cats);
  }, [products, selectedSkinType, shadeSearch, dismissed, selectedBrand, selectedCategory, priceRange]);

  const ProductCard = ({ product }: { product: CosmeticProduct }) => {
    const endView = () => {};
    const onAdd = () => {
      const end = trackInteraction('add_to_cart');
      onAddToCart?.(product);
      end();
    };
    const onView = () => {
      const end = trackInteraction('view_product');
      onProductSelect?.(product);
      end();
    };
    const onFav = () => {
      const end = trackInteraction('toggle_favorite');
      onToggleFavorite?.(product);
      end();
    };
    const onDismiss = () => {
      const end = trackInteraction('dismiss_recommendation');
      setDismissed(prev => new Set(prev).add(product.id));
      end();
    };
    const onRate = (value: number) => {
      const end = trackInteraction('rate_recommendation');
      setRatings(prev => ({ ...prev, [product.id]: value }));
      end();
    };

    return (
      <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer">
        <CardContent className="p-4">
          <div className="aspect-square bg-gray-100 rounded-lg mb-3 overflow-hidden">
            {product.image_url ? (
              <img 
                src={product.image_url} 
                alt={product.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-gray-400" />
              </div>
            )}
          </div>
          <div className="space-y-2">
            {product.brand && (
              <Badge variant="secondary" className="text-xs">
                {product.brand}
              </Badge>
            )}
            <h4 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
              {product.name}
            </h4>
            {product.shade && (
              <p className="text-xs text-muted-foreground">
                Tono: {product.shade}
              </p>
            )}
            <div className="flex items-center justify-between">
              <span className="font-semibold text-primary">
                ${product.sale_price.toFixed(2)}
              </span>
              <div className="flex gap-1">
                {product.spf && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="text-xs">
                          SPF {product.spf}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        Protección solar
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {product.vegan && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                          Vegano
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        Ingredientes de origen vegetal
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {product.waterproof && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="text-xs">
                          Resistente al agua
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        Ideal para larga duración
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
            <ProductRating
              rating={ratings[product.id] ?? product.rating ?? 0}
              reviewCount={0}
              size="sm"
              interactive
              onRatingChange={onRate}
            />
            <div className="flex gap-2 pt-2">
              <Button size="sm" className="flex-1" onClick={onAdd}>
                <ShoppingCart className="h-3 w-3 mr-1" />
                Agregar
              </Button>
              <Button size="sm" variant="outline" onClick={onView}>
                <Eye className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="outline" onClick={onFav}>
                <Heart className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="destructive" onClick={onDismiss}>
                No me interesa
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className={cn("space-y-6", className)} ref={ref}>
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          Recomendaciones Personalizadas
        </h2>
        <p className="text-muted-foreground">
          Encuentra los productos perfectos para ti
        </p>
      </div>

      {isVisible && (
        <Card>
          <CardContent className="p-0">
            <Carousel
              images={products.filter(p => !!p.image_url).slice(0, 6).map(p => ({ id: p.id, url: p.image_url as string, alt: p.name }))}
              enabled={true}
              intervalSec={6}
              autoplay={true}
              transitionMs={600}
            />
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Personaliza tus recomendaciones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="skin-type">Tipo de piel</Label>
              <Select value={selectedSkinType} onValueChange={setSelectedSkinType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona tu tipo de piel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  <SelectItem value="grasa">Grasa</SelectItem>
                  <SelectItem value="seca">Seca</SelectItem>
                  <SelectItem value="mixta">Mixta</SelectItem>
                  <SelectItem value="sensible">Sensible</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="shade-search">Buscar por tono</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="shade-search"
                  placeholder="Ej: nude, rosa, coral..."
                  value={shadeSearch}
                  onChange={(e) => setShadeSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Marca</Label>
              <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las marcas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {brands.map(b => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las categorías" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {categories.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Precio</Label>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>${priceRange[0].toFixed(2)}</span>
                <span>${priceRange[1].toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={minMaxPrice[0]}
                max={minMaxPrice[1]}
                value={priceRange[0]}
                onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
              />
              <input
                type="range"
                min={minMaxPrice[0]}
                max={minMaxPrice[1]}
                value={priceRange[1]}
                onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {isVisible ? (
        recommendations.length > 0 ? (
          <div className="space-y-8">
            {recommendations.map((category) => (
              <div key={category.id} className="space-y-4">
                <div className="flex items-center gap-3">
                  {category.icon}
                  <div>
                    <h3 className="text-xl font-semibold">{category.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {category.description}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {category.products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No hay recomendaciones disponibles</h3>
              <p className="text-muted-foreground">
                Selecciona filtros para obtener recomendaciones personalizadas
              </p>
            </CardContent>
          </Card>
        )
      ) : (
        <CardSkeleton />
      )}
    </div>
  );
};

export default CosmeticRecommendations;