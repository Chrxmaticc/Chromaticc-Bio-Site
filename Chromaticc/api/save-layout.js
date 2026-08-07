import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  const { layout, settings } = req.body;
  if (!Array.isArray(layout)) return res.status(400).json({ message: 'Invalid layout' });

  try {
    const user = await pool.query('SELECT id FROM users WHERE token = $1', [token]);
    if (user.rows.length === 0) return res.status(401).json({ message: 'Invalid token' });

    await pool.query(
      `INSERT INTO profiles (user_id, layout_data) VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET layout_data = EXCLUDED.layout_data`,
      [user.rows[0].id, JSON.stringify({ layout, settings: settings || {} })]
    );
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
}
