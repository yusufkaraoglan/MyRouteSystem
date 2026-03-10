'use strict';
// CUSTOMERS PAGE
// ══════════════════════════════════════════════════════════════
function renderCustomers(fullRender) {
  const isSearchUpdate = !fullRender && document.getElementById('customers-results');

  if (!isSearchUpdate) {
    let html = `
      <header class="topbar">
        <h1>Müşteriler</h1>
        <div class="topbar-actions">
          <span class="badge badge-outline">${STOPS.length}</span>
          <button class="btn btn-primary btn-sm" onclick="showAddCustomerModal()">+ Ekle</button>
        </div>
      </header>
      <div class="page-body">
        <div class="search-bar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Müşteri ara..." value="${escHtml(S.customersSearch)}" oninput="S.customersSearch=this.value;renderCustomerResults()">
        </div>
        <div class="chip-group">
          <button class="chip ${S.customersFilter==='all'?'active':''}" onclick="S.customersFilter='all';renderCustomers(true)">Tümü</button>
          <button class="chip ${S.customersFilter==='A'?'active':''}" onclick="S.customersFilter='A';renderCustomers(true)">Hafta A</button>
          <button class="chip ${S.customersFilter==='B'?'active':''}" onclick="S.customersFilter='B';renderCustomers(true)">Hafta B</button>
          <button class="chip ${S.customersFilter==='none'?'active':''}" onclick="S.customersFilter='none';renderCustomers(true)">Atanmamış</button>
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
    html = `<div class="empty-state"><p><b>Müşteri bulunamadı</b></p></div>`;
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
            ${dayObj ? `<span class="badge" style="background:${dayObj.color}20;color:${dayObj.color};font-size:10px">${dayObj.week}/${dayObj.label.slice(0,3)}</span>` : '<span class="badge badge-outline" style="font-size:10px">Yok</span>'}
            ${pending > 0 ? `<span class="badge badge-warning" style="font-size:10px">${pending} bekleyen</span>` : ''}
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
    <div class="modal-title">Müşteri Ekle</div>
    <div class="form-group">
      <label class="form-label">İsim</label>
      <input class="input" id="add-cust-name" placeholder="Müşteri adı">
    </div>
    <div class="form-group">
      <label class="form-label">Adres</label>
      <input class="input" id="add-cust-addr" placeholder="Sokak adresi">
    </div>
    <div class="form-group">
      <label class="form-label">Şehir / Bölge</label>
      <input class="input" id="add-cust-city" placeholder="Şehir veya bölge">
    </div>
    <div class="form-group">
      <label class="form-label">Posta Kodu</label>
      <input class="input" id="add-cust-post" placeholder="Posta kodu">
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
    <button class="btn btn-primary btn-block" onclick="saveNewCustomer()">Müşteriyi Kaydet</button>
  `);
}

async function saveNewCustomer() {
  const name = document.getElementById('add-cust-name').value.trim();
  if (!name) { appAlert('İsim gerekli.'); return; }
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
