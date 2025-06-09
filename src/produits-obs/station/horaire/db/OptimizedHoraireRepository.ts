import { HoraireLineDTO } from '@/produits-obs/station/horaire/HoraireLineDTO.js';

export interface DateRange {
    start: Date;
    end: Date;
}

export interface HoraireAggregates {
    geo_id_insee: string;
    period_start: Date;
    period_end: Date;
    temp_avg: number | null;
    temp_min: number | null;
    temp_max: number | null;
    humidity_avg: number | null;
    wind_speed_avg: number | null;
    precipitation_sum: number | null;
    measurements_count: number;
}

export interface StationFilter {
    stationIds?: string[];
    departements?: number[];
    coordinates?: {
        latMin: number;
        latMax: number;
        lonMin: number;
        lonMax: number;
    };
}

export interface OptimizedHoraireRepository {
    // Méthodes existantes (pour compatibilité)
    upsert(line: HoraireLineDTO): Promise<void>;
    upsertMany(lines: HoraireLineDTO[]): Promise<void>;
    selectAll(): Promise<HoraireLineDTO[]>;

    // Nouvelles méthodes optimisées TimescaleDB
    
    // Requêtes temporelles optimisées
    getLatestDataByStation(stationId: string, limit?: number): Promise<HoraireLineDTO[]>;
    getDataByPeriod(stationId: string, period: DateRange): Promise<HoraireLineDTO[]>;
    getDataByStations(stationIds: string[], period?: DateRange): Promise<HoraireLineDTO[]>;
    getDataByFilter(filter: StationFilter, period?: DateRange): Promise<HoraireLineDTO[]>;
    
    // Insertions bulk optimisées
    bulkUpsertOptimized(lines: HoraireLineDTO[]): Promise<void>;
    
    // Agrégations TimescaleDB avec time_bucket
    getHourlyAggregates(stationId: string, period: DateRange): Promise<HoraireAggregates[]>;
    getDailyAggregates(stationId: string, period: DateRange): Promise<HoraireAggregates[]>;
    getStationsSummary(stationIds: string[], period: DateRange): Promise<HoraireAggregates[]>;
    
    // Requêtes spécialisées météo
    getTemperatureExtremes(stationId: string, period: DateRange): Promise<{
        max_temp: number | null;
        max_temp_time: Date | null;
        min_temp: number | null;
        min_temp_time: Date | null;
    }>;
    
    getPrecipitationSummary(stationId: string, period: DateRange): Promise<{
        total_precipitation: number | null;
        max_hourly_precipitation: number | null;
        rainy_hours_count: number;
    }>;
    
    // Méthodes de maintenance
    getChunkStats(): Promise<Array<{
        chunk_name: string;
        range_start: Date;
        range_end: Date;
        compressed: boolean;
        size_bytes: number;
    }>>;
    
    getCompressionStats(): Promise<Array<{
        chunk_name: string;
        before_compression_bytes: number;
        after_compression_bytes: number;
        compression_ratio: number;
    }>>;
}