import { OptimizedHoraireRepository } from '@/produits-obs/station/horaire/db/OptimizedHoraireRepository.js';
import { HoraireLineDTO } from '@/produits-obs/station/horaire/HoraireLineDTO.js';
import { Logger } from '@/lib/logger/Logger.js';

export interface BulkImportResult {
    totalProcessed: number;
    totalInserted: number;
    batchCount: number;
    executionTimeMs: number;
    errors: Array<{
        batchIndex: number;
        error: string;
        recordCount: number;
    }>;
}

export interface BulkImportOptions {
    batchSize?: number;
    continueOnError?: boolean;
    logProgress?: boolean;
}

export async function bulkImportOptimized(
    repository: OptimizedHoraireRepository,
    data: HoraireLineDTO[],
    logger: Logger,
    options: BulkImportOptions = {}
): Promise<BulkImportResult> {
    const {
        batchSize = 1000,
        continueOnError = true,
        logProgress = true,
    } = options;

    const startTime = Date.now();
    const result: BulkImportResult = {
        totalProcessed: 0,
        totalInserted: 0,
        batchCount: 0,
        executionTimeMs: 0,
        errors: [],
    };

    // Diviser les données en lots pour optimiser les performances et la mémoire
    const batches: HoraireLineDTO[][] = [];
    for (let i = 0; i < data.length; i += batchSize) {
        batches.push(data.slice(i, i + batchSize));
    }

    if (logProgress) {
        logger.info({ message: `Démarrage import bulk: ${data.length} enregistrements, ${batches.length} lots de ${batchSize}` });
    }

    // Traitement séquentiel des lots pour éviter la surcharge de la DB
    for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        if (!batch) continue; // Protection TypeScript
        result.batchCount++;
        
        try {
            // Validation rapide des données avant insertion
            const validBatch = batch.filter(item => 
                item.geo_id_insee && 
                item.validity_time && 
                item.lat != null && 
                item.lon != null
            );

            if (validBatch.length === 0) {
                if (logProgress) {
                    logger.warn({ message: `Lot ${i + 1}/${batches.length}: aucun enregistrement valide` });
                }
                continue;
            }

            if (validBatch.length !== batch.length) {
                logger.warn({ message: `Lot ${i + 1}/${batches.length}: ${batch.length - validBatch.length} enregistrements invalides ignorés` });
            }

            // Insertion bulk optimisée
            await repository.bulkUpsertOptimized(validBatch);
            
            result.totalProcessed += batch.length;
            result.totalInserted += validBatch.length;

            if (logProgress && (i + 1) % 10 === 0) {
                const progressPercent = Math.round(((i + 1) / batches.length) * 100);
                const elapsed = Date.now() - startTime;
                const estimatedTotal = (elapsed / (i + 1)) * batches.length;
                const remaining = Math.round((estimatedTotal - elapsed) / 1000);
                
                logger.info({ message: `Progression: ${progressPercent}% (${i + 1}/${batches.length} lots), ETA: ${remaining}s` });
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            
            result.errors.push({
                batchIndex: i,
                error: errorMessage,
                recordCount: batch.length,
            });

            logger.error({ message: `Erreur lot ${i + 1}/${batches.length}: ${errorMessage}` });

            if (!continueOnError) {
                logger.error({ message: 'Arrêt de l\'import à cause de l\'erreur' });
                break;
            }
        }
    }

    result.executionTimeMs = Date.now() - startTime;

    if (logProgress) {
        const throughput = Math.round(result.totalInserted / (result.executionTimeMs / 1000));
        logger.info({ message: `Import terminé: ${result.totalInserted}/${result.totalProcessed} enregistrements en ${result.executionTimeMs}ms (${throughput} rec/s)` });
        
        if (result.errors.length > 0) {
            logger.warn({ message: `${result.errors.length} erreurs rencontrées pendant l'import` });
        }
    }

    return result;
}

export async function importWithRetry(
    repository: OptimizedHoraireRepository,
    data: HoraireLineDTO[],
    logger: Logger,
    maxRetries = 3,
    options?: BulkImportOptions
): Promise<BulkImportResult> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            logger.info({ message: `Tentative d'import ${attempt}/${maxRetries}` });
            
            const result = await bulkImportOptimized(repository, data, logger, options);
            
            // Considérer comme réussi si moins de 5% d'erreurs
            const errorRate = result.errors.length / result.batchCount;
            if (errorRate < 0.05) {
                return result;
            }
            
            if (attempt < maxRetries) {
                logger.warn({ message: `Taux d'erreur élevé (${Math.round(errorRate * 100)}%), nouvelle tentative dans 5s...` });
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
            
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            logger.error({ message: `Tentative ${attempt} échouée: ${lastError.message}` });
            
            if (attempt < maxRetries) {
                const delayMs = Math.min(1000 * Math.pow(2, attempt), 30000); // Backoff exponentiel
                logger.info({ message: `Nouvelle tentative dans ${delayMs/1000}s...` });
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
    }
    
    throw lastError || new Error('Import échoué après toutes les tentatives');
}