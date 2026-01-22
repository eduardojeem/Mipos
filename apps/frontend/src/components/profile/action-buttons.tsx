'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Edit, 
  Lock, 
  Eye, 
  EyeOff, 
  Save,
  Download,
  Trash2,
  Shield
} from 'lucide-react';
import { toast } from '@/lib/toast';

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'La contraseña actual es requerida'),
  newPassword: z.string().min(8, 'La nueva contraseña debe tener al menos 8 caracteres'),
  confirmPassword: z.string().min(1, 'Confirma la nueva contraseña'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

type PasswordFormData = z.infer<typeof passwordSchema>;

interface ActionButtonsProps {
  onEditProfile: () => void;
}

export function ActionButtons({ onEditProfile }: ActionButtonsProps) {
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const handlePasswordChange = async (data: PasswordFormData) => {
    setIsChangingPassword(true);
    
    try {
      // Simulate API call to change password
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In production, you would make an actual API call here
      console.log('Password change data:', data);
      
      toast.success('Contraseña cambiada correctamente');
      setIsPasswordDialogOpen(false);
      passwordForm.reset();
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Error al cambiar la contraseña');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleExportData = async () => {
    try {
      // Simulate data export
      toast.success('Exportando datos del perfil...');
      
      // In production, you would generate and download the actual data
      const userData = {
        profile: 'User profile data',
        preferences: 'User preferences',
        activity: 'User activity history',
        exportDate: new Date().toISOString(),
      };
      
      const dataStr = JSON.stringify(userData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `perfil-usuario-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      toast.success('Datos exportados correctamente');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Error al exportar los datos');
    }
  };

  const handleDeleteAccount = () => {
    // This would typically open a confirmation dialog
    toast.error('Función no implementada. Contacta al administrador para eliminar tu cuenta.');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Shield className="w-5 h-5 mr-2" />
          Acciones de Cuenta
        </CardTitle>
        <CardDescription>
          Gestiona tu perfil y configuración de seguridad
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col space-y-3">
          {/* Edit Profile Button */}
          <Button
            onClick={onEditProfile}
            className="w-full justify-start"
            variant="outline"
          >
            <Edit className="w-4 h-4 mr-2" />
            Editar Perfil
          </Button>

          {/* Change Password Button */}
          <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                <Lock className="w-4 h-4 mr-2" />
                Cambiar Contraseña
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md" aria-labelledby="change-password-title">
              <DialogHeader>
                <DialogTitle id="change-password-title">Cambiar Contraseña</DialogTitle>
                <DialogDescription>
                  Ingresa tu contraseña actual y la nueva contraseña
                </DialogDescription>
              </DialogHeader>
              
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(handlePasswordChange)} className="space-y-4">
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contraseña actual</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showCurrentPassword ? "text" : "password"}
                              placeholder="Ingresa tu contraseña actual"
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            >
                              {showCurrentPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nueva contraseña</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showNewPassword ? "text" : "password"}
                              placeholder="Ingresa tu nueva contraseña"
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                            >
                              {showNewPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmar nueva contraseña</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="Confirma tu nueva contraseña"
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                              {showConfirmPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsPasswordDialogOpen(false);
                        passwordForm.reset();
                      }}
                      disabled={isChangingPassword}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isChangingPassword}>
                      {isChangingPassword ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Cambiando...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Cambiar Contraseña
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Additional Actions */}
        <div className="pt-4 border-t">
          <div className="flex flex-col space-y-3">
            <Button
              variant="outline"
              onClick={handleExportData}
              className="w-full justify-start"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar Datos
            </Button>
            
            <Button
              variant="ghost"
              onClick={handleDeleteAccount}
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Eliminar Cuenta
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground mt-3 text-center">
            La eliminación de cuenta es permanente y no se puede deshacer
          </p>
        </div>
      </CardContent>
    </Card>
  );
}