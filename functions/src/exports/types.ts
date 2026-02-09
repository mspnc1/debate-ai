/**
 * Export Pipeline Types
 *
 * Mirrors the web repo's report-spec and notebook types for the
 * server-side export pipeline. Kept in sync manually since the
 * functions repo is a separate codebase.
 */

// ============================================================================
// Artifact Types (mirrors web repo src/types/notebook.ts)
// ============================================================================

export type ArtifactType =
  | 'code'
  | 'image'
  | 'table'
  | 'data'
  | 'html'
  | 'dataset'
  | 'vega_lite_spec'
  | 'map_spec'
  | 'artifact_bundle'
  | 'report_spec'
  | 'document_pdf';

// ============================================================================
// Report Theme
// ============================================================================

export interface ReportTheme {
  pageSize: 'A4' | 'LETTER';
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  fonts: {
    heading: string;
    body: string;
    mono: string;
  };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    background: string;
  };
}

// ============================================================================
// Block Types (discriminated union on `kind`)
// ============================================================================

export interface HeadingBlock {
  kind: 'heading';
  level: 1 | 2 | 3;
  text: string;
}

export interface ParagraphBlock {
  kind: 'paragraph';
  markdown: string;
}

export type RenderIntent =
  | 'vega'
  | 'map'
  | 'image'
  | 'dataset_preview'
  | 'json_document'
  | 'html_snapshot';

export interface ArtifactBlock {
  kind: 'artifact';
  artifactId: string;
  renderIntent: RenderIntent;
  caption?: string;
  options?: {
    maxWidth?: number;
    maxHeight?: number;
    maxRows?: number;
  };
}

export interface TableBlock {
  kind: 'table';
  headers: string[];
  rows: string[][];
  caption?: string;
}

export interface PageBreakBlock {
  kind: 'page_break';
}

export interface SpacerBlock {
  kind: 'spacer';
  height: number; // in pt
}

export type ExplanationSize = 's' | 'm' | 'l';

export const EXPLANATION_CHAR_LIMITS: Record<ExplanationSize, number> = {
  s: 240,
  m: 480,
  l: 900,
};

export interface ArtifactExplanationBlock {
  kind: 'artifact_explanation';
  artifactId: string;
  size: ExplanationSize;
  text: string;
}

export type ReportBlock =
  | HeadingBlock
  | ParagraphBlock
  | ArtifactBlock
  | TableBlock
  | PageBreakBlock
  | SpacerBlock
  | ArtifactExplanationBlock;

// ============================================================================
// Report Page & Spec
// ============================================================================

export interface ReportPage {
  blocks: ReportBlock[];
}

export interface ReportSpecOptions {
  includeProvenanceAttachment?: boolean;
}

export interface ReportSpecV1 {
  version: 1;
  profile: 'ARCHIVE_PORTABLE';
  title: string;
  authors: string[];
  abstract?: string;
  createdAt: number;
  modifiedAt: number;
  sessionId: string;
  theme: ReportTheme;
  pages: ReportPage[];
  options?: ReportSpecOptions;
}

// ============================================================================
// Render Intent ↔ Artifact Type Mapping
// ============================================================================

export const RENDER_INTENT_VALID_TYPES: Record<RenderIntent, readonly ArtifactType[]> = {
  vega: ['vega_lite_spec'],
  map: ['map_spec'],
  image: ['image'],
  dataset_preview: ['dataset', 'data', 'table'],
  json_document: ['data', 'dataset', 'table'],
  html_snapshot: ['html', 'artifact_bundle'],
} as const;

/** Types allowed for export without warnings */
export const POLICY_GATE_ALLOWED_TYPES: readonly ArtifactType[] = [
  'vega_lite_spec',
  'map_spec',
  'dataset',
  'data',
  'table',
  'image',
] as const;

// ============================================================================
// Export Job Document (Firestore shape)
// ============================================================================

export type ExportJobPhase =
  | 'queued'
  | 'processing'
  | 'rendering'
  | 'completed'
  | 'failed';

export interface ExportJobDoc {
  id: string;
  createdAt: string;
  createdBy: string;
  reportSpecArtifactId: string;
  sessionId: string;
  phase: ExportJobPhase;
  progress?: number;
  downloadUrl?: string;
  error?: string;
  updatedAt: string;
  pdfHash?: string;
  provenanceHash?: string;
}

// ============================================================================
// Provenance Manifest
// ============================================================================

export interface ProvenanceInputArtifact {
  id: string;
  type: ArtifactType;
  hash: string;
}

export interface ProvenanceMapDetails {
  boundarySystemId?: string;
  boundaryManifestHash?: string;
  dataMatchRate: number;
  coverageRate: number;
  exportWarningOverridden: boolean;
}

export interface ProvenanceManifest {
  reportSpecId: string;
  reportSpecHash: string;
  inputArtifacts: ProvenanceInputArtifact[];
  rendererVersions: {
    puppeteer: string;
    chromium: string;
    vegaEmbed?: string;
    vegaLite?: string;
    vega?: string;
  };
  mapDetails?: Record<string, ProvenanceMapDetails>;
  warnings: string[];
  exportedAt: string;
}

// ============================================================================
// Cloud Payload Offloading (mirrors web repo CloudPayloadStorageService)
// ============================================================================

export type CloudPayloadRef = {
  version: 1;
  provider: 'firebase_storage';
  path: string;
  bytes: number;
  sha256: string;
  contentType: string;
  offloadedAt: number;
};

export type CloudPayloadRefs = {
  data?: CloudPayloadRef;
  content?: CloudPayloadRef;
  metadata?: CloudPayloadRef;
};

export const PAYLOAD_SENTINEL = '__PAYLOAD_OFFLOADED__';

// ============================================================================
// Artifact Document (Firestore shape, subset of web Artifact)
// ============================================================================

export interface ArtifactDoc {
  id: string;
  cellId: string;
  sessionId: string;
  name: string;
  type: ArtifactType;
  mimeType: string;
  data: string;
  createdAt: number;
  metadata?: Record<string, unknown>;
  profile?: string;
  provenance?: Record<string, unknown>;
  dependencies?: Array<{ artifactId: string; relationship: string }>;
  payloadRefs?: CloudPayloadRefs;
}

// ============================================================================
// Rendered Block (internal pipeline type)
// ============================================================================

export interface RenderedBlock {
  kind: ReportBlock['kind'];
  html: string;
}
