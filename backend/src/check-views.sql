-- Check what views exist in the database
SELECT 
    schemaname,
    viewname,
    definition
FROM pg_views 
WHERE schemaname = 'public' 
ORDER BY viewname;
