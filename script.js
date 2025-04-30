// 商品資料
const products = [
  { id: 1, name: '手作皮夾', category: '皮件', price: 800, stock: 10, img: 'https://via.placeholder.com/150' },
  { id: 2, name: '復古耳環', category: '飾品', price: 350, stock: 5, img: 'https://via.placeholder.com/150' },
  { id: 3, name: '精油香氛蠟燭', category: '香氛', price: 500, stock: 7, img: 'https://via.placeholder.com/150' },
  { id: 4, name: '真皮鑰匙圈', category: '皮件', price: 280, stock: 3, img: 'https://via.placeholder.com/150' },
  { id: 5, name: '手機殼', category: '飾品', price: 550, stock: 2, img: 'https://via.placeholder.com/150' }
];

let cart = JSON.parse(localStorage.getItem('cart')) || [];
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
const sellerEmails = ["seller@example.com"];
let currentUser = null;
let isSeller = false;

const productList = document.getElementById('product-list');
const cartList = document.getElementById('cart-list');
const totalPrice = document.getElementById('total-price');
const checkoutButton = document.getElementById('checkout-button');
const searchInput = document.getElementById('search-input');
const categorySelect = document.getElementById('category-select');
const sortSelect = document.getElementById('sort-select');
const clearCartButton = document.getElementById('clear-cart-button');
const orderHistoryList = document.getElementById('order-history');
const db = firebase.firestore();

// 登入狀態變化處理
firebase.auth().onAuthStateChanged(user => {
  currentUser = user;
  if (user) {
    isSeller = sellerEmails.includes(user.email);
    const name = user.displayName || user.email || "未知使用者";
    document.getElementById("user-info").innerText = `👤 ${name}（${isSeller ? '賣家' : '買家'}）`;
    document.getElementById("logout-button").style.display = "inline-block";
    document.getElementById("google-login").style.display = "none";
    document.getElementById("facebook-login").style.display = "none";
    renderOrderHistory();
  } else {
    isSeller = false;
    document.getElementById("user-info").innerText = "尚未登入";
    document.getElementById("logout-button").style.display = "none";
    document.getElementById("google-login").style.display = "inline-block";
    document.getElementById("facebook-login").style.display = "inline-block";
  }
  renderProducts();
  renderCart();
  updateTotalPrice();
  renderFavorites();
});

document.getElementById("google-login").onclick = () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithPopup(provider);
};
document.getElementById("facebook-login").onclick = () => {
  const provider = new firebase.auth.FacebookAuthProvider();
  firebase.auth().signInWithPopup(provider);
};
document.getElementById("logout-button").onclick = () => firebase.auth().signOut();

// 商品渲染
function renderProducts() {
  const keyword = searchInput.value.toLowerCase();
  const selectedCategory = categorySelect.value;
  const sortMethod = sortSelect.value;
  productList.innerHTML = '';

  let filtered = products.filter(p =>
    (selectedCategory === 'all' || p.category === selectedCategory) &&
    p.name.toLowerCase().includes(keyword)
  );

  if (sortMethod === 'low') filtered.sort((a, b) => a.price - b.price);
  if (sortMethod === 'high') filtered.sort((a, b) => b.price - a.price);
  if (sortMethod === 'name') filtered.sort((a, b) => a.name.localeCompare(b.name));

  for (const product of filtered) {
    const card = document.createElement('div');
    card.className = 'product-card';
    const warningText = product.stock <= 2 ? '<p style="color: #facc15;">⚠️ 即將售完</p>' : '';

    card.innerHTML = `
      <img src="${product.img}" alt="${product.name}">
      <h3>${product.name}</h3>
      <p>價格：$${product.price}</p>
      <p>剩餘數量：${product.stock}</p>
      ${warningText}
      <button ${product.stock === 0 ? 'disabled' : ''} onclick="orderProduct(${product.id})">
        ${product.stock === 0 ? '售完' : '我要購買'}
      </button>
      <button onclick="addToFavorites(${product.id})">收藏</button>
    `;
    if (isSeller) {
      const restockBtn = document.createElement("button");
      restockBtn.textContent = "補貨";
      restockBtn.onclick = () => restockProduct(product.id);
      card.appendChild(restockBtn);
    }
    productList.appendChild(card);
  }
}

// 購物車邏輯
function orderProduct(id) {
  const product = products.find(p => p.id === id);
  if (!product || product.stock <= 0) return;

  product.stock--;
  const item = cart.find(i => i.id === id);
  if (item) item.quantity++;
  else cart.push({ id: product.id, name: product.name, price: product.price, quantity: 1 });

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
  } else if (delta < 0 && item.quantity === 1) {
    removeItem(id);
    return;
  }

  updateCartUI();
  saveCart();
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
  const qty = parseInt(prompt(`補貨數量（目前${product.stock}）：`));
  if (!qty || qty <= 0) return;
  product.stock += qty;
  alert(`${product.name} 補貨成功，目前庫存 ${product.stock}`);
  updateCartUI();
}

// 收藏邏輯
function addToFavorites(id) {
  if (!favorites.includes(id)) {
    favorites.push(id);
    localStorage.setItem('favorites', JSON.stringify(favorites));
    alert("已加入收藏");
  }
  renderFavorites();
}

function removeFromFavorites(id) {
  favorites = favorites.filter(f => f !== id);
  localStorage.setItem('favorites', JSON.stringify(favorites));
  renderFavorites();
}

function renderFavorites() {
  const favoritesList = document.getElementById('favorites-list');
  favoritesList.innerHTML = '';
  for (const id of favorites) {
    const product = products.find(p => p.id === id);
    if (product) {
      const div = document.createElement('div');
      div.className = 'favorite-card';
      div.innerHTML = `
        <img src="${product.img}" alt="${product.name}">
        <p>${product.name}</p>
        <button onclick="removeFromFavorites(${product.id})">刪除</button>
      `;
      favoritesList.appendChild(div);
    }
  }
}

function updateTotalPrice() {
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  totalPrice.textContent = `總金額：$${total}`;
}

function saveCart() {
  localStorage.setItem('cart', JSON.stringify(cart));
}

function updateCartUI() {
  renderProducts();
  renderCart();
  updateTotalPrice();
}

// 結帳流程
checkoutButton.addEventListener('click', () => {
  if (!currentUser) return alert("請先登入再結帳！");
  if (cart.length === 0) return alert("購物車是空的！");
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const summary = cart.map(i => `${i.name} x${i.quantity}`).join(', ');
  document.getElementById('payment-summary').innerText = `${summary}\n\n總金額：$${total}`;
  document.getElementById('payment-modal').classList.remove('hidden');
});

clearCartButton.addEventListener('click', () => {
  if (!confirm("確定清空購物車？")) return;
  for (const item of cart) {
    const product = products.find(p => p.id === item.id);
    if (product) product.stock += item.quantity;
  }
  cart.length = 0;
  saveCart();
  updateCartUI();
});

document.getElementById('confirm-payment-button').addEventListener('click', async () => {
  if (!currentUser) {
    alert("請先登入才能結帳！");
    return;
  }

  const method = document.getElementById('payment-method').value;
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  alert(`✅ 使用 ${method} 完成付款，金額 $${total}`);

  const orderData = {
    user: currentUser.email || "匿名用戶",
    items: [...cart],
    total,
    date: firebase.firestore.Timestamp.now()
  };

  try {
    await db.collection('orders').add(orderData);
    alert('訂單已儲存！');
    cart = [];
    saveCart();
    updateCartUI();
    renderOrderHistory();
    document.getElementById('payment-modal').classList.add('hidden');
  } catch (e) {
    console.error('儲存訂單失敗', e);
    alert('訂單儲存失敗');
  }
});

document.getElementById('cancel-payment-button').addEventListener('click', () => {
  document.getElementById('payment-modal').classList.add('hidden');
});

// 歷史訂單
function renderOrderHistory() {
  if (!currentUser) return;
  orderHistoryList.innerHTML = '';

  db.collection('orders').where('user', '==', currentUser.email)
    .orderBy('date', 'desc')
    .get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        const order = doc.data();
        const li = document.createElement('li');
        li.textContent = `訂單日期：${order.date.toDate().toLocaleString()} - 總金額：$${order.total}`;
        orderHistoryList.appendChild(li);
      });
    })
    .catch(err => {
      console.error("讀取訂單失敗", err);
    });
}

// 監聽器
searchInput.addEventListener('input', renderProducts);
categorySelect.addEventListener('change', renderProducts);
sortSelect.addEventListener('change', renderProducts);
