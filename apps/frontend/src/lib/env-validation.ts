import { z } from 'zod';

const envSchema = z.object({
    // Public variables (Client & Server)
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    NEXT_PUBLIC_API_URL: z.string().url().optional().default('http://localhost:3000/api'),

    // Server-only variables
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional(), // Optional in client, required in server contexts
    JWT_SECRET: z.string().optional(),

    // Feature flags
    MOCK_AUTH: z.string().optional(),
    NEXT_PUBLIC_ENABLE_SYNC_LOG_PERSISTENCE: z.string().optional(),
});

export function validateEnv() {
    // Skip validation in build phase to avoid build errors when secrets aren't available
    if (process.env.npm_lifecycle_event === 'build') {
        return;
    }

    const parsed = envSchema.safeParse(process.env);

    if (!parsed.success) {
        console.error(
            '❌ Invalid environment variables:',
            JSON.stringify(parsed.error.flatten().fieldErrors, null, 2)
        );
        // In production, we might want to throw. In dev, just warn.
        if (process.env.NODE_ENV === 'production') {
            throw new Error('Invalid environment variables');
        }
    }

    return parsed.data;
}
