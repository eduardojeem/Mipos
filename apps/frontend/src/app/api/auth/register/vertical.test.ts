import { describe, expect, it } from 'vitest';
import { DEFAULT_VERTICAL } from '@/config/verticals';
import { resolveSignupVertical } from './vertical';

describe('resolveSignupVertical', () => {
    it('defaults old signup clients to retail when vertical is missing', () => {
        expect(resolveSignupVertical(undefined)).toEqual({ ok: true, vertical: DEFAULT_VERTICAL });
        expect(resolveSignupVertical('')).toEqual({ ok: true, vertical: DEFAULT_VERTICAL });
    });

    it('accepts supported verticals case-insensitively', () => {
        expect(resolveSignupVertical('barbershop')).toEqual({ ok: true, vertical: 'BARBERSHOP' });
        expect(resolveSignupVertical(' RETAIL ')).toEqual({ ok: true, vertical: 'RETAIL' });
    });

    it('rejects unsupported verticals before organization creation', () => {
        const result = resolveSignupVertical('restaurant');

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toContain('RETAIL');
            expect(result.error).toContain('BARBERSHOP');
        }
    });
});
