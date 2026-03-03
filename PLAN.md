# Uygulama Geliştirme Planı v2

## Genel Özet

4 ana iş kalemi:

| # | İş | Kısa Açıklama |
|---|-----|---------------|
| 1 | Plan + Rota birleştir | Plan sayfasını kaldır, tüm özelliklerini Rota'ya taşı |
| 2 | Sipariş sayfası | Yeni `page-orders` — müşteri seç, katalogdan ürün ekle, fatura benzeri |
| 3 | Müşteriye özel fiyat | Sipariş sayfası ve Rota'da özel fiyat entegrasyonu |
| 4 | Raporlama sistemi | Günlük/aylık/custom tarih ile teslimat raporu |

Uygulama sırası: **1 → 2 → 3 → 4**

---

## AŞAMA 1: Plan + Rota Birleştirme

### Neden?
Rota ve Plan neredeyse aynı veriyi farklı şekilde gösteriyor. Kullanıcı iki sayfa arasında geçiş yapmak zorunda. Tek "Rota" sayfası altında birleştirilecek.

### Mevcut Farklılıklar

| Özellik | Rota (var) | Plan (var) | Birleşik Rota |
|---------|:---:|:---:|:---:|
| Hafta A/B toggle | ✓ | ✓ | ✓ |
| Gün sekmeleri (tabs) | ✓ | ✓ | ✓ |
| İlerleme çubuğu | ✓ | ✓ | ✓ |
| Arama | ✓ | ✗ | ✓ |
| Ziyaret tik (✓/○) | ✓ | ✓ | ✓ |
| Gün atama (↗) | ✓ (assign) | ✓ (move) | ✓ (move) |
| Düzenleme (✏️) | ✓ | ✗ | ✓ |
| Haritada zoom | ✓ | ✗ | ✓ |
| Sipariş/ödeme badge | ✗ | ✓ | ✓ |
| Karta tıkla → sipariş | ✗ | ✓ | ✓ |
| Borç uyarısı (sarı border) | ✗ | ✓ | ✓ |
| Müşteri notu badge | ✗ | ✓ | ✓ |
| Gün özeti (cash/bank/unpaid) | ✗ | ✓ | ✓ |
| Sürükle-bırak sıralama | ✗ | ✓ | ✓ |
| Import | ✗ | ✓ | ✓ |
| Excel export | ✓ | ✗ | ✓ |
| Alt bar (ziyaret/toplam/kalan) | ✓ | ✗ | ✓ |
| Sıfırla butonu | ✓ | ✗ | ✓ |
| Atanmamış/Plansız tab | ✓ | ✓ | ✓ |

### 1.1 — HTML Değişiklikleri

**Silinecek:**
- `page-plan` bloğu (satır 416–429)
- `nav-plan` butonu (satır 640–643)

**`page-rota` topbar'a eklenecek:**
- Import butonu: `<button onclick="openPlanImport()">📂 Import</button>` (Excel butonunun soluna)

### 1.2 — JavaScript: `renderRotaBody()` Yeniden Yazımı

Mevcut `renderRotaBody()` (satır 1548–1598) yerine, Plan'ın kart yapısını ve Rota'nın özelliklerini birleştiren yeni versiyon:

```
Her stop kartı:
┌──────────────────────────────────────────────────────┐
│ [1]  ABBEY CAFE                         [✓] [↗] [≡] │
│      183 Abbey Wood Road, Abbey Wood          [✏️]   │
│      SE2 9DZ                                         │
│      ┌──────────────────────────────────────────┐    │
│      │ Cash £45.00 │ 2 kalem · £45.00          │    │
│      │ ⚠ Borç £12.50 │ 📌 Nakit ister         │    │
│      └──────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────┘
```

Kart tıklanınca → `openOrd(stopId, dayId)` (sipariş modalı)
- `sc-body` `onclick` → `openOrd()` (Plan'daki gibi)
- `zoomTo()` → sc-body'den kaldır (artık sipariş modalı açılacak)
- Haritada zoom → ayrı küçük buton olarak eklenebilir (opsiyonel)

**Kart HTML yapısı:**
```js
stops.forEach((s, i) => {
  const isV = !!S.vis[dayId + '_' + s.id];
  const hasDebt = (S.debts[s.id] || 0) > 0;
  h += `<div class="sc${isV ? ' done' : ''}"
         data-did="${dayId}" data-sid="${s.id}" data-idx="${i}"
         style="${hasDebt ? 'border-color:#FEC84B' : ''};cursor:pointer"
         onclick="openOrd(${s.id},'${dayId}')">
    <div class="sc-num" style="...">${isV ? '✓' : (i+1)}</div>
    <div class="sc-body">
      <div class="sname">${s.n}</div>
      <div class="saddr">${s.a}, ${s.c}</div>
      <span class="spc ${pcClass(s.p)}">${s.p}</span>
      ${payBadgeHtml(s.id)}
    </div>
    <div class="sc-right" onclick="event.stopPropagation()">
      <button class="chk rchk" ...>${isV ? '✓' : '○'}</button>
      <button class="asgn-btn" onclick="openMove('${dayId}',${s.id})">↗</button>
      <button class="asgn-btn" onclick="openEdit(${s.id})">✏️</button>
      <div class="grip" data-grip="1">≡</div>
    </div>
  </div>`;
});
```

### 1.3 — Gün Özeti (renderDaySummary)

`renderRotaBody()` içinde, progress bar'ın üstüne gün özetini ekle:
```js
h = renderDaySummary(S.rotaDay) + h;
```
Bu zaten mevcut fonksiyon — Cash / Banka / Ödenmedi / Borç Ödendi toplamlarını gösterir.

### 1.4 — Sürükle-Bırak + Event Binding

`renderRotaBody()` sonuna ekle:
```js
// Check butonları
el.querySelectorAll('.rchk').forEach(btn => {
  btn.addEventListener('click', e => {
    e.stopPropagation();
    const key = btn.dataset.did + '_' + btn.dataset.sid;
    S.vis[key] = !S.vis[key]; save.vis();
    renderRota();
  });
});
// Sürükle-bırak
initDrag();
```

### 1.5 — Silinecek/Güncellenecek Fonksiyonlar

**Silinecek fonksiyonlar:**
- `setPlanWeek()`, `setPlanDay()`
- `renderPlan()`, `renderPlanTabs()`, `renderPlanBody()`, `renderPlanUnsched()`
- `bindPlanEvents()`

**Güncellenecek fonksiyonlar:**
- `execMove()` → `S.planWeek/Day` referanslarını `S.rotaWeek/Day`'e çevir
- `saveStopCat()` → `renderPlan()` çağrısını `renderRota()` yap
- `saveCnote()` → `renderPlan()` çağrısını `renderRota()` yap
- `saveOrder()` → `renderPlan()` çağrısını `renderRota()` yap
- `reorder()` → `renderPlan()` çağrısını `renderRota()` yap
- `showPage()` → `if(name==='plan')` kaldır

**Silinecek state:**
- `S.planWeek`, `S.planDay`
- `lsSave('pWeek')`, `lsSave('pDay')`

### 1.6 — Alt Bar Güncelleme

Mevcut alt bar'a günün toplam cirosunu ekle:
```
Ziyaret: 5 | Toplam: 12 | Kalan: 7 | Ciro: £234.50 | [↺ Sıfırla]
```

### 1.7 — Arama + Sürükle-Bırak Uyumu

Arama aktifken kartlar filtreleniyor → sürükle-bırak ile sıralama tutarsız olabilir.
**Çözüm:** Arama aktifken grip ikonunu gizle ve `data-idx`'i filtrelenmiş listeden al.

---

## AŞAMA 2: Sipariş Sayfası (`page-orders`)

### Konsept
Rota'dan bağımsız, herhangi bir müşteriye sipariş oluşturma sayfası.
- Mevcut sipariş modalını (`ordOv`) yeniden kullanır
- Müşteri seç → sipariş modalını aç

### 2.1 — HTML: Yeni Sayfa

```html
<div class="page" id="page-orders">
  <div class="topbar">
    <div style="flex:1">
      <div class="tb-title">Siparişler</div>
      <div class="tb-sub" id="ordPageSub"></div>
    </div>
  </div>
  <!-- Arama -->
  <div class="sbar">
    <div class="sbar-inner">
      <svg>...</svg>
      <input type="search" id="ordPageSearch" placeholder="Müşteri ara..."
             oninput="onOrdPageSearch(this.value)">
      <button class="sbar-clear" id="ordPageClear"
              onclick="clearOrdPageSearch()">✕</button>
    </div>
  </div>
  <div class="body" id="ordPageBody"></div>
</div>
```

### 2.2 — Nav Bar

Plan butonunun yerine Sipariş butonu:
```html
<button class="ni" id="nav-orders" onclick="showPage('orders')">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
  Sipariş
</button>
```

Nav sırası: **Harita → Rota → Sipariş → Özet → Katalog → Diğer**

### 2.3 — Sayfa Akışı

Sayfa açıldığında müşteri listesi gösterilir. Müşteri aranır/seçilir → `openOrd(stopId, null)` çağrılır.

```js
let ordPageSearch = '';

function renderOrders() {
  const el = document.getElementById('ordPageBody');
  let stops = [...STOPS];

  // Arama filtresi
  if (ordPageSearch) {
    stops = stops.filter(s =>
      (s.n + s.a + s.c + s.p).toLowerCase().includes(ordPageSearch)
    );
  }

  // Bugün siparişi olan müşteriler üstte
  const withOrder = stops.filter(s => getOrd(s.id));
  const without = stops.filter(s => !getOrd(s.id));

  let h = '';

  // Bugünün sipariş özeti
  const todayOrders = Object.keys(S.orders)
    .filter(k => k.startsWith(todayKey()))
    .map(k => S.orders[k]);
  const todayTotal = todayOrders.reduce((s, o) => s + ordTotal(o), 0);
  const todayCount = todayOrders.length;

  h += `<div style="padding:10px 12px;background:var(--card);border-bottom:1px solid var(--border)">
    <div style="font-size:11px;color:var(--muted)">Bugün</div>
    <div style="font-size:16px;font-weight:800">${todayCount} sipariş · ${fmt(todayTotal)}</div>
  </div>`;

  // Siparişi olanlar
  if (withOrder.length) {
    h += '<div style="padding:6px 12px;font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase">Bugün Sipariş Var</div>';
    withOrder.forEach(s => {
      const ord = getOrd(s.id);
      h += renderOrderStopCard(s, ord);
    });
  }

  // Siparişi olmayanlar
  h += '<div style="padding:6px 12px;font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase">Tüm Müşteriler</div>';
  without.forEach(s => {
    h += renderOrderStopCard(s, null);
  });

  el.innerHTML = h;
}

function renderOrderStopCard(s, ord) {
  const dayId = S.assign[s.id];
  const day = dayId ? getDay(dayId) : null;
  const hasDebt = (S.debts[s.id] || 0) > 0;

  return `<div class="sc" style="margin:0 12px 6px;cursor:pointer;${hasDebt?'border-color:#FEC84B':''}"
               onclick="openOrd(${s.id}, '${dayId || ''}')">
    <div class="sc-body">
      <div class="sname">${s.n}</div>
      <div class="saddr">${s.a}, ${s.p}${day ? ' · ' + day.label + ' H' + day.week : ''}</div>
      ${ord ? payBadgeHtml(s.id) : ''}
    </div>
    ${ord ? '<div style="color:#027A48;font-weight:700;font-size:12px">✓</div>' : ''}
  </div>`;
}
```

### 2.4 — `openOrd()` Güncelleme

`openOrd(stopId, dayId)` zaten modal açıyor. `dayId` `null` veya boş olabilir — bu durumda:
- Modal başlığında gün bilgisi gösterilmez
- `saveOrder()` içinde `S.vis` güncellenmez (çünkü gün atanmamış olabilir)
- Sipariş key'i yine `todayKey() + '_' + stopId` olarak kalır

### 2.5 — showPage() Güncelleme

```js
if (name === 'orders') renderOrders();
```

---

## AŞAMA 3: Müşteriye Özel Fiyat Entegrasyonu

### Mevcut Durum
`S.stopCatalog` ve `stopCatOv` modalı zaten çalışıyor. Aşağıdaki iyileştirmeler yapılacak:

### 3.1 — Sipariş Modalında Otomatik Özel Fiyat

`openOrd()` açıldığında, eğer müşterinin `stopCatalog` override'ı varsa:
- Katalog chip'leri otomatik açılsın (`catPickArea.style.display = 'block'`)
- Bilgi banner'ı göster:
  ```
  ℹ️ Bu müşteri için X ürüne özel fiyat tanımlı
  ```

### 3.2 — Sipariş Sayfasında Özel Fiyat Göstergesi

`renderOrderStopCard()` içinde, eğer müşterinin özel fiyatı varsa:
```html
<span style="font-size:9px;color:#53178F;background:#FDF4FF;...">📋 Özel fiyat</span>
```

### 3.3 — Özel Fiyat Erişim Kolaylığı

Birleştirilmiş Rota kartlarında da "📋 Fiyat" butonu ekle (profil sayfasındaki gibi).
Veya kart sağ tarafına küçük bir "📋" ikonu → `openStopCat(stopId)` açar.

---

## AŞAMA 4: Raporlama Sistemi

### 4.1 — Dashboard'a Custom Tarih Filtresi

**Mevcut toggle:** `Bugün | Ay`
**Yeni toggle:** `Bugün | Ay | Özel`

HTML değişikliği — `page-dash` topbar'a:
```html
<button class="pt-btn" id="dp-custom" onclick="setDashPeriod('custom')">Özel</button>
```

Custom seçildiğinde, topbar altında tarih aralığı göster:
```html
<div id="dashCustomRange" style="display:none;padding:8px 12px;...">
  <input type="date" id="dashStart">
  <span>—</span>
  <input type="date" id="dashEnd">
  <button onclick="applyCustomRange()">Uygula</button>
</div>
```

### 4.2 — `getAllOrdersForPeriod()` Güncelleme

```js
function getAllOrdersForPeriod(period) {
  const today = todayKey();
  const monthPrefix = today.slice(0, 7);
  const all = [];
  Object.keys(S.orders).forEach(key => {
    const dateStr = key.split('_')[0];
    if (period === 'day' && dateStr !== today) return;
    if (period === 'month' && !dateStr.startsWith(monthPrefix)) return;
    if (period === 'custom') {
      if (dateStr < S.dashStart || dateStr > S.dashEnd) return;
    }
    const stopId = parseInt(key.split('_')[1]);
    all.push({ key, stopId, date: dateStr, ord: S.orders[key] });
  });
  return all;
}
```

### 4.3 — Teslimat Raporu: Müşteri Ödemeleri

Dashboard'a yeni bölüm — seçilen periyottaki her müşterinin ödeme detayı:

```
💰 Müşteri Ödemeleri
┌─────────────────────────────────────────────┐
│ ABBEY CAFE       │ Cash    │ 2 kalem │ £45  │
│ BEAN COUNTER     │ Banka   │ 3 kalem │ £32  │
│ COSTA PLUS       │ Ödenmedi│ 1 kalem │ £28  │
├─────────────────────────────────────────────┤
│ Toplam: 3 müşteri · 6 kalem · £105         │
└─────────────────────────────────────────────┘
```

```js
function renderCustomerPayments(orderList) {
  // orderList: getAllOrdersForPeriod() sonucu
  // Her stopId için ödeme yöntemi ve toplam göster
  const byStop = {};
  orderList.forEach(({ stopId, ord }) => {
    if (!byStop[stopId]) byStop[stopId] = { cash: 0, bank: 0, unpaid: 0, items: 0 };
    const tot = ordTotal(ord);
    byStop[stopId][ord.payMethod] += tot;
    byStop[stopId].items += (ord.items || []).reduce((s, i) => s + i.qty, 0);
  });
  // HTML render...
}
```

### 4.4 — Teslimat Raporu: Ürün Bazlı Satış

Mevcut `buildProductStats()` zaten bunu yapıyor. Genişletilecek:

```
📦 Ürün Bazlı Satış
┌──────────────────────────────────────────────┐
│ #1  Costadoro Espresso 1kg │ 8 adet │ £120  │
│     ████████████████████░░░  %54              │
│ #2  Costadoro Filtre 250g  │ 5 adet │ £42   │
│     ██████████░░░░░░░░░░░░  %19              │
│ #3  Paper Cups (100lü)     │ 3 adet │ £15   │
│     ████░░░░░░░░░░░░░░░░░░  %7               │
├──────────────────────────────────────────────┤
│ Toplam: 16 adet · £177.50                    │
└──────────────────────────────────────────────┘
```

Bu zaten `renderDash()` içinde var (`prodStats` bölümü). Custom tarih filtresi çalışınca otomatik güncellenecek.

### 4.5 — State Değişiklikleri

```js
// S objesine ekle:
S.dashStart = lsGet('dStart', todayKey()),
S.dashEnd = lsGet('dEnd', todayKey()),

// save objesine ekle: (gerek yok, lsSave ile direkt kaydedilecek)
```

### 4.6 — Rota Alt Bar Ciro Bilgisi

Rota alt bar'ında seçili günün ciro bilgisi:
```js
function updateRotaBar() {
  // ... mevcut ziyaret/toplam/kalan hesabı ...
  // Ek: Günün cirosu
  const stops = stopsForDay(S.rotaDay);
  let dayCiro = 0;
  stops.forEach(s => {
    const ord = getOrd(s.id);
    if (ord) dayCiro += ordTotal(ord);
  });
  document.getElementById('rc').textContent = fmt(dayCiro); // yeni element
}
```

Alt bar HTML'e yeni hücre:
```html
<div class="bs"><div class="bv" id="rc">£0</div><div class="bl">Ciro</div></div>
```

---

## UYGULAMA SIRASI (Detaylı)

### Adım 1: Plan + Rota Birleştirme
1. `page-plan` HTML bloğunu sil
2. `nav-plan` butonunu sil
3. `page-rota` topbar'a Import butonu ekle
4. `renderRotaBody()` yeniden yaz (Plan kart yapısı + Rota özellikleri)
5. `renderRotaTabs()` → gün özetini ekle
6. Alt bar'a ciro hücresi ekle + `updateRotaBar()` güncelle
7. Plan fonksiyonlarını sil, referansları güncelle
8. `showPage()`, `execMove()`, `saveOrder()`, `saveCnote()`, `saveStopCat()`, `reorder()` güncelle
9. State temizliği (`S.planWeek/Day` kaldır)
10. Brace dengesi kontrolü

### Adım 2: Sipariş Sayfası
1. `page-orders` HTML bloğu ekle
2. `nav-orders` butonu ekle (Plan'ın yerine)
3. `renderOrders()`, `renderOrderStopCard()` fonksiyonları yaz
4. `showPage()` → `orders` case ekle
5. `openOrd()` → `dayId` null/boş kontrolü ekle
6. `saveOrder()` → `dayId` yoksa `S.vis` güncelleme
7. Brace dengesi kontrolü

### Adım 3: Özel Fiyat Entegrasyonu
1. `openOrd()` → stopCatalog varsa chip'leri otomatik aç + banner göster
2. `renderOrderStopCard()` → özel fiyat badge ekle
3. Brace dengesi kontrolü

### Adım 4: Raporlama
1. Dashboard topbar → "Özel" toggle butonu ekle
2. Custom tarih aralığı HTML ekle
3. `getAllOrdersForPeriod()` → `custom` case ekle
4. `renderCustomerPayments()` fonksiyonu yaz
5. `renderDash()` → müşteri ödemeleri bölümü ekle
6. `setDashPeriod()` → `custom` case + tarih inputları göster/gizle
7. State: `S.dashStart`, `S.dashEnd`
8. Brace dengesi kontrolü

---

## RİSKLER

| Risk | Etki | Önlem |
|------|------|-------|
| Brace dengesi bozulması | Uygulama çöker | Her adım sonunda kontrol |
| Plan→Rota referans kırılması | Fonksiyonlar hata verir | Tüm `renderPlan()` çağrılarını grep ile bul |
| Arama + sürükle-bırak çakışması | Yanlış sıralama | Arama aktifken grip gizle |
| openOrd() dayId null | Vis güncelleme hatası | null check ekle |
| Eski localStorage state | S.planWeek/Day çöp veri | İlk yüklemede temizle |
