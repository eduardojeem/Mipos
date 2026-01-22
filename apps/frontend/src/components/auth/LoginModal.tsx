'use client';

import React, { useState } from 'react';
import { useAuth } from './AuthProvider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  LogIn, 
  UserPlus, 
  Eye, 
  EyeOff,
  Loader2,
  Shield
} from 'lucide-react';

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoginModal({ open, onOpenChange }: LoginModalProps) {
  const { signIn, signUp, loading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFormLoading(true);

    try {
      if (isLogin) {
        // Iniciar sesión
        const { error } = await signIn(formData.email, formData.password);
        if (!error) {
          onOpenChange(false);
          setFormData({ email: '', password: '', confirmPassword: '', name: '' });
        }
      } else {
        // Registrarse
        if (formData.password !== formData.confirmPassword) {
          setError('Las contraseñas no coinciden');
          return;
        }

        const { error } = await signUp(formData.email, formData.password, {
          name: formData.name
        });
        
        if (!error) {
          setIsLogin(true);
          setFormData({ email: formData.email, password: '', confirmPassword: '', name: '' });
        }
      }
    } catch (err) {
      setError('Error inesperado. Intenta de nuevo.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="name">Nombre Completo</Label>
              <Input
                id="name"
                type="text"
                placeholder="Tu nombre completo"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required={!isLogin}
                disabled={formLoading}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="tu@email.com"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              required
              disabled={formLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Tu contraseña"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                required
                disabled={formLoading}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={formLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirma tu contraseña"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                required={!isLogin}
                disabled={formLoading}
              />
            </div>
          )}

          <div className="flex flex-col gap-3">
            <Button
              type="submit"
              disabled={formLoading}
              className="w-full"
            >
              {formLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isLogin ? 'Iniciando sesión...' : 'Creando cuenta...'}
                </>
              ) : (
                <>
                  {isLogin ? (
                    <LogIn className="h-4 w-4 mr-2" />
                  ) : (
                    <UserPlus className="h-4 w-4 mr-2" />
                  )}
                  {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
                setFormData({ email: '', password: '', confirmPassword: '', name: '' });
              }}
              disabled={formLoading}
              className="w-full"
            >
              {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
            </Button>
          </div>
        </form>

        {/* Información sobre roles */}
        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground">
            <strong>Nota:</strong> Para crear productos necesitas tener un rol asignado (admin, manager, o inventory_manager). 
            Contacta al administrador para obtener los permisos necesarios.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}