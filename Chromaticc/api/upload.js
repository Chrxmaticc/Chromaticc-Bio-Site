import formidable from 'formidable';

export const config = {
  api: {
    bodyParser: false, // Disable Next.js/Vercel's default body parser
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const form = formidable({ multiples: false });

  try {
    // parse the form (returns a Promise when callback is omitted)
    const [fields, files] = await form.parse(req);
    const file = files.file?.[0]; // 'file' is the field name sent from dashboard

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    const fileBuffer = require('fs').readFileSync(file.filepath);

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

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Upload failed');

    return res.status(200).json({ url: data.url });
  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({ error: 'Upload failed' });
  }
}
