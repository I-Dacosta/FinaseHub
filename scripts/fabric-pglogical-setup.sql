-- Complete Microsoft Fabric Mirroring Setup with pglogical
-- This script creates the complete setup required for Fabric mirroring

-- 1. Create publication for all tables (required by Fabric)
DO $$
BEGIN
    -- Drop existing publication if it exists
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'fabric_mirror_pub') THEN
        DROP PUBLICATION fabric_mirror_pub;
    END IF;
    
    -- Create new publication for all tables
    CREATE PUBLICATION fabric_mirror_pub FOR ALL TABLES;
END $$;

-- 2. Create specific publication for our main tables
DO $$
BEGIN
    -- Drop existing publication if it exists
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'fabric_tables_pub') THEN
        DROP PUBLICATION fabric_tables_pub;
    END IF;
    
    -- Create publication for specific tables
    CREATE PUBLICATION fabric_tables_pub FOR TABLE "Rate", "SeriesPoint", "SyncLog";
END $$;

-- 3. Grant necessary permissions for replication
ALTER USER finansehub_admin WITH REPLICATION;

-- 4. Create additional required functions for Fabric CDC compatibility
CREATE OR REPLACE FUNCTION azure_cdc.get_publication_tables()
RETURNS TABLE(
    schemaname text,
    tablename text,
    pubname text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.nspname::text as schemaname,
        c.relname::text as tablename,
        p.pubname::text as pubname
    FROM pg_publication p
    JOIN pg_publication_rel pr ON p.oid = pr.prpubid
    JOIN pg_class c ON pr.prrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
    ORDER BY n.nspname, c.relname;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create function to check logical replication status
CREATE OR REPLACE FUNCTION azure_cdc.check_logical_replication()
RETURNS TABLE(
    setting_name text,
    current_value text,
    status text,
    description text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'wal_level'::text,
        current_setting('wal_level')::text,
        CASE WHEN current_setting('wal_level') = 'logical' THEN 'OK' ELSE 'ERROR' END::text,
        'Required for logical replication'::text
    UNION ALL
    SELECT 
        'max_wal_senders'::text,
        current_setting('max_wal_senders')::text,
        CASE WHEN current_setting('max_wal_senders')::int >= 1 THEN 'OK' ELSE 'ERROR' END::text,
        'Number of WAL sender processes'::text
    UNION ALL
    SELECT 
        'max_replication_slots'::text,
        current_setting('max_replication_slots')::text,
        CASE WHEN current_setting('max_replication_slots')::int >= 1 THEN 'OK' ELSE 'ERROR' END::text,
        'Number of replication slots available'::text
    UNION ALL
    SELECT 
        'pglogical_extension'::text,
        CASE WHEN EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pglogical') THEN 'INSTALLED' ELSE 'NOT_INSTALLED' END::text,
        CASE WHEN EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pglogical') THEN 'OK' ELSE 'ERROR' END::text,
        'pglogical extension for logical replication'::text
    UNION ALL
    SELECT 
        'publications_count'::text,
        (SELECT COUNT(*)::text FROM pg_publication)::text,
        'INFO'::text,
        'Number of publications configured'::text
    UNION ALL
    SELECT 
        'fabric_mirror_pub'::text,
        CASE WHEN EXISTS(SELECT 1 FROM pg_publication WHERE pubname = 'fabric_mirror_pub') THEN 'EXISTS' ELSE 'MISSING' END::text,
        CASE WHEN EXISTS(SELECT 1 FROM pg_publication WHERE pubname = 'fabric_mirror_pub') THEN 'OK' ELSE 'WARNING' END::text,
        'Main publication for Fabric mirroring'::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Update the azure_cdc.check_prerequisites function
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
        true
    UNION ALL
    SELECT 
        'pglogical_extension'::text,
        CASE WHEN EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pglogical') THEN 'OK' ELSE 'ERROR' END::text,
        CASE WHEN EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pglogical') THEN 'installed' ELSE 'missing' END::text,
        'installed'::text,
        EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pglogical')
    UNION ALL
    SELECT 
        'fabric_publication'::text,
        CASE WHEN EXISTS(SELECT 1 FROM pg_publication WHERE pubname = 'fabric_mirror_pub') THEN 'OK' ELSE 'ERROR' END::text,
        CASE WHEN EXISTS(SELECT 1 FROM pg_publication WHERE pubname = 'fabric_mirror_pub') THEN 'exists' ELSE 'missing' END::text,
        'exists'::text,
        EXISTS(SELECT 1 FROM pg_publication WHERE pubname = 'fabric_mirror_pub');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Grant all necessary permissions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA azure_cdc TO finansehub_admin;
GRANT SELECT ON ALL TABLES IN SCHEMA azure_cdc TO finansehub_admin;

-- Test the complete setup
SELECT 'Fabric mirroring setup with pglogical completed!' as status;
SELECT * FROM azure_cdc.check_prerequisites() WHERE is_ok = false;
