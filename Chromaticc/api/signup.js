import { Pool } from 'pg';
import crypto from 'crypto';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(salt + ':' + derivedKey.toString('hex'));
    });
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ message: 'All fields required' });
  }

  try {
    const existing = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'Username or email already taken' });
    }

    const password_hash = await hashPassword(password);
    const token = crypto.randomBytes(32).toString('hex');

    const newUser = await pool.query(
      'INSERT INTO users (username, email, password_hash, token) VALUES ($1, $2, $3, $4) RETURNING id, username',
      [username, email, password_hash, token]
    );

    const user = newUser.rows[0];

    // Set the cookie — this is the line you need
    res.setHeader('Set-Cookie', `token=${token}; Path=/; SameSite=Lax; Max-Age=604800`);

    return res.status(201).json({
      token,
      user: { id: user.id, username: user.username }
    });
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
