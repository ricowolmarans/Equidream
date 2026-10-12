// GET /api/product?id=123 – single product with variants
const { getDb } = require('./db');

exports.handler = async function (event) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const id = event.queryStringParameters?.id;
    if (!id) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Product id is required' })
      };
    }

    const db = getDb();

    const productResult = await db.execute({
      sql: `SELECT * FROM products WHERE id = ? AND active = 1`,
      args: [id]
    });

    if (productResult.rows.length === 0) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Product not found' })
      };
    }

    const product = productResult.rows[0];

    const variantsResult = await db.execute({
      sql: `SELECT id, name, sku, price, stock, attributes FROM variants WHERE product_id = ? ORDER BY price`,
      args: [id]
    });

    product.variants = variantsResult.rows;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product)
    };
  } catch (err) {
    console.error('product error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message || 'Failed to load product' })
    };
  }
};
