# ROADMAP.md — Planned Features and Development Ideas

## Completed

### Core Infrastructure
- [x] 100+ customers, Leaflet map
- [x] Week A/B x 5-day rotation
- [x] Drag-and-drop route ordering (Route page)
- [x] OpenStreetMap geocoding
- [x] Excel export (route, reports)
- [x] JSON data backup/restore
- [x] Modular file architecture (split from single file)
- [x] Tailwind CSS CDN integration
- [x] English UI throughout
- [x] Supabase DB persistence in all save functions

### Orders and Payments
- [x] Full-page order form (new/edit)
- [x] Product picker for item selection
- [x] Editable price order items
- [x] Payment methods: Cash / Bank / Unpaid
- [x] Stock tracking (auto-decrement on order creation)
- [x] Order sorting: Date / Name / Amount / Day / Manual
- [x] Week/day badge on order cards
- [x] Double-click protection on order save

### Customer Management
- [x] Customer CRUD (add/edit/delete)
- [x] Excel/CSV import
- [x] Persistent customer notes
- [x] Customer profile page (order history, top products, debt)
- [x] Customer-specific pricing (customerPricing)
- [x] Filters: All / Week A / Week B / Unassigned
- [x] Contact details (name, phone, email)

### Catalog
- [x] Global product catalog (name, unit, price, stock)
- [x] Colored stock badges (green/yellow/red)
- [x] Stock add/remove (scroll preserved)
- [x] Daily product support (trackStock: false)
- [x] Edit mode (name, unit, price, stock, daily toggle)

### Debt Management
- [x] Debt tracking
- [x] Debt history with add/clear entries
- [x] Quick payment form
- [x] Debt collection during visits

### Reports
- [x] Overview / Products / Customers / Debts / Export / History tabs
- [x] Date range filter (Today / Week / Month / Custom)
- [x] Product sales report with PDF and Excel export
- [x] Delivery history grouped by week

### Route
- [x] Pending order indicator on day tabs
- [x] Route summary share (clipboard/native share)
- [x] Delivery modal with payment options
- [x] Visit mode (no pending orders)
- [x] Recurring orders auto-creation

### Sync & Storage
- [x] Supabase hybrid storage (dual-layer)
- [x] Offline-first (localStorage cache)
- [x] New relational DB tables
- [x] Data migration from cr4_store to new tables
- [x] PWA service worker caching

---

## Pending Features

### High Priority

#### 1. Route Optimization
Currently manual ordering only.

**TODO:**
- Nearest neighbor algorithm for auto-ordering
- Or Google Maps / OSRM API integration

---

#### 2. Weekly/Monthly Revenue Charts
Reports have numbers but no visual charts.

**TODO:**
- Canvas/SVG line chart
- Weekly bar chart

---

### Medium Priority

#### 3. Push Notification / Reminders
Morning notification with "today's route" at a set time.

#### 4. WhatsApp Order Summary
Format day's orders as a WhatsApp message.

---

### Low Priority

#### 5. Multi-User / Team
Supabase Auth + Row Level Security

#### 6. Geographic Region Sorting
Kent / London region toggle + region filter

---

## Technical Debt

### High
- [ ] Orders data growth — archive old orders
- [ ] Error handling — user notification on sync errors
- [ ] Conflict resolution — timestamp-based merge

### Medium
- [ ] Batch Supabase writes — debounce for bulk writes
- [ ] Geocoding retry mechanism

### Low
- [ ] CSS cleanup — inline styles could be moved to Tailwind classes
- [ ] Further Tailwind CSS adoption across all page templates
