// Admin orders: GET list | PUT update status
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
      const orders = await db.execute(`
        SELECT o.*, u.email as customer_email, u.name as customer_name, u.phone as customer_phone
        FROM orders o
        LEFT JOIN users u ON u.id = o.user_id
        ORDER BY o.created_at DESC
      `);

      const result = [];
      for (const o of orders.rows) {
        const items = await db.execute({
          sql: `SELECT oi.*, v.name as variant_name, p.name as product_name
                FROM order_items oi
                LEFT JOIN variants v ON v.id = oi.variant_id
                LEFT JOIN products p ON p.id = v.product_id
                WHERE oi.order_id = ?`,
          args: [o.id]
        });
        result.push({ ...o, items: items.rows });
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result)
      };
    }

    if (method === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      const { id, status } = body;

      const allowed = ['Pending', 'Paid', 'Shipped', 'Completed'];
      if (!id || !allowed.includes(status)) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Valid id and status required (Pending|Paid|Shipped|Completed)' })
        };
      }

      await db.execute({
        sql: `UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?`,
        args: [status, id]
      });

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Order updated' })
      };
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (err) {
    console.error('admin-orders error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message || 'Server error' })
    };
  }
};
