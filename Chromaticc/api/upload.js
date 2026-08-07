export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!file) {
      return new Response(JSON.stringify({ error: 'No file uploaded' }), { status: 400 });
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    const response = await fetch(
      `https://blob.vercel-storage.com/put/${file.name}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': file.type,
          'Content-Length': file.size,
        },
        body: file.stream(),
      }
    );

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Upload failed');

    return new Response(JSON.stringify({ url: data.url }), { status: 200 });
  } catch (err) {
    console.error('Upload error:', err);
    return new Response(JSON.stringify({ error: 'Upload failed' }), { status: 500 });
  }
}
