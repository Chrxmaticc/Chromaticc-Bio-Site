export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    const response = await fetch(`https://blob.vercel-storage.com/put/${file.name}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': file.type,
        'Content-Length': file.size,
      },
      body: Buffer.from(await file.arrayBuffer()),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Upload failed');
    return res.status(200).json({ url: data.url });
  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({ error: 'Upload failed' });
  }
}
