'use client';

import { useEffect, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { useUserSettings } from '@/app/dashboard/settings/hooks/useOptimizedSettings';

const PRIMARY_HSL_MAP: Record<string, string> = {
    blue: '221.2 83.2% 53.3%',
    indigo: '238 83% 60%',
    violet: '258 90% 66%',
    purple: '271 81% 56%',
    fuchsia: '292 84% 61%',
    pink: '330 81% 60%',
    rose: '347 77% 50%',
    red: '0 84.2% 60.2%',
    orange: '25 95% 53%',
    amber: '38 92% 50%',
    yellow: '48 96% 53%',
    lime: '84 81% 44%',
    green: '142 71% 45%',
    emerald: '160 84% 39%',
    teal: '173 80% 40%',
    cyan: '189 94% 43%',
    sky: '199 89% 48%',
    slate: '215 16% 47%',
};

export function UserAppearanceManager() {
    const { data: settings } = useUserSettings();
    const { setTheme, theme } = useTheme();

    const applySettings = useCallback(() => {
        if (!settings) return;

        const root = document.documentElement;

        // 1. Theme Synchronization
        if (settings.theme && settings.theme !== theme) {
            setTheme(settings.theme);
        }

        // 2. Primary Color
        if (settings.primary_color) {
            const hsl = PRIMARY_HSL_MAP[settings.primary_color] || PRIMARY_HSL_MAP.blue;
            root.style.setProperty('--primary', hsl);
            root.style.setProperty('--ring', hsl);
        }

        // 3. Border Radius
        if (settings.border_radius) {
            root.style.setProperty('--radius', `${settings.border_radius}rem`);
        }

        // 4. Effects Toggles
        root.setAttribute('data-glassmorphism', settings.enable_glassmorphism ? 'true' : 'false');
        root.setAttribute('data-gradients', settings.enable_gradients ? 'true' : 'false');
        root.setAttribute('data-shadows', settings.enable_shadows ? 'true' : 'false');

        // Smooth transitions / animations toggle
        if (settings.enable_animations === false) {
            root.classList.add('no-transitions');
        } else {
            root.classList.remove('no-transitions');
        }

    }, [settings, theme, setTheme]);

    useEffect(() => {
        applySettings();
    }, [applySettings]);

    return null;
}
