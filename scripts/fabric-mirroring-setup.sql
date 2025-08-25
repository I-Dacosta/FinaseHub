-- Azure Fabric Mirroring Setup for PostgreSQL
-- This script prepares the PostgreSQL database for Fabric mirroring

-- 1. Create azure_cdc schema (already done, but ensure it exists)
CREATE SCHEMA IF NOT EXISTS azure_cdc;

-- 2. Grant necessary permissions for Fabric mirroring
GRANT USAGE ON SCHEMA azure_cdc TO finansehub_admin;
GRANT CREATE ON SCHEMA azure_cdc TO finansehub_admin;
GRANT ALL PRIVILEGES ON SCHEMA azure_cdc TO finansehub_admin;

-- 3. Create CDC functions in azure_cdc schema
CREATE OR REPLACE FUNCTION azure_cdc.get_tables_for_mirroring()
RETURNS TABLE(
    schema_name text,
    table_name text,
    has_primary_key boolean
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.table_schema::text,
        t.table_name::text,
        EXISTS(
            SELECT 1 
            FROM information_schema.table_constraints tc 
            WHERE tc.table_schema = t.table_schema 
            AND tc.table_name = t.table_name 
            AND tc.constraint_type = 'PRIMARY KEY'
        ) as has_primary_key
    FROM information_schema.tables t
    WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    ORDER BY t.table_name;
END;
$$ LANGUAGE plpgsql;

-- 4. Create metadata table for tracking mirroring status
CREATE TABLE IF NOT EXISTS azure_cdc.mirroring_metadata (
    id SERIAL PRIMARY KEY,
    schema_name VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    is_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(schema_name, table_name)
);

-- 5. Insert metadata for current tables
INSERT INTO azure_cdc.mirroring_metadata (schema_name, table_name, is_enabled)
SELECT 'public', table_name, true
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ON CONFLICT (schema_name, table_name) DO UPDATE SET
    updated_at = CURRENT_TIMESTAMP,
    is_enabled = true;

-- 6. Create replication publication for all tables
DO $$
BEGIN
    -- Drop existing publication if it exists
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'fabric_mirroring_pub') THEN
        DROP PUBLICATION fabric_mirroring_pub;
    END IF;
    
    -- Create new publication for all tables
    CREATE PUBLICATION fabric_mirroring_pub FOR ALL TABLES;
END $$;

-- 7. Grant replication permissions
ALTER USER finansehub_admin WITH REPLICATION;

-- 8. Create CDC tracking tables for our main tables
CREATE TABLE IF NOT EXISTS azure_cdc.cdc_rate_changes (
    change_id SERIAL PRIMARY KEY,
    operation_type CHAR(1), -- 'I', 'U', 'D'
    table_name VARCHAR(50),
    record_id BIGINT,
    change_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    change_data JSONB
);

CREATE TABLE IF NOT EXISTS azure_cdc.cdc_seriespoint_changes (
    change_id SERIAL PRIMARY KEY,
    operation_type CHAR(1), -- 'I', 'U', 'D'
    table_name VARCHAR(50),
    record_id BIGINT,
    change_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    change_data JSONB
);

-- 9. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_cdc_rate_changes_timestamp ON azure_cdc.cdc_rate_changes(change_timestamp);
CREATE INDEX IF NOT EXISTS idx_cdc_seriespoint_changes_timestamp ON azure_cdc.cdc_seriespoint_changes(change_timestamp);

-- 10. Create view for Fabric to query available tables
CREATE OR REPLACE VIEW azure_cdc.fabric_mirroring_tables AS
SELECT 
    schema_name,
    table_name,
    is_enabled,
    'Ready for mirroring' as status
FROM azure_cdc.mirroring_metadata
WHERE is_enabled = true;

-- 11. Grant select permissions on our Norwegian views for Fabric
GRANT SELECT ON valutakurser_norsk TO PUBLIC;
GRANT SELECT ON renter_norsk TO PUBLIC;
GRANT SELECT ON siste_kurser_norsk TO PUBLIC;
GRANT SELECT ON siste_renter_norsk TO PUBLIC;
GRANT SELECT ON data_sammendrag_norsk TO PUBLIC;

-- 12. Create a status check function for Fabric
CREATE OR REPLACE FUNCTION azure_cdc.fabric_mirroring_status()
RETURNS TABLE(
    setting_name text,
    current_value text,
    status text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'wal_level'::text,
        current_setting('wal_level')::text,
        CASE WHEN current_setting('wal_level') = 'logical' THEN 'OK' ELSE 'ERROR' END::text
    UNION ALL
    SELECT 
        'max_replication_slots'::text,
        current_setting('max_replication_slots')::text,
        CASE WHEN current_setting('max_replication_slots')::int >= 5 THEN 'OK' ELSE 'WARNING' END::text
    UNION ALL
    SELECT 
        'max_wal_senders'::text,
        current_setting('max_wal_senders')::text,
        CASE WHEN current_setting('max_wal_senders')::int >= 5 THEN 'OK' ELSE 'WARNING' END::text
    UNION ALL
    SELECT 
        'azure_cdc_schema'::text,
        'EXISTS'::text,
        'OK'::text;
END;
$$ LANGUAGE plpgsql;

-- 13. Test the setup
SELECT 'Fabric mirroring setup completed successfully!' as status;
SELECT * FROM azure_cdc.fabric_mirroring_status();
SELECT * FROM azure_cdc.fabric_mirroring_tables;
