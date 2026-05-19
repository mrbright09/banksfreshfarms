-- ============================================================
--  Banks Fresh Farms — Supabase Schema
--  Run this once in: Supabase Dashboard → SQL Editor → Run
-- ============================================================


-- ─── Subscriptions / Orders ──────────────────────────────────
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
  dozens_per_month integer     NOT NULL DEFAULT 5,
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
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE farm_capacity  ENABLE ROW LEVEL SECURITY;

-- Website visitors: insert orders only (no reading other people's data)
CREATE POLICY "public_insert_subscriptions" ON subscriptions
  FOR INSERT TO anon WITH CHECK (true);

-- Admin (authenticated via Supabase Studio): full access
CREATE POLICY "admin_all_subscriptions" ON subscriptions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Everyone can read capacity (shown on the website)
CREATE POLICY "public_read_capacity" ON farm_capacity
  FOR SELECT TO anon, authenticated USING (true);

-- Admin can update capacity numbers
CREATE POLICY "admin_update_capacity" ON farm_capacity
  FOR UPDATE TO authenticated USING (true);

-- Grant view access to anon/authenticated roles
GRANT SELECT ON monthly_capacity TO anon, authenticated;
