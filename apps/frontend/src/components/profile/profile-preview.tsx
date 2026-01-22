'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  User, 
  Phone, 
  MapPin, 
  Calendar,
  Check,
  X,
  Eye
} from 'lucide-react';

interface ProfilePreviewProps {
  formData: {
    name: string;
    phone: string;
    location: string;
    bio: string;
  };
  currentData: {
    name: string;
    phone: string;
    location: string;
    bio: string;
    avatar: string;
    email: string;
    role: string;
    joinDate: string;
  };
  onConfirm: () => void;
  onCancel: () => void;
  isVisible: boolean;
}

export function ProfilePreview({ 
  formData, 
  currentData, 
  onConfirm, 
  onCancel, 
  isVisible 
}: ProfilePreviewProps) {
  if (!isVisible) return null;

  const hasChanges = (
    formData.name !== currentData.name ||
    formData.phone !== currentData.phone ||
    formData.location !== currentData.location ||
    formData.bio !== currentData.bio
  );

  const getChangeIndicator = (field: keyof typeof formData) => {
    return formData[field] !== currentData[field] ? (
      <Badge variant="secondary" className="ml-2 text-xs animate-pulse">
        Modificado
      </Badge>
    ) : null;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-background rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto animate-scale-in">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                <CardTitle>Vista Previa de Cambios</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancel}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Revisa los cambios antes de guardarlos
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Profile Header Preview */}
            <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
              <Avatar className="h-20 w-20">
                <AvatarImage src={currentData.avatar} alt={formData.name} />
                <AvatarFallback className="text-lg">
                  {formData.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 space-y-2">
                <div className="flex items-center">
                  <h3 className="text-xl font-semibold">{formData.name}</h3>
                  {getChangeIndicator('name')}
                </div>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>{currentData.email}</span>
                </div>
                
                <Badge variant="outline">{currentData.role}</Badge>
              </div>
            </div>

            {/* Changes Summary */}
            {hasChanges && (
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Resumen de Cambios</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {formData.name !== currentData.name && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium">Nombre:</span>
                      <div className="text-right">
                        <div className="text-muted-foreground line-through">
                          {currentData.name}
                        </div>
                        <div className="text-primary font-medium">
                          {formData.name}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {formData.phone !== currentData.phone && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium">Teléfono:</span>
                      <div className="text-right">
                        <div className="text-muted-foreground line-through">
                          {currentData.phone}
                        </div>
                        <div className="text-primary font-medium">
                          {formData.phone}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {formData.location !== currentData.location && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium">Ubicación:</span>
                      <div className="text-right">
                        <div className="text-muted-foreground line-through">
                          {currentData.location}
                        </div>
                        <div className="text-primary font-medium">
                          {formData.location}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {formData.bio !== currentData.bio && (
                    <div className="space-y-2 text-sm">
                      <span className="font-medium">Biografía:</span>
                      <div className="space-y-1">
                        <div className="text-muted-foreground line-through text-xs p-2 bg-muted rounded">
                          {currentData.bio}
                        </div>
                        <div className="text-primary font-medium text-xs p-2 bg-primary/10 rounded">
                          {formData.bio}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Contact Information Preview */}
            <div className="grid gap-4">
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{formData.phone}</span>
                {getChangeIndicator('phone')}
              </div>
              
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{formData.location}</span>
                {getChangeIndicator('location')}
              </div>
              
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Miembro desde {currentData.joinDate}</span>
              </div>
            </div>

            {/* Bio Preview */}
            <div className="space-y-2">
              <div className="flex items-center">
                <h4 className="font-medium">Biografía</h4>
                {getChangeIndicator('bio')}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {formData.bio}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                onClick={onConfirm}
                className="flex-1 button-press"
                disabled={!hasChanges}
              >
                <Check className="h-4 w-4 mr-2" />
                Confirmar Cambios
              </Button>
              
              <Button
                variant="outline"
                onClick={onCancel}
                className="flex-1 button-press"
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
            </div>

            {!hasChanges && (
              <div className="text-center text-sm text-muted-foreground">
                No hay cambios para guardar
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}