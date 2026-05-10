import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * ✅ Utilitaire global pour formater proprement les erreurs HTTP
 * dans le Gateway (ou n'importe quel autre module).
 *
 * Objectif :
 * - Éviter les erreurs "Converting circular structure to JSON"
 * - Ne jamais exposer d'informations sensibles côté client
 * - Uniformiser les réponses d'erreur (même format pour toutes)
 * - Loguer proprement côté serveur
 */
export function formatHttpError(context: string, error: any): never {
  // Détermination du code HTTP (par défaut : 500)
  const status =
    error?.response?.status ||
    error?.status ||
    HttpStatus.INTERNAL_SERVER_ERROR;

  // Détermination du message le plus pertinent
  const message =
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    'Internal Server Error';

  // Logging serveur (avec contexte clair)
  console.error(`❌ [${context}] ${message}`);

  // Retour d'une erreur propre et sérialisable
  throw new HttpException({ statusCode: status, message }, status);
}
