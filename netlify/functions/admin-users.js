// Admin users: GET list | PUT update role
const jwt = require('jsonwebtoken');
const { getDb } = require('./db');

function requireAdmin(event) {
  const auth = event.headers.authorization || event.headers.Authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return { error: 'Unauthorized', status: 401 };
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role !== 'admin') return { error: 'Admin only', status: 403 };
    return { payload };
  } catch {
    return { error: 'Invalid token', status: 401 };
  }
}

exports.handler = async function (event) {
  const auth = requireAdmin(event);
  if (auth.error) {
    return {
      statusCode: auth.status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: auth.error })
    };
  }

  const db = getDb();
  const method = event.httpMethod;

  try {
    if (method === 'GET') {
      const result = await db.execute(`
        SELECT id, email, name, phone, role, created_at
        FROM users ORDER BY created_at DESC
      `);

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result.rows)
      };
    }

    if (method === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      const { id, role } = body;

      if (!id || !['customer', 'admin'].includes(role)) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Valid id and role (customer|admin) required' })
        };
      }

      // Prevent removing the last admin
      if (role === 'customer') {
        const admins = await db.execute(`SELECT COUNT(*) as c FROM users WHERE role = 'admin'`);
        if (admins.rows[0].c <= 1) {
          const target = await db.execute({ sql: `SELECT role FROM users WHERE id = ?`, args: [id] });
          if (target.rows[0]?.role === 'admin') {
            return {
              statusCode: 400,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ error: 'Cannot demote the last admin' })
            };
          }
        }
      }

      await db.execute({
        sql: `UPDATE users SET role = ? WHERE id = ?`,
        args: [role, id]
      });

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'User updated' })
      };
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (err) {
    console.error('admin-users error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message || 'Server error' })
    };
  }
};
