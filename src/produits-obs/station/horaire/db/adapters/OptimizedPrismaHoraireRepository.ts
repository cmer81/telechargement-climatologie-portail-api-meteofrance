import { OptimizedHoraireRepository, DateRange, HoraireAggregates, StationFilter } from '@/produits-obs/station/horaire/db/OptimizedHoraireRepository.js';
import { HoraireLineDTO } from '@/produits-obs/station/horaire/HoraireLineDTO.js';
import type { PrismaClient } from '@prisma/client';

export class OptimizedPrismaHoraireRepository implements OptimizedHoraireRepository {
    private prisma: PrismaClient;

    constructor(prisma: PrismaClient) {
        this.prisma = prisma;
    }

    // Méthodes existantes (compatibilité)
    async upsert(line: HoraireLineDTO): Promise<void> {
        await this.prisma.horaireTempsReel.upsert({
            where: {
                geo_id_insee_validity_time: {
                    geo_id_insee: line.geo_id_insee,
                    validity_time: line.validity_time,
                },
            },
            create: line,
            update: line,
        });
    }

    async upsertMany(lines: HoraireLineDTO[]): Promise<void> {
        // Utilise la nouvelle méthode optimisée par défaut
        await this.bulkUpsertOptimized(lines);
    }

    selectAll(): Promise<HoraireLineDTO[]> {
        return this.prisma.horaireTempsReel.findMany({
            orderBy: [{ geo_id_insee: 'asc' }, { validity_time: 'desc' }],
        });
    }

    // Nouvelles méthodes optimisées TimescaleDB

    async getLatestDataByStation(stationId: string, limit = 24): Promise<HoraireLineDTO[]> {
        return this.prisma.horaireTempsReel.findMany({
            where: {
                geo_id_insee: stationId,
            },
            orderBy: {
                validity_time: 'desc',
            },
            take: limit,
        });
    }

    async getDataByPeriod(stationId: string, period: DateRange): Promise<HoraireLineDTO[]> {
        return this.prisma.horaireTempsReel.findMany({
            where: {
                geo_id_insee: stationId,
                validity_time: {
                    gte: period.start,
                    lte: period.end,
                },
            },
            orderBy: {
                validity_time: 'desc',
            },
        });
    }

    async getDataByStations(stationIds: string[], period?: DateRange): Promise<HoraireLineDTO[]> {
        const whereClause: Record<string, unknown> = {
            geo_id_insee: {
                in: stationIds,
            },
        };

        if (period) {
            whereClause.validity_time = {
                gte: period.start,
                lte: period.end,
            };
        }

        return this.prisma.horaireTempsReel.findMany({
            where: whereClause,
            orderBy: [
                { geo_id_insee: 'asc' },
                { validity_time: 'desc' },
            ],
        });
    }

    async getDataByFilter(filter: StationFilter, period?: DateRange): Promise<HoraireLineDTO[]> {
        const whereClause: Record<string, unknown> = {};

        if (filter.stationIds) {
            whereClause.geo_id_insee = { in: filter.stationIds };
        }

        if (filter.coordinates) {
            whereClause.lat = {
                gte: filter.coordinates.latMin,
                lte: filter.coordinates.latMax,
            };
            whereClause.lon = {
                gte: filter.coordinates.lonMin,
                lte: filter.coordinates.lonMax,
            };
        }

        if (period) {
            whereClause.validity_time = {
                gte: period.start,
                lte: period.end,
            };
        }

        return this.prisma.horaireTempsReel.findMany({
            where: whereClause,
            orderBy: [
                { geo_id_insee: 'asc' },
                { validity_time: 'desc' },
            ],
        });
    }

    async bulkUpsertOptimized(lines: HoraireLineDTO[]): Promise<void> {
        if (lines.length === 0) return;

        // Utilise executeRaw pour une insertion bulk native PostgreSQL optimisée
        const values = lines.map(line => {
            const fields = [
                `'${line.geo_id_insee}'`,
                line.lat,
                line.lon,
                `'${line.reference_time.toISOString()}'`,
                `'${line.insert_time.toISOString()}'`,
                `'${line.validity_time.toISOString()}'`,
                line.t ?? 'NULL',
                line.td ?? 'NULL',
                line.tx ?? 'NULL',
                line.tn ?? 'NULL',
                line.u ?? 'NULL',
                line.ux ?? 'NULL',
                line.un ?? 'NULL',
                line.dd ?? 'NULL',
                line.ff ?? 'NULL',
                line.dxy ?? 'NULL',
                line.fxy ?? 'NULL',
                line.dxi ?? 'NULL',
                line.fxi ?? 'NULL',
                line.rr1 ?? 'NULL',
                line.t_10 ?? 'NULL',
                line.t_20 ?? 'NULL',
                line.t_50 ?? 'NULL',
                line.t_100 ?? 'NULL',
                line.vv ?? 'NULL',
                line.etat_sol ?? 'NULL',
                line.sss ?? 'NULL',
                line.n ?? 'NULL',
                line.insolh ?? 'NULL',
                line.ray_glo01 ?? 'NULL',
                line.pres ?? 'NULL',
                line.pmer ?? 'NULL',
            ].join(',');
            return `(${fields})`;
        }).join(',');

        const sql = `
            INSERT INTO "HoraireTempsReel" (
                "geo_id_insee", "lat", "lon", "reference_time", "insert_time", "validity_time",
                "t", "td", "tx", "tn", "u", "ux", "un", "dd", "ff", "dxy", "fxy", "dxi", "fxi",
                "rr1", "t_10", "t_20", "t_50", "t_100", "vv", "etat_sol", "sss", "n", 
                "insolh", "ray_glo01", "pres", "pmer"
            )
            VALUES ${values}
            ON CONFLICT ("geo_id_insee", "validity_time") 
            DO UPDATE SET
                "lat" = EXCLUDED."lat",
                "lon" = EXCLUDED."lon",
                "reference_time" = EXCLUDED."reference_time",
                "insert_time" = EXCLUDED."insert_time",
                "t" = EXCLUDED."t",
                "td" = EXCLUDED."td",
                "tx" = EXCLUDED."tx",
                "tn" = EXCLUDED."tn",
                "u" = EXCLUDED."u",
                "ux" = EXCLUDED."ux",
                "un" = EXCLUDED."un",
                "dd" = EXCLUDED."dd",
                "ff" = EXCLUDED."ff",
                "dxy" = EXCLUDED."dxy",
                "fxy" = EXCLUDED."fxy",
                "dxi" = EXCLUDED."dxi",
                "fxi" = EXCLUDED."fxi",
                "rr1" = EXCLUDED."rr1",
                "t_10" = EXCLUDED."t_10",
                "t_20" = EXCLUDED."t_20",
                "t_50" = EXCLUDED."t_50",
                "t_100" = EXCLUDED."t_100",
                "vv" = EXCLUDED."vv",
                "etat_sol" = EXCLUDED."etat_sol",
                "sss" = EXCLUDED."sss",
                "n" = EXCLUDED."n",
                "insolh" = EXCLUDED."insolh",
                "ray_glo01" = EXCLUDED."ray_glo01",
                "pres" = EXCLUDED."pres",
                "pmer" = EXCLUDED."pmer"
        `;

        await this.prisma.$executeRawUnsafe(sql);
    }

    async getHourlyAggregates(stationId: string, period: DateRange): Promise<HoraireAggregates[]> {
        const result = await this.prisma.$queryRaw<Array<{
            geo_id_insee: string;
            period_start: Date;
            period_end: Date;
            temp_avg: number | null;
            temp_min: number | null;
            temp_max: number | null;
            humidity_avg: number | null;
            wind_speed_avg: number | null;
            precipitation_sum: number | null;
            measurements_count: bigint;
        }>>`
            SELECT 
                geo_id_insee,
                time_bucket('1 hour', validity_time) as period_start,
                time_bucket('1 hour', validity_time) + interval '1 hour' as period_end,
                AVG(t) as temp_avg,
                MIN(tn) as temp_min,
                MAX(tx) as temp_max,
                AVG(u) as humidity_avg,
                AVG(ff) as wind_speed_avg,
                SUM(rr1) as precipitation_sum,
                COUNT(*) as measurements_count
            FROM "HoraireTempsReel"
            WHERE geo_id_insee = ${stationId}
                AND validity_time >= ${period.start}
                AND validity_time <= ${period.end}
            GROUP BY geo_id_insee, time_bucket('1 hour', validity_time)
            ORDER BY period_start DESC
        `;

        return result.map(row => ({
            ...row,
            measurements_count: Number(row.measurements_count),
        }));
    }

    async getDailyAggregates(stationId: string, period: DateRange): Promise<HoraireAggregates[]> {
        const result = await this.prisma.$queryRaw<Array<{
            geo_id_insee: string;
            period_start: Date;
            period_end: Date;
            temp_avg: number | null;
            temp_min: number | null;
            temp_max: number | null;
            humidity_avg: number | null;
            wind_speed_avg: number | null;
            precipitation_sum: number | null;
            measurements_count: bigint;
        }>>`
            SELECT 
                geo_id_insee,
                time_bucket('1 day', validity_time) as period_start,
                time_bucket('1 day', validity_time) + interval '1 day' as period_end,
                AVG(t) as temp_avg,
                MIN(tn) as temp_min,
                MAX(tx) as temp_max,
                AVG(u) as humidity_avg,
                AVG(ff) as wind_speed_avg,
                SUM(rr1) as precipitation_sum,
                COUNT(*) as measurements_count
            FROM "HoraireTempsReel"
            WHERE geo_id_insee = ${stationId}
                AND validity_time >= ${period.start}
                AND validity_time <= ${period.end}
            GROUP BY geo_id_insee, time_bucket('1 day', validity_time)
            ORDER BY period_start DESC
        `;

        return result.map(row => ({
            ...row,
            measurements_count: Number(row.measurements_count),
        }));
    }

    async getStationsSummary(stationIds: string[], period: DateRange): Promise<HoraireAggregates[]> {
        const result = await this.prisma.$queryRaw<Array<{
            geo_id_insee: string;
            period_start: Date;
            period_end: Date;
            temp_avg: number | null;
            temp_min: number | null;
            temp_max: number | null;
            humidity_avg: number | null;
            wind_speed_avg: number | null;
            precipitation_sum: number | null;
            measurements_count: bigint;
        }>>`
            SELECT 
                geo_id_insee,
                ${period.start} as period_start,
                ${period.end} as period_end,
                AVG(t) as temp_avg,
                MIN(tn) as temp_min,
                MAX(tx) as temp_max,
                AVG(u) as humidity_avg,
                AVG(ff) as wind_speed_avg,
                SUM(rr1) as precipitation_sum,
                COUNT(*) as measurements_count
            FROM "HoraireTempsReel"
            WHERE geo_id_insee = ANY(${stationIds})
                AND validity_time >= ${period.start}
                AND validity_time <= ${period.end}
            GROUP BY geo_id_insee
            ORDER BY geo_id_insee
        `;

        return result.map(row => ({
            ...row,
            measurements_count: Number(row.measurements_count),
        }));
    }

    async getTemperatureExtremes(stationId: string, period: DateRange): Promise<{
        max_temp: number | null;
        max_temp_time: Date | null;
        min_temp: number | null;
        min_temp_time: Date | null;
    }> {
        const result = await this.prisma.$queryRaw<Array<{
            max_temp: number | null;
            max_temp_time: Date | null;
            min_temp: number | null;
            min_temp_time: Date | null;
        }>>`
            WITH temp_extremes AS (
                SELECT 
                    t,
                    validity_time,
                    ROW_NUMBER() OVER (ORDER BY t DESC) as max_rank,
                    ROW_NUMBER() OVER (ORDER BY t ASC) as min_rank
                FROM "HoraireTempsReel"
                WHERE geo_id_insee = ${stationId}
                    AND validity_time >= ${period.start}
                    AND validity_time <= ${period.end}
                    AND t IS NOT NULL
            )
            SELECT 
                (SELECT t FROM temp_extremes WHERE max_rank = 1) as max_temp,
                (SELECT validity_time FROM temp_extremes WHERE max_rank = 1) as max_temp_time,
                (SELECT t FROM temp_extremes WHERE min_rank = 1) as min_temp,
                (SELECT validity_time FROM temp_extremes WHERE min_rank = 1) as min_temp_time
        `;

        return result[0] || {
            max_temp: null,
            max_temp_time: null,
            min_temp: null,
            min_temp_time: null,
        };
    }

    async getPrecipitationSummary(stationId: string, period: DateRange): Promise<{
        total_precipitation: number | null;
        max_hourly_precipitation: number | null;
        rainy_hours_count: number;
    }> {
        const result = await this.prisma.$queryRaw<Array<{
            total_precipitation: number | null;
            max_hourly_precipitation: number | null;
            rainy_hours_count: bigint;
        }>>`
            SELECT 
                SUM(rr1) as total_precipitation,
                MAX(rr1) as max_hourly_precipitation,
                COUNT(*) FILTER (WHERE rr1 > 0) as rainy_hours_count
            FROM "HoraireTempsReel"
            WHERE geo_id_insee = ${stationId}
                AND validity_time >= ${period.start}
                AND validity_time <= ${period.end}
                AND rr1 IS NOT NULL
        `;

        const data = result[0];
        return {
            total_precipitation: data?.total_precipitation || null,
            max_hourly_precipitation: data?.max_hourly_precipitation || null,
            rainy_hours_count: Number(data?.rainy_hours_count || 0),
        };
    }

    async getChunkStats(): Promise<Array<{
        chunk_name: string;
        range_start: Date;
        range_end: Date;
        compressed: boolean;
        size_bytes: number;
    }>> {
        const result = await this.prisma.$queryRaw<Array<{
            chunk_name: string;
            range_start: Date;
            range_end: Date;
            compressed: boolean;
            size_bytes: bigint;
        }>>`
            SELECT 
                chunk_name,
                range_start::timestamp as range_start,
                range_end::timestamp as range_end,
                is_compressed as compressed,
                total_bytes as size_bytes
            FROM timescaledb_information.chunks 
            WHERE hypertable_name = 'HoraireTempsReel'
            ORDER BY range_start DESC
        `;

        return result.map(row => ({
            ...row,
            size_bytes: Number(row.size_bytes),
        }));
    }

    async getCompressionStats(): Promise<Array<{
        chunk_name: string;
        before_compression_bytes: number;
        after_compression_bytes: number;
        compression_ratio: number;
    }>> {
        const result = await this.prisma.$queryRaw<Array<{
            chunk_name: string;
            before_compression_bytes: bigint;
            after_compression_bytes: bigint;
            compression_ratio: number;
        }>>`
            SELECT 
                chunk_name,
                before_compression_total_bytes as before_compression_bytes,
                after_compression_total_bytes as after_compression_bytes,
                CASE 
                    WHEN before_compression_total_bytes > 0 THEN
                        ROUND(100.0 * after_compression_total_bytes / before_compression_total_bytes, 2)
                    ELSE 0 
                END as compression_ratio
            FROM timescaledb_information.chunk_compression_stats
            WHERE hypertable_name = 'HoraireTempsReel'
            ORDER BY chunk_name
        `;

        return result.map(row => ({
            ...row,
            before_compression_bytes: Number(row.before_compression_bytes),
            after_compression_bytes: Number(row.after_compression_bytes),
        }));
    }
}