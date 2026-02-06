import { onRequest } from 'firebase-functions/v2/https';

export const runExportJob = onRequest(
  {
    timeoutSeconds: 540,
    memory: '2GiB',
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed');
      return;
    }

    const { jobId } = req.body;
    if (!jobId || typeof jobId !== 'string') {
      res.status(400).json({ error: 'Missing jobId' });
      return;
    }

    console.log(`[runExportJob] Received export job: ${jobId}`);

    // TODO (M4): Implement actual export pipeline
    // 1. Read ExportJob doc from Firestore
    // 2. Validate report_spec + referenced artifacts
    // 3. Render visuals (Vega/map → SVG/PNG)
    // 4. Build report HTML template
    // 5. Playwright PDF generation (network disabled)
    // 6. Generate + sign provenance manifest
    // 7. Store document_pdf artifact

    res.status(200).json({ status: 'received', jobId });
  }
);
