-- =============================================================================
-- MIGRATION: 20260618_add_customer_phone_to_appointments
-- Teléfono del cliente en el turno (para reservas públicas online).
--
-- En la reserva pública el cliente no tiene cuenta: deja nombre + teléfono.
-- El teléfono permite contactarlo/confirmar (ej: WhatsApp).
-- =============================================================================

BEGIN;

ALTER TABLE public.appointments
    ADD COLUMN IF NOT EXISTS customer_phone TEXT;

COMMENT ON COLUMN public.appointments.customer_phone IS
    'Teléfono de contacto del cliente (walk-in / reserva pública sin cuenta).';

COMMIT;
