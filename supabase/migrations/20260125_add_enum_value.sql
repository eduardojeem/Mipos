-- Add SUPER_ADMIN to the enum type
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';

COMMIT; -- Commit the type change before using it (sometimes needed in pg)

-- Update the user role
UPDATE public.users
SET role = 'SUPER_ADMIN'
WHERE email = 'jeem101595@gmail.com';
