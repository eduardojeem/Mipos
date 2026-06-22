import { BUSINESS_VERTICALS, DEFAULT_VERTICAL, type BusinessVertical } from '@/config/verticals';

type SignupVerticalResult =
    | { ok: true; vertical: BusinessVertical }
    | { ok: false; error: string };

export function resolveSignupVertical(value: unknown): SignupVerticalResult {
    if (value === undefined || value === null || value === '') {
        return { ok: true, vertical: DEFAULT_VERTICAL };
    }

    const requested = typeof value === 'string' ? value.trim().toUpperCase() : '';

    if (!(BUSINESS_VERTICALS as readonly string[]).includes(requested)) {
        return {
            ok: false,
            error: `Tipo de negocio invalido. Valores permitidos: ${BUSINESS_VERTICALS.join(', ')}`,
        };
    }

    return { ok: true, vertical: requested as BusinessVertical };
}
