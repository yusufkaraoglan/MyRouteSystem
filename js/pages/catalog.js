'use strict';
function renderCatalog() {
  let html = `
    <header class="topbar">
      <button class="btn-ghost" onclick="showPage('settings')" style="font-size:18px;padding:8px">&larr;</button>
      <h1 style="flex:1;text-align:center;font-size:16px">Ürün Kataloğu</h1>
      <span class="badge badge-outline">${S.catalog.length} ürün</span>
    </header>
    <div class="page-body">
      <div class="card" style="margin-bottom:12px">
        <div style="font-size:13px;font-weight:600;margin-bottom:8px">Ürün Ekle</div>
        <div style="display:flex;gap:8px;margin-bottom:8px">
          <input class="input" id="cat-name" placeholder="Ürün adı" style="flex:1;min-width:0">
        </div>
        <div style="display:flex;gap:8px">
          <input class="input" id="cat-unit" placeholder="Birim" style="flex:1;min-width:0">
          <input class="input" id="cat-price" placeholder="£0.00" type="number" step="0.01" style="flex:1;min-width:0">
          <input class="input" id="cat-stock" placeholder="Stok" type="number" style="flex:0.7;min-width:0">
          <button class="btn btn-primary" onclick="addCatalogItem()" style="flex-shrink:0;padding:10px 20px">Ekle</button>
        </div>
      </div>`;

  if (S.catalog.length === 0) {
    html += `<div class="empty-state"><p><b>Henüz ürün yok</b></p><p>Yukarıdan ürün ekleyin</p></div>`;
  } else {
    S.catalog.forEach((c, i) => {
      html += `
        <div class="catalog-card" id="cat-card-${i}">
          <div class="catalog-card-top">
            <div class="catalog-card-info">
              <div class="catalog-card-name">${escHtml(c.name)}</div>
              <div class="catalog-card-unit">${escHtml(c.unit || '')} &middot; ${formatCurrency(c.price)}</div>
            </div>
            <div style="display:flex;align-items:center;gap:6px">
              ${c.trackStock === false
                ? '<span style="font-size:11px;color:var(--text-muted);font-style:italic">Günlük</span>'
                : `<span id="cat-stock-badge-${i}" style="display:inline-flex;align-items:center;justify-content:center;min-width:32px;padding:4px 8px;border-radius:12px;font-size:14px;font-weight:700;background:${c.stock != null && c.stock <= 5 ? 'var(--danger)' : c.stock != null && c.stock <= 20 ? 'var(--warning)' : 'var(--success)'};color:#fff">${c.stock != null ? c.stock : '—'}</span>`
              }
              <button id="cat-edit-btn-${i}" style="width:30px;height:30px;border-radius:8px;border:1px solid var(--border);background:var(--bg);display:flex;align-items:center;justify-content:center;font-size:13px;cursor:pointer;color:var(--info)" onclick="toggleCatalogEdit(${i})">&#9998;</button>
            </div>
          </div>
          ${c.trackStock !== false ? `
          <div class="catalog-card-bottom" id="cat-stock-row-${i}">
            <div style="display:flex;align-items:center;gap:4px">
              <button style="color:var(--danger);font-size:16px;width:32px;height:32px;border:1px solid var(--border);border-radius:8px;display:flex;align-items:center;justify-content:center;background:var(--bg);cursor:pointer" onclick="event.stopPropagation();adjustStock(${i},-1)">−</button>
              <button style="color:var(--success);font-size:16px;width:32px;height:32px;border:1px solid var(--border);border-radius:8px;display:flex;align-items:center;justify-content:center;background:var(--bg);cursor:pointer" onclick="event.stopPropagation();adjustStock(${i},1)">+</button>
            </div>
            <div style="display:flex;align-items:center;gap:4px">
              <input class="input" type="number" id="cat-stock-add-${i}" placeholder="Stok ekle" onkeydown="if(event.key==='Enter'){addToStock(${i});}" style="width:80px;height:32px;text-align:center;padding:4px;font-size:13px;border-radius:8px">
              <button style="font-size:12px;padding:6px 12px;border-radius:8px;background:var(--primary);color:#fff;border:none;cursor:pointer;font-weight:600;white-space:nowrap" onclick="addToStock(${i})">Ekle</button>
            </div>
          </div>` : ''}
          <div id="cat-edit-panel-${i}" style="display:none">
          <div class="catalog-edit-form">
            <input class="input" id="cat-edit-name-${i}" value="${escHtml(c.name)}" placeholder="Ürün adı" style="flex:2;min-width:100px">
            <input class="input" id="cat-edit-unit-${i}" value="${escHtml(c.unit || '')}" placeholder="Birim" style="flex:1;min-width:60px">
            <input class="input" id="cat-edit-price-${i}" value="${c.price}" type="number" step="0.01" placeholder="Fiyat" style="flex:1;min-width:70px">
            <button class="btn btn-primary btn-sm" onclick="saveCatalogEdit(${i})" style="flex-shrink:0">Kaydet</button>
          </div>
          <div style="display:flex;align-items:center;gap:8px;margin-top:8px;padding-top:8px;border-top:1px solid var(--border)">
            <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer">
              <input type="checkbox" id="cat-edit-nostock-${i}" ${c.trackStock === false ? 'checked' : ''} style="width:18px;height:18px">
              Stok takibi yapma (günlük ürün)
            </label>
            ${c.trackStock !== false ? `<div style="display:flex;align-items:center;gap:4px;margin-left:auto">
              <span style="font-size:12px;color:var(--text-sec)">Stok:</span>
              <input class="input" id="cat-edit-stock-${i}" value="${c.stock != null ? c.stock : ''}" type="number" placeholder="—" style="width:60px;height:32px;text-align:center;font-size:14px;font-weight:600">
            </div>` : ''}
          </div>
          <div style="display:flex;justify-content:flex-end;margin-top:8px;padding-top:8px;border-top:1px solid var(--border)">
            <button class="btn btn-sm" style="color:var(--danger);border:1px solid var(--danger)" onclick="removeCatalogItem(${i})">Ürünü Sil</button>
          </div>
          </div>
        </div>`;
    });
  }
  html += `</div>`;
  document.getElementById('page-catalog').innerHTML = html;
}

function adjustStock(idx, delta) {
  if (!S.catalog[idx]) return;
  const cur = S.catalog[idx].stock;
  if (cur == null) {
    S.catalog[idx].stock = Math.max(0, delta);
  } else {
    S.catalog[idx].stock = Math.max(0, cur + delta);
  }
  save.catalog();
  updateStockDisplay(idx);
}

function addToStock(idx) {
  if (!S.catalog[idx]) return;
  const input = document.getElementById('cat-stock-add-' + idx);
  if (!input) return;
  const val = parseInt(input.value);
  if (!val || val <= 0) return;
  const cur = S.catalog[idx].stock;
  S.catalog[idx].stock = (cur != null ? cur : 0) + val;
  save.catalog();
  input.value = '';
  updateStockDisplay(idx);
}

function updateStockDisplay(idx) {
  const c = S.catalog[idx];
  if (!c) return;
  const badge = document.getElementById('cat-stock-badge-' + idx);
  if (badge) {
    badge.textContent = c.stock != null ? c.stock : '—';
    const bg = c.stock != null && c.stock <= 5 ? 'var(--danger)' : c.stock != null && c.stock <= 20 ? 'var(--warning)' : 'var(--success)';
    badge.style.background = bg;
  }
}

function setStock(idx, val) {
  if (!S.catalog[idx]) return;
  const trimmed = (val + '').trim();
  if (trimmed === '') { S.catalog[idx].stock = null; }
  else { S.catalog[idx].stock = Math.max(0, parseInt(trimmed) || 0); }
  save.catalog();
}

function toggleCatalogEdit(idx) {
  // Close previously open panel
  if (editingCatalogIdx >= 0 && editingCatalogIdx !== idx) {
    const prevPanel = document.getElementById('cat-edit-panel-' + editingCatalogIdx);
    const prevBtn = document.getElementById('cat-edit-btn-' + editingCatalogIdx);
    if (prevPanel) prevPanel.style.display = 'none';
    if (prevBtn) { prevBtn.innerHTML = '&#9998;'; prevBtn.style.color = 'var(--info)'; }
  }
  const panel = document.getElementById('cat-edit-panel-' + idx);
  const btn = document.getElementById('cat-edit-btn-' + idx);
  if (!panel) return;
  const isOpening = panel.style.display === 'none';
  editingCatalogIdx = isOpening ? idx : -1;
  panel.style.display = isOpening ? 'block' : 'none';
  if (btn) {
    btn.innerHTML = isOpening ? '&#10005;' : '&#9998;';
    btn.style.color = isOpening ? 'var(--danger)' : 'var(--info)';
  }
}

function saveCatalogEdit(idx) {
  const name = document.getElementById('cat-edit-name-' + idx).value.trim();
  const unit = document.getElementById('cat-edit-unit-' + idx).value.trim();
  const price = parseFloat(document.getElementById('cat-edit-price-' + idx).value) || 0;
  if (!name) { appAlert('Ürün adı gerekli.'); return; }
  const oldName = S.catalog[idx].name;
  if (name !== oldName && S.catalog.some(c => c.name === name)) { appAlert('Bu ürün zaten var.'); return; }
  const noStockChecked = document.getElementById('cat-edit-nostock-' + idx)?.checked;
  let stock = S.catalog[idx].stock;
  if (noStockChecked) {
    stock = null;
  } else {
    const stockInput = document.getElementById('cat-edit-stock-' + idx);
    if (stockInput) {
      const sv = stockInput.value.trim();
      stock = sv === '' ? null : Math.max(0, parseInt(sv) || 0);
    }
  }
  S.catalog[idx] = { name, unit, price, stock, trackStock: noStockChecked ? false : true };
  save.catalog();
  editingCatalogIdx = -1;
  const body = document.querySelector('#page-catalog .page-body');
  const scrollPos = body ? body.scrollTop : 0;
  renderCatalog();
  const newBody = document.querySelector('#page-catalog .page-body');
  if (newBody) newBody.scrollTop = scrollPos;
}

function addCatalogItem() {
  const name = document.getElementById('cat-name').value.trim();
  const unit = document.getElementById('cat-unit').value.trim();
  const price = parseFloat(document.getElementById('cat-price').value) || 0;
  const stockVal = document.getElementById('cat-stock').value;
  const stock = stockVal !== '' ? parseInt(stockVal) : null;
  if (!name) { appAlert('Ürün adı gerekli.'); return; }
  if (S.catalog.some(c => c.name === name)) { appAlert('Bu ürün zaten mevcut.'); return; }
  S.catalog.push({ name, unit, price, stock });
  save.catalog();
  if (curPage === 'catalog') renderCatalog();
  else if (curPage === 'settings') renderSettings();
}

async function removeCatalogItem(idx) {
  if (!(await appConfirm('Remove ' + S.catalog[idx].name + '?'))) return;
  S.catalog.splice(idx, 1);
  save.catalog();
  if (curPage === 'catalog') renderCatalog();
  else if (curPage === 'settings') renderSettings();
}


async function resetAllData() {
  if (!(await appConfirm('This will delete ALL local data.<br>Are you sure?'))) return;
  if (!(await appConfirm('This cannot be undone. Proceed?'))) return;
  const keys = ['stops','assign','routeOrder','order','geo','ordersV2','orders','debts','debtHistory','cnotes','catalog','customerPricing','customerProducts','recurringOrders','stopCatalog','vis'];
  keys.forEach(k => localStorage.removeItem('cr4_' + k));
  location.reload();
}

// ══════════════════════════════════════════════════════════════
// RECURRING ORDERS
// ══════════════════════════════════════════════════════════════
function showRecurringModal(stopId) {
  const stop = getStop(stopId);
  if (!stop) return;
  const existing = S.recurringOrders[stopId];
  if (existing) {
    openModal(`
      <div class="modal-handle"></div>
      <div class="modal-title">Tekrarlayan Sipariş — ${escHtml(stop.n)}</div>
      <div style="margin-bottom:12px">
        <div style="font-size:13px;font-weight:600;color:var(--text-sec);margin-bottom:8px">Mevcut Otomatik Sipariş:</div>
        ${existing.items.map(i => `<div style="padding:4px 0;font-size:14px">${i.qty}x ${escHtml(i.name)} — ${formatCurrency(i.price * i.qty)}</div>`).join('')}
        <div style="font-weight:700;padding-top:4px;font-size:15px">Toplam: ${formatCurrency(existing.items.reduce((s, i) => s + i.qty * i.price, 0))}</div>
      </div>
      <button class="btn btn-primary btn-block" onclick="createRecurringFromLast(${stopId})">Güncelle (Son Siparişten)</button>
      <button class="btn btn-danger btn-block mt-1" onclick="removeRecurring(${stopId})">Tekrarlayan Siparişi Kaldır</button>
    `);
  } else {
    openModal(`
      <div class="modal-handle"></div>
      <div class="modal-title">Tekrarlayan Sipariş — ${escHtml(stop.n)}</div>
      <p class="text-muted" style="font-size:13px;margin-bottom:12px">Bu müşteri için otomatik tekrarlayan sipariş oluşturun. Rotadaki gününde otomatik sipariş oluşturulur.</p>
      <button class="btn btn-primary btn-block" onclick="createRecurringFromLast(${stopId})">Son Siparişten Oluştur</button>
    `);
  }
}

function createRecurringFromLast(stopId) {
  const delivered = getStopOrders(stopId, 'delivered').filter(o => o.items && o.items.length > 0)
    .sort((a, b) => new Date(b.deliveredAt) - new Date(a.deliveredAt));
  if (delivered.length === 0) {
    const pending = getStopOrders(stopId, 'pending').filter(o => o.items && o.items.length > 0);
    if (pending.length === 0) { appAlert('Bu müşterinin henüz siparişi yok.'); return; }
    S.recurringOrders[stopId] = { items: pending[0].items.map(i => ({ name: i.name, qty: i.qty, price: i.price })) };
  } else {
    S.recurringOrders[stopId] = { items: delivered[0].items.map(i => ({ name: i.name, qty: i.qty, price: i.price })) };
  }
  save.recurringOrders();
  closeModal();
  appAlert('Tekrarlayan sipariş kaydedildi.');
  if (curPage === 'profile') renderProfile();
}

function removeRecurring(stopId) {
  delete S.recurringOrders[stopId];
  save.recurringOrders();
  closeModal();
  appAlert('Tekrarlayan sipariş kaldırıldı.');
  if (curPage === 'profile') renderProfile();
}

function autoCreateRecurringOrders() {
  const week = getCurrentWeek();
  const dayIdx = getTodayDayIndex();
  const days = DAYS.filter(d => d.week === week);
  const dayObj = days[dayIdx];
  if (!dayObj) return;
  const dayId = dayObj.id;
  const today = todayStr();
  const lastAutoKey = 'cr4_lastAutoRecurring';
  if (localStorage.getItem(lastAutoKey) === today + '_' + dayId) return; // Already ran today

  const assigned = [];
  Object.entries(S.assign).forEach(([sid, did]) => {
    if (did === dayId) assigned.push(parseInt(sid));
  });

  let created = 0;
  assigned.forEach(stopId => {
    const rec = S.recurringOrders[stopId];
    if (!rec || !rec.items || rec.items.length === 0) return;
    // Check if there's already a pending order for today
    const hasPending = getStopOrders(stopId, 'pending').length > 0;
    if (hasPending) return;
    const id = uid();
    S.orders[id] = {
      id, customerId: stopId,
      items: rec.items.map(i => ({ name: i.name, qty: i.qty, price: i.price })),
      note: 'Otomatik tekrarlayan sipariş',
      status: 'pending', payMethod: null,
      createdAt: new Date().toISOString(), deliveredAt: null
    };
    created++;
  });
  if (created > 0) {
    save.orders();
  }
  localStorage.setItem(lastAutoKey, today + '_' + dayId);
}

// ══════════════════════════════════════════════════════════════
