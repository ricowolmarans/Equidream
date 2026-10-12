// Main customer-side JS
const API = '/api';

async function fetchProducts() {
  try {
    const res = await fetch(`${API}/products`);
    if (!res.ok) throw new Error('Failed to load products');
    return await res.json();
  } catch (err) {
    console.error(err);
    return [];
  }
}

function renderProductCard(product) {
  const price = product.min_price
    ? `From R${product.min_price.toFixed(2)}`
    : `R${(product.base_price || 0).toFixed(2)}`;

  return `
    <div class="product-card">
      <img src="${product.image_url || 'https://via.placeholder.com/300x180?text=Horse+Supplement'}" 
           alt="${product.name}"
           onerror="this.src='https://via.placeholder.com/300x180?text=No+Image'">
      <div class="info">
        <h3>${product.name}</h3>
        <p style="color:#6b6b6b;font-size:0.9rem;margin:0.3rem 0;">${product.category || ''}</p>
        <div class="price">${price}</div>
        <a href="/product.html?id=${product.id}" class="btn btn-primary btn-block mt-2" style="margin-top:0.8rem;font-size:0.9rem;padding:0.5rem;">View Details</a>
      </div>
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', async () => {
  if (typeof updateCartCount === 'function') updateCartCount();

  const grid = document.getElementById('featured-products');
  if (!grid) return;

  const products = await fetchProducts();
  if (products.length === 0) {
    grid.innerHTML = `
      <div class="card" style="grid-column:1/-1;text-align:center;padding:3rem;">
        <h3>No products yet</h3>
        <p style="color:#6b6b6b;margin-top:0.5rem;">Products will appear here once added in the admin panel.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = products.slice(0, 8).map(renderProductCard).join('');
});
