// POST /api/create-order
const jwt = require('jsonwebtoken');
const { getDb } = require('./db');

function generateReference() {
  const num = Math.floor(10000 + Math.random() * 90000);
  return `HS-${num}`;
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Auth
    const auth = event.headers.authorization || event.headers.Authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Please log in to place an order' })
      };
    }

    const secret = process.env.JWT_SECRET;
    let payload;
    try {
      payload = jwt.verify(token, secret);
    } catch {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid session. Please log in again.' })
      };
    }

    const body = JSON.parse(event.body || '{}');
    const { items, shipping_address, notes, shipping_cost } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Cart is empty' })
      };
    }

    if (!shipping_address) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Shipping address is required' })
      };
    }

    const db = getDb();

    // Calculate total from items
    let subtotal = 0;
    for (const item of items) {
      subtotal += (item.price || 0) * (item.quantity || 1);
    }
    const ship = parseFloat(shipping_cost) || 0;
    const total = subtotal + ship;

    const payment_reference = generateReference();

    // Insert order
    const orderResult = await db.execute({
      sql: `INSERT INTO orders (user_id, status, total, shipping_cost, payment_reference, shipping_address, notes)
            VALUES (?, 'Pending', ?, ?, ?, ?, ?)`,
      args: [payload.id, total, ship, payment_reference, shipping_address, notes || null]
    });

    const orderId = Number(orderResult.lastInsertRowid);

    // Insert order items
    for (const item of items) {
      await db.execute({
        sql: `INSERT INTO order_items (order_id, variant_id, quantity, price_at_time)
              VALUES (?, ?, ?, ?)`,
        args: [orderId, item.variant_id || null, item.quantity, item.price]
      });
    }

    // Get bank details from settings (or defaults)
    let bank = {
      bank_name: 'Your Bank',
      account_name: 'Equidream Supplements',
      account_number: '0000000000',
      branch_code: '000000'
    };

    try {
      const settings = await db.execute(`SELECT key, value FROM settings WHERE key LIKE 'bank_%'`);
      for (const row of settings.rows) {
        if (row.key === 'bank_name') bank.bank_name = row.value;
        if (row.key === 'bank_account_name') bank.account_name = row.value;
        if (row.key === 'bank_account_number') bank.account_number = row.value;
        if (row.key === 'bank_branch_code') bank.branch_code = row.value;
      }
    } catch {}

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: orderId,
        payment_reference,
        total,
        ...bank
      })
    };
  } catch (err) {
    console.error('create-order error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message || 'Could not create order' })
    };
  }
};
