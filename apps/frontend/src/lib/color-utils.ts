/**
 * Convierte un color hexadecimal a un objeto RGB.
 */
export const hexToRgb = (hex: string) => {
    const h = hex.replace('#', '');
    const bigint = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return { r, g, b };
};

/**
 * Convierte un color hexadecimal a una cadena RGBA.
 */
export const hexToRgba = (hex: string, alpha: number) => {
    const { r, g, b } = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/**
 * Convierte un color hexadecimal a una cadena HSL (solo valores, sin 'hsl()').
 * Útil para variables CSS de Tailwind/Shadcn.
 */
export const hexToHslTriple = (hex: string) => {
    const { r, g, b } = hexToRgb(hex);
    const r1 = r / 255, g1 = g / 255, b1 = b / 255;
    const max = Math.max(r1, g1, b1), min = Math.min(r1, g1, b1);
    let h = 0, s = 0; const l = (max + min) / 2;
    const d = max - min;
    if (d !== 0) {
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r1: h = (g1 - b1) / d + (g1 < b1 ? 6 : 0); break;
            case g1: h = (b1 - r1) / d + 2; break;
            case b1: h = (r1 - g1) / d + 4; break;
        }
        h /= 6;
    }
    const hh = Math.round(h * 360);
    const ss = Math.round(s * 100);
    const ll = Math.round(l * 100);
    return `${hh} ${ss}% ${ll}%`;
};
