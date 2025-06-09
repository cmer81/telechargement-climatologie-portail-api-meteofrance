-- Script de validation pour les optimisations TimescaleDB
-- À exécuter après la migration pour vérifier que tout fonctionne

-- 1. VÉRIFIER QUE LES HYPERTABLES SONT CRÉÉES
SELECT 
    hypertable_schema,
    hypertable_name,
    num_dimensions,
    time_column_name,
    time_column_type,
    chunk_time_interval
FROM timescaledb_information.hypertables
ORDER BY hypertable_name;

-- 2. VÉRIFIER LES POLITIQUES DE COMPRESSION
SELECT 
    hypertable_schema,
    hypertable_name,
    compression_enabled,
    compress_after
FROM timescaledb_information.compression_settings
ORDER BY hypertable_name;

-- 3. VÉRIFIER LES INDEX CRÉÉS
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN (
    'HoraireTempsReel',
    'InfrahoraireTempsReel', 
    'Quotidienne',
    'QuotidienneAutresParametres',
    'Horaire',
    'Infrahoraire',
    'Mensuelle',
    'Decadaire',
    'DecadaireAgro',
    'Station'
)
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- 4. VÉRIFIER LES CHUNKS CRÉÉS
SELECT 
    chunk_schema,
    chunk_name,
    hypertable_schema,
    hypertable_name,
    primary_dimension,
    primary_dimension_type,
    range_start,
    range_end
FROM timescaledb_information.chunks
ORDER BY hypertable_name, range_start;

-- 5. TESTER LES PERFORMANCES D'UNE REQUÊTE TYPIQUE
EXPLAIN (ANALYZE, BUFFERS) 
SELECT geo_id_insee, validity_time, t, u 
FROM HoraireTempsReel 
WHERE geo_id_insee = '76116001' 
  AND validity_time >= NOW() - INTERVAL '24 hours'
ORDER BY validity_time DESC
LIMIT 24;

-- 6. VÉRIFIER LA TAILLE DES TABLES (AVANT/APRÈS COMPRESSION)
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as indexes_size
FROM pg_tables 
WHERE tablename IN (
    'HoraireTempsReel',
    'InfrahoraireTempsReel',
    'Quotidienne',
    'QuotidienneAutresParametres',
    'Horaire',
    'Infrahoraire'
)
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 7. VÉRIFIER LES STATISTIQUES DE COMPRESSION
SELECT 
    chunk_schema,
    chunk_name,
    compression_status,
    before_compression_total_bytes,
    after_compression_total_bytes,
    CASE 
        WHEN before_compression_total_bytes > 0 THEN
            ROUND(100.0 * after_compression_total_bytes / before_compression_total_bytes, 2)
        ELSE NULL 
    END as compression_ratio_percent
FROM timescaledb_information.chunk_compression_stats
ORDER BY chunk_name;