import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
    maxBodySize: '50mb',
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const form = formidable({ multiples: false });

  try {
    const [fields, files] = await form.parse(req);
    const file = files.file?.[0];

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    const fileBuffer = fs.readFileSync(file.filepath);

    const response = await fetch(
      `https://blob.vercel-storage.com/put/${file.originalFilename}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': file.mimetype,
          'Content-Length': file.size,
        },
        body: fileBuffer,
      }
    );

    // Try to get the response as text first, so we can log the raw error
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }

    if (!response.ok) {
      console.error('Blob upload error:', data);
      const msg = typeof data.error === 'string'
        ? data.error
        : JSON.stringify(data.error || data);
      throw new Error(msg);
    }

    return res.status(200).json({ url: data.url });
  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({ error: err.message || 'Upload failed' });
  }
}
