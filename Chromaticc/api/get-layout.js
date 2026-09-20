import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
});

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const userRes = await pool.query(
      'SELECT id, username, profile_data, created_at FROM users WHERE token = $1 LIMIT 1',
      [token]
    );
    if (userRes.rows.length === 0) return res.status(401).json({ message: 'Invalid token' });

    const user = userRes.rows[0];

    const layoutRes = await pool.query(
      'SELECT layout_data, view_count FROM profiles WHERE user_id = $1 LIMIT 1',
      [user.id]
    );

    const layoutData = layoutRes.rows[0]?.layout_data || {};

    return res.status(200).json({
      layout: layoutData.layout || [],
      settings: layoutData.settings || {},
      profile: user.profile_data || {},
      views: layoutRes.rows[0]?.view_count || 0,
      createdAt: user.created_at || null
    });
  } catch (err) {
    console.error('[get-layout] error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}
