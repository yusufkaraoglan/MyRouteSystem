'use strict';
// SETTINGS PAGE
// ══════════════════════════════════════════════════════════════
function renderSettings() {
  let html = `
    <header class="topbar">
      <h1>Ayarlar</h1>
    </header>
    <div class="page-body">

      <!-- Catalog Section -->
      <div class="settings-section">
        <div class="settings-title">Ürün Kataloğu</div>
        <div class="settings-card">
          <div class="settings-item" onclick="showPage('catalog')" style="cursor:pointer">
            <div>
              <div class="settings-item-label">Kataloğu Yönet</div>
              <div class="settings-item-desc">${S.catalog.length} ürün</div>
            </div>
            <span style="color:var(--text-muted)">&rarr;</span>
          </div>
        </div>
      </div>

      <!-- Map Section -->
      <div class="settings-section">
        <div class="settings-title">Harita</div>
        <div class="settings-card">
          <div class="settings-item" onclick="showMapModal()" style="cursor:pointer">
            <div>
              <div class="settings-item-label">Haritayı Görüntüle</div>
              <div class="settings-item-desc">Tüm müşterileri haritada gör</div>
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
        <div class="settings-title">Veri</div>
        <div class="settings-card">
          <div class="settings-item" style="cursor:pointer" onclick="showImportModal()">
            <div>
              <div class="settings-item-label">Excel'den İçe Aktar</div>
              <div class="settings-item-desc">Müşteri listesi yükle (.xlsx)</div>
            </div>
            <span style="color:var(--text-muted)">&rarr;</span>
          </div>
          <div class="settings-item" style="cursor:pointer" onclick="exportExcel()">
            <div>
              <div class="settings-item-label">Excel'e Dışa Aktar</div>
              <div class="settings-item-desc">Tüm verileri indir</div>
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
        <div class="settings-title" style="color:var(--danger)">Tehlikeli Bölge</div>
        <div class="settings-card">
          <div class="settings-item">
            <div>
              <div class="settings-item-label">Tüm Verileri Sıfırla</div>
              <div class="settings-item-desc">Tüm yerel verileri sil ve sıfırdan başla</div>
            </div>
            <button class="btn btn-danger btn-sm" onclick="resetAllData()">Sıfırla</button>
          </div>
        </div>
      </div>

      <!-- App Info -->
      <div class="text-center text-muted" style="padding:20px;font-size:12px">
        Costadoro Delivery v2.0<br>
        ${STOPS.length} müşteri &middot; ${Object.keys(S.orders).length} sipariş
      </div>
    </div>`;

  document.getElementById('page-settings').innerHTML = html;
}

let editingCatalogIdx = -1;

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
