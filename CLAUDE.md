# CLAUDE.md — Costadoro Route CRM

> Bu dosya Claude Code için hazırlanmıştır. Projeye devam etmeden önce bu dosyayı ve referans verilen diğer MD dosyalarını oku.

---

## Projeye Genel Bakış

**Costadoro Routes** — Costadoro Coffee markalı kahve dağıtımı için geliştirilmiş, mobil öncelikli rota yönetim uygulaması.

- **Sahip:** Yusuf (işletme sahibı, geliştirici değil — "vibe coding" yaklaşımı)
- **Kullanım:** Saha'da telefon + ofiste bilgisayar
- **Dil:** Türkçe UI, İngilizce kod
- **Teknoloji:** Vanilla HTML/CSS/JS + Leaflet.js + Supabase

**Modüler dosya mimarisi** (v2, Mart 2026'da tek dosyadan ayrıldı):

---

## Dosya Yapısı

```
index.html              ← HTML kabuk (sayfa div'leri + nav + script yüklemeleri)
index_old.html          ← Eski tek dosya yedek (4700+ satır)
css/
  app.css               ← Tüm CSS stilleri (~400 satır)
js/
  db.js                 ← Supabase REST + localStorage cache + offline queue
  utils.js              ← Yardımcı fonksiyonlar (format, geocode, hesaplama)
  app.js                ← State, navigation, modal, init, service worker
  migrate.js            ← Eski cr4_store → yeni tablolara veri göçü
  pages.js              ← Tüm sayfa render fonksiyonları (~3460 satır)
migration/
  001_create_tables.sql ← Supabase'de yeni tabloları oluşturan SQL
CLAUDE.md               ← Bu dosya
PROJECT.md              ← Proje detayları, mimari, veri yapıları
FEATURES.md             ← Tüm özellikler ve fonksiyon referansı
ROADMAP.md              ← Yapılacaklar ve geliştirme fikirleri
README.md               ← Kısa proje açıklaması
```

---

## Kritik Geliştirme Kuralları

### 1. Dosya Organizasyonu
- **CSS:** `css/app.css` — tüm stiller burada
- **JS:** `js/` klasörü — her modülün ayrı dosyası
- **HTML:** `index.html` — sadece sayfa div'leri ve script yüklemeleri
- Script yükleme sırası: `db.js → utils.js → app.js → migrate.js → pages.js`

### 2. Brace Dengesi Kontrolü
Her değişiklikten sonra JS'in brace/parantez dengesini kontrol et:
```bash
# Tüm dosyaları kontrol et:
for f in js/*.js; do node -c "$f"; done
```
**Geçmişte bu hata projeyi tamamen çökertti** — `clearDebt()` fonksiyonunun kapanış `}` eksikti.

### 3. Çift Katmanlı Storage (Geçiş Döneminde)

**Eski sistem (cr4_store):**
- `lsSave(key, value)` → localStorage + Supabase cr4_store
- `lsGet(key, default)` → localStorage'dan okur
- `syncFromSupabase()` → cr4_store'dan çekip localStorage'ı günceller

**Yeni sistem (ilişkisel tablolar):**
- `DB.saveCustomer(data)` → customers tablosuna + cache
- `DB.getOrders()` → orders tablosundan + cache
- `cacheGet/cacheSet` → cr5_ prefix ile localStorage
- `syncAll()` → tüm tablolardan çekip cache günceller

**Geçiş mantığı:** `cacheGet('db_migrated', false)` true ise yeni DB kullanılır.

### 4. State Değişikliklerinde Save Çağır
```js
S.debts[stopId] = yeniDeger;
save.debts();  // ← MUTLAKA çağır
```

### 5. Yeni Sayfa Ekleme
1. `index.html`'de `<div class="page" id="page-ISIM">` ekle
2. `app.js` → `renderCurrentPage()` fonksiyonuna `case 'ISIM': renderISIM(); break;` ekle
3. `pages.js`'e `renderISIM()` fonksiyonunu ekle
4. Gerekirse `app.js` → `showPage()` nav mapping güncelle

**Mevcut sayfalar:** route, orders, customers, profile, reports, settings, catalog, map

**Alt navigasyon (5 buton):** Route, Orders, Customers, Reports, Settings

### 6. Türkçe UI
Tüm kullanıcıya görünen metinler Türkçe olmalı. Kod yorumları İngilizce veya Türkçe olabilir.

### 7. Scroll Pozisyonu Koruma
Sayfa içi güncellemelerde scroll pozisyonunu kaydet/geri yükle:
```js
const body = document.querySelector('#page-xyz .page-body');
const scrollPos = body ? body.scrollTop : 0;
renderXyz();
const newBody = document.querySelector('#page-xyz .page-body');
if (newBody) newBody.scrollTop = scrollPos;
```

### 8. Sipariş Formu Tam Sayfa
Yeni sipariş/düzenleme formu `openModal()` yerine tam sayfa overlay (`order-form-overlay`) kullanır.

---

## Veritabanı (Supabase)

```
Project: ClientRotaCrm
URL: https://mvvvqloqwjimlbqeotsd.supabase.co
Anon Key: (js/db.js içinde)
RLS: kapalı (DISABLE ROW LEVEL SECURITY)
```

### Eski Tablo (geçiş döneminde korunuyor)
- `cr4_store` (key TEXT PRIMARY KEY, value JSONB, updated_at TIMESTAMPTZ)

### Yeni Tablolar (migration/001_create_tables.sql)
- `customers` — müşteriler (id, name, address, city, postcode, lat, lng, note)
- `products` — ürün kataloğu
- `assignments` — müşteri → gün ataması
- `route_order` — gün içi rota sırası
- `orders` — siparişler
- `order_items` — sipariş kalemleri
- `debts` — güncel borç bakiyesi
- `debt_history` — borç işlem geçmişi
- `customer_pricing` — müşteri özel fiyatları
- `recurring_orders` — tekrarlayan sipariş şablonları
- `app_settings` — uygulama ayarları (key-value)
- `migrations` — göç takibi

---

## Bağımlılıklar (CDN)

```html
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js">
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js">
```

---

## Hızlı Başlangıç

Claude Code'un projeye başlamadan önce yapması gerekenler:

- [ ] Bu dosyayı oku
- [ ] `js/app.js` — state yapısı ve navigation'ı anla
- [ ] `js/db.js` — storage katmanını anla
- [ ] `js/pages.js` — sayfa render fonksiyonlarını incele
- [ ] Değişiklik yapmadan önce brace dengesi kontrolü yap
- [ ] Her değişiklik sonrası `node -c` ile syntax doğrula
