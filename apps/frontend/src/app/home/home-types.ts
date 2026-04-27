export type HomeStats = {
  products: number;
  categories: number;
  offers: number;
};

export type HomeOfferPreview = {
  id: string;
  name: string;
  image: string;
  promotionName: string;
  basePrice: number;
  offerPrice: number;
  discountPercent: number;
  endDate?: string;
};

export type HomeProductPreview = {
  id: string;
  name: string;
  description?: string;
  image: string;
  price: number;
  offerPrice?: number;
  stock: number;
  categoryName?: string;
};

export type HomeCategoryPreview = {
  id: string;
  name: string;
  productCount: number;
};

export type TenantHomeSnapshot = {
  stats: HomeStats;
  categories: HomeCategoryPreview[];
  offers: HomeOfferPreview[];
  products: HomeProductPreview[];
};
