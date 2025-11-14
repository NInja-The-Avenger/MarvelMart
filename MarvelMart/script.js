// Simple demo logic: loads products from products.html, manages cart/wishlist/orders/reviews, and handles auth.
// All data saved to localStorage for demo purposes.

const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

const state = {
  cart: JSON.parse(localStorage.getItem('mb_cart')||'[]'),
  wishlist: JSON.parse(localStorage.getItem('mb_wishlist')||'[]'),
  orders: JSON.parse(localStorage.getItem('mb_orders')||'[]'),
  reviews: JSON.parse(localStorage.getItem('mb_reviews')||'{}'),
  user: JSON.parse(localStorage.getItem('mb_user')||'null')
};

function save() {
  localStorage.setItem('mb_cart', JSON.stringify(state.cart));
  localStorage.setItem('mb_wishlist', JSON.stringify(state.wishlist));
  localStorage.setItem('mb_orders', JSON.stringify(state.orders));
  localStorage.setItem('mb_reviews', JSON.stringify(state.reviews));
  localStorage.setItem('mb_user', JSON.stringify(state.user));
}

function updateCounts() {
  const el = document.getElementById('cart-count');
  if (el) el.textContent = state.cart.length;
}

// Load products by fetching products.html and parsing <img> tags between comments.
async function loadProducts() {
  const grid = document.getElementById('product-grid');
  if (!grid) return;
  grid.innerHTML = '';
  try {
    const res = await fetch('products.html');
    const txt = await res.text();
    const start = txt.indexOf('<!-- START PRODUCTS -->');
    const end = txt.indexOf('<!-- END PRODUCTS -->');
    const block = (start>=0 && end>start) ? txt.slice(start, end) : txt;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = block;
    const imgs = Array.from(wrapper.querySelectorAll('img'));
    if (imgs.length === 0) {
      grid.innerHTML = '<div class="card">No products found. Open <code>products.html</code> and add &lt;img&gt; tags as instructed.</div>';
      return;
    }
    imgs.forEach((img, i) => {
      const tpl = document.getElementById('product-template').content.cloneNode(true);
      const imgEl = tpl.querySelector('.product-img');
      const titleEl = tpl.querySelector('.product-title');
      const priceEl = tpl.querySelector('.product-price');
      const addCart = tpl.querySelector('.add-cart');
      const wishBtn = tpl.querySelector('.add-wishlist');
      const comments = tpl.querySelector('.comments');
      const commentForm = tpl.querySelector('.comment-form');

      const title = img.dataset.title || img.alt || ('Product ' + (i+1));
      const price = Number(img.dataset.price || 199 + i*100);

      imgEl.src = img.src; imgEl.alt = title;
      titleEl.textContent = title;
      priceEl.textContent = '₹' + price;

      addCart.addEventListener('click', () => {
        state.cart.push({id: img.src, title, price});
        save(); updateCounts();
        alert(title + ' added to cart');
      });

      wishBtn.addEventListener('click', () => {
        state.wishlist.push({id: img.src, title, price});
        save(); renderWishlist();
      });

      const pid = img.src;
      const rlist = state.reviews[pid] || [];
      rlist.forEach(r => {
        const p = document.createElement('p'); p.textContent = r.name + ': ' + r.text; comments.appendChild(p);
      });

      commentForm.addEventListener('submit', e => {
        e.preventDefault();
        const name = commentForm.querySelector('.comment-name').value.trim();
        const text = commentForm.querySelector('.comment-text').value.trim();
        if (!name || !text) return alert('Fill both fields');
        state.reviews[pid] = state.reviews[pid] || [];
        state.reviews[pid].push({name, text, at: Date.now()});
        save();
        const p = document.createElement('p'); p.textContent = name + ': ' + text; comments.appendChild(p);
        commentForm.reset();
        renderReviewsList();
      });

      grid.appendChild(tpl);
    });
    renderWishlist();
    renderOrders();
    renderReviewsList();
    updateCounts();
  } catch (err) {
    console.error(err);
    grid.innerHTML = '<div class="card">Could not load products (fetch blocked when opening via file://). Use a simple server: <code>python -m http.server</code> in this folder, or open products images directly inside index.html.</div>';
  }
}

function renderWishlist() {
  const ul = document.getElementById('wishlist');
  if (!ul) return;
  ul.innerHTML = '';
  if (state.wishlist.length === 0) { ul.innerHTML = '<li class="muted">No items in wishlist</li>'; return; }
  state.wishlist.forEach((it, idx) => {
    const li = document.createElement('li'); li.textContent = `${it.title} — ₹${it.price}`;
    const btn = document.createElement('button'); btn.className='btn tiny'; btn.textContent='Remove';
    btn.addEventListener('click', () => { state.wishlist.splice(idx,1); save(); renderWishlist(); });
    li.appendChild(btn); ul.appendChild(li);
  });
}

function renderOrders() {
  const ul = document.getElementById('orders');
  if (!ul) return;
  ul.innerHTML = '';
  if (state.orders.length === 0) { ul.innerHTML = '<li class="muted">No orders yet</li>'; return; }
  state.orders.forEach(o => {
    const li = document.createElement('li'); li.textContent = `${o.title} — ₹${o.price} (on ${new Date(o.at).toLocaleString()})`;
    ul.appendChild(li);
  });
}

function renderReviewsList() {
  const container = document.getElementById('reviews-list');
  if (!container) return;
  container.innerHTML = '';
  for (const pid in state.reviews) {
    state.reviews[pid].forEach(r => {
      const div = document.createElement('div'); div.className='card';
      div.textContent = `${r.name} (${new Date(r.at).toLocaleString()}): ${r.text}`;
      container.appendChild(div);
    });
  }
}

// Cart -> Place order (demo)
function placeOrder() {
  if (state.cart.length === 0) return alert('Cart is empty');
  state.cart.forEach(item => state.orders.push({...item, at: Date.now()}));
  state.cart = []; save(); renderOrders(); updateCounts();
  alert('Order placed! Check Orders section.');
}

// Simple auth handling for demo (no password hashing — localStorage only)
function setupAuthForms() {
  const regForm = document.getElementById('register-form');
  if (regForm) {
    regForm.addEventListener('submit', e => {
      e.preventDefault();
      const name = document.getElementById('reg-name').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const pass = document.getElementById('reg-pass').value;
      const conf = document.getElementById('reg-confirm').value;
      if (pass.length < 6) return alert('Password must be 6+ chars');
      if (pass !== conf) return alert('Passwords do not match');
      state.user = {name, email};
      save();
      alert('Registered and logged in as ' + name);
      window.location = 'index.html';
    });
  }

  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', e => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const pass = document.getElementById('login-pass').value;
      if (!state.user || state.user.email !== email) return alert('No user found (demo). Please register first.');
      alert('Welcome back, ' + state.user.name);
      window.location = 'index.html';
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadProducts();
  setupAuthForms();
  const cartBtn = document.getElementById('cartBtn');
  if (cartBtn) cartBtn.addEventListener('click', placeOrder);
  updateCounts();
});

// expose for debugging
window._MARVEL = { state, save };
