-- ============================================================
--  Banks Fresh Farms — Supabase Schema
--  Run this once in: Supabase Dashboard → SQL Editor → Run
-- ============================================================


-- ─── Subscriptions (Egg Plans & One-off Orders) ──────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at       timestamptz DEFAULT now(),
  first_name       text        NOT NULL,
  last_name        text        NOT NULL,
  email            text        NOT NULL,
  phone            text,
  plan             text        NOT NULL
                               CHECK (plan IN (
                                 'monthly','6-month','12-month',
                                 'single-dozen','solo-notify','inquiry'
                               )),
  -- Hard cap: the website sends 5 for subscriptions, 1 for single-dozen,
  -- 0 for non-delivery plans. Max 20 prevents capacity-abuse via direct API calls.
  dozens_per_month integer     NOT NULL DEFAULT 5
                               CHECK (dozens_per_month BETWEEN 0 AND 20),
  total_price      numeric(8,2),
  pickup_date      date,
  start_date       date        DEFAULT CURRENT_DATE,
  end_date         date,       -- NULL = cancel-anytime; set for 6/12-month
  status           text        NOT NULL DEFAULT 'pending'
                               CHECK (status IN (
                                 'pending','active','cancelled','completed'
                               )),
  inquiry_type     text,
  notes            text
);


-- ─── Beef Orders ─────────────────────────────────────────────
-- Separate table so beef and egg orders don't mix.
CREATE TABLE IF NOT EXISTS beef_orders (
  id           uuid         DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at   timestamptz  DEFAULT now(),
  first_name   text         NOT NULL,
  last_name    text         NOT NULL,
  email        text         NOT NULL,
  phone        text,
  -- JSON array of line items: [{name, qty_lbs, price_per_lb, subtotal}]
  items        jsonb        NOT NULL DEFAULT '[]',
  pickup_date  date,
  pickup_label text,
  delivery     boolean      NOT NULL DEFAULT false,
  delivery_fee numeric(6,2) NOT NULL DEFAULT 0
                            CHECK (delivery_fee >= 0 AND delivery_fee <= 50),
  subtotal     numeric(8,2) NOT NULL CHECK (subtotal > 0),
  total        numeric(8,2) NOT NULL CHECK (total > 0),
  status       text         NOT NULL DEFAULT 'pending'
                            CHECK (status IN (
                              'pending','confirmed','fulfilled','cancelled'
                            )),
  notes        text
);


-- ─── Farm Capacity ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS farm_capacity (
  id               integer     PRIMARY KEY DEFAULT 1,
  dozens_per_month integer     NOT NULL DEFAULT 100,
  updated_at       timestamptz DEFAULT now()
);

-- Seed the single capacity row (edit this number in Supabase Studio
-- any time your production volume changes)
INSERT INTO farm_capacity (id, dozens_per_month)
VALUES (1, 100)
ON CONFLICT (id) DO NOTHING;


-- ─── Monthly Capacity View ────────────────────────────────────
-- Shows how many dozen are committed vs. available right now.
-- "Committed" = pending + active subscription plans only
-- (single-dozen one-offs and notify-me requests don't reduce capacity)
CREATE OR REPLACE VIEW monthly_capacity AS
SELECT
  fc.dozens_per_month                             AS total_capacity,
  COALESCE(SUM(s.dozens_per_month), 0)::integer   AS committed_dozens,
  (fc.dozens_per_month -
   COALESCE(SUM(s.dozens_per_month), 0))::integer AS available_dozens
FROM farm_capacity fc
LEFT JOIN subscriptions s
       ON s.status           IN ('pending', 'active')
      AND s.plan             NOT IN ('single-dozen', 'solo-notify', 'inquiry')
      AND (s.end_date IS NULL OR s.end_date >= CURRENT_DATE)
WHERE fc.id = 1
GROUP BY fc.dozens_per_month;


-- ─── Row-Level Security ───────────────────────────────────────
--
--  The anon key is visible in bff-config.js (unavoidable for a client-side
--  app). RLS is the only thing protecting your data. Rules enforced here:
--
--    anon (website visitors)
--      subscriptions : INSERT only, status must be 'pending'
--      beef_orders   : INSERT only, status must be 'pending'
--      farm_capacity : SELECT only (capacity bar on the website)
--      monthly_capacity view: SELECT (fed by the capacity bar)
--
--    authenticated (you, logged into Supabase Studio)
--      All tables: full access
--
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE beef_orders   ENABLE ROW LEVEL SECURITY;
ALTER TABLE farm_capacity ENABLE ROW LEVEL SECURITY;

-- Visitors: insert new orders, but only with status = 'pending'.
-- Prevents anyone from POSTing directly to the API to fake an active
-- subscription and inflate the capacity view.
DROP POLICY IF EXISTS "public_insert_subscriptions" ON subscriptions;
CREATE POLICY "public_insert_subscriptions" ON subscriptions
  FOR INSERT TO anon
  WITH CHECK (status = 'pending');

-- Admin: full access to subscription rows
DROP POLICY IF EXISTS "admin_all_subscriptions" ON subscriptions;
CREATE POLICY "admin_all_subscriptions" ON subscriptions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Visitors: insert beef orders (pending only)
DROP POLICY IF EXISTS "public_insert_beef_orders" ON beef_orders;
CREATE POLICY "public_insert_beef_orders" ON beef_orders
  FOR INSERT TO anon
  WITH CHECK (status = 'pending');

-- Admin: full access to beef order rows
DROP POLICY IF EXISTS "admin_all_beef_orders" ON beef_orders;
CREATE POLICY "admin_all_beef_orders" ON beef_orders
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Visitors: read capacity (displayed on the website)
DROP POLICY IF EXISTS "public_read_capacity" ON farm_capacity;
CREATE POLICY "public_read_capacity" ON farm_capacity
  FOR SELECT TO anon, authenticated USING (true);

-- Admin: update capacity numbers
DROP POLICY IF EXISTS "admin_update_capacity" ON farm_capacity;
CREATE POLICY "admin_update_capacity" ON farm_capacity
  FOR UPDATE TO authenticated USING (true);

-- Grant view access to anon/authenticated roles
GRANT SELECT ON monthly_capacity TO anon, authenticated;
