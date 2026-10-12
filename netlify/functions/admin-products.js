// Admin products CRUD: GET list | POST create | PUT update | DELETE
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
    // GET – list all products with variants
    if (method === 'GET') {
      const products = await db.execute(`
        SELECT id, name, description, category, base_price, image_url, active, created_at
        FROM products ORDER BY created_at DESC
      `);

      const result = [];
      for (const p of products.rows) {
        const variants = await db.execute({
          sql: `SELECT id, name, sku, price, stock, attributes FROM variants WHERE product_id = ?`,
          args: [p.id]
        });
        result.push({ ...p, variants: variants.rows });
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result)
      };
    }

    // POST – create product + variants
    if (method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { name, description, category, base_price, image_url, active, variants } = body;

      if (!name) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Product name is required' })
        };
      }

      const prod = await db.execute({
        sql: `INSERT INTO products (name, description, category, base_price, image_url, active)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [
          name.trim(),
          description || null,
          category || null,
          parseFloat(base_price) || 0,
          image_url || null,
          active === false || active === 0 ? 0 : 1
        ]
      });

      const productId = Number(prod.lastInsertRowid);

      if (Array.isArray(variants)) {
        for (const v of variants) {
          if (!v.name || v.price == null) continue;
          await db.execute({
            sql: `INSERT INTO variants (product_id, name, sku, price, stock, attributes)
                  VALUES (?, ?, ?, ?, ?, ?)`,
            args: [
              productId,
              v.name.trim(),
              v.sku || null,
              parseFloat(v.price),
              parseInt(v.stock) || 0,
              v.attributes ? JSON.stringify(v.attributes) : null
            ]
          });
        }
      }

      return {
        statusCode: 201,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: productId, message: 'Product created' })
      };
    }

    // PUT – update product + replace variants
    if (method === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      const { id, name, description, category, base_price, image_url, active, variants } = body;

      if (!id || !name) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'id and name are required' })
        };
      }

      await db.execute({
        sql: `UPDATE products SET name=?, description=?, category=?, base_price=?, image_url=?, active=?
              WHERE id=?`,
        args: [
          name.trim(),
          description || null,
          category || null,
          parseFloat(base_price) || 0,
          image_url || null,
          active === false || active === 0 ? 0 : 1,
          id
        ]
      });

      // Replace variants
      await db.execute({ sql: `DELETE FROM variants WHERE product_id = ?`, args: [id] });

      if (Array.isArray(variants)) {
        for (const v of variants) {
          if (!v.name || v.price == null) continue;
          await db.execute({
            sql: `INSERT INTO variants (product_id, name, sku, price, stock, attributes)
                  VALUES (?, ?, ?, ?, ?, ?)`,
            args: [
              id,
              v.name.trim(),
              v.sku || null,
              parseFloat(v.price),
              parseInt(v.stock) || 0,
              v.attributes ? JSON.stringify(v.attributes) : null
            ]
          });
        }
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Product updated' })
      };
    }

    // DELETE
    if (method === 'DELETE') {
      const id = event.queryStringParameters?.id;
      if (!id) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'id is required' })
        };
      }

      await db.execute({ sql: `DELETE FROM variants WHERE product_id = ?`, args: [id] });
      await db.execute({ sql: `DELETE FROM products WHERE id = ?`, args: [id] });

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Product deleted' })
      };
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (err) {
    console.error('admin-products error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message || 'Server error' })
    };
  }
};
