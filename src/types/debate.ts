/**
 * Type definitions for debate topic validation.
 *
 * The old three-step setup wizard's hook/service scaffolding types lived
 * here; they were removed with that architecture. Live debate types belong
 * to the services that own them (e.g. DebateOrchestrator's DebateSession).
 */

export interface TopicValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions?: string[];
}
