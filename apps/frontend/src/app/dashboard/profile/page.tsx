'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProfile } from '@/hooks/use-profile';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { User, RefreshCw, Shield, Lock, Save, X, Eye, Sparkles, Check, ArrowRight, Activity, Calendar, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast';
import { formatDate, formatCurrency } from '@/lib/utils';
import api from '@/lib/api';
import { ProfileSkeleton } from '@/components/profile/profile-skeleton';
import { ProfilePreview } from '@/components/profile/profile-preview';
import { ProfileHeader } from '@/components/profile/profile-header';
import '../../../styles/animations.css';

interface EditableProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  bio?: string;
  location?: string;
  avatar?: string;
  role: string;
  createdAt: string;
  updatedAt?: string;
  lastLogin?: string;
}

interface OrganizationInfo {
  organizationId: string;
  name: string;
  slug: string;
  role: string;
  roleDescription: string;
  permissions: string[];
  isOwner?: boolean;
}

const EMPTY_FORM = { name: '', phone: '', bio: '', location: '' };

export default function ProfilePage() {
  const router = useRouter();
  const { profile, isLoading, error: profileError, updateProfile, updateAvatar, refreshProfile } = useProfile();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [organizationInfo, setOrganizationInfo] = useState<OrganizationInfo | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({ name: '', phone: '', bio: '', location: '' });

  const syncEditForm = useCallback((nextProfile: EditableProfile | null) => {
    if (!nextProfile) return setEditForm(EMPTY_FORM);
    setEditForm({
      name: nextProfile.name || '',
      phone: nextProfile.phone || '',
      bio: nextProfile.bio || '',
      location: nextProfile.location || '',
    });
  }, []);

  useEffect(() => {
    if (profile && !isEditing) syncEditForm(profile);
  }, [profile, isEditing, syncEditForm]);

  const loadOrganizationInfo = useCallback(async () => {
    if (!profile?.id) return setOrganizationInfo(null);
    try {
      const response = await api.get('/auth/organization/info');
      setOrganizationInfo(response.data?.success ? response.data.data || null : null);
    } catch (error) {
      console.warn('Could not load organization info:', error);
      setOrganizationInfo(null);
    }
  }, [profile?.id]);

  useEffect(() => {
    void loadOrganizationInfo();
  }, [loadOrganizationInfo]);

  const isAdmin = useMemo(() => {
    const role = String(organizationInfo?.role || '').toUpperCase();
    return role === 'ADMIN' || role === 'OWNER' || role === 'SUPER_ADMIN';
  }, [organizationInfo?.role]);

  const validateField = useCallback((field: keyof typeof editForm, value: string) => {
    let nextError = '';
    if (field === 'name') {
      if (!value.trim()) nextError = 'El nombre es requerido';
      else if (value.trim().length < 2) nextError = 'El nombre debe tener al menos 2 caracteres';
      else if (value.trim().length > 50) nextError = 'El nombre no puede exceder 50 caracteres';
    }
    if (field === 'phone' && value && !/^(\+595\s?[0-9]{2}\s?[0-9]{7}|0[0-9]{2}\s?[0-9]{7}|[0-9]{9})$/.test(value.replace(/\s/g, ''))) {
      nextError = 'Formato de telefono invalido (ejemplo: +595 21 1234567)';
    }
    if (field === 'bio' && value.length > 500) nextError = 'La biografia no puede exceder 500 caracteres';
    if (field === 'location' && value.length > 100) nextError = 'La ubicacion no puede exceder 100 caracteres';
    setFormErrors((prev) => ({ ...prev, [field]: nextError }));
    return nextError === '';
  }, []);

  const handleFormChange = useCallback((field: keyof typeof editForm, value: string) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
    validateField(field, value);
  }, [validateField]);

  const isFormValid = useMemo(() => Object.values(formErrors).every((value) => value === '') && editForm.name.trim().length >= 2, [editForm.name, formErrors]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setPageError(null);
    try {
      await refreshProfile();
      await loadOrganizationInfo();
      toast.success('Perfil actualizado correctamente');
    } catch {
      setPageError('No se pudo actualizar el perfil');
      toast.error('No se pudo actualizar el perfil');
    } finally {
      setIsRefreshing(false);
    }
  }, [loadOrganizationInfo, refreshProfile]);

  const handleToggleEdit = useCallback(() => {
    if (isEditing) {
      syncEditForm(profile ?? null);
      setFormErrors({ name: '', phone: '', bio: '', location: '' });
      setShowPreview(false);
    }
    setPageError(null);
    setIsEditing((prev) => !prev);
  }, [isEditing, profile, syncEditForm]);

  const handleCancelEdit = useCallback(() => {
    syncEditForm(profile ?? null);
    setFormErrors({ name: '', phone: '', bio: '', location: '' });
    setShowPreview(false);
    setPageError(null);
    setIsEditing(false);
  }, [profile, syncEditForm]);

  const handleSaveProfile = useCallback(() => {
    if (!isFormValid) return toast.error('Corrige los errores del formulario antes de guardar');
    setShowPreview(true);
  }, [isFormValid]);

  const handleConfirmSave = useCallback(async () => {
    setIsSaving(true);
    setShowPreview(false);
    setPageError(null);
    try {
      const success = await updateProfile(editForm);
      if (!success) throw new Error('No se pudo actualizar el perfil');
      await refreshProfile();
      await loadOrganizationInfo();
      setIsEditing(false);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'No se pudo actualizar el perfil');
    } finally {
      setIsSaving(false);
    }
  }, [editForm, loadOrganizationInfo, refreshProfile, updateProfile]);

  const handleAvatarUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPageError(null);
    if (file.size > 5 * 1024 * 1024) {
      const message = 'El archivo es demasiado grande. Maximo 5 MB.';
      setPageError(message);
      toast.error(message);
      event.target.value = '';
      return;
    }
    if (!file.type.startsWith('image/')) {
      const message = 'Solo se permiten archivos de imagen.';
      setPageError(message);
      toast.error(message);
      event.target.value = '';
      return;
    }
    try {
      setIsUploading(true);
      const success = await updateAvatar(file);
      if (!success) throw new Error('No se pudo actualizar la foto de perfil');
      await refreshProfile();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'No se pudo actualizar la foto de perfil');
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  }, [refreshProfile, updateAvatar]);

  const effectiveError = pageError || profileError;

  if (isLoading) return <ProfileSkeleton />;
  if (!profile) return <MissingProfileState error={effectiveError} isRefreshing={isRefreshing} onRefresh={handleRefresh} onBack={() => router.push('/dashboard')} />;

  return (
    <div className="container mx-auto space-y-6 py-6 animate-fade-in">
      {effectiveError && <ProfileErrorBanner error={effectiveError} isRefreshing={isRefreshing} onRefresh={handleRefresh} onDismiss={() => setPageError(null)} />}
      <ProfileHeader profile={profile} isRefreshing={isRefreshing} isUploading={isUploading} isEditing={isEditing} onRefresh={handleRefresh} onToggleEdit={handleToggleEdit} onChangePassword={() => router.push('/dashboard/profile/change-password')} onAvatarUpload={handleAvatarUpload} />
      <Tabs defaultValue="overview" className="space-y-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className={`grid h-auto w-full p-1 sm:w-auto ${isAdmin ? 'grid-cols-3' : 'grid-cols-2'} rounded-lg bg-muted/50 animate-slide-in-left`}>
            <TabsTrigger value="overview" className="flex items-center gap-2 px-4 py-2"><User className="h-4 w-4" /><span>Informacion personal</span></TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2 px-4 py-2"><Shield className="h-4 w-4" /><span>Seguridad</span></TabsTrigger>
            {isAdmin && <TabsTrigger value="plan" className="flex items-center gap-2 px-4 py-2"><Sparkles className="h-4 w-4" /><span>Plan</span></TabsTrigger>}
          </TabsList>
          {isEditing && <div className="flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700"><User className="h-3 w-3" />Modo edicion activo</div>}
        </div>
        <TabsContent value="overview" className="space-y-6 tab-content-enter">
          <OverviewTab profile={profile} editForm={editForm} formErrors={formErrors} isEditing={isEditing} isSaving={isSaving} isFormValid={isFormValid} organizationInfo={organizationInfo} onChange={handleFormChange} onSave={handleSaveProfile} onCancel={handleCancelEdit} />
        </TabsContent>
        <TabsContent value="security" className="space-y-6 tab-content-enter">
          <SecurityTab onChangePassword={() => router.push('/dashboard/profile/change-password')} onOpenTwoFactor={() => router.push('/dashboard/profile/two-factor')} onOpenSessions={() => router.push('/dashboard/profile/sessions')} />
        </TabsContent>
        {isAdmin && <TabsContent value="plan" className="space-y-6 tab-content-enter"><PlanSection /></TabsContent>}
      </Tabs>
      <RecentActivitySection userId={profile.id} />
      <ProfilePreview formData={editForm} currentData={{ name: profile.name || '', phone: profile.phone || '', location: profile.location || '', bio: profile.bio || '', avatar: profile.avatar || '', email: profile.email || '', role: profile.role || '', joinDate: profile.createdAt ? formatDate(profile.createdAt) : '' }} onConfirm={handleConfirmSave} onCancel={() => setShowPreview(false)} isVisible={showPreview} />
    </div>
  );
}

function MissingProfileState({ error, isRefreshing, onRefresh, onBack }: { error?: string | null; isRefreshing: boolean; onRefresh: () => void; onBack: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-96">
        <CardContent className="pt-6">
          <div className="space-y-4 text-center">
            <User className="mx-auto h-12 w-12 text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold">No se pudo cargar el perfil</h3>
              <p className="mt-1 text-muted-foreground">{error || 'Intenta recargar la pagina'}</p>
            </div>
            <div className="flex justify-center gap-2">
              <Button onClick={onRefresh} disabled={isRefreshing}><RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />{isRefreshing ? 'Actualizando...' : 'Reintentar'}</Button>
              <Button variant="outline" onClick={onBack}>Volver al dashboard</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ProfileErrorBanner({ error, isRefreshing, onRefresh, onDismiss }: { error: string; isRefreshing: boolean; onRefresh: () => void; onDismiss: () => void }) {
  return (
    <Card className="border-red-200 bg-red-50 animate-slide-in-top">
      <CardContent className="pt-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-red-800"><X className="h-4 w-4" /><span>{error}</span></div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onRefresh} disabled={isRefreshing}><RefreshCw className={`mr-1 h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />Reintentar</Button>
            <Button size="sm" variant="ghost" onClick={onDismiss}><X className="h-3 w-3" /></Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function OverviewTab({
  profile,
  editForm,
  formErrors,
  isEditing,
  isSaving,
  isFormValid,
  organizationInfo,
  onChange,
  onSave,
  onCancel,
}: {
  profile: EditableProfile;
  editForm: typeof EMPTY_FORM;
  formErrors: { name: string; phone: string; bio: string; location: string };
  isEditing: boolean;
  isSaving: boolean;
  isFormValid: boolean;
  organizationInfo: OrganizationInfo | null;
  onChange: (field: keyof typeof EMPTY_FORM, value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="hover-lift smooth-transition">
        <CardHeader>
          <CardTitle>Informacion personal</CardTitle>
          <CardDescription>Gestiona tus datos personales y tu presentacion.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditing ? (
            <form onSubmit={(event) => { event.preventDefault(); onSave(); }} className="space-y-4">
              <Field label="Nombre completo *" error={formErrors.name}><Input value={editForm.name} onChange={(event) => onChange('name', event.target.value)} className={formErrors.name ? 'border-red-500' : ''} /></Field>
              <Field label="Telefono" error={formErrors.phone}><Input value={editForm.phone} onChange={(event) => onChange('phone', event.target.value)} placeholder="+595 21 1234567" className={formErrors.phone ? 'border-red-500' : ''} /></Field>
              <Field label="Ubicacion" error={formErrors.location}><Input value={editForm.location} onChange={(event) => onChange('location', event.target.value)} placeholder="Ciudad, pais" className={formErrors.location ? 'border-red-500' : ''} /></Field>
              <div className="space-y-2">
                <Label>Biografia</Label>
                <Textarea value={editForm.bio} onChange={(event) => onChange('bio', event.target.value)} placeholder="Cuentanos sobre ti..." rows={3} className={formErrors.bio ? 'border-red-500' : ''} />
                <div className="flex items-center justify-between">
                  {formErrors.bio ? <p className="text-sm text-red-500">{formErrors.bio}</p> : <span />}
                  <p className="ml-auto text-xs text-muted-foreground">{editForm.bio.length}/500 caracteres</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={isSaving || !isFormValid}><Save className="mr-2 h-4 w-4" />{isSaving ? 'Guardando...' : 'Guardar'}</Button>
                <Button type="button" variant="outline" onClick={onCancel}><X className="mr-2 h-4 w-4" />Cancelar</Button>
              </div>
            </form>
          ) : (
            <>
              <InfoRow label="Nombre" value={profile.name || 'No especificado'} />
              <InfoRow label="Email" value={profile.email || 'No especificado'} />
              <InfoRow label="Telefono" value={profile.phone || 'No especificado'} />
              <InfoRow label="Ubicacion" value={profile.location || 'No especificada'} />
              <InfoRow label="Biografia" value={profile.bio || 'No agregaste una biografia todavia.'} />
              <Separator />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><Label className="font-medium">Ultimo acceso</Label><p className="text-muted-foreground">{profile.lastLogin ? formatDate(profile.lastLogin) : 'Sin acceso'}</p></div>
                <div><Label className="font-medium">Estado</Label><Badge variant="outline" className="ml-2">Activo</Badge></div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="hover-lift smooth-transition">
        <CardHeader>
          <CardTitle>Informacion de cuenta</CardTitle>
          <CardDescription>Contexto operativo de tu usuario dentro del sistema.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <InfoRow label="Rol del sistema" value={profile.role || 'Usuario'} />
          {organizationInfo ? (
            <>
              <InfoRow label="Organizacion" value={organizationInfo.name} strong />
              <Separator />
              <div>
                <Label className="text-sm font-medium">Rol en la organizacion</Label>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant="default" className="bg-blue-600">{organizationInfo.role}</Badge>
                  <span className="text-xs text-muted-foreground">{organizationInfo.roleDescription}</span>
                </div>
              </div>
              {organizationInfo.permissions.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <Label className="mb-2 block text-sm font-medium">Permisos principales</Label>
                    <div className="flex flex-wrap gap-2">
                      {organizationInfo.permissions.slice(0, 6).map((permission) => <Badge key={permission} variant="outline" className="text-xs">{permission}</Badge>)}
                      {organizationInfo.permissions.length > 6 && <Badge variant="outline" className="text-xs">+{organizationInfo.permissions.length - 6} mas</Badge>}
                    </div>
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/20"><p className="text-sm text-amber-800 dark:text-amber-200">No pudimos cargar tu organizacion actual.</p></div>
          )}
          <InfoRow label="Fecha de registro" value={profile.createdAt ? formatDate(profile.createdAt) : 'No disponible'} />
          <div><Label className="text-sm font-medium">ID de usuario</Label><p className="mt-1 font-mono text-xs text-muted-foreground">{profile.id}</p></div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}{error && <p className="text-sm text-red-500">{error}</p>}</div>;
}

function InfoRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <>
      <div>
        <Label className="text-sm font-medium">{label}</Label>
        <p className={`mt-1 text-sm ${strong ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>{value}</p>
      </div>
      <Separator />
    </>
  );
}

function SecurityTab({ onChangePassword, onOpenTwoFactor, onOpenSessions }: { onChangePassword: () => void; onOpenTwoFactor: () => void; onOpenSessions: () => void }) {
  return (
    <Card className="hover-lift smooth-transition">
      <CardHeader>
        <CardTitle>Configuracion de seguridad</CardTitle>
        <CardDescription>Gestiona acceso, contraseña y protecciones de tu cuenta.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <SecurityActionCard title="Cambiar contraseña" description="Actualiza tu contraseña regularmente para mantener tu cuenta segura." icon={<Lock className="mr-2 h-4 w-4" />} actionLabel="Cambiar" onClick={onChangePassword} />
        <SecurityActionCard title="Autenticacion de dos factores" description="Revisa el estado del segundo factor y administra tu acceso adicional." icon={<Shield className="mr-2 h-4 w-4" />} actionLabel="Revisar" onClick={onOpenTwoFactor} />
        <SecurityActionCard title="Sesiones activas" description="Consulta las sesiones abiertas y cierra las que ya no reconozcas." icon={<Eye className="mr-2 h-4 w-4" />} actionLabel="Ver sesiones" onClick={onOpenSessions} />
      </CardContent>
    </Card>
  );
}

function SecurityActionCard({ title, description, icon, actionLabel, onClick }: { title: string; description: string; icon: React.ReactNode; actionLabel: string; onClick: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-4 hover-lift smooth-transition">
      <div className="space-y-1">
        <Label className="font-medium">{title}</Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Button variant="outline" onClick={onClick}>{icon}{actionLabel}</Button>
    </div>
  );
}

function RecentActivitySection({ userId }: { userId: string }) {
  const [activities, setActivities] = useState<Array<{ id: string; total_amount: number; created_at: string; status: string; customer_name?: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadActivities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/sales/recent?limit=5&user_id=${userId}`);
      if (response.data?.success === false) throw new Error(response.data.error || 'No se pudo cargar la actividad reciente');
      setActivities(Array.isArray(response.data?.sales) ? response.data.sales : []);
    } catch (loadError) {
      console.error('Error fetching recent activity:', loadError);
      setActivities([]);
      setError('No se pudo cargar la actividad reciente');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) void loadActivities();
  }, [loadActivities, userId]);

  if (loading) {
    return (
      <Card className="mt-6">
        <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" />Actividad reciente</CardTitle></CardHeader>
        <CardContent><div className="space-y-4">{[1, 2, 3].map((index) => <div key={index} className="flex items-center justify-between rounded-lg border p-4 animate-pulse"><div className="h-4 w-1/3 rounded bg-gray-200" /><div className="h-4 w-1/4 rounded bg-gray-200" /></div>)}</div></CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-blue-600" />Actividad reciente</CardTitle>
          <CardDescription>No pudimos cargar tu actividad comercial reciente.</CardDescription>
        </CardHeader>
        <CardContent><Button variant="outline" onClick={() => void loadActivities()}><RefreshCw className="mr-2 h-4 w-4" />Reintentar</Button></CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return <Card className="mt-6"><CardHeader><CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-blue-600" />Actividad reciente</CardTitle><CardDescription>Aun no hay movimientos recientes para este usuario.</CardDescription></CardHeader></Card>;
  }

  return (
    <Card className="mt-6 hover-lift smooth-transition">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-blue-600" />Actividad reciente</CardTitle>
        <CardDescription>Tus ultimas ventas y movimientos registrados.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-900">
              <div className="flex items-start gap-4">
                <div className="rounded-full bg-green-100 p-2 dark:bg-green-900/30"><CreditCard className="h-5 w-5 text-green-600 dark:text-green-400" /></div>
                <div>
                  <p className="font-medium">Venta #{activity.id.slice(0, 8)}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground"><Calendar className="h-3 w-3" /><span>{formatDate(activity.created_at)}</span><span>/</span><span>{activity.customer_name || 'Cliente casual'}</span></div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">{formatCurrency(activity.total_amount)}</p>
                <Badge variant={activity.status === 'completed' ? 'default' : 'secondary'} className="capitalize">{activity.status === 'completed' ? 'Completada' : activity.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function PlanSection() {
  const [currentPlan, setCurrentPlan] = useState<any>(null);
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);

  const loadPlanData = useCallback(async () => {
    try {
      setLoading(true);
      try {
        const currentResponse = await api.get('/api/auth/organization/plan');
        setCurrentPlan(currentResponse.data.data || null);
      } catch {
        setCurrentPlan(null);
      }
      const plansResponse = await api.get('/plans');
      setAvailablePlans(plansResponse.data.plans || []);
    } catch (error) {
      console.error('Error loading plan data:', error);
      setAvailablePlans([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlanData();
  }, [loadPlanData]);

  const handleRequestPlanChange = async (planSlug: string) => {
    try {
      setRequesting(true);
      await api.post('/api/auth/organization/request-plan-change', { planSlug });
      toast.success('Solicitud de cambio de plan enviada correctamente');
    } catch (error) {
      console.error('Error requesting plan change:', error);
      toast.error('No se pudo solicitar el cambio de plan');
    } finally {
      setRequesting(false);
    }
  };

  const getPlanColor = (slug: string) => {
    const normalized = String(slug || '').toLowerCase();
    if (normalized === 'free') return 'from-slate-500 to-slate-700';
    if (normalized === 'starter') return 'from-blue-500 to-cyan-600';
    if (normalized === 'pro' || normalized === 'professional') return 'from-purple-600 to-indigo-600';
    if (normalized === 'premium') return 'from-fuchsia-600 to-pink-700';
    if (normalized === 'enterprise') return 'from-amber-600 to-orange-700';
    return 'from-slate-500 to-slate-600';
  };

  if (loading) return <Card><CardContent className="py-12"><div className="flex items-center justify-center"><RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" /></div></CardContent></Card>;

  return (
    <div className="space-y-6">
      <Card className="hover-lift smooth-transition border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-purple-600" />Plan actual</CardTitle>
              <CardDescription>Resumen de tu suscripcion activa.</CardDescription>
            </div>
            {currentPlan && <Badge className={`bg-gradient-to-r ${getPlanColor(currentPlan.slug)} border-0 px-3 py-1 text-xs font-bold uppercase tracking-widest text-white`}>{currentPlan.slug}</Badge>}
          </div>
        </CardHeader>
        <CardContent>
          {currentPlan ? (
            <div className="rounded-xl border bg-gradient-to-br from-slate-50 to-slate-100 p-6 dark:from-slate-900 dark:to-slate-800">
              <h3 className="mb-2 text-2xl font-bold">{currentPlan.name}</h3>
              <p className="mb-4 text-muted-foreground">{currentPlan.description}</p>
              <div className="mb-4 flex items-baseline gap-2"><span className="text-4xl font-black">${currentPlan.price_monthly}</span><span className="text-muted-foreground">/mes</span></div>
              <div className="mb-4 grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-background/50 p-3"><div className="mb-1 text-xs text-muted-foreground">Usuarios</div><div className="font-bold">{currentPlan.limits?.maxUsers === -1 ? 'Ilimitados' : currentPlan.limits?.maxUsers}</div></div>
                <div className="rounded-lg bg-background/50 p-3"><div className="mb-1 text-xs text-muted-foreground">Productos</div><div className="font-bold">{currentPlan.limits?.maxProducts === -1 ? 'Ilimitados' : currentPlan.limits?.maxProducts}</div></div>
              </div>
              <div className="space-y-2">
                <div className="mb-2 text-sm font-semibold">Caracteristicas incluidas</div>
                {Array.isArray(currentPlan.features) && currentPlan.features.map((feature: any, index: number) => {
                  const featureName = typeof feature === 'string' ? feature : feature.name;
                  const included = typeof feature === 'string' ? true : feature.included;
                  return included ? <div key={index} className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-green-600" /><span>{featureName}</span></div> : null;
                })}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground"><Sparkles className="mx-auto mb-4 h-12 w-12 opacity-50" /><p>No tienes un plan asignado actualmente.</p></div>
          )}
        </CardContent>
      </Card>
      <Card className="hover-lift smooth-transition">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ArrowRight className="h-5 w-5 text-blue-600" />Planes disponibles</CardTitle>
          <CardDescription>Solicita un cambio cuando necesites mas capacidad.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {availablePlans.map((plan) => {
              const isCurrentPlan = currentPlan?.slug === plan.slug;
              return (
                <div key={plan.id} className={`rounded-xl border-2 p-6 transition-all ${isCurrentPlan ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/20' : 'border-slate-200 hover:border-purple-300 dark:border-slate-800 dark:hover:border-purple-700'}`}>
                  <div className={`mb-4 h-1 w-12 rounded-full bg-gradient-to-r ${getPlanColor(plan.slug)}`} />
                  <h4 className="mb-2 text-xl font-bold">{plan.name}</h4>
                  <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">{plan.description}</p>
                  <div className="mb-4 flex items-baseline gap-1"><span className="text-3xl font-black">${plan.price_monthly}</span><span className="text-sm text-muted-foreground">/mes</span></div>
                  <div className="mb-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-green-600" /><span>{plan.limits?.maxUsers === -1 ? 'Usuarios ilimitados' : `${plan.limits?.maxUsers} usuarios`}</span></div>
                    <div className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-green-600" /><span>{plan.limits?.maxProducts === -1 ? 'Productos ilimitados' : `${plan.limits?.maxProducts} productos`}</span></div>
                  </div>
                  {isCurrentPlan ? (
                    <Button disabled className="w-full" variant="outline"><Check className="mr-2 h-4 w-4" />Plan actual</Button>
                  ) : (
                    <Button className="w-full" onClick={() => handleRequestPlanChange(plan.slug)} disabled={requesting}><ArrowRight className="mr-2 h-4 w-4" />{requesting ? 'Solicitando...' : 'Solicitar cambio'}</Button>
                  )}
                </div>
              );
            })}
          </div>
          {availablePlans.length === 0 && <div className="py-12 text-center text-muted-foreground"><Sparkles className="mx-auto mb-4 h-12 w-12 opacity-50" /><p>No hay planes disponibles en este momento.</p></div>}
        </CardContent>
      </Card>
    </div>
  );
}
