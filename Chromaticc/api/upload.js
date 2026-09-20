// api/upload.js
import { handleUpload } from '@vercel/blob/client';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body;
  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        // Optional: Add authentication here to verify the user before generating a token.
        // e.g., check for a valid session or admin key.
        return {
          allowedContentTypes: ['image/*', 'video/*', 'audio/*', 'application/octet-stream'],
          maximumSizeInBytes: 500 * 1024 * 1024, // 500MB
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // This callback can be used to save the blob URL to your database.
        console.log('Blob upload completed:', blob.url);
      },
    });
    res.status(200).json(jsonResponse);
  } catch (err) {
    console.error('Upload route error:', err);
    res.status(500).json({ error: err.message });
  }
}
