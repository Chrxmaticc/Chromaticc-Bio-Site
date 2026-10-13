// api/save-profile.js
import { Pool } from 'pg';
import crypto from 'crypto';
import { requireAuth } from './_auth.js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

const OWNER_PASS = process.env.owner_password;
const VALID_BADGES = ['bot','verified','discord-member','coder','developer','bug-hunter','ppa','staff','owner','hidden','banned','terminated'];

function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, key) => {
      if (err) reject(err);
      else resolve(salt + ':' + key.toString('hex'));
    });
  });
}

async function audit(action, targetUserId, details) {
  try {
    await pool.query(
      'INSERT INTO admin_audit (action, target_user_id, details, created_at) VALUES ($1,$2,$3,NOW())',
      [action, targetUserId || null, JSON.stringify(details || {})]
    );
  } catch(e) { /* table might not exist, ignore */ }
}

/* ═══════════════════════════════════════════════════════
   NORMAL PROFILE SAVE
   ═══════════════════════════════════════════════════════ */
async function handleSaveProfile(req, res) {
  const session = await requireAuth(req, res);
  if (!session) return;

  const { profile } = req.body || {};
  if (!profile || typeof profile !== 'object') {
    return res.status(400).json({ message: 'profile object required' });
  }

  try {
    await pool.query(
      `UPDATE users SET profile_data = $1 WHERE id = $2`,
      [JSON.stringify(profile), session.user.id]
    );
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[save-profile]', err.message);
    return res.status(500).json({ message: err.message });
  }
}

/* ═══════════════════════════════════════════════════════
   ADMIN — gated behind ?admin=1 and X-Admin-Pass header
   ═══════════════════════════════════════════════════════ */
async function handleAdmin(req, res) {
  const pass = req.headers['x-admin-pass'];
  if (!OWNER_PASS || pass !== OWNER_PASS) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const action = req.query.action;
  const body = req.body || {};

  try {
    switch (action) {

      /* ─── LIST USERS ─── */
      case 'list-users': {
        const q = (req.query.q || '').trim();
        const limit = Math.min(parseInt(req.query.limit) || 50, 200);
        const offset = parseInt(req.query.offset) || 0;

        let sql = `SELECT u.id, u.username, u.email, u.created_at,
                          u.banned_until, u.banned_permanent, u.ban_reason, u.ban_keep_profile,
                          u.terminated, u.terminated_reason, u.terminated_at,
                          p.view_count,
                          (SELECT COUNT(*) FROM user_badges ub WHERE ub.user_id = u.id) AS badge_count
                   FROM users u
                   LEFT JOIN profiles p ON p.user_id = u.id`;
        const params = [];
        if (q) {
          sql += ` WHERE LOWER(u.username) LIKE $1 OR LOWER(u.email) LIKE $1`;
          params.push('%' + q.toLowerCase() + '%');
        }
        sql += ` ORDER BY u.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const r = await pool.query(sql, params);

        let totalSql = `SELECT COUNT(*)::int AS n FROM users u`;
        const totalParams = [];
        if (q) {
          totalSql += ` WHERE LOWER(u.username) LIKE $1 OR LOWER(u.email) LIKE $1`;
          totalParams.push('%' + q.toLowerCase() + '%');
        }
        const totalR = await pool.query(totalSql, totalParams);

        return res.status(200).json({ users: r.rows, total: totalR.rows[0].n, limit, offset });
      }

      /* ─── GET ONE USER ─── */
      case 'get-user': {
        const id = parseInt(req.query.id);
        if (!id) return res.status(400).json({ error: 'missing id' });

        const userR = await pool.query(
          `SELECT id, username, email, alias, discord_id, created_at,
                  banned_until, banned_permanent, ban_reason, ban_keep_profile,
                  terminated, terminated_reason, terminated_at
           FROM users WHERE id = $1`, [id]
        );
        if (!userR.rows.length) return res.status(404).json({ error: 'user not found' });

        const profileR = await pool.query(
          `SELECT view_count, updated_at, layout_data FROM profiles WHERE user_id = $1`, [id]
        );
        const badgesR = await pool.query(
          `SELECT badge_id FROM user_badges WHERE user_id = $1`, [id]
        );
        const sessionsR = await pool.query(
          `SELECT created_at, expires_at, user_agent, ip FROM sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`, [id]
        );

        const profile = profileR.rows[0] || {};
        let widgetCount = 0;
        try {
          const ld = typeof profile.layout_data === 'string' ? JSON.parse(profile.layout_data) : profile.layout_data;
          widgetCount = (ld?.layout || []).length;
        } catch(e) {}

        return res.status(200).json({
          user: userR.rows[0],
          profile: {
            viewCount: profile.view_count || 0,
            updatedAt: profile.updated_at,
            widgetCount
          },
          badges: badgesR.rows.map(r => r.badge_id),
          sessions: sessionsR.rows
        });
      }

      /* ─── BAN ─── */
      case 'ban': {
        const id = parseInt(body.id);
        const duration = body.duration;
        const reason = (body.reason || '').slice(0, 500);
        const keepProfile = body.keepProfile !== false;
        if (!id) return res.status(400).json({ error: 'missing id' });

        if (duration === 'permanent') {
          await pool.query(
            `UPDATE users SET banned_permanent = TRUE, banned_until = NULL,
                              ban_reason = $1, ban_keep_profile = $2 WHERE id = $3`,
            [reason, keepProfile, id]
          );
        } else {
          const hours = Math.max(1, Math.min(parseInt(duration) || 24, 24 * 365 * 5));
          await pool.query(
            `UPDATE users SET banned_permanent = FALSE,
                              banned_until = NOW() + ($1 || ' hours')::interval,
                              ban_reason = $2, ban_keep_profile = $3 WHERE id = $4`,
            [String(hours), reason, keepProfile, id]
          );
        }

        await pool.query(
          `INSERT INTO user_badges (user_id, badge_id) VALUES ($1, 'banned') ON CONFLICT DO NOTHING`,
          [id]
        ).catch(()=>{});

        await pool.query('DELETE FROM sessions WHERE user_id = $1', [id]).catch(()=>{});

        await audit('ban', id, { duration, reason, keepProfile });
        return res.status(200).json({ ok: true });
      }

      /* ─── UNBAN ─── */
      case 'unban': {
        const id = parseInt(body.id);
        if (!id) return res.status(400).json({ error: 'missing id' });
        await pool.query(
          `UPDATE users SET banned_permanent = FALSE, banned_until = NULL, ban_reason = NULL WHERE id = $1`,
          [id]
        );
        await pool.query(`DELETE FROM user_badges WHERE user_id = $1 AND badge_id = 'banned'`, [id]).catch(()=>{});
        await audit('unban', id, {});
        return res.status(200).json({ ok: true });
      }

      /* ─── TERMINATE ─── */
      case 'terminate': {
        const id = parseInt(body.id);
        const reason = (body.reason || '').slice(0, 500);
        if (!id) return res.status(400).json({ error: 'missing id' });
        await pool.query(
          `UPDATE users SET terminated = TRUE, terminated_reason = $1, terminated_at = NOW() WHERE id = $2`,
          [reason, id]
        );
        await pool.query(
          `INSERT INTO user_badges (user_id, badge_id) VALUES ($1, 'terminated') ON CONFLICT DO NOTHING`,
          [id]
        ).catch(()=>{});
        await pool.query('DELETE FROM sessions WHERE user_id = $1', [id]).catch(()=>{});
        await audit('terminate', id, { reason });
        return res.status(200).json({ ok: true });
      }

      /* ─── UNTERMINATE ─── */
      case 'unterminate': {
        const id = parseInt(body.id);
        if (!id) return res.status(400).json({ error: 'missing id' });
        await pool.query(
          `UPDATE users SET terminated = FALSE, terminated_reason = NULL, terminated_at = NULL WHERE id = $1`,
          [id]
        );
        await pool.query(`DELETE FROM user_badges WHERE user_id = $1 AND badge_id = 'terminated'`, [id]).catch(()=>{});
        await audit('unterminate', id, {});
        return res.status(200).json({ ok: true });
      }

      /* ─── GRANT BADGE ─── */
      case 'grant-badge': {
        const id = parseInt(body.id);
        const badge = String(body.badge || '');
        if (!id || !VALID_BADGES.includes(badge)) return res.status(400).json({ error: 'invalid' });
        await pool.query(
          `INSERT INTO user_badges (user_id, badge_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [id, badge]
        );
        await audit('grant-badge', id, { badge });
        return res.status(200).json({ ok: true });
      }

      /* ─── REVOKE BADGE ─── */
      case 'revoke-badge': {
        const id = parseInt(body.id);
        const badge = String(body.badge || '');
        if (!id || !badge) return res.status(400).json({ error: 'invalid' });
        await pool.query('DELETE FROM user_badges WHERE user_id = $1 AND badge_id = $2', [id, badge]);
        await audit('revoke-badge', id, { badge });
        return res.status(200).json({ ok: true });
      }

      /* ─── RESET PASSWORD ─── */
      case 'reset-password': {
        const id = parseInt(body.id);
        if (!id) return res.status(400).json({ error: 'missing id' });
        const tempPass = crypto.randomBytes(6).toString('base64url').slice(0, 10);
        const hash = await hashPassword(tempPass);
        await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, id]);
        await pool.query('DELETE FROM sessions WHERE user_id = $1', [id]).catch(()=>{});
        await audit('reset-password', id, {});
        return res.status(200).json({ ok: true, tempPassword: tempPass });
      }

      /* ─── LOGOUT USER ─── */
      case 'logout-user': {
        const id = parseInt(body.id);
        if (!id) return res.status(400).json({ error: 'missing id' });
        const r = await pool.query('DELETE FROM sessions WHERE user_id = $1', [id]);
        await audit('logout-user', id, { killed: r.rowCount });
        return res.status(200).json({ ok: true, killed: r.rowCount });
      }

      /* ─── SET ALIAS ─── */
      case 'set-alias': {
        const id = parseInt(body.id);
        const alias = String(body.alias || '').slice(0, 32);
        if (!id) return res.status(400).json({ error: 'missing id' });
        await pool.query('UPDATE users SET alias = $1 WHERE id = $2', [alias || null, id]);
        await audit('set-alias', id, { alias });
        return res.status(200).json({ ok: true });
      }

      /* ─── DELETE USER ─── */
      case 'delete-user': {
        const id = parseInt(body.id);
        if (!id) return res.status(400).json({ error: 'missing id' });
        if (body.confirm !== 'DELETE') return res.status(400).json({ error: 'confirmation required' });
        await pool.query('DELETE FROM sessions WHERE user_id = $1', [id]).catch(()=>{});
        await pool.query('DELETE FROM user_badges WHERE user_id = $1', [id]).catch(()=>{});
        await pool.query('DELETE FROM profiles WHERE user_id = $1', [id]).catch(()=>{});
        await pool.query('DELETE FROM users WHERE id = $1', [id]);
        await audit('delete-user', id, {});
        return res.status(200).json({ ok: true });
      }

      /* ─── STATS ─── */
      case 'stats': {
        const r = await pool.query(`
          SELECT
            (SELECT COUNT(*)::int FROM users) AS total_users,
            (SELECT COUNT(*)::int FROM users WHERE banned_permanent OR (banned_until IS NOT NULL AND banned_until > NOW())) AS banned,
            (SELECT COUNT(*)::int FROM users WHERE terminated) AS terminated,
            (SELECT COUNT(*)::int FROM user_badges) AS total_badges,
            (SELECT COALESCE(SUM(view_count),0)::int FROM profiles) AS total_views,
            (SELECT COUNT(*)::int FROM sessions WHERE expires_at > NOW()) AS active_sessions,
            (SELECT COUNT(*)::int FROM users WHERE created_at > NOW() - INTERVAL '24 hours') AS new_today
        `);
        return res.status(200).json(r.rows[0]);
      }

      /* ─── AUDIT LOG ─── */
      case 'audit-log': {
        const limit = Math.min(parseInt(req.query.limit) || 100, 500);
        const r = await pool.query(
          `SELECT a.id, a.action, a.target_user_id, a.details, a.created_at,
                  u.username AS target_username
           FROM admin_audit a
           LEFT JOIN users u ON u.id = a.target_user_id
           ORDER BY a.created_at DESC LIMIT $1`, [limit]
        ).catch(() => ({ rows: [] }));
        return res.status(200).json({ log: r.rows });
      }

      default:
        return res.status(400).json({ error: 'unknown action' });
    }
  } catch (err) {
    console.error('[admin]', action, err.message);
    return res.status(500).json({ error: err.message });
  }
}

/* ═══════════════════════════════════════════════════════
   ROUTER
   ═══════════════════════════════════════════════════════ */
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Pass, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.query.admin === '1') {
    return handleAdmin(req, res);
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  return handleSaveProfile(req, res);
}
