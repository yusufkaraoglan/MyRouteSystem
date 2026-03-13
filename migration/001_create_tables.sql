-- ═══════════════════════════════════════════════════════════
-- Costadoro Routes CRM - Database Migration v2
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- This creates the new relational tables alongside cr4_store
-- ═══════════════════════════════════════════════════════════

-- 1. Customers
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT DEFAULT '',
  city TEXT DEFAULT '',
  postcode TEXT DEFAULT '',
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  note TEXT DEFAULT '',
  contact_name TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;

-- 2. Products (Catalog)
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  unit TEXT DEFAULT '1',
  price NUMERIC(10,2) DEFAULT 0,
  stock INT,
  track_stock BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

-- 3. Day Assignments (customer → day)
CREATE TABLE IF NOT EXISTS assignments (
  customer_id INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  day_id TEXT NOT NULL,
  PRIMARY KEY (customer_id)
);
ALTER TABLE assignments DISABLE ROW LEVEL SECURITY;

-- 4. Route Order (position within a day)
CREATE TABLE IF NOT EXISTS route_order (
  day_id TEXT NOT NULL,
  customer_id INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  position INT DEFAULT 0,
  PRIMARY KEY (day_id, customer_id)
);
ALTER TABLE route_order DISABLE ROW LEVEL SECURITY;

-- 5. Orders
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  customer_id INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'delivered')),
  pay_method TEXT,
  cash_paid NUMERIC(10,2),
  delivery_date DATE,
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  delivered_at TIMESTAMPTZ
);
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;

-- 6. Order Items
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  qty INT DEFAULT 1,
  price NUMERIC(10,2) DEFAULT 0
);
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;

-- 7. Debts (current balance)
CREATE TABLE IF NOT EXISTS debts (
  customer_id INT PRIMARY KEY REFERENCES customers(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) DEFAULT 0
);
ALTER TABLE debts DISABLE ROW LEVEL SECURITY;

-- 8. Debt History
CREATE TABLE IF NOT EXISTS debt_history (
  id SERIAL PRIMARY KEY,
  customer_id INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) DEFAULT 0,
  note TEXT DEFAULT '',
  order_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE debt_history DISABLE ROW LEVEL SECURITY;

-- 9. Customer Pricing (per-customer price overrides)
CREATE TABLE IF NOT EXISTS customer_pricing (
  customer_id INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  PRIMARY KEY (customer_id, product_name)
);
ALTER TABLE customer_pricing DISABLE ROW LEVEL SECURITY;

-- 10. Recurring Orders (auto-order templates)
CREATE TABLE IF NOT EXISTS recurring_orders (
  customer_id INT PRIMARY KEY REFERENCES customers(id) ON DELETE CASCADE,
  items JSONB NOT NULL DEFAULT '[]',
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE recurring_orders DISABLE ROW LEVEL SECURITY;

-- 11. App Settings (UI state, locked orders, etc.)
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE app_settings DISABLE ROW LEVEL SECURITY;

-- 12. Migration tracking
CREATE TABLE IF NOT EXISTS migrations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  executed_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE migrations DISABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_delivered ON orders(delivered_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_debt_history_customer ON debt_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_route_order_day ON route_order(day_id);
CREATE INDEX IF NOT EXISTS idx_assignments_day ON assignments(day_id);
