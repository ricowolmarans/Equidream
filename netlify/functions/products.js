// GET /api/products – public product list
const { getDb } = require('./db');

exports.handler = async function (event) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const db = getDb();

    // Check if tables exist
    try {
      await db.execute(`SELECT 1 FROM products LIMIT 1`);
    } catch {
      // Tables not created yet
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([])
      };
    }

    const result = await db.execute(`
      SELECT 
        p.id,
        p.name,
        p.description,
        p.category,
        p.base_price,
        p.image_url,
        MIN(v.price) as min_price
      FROM products p
      LEFT JOIN variants v ON v.product_id = p.id
      WHERE p.active = 1
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result.rows)
    };
  } catch (err) {
    console.error('products error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message || 'Failed to load products' })
    };
  }
};
