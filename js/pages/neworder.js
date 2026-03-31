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
  const page = newOrderPreviousPage || 'orders';
  showPage(page);
}

function renderNewOrderPage() {
  const isEdit = !!editingOrderId;
  const title = isEdit ? 'Edit Order' : 'New Order';
  const selectedStop = tempOrderCustomerId != null ? getStop(tempOrderCustomerId) : null;

  // Calculate cart
  const cartItems = tempOrderItems.filter(i => i.name);
  const total = roundMoney(cartItems.reduce((s, i) => s + (i.qty || 0) * (i.price || 0), 0));

  // Existing note - only preserve from DOM during re-renders of the same order,
  // never carry over from a previous order session
  const noteEl = document.getElementById('neworder-note');
  const existingNote = noteEl && noteEl.dataset.orderId === (editingOrderId || '__new__')
    ? noteEl.value
    : (isEdit && S.orders[editingOrderId] ? S.orders[editingOrderId].note || '' : '');

  // Selected product count
  const selectedCount = cartItems.length;

  let html = `
    <header class="topbar">
      <button class="btn-ghost" onclick="closeNewOrderPage()" style="font-size:20px;padding:4px 8px">&larr;</button>
      <h1 style="flex:1">${title}</h1>
      ${selectedCount > 0 ? `<span class="badge badge-info">${selectedCount} items</span>` : ''}
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

      <!-- PRODUCTS SECTION (merged with cart) -->
      <div class="neworder-section">
        <div class="neworder-section-title" style="justify-content:space-between">
          <div style="display:flex;align-items:center;gap:6px">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
            Products${selectedCount > 0 ? ' (' + selectedCount + ')' : ''}
          </div>
          <button class="btn-ghost" onclick="openNewOrderProductPicker()" style="font-size:13px;color:var(--primary);font-weight:600;padding:4px 8px">
            + Add
          </button>
        </div>
        ${buildNewOrderProductsCartMerged(cartItems)}
      </div>

      <!-- DETAILS SECTION -->
      <div class="neworder-section">
        <div class="neworder-section-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          Details
        </div>
        <div class="form-group" style="margin-bottom:10px">
          <label class="form-label">Delivery Date & Time</label>
          <input class="input" type="date" id="neworder-delivery-date-hidden"
                 value="${(tempOrderDeliveryDate || '').slice(0, 10)}"
                 onchange="newOrderSetDeliveryDate(this.value)">
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">Note (optional)</label>
          <textarea class="textarea" id="neworder-note" data-order-id="${editingOrderId || '__new__'}" rows="2" style="min-height:50px">${escHtml(existingNote)}</textarea>
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
  initCartDragDrop();
}

// ── Cart Drag-Drop ──

let _cartDragAbort = null;
function initCartDragDrop() {
  const list = document.getElementById('neworder-cart-list');
  if (!list || list.children.length < 2) return;

  if (_cartDragAbort) _cartDragAbort.abort();
  _cartDragAbort = new AbortController();
  const signal = _cartDragAbort.signal;

  let touchDragIdx = null;
  let touchClone = null;
  let touchStartY = 0;
  let touchStartX = 0;
  let longPressTimer = null;
  let dragOverEl = null;
  let _rafPending = false;

  list.addEventListener('touchstart', e => {
    const handle = e.target.closest('.cart-drag-handle');
    if (!handle) return;
    const row = handle.closest('.draggable-cart');
    if (!row) return;
    touchStartY = e.touches[0].clientY;
    touchStartX = e.touches[0].clientX;
    longPressTimer = setTimeout(() => {
      touchDragIdx = parseInt(row.dataset.idx);
      row.classList.add('dragging');
      touchClone = row.cloneNode(true);
      touchClone.style.cssText = 'position:fixed;z-index:9999;pointer-events:none;opacity:0.85;width:' + row.offsetWidth + 'px;box-shadow:0 8px 24px rgba(0,0,0,0.2);left:' + row.getBoundingClientRect().left + 'px;top:' + (e.touches[0].clientY - 20) + 'px;will-change:transform;background:var(--card);border-radius:8px';
      document.body.appendChild(touchClone);
      if (navigator.vibrate) navigator.vibrate(30);
    }, 200);
  }, { passive: true, signal });

  list.addEventListener('touchmove', e => {
    if (touchDragIdx == null) {
      if (longPressTimer) {
        const dx = e.touches[0].clientX - touchStartX;
        const dy = e.touches[0].clientY - touchStartY;
        if (dx * dx + dy * dy > 100) { clearTimeout(longPressTimer); longPressTimer = null; }
      }
      return;
    }
    e.preventDefault();
    if (_rafPending) return;
    _rafPending = true;
    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;
    requestAnimationFrame(() => {
      _rafPending = false;
      if (touchClone) touchClone.style.transform = 'translateY(' + (touchY - touchStartY) + 'px) scale(0.97)';
      if (dragOverEl) dragOverEl.classList.remove('drag-over');
      const el = document.elementFromPoint(touchX, touchY);
      if (el) {
        const target = el.closest('.draggable-cart');
        if (target && parseInt(target.dataset.idx) !== touchDragIdx) {
          target.classList.add('drag-over');
          dragOverEl = target;
        } else { dragOverEl = null; }
      }
    });
  }, { passive: false, signal });

  list.addEventListener('touchend', e => {
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
    if (touchDragIdx == null) return;
    if (touchClone) { touchClone.remove(); touchClone = null; }
    list.querySelectorAll('.draggable-cart').forEach(r => { r.classList.remove('dragging'); r.classList.remove('drag-over'); });
    const el = document.elementFromPoint(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    if (el) {
      const target = el.closest('.draggable-cart');
      if (target) {
        const targetIdx = parseInt(target.dataset.idx);
        if (targetIdx !== touchDragIdx) {
          // Reorder tempOrderItems
          const item = tempOrderItems.splice(touchDragIdx, 1)[0];
          tempOrderItems.splice(targetIdx, 0, item);
          renderNewOrderPage();
          return;
        }
      }
    }
    touchDragIdx = null;
  }, { signal });
}

function formatDateForDisplay(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function newOrderSetDeliveryDate(val) {
  tempOrderDeliveryDate = val;
  const display = document.getElementById('neworder-delivery-date-display');
  if (display) display.value = val ? formatDateForDisplay(val) : '';
}

// ── Merged Products + Cart ──

function buildNewOrderProductsCartMerged(cartItems) {
  if (cartItems.length === 0) {
    return `<div style="text-align:center;padding:20px 16px;color:var(--text-muted)">
      <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" style="margin:0 auto 8px;display:block;opacity:0.4"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
      <div style="font-size:13px">Tap <b>+ Add</b> to select products</div>
    </div>`;
  }

  let html = '<div id="neworder-cart-list">';
  cartItems.forEach(item => {
    const actualIdx = tempOrderItems.indexOf(item);
    const lineTotal = (item.qty || 0) * (item.price || 0);
    const cat = S.catalog.find(c => c.name === item.name);
    const isCustomProduct = tempOrderCustomerId != null &&
      S.customerProducts[tempOrderCustomerId] &&
      S.customerProducts[tempOrderCustomerId].includes(item.name);
    const hasCustomPrice = tempOrderCustomerId != null &&
      S.customerPricing[tempOrderCustomerId] &&
      S.customerPricing[tempOrderCustomerId][item.name] !== undefined;

    html += `
      <div class="no-product-row draggable-cart" data-idx="${actualIdx}">
        <div class="no-product-row-top">
          <div class="cart-drag-handle" style="cursor:grab;padding:4px 2px 4px 0;color:var(--text-muted);font-size:14px;flex-shrink:0;touch-action:none">⠿</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:14px;font-weight:600;display:flex;align-items:center;gap:4px;flex-wrap:wrap">
              ${escHtml(item.name)}
              ${isCustomProduct ? '<span class="badge badge-purple" style="font-size:9px;padding:1px 5px">Assigned</span>' : ''}
              ${hasCustomPrice ? '<span class="badge badge-info" style="font-size:9px;padding:1px 5px">Special</span>' : ''}
            </div>
          </div>
          <div style="font-size:15px;font-weight:700;flex-shrink:0">${formatCurrency(lineTotal)}</div>
          <button class="no-product-remove" onclick="newOrderRemoveItem(${actualIdx})">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="no-product-row-bottom">
          <div style="display:flex;align-items:center;gap:4px">
            <span style="font-size:12px;color:var(--text-sec)">&pound;</span>
            <input type="number" step="0.01" value="${item.price.toFixed(2)}"
                   onchange="newOrderSetPrice(${actualIdx},parseFloat(this.value)||0)"
                   onclick="this.select()"
                   class="no-price-input">
            <span style="font-size:11px;color:var(--text-muted)">/${cat ? escHtml(cat.unit || 'ea') : 'ea'}</span>
          </div>
          <div class="no-qty-controls">
            <button class="qty-btn" onclick="newOrderChangeQty(${actualIdx},-1)">&minus;</button>
            <input type="number" class="qty-input" value="${item.qty}" min="1"
                   onchange="newOrderSetQty(${actualIdx},parseInt(this.value)||1)"
                   onclick="this.select()">
            <button class="qty-btn" onclick="newOrderChangeQty(${actualIdx},1)">+</button>
          </div>
        </div>
      </div>`;
  });
  html += '</div>';
  return html;
}

// ── Product Picker Overlay (like customer picker) ──

function openNewOrderProductPicker() {
  const overlay = document.createElement('div');
  overlay.className = 'product-picker-overlay';
  overlay.id = 'neworder-product-picker';
  overlay.innerHTML = `
    <div class="ppick-header">
      <button class="btn-ghost" onclick="closeNewOrderProductPicker()" style="font-size:20px;padding:4px">&larr;</button>
      <input type="text" id="ppick-search-input" placeholder="Search products..." autofocus
             oninput="filterNewOrderProductPicker(this.value)">
      <button class="btn btn-primary btn-sm" onclick="closeNewOrderProductPicker()" style="min-width:60px">Done</button>
    </div>
    <div class="ppick-list" id="ppick-product-list"></div>
  `;
  document.body.appendChild(overlay);
  filterNewOrderProductPicker('');
}

function closeNewOrderProductPicker() {
  const el = document.getElementById('neworder-product-picker');
  if (el) el.remove();
  renderNewOrderPage();
}

function filterNewOrderProductPicker(q) {
  const list = document.getElementById('ppick-product-list');
  if (!list) return;
  const query = q.toLowerCase().trim();
  const selectedNames = tempOrderItems.filter(i => i.name).map(i => i.name);

  // Separate customer-assigned products and others
  const customerProducts = tempOrderCustomerId != null ?
    (S.customerProducts[tempOrderCustomerId] || []) : [];

  let allProducts = [...S.catalog];
  if (query) allProducts = allProducts.filter(c => c.name.toLowerCase().includes(query));

  // Sort: customer-assigned first, then rest
  allProducts.sort((a, b) => {
    const aAssigned = customerProducts.includes(a.name) ? 0 : 1;
    const bAssigned = customerProducts.includes(b.name) ? 0 : 1;
    if (aAssigned !== bAssigned) return aAssigned - bAssigned;
    return a.name.localeCompare(b.name);
  });

  let html = '';
  let lastWasAssigned = null;

  const committed = getCommittedStock();
  allProducts.forEach(c => {
    const isAssigned = customerProducts.includes(c.name);
    const isSelected = selectedNames.includes(c.name);
    const comm = committed[c.name] || 0;
    const available = c.stock != null ? (c.stock - comm) : null;
    const outOfStock = c.trackStock !== false && available != null && available <= 0;
    const price = tempOrderCustomerId != null ? getPrice(tempOrderCustomerId, c.name) : c.price;
    const hasCustomPrice = tempOrderCustomerId != null &&
      S.customerPricing[tempOrderCustomerId] &&
      S.customerPricing[tempOrderCustomerId][c.name] !== undefined;
    const stockInfo = c.trackStock !== false && c.stock != null
      ? (comm > 0 ? available + ' available (' + comm + ' pending)' : c.stock + ' in stock')
      : '';

    // Section header
    if (lastWasAssigned === null && isAssigned && !query) {
      html += `<div style="padding:8px 16px;font-size:11px;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:0.5px;background:var(--primary-light)">Assigned to this customer</div>`;
    } else if (lastWasAssigned === true && !isAssigned && !query) {
      html += `<div style="padding:8px 16px;font-size:11px;font-weight:700;color:var(--text-sec);text-transform:uppercase;letter-spacing:0.5px;background:var(--bg)">All Products</div>`;
    }
    lastWasAssigned = isAssigned;

    html += `
      <div class="ppick-item ${isSelected ? 'selected' : ''}" style="${outOfStock && !isSelected ? 'opacity:0.5' : ''}"
           data-product="${escHtml(c.name)}" data-oos="${outOfStock ? '1' : ''}" onclick="toggleNewOrderProductFromPicker(this.dataset.product, this.dataset.oos === '1')">
        <div class="ppick-item-info">
          <div class="ppick-item-name" style="display:flex;align-items:center;gap:4px">
            ${escHtml(c.name)}
            ${isAssigned ? '<span class="badge badge-purple" style="font-size:9px;padding:1px 5px">Assigned</span>' : ''}
            ${hasCustomPrice ? '<span class="badge badge-info" style="font-size:9px;padding:1px 5px">Special</span>' : ''}
          </div>
          <div class="ppick-item-detail">
            ${escHtml(c.unit || 'unit')}${stockInfo ? ' &middot; ' + stockInfo : ''}${outOfStock ? ' &middot; <span style="color:var(--danger);font-weight:600">Out of stock</span>' : ''}
          </div>
        </div>
        <div class="ppick-item-price">${formatCurrency(price)}</div>
        <div class="ppick-item-check">
          ${isSelected ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
        </div>
      </div>`;
  });

  if (allProducts.length === 0) {
    html = '<div style="padding:40px;text-align:center;color:var(--text-muted)">No products found</div>';
  }

  list.innerHTML = html;
}

async function toggleNewOrderProductFromPicker(productName, isOutOfStock) {
  const existingIdx = tempOrderItems.findIndex(i => i.name === productName);
  if (existingIdx >= 0) {
    tempOrderItems.splice(existingIdx, 1);
    if (tempOrderItems.length === 0) tempOrderItems.push({ name: '', qty: 1, price: 0 });
  } else {
    // Warn if out of stock but allow adding
    if (isOutOfStock) {
      const proceed = await appConfirm('No stock in van for <b>' + escHtml(productName) + '</b>.<br>Add to order anyway? You\'ll need to load from warehouse.', true);
      if (!proceed) return;
    }
    const price = tempOrderCustomerId != null ? getPrice(tempOrderCustomerId, productName) : (S.catalog.find(c => c.name === productName)?.price || 0);
    const emptyIdx = tempOrderItems.findIndex(i => !i.name);
    if (emptyIdx >= 0) {
      tempOrderItems[emptyIdx] = { name: productName, qty: 1, price };
    } else {
      tempOrderItems.push({ name: productName, qty: 1, price });
    }
  }
  // Re-filter to update checkmarks
  const searchInput = document.getElementById('ppick-search-input');
  filterNewOrderProductPicker(searchInput ? searchInput.value : '');
}

function rerenderNewOrderKeepScroll() {
  const body = document.getElementById('neworder-body');
  const scrollPos = body ? body.scrollTop : 0;
  renderNewOrderPage();
  const newBody = document.getElementById('neworder-body');
  if (newBody) newBody.scrollTop = scrollPos;
}

function newOrderChangeQty(idx, delta) {
  if (!tempOrderItems[idx]) return;
  const newQty = (tempOrderItems[idx].qty || 1) + delta;
  if (newQty < 1) return;
  tempOrderItems[idx].qty = newQty;
  rerenderNewOrderKeepScroll();
}

function newOrderSetQty(idx, qty) {
  if (!tempOrderItems[idx]) return;
  tempOrderItems[idx].qty = Math.max(1, qty);
  rerenderNewOrderKeepScroll();
}

function newOrderSetPrice(idx, price) {
  if (!tempOrderItems[idx]) return;
  tempOrderItems[idx].price = Math.max(0, price);
  rerenderNewOrderKeepScroll();
}

function newOrderRemoveItem(idx) {
  tempOrderItems.splice(idx, 1);
  if (tempOrderItems.length === 0) tempOrderItems.push({ name: '', qty: 1, price: 0 });
  rerenderNewOrderKeepScroll();
}

// ── Customer Picker ──

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
  let filtered = [...STOPS];
  if (query) filtered = filtered.filter(s =>
    s.n.toLowerCase().includes(query) ||
    (s.c||'').toLowerCase().includes(query) ||
    (s.p||'').toLowerCase().includes(query)
  );
  filtered.sort((a, b) => (a.n||'').localeCompare(b.n||''));
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
  let pricesChanged = false;
  tempOrderItems.forEach(item => {
    if (item.name) {
      const newPrice = getPrice(stopId, item.name);
      if (item.price !== newPrice) { item.price = newPrice; pricesChanged = true; }
    }
  });
  if (pricesChanged) showToast('Prices updated for this customer', 'info', 2000);
  renderNewOrderPage();
}

// ── Save ──

async function saveNewOrderPage() {
  if (_btnLock) return;
  _btnLock = true;
  const unlock = () => { _btnLock = false; };

  try {
  if (tempOrderCustomerId == null || isNaN(parseInt(tempOrderCustomerId))) { appAlert('Please select a customer.'); unlock(); return; }
  const items = tempOrderItems.filter(i => i.name && i.qty > 0);
  if (items.length === 0) { appAlert('Please add at least one product.'); unlock(); return; }

  const existingOrder = editingOrderId ? S.orders[editingOrderId] : null;
  const isDelivered = editingOrderId && existingOrder && existingOrder.status === 'delivered';
  // Capture previous items BEFORE mutation for stock delta calculation
  const previousItems = (isDelivered && existingOrder) ? (existingOrder.items || []).map(i => ({...i})) : [];
  // Only validate stock for delivered orders (pending orders don't affect stock)
  if (isDelivered) {
    const stockIssues = validateTrackedStockChange(previousItems, items);
    if (stockIssues.length > 0) {
      appAlert('Insufficient stock: ' + stockIssues.join(', '));
      unlock(); return;
    }
  }

  // Warn (non-blocking) for pending orders when committed stock exceeds available
  if (!isDelivered) {
    const comm = getCommittedStock();
    const warnings = [];
    const currentOrderQty = buildItemQtyMap(items);
    // Exclude current order's old items from committed if editing a pending order
    const oldItems = (editingOrderId && existingOrder && existingOrder.status === 'pending')
      ? buildItemQtyMap(existingOrder.items) : {};
    Object.entries(currentOrderQty).forEach(([name, qty]) => {
      const catItem = getTrackedCatalogItem(name);
      if (!catItem) return;
      const totalCommitted = (comm[name] || 0) - (oldItems[name] || 0) + qty;
      if (totalCommitted > (catItem.stock || 0)) {
        warnings.push(name + ': ' + (catItem.stock || 0) + ' in stock, ' + totalCommitted + ' committed');
      }
    });
    if (warnings.length > 0) {
      const proceed = await appConfirm('Stock may be insufficient for pending orders:<br>' + warnings.map(w => escHtml(w)).join('<br>') + '<br><br>Continue anyway?', true);
      if (!proceed) { unlock(); return; }
    }
  }

  const note = document.getElementById('neworder-note')?.value || '';
  const deliveryDate = tempOrderDeliveryDate;

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

  // Only deduct stock if editing a DELIVERED order (pending orders don't affect stock)
  if (isDelivered) {
    const stockChange = applyTrackedStockChange(previousItems, items);
    if (stockChange.changed) {
      await save.catalog();
      if (stockChange.lowStockWarnings.length > 0) {
        setTimeout(() => appAlert('Low stock:<br>' + stockChange.lowStockWarnings.map(w => escHtml(w)).join('<br>'), true), 300);
      }
    }
  }

  const savedOrderId = editingOrderId || newOrderId;
  editingOrderId = null;
  await save.orders([savedOrderId]);

  showToast(newOrderId ? 'Order created' : 'Order updated', 'success');
  showPage(newOrderPreviousPage);
  } finally { unlock(); }
}
