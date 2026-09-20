import { put } from '@vercel/blob';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: { bodyParser: false },
};

function sanitizeFilename(name) {
  return String(name || 'file')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 100)
    || 'file';
}

function getExtension(name) {
  const m = String(name || '').match(/\.([a-z0-9]+)$/i);
  return m ? '.' + m[1].toLowerCase() : '';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const form = formidable({ multiples: false, maxFileSize: 500 * 1024 * 1024 });

  try {
    const [fields, files] = await form.parse(req);
    const file = files.file?.[0];

    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const originalName = file.originalFilename || file.newFilename || 'upload';
    const buffer = fs.readFileSync(file.filepath);
    const ext = getExtension(originalName);
    const base = sanitizeFilename(originalName.replace(/\.[^.]+$/, ''));
    const safeName = `${base || 'upload'}${ext}`;

    const blob = await put(safeName, buffer, {
      access: 'public',
      contentType: file.mimetype || 'application/octet-stream',
      addRandomSuffix: true,
    });

    return res.status(200).json({ url: blob.url });
  } catch (err) {
    console.error('[upload] error:', err);
    return res.status(500).json({ error: err.message || 'Upload failed' });
  }
}
