import { OptimizedHoraireRepository, DateRange } from '@/produits-obs/station/horaire/db/OptimizedHoraireRepository.js';

export interface WeatherSummary {
    stationId: string;
    period: DateRange;
    
    // Données récentes
    latestMeasurement: {
        timestamp: Date;
        temperature: number | null;
        humidity: number | null;
        windSpeed: number | null;
        precipitation: number | null;
    } | null;
    
    // Statistiques période
    dailyAggregates: Array<{
        date: Date;
        tempAvg: number | null;
        tempMin: number | null;
        tempMax: number | null;
        precipitationSum: number | null;
        measurementsCount: number;
    }>;
    
    // Extrêmes période
    temperatureExtremes: {
        maxTemp: number | null;
        maxTempTime: Date | null;
        minTemp: number | null;
        minTempTime: Date | null;
    };
    
    // Précipitations période
    precipitationSummary: {
        totalPrecipitation: number | null;
        maxHourlyPrecipitation: number | null;
        rainyHoursCount: number;
    };
}

export async function getStationWeatherSummary(
    repository: OptimizedHoraireRepository,
    stationId: string,
    period: DateRange
): Promise<WeatherSummary> {
    // Exécution parallèle des requêtes pour optimiser les performances
    const [
        latestData,
        dailyAggregates,
        temperatureExtremes,
        precipitationSummary,
    ] = await Promise.all([
        repository.getLatestDataByStation(stationId, 1),
        repository.getDailyAggregates(stationId, period),
        repository.getTemperatureExtremes(stationId, period),
        repository.getPrecipitationSummary(stationId, period),
    ]);

    const latestMeasurement = latestData[0] ? {
        timestamp: latestData[0].validity_time,
        temperature: latestData[0].t,
        humidity: latestData[0].u,
        windSpeed: latestData[0].ff,
        precipitation: latestData[0].rr1,
    } : null;

    return {
        stationId,
        period,
        latestMeasurement,
        dailyAggregates: dailyAggregates.map(agg => ({
            date: agg.period_start,
            tempAvg: agg.temp_avg,
            tempMin: agg.temp_min,
            tempMax: agg.temp_max,
            precipitationSum: agg.precipitation_sum,
            measurementsCount: agg.measurements_count,
        })),
        temperatureExtremes: {
            maxTemp: temperatureExtremes.max_temp,
            maxTempTime: temperatureExtremes.max_temp_time,
            minTemp: temperatureExtremes.min_temp,
            minTempTime: temperatureExtremes.min_temp_time,
        },
        precipitationSummary: {
            totalPrecipitation: precipitationSummary.total_precipitation,
            maxHourlyPrecipitation: precipitationSummary.max_hourly_precipitation,
            rainyHoursCount: precipitationSummary.rainy_hours_count,
        },
    };
}