'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';
import { ContentFilters } from './useContentFilters';

export interface WebPage {
  id: string;
  title: string;
  slug: string;
  content: string;
  metaDescription: string;
  metaKeywords?: string;
  isPublished: boolean;
  publishedAt?: string;
  version: number;
  authorId: string;
  authorName: string;
  category: string;
  tags: string[];
  viewCount: number;
  seoScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface Banner {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  linkUrl?: string;
  position: 'HERO' | 'SIDEBAR' | 'FOOTER' | 'POPUP';
  isActive: boolean;
  order: number;
  startDate?: string;
  endDate?: string;
  targetAudience: string[];
  clickCount: number;
  impressionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface MediaFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  alt?: string;
  caption?: string;
  folder: string;
  tags: string[];
  downloadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ContentStats {
  totalPages: number;
  publishedPages: number;
  draftPages: number;
  totalBanners: number;
  activeBanners: number;
  totalMedia: number;
  mediaSize: number;
  pageViews: number;
  bannerClicks: number;
  topPages: Array<{ title: string; views: number; slug: string }>;
  recentActivity: Array<{ type: string; title: string; date: string; author: string }>;
}

export function useContent(filters: ContentFilters) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const buildParams = (f: ContentFilters) => {
    const params: any = {
      searchTerm: f.searchTerm || '',
      status: f.status || 'all',
      category: f.category || 'all',
      position: f.position || 'all',
      fileType: f.fileType || 'all',
      folder: f.folder || 'all',
      sortBy: f.sortBy || 'date',
      sortOrder: f.sortOrder || 'desc',
    };
    if (f.dateRange?.from) params.from = f.dateRange.from.toISOString();
    if (f.dateRange?.to) params.to = f.dateRange.to.toISOString();
    return params;
  };

  // Fetch pages
  const { data: pages, isLoading: pagesLoading, refetch: refetchPages } = useQuery({
    queryKey: ['content-pages', filters],
    queryFn: async () => {
      const { data } = await api.get('/content/pages', { params: buildParams(filters) });
      const items: WebPage[] = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      return items;
    },
    staleTime: 30000,
  });

  // Fetch banners
  const { data: banners, isLoading: bannersLoading, refetch: refetchBanners } = useQuery({
    queryKey: ['content-banners', filters],
    queryFn: async () => {
      const { data } = await api.get('/content/banners', { params: buildParams(filters) });
      const items: Banner[] = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      return items;
    },
    staleTime: 30000,
  });

  // Fetch media
  const { data: media, isLoading: mediaLoading, refetch: refetchMedia } = useQuery({
    queryKey: ['content-media', filters],
    queryFn: async () => {
      const { data } = await api.get('/content/media', { params: buildParams(filters) });
      const items: MediaFile[] = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      return items;
    },
    staleTime: 30000,
  });

  // Fetch stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['content-stats'],
    queryFn: async () => {
      const { data } = await api.get('/content/stats');
      return data as ContentStats;
    },
    staleTime: 60000,
  });

  // Delete page mutation
  const deletePageMutation = useMutation({
    mutationFn: async (pageId: string) => {
      const { data } = await api.delete('/content/pages', { data: { id: pageId } });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-pages'] });
      queryClient.invalidateQueries({ queryKey: ['content-stats'] });
      toast({
        title: 'Página eliminada',
        description: 'La página ha sido eliminada exitosamente.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la página.',
        variant: 'destructive',
      });
    },
  });

  // Delete banner mutation
  const deleteBannerMutation = useMutation({
    mutationFn: async (bannerId: string) => {
      const { data } = await api.delete('/content/banners', { data: { id: bannerId } });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-banners'] });
      queryClient.invalidateQueries({ queryKey: ['content-stats'] });
      toast({
        title: 'Banner eliminado',
        description: 'El banner ha sido eliminado exitosamente.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el banner.',
        variant: 'destructive',
      });
    },
  });

  // Delete media mutation
  const deleteMediaMutation = useMutation({
    mutationFn: async (mediaId: string) => {
      const { data } = await api.delete('/content/media', { data: { id: mediaId } });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-media'] });
      queryClient.invalidateQueries({ queryKey: ['content-stats'] });
      toast({
        title: 'Archivo eliminado',
        description: 'El archivo ha sido eliminado exitosamente.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el archivo.',
        variant: 'destructive',
      });
    },
  });

  return {
    // Data
    pages: pages || [],
    banners: banners || [],
    media: media || [],
    stats: stats || null,
    
    // Loading states
    isLoading: pagesLoading || bannersLoading || mediaLoading || statsLoading,
    pagesLoading,
    bannersLoading,
    mediaLoading,
    statsLoading,
    
    // Refetch functions
    refreshContent: () => {
      refetchPages();
      refetchBanners();
      refetchMedia();
    },
    refetchPages,
    refetchBanners,
    refetchMedia,
    
    // Mutations
    deletePage: deletePageMutation.mutate,
    deleteBanner: deleteBannerMutation.mutate,
    deleteMedia: deleteMediaMutation.mutate,
    
    // Mutation states
    isDeletingPage: deletePageMutation.isPending,
    isDeletingBanner: deleteBannerMutation.isPending,
    isDeletingMedia: deleteMediaMutation.isPending,
  };
}
