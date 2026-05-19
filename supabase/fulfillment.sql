-- ============================================================
--  Banks Fresh Farms — Fulfillment Tracking
--  Run in Supabase Dashboard → SQL Editor → Run
--  (run schema.sql first if you haven't already)
-- ============================================================


-- ─── Pickups table ───────────────────────────────────────────
-- One row per pickup event. Admin adds a row every Saturday
-- when a subscriber collects their eggs.

CREATE TABLE IF NOT EXISTS pickups (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at      timestamptz DEFAULT now(),
  subscription_id uuid        NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  pickup_date     date        NOT NULL DEFAULT CURRENT_DATE,
  dozens_taken    integer     NOT NULL DEFAULT 1,
  notes           text
);

ALTER TABLE pickups ENABLE ROW LEVEL SECURITY;

-- Only authenticated users (you, in Supabase Studio) can manage pickups
CREATE POLICY "admin_all_pickups" ON pickups
  FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ─── Per-subscriber monthly status view ──────────────────────
-- Shows every active subscriber and how many dozens remain
-- for the CURRENT calendar month.
-- Reset is automatic — it filters by this month every time.

CREATE OR REPLACE VIEW subscriber_monthly_status AS
SELECT
  s.id,
  s.first_name || ' ' || s.last_name          AS name,
  s.email,
  s.phone,
  s.plan,
  s.dozens_per_month                           AS entitled,
  COALESCE(SUM(p.dozens_taken), 0)::integer    AS picked_up,
  (s.dozens_per_month
     - COALESCE(SUM(p.dozens_taken), 0))::integer AS remaining,
  s.status
FROM subscriptions s
LEFT JOIN pickups p
       ON p.subscription_id = s.id
      AND date_trunc('month', p.pickup_date) = date_trunc('month', CURRENT_DATE)
WHERE s.status   =  'active'
  AND s.plan     IN ('monthly', '6-month', '12-month')
GROUP BY
  s.id, s.first_name, s.last_name,
  s.email, s.phone, s.plan,
  s.dozens_per_month, s.status
ORDER BY remaining DESC, s.last_name;

GRANT SELECT ON subscriber_monthly_status TO authenticated;


-- ─── Handy queries to bookmark in SQL Editor ─────────────────

-- See everyone's status right now:
-- SELECT * FROM subscriber_monthly_status;

-- See who still has dozens left this month:
-- SELECT name, phone, entitled, picked_up, remaining
-- FROM subscriber_monthly_status
-- WHERE remaining > 0;

-- Record a pickup (replace the id with the real subscription id):
-- INSERT INTO pickups (subscription_id, pickup_date, dozens_taken)
-- VALUES ('<subscription-id>', CURRENT_DATE, 1);

-- See all pickups this month:
-- SELECT s.first_name || ' ' || s.last_name AS name,
--        p.pickup_date, p.dozens_taken
-- FROM pickups p
-- JOIN subscriptions s ON s.id = p.subscription_id
-- WHERE date_trunc('month', p.pickup_date) = date_trunc('month', CURRENT_DATE)
-- ORDER BY p.pickup_date DESC;
