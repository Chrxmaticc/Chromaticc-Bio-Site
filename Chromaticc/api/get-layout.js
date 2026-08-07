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
    const user = await pool.query('SELECT id, username FROM users WHERE token = $1', [token]);
    if (user.rows.length === 0) return res.status(401).json({ message: 'Invalid token' });

    const layout = await pool.query('SELECT layout_data FROM profiles WHERE user_id = $1', [user.rows[0].id]);
    if (layout.rows.length === 0) {
      return res.status(200).json({ layout: [], settings: {} });
    }
    return res.status(200).json({ layout: layout.rows[0].layout_data.layout || [], settings: layout.rows[0].layout_data.settings || {} });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
}
