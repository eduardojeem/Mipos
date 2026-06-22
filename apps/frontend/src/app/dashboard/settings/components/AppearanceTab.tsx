import { useState, useEffect } from 'react';
import {
    Palette, Sun, Moon, Monitor, Paintbrush, Square,
    RotateCcw, CheckCircle, Sparkles, Layers, Brush,
    Contrast, Eye, Zap, Shield, Save, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useUserSettings, useUpdateUserSettings } from '../hooks/useOptimizedSettings';
import { useToast } from '@/components/ui/use-toast';

const PRIMARY_HEX_MAP: Record<string, string> = {
    blue: '#2563eb',
    indigo: '#4f46e5',
    violet: '#7c3aed',
    purple: '#7e22ce',
    fuchsia: '#c026d3',
    pink: '#db2777',
    rose: '#e11d48',
    red: '#dc2626',
    orange: '#ea580c',
    amber: '#d97706',
    yellow: '#eab308',
    lime: '#65a30d',
    green: '#16a34a',
    emerald: '#059669',
    teal: '#0d9488',
    cyan: '#0891b2',
    sky: '#0284c7',
    slate: '#64748b',
    black: '#000000',
};

const DENSITY_OPTIONS = [
    { value: 'compact', label: 'Compacto' },
    { value: 'comfortable', label: 'Normal' },
    { value: 'spacious', label: 'Cómodo' },
];

const RADIUS_OPTIONS = [
    { value: '0', label: 'Cuadrado', icon: Square },
    { value: '0.5', label: 'Medio', icon: Square },
    { value: '1', label: 'Redondeado', icon: Square },
];

export function AppearanceTab() {
    const { data: userSettings, isLoading } = useUserSettings();
    const updateUserSettings = useUpdateUserSettings();
    const { toast } = useToast();

    const [localSettings, setLocalSettings] = useState<any>({});
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        if (userSettings) {
            setLocalSettings(userSettings);
        }
    }, [userSettings]);

    if (isLoading) {
        return <div className="flex items-center justify-center py-8">Cargando...</div>;
    }

    const updateLocalSetting = (key: string, value: any) => {
        setLocalSettings((prev: any) => ({ ...prev, [key]: value }));
        setHasChanges(true);
    };

    const saveChanges = async () => {
        try {
            await updateUserSettings.mutateAsync(localSettings);
            setHasChanges(false);
            toast({
                title: 'Cambios guardados',
                description: 'Tu configuración visual se ha actualizado correctamente.',
            });
        } catch (error: any) {
            toast({
                title: 'Error al guardar',
                description: error?.response?.data?.error || 'No se pudieron guardar los cambios. Intenta nuevamente.',
                variant: 'destructive',
            });
        }
    };

    const resetStyles = () => {
        const defaultSettings = {
            theme: 'system',
            dashboard_layout: 'comfortable',
            enable_animations: true,
            primary_color: 'blue',
            border_radius: '0.5',
            enable_glassmorphism: true,
            enable_gradients: true,
            enable_shadows: true,
        };
        setLocalSettings((prev: any) => ({ ...prev, ...defaultSettings }));
        setHasChanges(true);
    };

    const primaryColor = localSettings?.primary_color || 'blue';
    const borderRadius = localSettings?.border_radius || '0.5';

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="grid lg:grid-cols-[1fr_400px] gap-8 items-start"
        >
            {/* LEFT COLUMN: Controls */}
            <div className="space-y-6">
                
                {/* Theme Mode */}
                <Card className="glass-card overflow-hidden hover-lift border-border/50 bg-card/60 backdrop-blur-xl">
                    <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Sun className="w-5 h-5 text-amber-500" />
                                Modo de Interfaz
                            </CardTitle>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={resetStyles}
                                className="h-8 text-xs text-muted-foreground hover:text-foreground"
                            >
                                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                                Restablecer todo
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {[
                                { value: 'light', label: 'Claro', icon: Sun, bg: 'bg-white', text: 'text-slate-900 border-slate-200' },
                                { value: 'dark', label: 'Oscuro', icon: Moon, bg: 'bg-slate-950', text: 'text-white border-slate-800' },
                                { value: 'system', label: 'Sistema', icon: Monitor, bg: 'bg-gradient-to-br from-white to-slate-950', text: 'text-foreground border-muted' },
                            ].map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => updateLocalSetting('theme', option.value)}
                                    className={cn(
                                        "group relative flex flex-col gap-3 p-4 rounded-2xl border-2 transition-all duration-300 overflow-hidden text-left",
                                        localSettings?.theme === option.value
                                            ? "border-primary bg-primary/5 shadow-md shadow-primary/5"
                                            : "border-border hover:border-primary/30 bg-muted/20"
                                    )}
                                >
                                    <div className={cn(
                                        "aspect-video rounded-xl flex items-center justify-center relative overflow-hidden",
                                        option.bg, option.text, "border shadow-inner w-full"
                                    )}>
                                        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
                                        <option.icon className={cn("h-8 w-8 relative z-10 transition-transform group-hover:scale-110 duration-500", localSettings?.theme === option.value ? "text-primary" : "opacity-40")} />
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="font-bold text-sm">{option.label}</p>
                                    </div>
                                    {localSettings?.theme === option.value && (
                                        <motion.div
                                            layoutId="active-theme-user"
                                            className="absolute top-2 right-2"
                                        >
                                            <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow-sm">
                                                <CheckCircle className="w-3 h-3 text-primary-foreground" />
                                            </div>
                                        </motion.div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Primary Color Palette */}
                <Card className="glass-card overflow-hidden hover-lift border-border/50 bg-card/60 backdrop-blur-xl">
                    <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Paintbrush className="w-5 h-5 text-fuchsia-500" />
                                Color de Acento
                            </CardTitle>
                            <Badge variant="outline" className="capitalize text-xs">
                                {primaryColor}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-7 sm:grid-cols-10 gap-2 sm:gap-3">
                            {Object.entries(PRIMARY_HEX_MAP).map(([color, hex]) => (
                                <button
                                    key={color}
                                    className={cn(
                                        "group relative aspect-square rounded-full transition-all duration-300 hover:scale-110 active:scale-90 shadow-sm",
                                        primaryColor === color
                                            ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110 shadow-md"
                                            : "hover:shadow-md border border-black/10 dark:border-white/10"
                                    )}
                                    style={{ backgroundColor: hex }}
                                    onClick={() => updateLocalSetting('primary_color', color)}
                                    title={color}
                                >
                                    {primaryColor === color && (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="absolute inset-0 m-auto h-4 w-4 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/40"
                                        >
                                            <CheckCircle className="h-3 w-3 text-white" />
                                        </motion.div>
                                    )}
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-4">
                            Este color personaliza los botones, insignias y elementos interactivos del sistema.
                        </p>
                    </CardContent>
                </Card>

                {/* Geometry & Interface Space */}
                <Card className="glass-card overflow-hidden hover-lift border-border/50 bg-card/60 backdrop-blur-xl">
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Layers className="w-5 h-5 text-blue-500" />
                            Geometría y Espacio
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        {/* Border Radius */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-sm font-medium">
                                <span>Curvatura de Bordes</span>
                                <Badge variant="secondary" className="font-mono text-[10px]">{borderRadius}rem</Badge>
                            </div>
                            <div className="flex gap-2">
                                {RADIUS_OPTIONS.map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => updateLocalSetting('border_radius', option.value)}
                                        className={cn(
                                            "flex-1 h-10 rounded-xl border transition-all flex items-center justify-center gap-2 text-sm font-medium",
                                            borderRadius === option.value
                                                ? "border-primary bg-primary/10 text-primary"
                                                : "border-border hover:border-primary/30 text-muted-foreground"
                                        )}
                                    >
                                        <option.icon className="h-4 w-4" />
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Density */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-sm font-medium">
                                <span>Densidad de la Interfaz</span>
                            </div>
                            <div className="flex gap-1 p-1 bg-muted/50 rounded-xl border border-border/50">
                                {DENSITY_OPTIONS.map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => updateLocalSetting('dashboard_layout', option.value)}
                                        className={cn(
                                            "flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all",
                                            localSettings?.dashboard_layout === option.value
                                                ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
                                                : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Visual Effects */}
                <Card className="glass-card overflow-hidden hover-lift border-border/50 bg-card/60 backdrop-blur-xl">
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Sparkles className="w-5 h-5 text-emerald-500" />
                            Efectos Visuales
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid sm:grid-cols-2 gap-4">
                        {[
                            { id: 'enable_animations', label: 'Animaciones Fluidas', icon: RotateCcw, color: 'text-blue-500' },
                            { id: 'enable_glassmorphism', label: 'Efecto Cristal', icon: Layers, color: 'text-indigo-500' },
                            { id: 'enable_gradients', label: 'Fondos Degradados', icon: Brush, color: 'text-pink-500' },
                            { id: 'enable_shadows', label: 'Sombras de Prof', icon: Contrast, color: 'text-slate-500' },
                        ].map((effect) => (
                            <div key={effect.id} className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-background/50">
                                <div className="flex items-center gap-2.5">
                                    <effect.icon className={cn("w-4 h-4", effect.color)} />
                                    <Label className="text-xs font-semibold cursor-pointer" htmlFor={effect.id}>{effect.label}</Label>
                                </div>
                                <Switch
                                    id={effect.id}
                                    className="scale-90"
                                    checked={(localSettings as any)[effect.id] ?? true}
                                    onCheckedChange={(checked) => updateLocalSetting(effect.id, checked)}
                                />
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>

            {/* RIGHT COLUMN: Sticky Preview & Actions */}
            <div className="relative">
                <div className="sticky top-6 space-y-6">
                    {/* Live Preview */}
                    <Card className="border-border/50 bg-gradient-to-br from-card to-background shadow-xl overflow-hidden ring-1 ring-border/50">
                        <CardHeader className="pb-4 bg-muted/20 border-b border-border/50">
                            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground uppercase tracking-wider">
                                <Eye className="h-4 w-4" />
                                Vista Previa en Vivo
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div
                                className="p-5 w-full bg-background/80 border shadow-sm space-y-5 transition-all duration-300"
                                style={{ borderRadius: `${parseFloat(borderRadius) * 1.5}rem` }}
                            >
                                {/* Mock Header */}
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 flex items-center justify-center shadow-inner text-white font-bold text-lg" style={{ backgroundColor: PRIMARY_HEX_MAP[primaryColor], borderRadius: `${parseFloat(borderRadius) * 1}rem` }}>
                                        M
                                    </div>
                                    <div className="space-y-1.5 flex-1">
                                        <div className="h-3 w-2/3 bg-muted rounded-full" />
                                        <div className="h-2 w-1/3 bg-muted rounded-full opacity-60" />
                                    </div>
                                </div>

                                {/* Mock Content Card */}
                                <div className="p-4 bg-muted/20 border space-y-4" style={{ borderRadius: `${parseFloat(borderRadius) * 1}rem` }}>
                                    <div className="space-y-2">
                                        <div className="h-2 w-full bg-muted rounded-full" />
                                        <div className="h-2 w-5/6 bg-muted rounded-full" />
                                    </div>
                                    
                                    {/* Mock Buttons */}
                                    <div className="flex gap-2 pt-1">
                                        <div className="flex-1 py-2 text-center text-xs font-bold text-white shadow-md transition-colors" style={{ backgroundColor: PRIMARY_HEX_MAP[primaryColor], borderRadius: `${parseFloat(borderRadius) * 0.5}rem` }}>
                                            Primario
                                        </div>
                                        <div className="flex-1 py-2 text-center text-xs font-bold border transition-colors bg-background" style={{ borderRadius: `${parseFloat(borderRadius) * 0.5}rem`, color: PRIMARY_HEX_MAP[primaryColor], borderColor: `${PRIMARY_HEX_MAP[primaryColor]}30` }}>
                                            Secundario
                                        </div>
                                    </div>
                                </div>

                                {/* Mock Stats */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-card border shadow-sm flex flex-col gap-2" style={{ borderRadius: `${parseFloat(borderRadius) * 0.8}rem` }}>
                                        <Zap className="w-4 h-4" style={{ color: PRIMARY_HEX_MAP[primaryColor] }} />
                                        <div className="h-2 w-12 bg-muted rounded-full" />
                                    </div>
                                    <div className="p-3 bg-card border shadow-sm flex flex-col gap-2" style={{ borderRadius: `${parseFloat(borderRadius) * 0.8}rem` }}>
                                        <Shield className="w-4 h-4 text-muted-foreground" />
                                        <div className="h-2 w-12 bg-muted rounded-full" />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Actions Card */}
                    <Card className={cn(
                        "transition-all duration-500 overflow-hidden border-border/50",
                        hasChanges ? "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-xl shadow-primary/10" : "opacity-80"
                    )}>
                        <CardContent className="p-4">
                            <Button
                                onClick={saveChanges}
                                disabled={!hasChanges || updateUserSettings.isPending}
                                className="w-full h-12 text-base font-bold shadow-md"
                            >
                                {updateUserSettings.isPending ? (
                                    <>
                                        <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-5 w-5 mr-2" />
                                        {hasChanges ? 'Guardar Cambios' : 'Sin cambios'}
                                    </>
                                )}
                            </Button>
                            {hasChanges && (
                                <p className="text-center text-xs text-muted-foreground mt-3 animate-pulse">
                                    Tienes cambios sin guardar
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </motion.div>
    );
}
