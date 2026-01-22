-- Create exec_sql function for administrative operations
-- This function allows executing arbitrary SQL commands
-- IMPORTANT: Only use with service role key for security

CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    -- Execute the SQL and return result as JSON
    EXECUTE sql;
    
    -- Return success status
    SELECT json_build_object('status', 'success', 'message', 'SQL executed successfully') INTO result;
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        -- Return error information
        SELECT json_build_object(
            'status', 'error',
            'message', SQLERRM,
            'code', SQLSTATE
        ) INTO result;
        
        RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;