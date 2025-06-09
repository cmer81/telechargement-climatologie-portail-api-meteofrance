import { LoggerSingleton } from '@/lib/logger/LoggerSingleton.js';
import { ZodError } from 'zod';

/**
 * Log a concise validation warning for Zod errors
 */
export function logValidationWarning(error: ZodError): void {
    const issues = error.issues || [];
    const summary = issues
        .map(issue => {
            const path = Array.isArray(issue.path) ? issue.path.join('.') : String(issue.path);
            // Simplifier le message pour les erreurs courantes
            const simpleMessage = issue.message
                .replace(
                    /Invalid positive float: '(.+)'\. Must be greater than or equal to 0\./,
                    'negative value "$1" corrected to null'
                )
                .replace(
                    /Invalid positive integer: '(.+)'\. Must be greater than or equal to 0\./,
                    'negative value "$1" corrected to null'
                )
                .replace(/Expected .+, received .+/, 'invalid type corrected');

            return `${path}: ${simpleMessage}`;
        })
        .join(', ');

    LoggerSingleton.getSingleton().warn({
        message: `Data validation: ${summary}`,
    });
}
