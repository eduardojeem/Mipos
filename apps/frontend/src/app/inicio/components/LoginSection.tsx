'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Loader2, LogIn, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { toast } from '@/lib/toast';

export function LoginSection() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const router = useRouter();
    const { signIn } = useAuth();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email || !password) {
            toast.error('Por favor completa todos los campos');
            return;
        }

        setLoading(true);
        try {
            await signIn(email, password);
            toast.success('¡Bienvenido!');
            router.push('/dashboard');
        } catch (error: any) {
            toast.error('Error al iniciar sesión', {
                description: error.message || 'Verifica tus credenciales'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <section id="login" className="py-20 lg:py-32 bg-[#0a0a0a] relative overflow-hidden">
            {/* Background gradient */}
            <div className="absolute inset-0">
                <div className="absolute top-1/2 left-1/3 w-96 h-96 radial-gradient-purple opacity-20" />
            </div>

            <div className="container mx-auto px-4 relative z-10">
                <div className="max-w-md mx-auto">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-6">
                            <Sparkles className="h-4 w-4 text-purple-400" />
                            <span className="text-sm font-medium text-gray-300">
                                Accede a tu cuenta
                            </span>
                        </div>

                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                            Iniciar Sesión
                        </h2>
                        <p className="text-gray-400">
                            Ingresa con tu cuenta existente
                        </p>
                    </div>

                    {/* Login Form */}
                    <div className="glass-card rounded-2xl p-8">
                        <form onSubmit={handleLogin} className="space-y-6">
                            {/* Email */}
                            <div className="space-y-2">
                                <Label htmlFor="login-email" className="text-white">
                                    Email
                                </Label>
                                <Input
                                    id="login-email"
                                    type="email"
                                    placeholder="tu@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={loading}
                                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                                />
                            </div>

                            {/* Password */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="login-password" className="text-white">
                                        Contraseña
                                    </Label>
                                    <a
                                        href="/recuperar-password"
                                        className="text-sm text-purple-400 hover:text-purple-300"
                                    >
                                        ¿Olvidaste tu contraseña?
                                    </a>
                                </div>
                                <div className="relative">
                                    <Input
                                        id="login-password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        disabled={loading}
                                        className="pr-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Submit button */}
                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full gradient-primary text-white py-6 text-base rounded-xl shadow-dark-lg glow-purple hover:scale-105 transition-all duration-300"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                        Ingresando...
                                    </>
                                ) : (
                                    <>
                                        <LogIn className="h-5 w-5 mr-2" />
                                        Iniciar Sesión
                                    </>
                                )}
                            </Button>
                        </form>

                        {/* Divider */}
                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-white/10"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-[#0a0a0a] text-gray-400">
                                    ¿No tienes cuenta?
                                </span>
                            </div>
                        </div>

                        {/* Register link */}
                        <Button
                            variant="outline"
                            className="w-full glass-card border-white/10 text-white hover:border-purple-500/50"
                            onClick={() => document.getElementById('planes')?.scrollIntoView({ behavior: 'smooth' })}
                        >
                            Crear una cuenta nueva
                        </Button>
                    </div>

                    {/* Trust indicator */}
                    <div className="mt-8 text-center">
                        <p className="text-sm text-gray-500">
                            🔒 Conexión segura con encriptación SSL
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
