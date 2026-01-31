import { useState, useEffect } from 'react';
import {
    Palette, Sun, Moon, Monitor, Paintbrush, Square,
    RotateCcw, CheckCircle, Sparkles, Layers, Brush,
    Contrast, Eye, Zap, Shield, Save, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

    // Estado local para cambios pendientes
    const [localSettings, setLocalSettings] = useState<any>({});
    const [hasChanges, setHasChanges] = useState(false);

    // Sincronizar con settings del servidor
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
            className="grid gap-8"
        >
            {/* Theme Selection */}
            <Card className="glass-effect border-primary/10 shadow-2xl rounded-[2rem] overflow-hidden bg-white/50 dark:bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-6 border-b bg-muted/5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <CardTitle className="flex items-center gap-3 text-2xl">
                                <div className="p-2.5 rounded-2xl bg-gradient-to-br from-primary to-primary/40 text-white shadow-lg shadow-primary/20">
                                    <Palette className="h-6 w-6" />
                                </div>
                                Experiencia Visual
                            </CardTitle>
                            <CardDescription className="text-sm font-medium">
                                Personaliza cómo ves el sistema MiPOS
                            </CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={resetStyles}
                                className="gap-2 rounded-xl hover:bg-primary/5 text-primary font-bold"
                            >
                                <RotateCcw className="h-4 w-4" />
                                Restablecer
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-8 space-y-10">
                    {/* Theme Mode */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2">
                            <Sun className="w-4 h-4 text-primary" />
                            <Label className="text-lg font-bold">Modo de Interfaz</Label>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            {[
                                { value: 'light', label: 'Claro', icon: Sun, bg: 'bg-white', text: 'text-slate-900 border-slate-200' },
                                { value: 'dark', label: 'Oscuro', icon: Moon, bg: 'bg-slate-950', text: 'text-white border-slate-800' },
                                { value: 'system', label: 'Sistema', icon: Monitor, bg: 'bg-gradient-to-br from-white to-slate-950', text: 'text-foreground border-muted' },
                            ].map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => updateLocalSetting('theme', option.value)}
                                    className={cn(
                                        "group relative flex flex-col gap-4 p-5 rounded-[1.5rem] border-2 transition-all duration-300 active:scale-95 overflow-hidden",
                                        localSettings?.theme === option.value
                                            ? "border-primary bg-primary/5 shadow-[0_0_20px_rgba(var(--primary),0.1)]"
                                            : "border-muted hover:border-primary/20 bg-background/50"
                                    )}
                                >
                                    <div className={cn(
                                        "aspect-video rounded-xl flex items-center justify-center relative overflow-hidden",
                                        option.bg, option.text, "border shadow-inner"
                                    )}>
                                        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
                                        <option.icon className={cn("h-10 w-10 relative z-10 transition-transform group-hover:scale-110 duration-500", localSettings?.theme === option.value ? "text-primary" : "opacity-40")} />
                                    </div>
                                    <div className="text-center space-y-1">
                                        <p className="font-bold text-base leading-none">{option.label}</p>
                                        <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-tighter">Esquema de Colores</p>
                                    </div>
                                    {localSettings?.theme === option.value && (
                                        <motion.div
                                            layoutId="active-theme-user"
                                            className="absolute top-3 right-3"
                                        >
                                            <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                                                <CheckCircle className="w-3 h-3 text-white" />
                                            </div>
                                        </motion.div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-10">
                        {/* Primary Color Palette */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Paintbrush className="w-4 h-4 text-primary" />
                                    <Label className="text-lg font-bold">Acento Personal</Label>
                                </div>
                                <Badge variant="outline" className="rounded-full px-3 capitalize font-bold border-primary/20 text-primary bg-primary/5">
                                    {primaryColor}
                                </Badge>
                            </div>
                            <div className="grid grid-cols-6 gap-3">
                                {Object.entries(PRIMARY_HEX_MAP).map(([color, hex]) => (
                                    <button
                                        key={color}
                                        className={cn(
                                            "group relative aspect-square rounded-2xl transition-all duration-300 hover:scale-110 active:scale-90 shadow-sm",
                                            primaryColor === color
                                                ? "ring-2 ring-primary ring-offset-4 ring-offset-background"
                                                : "hover:shadow-md"
                                        )}
                                        style={{ backgroundColor: hex }}
                                        onClick={() => updateLocalSetting('primary_color', color)}
                                        title={color}
                                    >
                                        {primaryColor === color && (
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="absolute inset-0 m-auto h-6 w-6 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/40"
                                            >
                                                <CheckCircle className="h-4 w-4 text-white" />
                                            </motion.div>
                                        )}
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-muted-foreground font-medium">Este color personaliza los elementos interactivos solo para tu sesión.</p>
                        </div>

                        {/* Geometry & Space */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-2">
                                <Square className="w-4 h-4 text-primary" />
                                <Label className="text-lg font-bold">Diseño y Espacio</Label>
                            </div>
                            <div className="space-y-8">
                                <div className="space-y-4">
                                    <div className="flex justify-between text-sm font-bold opacity-70">
                                        <span>Curvatura de Bordes</span>
                                        <span className="text-primary font-mono">{borderRadius}rem</span>
                                    </div>
                                    <div className="flex gap-2">
                                        {RADIUS_OPTIONS.map((option) => (
                                            <button
                                                key={option.value}
                                                onClick={() => updateLocalSetting('border_radius', option.value)}
                                                className={cn(
                                                    "flex-1 h-12 rounded-xl border-2 transition-all flex items-center justify-center group",
                                                    borderRadius === option.value
                                                        ? "border-primary bg-primary/10"
                                                        : "border-muted hover:border-primary/30"
                                                )}
                                            >
                                                <option.icon className={cn("h-5 w-5 transition-transform group-hover:scale-110", borderRadius === option.value ? "text-primary" : "text-muted-foreground")} />
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between text-sm font-bold opacity-70">
                                        <span>Densidad de Interfaz</span>
                                        <span className="text-primary capitalize">{localSettings?.dashboard_layout}</span>
                                    </div>
                                    <div className="flex gap-2 p-1.5 bg-muted/30 rounded-2xl border">
                                        {DENSITY_OPTIONS.map((option) => (
                                            <button
                                                key={option.value}
                                                onClick={() => updateLocalSetting('dashboard_layout', option.value)}
                                                className={cn(
                                                    "flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all",
                                                    localSettings?.dashboard_layout === option.value
                                                        ? "bg-background text-primary shadow-sm border border-primary/10"
                                                        : "text-muted-foreground hover:text-foreground"
                                                )}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Effects & Motion */}
                <Card className="glass-effect border-primary/10 shadow-xl rounded-[2rem] bg-white/50 dark:bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600">
                                <Sparkles className="h-5 w-5" />
                            </div>
                            Efectos Personales
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {[
                            { id: 'enable_animations', label: 'Animaciones Fluidas', icon: RotateCcw, color: 'text-blue-500' },
                            { id: 'enable_glassmorphism', label: 'Efecto Cristal', icon: Layers, color: 'text-indigo-500' },
                            { id: 'enable_gradients', label: 'Fondos Degradados', icon: Brush, color: 'text-pink-500' },
                            { id: 'enable_shadows', label: 'Sombras de Profundidad', icon: Contrast, color: 'text-slate-500' },
                        ].map((effect) => (
                            <div key={effect.id} className="flex items-center justify-between p-4 rounded-2xl bg-muted/10 border border-transparent hover:border-primary/10 transition-all">
                                <div className="flex items-center gap-3">
                                    <effect.icon className={cn("w-4 h-4", effect.color)} />
                                    <Label className="font-bold text-sm cursor-pointer" htmlFor={effect.id}>{effect.label}</Label>
                                </div>
                                <Switch
                                    id={effect.id}
                                    checked={(localSettings as any)[effect.id] ?? true}
                                    onCheckedChange={(checked) => updateLocalSetting(effect.id, checked)}
                                />
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Live Preview */}
                <Card className="glass-effect border-primary/10 shadow-xl rounded-[2rem] overflow-hidden bg-gradient-to-br from-primary/5 to-transparent backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-600">
                                <Eye className="h-5 w-5" />
                            </div>
                            Vista Previa
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-full pb-10">
                        <div
                            className="p-6 h-full rounded-3xl border bg-background/60 shadow-inner space-y-6"
                            style={{ borderRadius: `${parseFloat(borderRadius) * 1.5}rem` }}
                        >
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full" style={{ backgroundColor: PRIMARY_HEX_MAP[primaryColor] }} />
                                    <div className="h-3 w-32 bg-muted rounded-full" />
                                </div>
                                <div className="p-4 rounded-2xl bg-muted/20 border space-y-3" style={{ borderRadius: `${parseFloat(borderRadius) * 0.8}rem` }}>
                                    <div className="h-2 w-full bg-muted rounded-full" />
                                    <div className="h-2 w-2/3 bg-muted rounded-full opacity-50" />
                                    <div className="flex gap-2 pt-2">
                                        <div className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-white shadow-sm" style={{ backgroundColor: PRIMARY_HEX_MAP[primaryColor], borderRadius: `${parseFloat(borderRadius) * 0.5}rem` }}>Botón</div>
                                        <div className="px-3 py-1.5 rounded-lg border text-[10px] font-bold" style={{ borderRadius: `${parseFloat(borderRadius) * 0.5}rem` }}>Ghost</div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 rounded-2xl flex flex-col items-center gap-1 border shadow-sm" style={{
                                    backgroundColor: `${PRIMARY_HEX_MAP[primaryColor]}15`,
                                    borderColor: `${PRIMARY_HEX_MAP[primaryColor]}30`,
                                    borderRadius: `${parseFloat(borderRadius) * 1}rem`
                                }}>
                                    <Zap className="w-5 h-5" style={{ color: PRIMARY_HEX_MAP[primaryColor] }} />
                                    <span className="text-[10px] font-bold" style={{ color: PRIMARY_HEX_MAP[primaryColor] }}>Velocidad</span>
                                </div>
                                <div className="p-3 rounded-2xl bg-muted/10 border flex flex-col items-center gap-1" style={{ borderRadius: `${parseFloat(borderRadius) * 1}rem` }}>
                                    <Shield className="w-5 h-5 text-muted-foreground" />
                                    <span className="text-[10px] font-bold text-muted-foreground">Seguro</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Sticky Save Button */}
            {hasChanges && (
                <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 duration-500">
                    <Button
                        onClick={saveChanges}
                        disabled={updateUserSettings.isPending}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xl shadow-blue-500/20 px-8 py-6 text-lg font-bold rounded-2xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                    >
                        {updateUserSettings.isPending ? (
                            <div className="mr-3 animate-spin">
                                <RefreshCw className="h-5 w-5" />
                            </div>
                        ) : (
                            <Save className="h-5 w-5 mr-3" />
                        )}
                        Guardar Apariencia
                    </Button>
                </div>
            )}
        </motion.div>
    );
}
