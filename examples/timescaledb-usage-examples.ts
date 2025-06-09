import { PrismaClient } from '@prisma/client';
import { OptimizedPrismaHoraireRepository } from '@/produits-obs/station/horaire/db/adapters/OptimizedPrismaHoraireRepository.js';
import { getStationWeatherSummary } from '@/produits-obs/station/horaire/use-cases/optimized/getStationWeatherSummary.js';
import { importWithRetry } from '@/produits-obs/station/horaire/use-cases/optimized/bulkImportOptimized.js';
import { LoggerSingleton } from '@/lib/logger/LoggerSingleton.js';

// Exemples d'utilisation des optimisations TimescaleDB

async function exempleRequetesOptimisees() {
    const prisma = new PrismaClient();
    const repository = new OptimizedPrismaHoraireRepository(prisma);

    // 1. REQUÊTES TEMPORELLES OPTIMISÉES
    
    // Dernières mesures d'une station (utilise l'index geo_id_insee + validity_time DESC)
    console.log('=== Dernières mesures ===');
    const latestData = await repository.getLatestDataByStation('76116001', 5);
    console.log(`${latestData.length} dernières mesures pour la station 76116001`);
    
    // Données d'une période spécifique
    console.log('=== Données période ===');
    const periodData = await repository.getDataByPeriod('76116001', {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
    });
    console.log(`${periodData.length} mesures en janvier 2024`);
    
    // Données de plusieurs stations (optimisé avec IN clause)
    console.log('=== Données multiples stations ===');
    const multiStationData = await repository.getDataByStations(
        ['76116001', '75114001', '69123001'],
        {
            start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Dernières 24h
            end: new Date(),
        }
    );
    console.log(`${multiStationData.length} mesures pour 3 stations sur 24h`);

    // 2. AGRÉGATIONS TIMESCALEDB NATIVES
    
    // Agrégations quotidiennes avec time_bucket
    console.log('=== Agrégations quotidiennes ===');
    const dailyAggregates = await repository.getDailyAggregates('76116001', {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
    });
    console.log(`${dailyAggregates.length} jours d'agrégations`);
    dailyAggregates.slice(0, 3).forEach(day => {
        console.log(`${day.period_start.toISOString().split('T')[0]}: Temp moy ${day.temp_avg?.toFixed(1)}°C, Min ${day.temp_min?.toFixed(1)}°C, Max ${day.temp_max?.toFixed(1)}°C`);
    });
    
    // Extrêmes de température
    console.log('=== Extrêmes température ===');
    const extremes = await repository.getTemperatureExtremes('76116001', {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
    });
    console.log(`Max: ${extremes.max_temp?.toFixed(1)}°C le ${extremes.max_temp_time?.toISOString()}`);
    console.log(`Min: ${extremes.min_temp?.toFixed(1)}°C le ${extremes.min_temp_time?.toISOString()}`);
    
    // Résumé précipitations
    console.log('=== Résumé précipitations ===');
    const precipSummary = await repository.getPrecipitationSummary('76116001', {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
    });
    console.log(`Total: ${precipSummary.total_precipitation?.toFixed(1)}mm, Max horaire: ${precipSummary.max_hourly_precipitation?.toFixed(1)}mm, Heures pluvieuses: ${precipSummary.rainy_hours_count}`);

    // 3. RÉSUMÉ COMPLET OPTIMISÉ
    
    console.log('=== Résumé météo complet ===');
    const summary = await getStationWeatherSummary(repository, '76116001', {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
    });
    
    console.log(`Station: ${summary.stationId}`);
    console.log(`Dernière mesure: ${summary.latestMeasurement?.timestamp} - ${summary.latestMeasurement?.temperature?.toFixed(1)}°C`);
    console.log(`${summary.dailyAggregates.length} jours de données`);
    console.log(`Température: ${summary.temperatureExtremes.minTemp?.toFixed(1)}°C à ${summary.temperatureExtremes.maxTemp?.toFixed(1)}°C`);
    console.log(`Précipitations totales: ${summary.precipitationSummary.totalPrecipitation?.toFixed(1)}mm`);

    await prisma.$disconnect();
}

async function exempleImportBulkOptimise() {
    const prisma = new PrismaClient();
    const repository = new OptimizedPrismaHoraireRepository(prisma);
    const logger = LoggerSingleton.getSingleton();

    // Simulation de données à importer
    const fakeData = Array.from({ length: 10000 }, (_, i) => ({
        geo_id_insee: '76116001',
        lat: 49.4944,
        lon: 0.1079,
        reference_time: new Date(),
        insert_time: new Date(),
        validity_time: new Date(Date.now() - i * 60 * 60 * 1000), // Une mesure par heure en remontant
        t: 273.15 + Math.random() * 20, // Température en Kelvin (0-20°C)
        td: null,
        tx: null,
        tn: null,
        u: Math.floor(Math.random() * 100), // Humidité 0-100%
        ux: null,
        un: null,
        dd: Math.floor(Math.random() * 360), // Direction vent 0-360°
        ff: Math.random() * 20, // Vitesse vent 0-20 m/s
        dxy: null,
        fxy: null,
        dxi: null,
        fxi: null,
        rr1: Math.random() > 0.8 ? Math.random() * 5 : null, // Précipitations occasionnelles
        t_10: null,
        t_20: null,
        t_50: null,
        t_100: null,
        vv: null,
        etat_sol: null,
        sss: null,
        n: null,
        insolh: null,
        ray_glo01: null,
        pres: null,
        pmer: null,
    }));

    console.log('=== Import bulk optimisé ===');
    
    // Import avec retry automatique
    const result = await importWithRetry(repository, fakeData, logger, 3, {
        batchSize: 500,
        continueOnError: true,
        logProgress: true,
    });
    
    console.log(`Import terminé: ${result.totalInserted}/${result.totalProcessed} enregistrements`);
    console.log(`Temps d'exécution: ${result.executionTimeMs}ms`);
    console.log(`Débit: ${Math.round(result.totalInserted / (result.executionTimeMs / 1000))} rec/s`);
    console.log(`Erreurs: ${result.errors.length}/${result.batchCount} lots`);

    await prisma.$disconnect();
}

async function exempleMonitoringTimescaledb() {
    const prisma = new PrismaClient();
    const repository = new OptimizedPrismaHoraireRepository(prisma);

    console.log('=== Statistiques TimescaleDB ===');
    
    // Stats des chunks
    const chunkStats = await repository.getChunkStats();
    console.log(`${chunkStats.length} chunks`);
    chunkStats.slice(0, 5).forEach(chunk => {
        const sizeMB = (chunk.size_bytes / 1024 / 1024).toFixed(1);
        console.log(`${chunk.chunk_name}: ${chunk.range_start.toISOString().split('T')[0]} - ${sizeMB}MB (${chunk.compressed ? 'compressé' : 'non-compressé'})`);
    });
    
    // Stats de compression
    const compressionStats = await repository.getCompressionStats();
    if (compressionStats.length > 0) {
        const totalBefore = compressionStats.reduce((sum, stat) => sum + stat.before_compression_bytes, 0);
        const totalAfter = compressionStats.reduce((sum, stat) => sum + stat.after_compression_bytes, 0);
        const globalRatio = totalBefore > 0 ? (totalAfter / totalBefore * 100).toFixed(1) : '0';
        
        console.log(`Compression globale: ${globalRatio}% (économie: ${((totalBefore - totalAfter) / 1024 / 1024).toFixed(1)}MB)`);
    }

    await prisma.$disconnect();
}

// Fonction pour tester les performances
async function testPerformances() {
    const prisma = new PrismaClient();
    const repository = new OptimizedPrismaHoraireRepository(prisma);

    console.log('=== Test de performances ===');
    
    const tests = [
        {
            name: 'Dernières 24 mesures',
            fn: () => repository.getLatestDataByStation('76116001', 24),
        },
        {
            name: 'Données dernières 24h',
            fn: () => repository.getDataByPeriod('76116001', {
                start: new Date(Date.now() - 24 * 60 * 60 * 1000),
                end: new Date(),
            }),
        },
        {
            name: 'Agrégations quotidiennes (30 jours)',
            fn: () => repository.getDailyAggregates('76116001', {
                start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                end: new Date(),
            }),
        },
        {
            name: 'Extrêmes température (30 jours)',
            fn: () => repository.getTemperatureExtremes('76116001', {
                start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                end: new Date(),
            }),
        },
    ];

    for (const test of tests) {
        const start = Date.now();
        const result = await test.fn();
        const duration = Date.now() - start;
        
        console.log(`${test.name}: ${duration}ms (${Array.isArray(result) ? `${result.length} résultats` : 'OK'})`);
    }

    await prisma.$disconnect();
}

// Export des fonctions d'exemple
export {
    exempleRequetesOptimisees,
    exempleImportBulkOptimise,
    exempleMonitoringTimescaledb,
    testPerformances,
};