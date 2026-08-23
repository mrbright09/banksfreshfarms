/**
 * Banks Fresh Farms — Supabase integration
 * Uses the REST API directly (no client library needed).
 * Gracefully does nothing if credentials are not yet configured.
 */
(function () {
  'use strict';

  var configured = (
    typeof BFF_SUPABASE_URL      !== 'undefined' &&
    typeof BFF_SUPABASE_ANON_KEY !== 'undefined' &&
    BFF_SUPABASE_URL.indexOf('supabase.co') !== -1
  );

  function headers(extra) {
    var h = {
      'apikey':        BFF_SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + BFF_SUPABASE_ANON_KEY,
      'Content-Type':  'application/json'
    };
    if (extra) {
      Object.keys(extra).forEach(function (k) { h[k] = extra[k]; });
    }
    return h;
  }


  /* ─── Capacity ─────────────────────────────────────────────── */

  function loadCapacity() {
    var bar = document.getElementById('packCapacity');
    if (!bar) return;

    if (!configured) { bar.style.display = 'none'; return; }

    bar.style.display = '';
    var textEl = document.getElementById('packCapacityText');
    if (textEl) textEl.textContent = 'Checking availability…';

    fetch(
      BFF_SUPABASE_URL +
        '/rest/v1/monthly_capacity' +
        '?select=total_capacity,committed_dozens,available_dozens',
      { headers: headers() }
    )
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!Array.isArray(data) || !data.length) {
          bar.style.display = 'none';
          return;
        }
        var row = data[0];
        renderCapacity(row.available_dozens, row.total_capacity);
      })
      .catch(function () { bar.style.display = 'none'; });
  }

  function renderCapacity(available, total) {
    var bar  = document.getElementById('packCapacity');
    var fill = document.getElementById('packCapacityFill');
    var text = document.getElementById('packCapacityText');
    if (!bar) return;

    var pct = Math.min(100, Math.round(((total - available) / total) * 100));
    if (fill) fill.style.width = pct + '%';

    var isLow  = available > 0 && available <= 15;
    var isFull = available <= 0;
    bar.classList.toggle('pack-capacity--low',  isLow);
    bar.classList.toggle('pack-capacity--full', isFull);

    if (text) {
      if (isFull) {
        text.textContent = 'All subscription spots are filled this month.';
      } else if (isLow) {
        text.textContent = '⚠️ Only ' + available + ' dozen spots left this month!';
      } else {
        text.textContent =
          available + ' of ' + total + ' dozen spots available this month';
      }
    }
  }


  /* ─── Form submission ──────────────────────────────────────── */

  function submitForm(data) {
    if (!configured) return Promise.resolve({ ok: true, fallback: true });

    var plan            = data.plan || 'inquiry';
    var dozensPerMonth  = 5;
    var totalPrice      = null;
    var endDate         = null;

    if (plan === 'monthly') {
      totalPrice = 20;
    } else if (plan === 'single-dozen') {
      dozensPerMonth = 1;
      totalPrice     = 5;
    } else {
      dozensPerMonth = 0;
    }

    return fetch(BFF_SUPABASE_URL + '/rest/v1/subscriptions', {
      method:  'POST',
      headers: headers({ 'Prefer': 'return=minimal' }),
      body: JSON.stringify({
        first_name:       data.firstName,
        last_name:        data.lastName,
        email:            data.email,
        phone:            data.phone || null,
        plan:             plan,
        dozens_per_month: dozensPerMonth,
        total_price:      totalPrice,
        pickup_date:      data.pickupDate || null,
        end_date:         endDate,
        inquiry_type:     data.inquiryType || null,
        notes:            data.message    || null,
        status:           'pending'
      })
    }).then(function (res) {
      return { ok: res.status === 201, status: res.status };
    });
  }


  /* ─── Beef Order submission ────────────────────────────────── */

  function submitBeefOrder(data) {
    if (!configured) return Promise.resolve({ ok: true, fallback: true });

    return fetch(BFF_SUPABASE_URL + '/rest/v1/beef_orders', {
      method:  'POST',
      headers: headers({ 'Prefer': 'return=minimal' }),
      body: JSON.stringify({
        first_name:   data.firstName,
        last_name:    data.lastName,
        email:        data.email,
        phone:        data.phone   || null,
        items:        data.items,          // [{name, qty_lbs, price_per_lb, subtotal}]
        pickup_date:  data.pickupDate  || null,
        pickup_label: data.pickupLabel || null,
        delivery:     data.delivery    || false,
        delivery_fee: data.deliveryFee || 0,
        subtotal:     data.subtotal,
        total:        data.total,
        notes:        data.notes || null,
        status:       'pending'
      })
    }).then(function (res) {
      return { ok: res.status === 201, status: res.status };
    });
  }


  /* ─── Public API ───────────────────────────────────────────── */
  window.BFF = {
    loadCapacity:    loadCapacity,
    submitForm:      submitForm,
    submitBeefOrder: submitBeefOrder,
    isConfigured:    configured
  };

})();
