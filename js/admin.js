// Full Admin Panel SPA
const API = '/api';
const app = document.getElementById('app');

function getToken() { return localStorage.getItem('admin_token'); }
function setToken(t) { localStorage.setItem('admin_token', t); }
function clearToken() { localStorage.removeItem('admin_token'); }

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`
  };
}

function showError(el, msg) {
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
}
function hideError(el) {
  if (el) el.style.display = 'none';
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ========== AUTH VIEWS ==========
function renderSetup() {
  app.innerHTML = `
    <div class="auth-wrapper">
      <div class="auth-card">
        <h1>Create Admin Account</h1>
        <p class="subtitle">First-time setup. This creates your admin account and initializes the database.</p>
        <div class="error" id="error"></div>
        <form id="setup-form">
          <div class="form-group">
            <label>Admin Email</label>
            <input type="email" id="email" required placeholder="you@example.com">
          </div>
          <div class="form-group">
            <label>Password</label>
            <input type="password" id="password" required minlength="8" placeholder="Min 8 characters">
          </div>
          <div class="form-group">
            <label>Confirm Password</label>
            <input type="password" id="confirm" required>
          </div>
          <button type="submit" class="btn btn-primary btn-block">Create Admin & Initialize</button>
        </form>
      </div>
    </div>`;
  document.getElementById('setup-form').addEventListener('submit', handleSetup);
}

function renderLogin() {
  app.innerHTML = `
    <div class="auth-wrapper">
      <div class="auth-card">
        <h1>Admin Login</h1>
        <p class="subtitle">Equidream Horse Supplements</p>
        <div class="error" id="error"></div>
        <form id="login-form">
          <div class="form-group">
            <label>Email</label>
            <input type="email" id="email" required>
          </div>
          <div class="form-group">
            <label>Password</label>
            <input type="password" id="password" required>
          </div>
          <button type="submit" class="btn btn-primary btn-block">Login</button>
        </form>
      </div>
    </div>`;
  document.getElementById('login-form').addEventListener('submit', handleLogin);
}

async function handleSetup(e) {
  e.preventDefault();
  const errorEl = document.getElementById('error');
  hideError(errorEl);
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const confirm = document.getElementById('confirm').value;
  if (password !== confirm) return showError(errorEl, 'Passwords do not match');
  if (password.length < 8) return showError(errorEl, 'Password must be at least 8 characters');

  try {
    const res = await fetch(`${API}/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) return showError(errorEl, data.error || 'Setup failed');
    setToken(data.token);
    renderShell(data.user);
  } catch (err) {
    showError(errorEl, 'Network error');
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const errorEl = document.getElementById('error');
  hideError(errorEl);
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  try {
    const res = await fetch(`${API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) return showError(errorEl, data.error || 'Login failed');
    if (data.user.role !== 'admin') return showError(errorEl, 'Admin access only');
    setToken(data.token);
    renderShell(data.user);
  } catch (err) {
    showError(errorEl, 'Network error');
  }
}

// ========== ADMIN SHELL ==========
let currentUser = null;

function renderShell(user) {
  currentUser = user;
  app.innerHTML = `
    <div class="admin-layout">
      <aside class="admin-sidebar">
        <div class="logo">Equi<span>dream</span> Admin</div>
        <nav>
          <a href="#" data-page="dashboard" class="active">Dashboard</a>
          <a href="#" data-page="products">Products</a>
          <a href="#" data-page="orders">Orders</a>
          <a href="#" data-page="users">Users</a>
          <a href="#" data-page="settings">Settings</a>
          <a href="#" id="logout-btn" style="margin-top:2rem;color:#e8d5a3;">Logout</a>
        </nav>
      </aside>
      <main class="admin-content" id="admin-main"></main>
    </div>`;

  document.querySelectorAll('[data-page]').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('[data-page]').forEach(x => x.classList.remove('active'));
      a.classList.add('active');
      loadPage(a.dataset.page);
    });
  });

  document.getElementById('logout-btn').addEventListener('click', (e) => {
    e.preventDefault();
    clearToken();
    init();
  });

  loadPage('dashboard');
}

async function loadPage(page) {
  const main = document.getElementById('admin-main');
  main.innerHTML = '<div class="card" style="text-align:center;padding:3rem;">Loading...</div>';

  if (page === 'dashboard') return renderDashboard(main);
  if (page === 'products') return renderProducts(main);
  if (page === 'orders') return renderOrders(main);
  if (page === 'users') return renderUsers(main);
  if (page === 'settings') return renderSettings(main);
}

// ========== DASHBOARD ==========
async function renderDashboard(main) {
  let productCount = 0, orderCount = 0, userCount = 0, pendingCount = 0;
  try {
    const [prods, orders, users] = await Promise.all([
      fetch(`${API}/admin-products`, { headers: authHeaders() }).then(r => r.json()),
      fetch(`${API}/admin-orders`, { headers: authHeaders() }).then(r => r.json()),
      fetch(`${API}/admin-users`, { headers: authHeaders() }).then(r => r.json())
    ]);
    productCount = Array.isArray(prods) ? prods.length : 0;
    orderCount = Array.isArray(orders) ? orders.length : 0;
    pendingCount = Array.isArray(orders) ? orders.filter(o => o.status === 'Pending').length : 0;
    userCount = Array.isArray(users) ? users.filter(u => u.role === 'customer').length : 0;
  } catch {}

  main.innerHTML = `
    <div class="admin-header">
      <h1>Dashboard</h1>
      <div>Logged in as <strong>${currentUser.email}</strong></div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1.2rem;">
      <div class="card" style="text-align:center;">
        <div style="font-size:2.2rem;font-weight:700;color:var(--primary);">${productCount}</div>
        <div style="color:#6b6b6b;">Products</div>
      </div>
      <div class="card" style="text-align:center;">
        <div style="font-size:2.2rem;font-weight:700;color:var(--primary);">${orderCount}</div>
        <div style="color:#6b6b6b;">Total Orders</div>
      </div>
      <div class="card" style="text-align:center;">
        <div style="font-size:2.2rem;font-weight:700;color:#c4a35a;">${pendingCount}</div>
        <div style="color:#6b6b6b;">Pending Payment</div>
      </div>
      <div class="card" style="text-align:center;">
        <div style="font-size:2.2rem;font-weight:700;color:var(--primary);">${userCount}</div>
        <div style="color:#6b6b6b;">Customers</div>
      </div>
    </div>
    <div class="card mt-3">
      <h3>Quick Actions</h3>
      <div style="display:flex;gap:1rem;margin-top:1rem;flex-wrap:wrap;">
        <button class="btn btn-primary" onclick="document.querySelector('[data-page=products]').click()">Manage Products</button>
        <button class="btn btn-outline" onclick="document.querySelector('[data-page=orders]').click()">View Orders</button>
        <button class="btn btn-outline" onclick="document.querySelector('[data-page=settings]').click()">Settings</button>
      </div>
    </div>`;
}

// ========== PRODUCTS ==========
async function renderProducts(main) {
  let products = [];
  try {
    const res = await fetch(`${API}/admin-products`, { headers: authHeaders() });
    products = await res.json();
    if (!Array.isArray(products)) products = [];
  } catch { products = []; }

  main.innerHTML = `
    <div class="admin-header">
      <h1>Products</h1>
      <button class="btn btn-primary" id="btn-add-product">+ Add Product</button>
    </div>
    <div id="products-list"></div>
    <div id="product-form-area" class="hidden"></div>`;

  document.getElementById('btn-add-product').addEventListener('click', () => showProductForm(null));

  const list = document.getElementById('products-list');
  if (products.length === 0) {
    list.innerHTML = `<div class="card" style="text-align:center;padding:2.5rem;">
      <h3>No products yet</h3>
      <p style="color:#6b6b6b;margin:0.5rem 0 1rem;">Add your first horse supplement.</p>
      <button class="btn btn-primary" onclick="document.getElementById('btn-add-product').click()">Add Product</button>
    </div>`;
    return;
  }

  list.innerHTML = `
    <div class="card" style="padding:0;overflow:auto;">
      <table>
        <thead>
          <tr>
            <th>Image</th>
            <th>Name</th>
            <th>Category</th>
            <th>Variants</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${products.map(p => `
            <tr>
              <td>
                <img src="${p.image_url || 'https://via.placeholder.com/50'}" 
                     style="width:50px;height:50px;object-fit:cover;border-radius:6px;"
                     onerror="this.src='https://via.placeholder.com/50'">
              </td>
              <td><strong>${escapeHtml(p.name)}</strong></td>
              <td>${escapeHtml(p.category || '—')}</td>
              <td>${(p.variants || []).length}</td>
              <td>${p.active ? '<span style="color:green;">Active</span>' : '<span style="color:#999;">Hidden</span>'}</td>
              <td>
                <button class="btn btn-outline" style="padding:0.3rem 0.7rem;font-size:0.85rem;" data-edit="${p.id}">Edit</button>
                <button class="btn btn-outline" style="padding:0.3rem 0.7rem;font-size:0.85rem;color:var(--danger);border-color:var(--danger);" data-del="${p.id}">Delete</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>`;

  list.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = products.find(x => x.id == btn.dataset.edit);
      showProductForm(p);
    });
  });
  list.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this product and all its variants?')) return;
      await fetch(`${API}/admin-products?id=${btn.dataset.del}`, {
        method: 'DELETE',
        headers: authHeaders()
      });
      renderProducts(main);
    });
  });
}

function showProductForm(product) {
  const area = document.getElementById('product-form-area');
  const list = document.getElementById('products-list');
  list.classList.add('hidden');
  area.classList.remove('hidden');

  const isEdit = !!product;
  const variants = product?.variants?.length
    ? product.variants
    : [{ name: '', price: '', stock: 0, sku: '' }];

  area.innerHTML = `
    <div class="card">
      <h2 style="margin-bottom:1.2rem;">${isEdit ? 'Edit Product' : 'Add Product'}</h2>
      <div class="error" id="prod-error" style="display:none;"></div>
      <form id="product-form">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
          <div class="form-group">
            <label>Product Name *</label>
            <input type="text" id="p-name" required value="${escapeHtml(product?.name || '')}">
          </div>
          <div class="form-group">
            <label>Category</label>
            <input type="text" id="p-category" value="${escapeHtml(product?.category || '')}" placeholder="e.g. Joint Support, Digestion">
          </div>
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea id="p-desc" rows="3">${escapeHtml(product?.description || '')}</textarea>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
          <div class="form-group">
            <label>Base Price (R) – used if no variants</label>
            <input type="number" id="p-base" step="0.01" min="0" value="${product?.base_price || 0}">
          </div>
          <div class="form-group">
            <label>Image URL</label>
            <input type="url" id="p-image" value="${escapeHtml(product?.image_url || '')}" placeholder="https://...">
          </div>
        </div>
        <div class="form-group">
          <label>
            <input type="checkbox" id="p-active" ${product?.active !== 0 ? 'checked' : ''}> Active (visible in store)
          </label>
        </div>

        <h3 style="margin:1.5rem 0 0.8rem;">Variants</h3>
        <p style="color:#6b6b6b;font-size:0.9rem;margin-bottom:1rem;">Add sizes, weights, flavours etc.</p>
        <div id="variants-container"></div>
        <button type="button" class="btn btn-outline" id="btn-add-variant" style="margin-top:0.5rem;">+ Add Variant</button>

        <div style="display:flex;gap:1rem;margin-top:2rem;">
          <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Create Product'}</button>
          <button type="button" class="btn btn-outline" id="btn-cancel-product">Cancel</button>
        </div>
      </form>
    </div>`;

  const variantsContainer = document.getElementById('variants-container');

  function renderVariantRows(vars) {
    variantsContainer.innerHTML = vars.map((v) => `
      <div class="variant-row" style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr auto;gap:0.6rem;margin-bottom:0.6rem;align-items:end;">
        <div class="form-group" style="margin:0;">
          <label style="font-size:0.8rem;">Name (e.g. 5kg)</label>
          <input type="text" class="v-name" value="${escapeHtml(v.name || '')}" placeholder="5kg / Apple">
        </div>
        <div class="form-group" style="margin:0;">
          <label style="font-size:0.8rem;">Price (R)</label>
          <input type="number" class="v-price" step="0.01" min="0" value="${v.price ?? ''}">
        </div>
        <div class="form-group" style="margin:0;">
          <label style="font-size:0.8rem;">Stock</label>
          <input type="number" class="v-stock" min="0" value="${v.stock ?? 0}">
        </div>
        <div class="form-group" style="margin:0;">
          <label style="font-size:0.8rem;">SKU</label>
          <input type="text" class="v-sku" value="${escapeHtml(v.sku || '')}">
        </div>
        <button type="button" class="btn btn-outline remove-variant" style="padding:0.5rem 0.7rem;color:var(--danger);border-color:var(--danger);">×</button>
      </div>
    `).join('');

    variantsContainer.querySelectorAll('.remove-variant').forEach(btn => {
      btn.addEventListener('click', () => btn.closest('.variant-row').remove());
    });
  }
  renderVariantRows(variants);

  document.getElementById('btn-add-variant').addEventListener('click', () => {
    const rows = [...variantsContainer.querySelectorAll('.variant-row')];
    const current = rows.map(r => ({
      name: r.querySelector('.v-name').value,
      price: r.querySelector('.v-price').value,
      stock: r.querySelector('.v-stock').value,
      sku: r.querySelector('.v-sku').value
    }));
    current.push({ name: '', price: '', stock: 0, sku: '' });
    renderVariantRows(current);
  });

  document.getElementById('btn-cancel-product').addEventListener('click', () => {
    area.classList.add('hidden');
    list.classList.remove('hidden');
  });

  document.getElementById('product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('prod-error');
    hideError(errorEl);

    const variantRows = [...variantsContainer.querySelectorAll('.variant-row')];
    const variantsData = variantRows
      .map(r => ({
        name: r.querySelector('.v-name').value.trim(),
        price: r.querySelector('.v-price').value,
        stock: r.querySelector('.v-stock').value,
        sku: r.querySelector('.v-sku').value.trim()
      }))
      .filter(v => v.name && v.price !== '');

    const payload = {
      name: document.getElementById('p-name').value.trim(),
      description: document.getElementById('p-desc').value.trim(),
      category: document.getElementById('p-category').value.trim(),
      base_price: document.getElementById('p-base').value,
      image_url: document.getElementById('p-image').value.trim(),
      active: document.getElementById('p-active').checked,
      variants: variantsData
    };
    if (isEdit) payload.id = product.id;

    try {
      const res = await fetch(`${API}/admin-products`, {
        method: isEdit ? 'PUT' : 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) return showError(errorEl, data.error || 'Failed');
      renderProducts(document.getElementById('admin-main'));
    } catch {
      showError(errorEl, 'Network error');
    }
  });
}

// ========== ORDERS ==========
async function renderOrders(main) {
  let orders = [];
  try {
    const res = await fetch(`${API}/admin-orders`, { headers: authHeaders() });
    orders = await res.json();
    if (!Array.isArray(orders)) orders = [];
  } catch { orders = []; }

  main.innerHTML = `
    <div class="admin-header">
      <h1>Orders</h1>
    </div>
    <div id="orders-list"></div>`;

  const list = document.getElementById('orders-list');
  if (orders.length === 0) {
    list.innerHTML = `<div class="card" style="text-align:center;padding:2.5rem;"><h3>No orders yet</h3></div>`;
    return;
  }

  list.innerHTML = orders.map(o => `
    <div class="card" style="margin-bottom:1.2rem;">
      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:1rem;margin-bottom:1rem;">
        <div>
          <strong>Order #${o.id}</strong>
          <span style="margin-left:1rem;color:#6b6b6b;">${new Date(o.created_at).toLocaleString()}</span>
        </div>
        <div>
          <select class="status-select" data-id="${o.id}" style="padding:0.4rem 0.8rem;border-radius:6px;border:1px solid var(--border);">
            ${['Pending', 'Paid', 'Shipped', 'Completed'].map(s =>
              `<option value="${s}" ${o.status === s ? 'selected' : ''}>${s}</option>`
            ).join('')}
          </select>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;font-size:0.95rem;">
        <div>
          <div><strong>Customer:</strong> ${escapeHtml(o.customer_name || o.customer_email || '—')}</div>
          <div><strong>Email:</strong> ${escapeHtml(o.customer_email || '—')}</div>
          <div><strong>Phone:</strong> ${escapeHtml(o.customer_phone || '—')}</div>
          <div style="margin-top:0.5rem;"><strong>Reference:</strong> <code>${o.payment_reference || '—'}</code></div>
        </div>
        <div>
          <div><strong>Total:</strong> R${Number(o.total).toFixed(2)}</div>
          <div><strong>Shipping:</strong> R${Number(o.shipping_cost || 0).toFixed(2)}</div>
          <div style="margin-top:0.5rem;white-space:pre-line;"><strong>Address:</strong><br>${escapeHtml(o.shipping_address || '—')}</div>
        </div>
      </div>
      ${o.items && o.items.length ? `
        <div style="margin-top:1rem;border-top:1px solid var(--border);padding-top:0.8rem;">
          <strong>Items:</strong>
          <ul style="margin:0.4rem 0 0 1.2rem;">
            ${o.items.map(i => `
              <li>${escapeHtml(i.product_name || 'Product')} ${i.variant_name ? '(' + escapeHtml(i.variant_name) + ')' : ''} × ${i.quantity} — R${Number(i.price_at_time).toFixed(2)}</li>
            `).join('')}
          </ul>
        </div>
      ` : ''}
    </div>
  `).join('');

  list.querySelectorAll('.status-select').forEach(sel => {
    sel.addEventListener('change', async () => {
      await fetch(`${API}/admin-orders`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ id: sel.dataset.id, status: sel.value })
      });
    });
  });
}

// ========== USERS ==========
async function renderUsers(main) {
  let users = [];
  try {
    const res = await fetch(`${API}/admin-users`, { headers: authHeaders() });
    users = await res.json();
    if (!Array.isArray(users)) users = [];
  } catch { users = []; }

  main.innerHTML = `
    <div class="admin-header">
      <h1>Users</h1>
    </div>
    <div class="card" style="padding:0;overflow:auto;">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Role</th>
            <th>Joined</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${users.map(u => `
            <tr>
              <td>${escapeHtml(u.name || '—')}</td>
              <td>${escapeHtml(u.email)}</td>
              <td>${escapeHtml(u.phone || '—')}</td>
              <td><strong>${u.role}</strong></td>
              <td>${new Date(u.created_at).toLocaleDateString()}</td>
              <td>
                ${u.role === 'customer'
                  ? `<button class="btn btn-outline" style="padding:0.3rem 0.7rem;font-size:0.85rem;" data-promote="${u.id}">Make Admin</button>`
                  : `<button class="btn btn-outline" style="padding:0.3rem 0.7rem;font-size:0.85rem;" data-demote="${u.id}">Make Customer</button>`
                }
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>`;

  main.querySelectorAll('[data-promote]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await fetch(`${API}/admin-users`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ id: btn.dataset.promote, role: 'admin' })
      });
      renderUsers(main);
    });
  });
  main.querySelectorAll('[data-demote]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Demote this admin to customer?')) return;
      const res = await fetch(`${API}/admin-users`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ id: btn.dataset.demote, role: 'customer' })
      });
      const data = await res.json();
      if (!res.ok) alert(data.error || 'Failed');
      else renderUsers(main);
    });
  });
}

// ========== SETTINGS ==========
async function renderSettings(main) {
  let settings = {};
  try {
    const res = await fetch(`${API}/admin-settings`, { headers: authHeaders() });
    settings = await res.json();
  } catch {}

  main.innerHTML = `
    <div class="admin-header">
      <h1>Settings</h1>
    </div>
    <div class="card" style="max-width:600px;">
      <div class="error" id="settings-error" style="display:none;"></div>
      <div class="success" id="settings-success" style="display:none;background:#edf7f0;color:var(--success);padding:0.75rem 1rem;border-radius:8px;margin-bottom:1rem;"></div>
      <form id="settings-form">
        <h3 style="margin-bottom:1rem;">Shipping</h3>
        <div class="form-group">
          <label>Flat Rate Shipping (R)</label>
          <input type="number" id="s-shipping" step="0.01" min="0" value="${settings.shipping_flat_rate || 150}">
        </div>

        <h3 style="margin:1.8rem 0 1rem;">Bank Details (shown to customers for EFT)</h3>
        <div class="form-group">
          <label>Bank Name</label>
          <input type="text" id="s-bank" value="${escapeHtml(settings.bank_name || '')}" placeholder="e.g. FNB / Standard Bank">
        </div>
        <div class="form-group">
          <label>Account Name</label>
          <input type="text" id="s-accname" value="${escapeHtml(settings.bank_account_name || '')}">
        </div>
        <div class="form-group">
          <label>Account Number</label>
          <input type="text" id="s-accnum" value="${escapeHtml(settings.bank_account_number || '')}">
        </div>
        <div class="form-group">
          <label>Branch Code</label>
          <input type="text" id="s-branch" value="${escapeHtml(settings.bank_branch_code || '')}">
        </div>

        <button type="submit" class="btn btn-primary mt-2">Save Settings</button>
      </form>
    </div>`;

  document.getElementById('settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('settings-error');
    const successEl = document.getElementById('settings-success');
    hideError(errorEl);
    successEl.style.display = 'none';

    const payload = {
      shipping_flat_rate: document.getElementById('s-shipping').value,
      bank_name: document.getElementById('s-bank').value.trim(),
      bank_account_name: document.getElementById('s-accname').value.trim(),
      bank_account_number: document.getElementById('s-accnum').value.trim(),
      bank_branch_code: document.getElementById('s-branch').value.trim()
    };

    try {
      const res = await fetch(`${API}/admin-settings`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) return showError(errorEl, data.error || 'Failed');
      successEl.textContent = 'Settings saved successfully';
      successEl.style.display = 'block';
    } catch {
      showError(errorEl, 'Network error');
    }
  });
}

// ========== INIT ==========
async function init() {
  const token = getToken();
  try {
    const statusRes = await fetch(`${API}/status`);
    const status = await statusRes.json();

    if (!status.initialized) {
      renderSetup();
      return;
    }

    if (!token) {
      renderLogin();
      return;
    }

    const meRes = await fetch(`${API}/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!meRes.ok) {
      clearToken();
      renderLogin();
      return;
    }
    const user = await meRes.json();
    if (user.role !== 'admin') {
      clearToken();
      renderLogin();
      return;
    }
    renderShell(user);
  } catch (err) {
    console.error(err);
    app.innerHTML = `
      <div class="auth-wrapper">
        <div class="auth-card">
          <h1>Connection Error</h1>
          <p class="subtitle">Could not reach the backend.</p>
          <p style="margin-top:1rem;font-size:0.85rem;color:#6b6b6b;">
            Make sure these Netlify environment variables are set:<br>
            TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, JWT_SECRET
          </p>
        </div>
      </div>`;
  }
}

document.addEventListener('DOMContentLoaded', init);
