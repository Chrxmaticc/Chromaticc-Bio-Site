import { pool, requireAuth } from './_auth.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const session = await requireAuth(req, res);
  if (!session) return;

  try {
    await pool.query('DELETE FROM sessions WHERE user_id = $1', [session.user.id]);
    res.setHeader('Set-Cookie', 'token=; Path=/; SameSite=Lax; Max-Age=0');
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[logout-all] error:', err.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
