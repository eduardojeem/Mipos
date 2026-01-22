'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Briefcase, 
  Building2, 
  User, 
  Calendar,
  MapPin,
  Phone,
  Mail,
  Save,
  Edit3,
  X,
  Plus,
  Trash2
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const professionalInfoSchema = z.object({
  department: z.string().min(2, 'El departamento debe tener al menos 2 caracteres'),
  position: z.string().min(2, 'La posición debe tener al menos 2 caracteres'),
  employeeId: z.string().min(3, 'El ID de empleado debe tener al menos 3 caracteres'),
  supervisor: z.string().optional(),
  workLocation: z.string().optional(),
  startDate: z.string().optional(),
  workPhone: z.string().optional(),
  workEmail: z.string().email('Email de trabajo inválido').optional().or(z.literal('')),
  skills: z.array(z.string()).optional(),
  certifications: z.array(z.object({
    name: z.string(),
    issuer: z.string(),
    date: z.string(),
    expiryDate: z.string().optional()
  })).optional(),
  bio: z.string().max(500, 'La biografía profesional no puede exceder 500 caracteres').optional(),
});

type ProfessionalInfoData = z.infer<typeof professionalInfoSchema>;

interface Certification {
  name: string;
  issuer: string;
  date: string;
  expiryDate?: string;
}

interface ProfessionalInfoProps {
  initialData?: Partial<ProfessionalInfoData>;
  onUpdate: (data: ProfessionalInfoData) => Promise<boolean>;
  isLoading?: boolean;
}

const departments = [
  'Ventas',
  'Inventario',
  'Administración',
  'Recursos Humanos',
  'Contabilidad',
  'Marketing',
  'Tecnología',
  'Operaciones',
  'Servicio al Cliente',
  'Logística'
];

const positions = [
  'Gerente General',
  'Gerente de Ventas',
  'Gerente de Inventario',
  'Supervisor de Tienda',
  'Cajero',
  'Vendedor',
  'Asistente Administrativo',
  'Contador',
  'Analista',
  'Coordinador'
];

export function ProfessionalInfo({ initialData, onUpdate, isLoading = false }: ProfessionalInfoProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [newCertification, setNewCertification] = useState<Certification>({
    name: '',
    issuer: '',
    date: '',
    expiryDate: ''
  });

  const form = useForm<ProfessionalInfoData>({
    resolver: zodResolver(professionalInfoSchema),
    defaultValues: {
      department: initialData?.department || '',
      position: initialData?.position || '',
      employeeId: initialData?.employeeId || '',
      supervisor: initialData?.supervisor || '',
      workLocation: initialData?.workLocation || '',
      startDate: initialData?.startDate || '',
      workPhone: initialData?.workPhone || '',
      workEmail: initialData?.workEmail || '',
      skills: initialData?.skills || [],
      certifications: initialData?.certifications || [],
      bio: initialData?.bio || '',
    },
  });

  const { watch, setValue, getValues } = form;
  const skills = watch('skills') || [];
  const certifications = watch('certifications') || [];

  useEffect(() => {
    if (initialData) {
      form.reset({
        department: initialData.department || '',
        position: initialData.position || '',
        employeeId: initialData.employeeId || '',
        supervisor: initialData.supervisor || '',
        workLocation: initialData.workLocation || '',
        startDate: initialData.startDate || '',
        workPhone: initialData.workPhone || '',
        workEmail: initialData.workEmail || '',
        skills: initialData.skills || [],
        certifications: initialData.certifications || [],
        bio: initialData.bio || '',
      });
    }
  }, [initialData, form]);

  const onSubmit = async (data: ProfessionalInfoData) => {
    setIsSaving(true);
    try {
      const success = await onUpdate(data);
      if (success) {
        setIsEditing(false);
        toast.success('Información profesional actualizada correctamente');
      }
    } catch (error) {
      toast.error('Error al actualizar la información profesional');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    form.reset();
    setIsEditing(false);
  };

  const addSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      const updatedSkills = [...skills, newSkill.trim()];
      setValue('skills', updatedSkills);
      setNewSkill('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    const updatedSkills = skills.filter(skill => skill !== skillToRemove);
    setValue('skills', updatedSkills);
  };

  const addCertification = () => {
    if (newCertification.name.trim() && newCertification.issuer.trim()) {
      const updatedCertifications = [...certifications, { ...newCertification }];
      setValue('certifications', updatedCertifications);
      setNewCertification({ name: '', issuer: '', date: '', expiryDate: '' });
    }
  };

  const removeCertification = (index: number) => {
    const updatedCertifications = certifications.filter((_, i) => i !== index);
    setValue('certifications', updatedCertifications);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: es });
    } catch {
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Briefcase className="h-5 w-5" />
            <CardTitle>Información Profesional</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-4 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Briefcase className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Información Profesional</CardTitle>
              <CardDescription>
                Datos laborales y profesionales del empleado
              </CardDescription>
            </div>
          </div>
          {!isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2"
            >
              <Edit3 className="h-4 w-4" />
              Editar
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {!isEditing ? (
          <div className="space-y-6">
            {/* Información Básica */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  Departamento
                </div>
                <p className="text-sm">{getValues('department') || 'No especificado'}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <User className="h-4 w-4" />
                  Posición
                </div>
                <p className="text-sm">{getValues('position') || 'No especificado'}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Badge className="h-4 w-4" />
                  ID Empleado
                </div>
                <p className="text-sm font-mono">{getValues('employeeId') || 'No asignado'}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <User className="h-4 w-4" />
                  Supervisor
                </div>
                <p className="text-sm">{getValues('supervisor') || 'No asignado'}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  Ubicación de Trabajo
                </div>
                <p className="text-sm">{getValues('workLocation') || 'No especificado'}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Fecha de Inicio
                </div>
                <p className="text-sm">{formatDate(getValues('startDate') || '') || 'No especificado'}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  Teléfono de Trabajo
                </div>
                <p className="text-sm">{getValues('workPhone') || 'No especificado'}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  Email de Trabajo
                </div>
                <p className="text-sm">{getValues('workEmail') || 'No especificado'}</p>
              </div>
            </div>

            <Separator />

            {/* Habilidades */}
            <div className="space-y-3">
              <h4 className="font-medium">Habilidades</h4>
              <div className="flex flex-wrap gap-2">
                {skills.length > 0 ? (
                  skills.map((skill, index) => (
                    <Badge key={index} variant="secondary">
                      {skill}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No se han agregado habilidades</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Certificaciones */}
            <div className="space-y-3">
              <h4 className="font-medium">Certificaciones</h4>
              {certifications.length > 0 ? (
                <div className="space-y-3">
                  {certifications.map((cert, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <h5 className="font-medium">{cert.name}</h5>
                          <p className="text-sm text-muted-foreground">{cert.issuer}</p>
                          <p className="text-xs text-muted-foreground">
                            Obtenido: {formatDate(cert.date)}
                            {cert.expiryDate && ` • Expira: ${formatDate(cert.expiryDate)}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No se han agregado certificaciones</p>
              )}
            </div>

            {/* Biografía Profesional */}
            {getValues('bio') && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="font-medium">Biografía Profesional</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {getValues('bio')}
                  </p>
                </div>
              </>
            )}
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Información Básica */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Departamento</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar departamento" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {departments.map((dept) => (
                            <SelectItem key={dept} value={dept}>
                              {dept}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Posición</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar posición" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {positions.map((pos) => (
                            <SelectItem key={pos} value={pos}>
                              {pos}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="employeeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ID Empleado</FormLabel>
                      <FormControl>
                        <Input placeholder="EMP-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="supervisor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supervisor</FormLabel>
                      <FormControl>
                        <Input placeholder="Nombre del supervisor" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="workLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ubicación de Trabajo</FormLabel>
                      <FormControl>
                        <Input placeholder="Sucursal Principal" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de Inicio</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="workPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono de Trabajo</FormLabel>
                      <FormControl>
                        <Input placeholder="+1 234 567 8900" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="workEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email de Trabajo</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="usuario@empresa.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* Habilidades */}
              <div className="space-y-4">
                <h4 className="font-medium">Habilidades</h4>
                <div className="flex gap-2">
                  <Input
                    placeholder="Agregar habilidad"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                  />
                  <Button type="button" onClick={addSkill} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill(skill)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Certificaciones */}
              <div className="space-y-4">
                <h4 className="font-medium">Certificaciones</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
                  <Input
                    placeholder="Nombre de la certificación"
                    value={newCertification.name}
                    onChange={(e) => setNewCertification(prev => ({ ...prev, name: e.target.value }))}
                  />
                  <Input
                    placeholder="Entidad emisora"
                    value={newCertification.issuer}
                    onChange={(e) => setNewCertification(prev => ({ ...prev, issuer: e.target.value }))}
                  />
                  <Input
                    type="date"
                    placeholder="Fecha de obtención"
                    value={newCertification.date}
                    onChange={(e) => setNewCertification(prev => ({ ...prev, date: e.target.value }))}
                  />
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      placeholder="Fecha de expiración (opcional)"
                      value={newCertification.expiryDate}
                      onChange={(e) => setNewCertification(prev => ({ ...prev, expiryDate: e.target.value }))}
                    />
                    <Button type="button" onClick={addCertification} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {certifications.length > 0 && (
                  <div className="space-y-2">
                    {certifications.map((cert, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <h5 className="font-medium">{cert.name}</h5>
                          <p className="text-sm text-muted-foreground">{cert.issuer}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(cert.date)}
                            {cert.expiryDate && ` - ${formatDate(cert.expiryDate)}`}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCertification(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Biografía Profesional */}
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Biografía Profesional</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe tu experiencia profesional, logros y objetivos..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Botones de Acción */}
              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={isSaving}>
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}