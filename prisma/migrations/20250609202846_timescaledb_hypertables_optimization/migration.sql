-- Migration pour optimisations TimescaleDB - Priorité 1
-- Création des hypertables, index composites et compression automatique

-- Vérifier que l'extension TimescaleDB est disponible
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- 1. CONVERSION EN HYPERTABLES
-- Données horaires temps réel (1 chunk par jour)
SELECT create_hypertable(
    '"HoraireTempsReel"',
    'validity_time',
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- Données infrahoraires temps réel (1 chunk par heure pour volume plus élevé)
SELECT create_hypertable(
    '"InfrahoraireTempsReel"',
    'validity_time', 
    chunk_time_interval => INTERVAL '1 hour',
    if_not_exists => TRUE
);

-- Les autres tables ne sont pas converties en hypertables car elles n'ont pas de colonnes timestamp appropriées
-- ou ont des patterns de données différents qui ne bénéficient pas de TimescaleDB

-- 2. INDEX COMPOSITES OPTIMISÉS POUR POSTGREST
-- Index pour requêtes station + temps (temps DESC pour dernières données)
CREATE INDEX IF NOT EXISTS idx_horaire_temps_reel_station_time 
ON "HoraireTempsReel" (geo_id_insee, validity_time DESC);

CREATE INDEX IF NOT EXISTS idx_infrahoraire_temps_reel_station_time 
ON "InfrahoraireTempsReel" (geo_id_insee, validity_time DESC);

-- Index pour requêtes sur tables classiques
CREATE INDEX IF NOT EXISTS idx_quotidienne_station_time 
ON "Quotidienne" ("NUM_POSTE", "AAAAMMJJ" DESC);

CREATE INDEX IF NOT EXISTS idx_quotidienne_autres_station_time 
ON "QuotidienneAutresParametres" ("NUM_POSTE", "AAAAMMJJ" DESC);

CREATE INDEX IF NOT EXISTS idx_horaire_station_time 
ON "Horaire" ("NUM_POSTE", "AAAAMMJJHH" DESC);

CREATE INDEX IF NOT EXISTS idx_infrahoraire_station_time 
ON "Infrahoraire" ("NUM_POSTE", "AAAAMMJJHHMN" DESC);

CREATE INDEX IF NOT EXISTS idx_mensuelle_station_time 
ON "Mensuelle" ("NUM_POSTE", "AAAAMM" DESC);

CREATE INDEX IF NOT EXISTS idx_decadaire_station_time 
ON "Decadaire" ("NUM_POSTE", "AAAAMM" DESC, "NUM_DECADE");

CREATE INDEX IF NOT EXISTS idx_decadaire_agro_station_time 
ON "DecadaireAgro" ("NUM_POSTE", "AAAAMM" DESC, "NUM_DECADE");

-- Index pour requêtes par département (pour PostgREST)
CREATE INDEX IF NOT EXISTS idx_stations_dept_freq 
ON "Station" (departement, frequence);

-- Index pour les plages de temps (requêtes PostgREST avec ?validity_time=gte.X&validity_time=lt.Y)
CREATE INDEX IF NOT EXISTS idx_horaire_temps_reel_time_range 
ON "HoraireTempsReel" (validity_time);

CREATE INDEX IF NOT EXISTS idx_infrahoraire_temps_reel_time_range 
ON "InfrahoraireTempsReel" (validity_time);

-- Index pour filtrage par coordonnées géographiques (PostgREST)
CREATE INDEX IF NOT EXISTS idx_horaire_temps_reel_coords 
ON "HoraireTempsReel" (lat, lon);

CREATE INDEX IF NOT EXISTS idx_infrahoraire_temps_reel_coords 
ON "InfrahoraireTempsReel" (lat, lon);

-- 3. ENABLE COLUMNSTORE AND COMPRESSION FOR HYPERTABLES ONLY
-- Enable columnstore before adding compression policies
DO $$
BEGIN
    -- Enable columnstore for HoraireTempsReel if not already enabled
    IF NOT EXISTS (
        SELECT 1 FROM timescaledb_information.hypertables 
        WHERE hypertable_name = 'HoraireTempsReel' 
        AND compression_enabled = TRUE
    ) THEN
        ALTER TABLE "HoraireTempsReel" SET (
            timescaledb.compress,
            timescaledb.compress_segmentby = 'geo_id_insee'
        );
    END IF;
    
    -- Enable columnstore for InfrahoraireTempsReel if not already enabled
    IF NOT EXISTS (
        SELECT 1 FROM timescaledb_information.hypertables 
        WHERE hypertable_name = 'InfrahoraireTempsReel' 
        AND compression_enabled = TRUE
    ) THEN
        ALTER TABLE "InfrahoraireTempsReel" SET (
            timescaledb.compress,
            timescaledb.compress_segmentby = 'geo_id_insee'
        );
    END IF;
END $$;

-- 4. COMPRESSION AUTOMATIQUE (uniquement pour les hypertables)
-- Compresser les données horaires temps réel après 7 jours
SELECT add_compression_policy(
    '"HoraireTempsReel"', 
    INTERVAL '7 days',
    if_not_exists => TRUE
);

-- Compresser les données infrahoraires temps réel après 1 jour
SELECT add_compression_policy(
    '"InfrahoraireTempsReel"', 
    INTERVAL '1 day',
    if_not_exists => TRUE
);

-- 5. POLITIQUE DE RÉTENTION (OPTIONNEL)
-- Supprimer automatiquement les données temps réel très anciennes
-- Décommenter si nécessaire :

-- SELECT add_retention_policy(
--     '"HoraireTempsReel"',
--     INTERVAL '2 years',
--     if_not_exists => TRUE
-- );

-- SELECT add_retention_policy(
--     '"InfrahoraireTempsReel"',
--     INTERVAL '1 year',
--     if_not_exists => TRUE
-- );

-- 6. STATISTIQUES POUR L'OPTIMISEUR
-- Mettre à jour les statistiques pour l'optimiseur de requêtes
ANALYZE "HoraireTempsReel";
ANALYZE "InfrahoraireTempsReel";
ANALYZE "Quotidienne";
ANALYZE "QuotidienneAutresParametres";
ANALYZE "Horaire";
ANALYZE "Infrahoraire";
ANALYZE "Mensuelle";
ANALYZE "Decadaire";
ANALYZE "DecadaireAgro";
ANALYZE "Station";