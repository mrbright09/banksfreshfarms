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

/* ─── Founding Member Offer ────────────────────────────────────────────
   A limited introductory period. While it runs, the website shows the
   founding rates below and offers the 6-month prepaid membership.
   Turning it off switches every price to the upcoming rates and removes
   the prepaid option — website copy, cart and order email together.

     active  → set to false to end the founding offer immediately
     endDate → optional last day to sign up, 'YYYY-MM-DD'.
               Leave '' to run until you set active to false.
               After this date the offer stops showing on its own.       */

var BFF_PROMO_FREE_DOZEN = {
  active:  true,
  endDate: ''   /* Example: '2026-10-31' */
};

/* ─── Egg Pricing ──────────────────────────────────────────────────────
   Single source of truth for every egg price on the site. All customer-
   facing copy — the shop card, the pack modal, the offer card, the cart
   line and the order email — is generated from these numbers, so there
   is nowhere else to edit and nothing that can fall out of step.

   Which set is live is decided by BFF_PROMO_FREE_DOZEN above.

     founding  → while the founding offer runs
                 $5 a dozen one-time, $20/month for 5 dozen ($4/dozen),
                 and a $120 prepaid membership covering six months.

     upcoming  → once the offer ends
                 $6 a dozen one-time, $25/month for 5 dozen ($5/dozen).
                 No prepaid membership is sold at these rates.

   The prepaid saving shown on the site is derived, not typed:
     6 x upcoming monthly ($25) = $150, less the $120 prepaid = $30.
   Change any number here and that figure follows automatically.

   IMPORTANT: ending the founding offer raises prices on the live site
   the moment it takes effect. Existing members are not repriced
   automatically — that is a conversation you have with them directly.   */

var BFF_EGG_PRICING = {
  founding: {
    singleDozen:    5,
    monthlyTotal:   20,
    dozensPerMonth: 5,
    prepayTotal:    120,
    prepayMonths:   6
  },
  upcoming: {
    singleDozen:    6,
    monthlyTotal:   25,
    dozensPerMonth: 5
  }
};

/* How many founding memberships are offered. Shown on the offer card. */
var BFF_FOUNDING_LIMIT = 25;

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
