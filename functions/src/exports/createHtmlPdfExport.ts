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
import type { ArtifactDoc, HtmlDirectOptions } from './types';

const ALLOWED_TYPES = new Set(['html', 'artifact_bundle']);

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
    const validatedOptions: HtmlDirectOptions | undefined = options
      ? {
          pageSize: options.pageSize === 'LETTER' ? 'LETTER' : 'A4',
          landscape: options.landscape === true,
          printBackground: options.printBackground !== false,
          ...(options.margins && typeof options.margins === 'object'
            ? {
                margins: {
                  top: Number(options.margins.top) || 36,
                  right: Number(options.margins.right) || 36,
                  bottom: Number(options.margins.bottom) || 36,
                  left: Number(options.margins.left) || 36,
                },
              }
            : {}),
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
