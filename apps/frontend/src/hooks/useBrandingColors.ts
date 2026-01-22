import { useMemo } from 'react';
import { useBusinessConfig } from '@/contexts/BusinessConfigContext';
import { hexToHslTriple, hexToRgba } from '@/lib/color-utils';

export function useBrandingColors() {
    const { config } = useBusinessConfig();

    const colors = useMemo(() => {
        const branding = config?.branding ?? {};
        const primary = branding.primaryColor ?? '#dc2626';
        const secondary = branding.secondaryColor ?? '#1d4ed8';
        const accent = branding.accentColor ?? '#059669';
        const gradientStart = branding.gradientStart ?? primary;
        const gradientEnd = branding.gradientEnd ?? secondary;
        const backgroundColor = branding.backgroundColor ?? '#f7f9fb';
        const textColor = branding.textColor ?? '#202c38';

        return {
            // Colores base
            primary,
            secondary,
            accent,
            gradientStart,
            gradientEnd,
            backgroundColor,
            textColor,

            // Variantes procesadas para CSS variables
            focusRingHsl: hexToHslTriple(secondary),
            bgHsl: hexToHslTriple(backgroundColor),
            textHsl: hexToHslTriple(textColor),
            gradStart05: hexToRgba(gradientStart, 0.05),
            gradEnd05: hexToRgba(gradientEnd, 0.05),

            // Helpers expuestos por conveniencia
            hexToRgba,
        };
    }, [config]);

    return colors;
}
