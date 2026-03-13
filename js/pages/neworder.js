'use strict';
// ══════════════════════════════════════════════════════════════
// NEW ORDER PAGE — Full page order creation with improved UX
// ══════════════════════════════════════════════════════════════

let newOrderPreviousPage = 'orders';
let newOrderProductSearch = '';

function openNewOrderPage(preCustomerId, fromPage) {
  editingOrderId = null;
  tempOrderItems = [{ name: '', qty: 1, price: 0 }];
  tempOrderCustomerId = preCustomerId != null ? preCustomerId : null;
  tempOrderDeliveryDate = '';
  newOrderPreviousPage = fromPage || curPage || 'orders';
  newOrderProductSearch = '';
  showPage('neworder');
}

function openEditOrderPage(orderId, fromPage) {
  const order = S.orders[orderId];
  if (!order) return;
  editingOrderId = orderId;
  tempOrderCustomerId = order.customerId;
  tempOrderItems = order.items.map(i => ({ ...i }));
  if (tempOrderItems.length === 0) tempOrderItems = [{ name: '', qty: 1, price: 0 }];
  tempOrderDeliveryDate = order.deliveryDate || '';
  newOrderPreviousPage = fromPage || curPage || 'orders';
  newOrderProductSearch = '';
  showPage('neworder');
}

function closeNewOrderPage() {
  showPage(newOrderPreviousPage);
}

function renderNewOrderPage() {
  const isEdit = !!editingOrderId;
  const title = isEdit ? 'Edit Order' : 'New Order';
  const selectedStop = tempOrderCustomerId != null ? getStop(tempOrderCustomerId) : null;

  // Calculate cart
  const cartItems = tempOrderItems.filter(i => i.name);
  const total = cartItems.reduce((s, i) => s + (i.qty || 0) * (i.price || 0), 0);

  // Existing note
  const noteEl = document.getElementById('neworder-note');
  const existingNote = noteEl ? noteEl.value : (isEdit && S.orders[editingOrderId] ? S.orders[editingOrderId].note || '' : '');

  let html = `
    <header class="topbar">
      <button class="btn-ghost" onclick="closeNewOrderPage()" style="font-size:20px;padding:4px 8px">&larr;</button>
      <h1 style="flex:1">${title}</h1>
      ${cartItems.length > 0 ? `<span class="badge badge-info">${cartItems.length} items</span>` : ''}
    </header>
    <div class="page-body" id="neworder-body">

      <!-- CUSTOMER SECTION -->
      <div class="neworder-section">
        <div class="neworder-section-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          Customer
        </div>
        <div class="neworder-customer-select ${selectedStop ? 'selected' : ''}"
             onclick="${isEdit ? '' : 'openNewOrderCustomerPicker()'}"
             style="${isEdit ? 'opacity:0.6;cursor:default' : ''}">
          <div class="neworder-customer-avatar">
            ${selectedStop ? escHtml(selectedStop.n.substring(0,2).toUpperCase()) : '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>'}
          </div>
          <div style="flex:1;min-width:0">
            <div style="font-size:15px;font-weight:600;${selectedStop ? '' : 'color:var(--text-muted)'}">${selectedStop ? escHtml(selectedStop.n) : 'Select a customer'}</div>
            ${selectedStop ? `<div style="font-size:12px;color:var(--text-sec)">${escHtml(selectedStop.c || '')}${selectedStop.p ? ' · ' + escHtml(selectedStop.p) : ''}</div>` : '<div style="font-size:12px;color:var(--text-muted)">Tap to choose</div>'}
          </div>
          ${!isEdit ? '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--text-muted)" stroke-width="2" style="flex-shrink:0"><polyline points="9 18 15 12 9 6"/></svg>' : ''}
        </div>
      </div>

      <!-- PRODUCTS SECTION -->
      <div class="neworder-section">
        <div class="neworder-section-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
          Products
        </div>
        ${buildNewOrderProductGrid()}
      </div>

      <!-- CART SECTION -->
      ${cartItems.length > 0 ? `
      <div class="neworder-section">
        <div class="neworder-section-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
          Cart (${cartItems.length})
        </div>
        ${buildNewOrderCartHtml(cartItems)}
      </div>` : ''}

      <!-- DETAILS SECTION -->
      <div class="neworder-section">
        <div class="neworder-section-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          Details
        </div>
        <div class="form-group" style="margin-bottom:10px">
          <label class="form-label">Delivery Date</label>
          <input class="input" type="date" id="neworder-delivery-date" value="${tempOrderDeliveryDate}" min="${new Date().toISOString().split('T')[0]}" onchange="tempOrderDeliveryDate=this.value">
          ${!tempOrderDeliveryDate ? '<div class="text-muted" style="font-size:11px;margin-top:4px">Defaults to today if empty</div>' : ''}
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">Note (optional)</label>
          <textarea class="textarea" id="neworder-note" rows="2" style="min-height:50px">${escHtml(existingNote)}</textarea>
        </div>
      </div>

      <div style="height:16px"></div>
    </div>

    <!-- TOTAL + SAVE -->
    <div class="neworder-total-bar">
      <span class="neworder-total-label">Total</span>
      <span class="neworder-total-value">${formatCurrency(total)}</span>
    </div>
    <div class="neworder-footer">
      <button class="btn btn-primary btn-block" onclick="saveNewOrderPage()" style="font-size:16px;padding:14px">${isEdit ? 'Update Order' : 'Save Order'}</button>
    </div>`;

  document.getElementById('page-neworder').innerHTML = html;
}

function buildNewOrderProductGrid() {
  const q = newOrderProductSearch.toLowerCase().trim();
  let filtered = S.catalog;
  if (q) filtered = filtered.filter(c => c.name.toLowerCase().includes(q));
  const selectedNames = tempOrderItems.filter(i => i.name).map(i => i.name);

  let html = `
    <div class="neworder-search-bar" style="padding:0 0 8px 0">
      <div style="position:relative">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);width:16px;height:16px;color:var(--text-muted)"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" placeholder="Search products..." value="${escHtml(newOrderProductSearch)}"
               oninput="newOrderProductSearch=this.value;rerenderNewOrderProducts()"
               style="width:100%;padding:8px 12px 8px 34px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:14px;background:var(--bg)">
      </div>
    </div>
    <div class="neworder-product-grid">`;

  filtered.forEach(c => {
    const isSelected = selectedNames.includes(c.name);
    const outOfStock = c.trackStock !== false && c.stock != null && c.stock <= 0;
    const price = tempOrderCustomerId != null ? getPrice(tempOrderCustomerId, c.name) : c.price;
    const stockLabel = c.trackStock !== false && c.stock != null ? c.stock + ' left' : '';

    html += `
      <div class="neworder-product-chip ${isSelected ? 'selected' : ''} ${outOfStock ? 'out-of-stock' : ''}"
           onclick="${outOfStock ? '' : `toggleNewOrderProduct('${escHtml(c.name)}')`}">
        <div class="neworder-product-chip-name">${escHtml(c.name)}</div>
        <div class="neworder-product-chip-price">${formatCurrency(price)}</div>
        ${stockLabel ? `<div class="neworder-product-chip-stock" ${c.stock <= 5 ? 'style="color:var(--danger)"' : ''}>${stockLabel}</div>` : ''}
        ${isSelected ? '<div style="color:var(--primary);font-size:18px;margin-top:2px">&#10003;</div>' : ''}
      </div>`;
  });

  if (filtered.length === 0) {
    html += '<div style="grid-column:1/-1;text-align:center;padding:20px;color:var(--text-muted)">No products found</div>';
  }

  html += '</div>';
  return html;
}

function buildNewOrderCartHtml(cartItems) {
  let html = '';
  cartItems.forEach((item, idx) => {
    const actualIdx = tempOrderItems.indexOf(item);
    const lineTotal = (item.qty || 0) * (item.price || 0);
    html += `
      <div class="neworder-cart-item">
        <div class="neworder-cart-item-info">
          <div class="neworder-cart-item-name">${escHtml(item.name)}</div>
          <div class="neworder-cart-item-price">${formatCurrency(item.price)} each</div>
        </div>
        <div class="neworder-cart-item-controls">
          <button class="qty-btn" onclick="newOrderChangeQty(${actualIdx},-1)">−</button>
          <input type="number" class="qty-input" value="${item.qty}" min="1"
                 onchange="newOrderSetQty(${actualIdx},parseInt(this.value)||1)"
                 onclick="this.select()">
          <button class="qty-btn" onclick="newOrderChangeQty(${actualIdx},1)">+</button>
        </div>
        <div class="neworder-cart-item-total">${formatCurrency(lineTotal)}</div>
        <button style="width:28px;height:28px;display:flex;align-items:center;justify-content:center;color:var(--text-muted);flex-shrink:0" onclick="newOrderRemoveItem(${actualIdx})">&#10005;</button>
      </div>`;
  });
  return html;
}

function rerenderNewOrderProducts() {
  // Preserve scroll
  const body = document.getElementById('neworder-body');
  const scrollPos = body ? body.scrollTop : 0;
  renderNewOrderPage();
  const newBody = document.getElementById('neworder-body');
  if (newBody) newBody.scrollTop = scrollPos;
  // Re-focus search
  const searchInput = document.querySelector('#page-neworder .neworder-search-bar input');
  if (searchInput) { searchInput.focus(); searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length); }
}

function toggleNewOrderProduct(productName) {
  const existingIdx = tempOrderItems.findIndex(i => i.name === productName);
  if (existingIdx >= 0) {
    tempOrderItems.splice(existingIdx, 1);
    if (tempOrderItems.length === 0) tempOrderItems.push({ name: '', qty: 1, price: 0 });
  } else {
    const price = tempOrderCustomerId != null ? getPrice(tempOrderCustomerId, productName) : (S.catalog.find(c => c.name === productName)?.price || 0);
    const emptyIdx = tempOrderItems.findIndex(i => !i.name);
    if (emptyIdx >= 0) {
      tempOrderItems[emptyIdx] = { name: productName, qty: 1, price };
    } else {
      tempOrderItems.push({ name: productName, qty: 1, price });
    }
  }
  rerenderNewOrderProducts();
}

function newOrderChangeQty(idx, delta) {
  if (!tempOrderItems[idx]) return;
  const newQty = (tempOrderItems[idx].qty || 1) + delta;
  if (newQty < 1) return;
  tempOrderItems[idx].qty = newQty;
  rerenderNewOrderProducts();
}

function newOrderSetQty(idx, qty) {
  if (!tempOrderItems[idx]) return;
  tempOrderItems[idx].qty = Math.max(1, qty);
  // Update totals in-place
  const cartItems = tempOrderItems.filter(i => i.name);
  const total = cartItems.reduce((s, i) => s + (i.qty || 0) * (i.price || 0), 0);
  const totalEl = document.querySelector('.neworder-total-value');
  if (totalEl) totalEl.textContent = formatCurrency(total);
}

function newOrderRemoveItem(idx) {
  tempOrderItems.splice(idx, 1);
  if (tempOrderItems.length === 0) tempOrderItems.push({ name: '', qty: 1, price: 0 });
  rerenderNewOrderProducts();
}

function openNewOrderCustomerPicker() {
  if (editingOrderId) return;
  const overlay = document.createElement('div');
  overlay.className = 'customer-picker-overlay';
  overlay.id = 'customer-picker';
  overlay.innerHTML = `
    <div class="cpick-header">
      <button class="btn-ghost" onclick="closeNewOrderCustomerPicker()" style="font-size:20px;padding:4px">&larr;</button>
      <input type="text" id="cpick-search" placeholder="Search customer..." autofocus
             oninput="filterNewOrderCPicker(this.value)">
    </div>
    <div class="cpick-list" id="cpick-list"></div>
  `;
  document.body.appendChild(overlay);
  filterNewOrderCPicker('');
}

function closeNewOrderCustomerPicker() {
  const el = document.getElementById('customer-picker');
  if (el) el.remove();
}

function filterNewOrderCPicker(q) {
  const list = document.getElementById('cpick-list');
  if (!list) return;
  const query = q.toLowerCase().trim();
  let filtered = STOPS;
  if (query) filtered = STOPS.filter(s =>
    s.n.toLowerCase().includes(query) ||
    (s.c||'').toLowerCase().includes(query) ||
    (s.p||'').toLowerCase().includes(query)
  );
  filtered.sort((a, b) => a.n.localeCompare(b.n));
  list.innerHTML = filtered.map(s => {
    const dayId = S.assign[s.id];
    const dayObj = dayId ? DAYS.find(d => d.id === dayId) : null;
    return `<div class="cpick-item" onclick="pickNewOrderCustomer(${s.id})">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="font-weight:500;flex:1">${escHtml(s.n)}</div>
        ${dayObj ? `<span class="badge" style="background:${dayObj.color}20;color:${dayObj.color};font-size:10px">${dayObj.week}-${dayObj.label.slice(0,3)}</span>` : ''}
      </div>
      <div style="font-size:12px;color:var(--text-sec)">${escHtml(s.c || '')} &middot; ${escHtml(s.p || '')}</div>
    </div>`;
  }).join('');
}

function pickNewOrderCustomer(stopId) {
  tempOrderCustomerId = stopId;
  closeNewOrderCustomerPicker();
  // Update prices for selected customer
  tempOrderItems.forEach(item => {
    if (item.name) {
      item.price = getPrice(stopId, item.name);
    }
  });
  renderNewOrderPage();
}

function saveNewOrderPage() {
  if (_btnLock) return;
  _btnLock = true;
  setTimeout(() => _btnLock = false, 500);

  if (tempOrderCustomerId == null) { appAlert('Please select a customer.'); return; }
  const items = tempOrderItems.filter(i => i.name && i.qty > 0);
  if (items.length === 0) { appAlert('Please add at least one product.'); return; }

  const existingOrder = editingOrderId ? S.orders[editingOrderId] : null;
  const previousItems = existingOrder ? (existingOrder.items || []) : [];
  const stockIssues = validateTrackedStockChange(previousItems, items);
  if (stockIssues.length > 0) {
    appAlert('Insufficient stock: ' + stockIssues.join(', '));
    return;
  }

  const note = document.getElementById('neworder-note')?.value || '';
  const deliveryDate = document.getElementById('neworder-delivery-date')?.value || '';

  let newOrderId = null;
  if (editingOrderId && existingOrder) {
    existingOrder.items = items.map(i => ({ name: i.name, qty: i.qty, price: i.price }));
    existingOrder.note = note;
    existingOrder.deliveryDate = deliveryDate;
  } else {
    newOrderId = uid();
    S.orders[newOrderId] = {
      id: newOrderId,
      customerId: parseInt(tempOrderCustomerId),
      items: items.map(i => ({ name: i.name, qty: i.qty, price: i.price })),
      note,
      deliveryDate,
      status: 'pending',
      payMethod: null,
      createdAt: new Date().toISOString(),
      deliveredAt: null
    };
  }

  const stockChange = applyTrackedStockChange(previousItems, items);
  if (stockChange.changed) {
    save.catalog();
    if (stockChange.lowStockWarnings.length > 0) {
      setTimeout(() => appAlert('Low stock:<br>' + stockChange.lowStockWarnings.join('<br>')), 300);
    }
  }

  const savedOrderId = editingOrderId || newOrderId;
  editingOrderId = null;
  save.orders([savedOrderId]);

  showToast(newOrderId ? 'Order created' : 'Order updated', 'success');
  showPage(newOrderPreviousPage);
}
