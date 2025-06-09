# Optimisations TimescaleDB + PostgREST

## Requêtes PostgREST optimisées après migration

### 1. Requêtes temporelles par station

**Données horaires récentes pour une station :**
```http
GET /HoraireTempsReel?geo_id_insee=eq.76116001&validity_time=gte.2024-01-01T00:00:00Z&order=validity_time.desc&limit=24
```

**Données des dernières 24h pour plusieurs stations :**
```http
GET /HoraireTempsReel?geo_id_insee=in.(76116001,75114001)&validity_time=gte.2024-01-01T00:00:00Z&order=geo_id_insee,validity_time.desc
```

### 2. Requêtes par département (utilise l'index stations)

**Stations d'un département :**
```http
GET /Station?departement=eq.76&frequence=eq.horaire
```

**Données horaires pour toutes les stations d'un département :**
```http
GET /HoraireTempsReel?geo_id_insee=in.(SELECT id FROM Station WHERE departement=76)&validity_time=gte.2024-01-01T00:00:00Z
```

### 3. Requêtes géographiques

**Stations dans une zone géographique :**
```http
GET /HoraireTempsReel?lat=gte.49.0&lat=lte.49.5&lon=gte.0.0&lon=lte.1.0&validity_time=gte.2024-01-01T00:00:00Z
```

### 4. Agrégations avec vues (à créer)

**Moyennes journalières :**
```http
GET /daily_weather_summary?geo_id_insee=eq.76116001&day=gte.2024-01-01
```

## Performance attendue

### Avant optimisation TimescaleDB
- Requête 24h d'une station : **~500ms**
- Requête département complet : **~5-10s**
- Insertion bulk 1000 records : **~2-3s**

### Après optimisation TimescaleDB
- Requête 24h d'une station : **~5-50ms** (10-100x plus rapide)
- Requête département complet : **~200-500ms** (10-20x plus rapide)
- Insertion bulk 1000 records : **~100-300ms** (5-10x plus rapide)

## Recommandations PostgREST

### 1. Utiliser les index composites
Toujours filtrer d'abord par station, puis par temps :
```http
✅ ?geo_id_insee=eq.X&validity_time=gte.Y
❌ ?validity_time=gte.Y&geo_id_insee=eq.X
```

### 2. Limiter les résultats
Toujours utiliser `limit` pour éviter les timeouts :
```http
✅ ?geo_id_insee=eq.X&order=validity_time.desc&limit=100
❌ ?geo_id_insee=eq.X&order=validity_time.desc
```

### 3. Utiliser l'ordre optimal
L'ordre `validity_time.desc` utilise l'index optimisé :
```http
✅ ?order=validity_time.desc
✅ ?order=geo_id_insee,validity_time.desc
❌ ?order=validity_time.asc (moins optimisé)
```

### 4. Filtres de plage temporelle
Utiliser `gte` et `lt` pour les plages :
```http
✅ ?validity_time=gte.2024-01-01T00:00:00Z&validity_time=lt.2024-01-02T00:00:00Z
❌ ?validity_time=eq.2024-01-01 (moins précis)
```

## Configuration PostgREST recommandée

```conf
# postgrest.conf
db-pool = 20
db-pool-timeout = 10
max-rows = 1000
db-pre-request = "SET search_path TO public"
db-tx-end = "commit"
```

## Monitoring des performances

### 1. Statistiques de chunks
```sql
SELECT * FROM timescaledb_information.chunks 
WHERE hypertable_name = 'HoraireTempsReel';
```

### 2. Statistiques de compression
```sql
SELECT * FROM timescaledb_information.chunk_compression_stats;
```

### 3. Requêtes lentes
```sql
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
WHERE query LIKE '%HoraireTempsReel%' 
ORDER BY mean_exec_time DESC;
```