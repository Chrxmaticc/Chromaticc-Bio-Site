import { pool, readRawToken } from './_auth.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const token = readRawToken(req);
  if (token) {
    try {
      await pool.query('DELETE FROM sessions WHERE token = $1', [token]);
    } catch (err) {
      console.error('[logout] error:', err.message);
    }
  }

  // clear cookie regardless
  res.setHeader('Set-Cookie', 'token=; Path=/; SameSite=Lax; Max-Age=0');
  return res.status(200).json({ ok: true });
}
