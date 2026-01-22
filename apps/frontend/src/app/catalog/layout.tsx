import { Toaster } from '@/components/ui/toaster';

export default function CatalogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {children}
      <Toaster />
    </div>
  );
}

export const metadata = {
  title: 'Catálogo de Cosméticos - BeautyPOS',
  description: 'Explora nuestro catálogo de productos de belleza y cosméticos',
};