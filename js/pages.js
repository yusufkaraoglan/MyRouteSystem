'use strict';
// All page render functions (to be split in Phase 2)
// ══════════════════════════════════════════════════════════════
// ROUTE PAGE
// ══════════════════════════════════════════════════════════════
function renderRoute() {
  const week = S.routeWeek;
  const days = DAYS.filter(d => d.week === week);
  const dayObj = days[S.routeDay] || days[0];
  if (!dayObj) return;
  const dayId = dayObj.id;
  const today = todayStr();

  // Get assigned stops for this day
  const assigned = [];
  Object.entries(S.assign).forEach(([sid, did]) => {
    if (did === dayId) assigned.push(parseInt(sid));
  });

  // Sort by route order
  const ro = S.routeOrder[dayId] || [];
  const sorted = [...new Set([...ro.filter(id => assigned.includes(id)), ...assigned])];

  // Current date info
  const dateInfo = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  let html = `
    <header class="topbar">
      <div>
        <h1>Route</h1>
        <div style="font-size:12px;color:var(--text-sec)">${dateInfo}</div>
      </div>
      <div class="topbar-actions">
        <button class="btn-ghost" onclick="shareRouteSummary()" title="Share Route Summary">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
        </button>
        <button class="btn-ghost" onclick="exportRouteExcel()" title="Export Route">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
        </button>
        <button class="btn-ghost" onclick="showImportModal()" title="Import">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </button>
      </div>
    </header>
    <div class="week-toggle">
      <button class="week-btn ${week==='A'?'active':''}" onclick="setRouteWeek('A')">Week A</button>
      <button class="week-btn ${week==='B'?'active':''}" onclick="setRouteWeek('B')">Week B</button>
    </div>
    <div class="day-tabs">
      ${days.map((d, i) => {
        const dayStops = Object.entries(S.assign).filter(([,did]) => did === d.id).map(([sid]) => parseInt(sid));
        const dayPending = dayStops.reduce((sum, sid) => sum + getStopOrders(sid, 'pending').length, 0);
        return `
        <button class="day-tab ${i===S.routeDay?'active':''}"
                style="${i===S.routeDay ? 'background:'+d.color+';color:#fff' : ''};position:relative"
                onclick="setRouteDay(${i})">${d.label.slice(0,3)}${dayPending > 0 ? `<span style="position:absolute;top:2px;right:2px;width:8px;height:8px;border-radius:50%;background:var(--warning);${i===S.routeDay ? 'background:#fff' : ''}"></span>` : ''}</button>`;
      }).join('')}
    </div>
    <div class="page-body">`;

  if (sorted.length === 0) {
    html += `<div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
      <p><b>No customers for this day</b></p>
      <p>Assign customers from the Customers tab</p>
    </div>`;
  } else {
    sorted.forEach((stopId, idx) => {
      const stop = getStop(stopId);
      if (!stop) return;
      const pending = getStopOrders(stopId, 'pending');
      const delivered = isDeliveredThisWeek(stopId);
      const thisMonday = getWeekMondayStr(new Date());
      const weekOrders = Object.values(S.orders).filter(o =>
        o.customerId === stopId && o.status === 'delivered' &&
        o.deliveredAt && getWeekMondayStr(o.deliveredAt) === thisMonday
      );
      const todayRev = weekOrders.reduce((s, o) => s + calcOrderTotal(o), 0);
      const isVisited = delivered && weekOrders.every(o => o.payMethod === 'visit');
      const debt = S.debts[stopId] || 0;

      html += `
        <div class="route-card ${delivered ? 'delivered' : ''}" style="border-left-color:${dayObj.color}" data-stop-id="${stopId}">
          <div class="drag-handle" ontouchstart="routeTouchStart(event,${stopId},'${dayId}')" onmousedown="routeMouseStart(event,${stopId},'${dayId}')">
            <svg viewBox="0 0 20 20" width="20" height="20" fill="currentColor"><circle cx="7" cy="5" r="1.5"/><circle cx="13" cy="5" r="1.5"/><circle cx="7" cy="10" r="1.5"/><circle cx="13" cy="10" r="1.5"/><circle cx="7" cy="15" r="1.5"/><circle cx="13" cy="15" r="1.5"/></svg>
          </div>
          <span class="route-order-num">${idx + 1}</span>
          <div class="route-card-body" onclick="showProfile(${stopId})" style="cursor:pointer">
            <div class="route-card-name">${escHtml(stop.n)}</div>
            <div class="route-card-sub">${escHtml(stop.c)} &middot; ${escHtml(stop.p)}</div>
            <div class="route-card-badges">
              ${pending.length > 0 ? `<span class="badge badge-warning">${pending.length} pending</span>` : ''}
              ${delivered ? `<span class="badge badge-success">${isVisited ? 'Visited' : 'Delivered'}</span>` : ''}
              ${todayRev > 0 ? `<span class="badge badge-info">${formatCurrency(todayRev)}</span>` : ''}
              ${!delivered && debt > 0 ? `<span class="badge badge-danger">${formatCurrency(debt)}</span>` : ''}
            </div>
          </div>
          <button class="delivery-btn ${delivered ? 'done' : ''}" onclick="event.stopPropagation();${delivered ? '' : `showDeliveryModal(${stopId})`}" title="${pending.length === 0 && !delivered ? 'Visit' : ''}">
            ${delivered ? '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>'
                        : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="3"/></svg>'}
          </button>
        </div>`;
    });
  }

  html += `</div>`;

  // Summary bar
  const deliveredCount = sorted.filter(id => isDeliveredThisWeek(id)).length;
  const rev = calcDayRevenue(dayId);
  html += `
    <div class="route-summary" style="flex-wrap:wrap;gap:6px">
      <span>${deliveredCount} / ${sorted.length} delivered</span>
      <div style="display:flex;gap:10px;font-size:12px">
        <span style="color:var(--success)">Cash ${formatCurrency(rev.cash)}</span>
        <span style="color:var(--info)">Bank ${formatCurrency(rev.bank)}</span>
        <span style="color:var(--danger)">Unpaid ${formatCurrency(rev.unpaid)}</span>
      </div>
    </div>`;

  document.getElementById('page-route').innerHTML = html;
}

function rerenderRouteKeepScroll() {
  const body = document.querySelector('#page-route .page-body');
  const scrollPos = body ? body.scrollTop : 0;
  renderRoute();
  const newBody = document.querySelector('#page-route .page-body');
  if (newBody) newBody.scrollTop = scrollPos;
}

function setRouteWeek(w) {
  S.routeWeek = w;
  S.routeDay = (w === getCurrentWeek()) ? getTodayDayIndex() : 0;
  renderRoute();
}

function setRouteDay(idx) {
  S.routeDay = idx;
  renderRoute();
}

function moveStop(stopId, dir, dayId) {
  const ro = S.routeOrder[dayId] || [];
  // Build full list
  const assigned = [];
  Object.entries(S.assign).forEach(([sid, did]) => {
    if (did === dayId) assigned.push(parseInt(sid));
  });
  const sorted = [...new Set([...ro.filter(id => assigned.includes(id)), ...assigned])];

  const idx = sorted.indexOf(stopId);
  if (idx < 0) return;
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= sorted.length) return;
  [sorted[idx], sorted[newIdx]] = [sorted[newIdx], sorted[idx]];
  S.routeOrder[dayId] = sorted;
  save.routeOrder();
  rerenderRouteKeepScroll();
}

let _rdDragSrc = null;

function _rdApplyDrop(targetStopId, dayId) {
  if (_rdDragSrc === null || _rdDragSrc === targetStopId) { _rdDragSrc = null; return; }
  const assigned = [];
  Object.entries(S.assign).forEach(([sid, did]) => { if (did === dayId) assigned.push(parseInt(sid)); });
  const ro = S.routeOrder[dayId] || [];
  const sorted = [...new Set([...ro.filter(id => assigned.includes(id)), ...assigned])];
  const srcIdx = sorted.indexOf(_rdDragSrc);
  const dstIdx = sorted.indexOf(targetStopId);
  if (srcIdx < 0 || dstIdx < 0) { _rdDragSrc = null; return; }
  sorted.splice(srcIdx, 1);
  sorted.splice(dstIdx, 0, _rdDragSrc);
  S.routeOrder[dayId] = sorted;
  save.routeOrder();
  _rdDragSrc = null;
  rerenderRouteKeepScroll();
}

function routeTouchStart(e, stopId, dayId) {
  e.preventDefault();
  e.stopPropagation();
  _rdDragSrc = stopId;
  const card = e.currentTarget.closest('.route-card');
  card.classList.add('dragging');
  const onMove = (ev) => {
    ev.preventDefault();
    const t = ev.touches[0];
    card.style.display = 'none';
    const el = document.elementFromPoint(t.clientX, t.clientY);
    card.style.display = '';
    const target = el && el.closest('.route-card');
    document.querySelectorAll('#page-route .route-card').forEach(c => c.classList.remove('drag-over'));
    if (target && target !== card) target.classList.add('drag-over');
  };
  const onEnd = () => {
    document.removeEventListener('touchmove', onMove);
    document.removeEventListener('touchend', onEnd);
    const over = document.querySelector('#page-route .route-card.drag-over');
    document.querySelectorAll('#page-route .route-card').forEach(c => { c.classList.remove('dragging'); c.classList.remove('drag-over'); });
    if (over) _rdApplyDrop(parseInt(over.dataset.stopId), dayId);
    else _rdDragSrc = null;
  };
  document.addEventListener('touchmove', onMove, { passive: false });
  document.addEventListener('touchend', onEnd);
}

function routeMouseStart(e, stopId, dayId) {
  if (e.button !== 0) return;
  e.preventDefault();
  e.stopPropagation();
  _rdDragSrc = stopId;
  const card = e.currentTarget.closest('.route-card');
  card.classList.add('dragging');
  const onMove = (ev) => {
    card.style.display = 'none';
    const el = document.elementFromPoint(ev.clientX, ev.clientY);
    card.style.display = '';
    const target = el && el.closest('.route-card');
    document.querySelectorAll('#page-route .route-card').forEach(c => c.classList.remove('drag-over'));
    if (target && target !== card) target.classList.add('drag-over');
  };
  const onUp = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    const over = document.querySelector('#page-route .route-card.drag-over');
    document.querySelectorAll('#page-route .route-card').forEach(c => { c.classList.remove('dragging'); c.classList.remove('drag-over'); });
    if (over) _rdApplyDrop(parseInt(over.dataset.stopId), dayId);
    else _rdDragSrc = null;
  };
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

function calcDayRevenue(dayId) {
  const thisMonday = getWeekMondayStr(new Date());
  const assigned = [];
  Object.entries(S.assign).forEach(([sid, did]) => {
    if (did === dayId) assigned.push(parseInt(sid));
  });
  const todayOrders = Object.values(S.orders)
    .filter(o => assigned.includes(o.customerId) && o.status === 'delivered' &&
                 o.deliveredAt && getWeekMondayStr(o.deliveredAt) === thisMonday && o.payMethod !== 'visit');
  let cash = 0, bank = 0, unpaid = 0;
  todayOrders.forEach(o => {
    const total = calcOrderTotal(o);
    if (o.payMethod === 'cash') {
      const paid = (o.cashPaid !== undefined) ? o.cashPaid : total;
      cash += Math.min(paid, total);
      unpaid += Math.max(0, total - paid);
    } else if (o.payMethod === 'bank') {
      bank += total;
    } else {
      unpaid += total;
    }
  });
  return { cash, bank, unpaid, total: cash + bank + unpaid };
}

// ══════════════════════════════════════════════════════════════
// DELIVERY MODAL
// ══════════════════════════════════════════════════════════════
let deliveryCashAmount = 0;

function showDeliveryModal(stopId, singleOrderId) {
  deliveryStopId = stopId;
  deliveryPayMethod = null;
  deliveryCashAmount = 0;
  deliveryOrderIds = singleOrderId ? [singleOrderId] : null;
  const stop = getStop(stopId);
  if (!stop) return;
  const allPending = getStopOrders(stopId, 'pending');
  const pending = singleOrderId ? allPending.filter(o => o.id === singleOrderId) : allPending;
  const debt = S.debts[stopId] || 0;
  const isVisitMode = pending.length === 0;

  let itemsHtml = '';
  if (pending.length > 0) {
    pending.forEach(o => {
      const total = calcOrderTotal(o);
      itemsHtml += `<div class="card" style="margin-bottom:8px">
        <div class="order-card-items">${o.items.map(i => `${i.qty}x ${escHtml(i.name)}`).join(', ')}</div>
        <div class="flex-between"><span class="text-muted" style="font-size:12px">${formatDateTime(o.createdAt)}${o.deliveryDate ? ` · Teslimat: ${o.deliveryDate}` : ''}</span><b>${formatCurrency(total)}</b></div>
        ${o.note ? `<div class="text-muted" style="font-size:12px;margin-top:4px">${escHtml(o.note)}</div>` : ''}
      </div>`;
    });
  }

  const grandTotal = pending.reduce((s, o) => s + calcOrderTotal(o), 0);

  if (isVisitMode) {
    // VISIT MODE - no pending orders
    let visitHtml = `
      <div class="modal-handle"></div>
      <div class="modal-title">Visit - ${escHtml(stop.n)}</div>
      <div style="text-align:center;padding:12px 0">
        <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="var(--primary)" stroke-width="1.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        <p class="text-muted" style="margin-top:8px;font-size:13px">No pending orders for this customer</p>
      </div>`;

    if (debt > 0) {
      visitHtml += `
        <div class="card" style="border-left:4px solid var(--danger)">
          <div class="flex-between">
            <span style="font-size:13px;font-weight:600;color:var(--text-sec)">Outstanding Debt</span>
            <span style="font-size:18px;font-weight:700;color:var(--danger)">${formatCurrency(debt)}</span>
          </div>
          <div style="margin-top:12px">
            <div style="font-size:13px;font-weight:600;color:var(--text-sec);margin-bottom:6px">Collect Payment</div>
            <div class="pay-options">
              <div class="pay-opt" onclick="selectVisitPayMethod('cash',this)">
                <div class="pay-icon">&#163;</div>Cash
              </div>
              <div class="pay-opt" onclick="selectVisitPayMethod('bank',this)">
                <div class="pay-icon">&#127974;</div>Bank
              </div>
            </div>
            <div id="visit-cash-input" class="hidden" style="margin-top:8px">
              <label class="form-label">Amount received</label>
              <input class="input" type="number" step="0.01" id="visit-cash-amount" value="${debt.toFixed(2)}" placeholder="0.00">
            </div>
          </div>
        </div>
        <button class="btn btn-success btn-block mt-2" onclick="confirmVisitWithPayment()" id="btn-confirm-visit-pay" disabled>
          Collect Payment & Mark Visited
        </button>`;
    }

    visitHtml += `
      <div class="form-group" style="margin-top:12px">
        <label class="form-label">Visit Note (optional)</label>
        <textarea class="textarea" id="visit-note" rows="2" style="min-height:50px" placeholder="Add a note..."></textarea>
      </div>
      <button class="btn ${debt > 0 ? 'btn-outline' : 'btn-success'} btn-block mt-1" onclick="confirmVisitOnly()">
        ${debt > 0 ? 'Mark Visited (No Payment)' : 'Mark Visited'}
      </button>`;

    openModal(visitHtml);
  } else {
    // DELIVERY MODE - has pending orders
    openModal(`
      <div class="modal-handle"></div>
      <div class="modal-title">Delivery - ${escHtml(stop.n)}</div>
      <div style="margin-bottom:12px">
        <div style="font-size:13px;font-weight:600;color:var(--text-sec);margin-bottom:8px">Pending Orders (${pending.length})</div>
        ${itemsHtml}
        <div class="flex-between" style="font-size:15px;font-weight:700;padding:4px 0">
          <span>Total</span><span id="delivery-grand-total">${formatCurrency(grandTotal)}</span>
        </div>
        ${debt > 0 ? `<div class="flex-between" style="font-size:13px;padding:4px 0;color:var(--danger)">
          <span>Outstanding Debt</span><span style="font-weight:600">${formatCurrency(debt)}</span>
        </div>` : ''}
      </div>
      <div style="font-size:13px;font-weight:600;color:var(--text-sec);margin-bottom:8px">Payment Method</div>
      <div class="pay-options">
        <div class="pay-opt" onclick="selectPayMethod('cash',this)" data-method="cash">
          <div class="pay-icon">&#163;</div>Cash
        </div>
        <div class="pay-opt" onclick="selectPayMethod('bank',this)" data-method="bank">
          <div class="pay-icon">&#127974;</div>Bank
        </div>
        <div class="pay-opt" onclick="selectPayMethod('unpaid',this)" data-method="unpaid">
          <div class="pay-icon">&#9203;</div>Not Paid
        </div>
      </div>
      <div id="cash-amount-section" class="hidden" style="margin-top:8px">
        <label class="form-label">Cash amount received</label>
        <input class="input" type="number" step="0.01" id="cash-amount-input" value="${grandTotal.toFixed(2)}" placeholder="0.00" oninput="updateCashRemainder()">
        <p class="text-muted" style="font-size:12px;margin-top:4px" id="cash-remainder-msg"></p>
      </div>
      <div style="margin-top:12px">
        <label class="form-label">Teslimat Notu (opsiyonel)</label>
        <textarea class="textarea" id="delivery-note" rows="2" placeholder="Not ekleyin..." style="width:100%;font-size:14px;padding:8px;border:1px solid var(--border);border-radius:8px;resize:vertical"></textarea>
      </div>
      <button class="btn btn-success btn-block mt-2" id="btn-confirm-delivery" style="opacity:0.5" ontouchend="confirmDelivery()" onclick="confirmDelivery()">
        Teslimatı Onayla
      </button>
    `);
  }
}

let visitPayMethod = null;

function selectVisitPayMethod(method, el) {
  visitPayMethod = method;
  document.querySelectorAll('.pay-opt').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  const btn = document.getElementById('btn-confirm-visit-pay');
  if (btn) btn.disabled = false;
  const cashSection = document.getElementById('visit-cash-input');
  if (cashSection) {
    if (method === 'cash') cashSection.classList.remove('hidden');
    else cashSection.classList.add('hidden');
  }
}

function confirmVisitOnly() {
  const stopId = parseInt(deliveryStopId);
  const now = new Date().toISOString();
  const visitNote = document.getElementById('visit-note')?.value?.trim() || '';
  // Mark as visited today by creating a zero-total delivery marker
  const vid = uid();
  S.orders[vid] = {
    id: vid, customerId: stopId, items: [],
    note: visitNote || 'Visit (no orders)', status: 'delivered',
    payMethod: 'visit', createdAt: now, deliveredAt: now
  };
  save.orders();
  closeModal();
  rerenderRouteKeepScroll();
}

function confirmVisitWithPayment() {
  const stopId = parseInt(deliveryStopId);
  if (!visitPayMethod) return;
  const debt = S.debts[stopId] || 0;
  let payAmount = debt;
  if (visitPayMethod === 'cash') {
    payAmount = parseFloat(document.getElementById('visit-cash-amount')?.value) || 0;
    if (payAmount <= 0) { appAlert('Enter a valid amount.'); return; }
  }

  const now = new Date().toISOString();
  const cleared = Math.min(payAmount, debt);
  S.debts[stopId] = Math.max(0, debt - cleared);
  createDebtHistoryEntry(stopId, {
    date: now, amount: cleared, type: 'clear',
    note: `Visit payment (${visitPayMethod})`
  });
  save.debts();
  save.debtHistory();

  const visitNote = document.getElementById('visit-note')?.value?.trim() || '';
  const vid = uid();
  S.orders[vid] = {
    id: vid, customerId: stopId, items: [],
    note: visitNote || `Visit - debt payment ${formatCurrency(cleared)}`, status: 'delivered',
    payMethod: visitPayMethod, createdAt: now, deliveredAt: now
  };
  save.orders();
  closeModal();
  rerenderRouteKeepScroll();
}

function selectPayMethod(method, el) {
  deliveryPayMethod = method;
  document.querySelectorAll('.pay-opt').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  const confirmBtn = document.getElementById('btn-confirm-delivery');
  if (confirmBtn) confirmBtn.style.opacity = '1';
  // Show/hide cash amount section
  const cashSection = document.getElementById('cash-amount-section');
  if (cashSection) {
    if (method === 'cash') {
      cashSection.classList.remove('hidden');
      updateCashRemainder();
    } else {
      cashSection.classList.add('hidden');
    }
  }
}

function updateCashRemainder() {
  const stopId = parseInt(deliveryStopId);
  const pending = getStopOrders(stopId, 'pending');
  const grandTotal = pending.reduce((s, o) => s + calcOrderTotal(o), 0);
  const cashInput = document.getElementById('cash-amount-input');
  const msg = document.getElementById('cash-remainder-msg');
  if (!cashInput || !msg) return;
  const paid = parseFloat(cashInput.value) || 0;
  const remainder = grandTotal - paid;
  if (remainder > 0.01) {
    msg.innerHTML = `<span style="color:var(--danger)">${formatCurrency(remainder)} will be added to debt</span>`;
  } else {
    msg.innerHTML = '';
  }
}

function confirmDelivery() {
  try {
    if (!deliveryStopId && deliveryStopId !== 0) { appAlert('Hata: stopId yok'); return; }
    if (!deliveryPayMethod) { appAlert('Lutfen odeme yontemi secin.'); return; }
    const stopId = parseInt(deliveryStopId);
    const allPending = getStopOrders(stopId, 'pending');
    const pending = deliveryOrderIds ? allPending.filter(o => deliveryOrderIds.includes(o.id)) : allPending;
    if (pending.length === 0) { appAlert('Bekleyen siparis bulunamadi.'); closeModal(); return; }
    const now = new Date().toISOString();
    const grandTotal = pending.reduce((s, o) => s + calcOrderTotal(o), 0);

    const cashAllocations = new Map();
    if (deliveryPayMethod === 'cash') {
      const cashInput = document.getElementById('cash-amount-input');
      let remainingCash = roundMoney(Math.max(0, cashInput ? (parseFloat(cashInput.value) || 0) : grandTotal));
      pending.forEach(o => {
        const orderTotal = roundMoney(calcOrderTotal(o));
        const paidForOrder = roundMoney(Math.min(orderTotal, Math.max(0, remainingCash)));
        cashAllocations.set(o.id, paidForOrder);
        remainingCash = roundMoney(Math.max(0, remainingCash - paidForOrder));
      });
    }

    const deliveryNote = document.getElementById('delivery-note')?.value?.trim() || '';
    pending.forEach(o => {
      o.status = 'delivered';
      o.deliveredAt = now;
      o.payMethod = deliveryPayMethod;
      if (deliveryNote) o.deliveryNote = deliveryNote;
      if (deliveryPayMethod === 'cash') {
        o.cashPaid = cashAllocations.get(o.id) || 0;
      } else {
        delete o.cashPaid;
      }
    });

    let debtChanged = false;
    pending.forEach(o => {
      if (addOrderDebtEffect(o) > 0) debtChanged = true;
    });
    if (debtChanged) {
      save.debts();
      save.debtHistory();
    }

    save.orders();
    closeModal();
    if (curPage === 'orders') renderOrders();
    else if (curPage === 'profile') renderProfile();
    else rerenderRouteKeepScroll();
  } catch (err) {
    appAlert('Teslimat hatasi: ' + err.message);
    console.error('confirmDelivery error:', err);
  }
}

function renderOrders(fullRender) {
  const isSearchUpdate = !fullRender && document.getElementById('orders-results');

  if (!isSearchUpdate) {
    let html = `
      <header class="topbar">
        <h1>Orders</h1>
        <div class="topbar-actions">
          <span class="badge badge-outline" id="orders-pending-badge">${Object.values(S.orders).filter(o=>o.status==='pending'&&o.payMethod!=='visit').length} pending</span>
        </div>
      </header>
      <div class="page-body">
        <div class="search-bar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Müşteri ara..." value="${escHtml(S.ordersSearch)}" oninput="S.ordersSearch=this.value;renderOrderResults()">
        </div>
        <div class="chip-group">
          <button class="chip ${S.ordersFilter==='pending'?'active':''}" onclick="S.ordersFilter='pending';renderOrders(true)">Pending</button>
          <button class="chip ${S.ordersFilter==='delivered'?'active':''}" onclick="S.ordersFilter='delivered';renderOrders(true)">Delivered</button>
          <button class="chip ${S.ordersFilter==='all'?'active':''}" onclick="S.ordersFilter='all';renderOrders(true)">All</button>
        </div>
        <div id="orders-results"></div>
      </div>
      <button class="fab" onclick="showNewOrderModal()" aria-label="Yeni Sipariş">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>`;
    document.getElementById('page-orders').innerHTML = html;
  }

  renderOrderResults();
}

function renderOrderResults() {
  const container = document.getElementById('orders-results');
  if (!container) return;

  let orders = Object.values(S.orders).filter(o => o.payMethod !== 'visit' || (o.items && o.items.length > 0));
  if (S.ordersFilter === 'pending') orders = orders.filter(o => o.status === 'pending');
  else if (S.ordersFilter === 'delivered') orders = orders.filter(o => o.status === 'delivered');
  if (S.ordersSearch) {
    const q = S.ordersSearch.toLowerCase();
    orders = orders.filter(o => { const stop = getStop(o.customerId); return stop && stop.n.toLowerCase().includes(q); });
  }

  // Sorting logic
  if (S.ordersFilter === 'pending') {
    // Pending: locked orders first (in their saved order), then unlocked by date
    const locked = S.ordersLockedOrders || [];
    const lockedOrders = [];
    locked.forEach(id => {
      const o = orders.find(x => x.id === id);
      if (o) lockedOrders.push(o);
    });
    const unlockedOrders = orders.filter(o => !locked.includes(o.id));
    unlockedOrders.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    orders = [...lockedOrders, ...unlockedOrders];
  } else if (S.ordersFilter === 'delivered') {
    // Delivered: newest delivery first
    orders.sort((a, b) => (b.deliveredAt || '').localeCompare(a.deliveredAt || ''));
  } else {
    // All: newest first by createdAt
    orders.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }

  // Update badge
  const badge = document.getElementById('orders-pending-badge');
  if (badge) badge.textContent = Object.values(S.orders).filter(o=>o.status==='pending'&&o.payMethod!=='visit').length + ' pending';

  const isPending = S.ordersFilter === 'pending';
  const locked = S.ordersLockedOrders || [];

  let html = '';
  if (orders.length === 0) {
    html = `<div class="empty-state"><p><b>Sipariş bulunamadı</b></p><p>+ butonuyla yeni sipariş oluşturun</p></div>`;
  } else {
    if (isPending) {
      html += `<div id="orders-drag-list">`;
    }
    orders.forEach((o, oIdx) => {
      const stop = getStop(o.customerId);
      const total = calcOrderTotal(o);
      const dayId = S.assign[o.customerId];
      const dayObj = dayId ? DAYS.find(d => d.id === dayId) : null;
      const isLocked = locked.includes(o.id);
      const isDelivered = o.status === 'delivered';

      html += `
        <div class="order-card-v2${isPending ? ' draggable-order' : ''}" data-order-id="${o.id}" ${isPending && !isLocked ? 'draggable="true"' : ''}>
          <div class="order-card-v2-header">
            ${isPending ? `<div class="order-drag-row">
              <button class="order-lock-btn${isLocked ? ' locked' : ''}" onclick="event.stopPropagation();toggleOrderLock('${o.id}')" title="${isLocked ? 'Kilidi aç' : 'Kilitle'}">
                ${isLocked ? '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>' : '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 019.9-1"/></svg>'}
              </button>
            </div>` : ''}
            <div class="order-card-v2-name" onclick="showProfile(${o.customerId})" style="cursor:pointer">${stop ? escHtml(stop.n) : 'Unknown'}</div>
            ${dayObj ? `<span class="badge" style="background:${dayObj.color}20;color:${dayObj.color};font-size:10px;font-weight:600;flex-shrink:0">${dayObj.week}-${dayObj.label.slice(0,3)}</span>` : ''}
          </div>
          <div class="order-card-v2-items">${o.items.map(i => `${i.qty}x ${escHtml(i.name)}`).join(', ')}</div>
          <div class="order-card-v2-footer">
            <span class="order-card-v2-price">${formatCurrency(total)}</span>
            ${isDelivered ? `<span style="font-size:11px;color:var(--text-muted)">${o.payMethod || ''} · ${formatDate(o.deliveredAt)}</span>` : ''}
            <div class="order-card-v2-actions">
              ${o.status === 'pending' ? `
                <button class="btn btn-success btn-sm" onclick="showDeliveryFromOrder('${o.id}')">Deliver</button>
                <button class="btn btn-outline btn-sm" onclick="showEditOrderModal('${o.id}')">Edit</button>
              ` : ''}
              <button class="btn btn-sm" style="color:var(--danger);border:1px solid var(--danger)" onclick="deleteOrderFromList('${o.id}')">Sil</button>
            </div>
          </div>
        </div>`;
    });
    if (isPending) {
      html += `</div>`;
    }
  }
  container.innerHTML = html;

  // Init drag-and-drop for pending orders
  if (isPending) initOrderDragDrop();
}

function showDeliveryFromOrder(orderId) {
  const order = S.orders[orderId];
  if (order) showDeliveryModal(order.customerId, orderId);
}

async function deleteOrderFromList(orderId) {
  await deleteOrder(orderId);
}

function toggleOrderLock(orderId) {
  const locked = S.ordersLockedOrders || [];
  const idx = locked.indexOf(orderId);
  if (idx >= 0) {
    locked.splice(idx, 1);
  } else {
    locked.push(orderId);
  }
  S.ordersLockedOrders = locked;
  lsSave('ordersLockedOrders', locked);
  renderOrderResults();
}

function initOrderDragDrop() {
  const list = document.getElementById('orders-drag-list');
  if (!list) return;
  let draggedId = null;

  list.addEventListener('dragstart', e => {
    const card = e.target.closest('.draggable-order');
    if (!card || card.getAttribute('draggable') !== 'true') { e.preventDefault(); return; }
    draggedId = card.dataset.orderId;
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });

  list.addEventListener('dragend', e => {
    const card = e.target.closest('.draggable-order');
    if (card) card.classList.remove('dragging');
    list.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    draggedId = null;
  });

  list.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const target = e.target.closest('.draggable-order');
    list.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    if (target && target.dataset.orderId !== draggedId) {
      target.classList.add('drag-over');
    }
  });

  list.addEventListener('drop', e => {
    e.preventDefault();
    const target = e.target.closest('.draggable-order');
    if (!target || !draggedId || target.dataset.orderId === draggedId) return;
    const targetId = target.dataset.orderId;

    // Build new locked order: insert dragged before target
    const locked = S.ordersLockedOrders || [];
    // Remove dragged from locked if present
    const filteredLocked = locked.filter(id => id !== draggedId);
    // Find target position - if target is locked, insert before it in locked array
    const targetIdx = filteredLocked.indexOf(targetId);
    if (targetIdx >= 0) {
      filteredLocked.splice(targetIdx, 0, draggedId);
    } else {
      filteredLocked.push(draggedId);
    }
    // Lock the dragged order
    if (!filteredLocked.includes(draggedId)) filteredLocked.push(draggedId);
    S.ordersLockedOrders = filteredLocked;
    lsSave('ordersLockedOrders', filteredLocked);
    renderOrderResults();
  });

  // Touch drag support
  let touchDragId = null;
  let touchClone = null;
  let touchStartY = 0;
  let longPressTimer = null;

  list.addEventListener('touchstart', e => {
    const card = e.target.closest('.draggable-order');
    if (!card || card.getAttribute('draggable') !== 'true') return;
    if (e.target.closest('.order-lock-btn') || e.target.closest('.btn')) return;
    touchStartY = e.touches[0].clientY;
    longPressTimer = setTimeout(() => {
      touchDragId = card.dataset.orderId;
      card.classList.add('dragging');
      // Create visual clone
      touchClone = card.cloneNode(true);
      touchClone.style.cssText = 'position:fixed;z-index:9999;pointer-events:none;opacity:0.8;width:' + card.offsetWidth + 'px;transform:scale(0.95);box-shadow:0 8px 24px rgba(0,0,0,0.2);left:' + card.getBoundingClientRect().left + 'px;top:' + (e.touches[0].clientY - 30) + 'px';
      document.body.appendChild(touchClone);
    }, 300);
  }, { passive: true });

  list.addEventListener('touchmove', e => {
    if (!touchDragId) {
      if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
      return;
    }
    e.preventDefault();
    if (touchClone) touchClone.style.top = (e.touches[0].clientY - 30) + 'px';
    list.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    const el = document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY);
    if (el) {
      const target = el.closest('.draggable-order');
      if (target && target.dataset.orderId !== touchDragId) target.classList.add('drag-over');
    }
  }, { passive: false });

  list.addEventListener('touchend', e => {
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
    if (!touchDragId) return;
    if (touchClone) { touchClone.remove(); touchClone = null; }
    const cards = list.querySelectorAll('.draggable-order');
    cards.forEach(c => { c.classList.remove('dragging'); c.classList.remove('drag-over'); });

    const el = document.elementFromPoint(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    if (el) {
      const target = el.closest('.draggable-order');
      if (target && target.dataset.orderId !== touchDragId) {
        const targetId = target.dataset.orderId;
        const locked = S.ordersLockedOrders || [];
        const filteredLocked = locked.filter(id => id !== touchDragId);
        const targetIdx = filteredLocked.indexOf(targetId);
        if (targetIdx >= 0) {
          filteredLocked.splice(targetIdx, 0, touchDragId);
        } else {
          filteredLocked.push(touchDragId);
        }
        if (!filteredLocked.includes(touchDragId)) filteredLocked.push(touchDragId);
        S.ordersLockedOrders = filteredLocked;
        lsSave('ordersLockedOrders', filteredLocked);
        renderOrderResults();
      }
    }
    touchDragId = null;
  });
}

let editingOrderId = null;

function quickReorder(customerId, lastOrderId) {
  const lastOrder = S.orders[lastOrderId];
  if (!lastOrder || !lastOrder.items || lastOrder.items.length === 0) return;
  editingOrderId = null;
  tempOrderCustomerId = customerId;
  tempOrderItems = lastOrder.items.map(i => ({ name: i.name, qty: i.qty, price: i.price }));
  tempOrderDeliveryDate = '';
  renderOrderFormModal('Tekrar Sipariş', lastOrder.note || '');
}

function closeOrderForm() {
  const el = document.getElementById('order-form-overlay');
  if (el) el.remove();
  document.body.style.overflow = '';
}

function showNewOrderModal(preCustomerId) {
  editingOrderId = null;
  tempOrderItems = [{ name: '', qty: 1, price: 0 }];
  tempOrderCustomerId = preCustomerId != null ? preCustomerId : null;
  tempOrderDeliveryDate = '';
  renderOrderFormModal('Yeni Sipariş');
}

function showEditOrderModal(orderId) {
  const order = S.orders[orderId];
  if (!order) return;
  editingOrderId = orderId;
  tempOrderCustomerId = order.customerId;
  tempOrderItems = order.items.map(i => ({ ...i }));
  if (tempOrderItems.length === 0) tempOrderItems = [{ name: '', qty: 1, price: 0 }];
  tempOrderDeliveryDate = order.deliveryDate || '';
  renderOrderFormModal('Sipariş Düzenle', order.note || '');
}

function renderOrderFormModal(title, existingNote) {
  // Preserve note from existing form if re-rendering
  if (existingNote === undefined) {
    const noteEl = document.getElementById('order-note');
    if (noteEl) existingNote = noteEl.value;
  }
  const selectedStop = tempOrderCustomerId !== null && tempOrderCustomerId !== undefined ? getStop(tempOrderCustomerId) : null;

  let itemsHtml = '';
  let total = 0;
  tempOrderItems.forEach((item, idx) => {
    if (!item.name) return;
    const lineTotal = (item.qty || 0) * (item.price || 0);
    total += lineTotal;
    itemsHtml += `
      <div style="background:var(--bg);border-radius:var(--radius-sm);padding:10px 12px;margin-bottom:8px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <div style="font-size:14px;font-weight:600;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(item.name)}</div>
          <button style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:12px;flex-shrink:0" onclick="removeOrderItem(${idx})">&#10005;</button>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
          <div style="display:flex;align-items:center;gap:4px">
            <button class="qty-btn" onclick="changeOrderItemQty(${idx},-1)">−</button>
            <input type="number" class="qty-input" value="${item.qty}" min="1"
                   onchange="setOrderItemQty(${idx},parseInt(this.value)||1)"
                   onclick="this.select()">
            <button class="qty-btn" onclick="changeOrderItemQty(${idx},1)">+</button>
            <span style="color:var(--text-sec);font-size:11px;margin-left:2px">x</span>
            <div style="display:flex;align-items:center;border:1.5px solid var(--border);border-radius:6px;padding:4px 8px;background:var(--card)" onclick="this.querySelector('input').focus()">
              <span style="color:var(--text-sec);font-size:13px;margin-right:2px">£</span>
              <input type="number" step="0.01" value="${item.price}" min="0"
                     onchange="setOrderItemPrice(${idx},parseFloat(this.value)||0)"
                     onclick="this.select()"
                     style="width:50px;font-size:14px;font-weight:600;border:none;background:transparent;color:var(--text);padding:0;outline:none;-moz-appearance:textfield">
            </div>
          </div>
          <div style="font-size:15px;font-weight:700;flex-shrink:0">${formatCurrency(lineTotal)}</div>
        </div>
      </div>`;
  });

  const hasEmptyItems = tempOrderItems.some(i => !i.name);
  const itemCount = tempOrderItems.filter(i => i.name).length;

  // Close any existing modal first
  closeModal();
  // Remove existing order form overlay if any
  const existingOverlay = document.getElementById('order-form-overlay');
  if (existingOverlay) existingOverlay.remove();

  const overlay = document.createElement('div');
  overlay.className = 'order-form-overlay';
  overlay.id = 'order-form-overlay';
  overlay.innerHTML = `
    <div class="order-form-header">
      <button class="btn-ghost" onclick="closeOrderForm()" style="font-size:20px;padding:4px">&larr;</button>
      <h2>${title}</h2>
    </div>
    <div class="order-form-body">
      <div class="form-group">
        <label class="form-label">Customer</label>
        <div class="input" id="cust-display"
             onclick="${editingOrderId ? '' : 'openCustomerPicker()'}"
             style="cursor:${editingOrderId ? 'default' : 'pointer'};color:${selectedStop ? 'var(--text)' : 'var(--text-muted)'};${editingOrderId ? 'opacity:0.6' : ''}">
          ${selectedStop ? escHtml(selectedStop.n) : 'Tap to select customer...'}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Items${itemCount > 0 ? ' (' + itemCount + ')' : ''}</label>
        <div id="order-items-list">${itemsHtml || '<div style="text-align:center;padding:12px;color:var(--text-muted);font-size:13px">No items added yet</div>'}</div>
        <button class="btn btn-outline btn-block mt-1" onclick="openProductPicker()" style="gap:6px">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Item
        </button>
      </div>
      <div class="flex-between mb-2" style="padding:12px;background:var(--card);border-radius:var(--radius-sm)">
        <span style="font-weight:700;font-size:16px">Total</span>
        <span style="font-weight:700;font-size:18px;color:var(--primary)" id="order-total">${formatCurrency(total)}</span>
      </div>
      <div class="form-group">
        <label class="form-label">Teslimat Tarihi</label>
        <input class="input" type="date" id="order-delivery-date" value="${tempOrderDeliveryDate}" min="${new Date().toISOString().split('T')[0]}" onchange="tempOrderDeliveryDate=this.value">
        <div class="text-muted" style="font-size:11px;margin-top:4px">${tempOrderDeliveryDate ? '' : 'Boş bırakılırsa bugün için geçerli'}</div>
      </div>
      <div class="form-group">
        <label class="form-label">Not (opsiyonel)</label>
        <textarea class="textarea" id="order-note" rows="2" style="min-height:50px">${existingNote !== undefined ? escHtml(existingNote) : ''}</textarea>
      </div>
    </div>
    <div class="order-form-footer">
      <button class="btn btn-primary btn-block" onclick="saveOrder()">${editingOrderId ? 'Siparişi Güncelle' : 'Siparişi Kaydet'}</button>
    </div>
  `;
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
}

function changeOrderItemQty(idx, delta) {
  if (!tempOrderItems[idx]) return;
  const newQty = (tempOrderItems[idx].qty || 1) + delta;
  if (newQty < 1) return;
  tempOrderItems[idx].qty = newQty;
  renderOrderFormModal(editingOrderId ? 'Sipariş Düzenle' : 'Yeni Sipariş');
}

function setOrderItemQty(idx, qty) {
  if (!tempOrderItems[idx]) return;
  tempOrderItems[idx].qty = Math.max(1, qty);
  renderOrderFormModal(editingOrderId ? 'Sipariş Düzenle' : 'Yeni Sipariş');
}

function setOrderItemPrice(idx, price) {
  if (!tempOrderItems[idx]) return;
  tempOrderItems[idx].price = Math.max(0, price);
  renderOrderFormModal(editingOrderId ? 'Sipariş Düzenle' : 'Yeni Sipariş');
}

function openProductPicker() {
  const overlay = document.createElement('div');
  overlay.className = 'product-picker-overlay';
  overlay.id = 'product-picker';
  overlay.innerHTML = `
    <div class="ppick-header">
      <button class="btn-ghost" onclick="closeProductPicker()" style="font-size:20px;padding:4px">&larr;</button>
      <input type="text" id="ppick-search" placeholder="Search product..." autofocus
             oninput="filterProductPicker(this.value)">
    </div>
    <div class="ppick-list" id="ppick-list"></div>
    <div style="padding:12px 16px calc(12px + var(--safe-b));background:var(--card);border-top:1px solid var(--border)">
      <button class="btn btn-primary btn-block" id="ppick-done-btn" onclick="doneProductPicker()">Done</button>
    </div>
  `;
  document.body.appendChild(overlay);
  filterProductPicker('');
}

function closeProductPicker() {
  const el = document.getElementById('product-picker');
  if (el) el.remove();
}

function doneProductPicker() {
  closeProductPicker();
  renderOrderFormModal(editingOrderId ? 'Sipariş Düzenle' : 'Yeni Sipariş');
}

function updateDoneBtn() {
  const btn = document.getElementById('ppick-done-btn');
  if (!btn) return;
  const count = tempOrderItems.filter(i => i.name).length;
  btn.textContent = count > 0 ? 'Done (' + count + ' selected)' : 'Done';
}

function filterProductPicker(q) {
  const list = document.getElementById('ppick-list');
  if (!list) return;
  const query = q.toLowerCase().trim();
  let filtered = S.catalog;
  if (query) filtered = S.catalog.filter(c => c.name.toLowerCase().includes(query));

  const selectedNames = tempOrderItems.filter(i => i.name).map(i => i.name);

  list.innerHTML = filtered.map(c => {
    const isSelected = selectedNames.includes(c.name);
    const outOfStock = c.trackStock !== false && c.stock != null && c.stock <= 0;
    return `<div class="ppick-item${isSelected ? ' selected' : ''}${outOfStock ? ' out-of-stock' : ''}" onclick="${outOfStock ? '' : `toggleProductInOrder('${escHtml(c.name)}')`}" style="${outOfStock ? 'opacity:0.4;pointer-events:none' : ''}">
      <div class="ppick-item-info">
        <div class="ppick-item-name">${escHtml(c.name)}${outOfStock ? ' <span style="color:var(--danger);font-size:11px">(Stok yok)</span>' : (c.trackStock !== false && c.stock != null ? ` <span style="color:var(--text-sec);font-size:11px">(${c.stock})</span>` : '')}</div>
        <div class="ppick-item-detail">${escHtml(c.unit || 'No unit')}</div>
      </div>
      <div class="ppick-item-price">${formatCurrency(tempOrderCustomerId != null ? getPrice(tempOrderCustomerId, c.name) : c.price)}</div>
      <div class="ppick-item-check">${isSelected ? '✓' : ''}</div>
    </div>`;
  }).join('');

  if (filtered.length === 0) {
    list.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted)">No products found</div>';
  }
}

function toggleProductInOrder(productName) {
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
  filterProductPicker(document.getElementById('ppick-search')?.value || '');
  updateDoneBtn();
}

function openCustomerPicker() {
  if (editingOrderId) return;
  const overlay = document.createElement('div');
  overlay.className = 'customer-picker-overlay';
  overlay.id = 'customer-picker';
  overlay.innerHTML = `
    <div class="cpick-header">
      <button class="btn-ghost" onclick="closeCustomerPicker()" style="font-size:20px;padding:4px">&larr;</button>
      <input type="text" id="cpick-search" placeholder="Search customer..." autofocus
             oninput="filterCPicker(this.value)">
    </div>
    <div class="cpick-list" id="cpick-list"></div>
  `;
  document.body.appendChild(overlay);
  filterCPicker('');
}

function filterCPicker(q) {
  const list = document.getElementById('cpick-list');
  if (!list) return;
  const query = q.toLowerCase().trim();
  let filtered = STOPS;
  if (query) filtered = STOPS.filter(s =>
    s.n.toLowerCase().includes(query) ||
    s.c.toLowerCase().includes(query) ||
    s.p.toLowerCase().includes(query)
  );
  filtered.sort((a, b) => a.n.localeCompare(b.n));
  list.innerHTML = filtered.map(s =>
    `<div class="cpick-item" onclick="pickCustomer(${s.id})">
      <div style="font-weight:500">${escHtml(s.n)}</div>
      <div style="font-size:12px;color:var(--text-sec)">${escHtml(s.c)} &middot; ${escHtml(s.p)}</div>
    </div>`
  ).join('');
}

function pickCustomer(stopId) {
  tempOrderCustomerId = stopId;
  closeCustomerPicker();
  updateOrderPrices();
}

function closeCustomerPicker() {
  const el = document.getElementById('customer-picker');
  if (el) el.remove();
}

function updateOrderItem(idx, field, value) {
  if (!tempOrderItems[idx]) return;
  tempOrderItems[idx][field] = value;
  if (field === 'name' && value) {
    const price = tempOrderCustomerId != null ? getPrice(tempOrderCustomerId, value) : (S.catalog.find(c => c.name === value)?.price || 0);
    tempOrderItems[idx].price = price;
  }
  renderOrderFormModal(editingOrderId ? 'Sipariş Düzenle' : 'Yeni Sipariş');
}

function updateOrderPrices() {
  tempOrderItems.forEach(item => {
    if (item.name) {
      item.price = tempOrderCustomerId != null ? getPrice(tempOrderCustomerId, item.name) : (S.catalog.find(c => c.name === item.name)?.price || 0);
    }
  });
  renderOrderFormModal(editingOrderId ? 'Sipariş Düzenle' : 'Yeni Sipariş');
}

function addOrderItem() {
  openProductPicker();
}

function removeOrderItem(idx) {
  tempOrderItems.splice(idx, 1);
  if (tempOrderItems.length === 0) tempOrderItems.push({ name: '', qty: 1, price: 0 });
  renderOrderFormModal(editingOrderId ? 'Sipariş Düzenle' : 'Yeni Sipariş');
}

function saveOrder() {
  if (tempOrderCustomerId == null) { appAlert('Please select a customer.'); return; }
  const items = tempOrderItems.filter(i => i.name && i.qty > 0);
  if (items.length === 0) { appAlert('Please add at least one item.'); return; }

  const existingOrder = editingOrderId ? S.orders[editingOrderId] : null;
  const previousItems = existingOrder ? (existingOrder.items || []) : [];
  const stockIssues = validateTrackedStockChange(previousItems, items);
  if (stockIssues.length > 0) {
    appAlert('Yetersiz stok: ' + stockIssues.join(', '));
    return;
  }

  const note = document.getElementById('order-note')?.value || '';
  const deliveryDate = document.getElementById('order-delivery-date')?.value || '';

  if (editingOrderId && existingOrder) {
    existingOrder.items = items.map(i => ({ name: i.name, qty: i.qty, price: i.price }));
    existingOrder.note = note;
    existingOrder.deliveryDate = deliveryDate;
  } else {
    const id = uid();
    S.orders[id] = {
      id,
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
      setTimeout(() => appAlert('Dusuk stok:<br>' + stockChange.lowStockWarnings.join('<br>')), 300);
    }
  }

  editingOrderId = null;
  save.orders();
  closeOrderForm();
  closeModal();
  if (curPage === 'orders') renderOrders();
  else if (curPage === 'profile') renderProfile();
  else if (curPage === 'route') renderRoute();
}

// ══════════════════════════════════════════════════════════════
// CUSTOMERS PAGE
// ══════════════════════════════════════════════════════════════
function renderCustomers(fullRender) {
  const isSearchUpdate = !fullRender && document.getElementById('customers-results');

  if (!isSearchUpdate) {
    let html = `
      <header class="topbar">
        <h1>Customers</h1>
        <div class="topbar-actions">
          <span class="badge badge-outline">${STOPS.length}</span>
          <button class="btn btn-primary btn-sm" onclick="showAddCustomerModal()">+ Add</button>
        </div>
      </header>
      <div class="page-body">
        <div class="search-bar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Search customers..." value="${escHtml(S.customersSearch)}" oninput="S.customersSearch=this.value;renderCustomerResults()">
        </div>
        <div class="chip-group">
          <button class="chip ${S.customersFilter==='all'?'active':''}" onclick="S.customersFilter='all';renderCustomers(true)">All</button>
          <button class="chip ${S.customersFilter==='A'?'active':''}" onclick="S.customersFilter='A';renderCustomers(true)">Week A</button>
          <button class="chip ${S.customersFilter==='B'?'active':''}" onclick="S.customersFilter='B';renderCustomers(true)">Week B</button>
          <button class="chip ${S.customersFilter==='none'?'active':''}" onclick="S.customersFilter='none';renderCustomers(true)">Unassigned</button>
        </div>
        <div id="customers-results"></div>
      </div>`;
    document.getElementById('page-customers').innerHTML = html;
  }

  renderCustomerResults();
}

function renderCustomerResults() {
  const container = document.getElementById('customers-results');
  if (!container) return;

  let stops = [...STOPS];
  if (S.customersFilter === 'A') stops = stops.filter(s => { const d = S.assign[s.id]; return d && d.startsWith('wA'); });
  else if (S.customersFilter === 'B') stops = stops.filter(s => { const d = S.assign[s.id]; return d && d.startsWith('wB'); });
  else if (S.customersFilter === 'none') stops = stops.filter(s => !S.assign[s.id]);

  if (S.customersSearch) {
    const q = S.customersSearch.toLowerCase();
    stops = stops.filter(s => s.n.toLowerCase().includes(q) || s.c.toLowerCase().includes(q) || s.p.toLowerCase().includes(q));
  }
  stops.sort((a, b) => a.n.localeCompare(b.n));

  let html = '';
  if (stops.length === 0) {
    html = `<div class="empty-state"><p><b>No customers found</b></p></div>`;
  } else {
    stops.forEach(s => {
      const dayId = S.assign[s.id];
      const dayObj = dayId ? getDayObj(dayId) : null;
      const pending = getStopOrders(s.id, 'pending').length;
      const debt = S.debts[s.id] || 0;
      html += `
        <div class="customer-card" onclick="showProfile(${s.id})">
          <div class="customer-avatar">${getCustomerInitials(s.n)}</div>
          <div class="customer-info">
            <div class="customer-name">${escHtml(s.n)}</div>
            <div class="customer-area">${escHtml(s.c)} &middot; ${escHtml(s.p)}</div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:3px">
            ${dayObj ? `<span class="badge" style="background:${dayObj.color}20;color:${dayObj.color};font-size:10px">${dayObj.week}/${dayObj.label.slice(0,3)}</span>` : '<span class="badge badge-outline" style="font-size:10px">None</span>'}
            ${pending > 0 ? `<span class="badge badge-warning" style="font-size:10px">${pending} pending</span>` : ''}
            ${debt > 0 ? `<span class="badge badge-danger" style="font-size:10px">${formatCurrency(debt)}</span>` : ''}
          </div>
        </div>`;
    });
  }
  container.innerHTML = html;
}

function showAddCustomerModal() {
  openModal(`
    <div class="modal-handle"></div>
    <div class="modal-title">Add Customer</div>
    <div class="form-group">
      <label class="form-label">Name</label>
      <input class="input" id="add-cust-name" placeholder="Customer name">
    </div>
    <div class="form-group">
      <label class="form-label">Address</label>
      <input class="input" id="add-cust-addr" placeholder="Street address">
    </div>
    <div class="form-group">
      <label class="form-label">City / Area</label>
      <input class="input" id="add-cust-city" placeholder="City or area">
    </div>
    <div class="form-group">
      <label class="form-label">Postcode</label>
      <input class="input" id="add-cust-post" placeholder="Postcode">
    </div>
    <div class="form-group">
      <label class="form-label">Ad Soyad (İletişim)</label>
      <input class="input" id="add-cust-cn" placeholder="Ad Soyad">
    </div>
    <div class="form-group">
      <label class="form-label">Cep Telefonu</label>
      <input class="input" id="add-cust-ph" type="tel" placeholder="07xxx xxxxxx">
    </div>
    <div class="form-group">
      <label class="form-label">Email</label>
      <input class="input" id="add-cust-em" type="email" placeholder="email@ornek.com">
    </div>
    <button class="btn btn-primary btn-block" onclick="saveNewCustomer()">Save Customer</button>
  `);
}

async function saveNewCustomer() {
  const name = document.getElementById('add-cust-name').value.trim();
  if (!name) { appAlert('Name is required.'); return; }
  const maxId = STOPS.reduce((m, s) => Math.max(m, s.id), 0);
  const stop = {
    id: maxId + 1,
    n: name.toUpperCase(),
    a: document.getElementById('add-cust-addr').value.trim(),
    c: document.getElementById('add-cust-city').value.trim(),
    p: normalizePostcode(document.getElementById('add-cust-post').value),
    cn: document.getElementById('add-cust-cn').value.trim(),
    ph: document.getElementById('add-cust-ph').value.trim(),
    em: document.getElementById('add-cust-em').value.trim()
  };
  STOPS.push(stop);
  save.stops();
  await geocodeStop(stop, { force: true });
  closeModal();
  renderCustomers();
}

// ══════════════════════════════════════════════════════════════
// PROFILE PAGE
// ══════════════════════════════════════════════════════════════
function showProfile(stopId) {
  profilePreviousPage = curPage || 'customers';
  profileStopId = parseInt(stopId);
  showPage('profile');
}

function renderProfile() {
  const stop = getStop(profileStopId);
  if (!stop) { showPage('customers'); return; }

  const dayId = S.assign[stop.id];
  const dayObj = dayId ? getDayObj(dayId) : null;
  const pending = getStopOrders(stop.id, 'pending');
  const delivered = getStopOrders(stop.id, 'delivered').sort((a, b) => (b.deliveredAt || '').localeCompare(a.deliveredAt || ''));
  const recentDelivered = delivered.slice(0, 20);
  const debt = S.debts[stop.id] || 0;
  const note = S.cnotes[stop.id] || '';

  let html = `
    <header class="topbar">
      <button class="btn-ghost" onclick="showPage('${profilePreviousPage}')" style="font-size:18px;padding:8px">&larr;</button>
      <h1 style="flex:1;text-align:center;font-size:16px">${escHtml(stop.n)}</h1>
      <button class="btn-ghost" onclick="showEditCustomerModal()" style="font-size:13px;color:var(--primary)">Edit</button>
    </header>
    <div class="page-body">
      <!-- Info Card -->
      <div class="card" style="text-align:center">
        <div class="profile-avatar">${getCustomerInitials(stop.n)}</div>
        <div style="font-size:12px;color:var(--text-sec);margin-top:4px">${escHtml(stop.a)}</div>
        <div style="font-size:12px;color:var(--text-sec)">${escHtml(stop.c)} &middot; ${escHtml(stop.p)}</div>
        ${dayObj ? `<div style="margin-top:8px"><span class="badge" style="background:${dayObj.color}20;color:${dayObj.color}">Week ${dayObj.week} - ${dayObj.label}</span></div>` : '<div style="margin-top:8px"><span class="badge badge-outline">Not assigned</span></div>'}
        ${note ? `<div style="margin-top:8px;font-size:12px;color:var(--text-sec);font-style:italic">"${escHtml(note)}"</div>` : ''}
        ${(stop.cn || stop.ph || stop.em) ? `
          <div style="margin-top:10px;display:flex;flex-direction:column;gap:4px;align-items:center;font-size:13px">
            ${stop.cn ? `<div style="color:var(--text-sec)"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:4px"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>${escHtml(stop.cn)}</div>` : ''}
            ${stop.ph ? `<div><a href="tel:${escHtml(stop.ph)}" style="color:var(--primary);text-decoration:none"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:4px"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.44 16l.48.92z"/></svg>${escHtml(stop.ph)}</a></div>` : ''}
            ${stop.em ? `<div><a href="mailto:${escHtml(stop.em)}" style="color:var(--primary);text-decoration:none"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:4px"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>${escHtml(stop.em)}</a></div>` : ''}
          </div>` : ''}
        ${(S.customerProducts[stop.id] && S.customerProducts[stop.id].length > 0) ? `
          <div style="margin-top:8px;display:flex;gap:4px;flex-wrap:wrap;justify-content:center">
            ${S.customerProducts[stop.id].map(p => `<span class="badge badge-purple" style="font-size:10px">${escHtml(p)}</span>`).join('')}
          </div>` : ''}
      </div>

      <!-- Action Bar -->
      <div class="action-bar">
        <button class="action-btn" onclick="showAssignModal()">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          Assign
        </button>
        <button class="action-btn" onclick="showCustomerProductsModal()">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
          Products
        </button>
        <button class="action-btn" onclick="showPricingModal()">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          Pricing
        </button>
        <button class="action-btn" onclick="showNoteModal()">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Note
        </button>
        <button class="action-btn" onclick="showNewOrderModal(${stop.id})">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
          Order
        </button>
      </div>

      <!-- Debt -->
      <div class="section-head"><h3>Outstanding Debt</h3></div>
      <div class="debt-card">
        <div class="flex-between">
          <span class="debt-amount ${debt > 0 ? 'text-danger' : 'text-success'}">${formatCurrency(debt)}</span>
        </div>
        <div class="debt-actions">
          <button class="btn btn-outline btn-sm" onclick="showAddDebtModal()">Add Debt</button>
          <button class="btn btn-success btn-sm" onclick="showClearDebtModal()" ${debt <= 0 ? 'disabled' : ''}>Clear Debt</button>
          <button class="btn btn-sm" style="color:var(--danger);border:1px solid var(--danger)" onclick="removeAllDebt()" ${debt <= 0 ? 'disabled' : ''}>Remove Debt</button>
        </div>
      </div>

      <!-- Quick Reorder -->
      ${(() => {
        const lastDelivered = getStopOrders(stop.id, 'delivered')
          .filter(o => o.items && o.items.length > 0)
          .sort((a,b) => new Date(b.deliveredAt) - new Date(a.deliveredAt))[0];
        return lastDelivered ? `
        <div style="margin:8px 0">
          <button class="btn btn-block" style="background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;gap:8px" onclick="quickReorder(${stop.id},'${lastDelivered.id}')">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            Son Siparişi Tekrarla
          </button>
          <div class="text-muted" style="font-size:11px;text-align:center;margin-top:4px">${lastDelivered.items.map(i => i.qty + 'x ' + escHtml(i.name)).join(', ')} — ${formatCurrency(calcOrderTotal(lastDelivered))}</div>
        </div>` : '';
      })()}

      <!-- Pending Orders -->
      <div class="section-head"><h3>Pending Orders (${pending.length})</h3></div>`;

  if (pending.length === 0) {
    html += `<p class="text-muted" style="font-size:13px;padding:8px 0">No pending orders</p>`;
  } else {
    pending.forEach(o => {
      html += `
        <div class="order-card">
          <div class="order-card-head">
            <div class="order-card-date">${formatDateTime(o.createdAt)}${o.deliveryDate ? ` · Teslimat: ${o.deliveryDate}` : ''}</div>
            <span class="badge badge-warning">pending</span>
          </div>
          <div class="order-card-items">${o.items.map(i => `${i.qty}x ${escHtml(i.name)}`).join(', ')}</div>
          <div class="order-card-footer">
            <span class="order-card-total">${formatCurrency(calcOrderTotal(o))}</span>
            <button class="btn btn-danger btn-sm" onclick="deleteOrder('${o.id}')">Delete</button>
          </div>
        </div>`;
    });
  }

  html += `<div class="section-head"><h3>Order History</h3></div>`;
  if (recentDelivered.length === 0) {
    html += `<p class="text-muted" style="font-size:13px;padding:8px 0">No delivery history</p>`;
  } else {
    recentDelivered.forEach(o => {
      const isVisit = o.payMethod === 'visit';
      const badgeLabel = isVisit ? 'visited' : 'delivered';
      const badgeClass = isVisit ? 'badge-purple' : 'badge-success';
      const payLabel = o.payMethod === 'visit' ? '' : o.payMethod === 'cash' && o.cashPaid !== undefined && o.cashPaid < calcOrderTotal(o) ? `cash (partial ${formatCurrency(o.cashPaid)})` : (o.payMethod || '');
      html += `
        <div class="order-card" style="opacity:0.85">
          <div class="order-card-head">
            <div class="order-card-date">${formatDateTime(o.deliveredAt)}</div>
            <span class="badge ${badgeClass}">${badgeLabel}</span>
          </div>
          ${o.items.length > 0 ? `<div class="order-card-items">${o.items.map(i => `${i.qty}x ${escHtml(i.name)}`).join(', ')}</div>` : (o.note ? `<div class="order-card-items text-muted">${escHtml(o.note)}</div>` : '')}
          ${o.deliveryNote ? `<div class="text-muted" style="font-size:12px;padding:2px 0;font-style:italic">📝 ${escHtml(o.deliveryNote)}</div>` : ''}
          <div class="order-card-footer">
            ${o.items.length > 0 ? `<span class="order-card-total">${formatCurrency(calcOrderTotal(o))}</span>` : '<span></span>'}
            <span class="text-muted" style="font-size:12px">${payLabel}</span>
          </div>
          <div style="display:flex;gap:6px;justify-content:flex-end;margin-top:4px">
            <button class="btn-ghost" style="font-size:11px;color:var(--primary);padding:2px 6px" onclick="showEditDeliveredOrderModal('${o.id}')">Edit</button>
            <button class="btn-ghost" style="font-size:11px;color:var(--danger);padding:2px 6px" onclick="deleteOrder('${o.id}')">Sil</button>
          </div>
        </div>`;
    });
  }

  // Debt History (only show add/clear with actual amounts, skip visit-only entries)
  const dhRaw = S.debtHistory[stop.id] || [];
  const dh = dhRaw.map((h, i) => ({...h, _idx: i})).filter(h => h.type !== 'visit' && h.amount > 0);
  if (dh.length > 0) {
    html += `<div class="section-head"><h3>Debt History</h3></div>`;
    dh.slice(0, 15).forEach(h => {
      html += `<div class="card" style="padding:10px;margin-bottom:6px">
        <div class="flex-between">
          <span style="font-size:13px;flex:1;min-width:0">${h.note || h.type}</span>
          <span style="font-size:13px;font-weight:600;color:${h.type === 'add' ? 'var(--danger)' : 'var(--success)'};white-space:nowrap;margin-left:8px">
            ${h.type === 'add' ? '+' : '-'}${formatCurrency(Math.abs(h.amount))}
          </span>
        </div>
        <div class="flex-between" style="margin-top:4px">
          <div class="text-muted" style="font-size:11px">${formatDateTime(h.date)}</div>
          <div style="display:flex;gap:6px">
            <button class="btn-ghost" style="font-size:11px;color:var(--primary);padding:2px 6px" onclick="showEditDebtHistoryModal(${stop.id},${h._idx})">Edit</button>
            <button class="btn-ghost" style="font-size:11px;color:var(--danger);padding:2px 6px" onclick="removeDebtHistory(${stop.id},${h._idx})">Remove</button>
          </div>
        </div>
      </div>`;
    });
  }

  html += `</div>`; // page-body
  document.getElementById('page-profile').innerHTML = html;
}

async function deleteOrder(orderId) {
  if (!(await appConfirm('Bu kaydi silmek istediginize emin misiniz?'))) return;
  const order = S.orders[orderId];
  if (!order) return;

  const stockChange = applyTrackedStockChange(order.items || [], []);
  const debtChanged = reconcileOrderDebtEffect(order, null);
  delete S.orders[orderId];

  if (stockChange.changed) save.catalog();
  if (debtChanged) {
    save.debts();
    save.debtHistory();
  }
  save.orders();
  if (curPage === 'profile') renderProfile();
  else if (curPage === 'orders') renderOrders();
}

function showEditDeliveredOrderModal(orderId) {
  const o = S.orders[orderId];
  if (!o) return;
  const isVisit = o.payMethod === 'visit';
  const dt = o.deliveredAt ? new Date(o.deliveredAt) : new Date();
  const dateVal = dt.toISOString().slice(0, 16);
  const total = calcOrderTotal(o);
  const cashValue = roundMoney(Math.min(total, o.cashPaid !== undefined ? o.cashPaid : total));

  let modalHtml = `
    <div class="modal-handle"></div>
    <div class="modal-title">${isVisit ? 'Ziyaret Duzenle' : 'Teslimat Duzenle'}</div>
    <div class="form-group">
      <label class="form-label">Tarih</label>
      <input class="input" type="datetime-local" id="edit-del-date" value="${dateVal}">
    </div>`;

  if (isVisit) {
    modalHtml += `
    <div class="form-group">
      <label class="form-label">Not</label>
      <textarea class="textarea" id="edit-del-note" rows="2">${escHtml(o.note || o.deliveryNote || '')}</textarea>
    </div>`;
  } else {
    modalHtml += `
    <div class="form-group">
      <label class="form-label">Odeme Yontemi</label>
      <select class="input" id="edit-del-pay" onchange="toggleEditDeliveredCash(this.value)">
        <option value="cash" ${o.payMethod==='cash'?'selected':''}>Cash</option>
        <option value="bank" ${o.payMethod==='bank'?'selected':''}>Bank</option>
        <option value="unpaid" ${o.payMethod==='unpaid'?'selected':''}>Not Paid</option>
      </select>
    </div>
    <div class="form-group ${o.payMethod==='cash'?'':'hidden'}" id="edit-del-cash-wrap">
      <label class="form-label">Nakit Alinan Tutar</label>
      <input class="input" type="number" step="0.01" id="edit-del-cash" value="${cashValue.toFixed(2)}"
             data-total="${total}" oninput="updateEditDeliveredCashHint()">
      <div class="text-muted" style="font-size:12px;margin-top:4px" id="edit-del-cash-hint"></div>
    </div>
    <div class="form-group">
      <label class="form-label">Teslimat Notu</label>
      <textarea class="textarea" id="edit-del-note" rows="2">${escHtml(o.deliveryNote || '')}</textarea>
    </div>`;
  }

  modalHtml += `
    <button class="btn btn-primary btn-block mt-2" onclick="saveEditDeliveredOrder('${orderId}')">Kaydet</button>`;
  openModal(modalHtml);
  if (!isVisit) updateEditDeliveredCashHint();
}

function toggleEditDeliveredCash(method) {
  const wrap = document.getElementById('edit-del-cash-wrap');
  if (!wrap) return;
  wrap.classList.toggle('hidden', method !== 'cash');
  if (method === 'cash') updateEditDeliveredCashHint();
}

function updateEditDeliveredCashHint() {
  const input = document.getElementById('edit-del-cash');
  const hint = document.getElementById('edit-del-cash-hint');
  if (!input || !hint) return;
  const total = roundMoney(parseFloat(input.dataset.total) || 0);
  const paid = roundMoney(Math.max(0, parseFloat(input.value) || 0));
  const remaining = roundMoney(Math.max(0, total - paid));
  hint.innerHTML = remaining > 0 ? `<span style="color:var(--danger)">${formatCurrency(remaining)} borca eklenecek</span>` : '';
}

function saveEditDeliveredOrder(orderId) {
  const o = S.orders[orderId];
  if (!o) return;
  const prevOrder = JSON.parse(JSON.stringify(o));
  const dateInput = document.getElementById('edit-del-date');
  if (dateInput && dateInput.value) {
    o.deliveredAt = new Date(dateInput.value).toISOString();
  }
  const isVisit = prevOrder.payMethod === 'visit';
  let debtChanged = false;
  if (isVisit) {
    const note = document.getElementById('edit-del-note')?.value?.trim() || '';
    o.note = note;
    o.deliveryNote = note;
  } else {
    const pay = document.getElementById('edit-del-pay')?.value;
    if (pay) {
      o.payMethod = pay;
      if (pay === 'cash') {
        const total = calcOrderTotal(o);
        const cashInput = document.getElementById('edit-del-cash');
        o.cashPaid = roundMoney(Math.max(0, Math.min(total, parseFloat(cashInput?.value) || total)));
      } else {
        delete o.cashPaid;
      }
    }
    o.deliveryNote = document.getElementById('edit-del-note')?.value?.trim() || '';
    debtChanged = reconcileOrderDebtEffect(prevOrder, o);
  }
  if (debtChanged) {
    save.debts();
    save.debtHistory();
  }
  save.orders();
  closeModal();
  if (curPage === 'profile') renderProfile();
}

function showEditCustomerModal() {
  const stop = getStop(profileStopId);
  if (!stop) return;
  openModal(`
    <div class="modal-handle"></div>
    <div class="modal-title">Edit Customer</div>
    <div class="form-group">
      <label class="form-label">Name</label>
      <input class="input" id="edit-cust-name" value="${escHtml(stop.n)}">
    </div>
    <div class="form-group">
      <label class="form-label">Address</label>
      <input class="input" id="edit-cust-addr" value="${escHtml(stop.a)}">
    </div>
    <div class="form-group">
      <label class="form-label">City / Area</label>
      <input class="input" id="edit-cust-city" value="${escHtml(stop.c)}">
    </div>
    <div class="form-group">
      <label class="form-label">Postcode</label>
      <input class="input" id="edit-cust-post" value="${escHtml(stop.p)}">
    </div>
    <div class="form-group">
      <label class="form-label">Ad Soyad (İletişim)</label>
      <input class="input" id="edit-cust-cn" value="${escHtml(stop.cn||'')}">
    </div>
    <div class="form-group">
      <label class="form-label">Cep Telefonu</label>
      <input class="input" id="edit-cust-ph" type="tel" value="${escHtml(stop.ph||'')}">
    </div>
    <div class="form-group">
      <label class="form-label">Email</label>
      <input class="input" id="edit-cust-em" type="email" value="${escHtml(stop.em||'')}">
    </div>
    <button class="btn btn-primary btn-block mb-1" onclick="saveEditCustomer()">Save</button>
    <button class="btn btn-danger btn-block" onclick="deleteCustomer()">Delete Customer</button>
  `);
}

async function saveEditCustomer() {
  const stop = getStop(profileStopId);
  if (!stop) return;
  const previousAddressKey = getStopAddressKey(stop);
  stop.n = (document.getElementById('edit-cust-name').value.trim() || stop.n).toUpperCase();
  stop.a = document.getElementById('edit-cust-addr').value.trim();
  stop.c = document.getElementById('edit-cust-city').value.trim();
  stop.p = normalizePostcode(document.getElementById('edit-cust-post').value);
  stop.cn = document.getElementById('edit-cust-cn').value.trim();
  stop.ph = document.getElementById('edit-cust-ph').value.trim();
  stop.em = document.getElementById('edit-cust-em').value.trim();
  save.stops();
  if (previousAddressKey !== getStopAddressKey(stop)) {
    await geocodeStop(stop, { force: true });
    if (leafletMap) refreshMapMarkers();
  }
  closeModal();
  renderProfile();
}

async function deleteCustomer() {
  if (!(await appConfirm('Are you sure you want to delete this customer?<br>This cannot be undone.'))) return;
  STOPS = STOPS.filter(s => s.id !== profileStopId);
  delete S.assign[profileStopId];
  save.stops();
  save.assign();
  closeModal();
  showPage('customers');
}

// ══════════════════════════════════════════════════════════════
// ASSIGN DAY
// ══════════════════════════════════════════════════════════════
function showAssignModal() {
  const stop = getStop(profileStopId);
  if (!stop) return;
  const currentDay = S.assign[stop.id];

  let html = `<div class="modal-handle"></div>
    <div class="modal-title">Assign Day - ${escHtml(stop.n)}</div>`;

  ['A', 'B'].forEach(week => {
    html += `<div style="font-size:13px;font-weight:600;color:var(--text-sec);margin:12px 0 6px">Week ${week}</div>`;
    DAYS.filter(d => d.week === week).forEach(d => {
      const isActive = currentDay === d.id;
      html += `<button class="btn ${isActive ? 'btn-primary' : 'btn-outline'} btn-block mb-1"
        style="${!isActive ? 'border-color:'+d.color+'40;color:'+d.color : 'background:'+d.color}"
        onclick="assignToDay('${d.id}')">
        ${d.label}
      </button>`;
    });
  });

  if (currentDay) {
    html += `<button class="btn btn-danger btn-block mt-2" onclick="unassignFromDay()">Remove from Route</button>`;
  }

  openModal(html);
}

function assignToDay(dayId) {
  S.assign[profileStopId] = dayId;
  save.assign();
  closeModal();
  renderProfile();
}

function unassignFromDay() {
  delete S.assign[profileStopId];
  save.assign();
  closeModal();
  renderProfile();
}

// ══════════════════════════════════════════════════════════════
// CUSTOMER PRODUCTS (which products this customer uses)
// ══════════════════════════════════════════════════════════════
function showCustomerProductsModal() {
  const stop = getStop(profileStopId);
  if (!stop) return;
  const assigned = S.customerProducts[stop.id] || [];

  if (S.catalog.length === 0) {
    openModal(`<div class="modal-handle"></div>
      <div class="modal-title">Customer Products</div>
      <p class="text-muted text-center" style="padding:20px">No products in catalog. Add products in Settings first.</p>
      <button class="btn btn-outline btn-block" onclick="closeModal()">Close</button>
    `);
    return;
  }

  let html = `<div class="modal-handle"></div>
    <div class="modal-title">Products - ${escHtml(stop.n)}</div>
    <p class="text-muted mb-2" style="font-size:12px">Select the products this customer uses.</p>`;

  S.catalog.forEach((c, i) => {
    const checked = assigned.includes(c.name);
    html += `<label style="display:flex;align-items:center;gap:10px;padding:12px;border-bottom:1px solid var(--border);cursor:pointer">
      <input type="checkbox" id="cprod-${i}" ${checked ? 'checked' : ''} value="${escHtml(c.name)}"
        style="width:20px;height:20px;accent-color:var(--primary)">
      <div style="flex:1">
        <div style="font-weight:500">${escHtml(c.name)}</div>
        <div class="text-muted" style="font-size:12px">${escHtml(c.unit || '')} - ${formatCurrency(c.price)}</div>
      </div>
    </label>`;
  });

  html += `<button class="btn btn-primary btn-block mt-2" onclick="saveCustomerProducts()">Save</button>`;
  openModal(html);
}

function saveCustomerProducts() {
  const products = [];
  S.catalog.forEach((c, i) => {
    const el = document.getElementById('cprod-' + i);
    if (el && el.checked) products.push(c.name);
  });
  if (products.length > 0) {
    S.customerProducts[profileStopId] = products;
  } else {
    delete S.customerProducts[profileStopId];
  }
  save.customerProducts();
  closeModal();
  renderProfile();
}

// ══════════════════════════════════════════════════════════════
// PRICING MODAL
// ══════════════════════════════════════════════════════════════
function showPricingModal() {
  const stop = getStop(profileStopId);
  if (!stop) return;
  const cp = S.customerPricing[stop.id] || {};

  if (S.catalog.length === 0) {
    openModal(`<div class="modal-handle"></div>
      <div class="modal-title">Custom Pricing</div>
      <p class="text-muted text-center" style="padding:20px">No products in catalog. Add products in Settings first.</p>
      <button class="btn btn-outline btn-block" onclick="closeModal()">Close</button>
    `);
    return;
  }

  let html = `<div class="modal-handle"></div>
    <div class="modal-title">Custom Pricing - ${escHtml(stop.n)}</div>
    <p class="text-muted mb-2" style="font-size:12px">Leave blank to use default catalog price.</p>`;

  S.catalog.forEach((c, i) => {
    const val = cp[c.name] !== undefined ? cp[c.name] : '';
    html += `<div class="flex-between mb-1">
      <div><div style="font-weight:500">${escHtml(c.name)}</div><div class="text-muted" style="font-size:12px">Default: ${formatCurrency(c.price)}</div></div>
      <input class="input" type="number" step="0.01" style="width:90px;text-align:right" id="cp-${i}" value="${val}" placeholder="${c.price}">
    </div>`;
  });

  html += `<button class="btn btn-primary btn-block mt-2" onclick="savePricing()">Save Pricing</button>`;
  openModal(html);
}

function savePricing() {
  const cp = {};
  S.catalog.forEach((c, i) => {
    const el = document.getElementById('cp-' + i);
    if (el && el.value !== '') cp[c.name] = parseFloat(el.value) || 0;
  });
  S.customerPricing[profileStopId] = cp;
  save.pricing();
  closeModal();
}

// ══════════════════════════════════════════════════════════════
// NOTE MODAL
// ══════════════════════════════════════════════════════════════
function showNoteModal() {
  const note = S.cnotes[profileStopId] || '';
  openModal(`<div class="modal-handle"></div>
    <div class="modal-title">Customer Note</div>
    <div class="form-group">
      <textarea class="textarea" id="note-text" rows="4">${escHtml(note)}</textarea>
    </div>
    <button class="btn btn-primary btn-block" onclick="saveNote()">Save Note</button>
  `);
}

function saveNote() {
  const note = document.getElementById('note-text').value.trim();
  if (note) S.cnotes[profileStopId] = note;
  else delete S.cnotes[profileStopId];
  save.cnotes();
  closeModal();
  renderProfile();
}

// ══════════════════════════════════════════════════════════════
// DEBT MANAGEMENT
// ══════════════════════════════════════════════════════════════
function showAddDebtModal() {
  openModal(`<div class="modal-handle"></div>
    <div class="modal-title">Add Debt</div>
    <div class="form-group">
      <label class="form-label">Amount</label>
      <input class="input" type="number" step="0.01" id="debt-amount" placeholder="0.00">
    </div>
    <div class="form-group">
      <label class="form-label">Note (optional)</label>
      <input class="input" id="debt-note" placeholder="Reason...">
    </div>
    <button class="btn btn-primary btn-block" onclick="addDebt()">Add Debt</button>
  `);
}

function addDebt() {
  const amount = parseFloat(document.getElementById('debt-amount').value) || 0;
  if (amount <= 0) { appAlert('Enter a valid amount.'); return; }
  const note = document.getElementById('debt-note').value.trim() || 'Manual entry';

  S.debts[profileStopId] = (S.debts[profileStopId] || 0) + amount;
  if (!S.debtHistory[profileStopId]) S.debtHistory[profileStopId] = [];
  S.debtHistory[profileStopId].unshift({
    date: new Date().toISOString(), amount: amount, type: 'add', note: note
  });
  save.debts();
  save.debtHistory();
  closeModal();
  renderProfile();
}

function showClearDebtModal() {
  const debt = S.debts[profileStopId] || 0;
  openModal(`<div class="modal-handle"></div>
    <div class="modal-title">Clear Debt</div>
    <p class="mb-2">Current debt: <b>${formatCurrency(debt)}</b></p>
    <div class="form-group">
      <label class="form-label">Amount to clear</label>
      <input class="input" type="number" step="0.01" id="clear-amount" value="${debt.toFixed(2)}">
    </div>
    <div class="form-group">
      <label class="form-label">Payment Method</label>
      <div class="pay-options">
        <div class="pay-opt selected" onclick="selectClearMethod('cash',this)" id="clear-cash">Cash</div>
        <div class="pay-opt" onclick="selectClearMethod('bank',this)" id="clear-bank">Bank</div>
      </div>
    </div>
    <button class="btn btn-success btn-block" onclick="clearDebt()">Clear Debt</button>
  `);
}

let clearDebtMethod = 'cash';
function selectClearMethod(method, el) {
  clearDebtMethod = method;
  document.querySelectorAll('.pay-opt').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
}

function clearDebt() {
  const debt = S.debts[profileStopId] || 0;
  const requested = parseFloat(document.getElementById('clear-amount').value) || 0;
  const amount = roundMoney(Math.min(debt, Math.max(0, requested)));
  if (amount <= 0) return;
  S.debts[profileStopId] = Math.max(0, roundMoney(debt - amount));
  createDebtHistoryEntry(profileStopId, {
    date: new Date().toISOString(), amount: amount, type: 'clear',
    note: 'Payment received (' + clearDebtMethod + ')'
  });
  save.debts();
  save.debtHistory();
  closeModal();
  renderProfile();
}

async function removeAllDebt() {
  const debt = S.debts[profileStopId] || 0;
  if (debt <= 0) return;
  if (!(await appConfirm('Remove entire debt of ' + formatCurrency(debt) + '?<br>This will NOT create a payment record.'))) return;
  S.debts[profileStopId] = 0;
  save.debts();
  renderProfile();
}

function showEditDebtHistoryModal(stopId, idx) {
  const dh = S.debtHistory[stopId];
  if (!dh || !dh[idx]) return;
  const h = dh[idx];
  openModal(`
    <div class="modal-handle"></div>
    <div class="modal-title">Edit Debt Entry</div>
    <div class="form-group">
      <label class="form-label">Amount</label>
      <input class="input" type="number" step="0.01" id="edit-dh-amount" value="${h.amount}">
    </div>
    <div class="form-group">
      <label class="form-label">Note</label>
      <input class="input" id="edit-dh-note" value="${escHtml(h.note || '')}">
    </div>
    <button class="btn btn-primary btn-block" onclick="saveEditDebtHistory(${stopId},${idx})">Save</button>
  `);
}

function saveEditDebtHistory(stopId, idx) {
  const dh = S.debtHistory[stopId];
  if (!dh || !dh[idx]) return;
  const oldAmount = dh[idx].amount;
  const oldType = dh[idx].type;
  const newAmount = parseFloat(document.getElementById('edit-dh-amount').value) || 0;
  dh[idx].amount = newAmount;
  dh[idx].note = document.getElementById('edit-dh-note').value.trim();
  // Adjust debt balance
  if (oldType === 'add') {
    S.debts[stopId] = (S.debts[stopId] || 0) - oldAmount + newAmount;
  } else {
    S.debts[stopId] = (S.debts[stopId] || 0) + oldAmount - newAmount;
  }
  S.debts[stopId] = Math.max(0, S.debts[stopId]);
  save.debts();
  save.debtHistory();
  closeModal();
  renderProfile();
}

async function removeDebtHistory(stopId, idx) {
  if (!(await appConfirm('Remove this debt entry?'))) return;
  const dh = S.debtHistory[stopId];
  if (!dh || !dh[idx]) return;
  const h = dh[idx];
  // Reverse the debt effect
  if (h.type === 'add') {
    S.debts[stopId] = Math.max(0, (S.debts[stopId] || 0) - h.amount);
  } else {
    S.debts[stopId] = (S.debts[stopId] || 0) + h.amount;
  }
  dh.splice(idx, 1);
  save.debts();
  save.debtHistory();
  renderProfile();
}

// ══════════════════════════════════════════════════════════════
// REPORTS PAGE
// ══════════════════════════════════════════════════════════════
let reportTab = 'overview';

function renderReports() {
  const data = calcReportData();

  let html = `
    <header class="topbar">
      <h1>Reports</h1>
    </header>
    <!-- Report Tabs -->
    <div class="day-tabs" style="border-bottom:1px solid var(--border)">
      <button class="day-tab ${reportTab==='overview'?'active':''}" style="${reportTab==='overview'?'background:var(--primary);color:#fff':''}" onclick="reportTab='overview';renderReports()">Overview</button>
      <button class="day-tab ${reportTab==='products'?'active':''}" style="${reportTab==='products'?'background:var(--primary);color:#fff':''}" onclick="reportTab='products';renderReports()">Products</button>
      <button class="day-tab ${reportTab==='customers'?'active':''}" style="${reportTab==='customers'?'background:var(--primary);color:#fff':''}" onclick="reportTab='customers';renderReports()">Customers</button>
      <button class="day-tab ${reportTab==='debts'?'active':''}" style="${reportTab==='debts'?'background:var(--primary);color:#fff':''}" onclick="reportTab='debts';renderReports()">Debts</button>
      <button class="day-tab ${reportTab==='export'?'active':''}" style="${reportTab==='export'?'background:var(--primary);color:#fff':''}" onclick="reportTab='export';renderReports()">Export</button>
      <button class="day-tab ${reportTab==='history'?'active':''}" style="${reportTab==='history'?'background:var(--primary);color:#fff':''}" onclick="reportTab='history';renderReports()">History</button>
    </div>
    <div class="page-body">
      <!-- Date Range (always visible) -->
      <div class="date-range-bar">
        <button class="date-btn ${S.reportRange==='today'?'active':''}" onclick="setReportRange('today')">Today</button>
        <button class="date-btn ${S.reportRange==='week'?'active':''}" onclick="setReportRange('week')">This Week</button>
        <button class="date-btn ${S.reportRange==='month'?'active':''}" onclick="setReportRange('month')">This Month</button>
        <button class="date-btn ${S.reportRange==='custom'?'active':''}" onclick="setReportRange('custom')">Custom</button>
      </div>
      ${S.reportRange === 'custom' ? `
        <div class="custom-dates">
          <input type="date" value="${S.reportStart}" onchange="S.reportStart=this.value;renderReports()">
          <input type="date" value="${S.reportEnd}" onchange="S.reportEnd=this.value;renderReports()">
        </div>
      ` : ''}`;

  if (reportTab === 'overview') {
    html += `
      <!-- Summary Cards -->
      <div class="metric-grid">
        <div class="metric-card">
          <div class="metric-value text-success">${formatCurrency(data.totalRevenue)}</div>
          <div class="metric-label">Revenue</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${data.deliveryCount}</div>
          <div class="metric-label">Deliveries</div>
        </div>
        <div class="metric-card">
          <div class="metric-value" style="color:var(--purple)">${data.visitCount}</div>
          <div class="metric-label">Visits</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${formatCurrency(data.avgOrder)}</div>
          <div class="metric-label">Avg Order</div>
        </div>
        <div class="metric-card">
          <div class="metric-value text-danger">${formatCurrency(data.totalDebt)}</div>
          <div class="metric-label">Total Debt</div>
        </div>
      </div>

      <!-- Payment Breakdown -->
      <div class="report-section">
        <h3>Payment Summary</h3>
        <div class="card">
          <div class="flex-between mb-1">
            <span style="display:flex;align-items:center;gap:6px"><span style="width:10px;height:10px;border-radius:50%;background:var(--success);display:inline-block"></span> Cash</span>
            <span style="font-weight:600">${formatCurrency(data.payments.cash)}</span>
          </div>
          <div class="progress-bar mb-2">
            <div class="progress-fill" style="width:${data.totalRevenue > 0 ? (data.payments.cash / data.totalRevenue * 100) : 0}%;background:var(--success)"></div>
          </div>
          <div class="flex-between mb-1">
            <span style="display:flex;align-items:center;gap:6px"><span style="width:10px;height:10px;border-radius:50%;background:var(--info);display:inline-block"></span> Bank</span>
            <span style="font-weight:600">${formatCurrency(data.payments.bank)}</span>
          </div>
          <div class="progress-bar mb-2">
            <div class="progress-fill" style="width:${data.totalRevenue > 0 ? (data.payments.bank / data.totalRevenue * 100) : 0}%;background:var(--info)"></div>
          </div>
          <div class="flex-between mb-1">
            <span style="display:flex;align-items:center;gap:6px"><span style="width:10px;height:10px;border-radius:50%;background:var(--danger);display:inline-block"></span> Unpaid</span>
            <span style="font-weight:600">${formatCurrency(data.payments.unpaid)}</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width:${data.totalRevenue > 0 ? (data.payments.unpaid / data.totalRevenue * 100) : 0}%;background:var(--danger)"></div>
          </div>
        </div>
      </div>`;
  } else if (reportTab === 'products') {
    html += `
      <!-- Product Filter -->
      ${S.catalog.length > 0 ? `
        <div style="margin-bottom:12px">
          <div style="font-size:12px;font-weight:600;color:var(--text-sec);margin-bottom:6px">Filter Products</div>
          <div class="chip-group">
            <button class="chip ${S.reportProducts.length===0?'active':''}" onclick="S.reportProducts=[];renderReports()">All</button>
            ${S.catalog.map(c => `
              <button class="chip ${S.reportProducts.includes(c.name)?'active':''}"
                onclick="toggleReportProduct('${escHtml(c.name)}')">${escHtml(c.name)}</button>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Product Breakdown -->
      <div class="report-section">
        <h3>Product Breakdown</h3>
        ${Object.keys(data.products).length === 0 ? '<p class="text-muted" style="font-size:13px">No data for this period</p>' : `
          <div class="card" style="padding:0;overflow:hidden">
            <table class="report-table">
              <thead><tr><th>Product</th><th class="text-right">Qty</th><th class="text-right">Revenue</th></tr></thead>
              <tbody>
                ${Object.entries(data.products)
                  .sort((a, b) => b[1].revenue - a[1].revenue)
                  .map(([name, d]) => `
                    <tr><td>${escHtml(name)}</td><td class="text-right">${d.qty}</td><td class="text-right">${formatCurrency(d.revenue)}</td></tr>
                  `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>`;
  } else if (reportTab === 'customers') {
    html += `
      <!-- Top Customers -->
      <div class="report-section">
        <h3>Top Customers</h3>
        ${Object.keys(data.customers).length === 0 ? '<p class="text-muted" style="font-size:13px">No data for this period</p>' : `
          <div class="card" style="padding:0;overflow:hidden">
            <table class="report-table">
              <thead><tr><th>Customer</th><th class="text-right">Orders</th><th class="text-right">Revenue</th></tr></thead>
              <tbody>
                ${Object.entries(data.customers)
                  .sort((a, b) => b[1].revenue - a[1].revenue)
                  .slice(0, 30)
                  .map(([id, d]) => {
                    const s = getStop(parseInt(id));
                    return `<tr onclick="showProfile(${id})" style="cursor:pointer"><td>${s ? escHtml(s.n) : 'Unknown'}</td><td class="text-right">${d.orders}</td><td class="text-right">${formatCurrency(d.revenue)}</td></tr>`;
                  }).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>`;
  } else if (reportTab === 'debts') {
    const debtors = Object.entries(S.debts).filter(([_, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    const totalDebt = debtors.reduce((s, [_, v]) => s + v, 0);
    html += `
      <div class="card" style="text-align:center;margin-bottom:12px">
        <div style="font-size:12px;color:var(--text-sec)">Total Outstanding</div>
        <div style="font-size:28px;font-weight:700;color:var(--danger)">${formatCurrency(totalDebt)}</div>
        <div class="text-muted" style="font-size:12px">${debtors.length} customer${debtors.length !== 1 ? 's' : ''} with debt</div>
      </div>
      ${debtors.length === 0 ? '<p class="text-muted text-center" style="font-size:13px;padding:20px">No outstanding debts</p>' : `
        <div class="card" style="padding:0;overflow:hidden">
          <table class="report-table">
            <thead><tr><th>Customer</th><th class="text-right">Debt</th></tr></thead>
            <tbody>${debtors.map(([id, amount]) => {
              const s = getStop(parseInt(id));
              return `<tr onclick="showProfile(${id})" style="cursor:pointer"><td>${s ? escHtml(s.n) : 'Unknown'}</td><td class="text-right text-danger" style="font-weight:600">${formatCurrency(amount)}</td></tr>`;
            }).join('')}</tbody>
          </table>
        </div>
      `}`;
  } else if (reportTab === 'export') {
    html += `
      <!-- Product Filter for Export -->
      ${S.catalog.length > 0 ? `
        <div style="margin-bottom:12px">
          <div style="font-size:12px;font-weight:600;color:var(--text-sec);margin-bottom:6px">Select Products for Report</div>
          <div class="chip-group">
            ${S.catalog.map(c => `
              <button class="chip ${S.reportProducts.includes(c.name)?'active':''}"
                onclick="toggleReportProduct('${escHtml(c.name)}')">${escHtml(c.name)}</button>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Product Sales Report -->
      <div class="report-section">
        <h3>Product Sales Report</h3>
        ${(() => {
          if (S.reportProducts.length === 0) return '<div class="card" style="text-align:center;padding:20px"><p class="text-muted" style="font-size:13px">Select products above to generate a sales report</p></div>';
          const report = calcProductSalesReport();
          if (report.rows.length === 0) return '<div class="card" style="text-align:center;padding:20px"><p class="text-muted" style="font-size:13px">No matching orders for this period</p></div>';
          let t = `<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:10px">`;
          report.rows.forEach(r => {
            let payHtml = '';
            r.payDisplay.parts.forEach(p => {
              const c = p.type === 'cash' ? 'var(--success)' : p.type === 'bank' ? 'var(--info)' : 'var(--danger)';
              payHtml += `<span style="font-weight:700;color:${c};font-size:14px">${p.text}</span> `;
            });
            if (r.payDisplay.unpaidAmount > 0 && r.payDisplay.type !== 'unpaid') {
              payHtml += `<span style="font-weight:600;color:var(--danger);font-size:11px">(kalan: ${formatCurrency(r.payDisplay.unpaidAmount)})</span>`;
            }
            t += `<div style="background:${r.isDebtPayment ? '#f0fdf4' : 'var(--card)'};border:1px solid var(--border);border-radius:10px;padding:10px 12px">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:4px">
                <span style="font-weight:600;font-size:14px">${escHtml(r.name)}</span>
                <span style="font-size:11px;color:var(--text-sec);white-space:nowrap;flex-shrink:0">${r.dateTime || ''}</span>
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
                <div>${payHtml}</div>
                <div style="font-size:12px;color:${r.isDebtPayment ? 'var(--success)' : 'var(--text-sec)'};text-align:right">${r.isDebtPayment ? '<em>'+r.productsSummary+'</em>' : r.productsSummary}</div>
              </div>
            </div>`;
          });
          t += `</div>
          <div style="background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:10px 14px;margin-bottom:12px">
            <div style="font-size:13px;font-weight:700;margin-bottom:4px">TOPLAM (${report.rows.length})</div>
            <div style="display:flex;flex-wrap:wrap;gap:8px;font-size:13px;font-weight:600">
              <span style="color:var(--success)">Cash ${formatCurrency(report.totalCash)}</span>
              <span style="color:var(--info)">Bank ${formatCurrency(report.totalBank)}</span>
              <span style="color:var(--danger)">Unpaid ${formatCurrency(report.totalUnpaid)}</span>
            </div>
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-primary" style="flex:1;padding:12px" onclick="exportProductReportPDF()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              PDF
            </button>
            <button class="btn btn-outline" style="flex:1;padding:12px" onclick="exportProductReportExcel()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 7h8M8 12h8M8 17h4"/></svg>
              Excel
            </button>
          </div>`;
          return t;
        })()}
      </div>`;
  } else if (reportTab === 'history') {
    html += renderDeliveryHistoryContent();
  }

  html += `</div>`;

  document.getElementById('page-reports').innerHTML = html;
}

function setReportRange(range) {
  S.reportRange = range;
  const today = new Date();
  if (range === 'today') {
    S.reportStart = todayStr();
    S.reportEnd = todayStr();
  } else if (range === 'week') {
    const jsDay = today.getDay();
    const mondayOff = jsDay === 0 ? -6 : 1 - jsDay;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOff);
    S.reportStart = monday.toISOString().slice(0, 10);
    S.reportEnd = todayStr();
  } else if (range === 'month') {
    S.reportStart = today.toISOString().slice(0, 8) + '01';
    S.reportEnd = todayStr();
  }
  renderReports();
}

function toggleReportProduct(name) {
  const idx = S.reportProducts.indexOf(name);
  if (idx >= 0) S.reportProducts.splice(idx, 1);
  else S.reportProducts.push(name);
  renderReports();
}

function calcReportData() {
  const orders = Object.values(S.orders);

  let filtered = orders.filter(o => {
    if (o.status !== 'delivered' || !o.deliveredAt) return false;
    const d = o.deliveredAt.slice(0, 10);
    if (S.reportStart && d < S.reportStart) return false;
    if (S.reportEnd && d > S.reportEnd) return false;
    return true;
  });

  if (S.reportProducts.length > 0) {
    filtered = filtered.filter(o =>
      o.items.some(item => S.reportProducts.includes(item.name))
    );
  }

  const totalRevenue = filtered.filter(o => o.payMethod !== 'visit').reduce((s, o) => s + calcOrderTotal(o), 0);
  const deliveryCount = filtered.filter(o => o.payMethod !== 'visit').length;
  const visitCount = filtered.filter(o => o.payMethod === 'visit').length;
  const avgOrder = deliveryCount > 0 ? totalRevenue / deliveryCount : 0;
  const totalDebt = Object.values(S.debts).reduce((s, d) => s + (d || 0), 0);

  const products = {};
  filtered.forEach(o => {
    o.items.forEach(item => {
      if (S.reportProducts.length > 0 && !S.reportProducts.includes(item.name)) return;
      if (!products[item.name]) products[item.name] = { qty: 0, revenue: 0 };
      products[item.name].qty += item.qty;
      products[item.name].revenue += item.qty * item.price;
    });
  });

  const payments = { cash: 0, bank: 0, unpaid: 0 };
  filtered.forEach(o => {
    const total = calcOrderTotal(o);
    if (o.payMethod === 'cash') {
      const paid = (o.cashPaid !== undefined) ? o.cashPaid : total;
      payments.cash += Math.min(paid, total);
      payments.unpaid += Math.max(0, total - paid);
    } else if (o.payMethod === 'bank') {
      payments.bank += total;
    } else if (o.payMethod !== 'visit') {
      payments.unpaid += total;
    }
  });

  const customers = {};
  filtered.forEach(o => {
    const id = o.customerId;
    if (!customers[id]) customers[id] = { orders: 0, revenue: 0 };
    customers[id].orders++;
    customers[id].revenue += calcOrderTotal(o);
  });

  return { totalRevenue, deliveryCount, visitCount, avgOrder, totalDebt, products, payments, customers };
}

function calcProductSalesReport() {
  const orders = Object.values(S.orders);
  let filtered = orders.filter(o => {
    if (o.status !== 'delivered' || !o.deliveredAt) return false;
    if (o.payMethod === 'visit' && (!o.items || o.items.length === 0)) return false;
    const d = o.deliveredAt.slice(0, 10);
    if (S.reportStart && d < S.reportStart) return false;
    if (S.reportEnd && d > S.reportEnd) return false;
    return o.items.some(item => S.reportProducts.includes(item.name));
  });

  // Sort by delivery date
  filtered.sort((a, b) => (a.deliveredAt || '').localeCompare(b.deliveredAt || ''));

  const rows = [];
  let totalCash = 0, totalBank = 0, totalUnpaid = 0, grandTotal = 0;

  // Each order = separate row
  filtered.forEach(o => {
    const stop = getStop(o.customerId);
    if (!stop) return;

    const total = calcOrderTotal(o);
    const prodMap = {};
    o.items.forEach(item => {
      if (S.reportProducts.includes(item.name)) {
        prodMap[item.name] = (prodMap[item.name] || 0) + item.qty;
      }
    });

    let cashPaid = 0, bankPaid = 0, unpaidTotal = 0;
    if (o.payMethod === 'cash') {
      const paid = (o.cashPaid !== undefined) ? o.cashPaid : total;
      cashPaid = Math.min(paid, total);
      unpaidTotal = Math.max(0, total - paid);
    } else if (o.payMethod === 'bank') {
      bankPaid = total;
    } else {
      unpaidTotal = total;
    }

    const payDisplay = (() => {
      const parts = [];
      let primaryType = 'unpaid';
      if (cashPaid > 0) { parts.push({ text: formatCurrency(cashPaid), type: 'cash' }); primaryType = 'cash'; }
      if (bankPaid > 0) { parts.push({ text: 'Bank', type: 'bank' }); if (primaryType === 'unpaid') primaryType = 'bank'; }
      if (unpaidTotal > 0) { parts.push({ text: 'Not Paid', type: 'unpaid' }); }
      if (parts.length === 0) parts.push({ text: 'Not Paid', type: 'unpaid' });
      return { parts, type: primaryType, unpaidAmount: unpaidTotal };
    })();

    totalCash += cashPaid;
    totalBank += bankPaid;
    totalUnpaid += unpaidTotal;
    grandTotal += total;

    rows.push({
      name: stop.n,
      rawDate: o.deliveredAt || '',
      dateTime: formatDateTime(o.deliveredAt),
      dateOnly: formatDate(o.deliveredAt),
      payDisplay,
      productsSummary: Object.entries(prodMap).map(([n, q]) => `${q} ${n}`).join(', '),
      total
    });
  });

  // Add debt payment rows (outstanding payment received)
  Object.entries(S.debtHistory).forEach(([cid, history]) => {
    if (!history) return;
    const stop = getStop(parseInt(cid));
    if (!stop) return;
    history.forEach(entry => {
      if (entry.type !== 'clear') return;
      const d = entry.date ? entry.date.slice(0, 10) : '';
      if (S.reportStart && d < S.reportStart) return;
      if (S.reportEnd && d > S.reportEnd) return;
      const payMethod = entry.note?.includes('bank') ? 'bank' : entry.note?.includes('cash') ? 'cash' : 'bank';
      const parts = [{ text: formatCurrency(entry.amount), type: payMethod }];
      if (payMethod === 'cash') totalCash += entry.amount;
      else totalBank += entry.amount;
      totalUnpaid = Math.max(0, totalUnpaid - entry.amount);
      rows.push({
        name: stop.n,
        rawDate: entry.date || '',
        dateTime: formatDateTime(entry.date),
        dateOnly: formatDate(entry.date),
        payDisplay: { parts, type: payMethod, unpaidAmount: 0 },
        productsSummary: 'Outstanding payment received',
        total: entry.amount,
        isDebtPayment: true
      });
    });
  });

  // Sort by date ascending (old to new)
  rows.sort((a, b) => (a.rawDate || '').localeCompare(b.rawDate || ''));

  return { rows, totalCash, totalBank, totalUnpaid, grandTotal };
}

function getReportDateLabel() {
  if (S.reportRange === 'custom') return `${S.reportStart} to ${S.reportEnd}`;
  return `${S.reportStart} to ${S.reportEnd}`;
}

function exportProductReportPDF() {
  const report = calcProductSalesReport();
  if (report.rows.length === 0) { appAlert('No data to export.'); return; }

  const dateLabel = getReportDateLabel();
  const exportDate = new Date().toLocaleString('en-GB');
  const productsLabel = S.reportProducts.join(', ');

  let tableRows = '';
  report.rows.forEach(r => {
    let payCell = '';
    r.payDisplay.parts.forEach(p => {
      const c = p.type === 'cash' ? '#12B76A' : p.type === 'bank' ? '#2E90FA' : '#F04438';
      payCell += `<div style="color:${c};font-weight:600">${p.text}</div>`;
    });
    if (r.payDisplay.unpaidAmount > 0 && r.payDisplay.type !== 'unpaid') {
      payCell += `<div style="color:#F04438;font-size:10px;font-weight:600">left: ${formatCurrency(r.payDisplay.unpaidAmount)}</div>`;
    }
    tableRows += `<tr${r.isDebtPayment ? ' style="background:#f0fdf4"' : ''}>
      <td>${escHtml(r.name)}</td>
      <td>${payCell}</td>
      <td>${r.isDebtPayment ? '<em style="color:#12B76A">'+r.productsSummary+'</em>' : r.productsSummary}</td>
    </tr>`;
  });

  const html = `<!DOCTYPE html><html><head>
    <meta charset="UTF-8">
    <title>Product Sales Report - ${exportDate}</title>
    <style>
      body{font-family:'Inter',Arial,sans-serif;font-size:12px;color:#111;padding:20px;max-width:800px;margin:0 auto}
      h1{font-size:18px;margin-bottom:4px}
      .meta{color:#666;font-size:11px;margin-bottom:16px}
      table{width:100%;border-collapse:collapse;margin-bottom:16px}
      th{text-align:left;padding:8px;background:#f5f5f7;border-bottom:2px solid #ddd;font-size:11px;color:#666}
      td{padding:8px;border-bottom:1px solid #eee}
      .total-row{background:#f5f5f7;font-weight:700}
      .total-row td{border-top:2px solid #ddd}
      @media print{body{padding:10px}.no-print{display:none!important}}
    </style>
  </head><body>
    <h1>Costadoro Delivery - Product Sales Report</h1>
    <div class="meta">
      Period: ${dateLabel}<br>
      Products: ${escHtml(productsLabel)}<br>
      Generated: ${exportDate}
    </div>
    <table>
      <thead><tr><th>Customer</th><th>Payment</th><th>Products</th></tr></thead>
      <tbody>
        ${tableRows}
        <tr class="total-row">
          <td>TOTAL (${report.rows.length})</td>
          <td style="font-size:10px">
            <span style="color:#12B76A">Cash ${formatCurrency(report.totalCash)}</span> |
            <span style="color:#2E90FA">Bank ${formatCurrency(report.totalBank)}</span> |
            <span style="color:#F04438">Unpaid ${formatCurrency(report.totalUnpaid)}</span>
          </td>
          <td></td>
        </tr>
      </tbody>
    </table>
    <button class="no-print" onclick="window.print()" style="padding:10px 24px;background:#E85D3A;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer">
      Save as PDF
    </button>
  </body></html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function exportProductReportExcel() {
  const report = calcProductSalesReport();
  if (report.rows.length === 0) { appAlert('No data to export.'); return; }

  const data = [['Customer', 'Date', 'Payment', 'Unpaid', 'Products']];
  report.rows.forEach(r => {
    const payText = r.payDisplay.parts.map(p => p.text).join(' + ');
    const unpaidText = r.payDisplay.unpaidAmount > 0 ? formatCurrency(r.payDisplay.unpaidAmount) : '';
    data.push([r.name, r.dateTime || '', payText, unpaidText, r.isDebtPayment ? 'Outstanding payment received' : r.productsSummary]);
  });
  data.push([]);
  data.push(['TOTAL']);
  data.push(['Cash', '', formatCurrency(report.totalCash)]);
  data.push(['Bank', '', formatCurrency(report.totalBank)]);
  data.push(['Unpaid', '', formatCurrency(report.totalUnpaid)]);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [{ wch: 30 }, { wch: 18 }, { wch: 15 }, { wch: 12 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Product Report');
  XLSX.writeFile(wb, 'product_report_' + todayStr() + '.xlsx');
}

// ══════════════════════════════════════════════════════════════
// SETTINGS PAGE
// ══════════════════════════════════════════════════════════════
function renderSettings() {
  let html = `
    <header class="topbar">
      <h1>Settings</h1>
    </header>
    <div class="page-body">

      <!-- Catalog Section -->
      <div class="settings-section">
        <div class="settings-title">Product Catalog</div>
        <div class="settings-card">
          <div class="settings-item" onclick="showPage('catalog')" style="cursor:pointer">
            <div>
              <div class="settings-item-label">Manage Catalog</div>
              <div class="settings-item-desc">${S.catalog.length} products</div>
            </div>
            <span style="color:var(--text-muted)">&rarr;</span>
          </div>
        </div>
      </div>

      <!-- Map Section -->
      <div class="settings-section">
        <div class="settings-title">Map</div>
        <div class="settings-card">
          <div class="settings-item" onclick="showMapModal()" style="cursor:pointer">
            <div>
              <div class="settings-item-label">View Map</div>
              <div class="settings-item-desc">See all customers on map</div>
            </div>
            <span style="color:var(--text-muted)">&rarr;</span>
          </div>
          <div class="settings-item" onclick="geocodeAllStops()" style="cursor:pointer">
            <div>
              <div class="settings-item-label">Tümünü Geocode Et</div>
              <div class="settings-item-desc">Koordinatı olmayan müşterileri geocode et</div>
            </div>
            <span style="color:var(--text-muted)">&rarr;</span>
          </div>
        </div>
      </div>

      <!-- Import/Export Section -->
      <div class="settings-section">
        <div class="settings-title">Data</div>
        <div class="settings-card">
          <div class="settings-item" style="cursor:pointer" onclick="showImportModal()">
            <div>
              <div class="settings-item-label">Import from Excel</div>
              <div class="settings-item-desc">Upload customer list (.xlsx)</div>
            </div>
            <span style="color:var(--text-muted)">&rarr;</span>
          </div>
          <div class="settings-item" style="cursor:pointer" onclick="exportExcel()">
            <div>
              <div class="settings-item-label">Export to Excel</div>
              <div class="settings-item-desc">Download all data</div>
            </div>
            <span style="color:var(--text-muted)">&rarr;</span>
          </div>
        </div>
      </div>

      <!-- Data Backup -->
      <div class="settings-section">
        <div class="settings-title">Veri Yedekleme</div>
        <div class="settings-card">
          <div class="settings-item" style="cursor:pointer" onclick="exportJSON()">
            <div>
              <div class="settings-item-label">JSON Olarak Dışa Aktar</div>
              <div class="settings-item-desc">Tüm verileri yedek dosyasına kaydet</div>
            </div>
            <span style="color:var(--text-muted)">&darr;</span>
          </div>
          <div class="settings-item" style="cursor:pointer" onclick="document.getElementById('json-import-input').click()">
            <div>
              <div class="settings-item-label">JSON'dan İçe Aktar</div>
              <div class="settings-item-desc">Yedek dosyasından verileri geri yükle</div>
            </div>
            <span style="color:var(--text-muted)">&uarr;</span>
          </div>
        </div>
        <input type="file" id="json-import-input" accept=".json" style="display:none" onchange="importJSON(this)">
      </div>


      <!-- Danger Zone -->
      <div class="settings-section">
        <div class="settings-title" style="color:var(--danger)">Danger Zone</div>
        <div class="settings-card">
          <div class="settings-item">
            <div>
              <div class="settings-item-label">Reset All Data</div>
              <div class="settings-item-desc">Clear all local data and start fresh</div>
            </div>
            <button class="btn btn-danger btn-sm" onclick="resetAllData()">Reset</button>
          </div>
        </div>
      </div>

      <!-- App Info -->
      <div class="text-center text-muted" style="padding:20px;font-size:12px">
        Costadoro Delivery v2.0<br>
        ${STOPS.length} customers &middot; ${Object.keys(S.orders).length} orders
      </div>
    </div>`;

  document.getElementById('page-settings').innerHTML = html;
}

let editingCatalogIdx = -1;

function renderCatalog() {
  let html = `
    <header class="topbar">
      <button class="btn-ghost" onclick="showPage('settings')" style="font-size:18px;padding:8px">&larr;</button>
      <h1 style="flex:1;text-align:center;font-size:16px">Product Catalog</h1>
      <span class="badge badge-outline">${S.catalog.length} products</span>
    </header>
    <div class="page-body">
      <div class="card" style="margin-bottom:12px">
        <div style="font-size:13px;font-weight:600;margin-bottom:8px">Add Product</div>
        <div style="display:flex;gap:8px;margin-bottom:8px">
          <input class="input" id="cat-name" placeholder="Product name" style="flex:1;min-width:0">
        </div>
        <div style="display:flex;gap:8px">
          <input class="input" id="cat-unit" placeholder="Unit" style="flex:1;min-width:0">
          <input class="input" id="cat-price" placeholder="£0.00" type="number" step="0.01" style="flex:1;min-width:0">
          <input class="input" id="cat-stock" placeholder="Stok" type="number" style="flex:0.7;min-width:0">
          <button class="btn btn-primary" onclick="addCatalogItem()" style="flex-shrink:0;padding:10px 20px">Add</button>
        </div>
      </div>`;

  if (S.catalog.length === 0) {
    html += `<div class="empty-state"><p><b>No products yet</b></p><p>Add products above</p></div>`;
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
  if (!name) { appAlert('Product name is required.'); return; }
  if (S.catalog.some(c => c.name === name)) { appAlert('Product already exists.'); return; }
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
// JSON BACKUP
// ══════════════════════════════════════════════════════════════
function exportJSON() {
  const backup = {
    version: '2.0',
    exportedAt: new Date().toISOString(),
    data: {
      stops: STOPS,
      assign: S.assign,
      routeOrder: S.routeOrder,
      geo: S.geo,
      orders: S.orders,
      debts: S.debts,
      debtHistory: S.debtHistory,
      cnotes: S.cnotes,
      catalog: S.catalog,
      customerPricing: S.customerPricing,
      customerProducts: S.customerProducts,
      recurringOrders: S.recurringOrders
    }
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `costadoro-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  appAlert('Yedek dosyası indirildi.');
}

async function importJSON(input) {
  const file = input.files[0];
  if (!file) return;
  input.value = '';
  try {
    const text = await file.text();
    const backup = JSON.parse(text);
    if (!backup.data) { appAlert('Geçersiz yedek dosyası.'); return; }
    if (!(await appConfirm(`Bu yedek ${backup.exportedAt ? formatDate(backup.exportedAt) : 'bilinmeyen tarih'} tarihli.<br>Mevcut verilerin üzerine yazılacak. Devam?`))) return;
    const d = backup.data;
    if (d.stops) { STOPS = d.stops; save.stops(); }
    if (d.assign) { S.assign = d.assign; save.assign(); }
    if (d.routeOrder) { S.routeOrder = d.routeOrder; save.routeOrder(); }
    if (d.geo) { S.geo = d.geo; save.geo(); }
    if (d.orders) { S.orders = d.orders; save.orders(); }
    if (d.debts) { S.debts = d.debts; save.debts(); }
    if (d.debtHistory) { S.debtHistory = d.debtHistory; save.debtHistory(); }
    if (d.cnotes) { S.cnotes = d.cnotes; save.cnotes(); }
    if (d.catalog) { S.catalog = d.catalog; save.catalog(); }
    if (d.customerPricing) { S.customerPricing = d.customerPricing; save.pricing(); }
    if (d.customerProducts) { S.customerProducts = d.customerProducts; save.customerProducts(); }
    if (d.recurringOrders) { S.recurringOrders = d.recurringOrders; save.recurringOrders(); }
    appAlert('Veriler başarıyla geri yüklendi.');
    renderSettings();
  } catch (e) {
    appAlert('Dosya okunamadı: ' + e.message);
  }
}

// ══════════════════════════════════════════════════════════════
// DELIVERY HISTORY PAGE
// ══════════════════════════════════════════════════════════════
let dhSearchTerm = '';

function renderDeliveryHistoryContent() {
  // Group all delivered orders by week
  const delivered = Object.values(S.orders).filter(o => o.status === 'delivered' && o.deliveredAt);
  const weeks = {};
  delivered.forEach(o => {
    const monday = getWeekMondayStr(o.deliveredAt);
    if (!weeks[monday]) weeks[monday] = [];
    weeks[monday].push(o);
  });

  // Sort weeks descending (most recent first)
  const sortedWeeks = Object.keys(weeks).sort((a, b) => b.localeCompare(a));

  // Determine week label (A or B) using the same logic as getCurrentWeek
  const ref = new Date(2026, 2, 2); // 2 March 2026 = Week A Monday
  function weekLabel(mondayStr) {
    const mon = new Date(mondayStr);
    const diffDays = Math.floor((mon - ref) / 86400000);
    const weekNum = Math.floor(diffDays / 7);
    return (weekNum % 2 === 0) ? 'A' : 'B';
  }

  const thisMonday = getWeekMondayStr(new Date());

  let html = `
    <div style="margin-bottom:12px">
      <input class="input" type="search" placeholder="Müşteri ara..." value="${escHtml(dhSearchTerm)}" oninput="dhSearchTerm=this.value;reportTab='history';renderReports()">
    </div>`;

  if (sortedWeeks.length === 0) {
    html += `<div class="empty-state"><p>Henüz teslimat geçmişi yok</p></div>`;
  } else {
    sortedWeeks.forEach(monday => {
      const orders = weeks[monday];
      const wLabel = weekLabel(monday);
      const isCurrent = monday === thisMonday;
      const monDate = new Date(monday);
      const endDate = new Date(monDate);
      endDate.setDate(endDate.getDate() + 4); // Friday
      const dateRange = monDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' - ' + endDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

      // Filter by search
      let filtered = orders;
      if (dhSearchTerm) {
        const term = dhSearchTerm.toLowerCase();
        filtered = orders.filter(o => {
          const stop = getStop(o.customerId);
          return stop && stop.n.toLowerCase().includes(term);
        });
        if (filtered.length === 0) return;
      }

      // Sort within week: newest first
      filtered.sort((a, b) => (b.deliveredAt || '').localeCompare(a.deliveredAt || ''));

      // Group by customer
      const byCustomer = {};
      filtered.forEach(o => {
        if (!byCustomer[o.customerId]) byCustomer[o.customerId] = [];
        byCustomer[o.customerId].push(o);
      });

      // Week summary
      const totalRev = filtered.filter(o => o.payMethod !== 'visit').reduce((s, o) => s + calcOrderTotal(o), 0);
      const cashTotal = filtered.filter(o => o.payMethod === 'cash').reduce((s, o) => {
        const total = calcOrderTotal(o);
        const paid = (o.cashPaid !== undefined) ? Math.min(o.cashPaid, total) : total;
        return s + paid;
      }, 0);
      const bankTotal = filtered.filter(o => o.payMethod === 'bank').reduce((s, o) => s + calcOrderTotal(o), 0);
      const visitCount = filtered.filter(o => o.payMethod === 'visit').length;
      const deliveryCount = filtered.filter(o => o.payMethod !== 'visit').length;

      html += `
        <div class="card" style="margin-bottom:12px;overflow:hidden">
          <div style="padding:12px;background:${isCurrent ? 'var(--primary)' : '#f3f4f6'};color:${isCurrent ? '#fff' : 'var(--text)'}">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <div>
                <b>Week ${wLabel}</b>${isCurrent ? ' (Bu Hafta)' : ''}
                <div style="font-size:12px;opacity:0.8">${dateRange}</div>
              </div>
              <div style="text-align:right;font-size:12px">
                <div>${deliveryCount} teslimat · ${visitCount} ziyaret</div>
                ${totalRev > 0 ? `<div style="font-weight:700">${formatCurrency(totalRev)}</div>` : ''}
              </div>
            </div>
            ${totalRev > 0 ? `<div style="display:flex;gap:12px;margin-top:6px;font-size:11px;opacity:0.85">
              <span>Cash: ${formatCurrency(cashTotal)}</span>
              <span>Bank: ${formatCurrency(bankTotal)}</span>
            </div>` : ''}
          </div>
          <div style="padding:8px">`;

      Object.entries(byCustomer).forEach(([cid, cOrders]) => {
        const stop = getStop(cid);
        if (!stop) return;
        const custTotal = cOrders.filter(o => o.payMethod !== 'visit').reduce((s, o) => s + calcOrderTotal(o), 0);
        const allVisit = cOrders.every(o => o.payMethod === 'visit');

        html += `<div style="padding:8px;border-bottom:1px solid var(--border)">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-weight:600;font-size:13px;cursor:pointer;color:var(--primary)" onclick="showProfile(${cid})">${escHtml(stop.n)}</span>
            <span style="font-size:12px;${allVisit ? 'color:#8b5cf6' : 'font-weight:600'}">${allVisit ? 'visited' : formatCurrency(custTotal)}</span>
          </div>`;

        // Within customer, sort newest first
        cOrders.sort((a, b) => (b.deliveredAt || '').localeCompare(a.deliveredAt || '')).forEach(o => {
          const isVisit = o.payMethod === 'visit';
          const dt = new Date(o.deliveredAt);
          const dayName = dt.toLocaleDateString('en-GB', { weekday: 'short' });
          const time = dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
          html += `<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-sec);padding:2px 0">
            <span>${dayName} ${time} — ${isVisit ? 'Ziyaret' : o.items.map(i => i.qty + 'x ' + i.name).join(', ')}</span>
            <span>${isVisit ? '' : (o.payMethod || '')}</span>
          </div>`;
        });

        html += `</div>`;
      });

      html += `</div></div>`;
    });
  }

  return html;
}

function renderDeliveryHistory() {
  // Redirect to reports history tab
  reportTab = 'history';
  showPage('reports');
}

// ══════════════════════════════════════════════════════════════
// MAP PAGE
// ══════════════════════════════════════════════════════════════
let mapAssignStopId = null;

function showMapModal() { showPage('map'); }
function closeMapModal() { showPage('settings'); }

function renderMapPage() {
  let html = `
    <header class="topbar">
      <button class="btn-ghost" onclick="showPage('settings')" style="font-size:18px;padding:8px">&larr;</button>
      <h1 style="flex:1;text-align:center;font-size:16px">Map</h1>
      <div style="width:36px"></div>
    </header>
    <div class="chip-group" style="padding:8px 16px;background:var(--card);border-bottom:1px solid var(--border);margin:0">
      <button class="chip ${S.mapFilter==='all'?'active':''}" onclick="S.mapFilter='all';refreshMapMarkers()">All</button>
      <button class="chip ${S.mapFilter==='A'?'active':''}" onclick="S.mapFilter='A';refreshMapMarkers()">Week A</button>
      <button class="chip ${S.mapFilter==='B'?'active':''}" onclick="S.mapFilter='B';refreshMapMarkers()">Week B</button>
      <button class="chip ${S.mapFilter==='none'?'active':''}" onclick="S.mapFilter='none';refreshMapMarkers()">Unassigned</button>
    </div>
    <div id="map-container" style="flex:1;min-height:0"></div>`;
  document.getElementById('page-map').innerHTML = html;

  setTimeout(() => {
    const container = document.getElementById('map-container');
    if (!container) return;
    if (leafletMap) { leafletMap.remove(); leafletMap = null; }
    leafletMap = L.map(container).setView([51.45, 0.05], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(leafletMap);
    leafletMap.on('zoomend', updateTooltipVisibility);
    refreshMapMarkers();
  }, 150);
}

function refreshMapMarkers() {
  if (!leafletMap) return;
  mapMarkers.forEach(m => leafletMap.removeLayer(m));
  mapMarkers = [];
  mapRouteLines.forEach(l => leafletMap.removeLayer(l));
  mapRouteLines = [];

  // Update filter chip visuals
  document.querySelectorAll('#page-map .chip').forEach(c => {
    const filter = c.textContent.trim();
    const val = filter === 'All' ? 'all' : filter === 'Week A' ? 'A' : filter === 'Week B' ? 'B' : 'none';
    c.classList.toggle('active', val === S.mapFilter);
  });

  // Build route order per day (same logic as route page)
  const dayStopOrder = {};
  DAYS.forEach(d => {
    const assigned = [];
    Object.entries(S.assign).forEach(([sid, did]) => { if (did === d.id) assigned.push(parseInt(sid)); });
    const ro = S.routeOrder[d.id] || [];
    dayStopOrder[d.id] = [...new Set([...ro.filter(id => assigned.includes(id)), ...assigned])];
  });

  STOPS.forEach(stop => {
    const geo = S.geo[stop.id];
    if (!geo || !geo.lat || !geo.lng) return;

    const dayId = S.assign[stop.id];
    const dayObj = dayId ? getDayObj(dayId) : null;

    // Apply filter
    if (S.mapFilter === 'A' && (!dayId || !dayId.startsWith('wA'))) return;
    if (S.mapFilter === 'B' && (!dayId || !dayId.startsWith('wB'))) return;
    if (S.mapFilter === 'none' && dayId) return;

    const color = dayObj ? dayObj.color : '#999';

    // Get route order number
    const dayOrder = dayId ? (dayStopOrder[dayId] || []) : [];
    const orderIdx = dayOrder.indexOf(stop.id);
    const orderNum = orderIdx >= 0 ? orderIdx + 1 : '';

    const icon = L.divIcon({
      className: '',
      html: `<div style="width:24px;height:24px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff">${orderNum}</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    const dayLabel = dayObj ? `Week ${dayObj.week} - ${dayObj.label}` : 'Unassigned';
    const popupHtml = `<div style="min-width:160px">
      <b>${orderNum ? orderNum + '. ' : ''}${escHtml(stop.n)}</b><br>
      ${stop.a ? `<span style="font-size:12px;color:#666">${escHtml(stop.a)}</span><br>` : ''}
      <span style="font-size:12px;color:#666">${escHtml(stop.c)} &middot; ${escHtml(stop.p)}</span><br>
      <span style="font-size:12px;color:${color}">${dayLabel}</span><br>
      <button onclick="showMapAssignModal(${stop.id})" style="margin-top:6px;padding:4px 10px;font-size:12px;background:${color};color:#fff;border:none;border-radius:6px;cursor:pointer">Assign Day</button>
      <button onclick="showProfile(${stop.id})" style="margin-top:6px;padding:4px 10px;font-size:12px;background:#eee;color:#333;border:none;border-radius:6px;cursor:pointer;margin-left:4px">Profile</button>
    </div>`;

    const marker = L.marker([geo.lat, geo.lng], { icon }).bindPopup(popupHtml).addTo(leafletMap);
    marker.bindTooltip(stop.n, {
      permanent: false, direction: 'bottom', offset: [0, 10],
      className: 'map-label'
    });
    mapMarkers.push(marker);
  });

  // Draw route lines per day
  DAYS.forEach(d => {
    // Check filter
    if (S.mapFilter === 'A' && !d.id.startsWith('wA')) return;
    if (S.mapFilter === 'B' && !d.id.startsWith('wB')) return;
    if (S.mapFilter === 'none') return;

    const order = dayStopOrder[d.id] || [];
    const points = order
      .map(sid => S.geo[sid])
      .filter(g => g && g.lat && g.lng)
      .map(g => [g.lat, g.lng]);
    if (points.length >= 2) {
      const line = L.polyline(points, { color: d.color, weight: 2.5, opacity: 0.5, dashArray: '6,6' }).addTo(leafletMap);
      mapRouteLines.push(line);
    }
  });

  if (mapMarkers.length > 0) {
    const group = L.featureGroup(mapMarkers);
    leafletMap.fitBounds(group.getBounds().pad(0.1));
  }
  updateTooltipVisibility();
}

function updateTooltipVisibility() {
  if (!leafletMap) return;
  const zoom = leafletMap.getZoom();
  mapMarkers.forEach(m => {
    if (zoom >= 12) {
      if (m.getTooltip() && !m.isTooltipOpen()) m.openTooltip();
    } else {
      if (m.getTooltip() && m.isTooltipOpen()) m.closeTooltip();
    }
  });
}

function showMapAssignModal(stopId) {
  mapAssignStopId = stopId;
  const stop = getStop(stopId);
  if (!stop) return;
  const currentDay = S.assign[stop.id];

  let html = `<div class="modal-handle"></div>
    <div class="modal-title">Assign - ${escHtml(stop.n)}</div>`;

  ['A', 'B'].forEach(week => {
    html += `<div style="font-size:13px;font-weight:600;color:var(--text-sec);margin:12px 0 6px">Week ${week}</div>`;
    DAYS.filter(d => d.week === week).forEach(d => {
      const isActive = currentDay === d.id;
      html += `<button class="btn ${isActive ? 'btn-primary' : 'btn-outline'} btn-block mb-1"
        style="${!isActive ? 'border-color:'+d.color+'40;color:'+d.color : 'background:'+d.color}"
        onclick="mapAssignDay('${d.id}')">
        ${d.label}
      </button>`;
    });
  });

  if (currentDay) {
    html += `<button class="btn btn-danger btn-block mt-2" onclick="mapUnassignDay()">Remove from Route</button>`;
  }
  openModal(html);
}

function mapAssignDay(dayId) {
  S.assign[mapAssignStopId] = dayId;
  save.assign();
  closeModal();
  refreshMapMarkers();
}

function mapUnassignDay() {
  delete S.assign[mapAssignStopId];
  save.assign();
  closeModal();
  refreshMapMarkers();
}

// ══════════════════════════════════════════════════════════════
// IMPORT / EXPORT
// ══════════════════════════════════════════════════════════════
function showImportModal() {
  openModal(`<div class="modal-handle"></div>
    <div class="modal-title">Import from Excel</div>
    <p class="text-muted mb-2" style="font-size:13px">
      Upload an Excel file (.xlsx) with columns:<br>
      <b>Name, Address, City, Postcode</b>
    </p>
    <div class="form-group">
      <input type="file" accept=".xlsx,.xls" class="input" onchange="importExcel(this.files[0])" id="import-file">
    </div>
    <button class="btn btn-outline btn-block" onclick="closeModal()">Cancel</button>
  `);
}

function importExcel(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const wb = XLSX.read(e.target.result, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

      let added = 0;
      let maxId = STOPS.reduce((m, s) => Math.max(m, s.id), 0);
      const startRow = (data[0] && typeof data[0][0] === 'string' && data[0][0].toLowerCase().includes('name')) ? 1 : 0;

      for (let i = startRow; i < data.length; i++) {
        const row = data[i];
        if (!row || !row[0]) continue;
        const name = String(row[0]).trim().toUpperCase();
        if (STOPS.some(s => s.n === name)) continue;
        maxId++;
        STOPS.push({
          id: maxId,
          n: name,
          a: String(row[1] || '').trim(),
          c: String(row[2] || '').trim(),
          p: String(row[3] || '').trim().toUpperCase()
        });
        added++;
      }

      save.stops();
      closeModal();
      appAlert(`Import complete: ${added} new customers added.`);
      if (curPage === 'customers') renderCustomers();
      else if (curPage === 'settings') renderSettings();
    } catch (err) {
      appAlert('Import failed: ' + err.message);
    }
  };
  reader.readAsArrayBuffer(file);
}

function exportExcel() {
  const wb = XLSX.utils.book_new();

  // Customers sheet
  const custData = [['Name', 'Address', 'City', 'Postcode', 'Assigned Day', 'Debt']];
  STOPS.forEach(s => {
    const dayId = S.assign[s.id];
    const dayObj = dayId ? getDayObj(dayId) : null;
    const dayLabel = dayObj ? `Week ${dayObj.week} - ${dayObj.label}` : '';
    custData.push([s.n, s.a, s.c, s.p, dayLabel, S.debts[s.id] || 0]);
  });
  const ws1 = XLSX.utils.aoa_to_sheet(custData);
  XLSX.utils.book_append_sheet(wb, ws1, 'Customers');

  // Orders sheet
  const ordData = [['Order ID', 'Customer', 'Items', 'Total', 'Status', 'Payment', 'Created', 'Delivered']];
  Object.values(S.orders).forEach(o => {
    const s = getStop(o.customerId);
    ordData.push([
      o.id,
      s ? s.n : 'Unknown',
      o.items.map(i => `${i.qty}x ${i.name}`).join(', '),
      calcOrderTotal(o),
      o.status,
      o.payMethod || '',
      o.createdAt || '',
      o.deliveredAt || ''
    ]);
  });
  const ws2 = XLSX.utils.aoa_to_sheet(ordData);
  XLSX.utils.book_append_sheet(wb, ws2, 'Orders');

  XLSX.writeFile(wb, 'costadoro_export_' + todayStr() + '.xlsx');
}

function shareRouteSummary() {
  const week = S.routeWeek;
  const dayIdx = S.routeDay;
  const days = DAYS.filter(d => d.week === week);
  const dayObj = days[dayIdx];
  if (!dayObj) return;
  const dayId = dayObj.id;
  const assigned = [];
  Object.entries(S.assign).forEach(([sid, did]) => {
    if (did === dayId) assigned.push(parseInt(sid));
  });
  const ro = S.routeOrder[dayId] || [];
  const sorted = [...new Set([...ro.filter(id => assigned.includes(id)), ...assigned])];
  const dateStr = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  let text = `📋 Costadoro Route\n${dateStr} (Week ${week})\n\n`;
  let totalRev = 0;
  sorted.forEach((stopId, idx) => {
    const stop = getStop(stopId);
    if (!stop) return;
    const pending = getStopOrders(stopId, 'pending');
    const delivered = getStopOrders(stopId, 'delivered').filter(o => {
      const d = o.deliveredAt ? new Date(o.deliveredAt).toDateString() : '';
      return d === new Date().toDateString();
    });
    const isDelivered = delivered.length > 0;
    const debt = S.debts[stopId] || 0;
    const todayRev = delivered.reduce((s, o) => s + calcOrderTotal(o), 0);
    totalRev += todayRev;
    const status = isDelivered ? '✅' : (pending.length > 0 ? '📦' : '⬜');
    text += `${idx + 1}. ${status} ${stop.n} — ${stop.c}, ${stop.p}`;
    if (pending.length > 0 && !isDelivered) text += ` (${pending.length} sipariş)`;
    if (todayRev > 0) text += ` — ${formatCurrency(todayRev)}`;
    if (debt > 0) text += ` [Borç: ${formatCurrency(debt)}]`;
    text += '\n';
  });
  text += `\n📊 ${sorted.filter(id => getStopOrders(id, 'delivered').some(o => o.deliveredAt && new Date(o.deliveredAt).toDateString() === new Date().toDateString())).length}/${sorted.length} teslimat | Toplam: ${formatCurrency(totalRev)}`;

  if (navigator.share) {
    navigator.share({ title: 'Route Summary', text });
  } else {
    navigator.clipboard.writeText(text).then(() => appAlert('Rota özeti panoya kopyalandı.'));
  }
}

function exportRouteExcel() {
  const wb = XLSX.utils.book_new();

  ['A', 'B'].forEach(week => {
    const days = DAYS.filter(d => d.week === week);
    const data = [['#', 'Customer', 'City', 'Postcode', 'Day', 'Debt']];

    days.forEach(day => {
      const assigned = [];
      Object.entries(S.assign).forEach(([sid, did]) => {
        if (did === day.id) assigned.push(parseInt(sid));
      });
      const ro = S.routeOrder[day.id] || [];
      const sorted = [...new Set([...ro.filter(id => assigned.includes(id)), ...assigned])];

      sorted.forEach((stopId, idx) => {
        const stop = getStop(stopId);
        if (!stop) return;
        data.push([idx + 1, stop.n, stop.c, stop.p, day.label, S.debts[stopId] || 0]);
      });

      if (sorted.length > 0) data.push([]); // empty row between days
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 4 }, { wch: 30 }, { wch: 15 }, { wch: 10 }, { wch: 12 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Week ' + week);
  });

  XLSX.writeFile(wb, 'route_export_' + todayStr() + '.xlsx');
}

// ══════════════════════════════════════════════════════════════
