/**
 * Policy Gate Service
 *
 * Validates that all artifacts referenced in a report spec are safe
 * and appropriate for export. Blocks disallowed types and annotates
 * warnings for provenance tracking.
 */
import type {
  ReportSpecV1,
  ArtifactDoc,
  ArtifactBlock,
  ArtifactType,
} from './types';
import { RENDER_INTENT_VALID_TYPES } from './types';

interface PolicyResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate all artifact blocks in a report spec against loaded artifacts.
 */
export function validateExportArtifacts(
  reportSpec: ReportSpecV1,
  artifacts: Map<string, ArtifactDoc>,
): PolicyResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  let blockIndex = 0;
  for (const page of reportSpec.pages) {
    for (const block of page.blocks) {
      if (block.kind !== 'artifact') {
        blockIndex++;
        continue;
      }

      const artifactBlock = block as ArtifactBlock;
      const artifact = artifacts.get(artifactBlock.artifactId);

      if (!artifact) {
        errors.push(
          `Block ${blockIndex}: artifact '${artifactBlock.artifactId}' not found`,
        );
        blockIndex++;
        continue;
      }

      // Validate render intent matches artifact type
      const validTypes = RENDER_INTENT_VALID_TYPES[artifactBlock.renderIntent];
      if (!validTypes.includes(artifact.type as ArtifactType)) {
        errors.push(
          `Block ${blockIndex}: artifact type '${artifact.type}' is not valid for render intent '${artifactBlock.renderIntent}'`,
        );
        blockIndex++;
        continue;
      }

      // Check policy: HTML and bundles require html_snapshot intent
      if (artifact.type === 'html' || artifact.type === 'artifact_bundle') {
        if (artifactBlock.renderIntent === 'html_snapshot') {
          warnings.push(
            `Block ${blockIndex}: html_snapshot: rendered as PNG, JS stripped`,
          );
        } else {
          errors.push(
            `Block ${blockIndex}: artifact type '${artifact.type}' only allowed with renderIntent 'html_snapshot'`,
          );
        }
      }

      blockIndex++;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
