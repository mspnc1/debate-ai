import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { enqueueExportJob } from './enqueueExportJob';

export const createExportJob = onCall(
  { timeoutSeconds: 30 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in');
    }

    const { reportSpecArtifactId } = request.data;
    if (!reportSpecArtifactId || typeof reportSpecArtifactId !== 'string') {
      throw new HttpsError('invalid-argument', 'Missing reportSpecArtifactId');
    }

    const db = getFirestore();
    const jobId = db.collection('exportJobs').doc().id;

    await db.collection('exportJobs').doc(jobId).set({
      id: jobId,
      createdAt: new Date().toISOString(),
      createdBy: request.auth.uid,
      reportSpecArtifactId,
      status: 'queued',
    });

    const taskName = await enqueueExportJob(jobId);

    return { jobId, taskName };
  }
);
