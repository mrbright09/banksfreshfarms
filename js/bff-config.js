/* Banks Fresh Farms — Supabase credentials
   ─────────────────────────────────────────
   1. Go to supabase.com → New Project
   2. Run supabase/schema.sql in SQL Editor
   3. Settings → API → copy Project URL + anon/public key
   4. Paste below and push                                */

var BFF_SUPABASE_URL      = 'YOUR_SUPABASE_PROJECT_URL';
var BFF_SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

/* ─── Atlanta City Pickup Dates ────────────────────────────────
   Used ONLY by the one-time single-dozen egg order, where a customer
   picks City Pickup instead of the farm or the church. Beef and the
   egg share both collect on the 2nd weekend and do not read this list.

   Add the specific Saturdays you'll be in Atlanta each month.
   Format: 'YYYY-MM-DD'  (24-hour local date, no time needed)
   Customers see these exact dates and nothing else.
   Leave the array empty if no trips are scheduled yet.          */

var BFF_ATLANTA_DATES = [
  /* Example: '2026-07-12', '2026-08-02' */
];

/* ─── Season Offer ─────────────────────────────────────────────────────
   Enrollment at the season rate, open until the end of September.

   The reason is the flock, not a sales tactic: hens lay by daylight.
   Production peaks in spring and early summer, declines steadily from
   July, and falls off sharply around the September equinox as daylight
   shortens. The offer closes with the season it depends on.

   The Family Subscription is sold ONLY while this is running. When it
   ends the subscription comes off the website entirely — price, features,
   offer and button — leaving a note that says why, and single dozens
   move to the post-season price. A subscription still sitting in an old
   cart is blocked at checkout rather than quietly going through.

     active  → set to false to close enrollment immediately
     endDate → last day to sign up, 'YYYY-MM-DD'. The offer stops showing
               by itself after this date, so the "closes at the end of
               September" line on the site cannot outlive its own claim.
               Set to '' to run until you flip active to false.

   Change the date here if the season runs long or short — nothing else
   needs editing.                                                        */

var BFF_PROMO_FREE_DOZEN = {
  active:  true,
  endDate: '2026-09-30'
};

/* ─── Egg Pricing ──────────────────────────────────────────────────────
   Single source of truth for every egg price on the site. All customer-
   facing copy — the shop card, the pack modal, the offer card, the cart
   line and the order email — is generated from these numbers, so there
   is nowhere else to edit and nothing that can fall out of step.

   Which set is live is decided by BFF_PROMO_FREE_DOZEN above.

     founding  → while the season offer runs
                 $5 a dozen one-time, $20/month for 5 dozen ($4/dozen).
                 A $120 six-month prepaid membership is defined below
                 but is NOT currently on the storefront.

     upcoming  → once the offer ends
                 $6 a dozen one-time. monthlyTotal is kept only so the
                 subscription has a rate to return at next season; it is
                 not shown anywhere while enrollment is closed.

   prepayTotal / prepayMonths are retained so the prepaid membership can
   be switched back on without re-deriving its numbers. Nothing on the
   storefront reads them while that plan is off.

   IMPORTANT: ending the season offer raises prices on the live site
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

/* ─── Beef Stock ───────────────────────────────────────────────────────
   What is actually left in the freezer, by cut. This is the ONLY place
   beef stock is written down — the shop card, the cuts list and the
   quantity steppers all read from here.

   Update 'remaining' after an order is confirmed and shipped, not when
   it is placed. The figure on the site is a claim about real inventory,
   so it should only move when the meat has actually left.

     started    what the cut started at. Only used to show the drop, as
                a struck-through figure beside the live one. Set it equal
                to 'remaining' when you restock and the strike goes away.
     remaining  pounds left. Set to 0 and the cut shows Sold Out
                everywhere by itself — nothing else to edit.

   Customers cannot order more than 'remaining' of a cut; the stepper
   stops there and tells them to get in touch about a larger order.      */

var BFF_BEEF_STOCK = {
  'ground-beef':   { started: 250, remaining: 0   },
  'short-ribs':    { started: 50,  remaining: 0   },
  'chuck-roast':   { started: 40,  remaining: 0   },
  'ribeye':        { started: 30,  remaining: 0   },
  't-bone':        { started: 30,  remaining: 0   },
  'oxtail':        { started: 20,  remaining: 0   },
  'sirloin-steak': { started: 35,  remaining: 0   },
  'ny-strip':      { started: 30,  remaining: 0   }
};

/* ─── Next Beef Cuts ───────────────────────────────────────────────────
   When the next animal's cuts will be ready. Shown on the beef card and
   in the modal while every cut is sold out, so customers get a real
   answer instead of a vague one.

   Write it the way you would say it out loud — 'March 2027', 'late
   spring'. Set it to '' if the timing is genuinely unknown and the copy
   will simply omit the date rather than guess.                          */

var BFF_BEEF_NEXT_CUTS = 'March 2027';

/* ─── Sales Tax ────────────────────────────────────────────────────────
   READ THIS BEFORE CHANGING ANYTHING HERE, AND HAVE YOUR ACCOUNTANT
   CONFIRM IT. These are the rules the site applies, not tax advice.

   Georgia exempts food for home consumption from the 4% STATE rate.
   It does NOT exempt it from county and city sales taxes, which still
   apply to groceries in most Georgia jurisdictions. So eggs and raw
   beef are taxed here at the LOCAL rate only, not at zero and not at
   the combined rate. Anything not classed as groceries — seasonings,
   for instance — is taxed at state plus local.

   The local rates below are the county/city portion ONLY, with the 4%
   state already removed:

     Chatham County  7.0% combined  =  4% state + 3.0% local
     Fulton/Atlanta  8.9% combined  =  4% state + 4.9% local

   Verify both figures against the Georgia Department of Revenue rate
   chart for the quarter before you rely on them; local rates change,
   and Atlanta's differs from the rest of Fulton County.

     collect       master switch. false shows no tax line at all, which
                   is what you want until you are registered to collect.
     stateRate     Georgia state rate, applied only to non-grocery items.
     local         county/city portion by pickup jurisdiction.
     taxDelivery   Georgia treats delivery as part of the sale price, so
                   it is taxed at the same rate as what it carries.      */

var BFF_TAX = {
  collect:     true,
  stateRate:   0.04,
  taxDelivery: true,
  local: {
    farm:     0.03,   /* Chatham County */
    church:   0.03,   /* Chatham County */
    savannah: 0.03,   /* Chatham County */
    atlanta:  0.049   /* Fulton County + City of Atlanta */
  }
};

/* ─── Delivery ─────────────────────────────────────────────────────────
   Flat delivery fee, charged on every order that chooses delivery.
   There is no free-delivery threshold.                                 */

var BFF_DELIVERY_FEE = 15;
