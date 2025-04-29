const products = [
  { id: 1, name: '手作皮夾', category: '皮件', price: 800, stock: 10, img: 'https://via.placeholder.com/150' },
  { id: 2, name: '復古耳環', category: '飾品', price: 350, stock: 5, img: 'https://via.placeholder.com/150' },
  { id: 3, name: '精油香氛蠟燭', category: '香氛', price: 500, stock: 7, img: 'https://via.placeholder.com/150' },
  { id: 4, name: '真皮鑰匙圈', category: '皮件', price: 280, stock: 3, img: 'https://via.placeholder.com/150' },
  { id: 5, name: '手機殼', category: '飾品', price: 550, stock: 4, img: 'https://via.placeholder.com/150' }
];

const cart = JSON.parse(localStorage.getItem('cart')) || [];

const productList = document.getElementById('product-list');
const cartList = document.getElementById('cart-list');
const totalPrice = document.getElementById('total-price');
const checkoutButton = document.getElementById('checkout-button');
const searchInput = document.getElementById('search-input');
const categorySelect = document.getElementById('category-select');
const sortSelect = document.getElementById('sort-select');
const clearCartButton = document.getElementById('clear-cart-button');

function renderProducts() {
  const keyword = searchInput.value.toLowerCase();
  const selectedCategory = categorySelect.value;
  const sortMethod = sortSelect.value;

  productList.innerHTML = '';

  let filtered = products.filter(p =>
    (selectedCategory === 'all' || p.category === selectedCategory) &&
    p.name.toLowerCase().includes(keyword)
  );

  if (sortMethod === 'low') {
    filtered.sort((a, b) => a.price - b.price);
  } else if (sortMethod === 'high') {
    filtered.sort((a, b) => b.price - a.price);
  }

  for (const product of filtered) {
    const card = document.createElement('div');
    card.className = 'product-card';

    card.innerHTML = `
      <img src="${product.img}" alt="${product.name}">
      <h3>${product.name}</h3>
      <p>價格：$${product.price}</p>
      <p>剩餘數量：${product.stock}</p>
      <button ${product.stock === 0 ? 'disabled' : ''} onclick="orderProduct(${product.id})">
        ${product.stock === 0 ? '售完' : '我要購買'}
      </button>
      <button class="restock-button" onclick="restockProduct(${product.id})">補貨</button>
    `;
    productList.appendChild(card);
  }
}

function orderProduct(id) {
  const product = products.find(p => p.id === id);
  if (!product || product.stock <= 0) return;

  product.stock--;

  const item = cart.find(i => i.id === id);
  if (item) {
    item.quantity++;
  } else {
    cart.push({ id: product.id, name: product.name, price: product.price, quantity: 1 });
  }

  updateCartUI();
  saveCart();
}

function renderCart() {
  cartList.innerHTML = '';

  for (const item of cart) {
    const div = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML = `
      ${item.name} x ${item.quantity}（$${item.price}）
      <div>
        <button onclick="changeQuantity(${item.id}, -1)">−</button>
        <button onclick="changeQuantity(${item.id}, 1)">＋</button>
        <button onclick="removeItem(${item.id})">刪除</button>
      </div>
    `;
    cartList.appendChild(div);
  }
}

function changeQuantity(id, delta) {
  const item = cart.find(i => i.id === id);
  const product = products.find(p => p.id === id);
  if (!item || !product) return;

  if (delta > 0 && product.stock > 0) {
    item.quantity++;
    product.stock--;
  } else if (delta < 0 && item.quantity > 1) {
    item.quantity--;
    product.stock++;
  }

  updateCartUI();
  saveCart();
}

function updateTotalPrice() {
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  totalPrice.textContent = `總金額：$${total}`;
}

function removeItem(id) {
  const index = cart.findIndex(i => i.id === id);
  if (index !== -1) {
    const item = cart[index];
    const product = products.find(p => p.id === item.id);
    if (product) product.stock += item.quantity;

    cart.splice(index, 1);
    updateCartUI();
    saveCart();
  }
}

function restockProduct(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;

  let valid = false;
  while (!valid) {
    const input = prompt(`請輸入要補貨的數量（目前庫存：${product.stock}）\n輸入空白可取消補貨。`);
    if (input === null || input.trim() === "") {
      alert("補貨已取消。");
      return;
    }

    const qty = parseInt(input);
    if (!isNaN(qty) && qty > 0) {
      product.stock += qty;
      alert(`✅ 補貨成功！${product.name} 新庫存為 ${product.stock}`);
      updateCartUI();
      valid = true;
    } else {
      alert("⚠️ 請輸入有效的正整數！");
    }
  }
}

function notifyOwnerDiscord(orderDetails) {
  fetch("https://discord.com/api/webhooks/1366757938508595251/0-htYA_OHYUQpV5JxlleuOvLDo2nfgUQ-0NMye9dfy3QbMC7gSeVkGJvU_tse2y6--vV", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: `📦 **新訂單通知！**\n${orderDetails}`
    })
  });
}

checkoutButton.addEventListener('click', () => {
  if (cart.length === 0) {
    alert("購物車是空的！");
    return;
  }

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const orderSummary = cart.map(i => `${i.name} x${i.quantity}`).join(', ') + `\n總金額：$${total}`;
  alert(`感謝購買！總金額為 $${total}`);

  notifyOwnerDiscord(orderSummary); // ✅ Discord 通知

  cart.length = 0;
  renderCart();
  updateTotalPrice();
  saveCart();
});

clearCartButton.addEventListener('click', () => {
  if (confirm("確定要清空購物車嗎？")) {
    for (const item of cart) {
      const product = products.find(p => p.id === item.id);
      if (product) product.stock += item.quantity;
    }
    cart.length = 0;
    updateCartUI();
    saveCart();
  }
});

function updateCartUI() {
  renderProducts();
  renderCart();
  updateTotalPrice();
}

searchInput.addEventListener('input', renderProducts);
categorySelect.addEventListener('change', renderProducts);
sortSelect.addEventListener('change', renderProducts);

renderProducts();
renderCart();
updateTotalPrice();