import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, ArrowLeft, Search } from 'lucide-react';

export default function ProductNotFound() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-pink-50 to-blue-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
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
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-900/90">
                    <CardContent className="p-12 text-center">
                        <div className="w-24 h-24 bg-gradient-to-br from-primary to-fuchsia-600 rounded-full flex items-center justify-center mx-auto mb-6 opacity-20">
                            <Search className="w-12 h-12 text-white" />
                        </div>

                        <h1 className="text-3xl font-bold text-foreground mb-3">
                            Producto no encontrado
                        </h1>

                        <p className="text-lg text-muted-foreground mb-8 max-w-md mx-auto">
                            El producto que buscas no existe o ya no está disponible. Explora nuestro catálogo para descubrir más opciones.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Link href="/catalog">
                                <Button size="lg" className="bg-gradient-to-r from-primary to-fuchsia-600 hover:from-primary/90 hover:to-fuchsia-600/90">
                                    <Sparkles className="w-5 h-5 mr-2" />
                                    Explorar Catálogo
                                </Button>
                            </Link>

                            <Link href="/home">
                                <Button size="lg" variant="outline">
                                    Volver al Inicio
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
