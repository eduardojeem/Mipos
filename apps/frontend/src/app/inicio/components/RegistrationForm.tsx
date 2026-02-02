'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from '@/lib/toast';

interface SelectedPlan {
    id: string;
    name: string;
    slug: string;
    priceMonthly: number;
}

interface RegistrationFormProps {
    selectedPlan: SelectedPlan;
    onSuccess: () => void;
}

export function RegistrationForm({ selectedPlan, onSuccess }: RegistrationFormProps) {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        organizationName: '',
        password: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

    const validateEmail = (email: string) => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    };

    const validateForm = () => {
        const errors: Record<string, string> = {};

        if (!formData.name.trim()) {
            errors.name = 'El nombre es requerido';
        }

        if (!formData.email.trim()) {
            errors.email = 'El email es requerido';
        } else if (!validateEmail(formData.email)) {
            errors.email = 'Email inválido';
        }

        if (!formData.organizationName.trim()) {
            errors.organizationName = 'El nombre de la organización es requerido';
        }

        if (!formData.password) {
            errors.password = 'La contraseña es requerida';
        } else if (formData.password.length < 6) {
            errors.password = 'La contraseña debe tener al menos 6 caracteres';
        }

        if (formData.password !== formData.confirmPassword) {
            errors.confirmPassword = 'Las contraseñas no coinciden';
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Limpiar error del campo cuando el usuario empieza a escribir
        if (validationErrors[field]) {
            setValidationErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
        if (error) setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: formData.name,
                    email: formData.email,
                    organizationName: formData.organizationName,
                    password: formData.password,
                    planSlug: selectedPlan.slug
                }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Error al crear la cuenta');
            }

            toast.success('¡Cuenta creada exitosamente!', {
                description: data.message || 'Bienvenido a MiPOS'
            });

            // Pequeño delay para que el usuario vea el mensaje de éxito
            setTimeout(() => {
                onSuccess();
            }, 1000);

        } catch (err: any) {
            console.error('Registration error:', err);
            setError(err.message || 'Error al crear la cuenta. Por favor intenta de nuevo.');
            toast.error('Error al registrarse', {
                description: err.message
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Nombre completo */}
            <div className="space-y-2">
                <Label htmlFor="name" className="text-white">
                    Nombre completo <span className="text-red-400">*</span>
                </Label>
                <Input
                    id="name"
                    type="text"
                    placeholder="Juan Pérez"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    disabled={loading}
                    className={`bg-white/5 border-white/10 text-white placeholder:text-gray-500 ${validationErrors.name ? 'border-red-500' : ''}`}
                />
                {validationErrors.name && (
                    <p className="text-sm text-red-500">{validationErrors.name}</p>
                )}
            </div>

            {/* Email */}
            <div className="space-y-2">
                <Label htmlFor="email" className="text-white">
                    Email <span className="text-red-400">*</span>
                </Label>
                <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    disabled={loading}
                    className={`bg-white/5 border-white/10 text-white placeholder:text-gray-500 ${validationErrors.email ? 'border-red-500' : ''}`}
                />
                {validationErrors.email && (
                    <p className="text-sm text-red-500">{validationErrors.email}</p>
                )}
            </div>

            {/* Nombre de la organización */}
            <div className="space-y-2">
                <Label htmlFor="organizationName" className="text-white">
                    Nombre de tu negocio <span className="text-red-400">*</span>
                </Label>
                <Input
                    id="organizationName"
                    type="text"
                    placeholder="Mi Tienda"
                    value={formData.organizationName}
                    onChange={(e) => handleInputChange('organizationName', e.target.value)}
                    disabled={loading}
                    className={`bg-white/5 border-white/10 text-white placeholder:text-gray-500 ${validationErrors.organizationName ? 'border-red-500' : ''}`}
                />
                {validationErrors.organizationName && (
                    <p className="text-sm text-red-500">{validationErrors.organizationName}</p>
                )}
            </div>

            {/* Contraseña */}
            <div className="space-y-2">
                <Label htmlFor="password" className="text-white">
                    Contraseña <span className="text-red-400">*</span>
                </Label>
                <div className="relative">
                    <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Mínimo 6 caracteres"
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        disabled={loading}
                        className={`pr-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500 ${validationErrors.password ? 'border-red-500' : ''}`}
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
                {validationErrors.password && (
                    <p className="text-sm text-red-500">{validationErrors.password}</p>
                )}
            </div>

            {/* Confirmar contraseña */}
            <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-white">
                    Confirmar contraseña <span className="text-red-400">*</span>
                </Label>
                <div className="relative">
                    <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Repite tu contraseña"
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                        disabled={loading}
                        className={`pr-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500 ${validationErrors.confirmPassword ? 'border-red-500' : ''}`}
                    />
                    <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                    >
                        {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                        ) : (
                            <Eye className="h-4 w-4" />
                        )}
                    </button>
                </div>
                {validationErrors.confirmPassword && (
                    <p className="text-sm text-red-500">{validationErrors.confirmPassword}</p>
                )}
            </div>

            {/* Submit button */}
            <Button
                type="submit"
                disabled={loading}
                className="w-full gradient-primary text-white py-6 text-lg rounded-xl shadow-dark-lg glow-purple hover:scale-105 transition-all duration-300"
            >
                {loading ? (
                    <>
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        Creando cuenta...
                    </>
                ) : (
                    <>
                        <CheckCircle2 className="h-5 w-5 mr-2" />
                        Crear mi cuenta
                    </>
                )}
            </Button>

            <p className="text-sm text-gray-400 text-center">
                Al crear una cuenta, aceptas nuestros{' '}
                <a href="/terminos" className="text-purple-400 hover:text-purple-300 underline">
                    Términos de Servicio
                </a>{' '}
                y{' '}
                <a href="/privacidad" className="text-purple-400 hover:text-purple-300 underline">
                    Política de Privacidad
                </a>
            </p>
        </form>
    );
}
