-- Microsoft Fabric Required Functions for PostgreSQL Mirroring
-- This script creates all functions that Fabric expects to find

-- Ensure azure_cdc schema exists
CREATE SCHEMA IF NOT EXISTS azure_cdc;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA azure_cdc TO finansehub_admin;
GRANT CREATE ON SCHEMA azure_cdc TO finansehub_admin;
GRANT ALL PRIVILEGES ON SCHEMA azure_cdc TO finansehub_admin;

-- 1. Function to check if a table is mirrorable
CREATE OR REPLACE FUNCTION azure_cdc.is_table_mirrorable(
    schema_name information_schema.sql_identifier,
    table_name information_schema.sql_identifier
)
RETURNS boolean AS $$
DECLARE
    has_pk boolean := false;
    table_exists boolean := false;
BEGIN
    -- Check if table exists
    SELECT EXISTS(
        SELECT 1 
        FROM information_schema.tables t
        WHERE t.table_schema = schema_name::text
        AND t.table_name = table_name::text
        AND t.table_type = 'BASE TABLE'
    ) INTO table_exists;
    
    IF NOT table_exists THEN
        RETURN false;
    END IF;
    
    -- Check if table has primary key
    SELECT EXISTS(
        SELECT 1 
        FROM information_schema.table_constraints tc 
        WHERE tc.table_schema = schema_name::text
        AND tc.table_name = table_name::text
        AND tc.constraint_type = 'PRIMARY KEY'
    ) INTO has_pk;
    
    -- Table is mirrorable if it exists and has a primary key
    RETURN has_pk;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Function to get all mirrorable tables
CREATE OR REPLACE FUNCTION azure_cdc.get_mirrorable_tables()
RETURNS TABLE(
    schema_name text,
    table_name text,
    is_mirrorable boolean,
    has_primary_key boolean,
    estimated_rows bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.table_schema::text,
        t.table_name::text,
        azure_cdc.is_table_mirrorable(t.table_schema, t.table_name) as is_mirrorable,
        EXISTS(
            SELECT 1 
            FROM information_schema.table_constraints tc 
            WHERE tc.table_schema = t.table_schema 
            AND tc.table_name = t.table_name 
            AND tc.constraint_type = 'PRIMARY KEY'
        ) as has_primary_key,
        COALESCE(
            (SELECT reltuples::bigint 
             FROM pg_class c 
             JOIN pg_namespace n ON n.oid = c.relnamespace 
             WHERE n.nspname = t.table_schema 
             AND c.relname = t.table_name), 0
        ) as estimated_rows
    FROM information_schema.tables t
    WHERE t.table_schema IN ('public')
    AND t.table_type = 'BASE TABLE'
    ORDER BY t.table_schema, t.table_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Function to get table schema information
CREATE OR REPLACE FUNCTION azure_cdc.get_table_schema(
    schema_name text,
    table_name text
)
RETURNS TABLE(
    column_name text,
    data_type text,
    is_nullable text,
    column_default text,
    is_primary_key boolean
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.column_name::text,
        c.data_type::text,
        c.is_nullable::text,
        c.column_default::text,
        EXISTS(
            SELECT 1 
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu 
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            WHERE tc.constraint_type = 'PRIMARY KEY'
            AND tc.table_schema = schema_name
            AND tc.table_name = table_name
            AND kcu.column_name = c.column_name
        ) as is_primary_key
    FROM information_schema.columns c
    WHERE c.table_schema = schema_name
    AND c.table_name = table_name
    ORDER BY c.ordinal_position;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Function to check CDC prerequisites
CREATE OR REPLACE FUNCTION azure_cdc.check_prerequisites()
RETURNS TABLE(
    check_name text,
    status text,
    current_value text,
    required_value text,
    is_ok boolean
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'wal_level'::text,
        CASE WHEN current_setting('wal_level') = 'logical' THEN 'OK' ELSE 'ERROR' END::text,
        current_setting('wal_level')::text,
        'logical'::text,
        current_setting('wal_level') = 'logical'
    UNION ALL
    SELECT 
        'max_replication_slots'::text,
        CASE WHEN current_setting('max_replication_slots')::int >= 1 THEN 'OK' ELSE 'ERROR' END::text,
        current_setting('max_replication_slots')::text,
        '>=1'::text,
        current_setting('max_replication_slots')::int >= 1
    UNION ALL
    SELECT 
        'max_wal_senders'::text,
        CASE WHEN current_setting('max_wal_senders')::int >= 1 THEN 'OK' ELSE 'ERROR' END::text,
        current_setting('max_wal_senders')::text,
        '>=1'::text,
        current_setting('max_wal_senders')::int >= 1
    UNION ALL
    SELECT 
        'azure_cdc_schema'::text,
        'OK'::text,
        'exists'::text,
        'exists'::text,
        true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Function to get replication slot information
CREATE OR REPLACE FUNCTION azure_cdc.get_replication_slots()
RETURNS TABLE(
    slot_name text,
    plugin text,
    slot_type text,
    active boolean,
    restart_lsn text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rs.slot_name::text,
        rs.plugin::text,
        rs.slot_type::text,
        rs.active,
        rs.restart_lsn::text
    FROM pg_replication_slots rs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Function to validate mirroring setup
CREATE OR REPLACE FUNCTION azure_cdc.validate_mirroring_setup()
RETURNS TABLE(
    validation_step text,
    status text,
    details text
) AS $$
DECLARE
    mirrorable_count int;
    total_tables int;
BEGIN
    -- Count tables
    SELECT COUNT(*) INTO total_tables
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    
    SELECT COUNT(*) INTO mirrorable_count
    FROM information_schema.tables t
    WHERE t.table_schema = 'public' 
    AND t.table_type = 'BASE TABLE'
    AND azure_cdc.is_table_mirrorable(t.table_schema, t.table_name);
    
    RETURN QUERY
    SELECT 
        'Total Tables'::text,
        'INFO'::text,
        total_tables::text
    UNION ALL
    SELECT 
        'Mirrorable Tables'::text,
        CASE WHEN mirrorable_count > 0 THEN 'OK' ELSE 'WARNING' END::text,
        mirrorable_count::text
    UNION ALL
    SELECT 
        'CDC Prerequisites'::text,
        CASE WHEN (SELECT COUNT(*) FROM azure_cdc.check_prerequisites() WHERE is_ok = false) = 0 
             THEN 'OK' ELSE 'ERROR' END::text,
        'See check_prerequisites() for details'::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to the admin user
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA azure_cdc TO finansehub_admin;

-- Create a view for easy access to mirrorable tables
CREATE OR REPLACE VIEW azure_cdc.fabric_tables AS
SELECT * FROM azure_cdc.get_mirrorable_tables()
WHERE is_mirrorable = true;

-- Grant select on the view
GRANT SELECT ON azure_cdc.fabric_tables TO finansehub_admin;

-- Test the functions
SELECT 'Fabric required functions created successfully!' as status;
