import { pool, requireAuth } from './_auth.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const session = await requireAuth(req, res);
  if (!session) return;

  try {
    const r = await pool.query(
      'SELECT badge_id FROM user_badges WHERE user_id = $1',
      [session.user.id]
    );
    return res.status(200).json({ badges: r.rows.map(x => x.badge_id) });
  } catch (err) {
    console.error('[get-badges]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
