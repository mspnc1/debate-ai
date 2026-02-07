/**
 * Create Export Job — Callable Function
 *
 * Validates ownership, verifies cloud sync status of the report spec
 * and all its dependencies, creates the Firestore export job document,
 * and enqueues the job to Cloud Tasks for async processing.
 *
 * Cloud Gate (3.3.1):
 *   - Report spec artifact must exist in Firestore
 *   - All artifact blocks must reference artifacts that exist in Firestore
 *   - Missing dependencies → EXPORT_INPUTS_NOT_IN_CLOUD error with IDs
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { enqueueExportJob } from './enqueueExportJob';
import type { ReportSpecV1, ArtifactBlock } from './types';

export const createExportJob = onCall(
  { timeoutSeconds: 30 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in');
    }

    const uid = request.auth.uid;
    const { reportSpecArtifactId, sessionId } = request.data;

    // Validate inputs
    if (!reportSpecArtifactId || typeof reportSpecArtifactId !== 'string') {
      throw new HttpsError('invalid-argument', 'Missing reportSpecArtifactId');
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

    // ================================================================
    // 1. Verify report_spec artifact exists in cloud
    // ================================================================
    const specDoc = await artifactsBase.doc(reportSpecArtifactId).get();
    if (!specDoc.exists) {
      throw new HttpsError(
        'permission-denied',
        'Report spec artifact not found under this user/session.',
      );
    }

    // ================================================================
    // 2. Compute dependency closure and verify all artifacts exist
    // ================================================================
    const specData = specDoc.data();
    let missingIds: string[] = [];

    if (specData?.data) {
      try {
        const reportSpec: ReportSpecV1 = JSON.parse(specData.data);

        // Collect all referenced artifact IDs
        const referencedIds = new Set<string>();
        for (const page of reportSpec.pages ?? []) {
          for (const block of page.blocks ?? []) {
            if (block.kind === 'artifact') {
              referencedIds.add((block as ArtifactBlock).artifactId);
            }
          }
        }

        // Batch-check existence (Firestore getAll for efficiency)
        if (referencedIds.size > 0) {
          const refs = Array.from(referencedIds).map(id =>
            artifactsBase.doc(id),
          );
          const docs = await db.getAll(...refs);
          missingIds = docs
            .filter(d => !d.exists)
            .map(d => d.id);
        }
      } catch (err) {
        console.warn('[createExportJob] Failed to parse report spec for dependency check:', err);
        // Proceed anyway — runExportJob will do full validation
      }
    }

    if (missingIds.length > 0) {
      throw new HttpsError(
        'failed-precondition',
        `EXPORT_INPUTS_NOT_IN_CLOUD: ${missingIds.length} artifact(s) not synced: ${missingIds.join(', ')}`,
      );
    }

    // ================================================================
    // 3. Create export job document
    // ================================================================
    const jobId = db.collection('exportJobs').doc().id;
    const now = new Date().toISOString();

    await db.collection('exportJobs').doc(jobId).set({
      id: jobId,
      createdAt: now,
      updatedAt: now,
      createdBy: uid,
      reportSpecArtifactId,
      sessionId,
      phase: 'queued',
      progress: 0,
    });

    // ================================================================
    // 4. Enqueue to Cloud Tasks
    // ================================================================
    const taskName = await enqueueExportJob(jobId);

    return { jobId, taskName };
  },
);
