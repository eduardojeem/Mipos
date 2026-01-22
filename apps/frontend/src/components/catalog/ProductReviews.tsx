'use client';

import React, { useState } from 'react';
import { Star, ThumbsUp, ThumbsDown, MessageCircle, User, Calendar, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { ProductRating } from './ProductRating';

interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  title: string;
  comment: string;
  date: string;
  verified: boolean;
  helpful: number;
  notHelpful: number;
  images?: string[];
}

interface ProductReviewsProps {
  productId: string;
  reviews: Review[];
  averageRating: number;
  totalReviews: number;
  onAddReview?: (review: Omit<Review, 'id' | 'date' | 'helpful' | 'notHelpful'>) => void;
  onHelpfulClick?: (reviewId: string, helpful: boolean) => void;
  className?: string;
  showAddReview?: boolean;
}

interface RatingDistribution {
  [key: number]: number;
}

export const ProductReviews: React.FC<ProductReviewsProps> = ({
  productId,
  reviews,
  averageRating,
  totalReviews,
  onAddReview,
  onHelpfulClick,
  className,
  showAddReview = true
}) => {
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest' | 'helpful'>('newest');
  const [filterBy, setFilterBy] = useState<'all' | '5' | '4' | '3' | '2' | '1'>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newReview, setNewReview] = useState({
    rating: 0,
    title: '',
    comment: '',
    userName: '',
    userAvatar: '',
    userId: '',
    verified: false
  });

  // Calculate rating distribution
  const ratingDistribution: RatingDistribution = reviews.reduce((acc, review) => {
    acc[review.rating] = (acc[review.rating] || 0) + 1;
    return acc;
  }, {} as RatingDistribution);

  // Sort and filter reviews
  const sortedAndFilteredReviews = reviews
    .filter(review => filterBy === 'all' || review.rating === parseInt(filterBy))
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'oldest':
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'highest':
          return b.rating - a.rating;
        case 'lowest':
          return a.rating - b.rating;
        case 'helpful':
          return b.helpful - a.helpful;
        default:
          return 0;
      }
    });

  const handleSubmitReview = () => {
    if (newReview.rating > 0 && newReview.comment.trim() && onAddReview) {
      onAddReview({
        ...newReview,
        userId: newReview.userId || 'anonymous',
        userName: newReview.userName || 'Usuario Anónimo',
        verified: false
      });
      
      setNewReview({
        rating: 0,
        title: '',
        comment: '',
        userName: '',
        userAvatar: '',
        userId: '',
        verified: false
      });
      setShowAddForm(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getRatingPercentage = (rating: number) => {
    const count = ratingDistribution[rating] || 0;
    return totalReviews > 0 ? (count / totalReviews) * 100 : 0;
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Rating Summary */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">Valoraciones y reseñas</h3>
              <div className="flex items-center gap-3 mt-2">
                <div className="text-3xl font-bold">{averageRating.toFixed(1)}</div>
                <div>
                  <ProductRating rating={averageRating} reviewCount={totalReviews} size="lg" />
                  <p className="text-sm text-muted-foreground mt-1">
                    Basado en {totalReviews} reseñas
                  </p>
                </div>
              </div>
            </div>
            
            {showAddReview && (
              <Button 
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-2"
              >
                <MessageCircle className="h-4 w-4" />
                Escribir reseña
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Rating Distribution */}
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map(rating => (
              <div key={rating} className="flex items-center gap-3">
                <div className="flex items-center gap-1 w-12">
                  <span className="text-sm">{rating}</span>
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                </div>
                <div className="flex-1 bg-muted rounded-full h-2">
                  <div
                    className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${getRatingPercentage(rating)}%` }}
                  />
                </div>
                <span className="text-sm text-muted-foreground w-12 text-right">
                  {ratingDistribution[rating] || 0}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add Review Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <h4 className="font-semibold">Escribir una reseña</h4>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Tu calificación</label>
              <ProductRating
                rating={newReview.rating}
                interactive
                onRatingChange={(rating) => setNewReview(prev => ({ ...prev, rating }))}
                showCount={false}
                size="lg"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Título (opcional)</label>
              <input
                type="text"
                placeholder="Resumen de tu experiencia"
                value={newReview.title}
                onChange={(e) => setNewReview(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Tu reseña</label>
              <Textarea
                placeholder="Comparte tu experiencia con este producto..."
                value={newReview.comment}
                onChange={(e) => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                rows={4}
              />
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={handleSubmitReview}
                disabled={newReview.rating === 0 || !newReview.comment.trim()}
              >
                Publicar reseña
              </Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters and Sorting */}
      {reviews.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex gap-2">
            <Select value={filterBy} onValueChange={(value: any) => setFilterBy(value)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filtrar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las estrellas</SelectItem>
                <SelectItem value="5">5 estrellas</SelectItem>
                <SelectItem value="4">4 estrellas</SelectItem>
                <SelectItem value="3">3 estrellas</SelectItem>
                <SelectItem value="2">2 estrellas</SelectItem>
                <SelectItem value="1">1 estrella</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Más recientes</SelectItem>
                <SelectItem value="oldest">Más antiguas</SelectItem>
                <SelectItem value="highest">Mayor calificación</SelectItem>
                <SelectItem value="lowest">Menor calificación</SelectItem>
                <SelectItem value="helpful">Más útiles</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <p className="text-sm text-muted-foreground">
            Mostrando {sortedAndFilteredReviews.length} de {reviews.length} reseñas
          </p>
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {sortedAndFilteredReviews.length > 0 ? (
          sortedAndFilteredReviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={review.userAvatar} />
                    <AvatarFallback>
                      <User className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{review.userName}</span>
                          {review.verified && (
                            <Badge variant="secondary" className="text-xs">
                              Compra verificada
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <ProductRating rating={review.rating} showCount={false} size="sm" />
                          <span className="text-sm text-muted-foreground">
                            {formatDate(review.date)}
                          </span>
                        </div>
                      </div>
                      
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {review.title && (
                      <h5 className="font-medium">{review.title}</h5>
                    )}
                    
                    <p className="text-sm leading-relaxed">{review.comment}</p>
                    
                    <div className="flex items-center gap-4 pt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onHelpfulClick?.(review.id, true)}
                        className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                      >
                        <ThumbsUp className="h-4 w-4" />
                        <span>Útil ({review.helpful})</span>
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onHelpfulClick?.(review.id, false)}
                        className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                      >
                        <ThumbsDown className="h-4 w-4" />
                        <span>({review.notHelpful})</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h4 className="font-medium mb-2">No hay reseñas aún</h4>
              <p className="text-muted-foreground mb-4">
                Sé el primero en compartir tu experiencia con este producto
              </p>
              {showAddReview && (
                <Button onClick={() => setShowAddForm(true)}>
                  Escribir primera reseña
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ProductReviews;