'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { ShoppingCart, Heart, ArrowLeft, Star, Sparkles } from 'lucide-react';
import { useBusinessConfig } from '@/contexts/BusinessConfigContext';
import { formatPrice } from '@/utils/formatters';
import type { Product } from '@/types';
import { useCatalogCart } from '@/hooks/useCatalogCart';

interface ProductDetailClientProps {
    product: Product;
}

export default function ProductDetailClient({ product }: ProductDetailClientProps) {
    const { toast } = useToast();
    const { config } = useBusinessConfig();
    const { addToCart } = useCatalogCart();
    const [quantity, setQuantity] = useState<number>(1);
    const [isFavorite, setIsFavorite] = useState<boolean>(() => {
        if (typeof window === 'undefined') return false;
        try {
            const savedFavorites = localStorage.getItem('catalog_favorites');
            if (savedFavorites) {
                const favs: string[] = JSON.parse(savedFavorites);
                return favs.includes(product.id);
            }
        } catch {
            return false;
        }
        return false;
    });

    const addToCartWithQuantity = () => {
        const qty = !quantity || quantity < 1 ? 1 : quantity;
        try {
            const base = Number(product.sale_price || 0);
            const offer = Number((product as any).offer_price ?? NaN);
            const effectiveOffer = offer > 0 && offer < base ? offer : undefined;
            const productForCart: any = {
                id: String(product.id || ''),
                name: String(product.name || 'Producto'),
                sale_price: base,
                offer_price: effectiveOffer,
                image_url: String(product.image_url || ''),
                stock_quantity: Number(product.stock_quantity ?? 999),
                is_active: (product as any).is_active ?? true,
            };
            addToCart(productForCart, qty);
            toast({ title: 'Producto agregado', description: `${product.name} x${qty} se agregó al carrito` });
        } catch (error) {
            console.error('Error updating cart:', error);
            toast({ title: 'Error', description: 'No se pudo actualizar el carrito', variant: 'destructive' });
        }
    };

    const toggleFavorite = () => {
        try {
            const savedFavorites = localStorage.getItem('catalog_favorites');
            let favs: string[] = savedFavorites ? JSON.parse(savedFavorites) : [];
            if (favs.includes(product.id)) {
                favs = favs.filter(id => id !== product.id);
                setIsFavorite(false);
            } else {
                favs.push(product.id);
                setIsFavorite(true);
            }
            localStorage.setItem('catalog_favorites', JSON.stringify(favs));
        } catch (error) {
            console.error('Error updating favorites:', error);
            toast({ title: 'Error', description: 'No se pudieron actualizar favoritos', variant: 'destructive' });
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-pink-50 to-blue-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
            {/* Header */}
            <header className="sticky top-0 z-40 border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-14">
                        <div className="flex items-center space-x-4">
                            <Link href="/catalog">
                                <Button variant="ghost" size="sm" className="text-slate-600 hover:text-foreground">
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Volver al Catálogo
                                </Button>
                            </Link>
                            <Separator orientation="vertical" className="h-6" />
                            <div className="flex items-center">
                                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
                                    <Sparkles className="w-5 h-5" />
                                </div>
                                <div className="ml-3">
                                    <h1 className="text-lg font-bold text-foreground">Detalle de Producto</h1>
                                    <p className="text-xs text-muted-foreground">{config.businessName}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Content */}
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Card className="border bg-white/90 dark:bg-slate-900/90 shadow-sm overflow-hidden rounded-xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="relative">
                            {product.image_url ? (
                                <img src={product.image_url} alt={product.name} className="w-full h-80 object-cover" />
                            ) : (
                                <div className="w-full h-80 bg-gradient-to-r from-indigo-100 via-pink-100 to-blue-100 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 flex items-center justify-center">
                                    <Sparkles className="w-12 h-12 text-muted-foreground" />
                                </div>
                            )}
                        </div>

                        <CardContent className="p-6">
                            <h2 className="text-2xl font-bold text-foreground mb-2">{product.name}</h2>
                            {product.description && (
                                <p className="text-muted-foreground mb-4">{product.description}</p>
                            )}

                            {(product as any).rating && (
                                <div className="flex items-center mb-3">
                                    <div className="flex items-center">
                                        {[...Array(5)].map((_, i) => (
                                            <Star
                                                key={i}
                                                className={`w-4 h-4 ${i < Math.floor((product as any).rating || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300'}`}
                                            />
                                        ))}
                                    </div>
                                    <span className="text-xs text-muted-foreground ml-1">({(product as any).rating})</span>
                                </div>
                            )}

                            <div className="flex items-center gap-3 mb-4">
                                <span className="text-2xl font-bold text-foreground">{formatPrice(product.sale_price, config)}</span>
                                {(product as any).regular_price && (product as any).regular_price > product.sale_price && (
                                    <span className="text-sm text-muted-foreground line-through">{formatPrice((product as any).regular_price, config)}</span>
                                )}
                                {(product as any).discount_percentage && (product as any).discount_percentage > 0 && (
                                    <Badge className="bg-gradient-to-r from-rose-500 to-red-600 text-white border-none">-{(product as any).discount_percentage}%</Badge>
                                )}
                            </div>

                            <div className="flex items-center gap-2 mb-4">
                                <div className={`w-2 h-2 rounded-full ${product.stock_quantity > 10 ? 'bg-green-500' : product.stock_quantity > 0 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                                <span className="text-sm text-muted-foreground">{product.stock_quantity > 0 ? `${product.stock_quantity} disponibles` : 'Agotado'}</span>
                            </div>

                            <div className="flex items-center gap-3 mb-6">
                                <div className="flex items-center border rounded-lg">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-10"
                                        onClick={() => setQuantity(q => Math.max(1, q - 1))}
                                        aria-label="Disminuir cantidad"
                                    >
                                        -
                                    </Button>
                                    <Input
                                        type="number"
                                        min="1"
                                        max={product.stock_quantity}
                                        className="w-14 text-center border-0"
                                        value={quantity}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value || '1', 10);
                                            setQuantity(Math.max(1, Math.min(val, product.stock_quantity)));
                                        }}
                                        aria-label="Cantidad"
                                    />
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-10"
                                        onClick={() => setQuantity(q => Math.min(q + 1, product.stock_quantity))}
                                        aria-label="Aumentar cantidad"
                                    >
                                        +
                                    </Button>
                                </div>
                                <Button
                                    onClick={addToCartWithQuantity}
                                    disabled={product.stock_quantity <= 0}
                                    className="bg-red-600 hover:bg-red-700 text-white transition-all duration-200 hover:shadow-lg hover:scale-105"
                                >
                                    <ShoppingCart className="w-4 h-4 mr-2" />
                                    {product.stock_quantity <= 0 ? 'Agotado' : 'Agregar al carrito'}
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={toggleFavorite}
                                    className="rounded-full w-10 h-10 p-0 bg-white dark:bg-slate-800 hover:bg-white/90 dark:hover:bg-slate-700 shadow-sm"
                                    aria-label={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                                >
                                    <Heart className={`w-5 h-5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-slate-600 dark:text-slate-400'}`} />
                                </Button>
                            </div>

                            {(product as any).brand && (
                                <p className="text-sm text-muted-foreground">Marca: <span className="font-medium text-foreground">{(product as any).brand}</span></p>
                            )}
                            {(product as any).shade && (
                                <p className="text-sm text-muted-foreground">Tono: <span className="font-medium text-foreground">{(product as any).shade}</span></p>
                            )}
                            {(product as any).skin_type && (
                                <p className="text-sm text-muted-foreground">Tipo de piel: <span className="font-medium text-foreground">{(product as any).skin_type}</span></p>
                            )}
                        </CardContent>
                    </div>
                </Card>

                <div className="mt-8">
                    <Link href="/catalog">
                        <Button variant="outline">Volver al catálogo</Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
