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
   Limited-time offer on the 6-MONTH PREPAY plan only: $120 upfront buys
   six months, and a free dozen rides on every pickup — 6 dozen a month,
   36 dozen in total for the price of 24. The plain monthly plan gets no
   free dozen; it is 5 dozen for $20 at the promo rate.

   Turning this off also removes the prepay plan from the website.

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

/* ─── Egg Pricing ──────────────────────────────────────────────────────
   Two price sets. Which one the website uses is decided entirely by
   BFF_PROMO_FREE_DOZEN above — you do not edit anything here to switch.

     promo     → while the free-dozen offer is running
                 $5/dozen one-time. Monthly is 4 dozen paid at $5
                 plus the 5th free, so $20 for 5 dozen.

     standard  → once the offer ends
                 $6/dozen one-time. Monthly is $5/dozen for all five,
                 so $25 for 5 dozen — still $1 under the one-time price.

   IMPORTANT: ending the promo raises prices on the live site the moment
   it takes effect. Existing subscribers are not repriced automatically —
   that is a conversation you have with them directly.                   */

var BFF_EGG_PRICING = {
  promo:    { singleDozen: 5, monthlyTotal: 20 },
  standard: { singleDozen: 6, monthlyTotal: 25 }
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
