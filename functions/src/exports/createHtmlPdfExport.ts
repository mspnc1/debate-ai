/**
 * Create HTML PDF Export — Callable Function
 *
 * Validates auth, verifies the HTML/bundle artifact exists in Firestore,
 * creates an export job doc with mode='html_direct', and enqueues
 * the job to Cloud Tasks for async processing.
 *
 * Unlike createExportJob, there's no dependency closure to verify —
 * the single artifact is self-contained.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { enqueueExportJob } from './enqueueExportJob';
import type { ArtifactBrandingOptions, ArtifactDoc, HtmlDirectOptions } from './types';

const ALLOWED_TYPES = new Set(['html', 'artifact_bundle']);
const BRANDING_VISIBILITIES = new Set(['visible', 'metadata', 'off']);

function sanitizeBrandingOptions(value: unknown): ArtifactBrandingOptions | undefined {
  if (!value || typeof value !== 'object') return undefined;

  const raw = value as Record<string, unknown>;
  const branding: ArtifactBrandingOptions = {};

  if (raw.visibility !== undefined) {
    if (typeof raw.visibility !== 'string' || !BRANDING_VISIBILITIES.has(raw.visibility)) {
      throw new HttpsError(
        'invalid-argument',
        'Invalid branding.visibility. Expected visible, metadata, or off.',
      );
    }
    branding.visibility = raw.visibility as ArtifactBrandingOptions['visibility'];
  }

  if (raw.includeLogo !== undefined) {
    if (typeof raw.includeLogo !== 'boolean') {
      throw new HttpsError('invalid-argument', 'Invalid branding.includeLogo.');
    }
    branding.includeLogo = raw.includeLogo;
  }

  if (raw.includeUrl !== undefined) {
    if (typeof raw.includeUrl !== 'boolean') {
      throw new HttpsError('invalid-argument', 'Invalid branding.includeUrl.');
    }
    branding.includeUrl = raw.includeUrl;
  }

  return Object.keys(branding).length > 0 ? branding : undefined;
}

export const createHtmlPdfExport = onCall(
  { timeoutSeconds: 30 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in');
    }

    const uid = request.auth.uid;
    const { artifactId, sessionId, options } = request.data;

    // Validate inputs
    if (!artifactId || typeof artifactId !== 'string') {
      throw new HttpsError('invalid-argument', 'Missing artifactId');
    }
    if (!sessionId || typeof sessionId !== 'string') {
      throw new HttpsError('invalid-argument', 'Missing sessionId');
    }

    const db = getFirestore();
    const artifactsBase = db
      .collection('users')
      .doc(uid)
      .collection('conversations')
      .doc(sessionId)
      .collection('artifacts');

    // Verify artifact exists and is an allowed type
    const artDoc = await artifactsBase.doc(artifactId).get();
    if (!artDoc.exists) {
      throw new HttpsError(
        'not-found',
        'Artifact not found under this user/session.',
      );
    }

    const artData = artDoc.data() as ArtifactDoc;
    if (!ALLOWED_TYPES.has(artData.type)) {
      throw new HttpsError(
        'invalid-argument',
        `Artifact type '${artData.type}' is not supported for direct PDF export. Expected 'html' or 'artifact_bundle'.`,
      );
    }

    // Validate options if provided
    const rawOptions = options && typeof options === 'object'
      ? options as Record<string, unknown>
      : undefined;
    const branding = rawOptions ? sanitizeBrandingOptions(rawOptions.branding) : undefined;
    const validatedOptions: HtmlDirectOptions | undefined = rawOptions
      ? {
          pageSize: rawOptions.pageSize === 'LETTER' ? 'LETTER' : 'A4',
          landscape: rawOptions.landscape === true,
          printBackground: rawOptions.printBackground !== false,
          ...(rawOptions.margins && typeof rawOptions.margins === 'object'
            ? {
                margins: {
                  top: Number((rawOptions.margins as Record<string, unknown>).top) || 36,
                  right: Number((rawOptions.margins as Record<string, unknown>).right) || 36,
                  bottom: Number((rawOptions.margins as Record<string, unknown>).bottom) || 36,
                  left: Number((rawOptions.margins as Record<string, unknown>).left) || 36,
                },
              }
            : {}),
          ...(branding ? { branding } : {}),
        }
      : undefined;

    // Create export job document
    const jobId = db.collection('exportJobs').doc().id;
    const now = new Date().toISOString();

    await db.collection('exportJobs').doc(jobId).set({
      id: jobId,
      createdAt: now,
      updatedAt: now,
      createdBy: uid,
      sessionId,
      mode: 'html_direct',
      artifactId,
      reportSpecArtifactId: '', // Not used in html_direct mode
      phase: 'queued',
      progress: 0,
      ...(validatedOptions ? { options: validatedOptions } : {}),
    });

    // Enqueue to Cloud Tasks (reuses same queue + runner)
    const taskName = await enqueueExportJob(jobId);

    return { jobId, taskName };
  },
);
