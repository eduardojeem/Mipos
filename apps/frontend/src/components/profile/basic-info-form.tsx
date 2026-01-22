'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Save, Edit3, X } from 'lucide-react';
import { toast } from '@/lib/toast';
import { useProfile } from '@/hooks/use-profile';

const profileSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Ingresa un email válido'),
  phone: z.string().optional(),
  bio: z.string().max(500, 'La biografía no puede exceder 500 caracteres').optional(),
  location: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface BasicInfoFormProps {
  initialData: {
    name: string;
    email: string;
    phone?: string;
    bio?: string;
    location?: string;
  };
  onUpdate: (data: ProfileFormData) => void;
}

export function BasicInfoForm({ initialData, onUpdate }: BasicInfoFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { updateProfile } = useProfile();

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: initialData.name || '',
      email: initialData.email || '',
      phone: initialData.phone || '',
      bio: initialData.bio || '',
      location: initialData.location || '',
    },
  });

  // Update form when initialData changes
  useEffect(() => {
    form.reset({
      name: initialData.name || '',
      email: initialData.email || '',
      phone: initialData.phone || '',
      bio: initialData.bio || '',
      location: initialData.location || '',
    });
  }, [initialData, form]);

  const onSubmit = async (data: ProfileFormData) => {
    setIsLoading(true);
    
    try {
      const success = await updateProfile({
        name: data.name,
        phone: data.phone,
        bio: data.bio,
        location: data.location,
      });

      if (!success) {
        throw new Error('No se pudo actualizar el perfil');
      }

      onUpdate(data);
      setIsEditing(false);
      toast.success('Perfil actualizado correctamente');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Error al actualizar el perfil');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    form.reset();
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-xl">Información Personal</CardTitle>
            <CardDescription>
              Tu información básica y datos de contacto
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            <Edit3 className="w-4 h-4 mr-2" />
            Editar
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Nombre completo</Label>
              <p className="text-sm font-medium">{initialData.name || 'No especificado'}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Correo electrónico</Label>
              <p className="text-sm font-medium">{initialData.email}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Teléfono</Label>
              <p className="text-sm font-medium">{initialData.phone || 'No especificado'}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Ubicación</Label>
              <p className="text-sm font-medium">{initialData.location || 'No especificado'}</p>
            </div>
          </div>
          {initialData.bio && (
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Biografía</Label>
              <p className="text-sm mt-1 text-muted-foreground">{initialData.bio}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-xl">Editar Información Personal</CardTitle>
          <CardDescription>
            Actualiza tu información básica y datos de contacto
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
        >
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre completo</FormLabel>
                    <FormControl>
                      <Input placeholder="Tu nombre completo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo electrónico</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="tu@email.com" 
                        {...field}
                        disabled // Email usually shouldn't be editable
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl>
                      <Input placeholder="+595 21 1234567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ubicación</FormLabel>
                    <FormControl>
                      <Input placeholder="Ciudad, País" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Biografía</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Cuéntanos un poco sobre ti..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Guardar cambios
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}