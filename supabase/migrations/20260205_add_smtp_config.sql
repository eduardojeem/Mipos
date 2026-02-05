-- Migración: Agregar configuración SMTP a business_config
-- Fecha: 2026-02-05
-- Descripción: Permite almacenar configuración de servidor SMTP para notificaciones

-- Agregar columnas SMTP a business_config
ALTER TABLE business_config 
ADD COLUMN IF NOT EXISTS smtp_host TEXT,
ADD COLUMN IF NOT EXISTS smtp_port INTEGER DEFAULT 587,
ADD COLUMN IF NOT EXISTS smtp_user TEXT,
ADD COLUMN IF NOT EXISTS smtp_password TEXT,
ADD COLUMN IF NOT EXISTS smtp_secure BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS smtp_from_email TEXT,
ADD COLUMN IF NOT EXISTS smtp_from_name TEXT;

-- Comentarios para documentación
COMMENT ON COLUMN business_config.smtp_host IS 'Servidor SMTP (ej: smtp.gmail.com)';
COMMENT ON COLUMN business_config.smtp_port IS 'Puerto SMTP (587 para TLS, 465 para SSL)';
COMMENT ON COLUMN business_config.smtp_user IS 'Usuario/Email para autenticación SMTP';
COMMENT ON COLUMN business_config.smtp_password IS 'Contraseña o App Password para SMTP';
COMMENT ON COLUMN business_config.smtp_secure IS 'Usar conexión segura (TLS/SSL)';
COMMENT ON COLUMN business_config.smtp_from_email IS 'Email remitente por defecto';
COMMENT ON COLUMN business_config.smtp_from_name IS 'Nombre del remitente';

-- Índice para búsquedas por organización (si no existe)
CREATE INDEX IF NOT EXISTS idx_business_config_organization 
ON business_config(organization_id);

-- Nota: Las contraseñas SMTP deberían ser encriptadas en la aplicación
-- antes de guardarlas en la base de datos
