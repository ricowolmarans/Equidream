// Simple localStorage cart
const Cart = {
  key: 'equivital_cart',

  get() {
    try {
      return JSON.parse(localStorage.getItem(this.key)) || [];
    } catch {
      return [];
    }
  },

  save(items) {
    localStorage.setItem(this.key, JSON.stringify(items));
  },

  add(item) {
    const items = this.get();
    // Same product + same variant → increase qty
    const existing = items.find(i =>
      i.product_id === item.product_id && i.variant_id === item.variant_id
    );
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      items.push(item);
    }
    this.save(items);
  },

  updateQty(product_id, variant_id, quantity) {
    let items = this.get();
    items = items.map(i => {
      if (i.product_id === product_id && i.variant_id === variant_id) {
        return { ...i, quantity: Math.max(1, quantity) };
      }
      return i;
    });
    this.save(items);
  },

  remove(product_id, variant_id) {
    const items = this.get().filter(i =>
      !(i.product_id === product_id && i.variant_id === variant_id)
    );
    this.save(items);
  },

  clear() {
    localStorage.removeItem(this.key);
  },

  total() {
    return this.get().reduce((sum, i) => sum + (i.price * i.quantity), 0);
  },

  count() {
    return this.get().reduce((sum, i) => sum + i.quantity, 0);
  }
};

function updateCartCount() {
  const el = document.getElementById('cart-count');
  if (el) {
    const count = Cart.count();
    el.textContent = count > 0 ? `(${count})` : '';
  }
}
