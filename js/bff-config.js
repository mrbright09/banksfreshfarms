/* Banks Fresh Farms — Supabase credentials
   ─────────────────────────────────────────
   1. Go to supabase.com → New Project
   2. Run supabase/schema.sql in SQL Editor
   3. Settings → API → copy Project URL + anon/public key
   4. Paste below and push                                */

var BFF_SUPABASE_URL      = 'YOUR_SUPABASE_PROJECT_URL';
var BFF_SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

/* ─── Atlanta City Pickup Dates ────────────────────────────────
   Add the specific Saturdays you'll be in Atlanta each month.
   Format: 'YYYY-MM-DD'  (24-hour local date, no time needed)
   Update this list whenever you book a trip. Customers will only
   see these exact dates as selectable — nothing else.
   Leave the array empty if no trips are scheduled yet.          */

var BFF_ATLANTA_DATES = [
  /* Example: '2026-07-12', '2026-08-02' */
];

/* ─── Savannah City Pickup Dates ────────────────────────────────────────
   Add the specific Saturdays you'll be in Savannah each month.
   Format: 'YYYY-MM-DD'  (24-hour local date, no time needed)
   Leave the array empty if no trips are scheduled yet.                   */

var BFF_SAVANNAH_DATES = [
  /* Example: '2026-07-19', '2026-08-09' */
];

/* ─── Free Dozen Promotion ─────────────────────────────────────────────
   Limited-time offer: new Monthly Egg Share subscribers get one extra
   dozen free on their FIRST pickup only (6 dozen instead of 5).

     active  → set to false to end the promotion immediately
     endDate → optional last day to sign up, 'YYYY-MM-DD'.
               Leave '' to run until you set active to false.
               After this date the offer stops showing on its own.

   Turning this off changes the website copy, the cart, and the order
   email together — there is nothing else to update.                    */

var BFF_PROMO_FREE_DOZEN = {
  active:  true,
  endDate: ''   /* Example: '2026-10-31' */
};

/* ─── Tax Rates ────────────────────────────────────────────────────────
   Raw meat and eggs are exempt from Georgia state sales tax.
   Seasonings are taxable. We collect the combined rate (state + county):
     Farm / Church pickup  → Chatham County 7%
     Atlanta pickup        → Fulton County 8.9%
     Savannah beef pickup  → Chatham County 7%
   Rate applied only when the cart contains taxable items (seasonings).  */

var BFF_TAX_RATES = {
  farm:     0.07,
  church:   0.07,
  atlanta:  0.089,
  savannah: 0.07
};

/* ─── Delivery ─────────────────────────────────────────────────────────
   Flat $15 delivery fee; waived when order subtotal is $75 or more.    */

var BFF_DELIVERY_FEE       = 15;
var BFF_DELIVERY_FREE_OVER = 75;
