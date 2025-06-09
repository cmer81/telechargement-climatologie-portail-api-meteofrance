import { post } from '@/api/api-call.js';
import { Env } from '@/env.js';
import { z } from 'zod';

export async function fetchToken(): Promise<string> {
    // Le token dans .env semble être déjà un JWT d'accès valide
    // Retournons-le directement au lieu de tenter d'en obtenir un nouveau
    const applicationId = Env.getSingleton().getMeteoFranceApplicationId();
    
    // Si c'est un JWT (commence par "eyJ"), on l'utilise directement
    if (applicationId.startsWith('eyJ')) {
        console.log('Using JWT token directly from .env');
        return applicationId;
    }
    
    // Sinon, on tente l'ancienne méthode avec client_credentials
    const response = await post({
        url: 'https://portail-api.meteofrance.fr/token',
        headers: {
            Authorization: `Basic ${applicationId}`,
        },
        body: { grant_type: 'client_credentials' },
    });
    
    // Debug: afficher ce qu'on reçoit vraiment
    console.log('Response code:', response.code);
    console.log('Response data type:', typeof response.data);
    console.log('Response data:', response.data);
    
    const tokenResponseSchema = z.object({
        access_token: z.string(),
    });
    const parsed = tokenResponseSchema.parse(response.data);
    return parsed.access_token;
}
