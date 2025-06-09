# Téléchargement des données de climatologie du portail des APIs Météo-France

Projet de collecte automatisée des données météorologiques françaises via les APIs publiques de Météo-France, optimisé pour TimescaleDB.

## 🎯 Fonctionnalités

- **Collecte automatisée** : Données horaires, infrahoraires (6min), quotidiennes, mensuelles
- **Base TimescaleDB optimisée** : Hypertables, compression automatique, requêtes temporelles
- **APIs Météo-France** : Intégration complète avec authentification automatique
- **Monitoring** : Logs détaillés, statistiques de performance, surveillance des chunks
- **Architecture clean** : DDD, repositories, use cases, adapters

## 🛠 Outils

- **Package manager** : pnpm (et non npm)
- **Base de données** : PostgreSQL + TimescaleDB
- **ORM** : Prisma
- **Formatting** : Prettier
- **Linter** : ESLint
- **Tests** : Vitest
- **Git Hooks** : Husky && lint-staged

## 🚀 Installation et configuration

### Prérequis

- Node.js 18+
- pnpm
- Instance TimescaleDB (PostgreSQL + extension TimescaleDB)
- Clé API Météo-France (gratuite)

### Étape 1 : Installation des dépendances

```bash
# Installer pnpm si pas déjà fait
npm install -g pnpm

# Cloner le projet
git clone <url-du-repo>
cd telechargement-climatologie-portail-api-meteofrance

# Installer les dépendances
pnpm install

# Installer Husky pour les git hooks
pnpm run prepare
```

### Étape 2 : Configuration de l'environnement

```bash
# Copier le template d'environnement
cp .env.template .env

# Éditer le fichier .env
nano .env
```

**Contenu du `.env` :**
```bash
# Connexion à votre TimescaleDB
DATABASE_URL="postgresql://user:password@host:5432/database?schema=public"

# Clé API Météo-France (voir section suivante)
METEOFRANCE_APPLICATION_ID="votre_application_id"
```

### Étape 3 : Obtenir une clé API Météo-France

1. **S'inscrire** sur [portail-api.meteofrance.fr](https://portail-api.meteofrance.fr)
2. **Souscrire** aux APIs publiques (gratuites) :
   - Données publiques Climatologie
   - Données publiques d'observation
3. **Récupérer** l'Application ID depuis votre tableau de bord
4. **Ajouter** l'ID dans votre fichier `.env`

### Étape 4 : Configuration de la base de données

```bash
# Générer le client Prisma
npx prisma generate

# Appliquer le schéma de base
npx prisma migrate deploy

# Appliquer les optimisations TimescaleDB
psql -h votre_host -U votre_user -d votre_db -f prisma/migrations/20250609202846_timescaledb_hypertables_optimization/migration.sql

# Valider l'installation TimescaleDB
psql -h votre_host -U votre_user -d votre_db -f scripts/validate-timescaledb-migration.sql
```

## 📊 Première utilisation

### 1. Test de configuration

```bash
# Vérifier la configuration
pnpm run check
```

### 2. Initialiser les données de référence

```bash
# Télécharger les listes de stations (obligatoire en premier)
pnpm run download-listes-stations

# Enrichir avec les métadonnées détaillées
pnpm run download-all-informations-stations
```

### 3. Collecter les données météo

**Données horaires (recommandé pour commencer) :**
```bash
# Dernières données horaires de toutes les stations
pnpm run download-all-last-horaires-data

# Ou données des dernières 24h par département
pnpm run download-all-previous-24-horaires-data
```

**Données infrahoraires (6 minutes) :**
```bash
# Dernières données infrahoraires
pnpm run download-all-last-infrahoraires-data

# Données des dernières 24h toutes stations
pnpm run download-all-previous-24-infrahoraires-data
```

## 🔄 Scripts disponibles

### Collecte de données
```bash
# Listes de stations
pnpm run download-listes-stations
pnpm run download-listes-stations:preprod

# Informations stations
pnpm run download-all-informations-stations
pnpm run download-missing-informations-stations
pnpm run download-all-informations-stations:preprod
pnpm run download-missing-informations-stations:preprod

# Données horaires
pnpm run download-all-last-horaires-data
pnpm run download-all-previous-24-horaires-data
pnpm run download-all-last-horaires-data:preprod
pnpm run download-all-previous-24-horaires-data:preprod

# Données infrahoraires
pnpm run download-all-last-infrahoraires-data
pnpm run download-all-previous-24-infrahoraires-data
pnpm run download-all-last-infrahoraires-data:preprod
pnpm run download-all-previous-24-infrahoraires-data:preprod
```

### Développement
```bash
# Vérification de code
pnpm run check               # TypeScript type checking
pnpm run lint                # ESLint checking
pnpm run lint:fix            # Auto-fix ESLint issues
pnpm run format              # Format code with Prettier

# Tests
pnpm run test:unit           # Tests unitaires uniquement
pnpm run test:integration    # Tests d'intégration (nécessite DB)
pnpm run test:all           # Tous les tests
pnpm run coverage           # Couverture de tests

# Base de données
pnpm run migrate:dev         # Migrations développement
pnpm run deploy:dev          # Déploiement migrations (dev)
pnpm run deploy:preprod      # Déploiement migrations (preprod)
pnpm run start-docker        # Démarrer container PostgreSQL local
```

## 🏗 Architecture du projet

### Structure des dossiers
```
src/
├── apps/                    # Applications CLI pour collecte
├── commandes/               # Gestion des commandes de téléchargement
├── stations/                # Gestion des stations météo
├── produits-obs/            # Données d'observation
├── paquet-obs/              # Packages de données
├── lib/                     # Utilitaires (logger, dates, etc.)
└── api/                     # Clients API Météo-France

docs/                        # Documentation
examples/                    # Exemples d'utilisation
scripts/                     # Scripts de maintenance
```

### Patterns architecturaux
- **Clean Architecture** : Séparation domaine/infrastructure
- **Repository Pattern** : Abstraction de la persistance
- **Adapter Pattern** : Multiple implémentations (Prisma, in-memory, Météo-France)
- **Use Cases** : Logique métier encapsulée

### Optimisations TimescaleDB

Le projet inclut des optimisations spécifiques pour TimescaleDB :

- **Hypertables** : Partitioning automatique par temps
- **Index composites** : (station, temps) pour requêtes optimales
- **Compression** : Automatique selon l'ancienneté des données
- **Requêtes time_bucket** : Agrégations temporelles natives
- **Insertions bulk** : 10x plus rapides que les insertions séquentielles

## 🔧 Utilisation avancée

### API optimisée TimescaleDB

```typescript
import { OptimizedPrismaHoraireRepository } from './src/produits-obs/station/horaire/db/adapters/OptimizedPrismaHoraireRepository.js';
import { getStationWeatherSummary } from './src/produits-obs/station/horaire/use-cases/optimized/getStationWeatherSummary.js';

const repository = new OptimizedPrismaHoraireRepository(prisma);

// Dernières mesures d'une station
const latest = await repository.getLatestDataByStation('76116001', 24);

// Données d'une période
const data = await repository.getDataByPeriod('76116001', {
    start: new Date('2024-01-01'),
    end: new Date('2024-01-31')
});

// Agrégations quotidiennes (utilise time_bucket)
const daily = await repository.getDailyAggregates('76116001', period);

// Résumé météo complet
const summary = await getStationWeatherSummary(repository, '76116001', period);
```

### Import bulk optimisé

```typescript
import { bulkImportOptimized } from './src/produits-obs/station/horaire/use-cases/optimized/bulkImportOptimized.js';

// Import haute performance
const result = await bulkImportOptimized(repository, data, logger, {
    batchSize: 1000,
    continueOnError: true,
    logProgress: true
});
```

## 📈 Monitoring et maintenance

### Surveillance TimescaleDB

```sql
-- Vérifier les hypertables
SELECT * FROM timescaledb_information.hypertables;

-- Statistiques de compression
SELECT * FROM timescaledb_information.chunk_compression_stats;

-- État des chunks
SELECT 
    chunk_name,
    range_start,
    range_end,
    is_compressed,
    pg_size_pretty(total_bytes) as size
FROM timescaledb_information.chunks 
WHERE hypertable_name = 'HoraireTempsReel'
ORDER BY range_start DESC;
```

### Automatisation avec cron

```bash
# Éditer le crontab
crontab -e

# Exemples de tâches automatisées :
# Toutes les heures : données récentes
0 * * * * cd /path/to/project && pnpm run download-all-last-horaires-data

# Tous les 6 minutes : données infrahoraires
*/6 * * * * cd /path/to/project && pnpm run download-all-last-infrahoraires-data

# Quotidien : métadonnées stations
0 2 * * * cd /path/to/project && pnpm run download-missing-informations-stations
```

## 🧪 Tests

### Exécution des tests

```bash
# Tests unitaires (rapides, pas de DB)
pnpm run test:unit

# Tests d'intégration (avec DB et APIs)
pnpm run test:integration

# Tous les tests
pnpm run test:all

# Avec couverture
pnpm run coverage
```

### Tests spécifiques

```bash
# Test d'un fichier spécifique
npx vitest run path/to/test.spec.ts

# Tests par pattern
npx vitest --project unit pattern
npx vitest --project integration pattern
```

## 📚 Documentation

- [Guide de migration TimescaleDB](docs/migration-guide-timescaledb-optimizations.md)
- [Optimisations TimescaleDB](docs/timescaledb-postgrest-optimizations.md)
- [Exemples d'utilisation](examples/timescaledb-usage-examples.ts)
- [Guide Claude Code](CLAUDE.md)

## ⚠️ Troubleshooting

### Erreurs fréquentes

**"Environment variable not found: DATABASE_URL"**
```bash
# Vérifier le fichier .env
cat .env
export DATABASE_URL="postgresql://..."
```

**"TimescaleDB extension not found"**
```sql
CREATE EXTENSION IF NOT EXISTS timescaledb;
```

**"API key invalid"**
```bash
# Tester la clé API
curl -H "apikey: VOTRE_CLE" https://public-api.meteofrance.fr/public/DPClim/v1/liste-stations/quotidienne
```

### Diagnostic

```bash
# Versions
pnpm --version && node --version

# État de la base
npx prisma migrate status
npx prisma db pull

# Tests de connexion
pnpm run check
```

## 🔄 Workflow de développement

1. **Installer Husky** : `pnpm run prepare`
2. **Démarrer TimescaleDB** (ou utiliser instance distante)
3. **Appliquer migrations** : `pnpm run deploy:dev`
4. **Développer** avec auto-formatting et tests automatiques
5. **À chaque commit** : formatage, lint et tests automatiques

À chaque modification du schéma (`prisma/schema.prisma`) : `pnpm run migrate:dev`

## 📄 Licence

Voir le fichier [LICENSE](LICENSE)

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature
3. Respecter les conventions (ESLint, Prettier)
4. Ajouter des tests
5. Créer une Pull Request

Les git hooks s'assureront que le code respecte les standards avant commit.