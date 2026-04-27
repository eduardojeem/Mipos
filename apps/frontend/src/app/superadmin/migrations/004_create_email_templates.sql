-- Migration: Create email_templates table for SuperAdmin email management
-- This table stores email templates that can be customized by SuperAdmins

CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  slug VARCHAR(255) NOT NULL UNIQUE,
  subject VARCHAR(500) NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT,
  category VARCHAR(100) NOT NULL, -- 'auth', 'billing', 'system', 'marketing'
  description TEXT,
  variables JSONB DEFAULT '[]'::jsonb, -- Available variables like {{user_name}}, {{org_name}}
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Create indexes for faster lookups
CREATE INDEX idx_email_templates_slug ON public.email_templates(slug);
CREATE INDEX idx_email_templates_category ON public.email_templates(category);
CREATE INDEX idx_email_templates_is_active ON public.email_templates(is_active);

-- Insert default email templates
INSERT INTO public.email_templates (name, slug, subject, html_content, text_content, category, description, variables) VALUES
  (
    'Bienvenida a Nueva Organización',
    'welcome-organization',
    'Bienvenido a MiPOS - Comencemos',
    '<html><body><h1>¡Bienvenido a MiPOS, {{organization_name}}!</h1><p>Estamos emocionados de tenerte con nosotros.</p><p>Tu cuenta ha sido creada exitosamente. Puedes comenzar a usar MiPOS ahora mismo.</p><p><strong>Detalles de tu cuenta:</strong></p><ul><li>Organización: {{organization_name}}</li><li>Plan: {{plan_name}}</li><li>Usuario admin: {{admin_email}}</li></ul><p>¡Gracias por elegirnos!</p></body></html>',
    'Bienvenido a MiPOS, {{organization_name}}! Tu cuenta ha sido creada. Plan: {{plan_name}}',
    'auth',
    'Email de bienvenida para nuevas organizaciones',
    '["organization_name", "plan_name", "admin_email", "admin_name"]'::jsonb
  ),
  (
    'Recuperación de Contraseña',
    'password-reset',
    'Recupera tu contraseña de MiPOS',
    '<html><body><h1>Recuperación de Contraseña</h1><p>Hola {{user_name}},</p><p>Recibimos una solicitud para restablecer tu contraseña.</p><p><a href="{{reset_link}}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Restablecer Contraseña</a></p><p>Este enlace expira en {{expiry_hours}} horas.</p><p>Si no solicitaste este cambio, ignora este email.</p></body></html>',
    'Hola {{user_name}}, usa este enlace para restablecer tu contraseña: {{reset_link}}. Expira en {{expiry_hours}} horas.',
    'auth',
    'Email para recuperación de contraseña',
    '["user_name", "user_email", "reset_link", "expiry_hours"]'::jsonb
  ),
  (
    'Factura Generada',
    'invoice-created',
    'Tu factura de MiPOS está lista',
    '<html><body><h1>Factura #{{invoice_number}}</h1><p>Hola {{organization_name}},</p><p>Tu factura mensual está lista:</p><ul><li>Monto: {{amount}} {{currency}}</li><li>Periodo: {{billing_period}}</li><li>Fecha de vencimiento: {{due_date}}</li></ul><p><a href="{{invoice_url}}">Ver Factura</a></p></body></html>',
    'Factura #{{invoice_number}} por {{amount}} {{currency}}. Vence: {{due_date}}',
    'billing',
    'Notificación de factura generada',
    '["organization_name", "invoice_number", "amount", "currency", "billing_period", "due_date", "invoice_url"]'::jsonb
  ),
  (
    'Suscripción Cancelada',
    'subscription-cancelled',
    'Tu suscripción ha sido cancelada',
    '<html><body><h1>Suscripción Cancelada</h1><p>Hola {{organization_name}},</p><p>Lamentamos verte partir. Tu suscripción ha sido cancelada.</p><p>Tendrás acceso hasta: {{access_until}}</p><p>Si cambias de opinión, siempre puedes volver.</p></body></html>',
    'Tu suscripción ha sido cancelada. Acceso hasta: {{access_until}}',
    'billing',
    'Confirmación de cancelación de suscripción',
    '["organization_name", "access_until", "plan_name"]'::jsonb
  ),
  (
    'Alerta de Límite de Usuarios',
    'user-limit-warning',
    'Estás cerca de tu límite de usuarios',
    '<html><body><h1>⚠️ Límite de Usuarios</h1><p>Hola {{organization_name}},</p><p>Estás usando {{current_users}} de {{max_users}} usuarios disponibles en tu plan {{plan_name}}.</p><p>Considera actualizar tu plan para agregar más usuarios.</p><p><a href="{{upgrade_url}}">Actualizar Plan</a></p></body></html>',
    'Alerta: Usando {{current_users}}/{{max_users}} usuarios. Actualiza tu plan.',
    'system',
    'Alerta cuando se acerca al límite de usuarios',
    '["organization_name", "current_users", "max_users", "plan_name", "upgrade_url"]'::jsonb
  ),
  (
    'Invitación de Usuario',
    'user-invitation',
    'Has sido invitado a {{organization_name}} en MiPOS',
    '<html><body><h1>¡Has sido invitado!</h1><p>Hola {{invited_email}},</p><p>{{inviter_name}} te ha invitado a unirte a {{organization_name}} en MiPOS.</p><p>Rol asignado: {{role}}</p><p><a href="{{invitation_link}}" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Aceptar Invitación</a></p></body></html>',
    'Has sido invitado a {{organization_name}} como {{role}}. Link: {{invitation_link}}',
    'auth',
    'Invitación para unirse a una organización',
    '["invited_email", "inviter_name", "organization_name", "role", "invitation_link"]'::jsonb
  ),
  (
    'Actualización de Plan',
    'plan-upgraded',
    'Tu plan ha sido actualizado',
    '<html><body><h1>🎉 Plan Actualizado</h1><p>Hola {{organization_name}},</p><p>Tu plan ha sido actualizado exitosamente:</p><ul><li>Plan anterior: {{old_plan}}</li><li>Nuevo plan: {{new_plan}}</li><li>Nuevos límites: {{new_limits}}</li></ul><p>¡Disfruta de las nuevas funcionalidades!</p></body></html>',
    'Plan actualizado de {{old_plan}} a {{new_plan}}.',
    'billing',
    'Confirmación de actualización de plan',
    '["organization_name", "old_plan", "new_plan", "new_limits"]'::jsonb
  )
ON CONFLICT (slug) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Only SUPER_ADMIN can manage email templates
CREATE POLICY "SuperAdmin can manage email templates"
  ON public.email_templates
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_email_templates_updated_at()
RETURNS TRIGGER
AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE TRIGGER trigger_update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_email_templates_updated_at();

-- Grant permissions
GRANT ALL ON public.email_templates TO authenticated;
GRANT ALL ON public.email_templates TO service_role;

-- Add comment
COMMENT ON TABLE public.email_templates IS 'Email templates for automated communications managed by SuperAdmins';
