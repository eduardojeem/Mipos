-- Cash Dashboard Database Audit Script
-- Run this in Supabase SQL Editor to verify table structure

-- ============================================
-- 1. Verify cash_sessions table structure
-- ============================================
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'cash_sessions'
ORDER BY ordinal_position;

-- ============================================
-- 2. Verify cash_movements table structure
-- ============================================
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'cash_movements'
ORDER BY ordinal_position;

-- ============================================
-- 3. Check indexes on cash_sessions
-- ============================================
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'cash_sessions';

-- ============================================
-- 4. Check indexes on cash_movements
-- ============================================
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'cash_movements';

-- ============================================
-- 5. Check RLS policies on cash_sessions
-- ============================================
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'cash_sessions';

-- ============================================
-- 6. Check RLS policies on cash_movements
-- ============================================
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'cash_movements';

-- ============================================
-- 7. Check foreign key constraints
-- ============================================
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name IN ('cash_sessions', 'cash_movements');

-- ============================================
-- 8. Test data retrieval (current open session)
-- ============================================
SELECT 
    id,
    user_id,
    opening_balance,
    current_balance,
    session_status,
    opening_time,
    closing_time
FROM cash_sessions
WHERE session_status = 'open'
ORDER BY opening_time DESC
LIMIT 1;

-- ============================================
-- 9. Test movements retrieval
-- ============================================
SELECT 
    id,
    session_id,
    type,
    amount,
    reason,
    reference_type,
    reference_id,
    created_at
FROM cash_movements
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- 10. Check grants/permissions
-- ============================================
SELECT 
    grantee,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_name IN ('cash_sessions', 'cash_movements')
ORDER BY table_name, grantee;
