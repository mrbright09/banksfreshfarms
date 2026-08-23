/**
 * Banks Fresh Farms — main.js
 */

(function () {
  'use strict';

  /* ─── Global Cart ─────────────────────────────────────────────────── */
  var cart = { beef: [], eggs: null, beefPickup: { date: '', label: '' }, beefPickupLocation: 'atlanta' };

  /* ─── Egg Subscription Helpers ───────────────────────────────────────── */
  var EGG_SUB_HOLIDAYS = {
    '2026-09-07':1,'2026-11-11':1,'2026-11-26':1,'2026-12-25':1,
    '2027-01-01':1,'2027-01-18':1,'2027-02-15':1,'2027-05-31':1,
    '2027-07-05':1,'2027-09-06':1,'2027-11-11':1,'2027-11-25':1,
    '2027-12-24':1,'2028-01-01':1
  };

  function pad2(n) { return n < 10 ? '0' + n : '' + n; }

  function resolveEggSubDate(nominalDate) {
    var d = new Date(nominalDate.getTime()); d.setHours(0,0,0,0);
    for (var i = 0; i < 10; i++) {
      var s = d.getFullYear() + '-' + pad2(d.getMonth()+1) + '-' + pad2(d.getDate());
      if (EGG_SUB_HOLIDAYS[s] || d.getDay() === 0) { d = new Date(d.getTime() + 86400000); }
      else { break; }
    }
    return d;
  }

  function getEggSubDates(cadence, count) {
    var today = new Date(); today.setHours(0,0,0,0);
    var earliest = new Date(today.getTime() + 5 * 86400000);
    var nominalDays = cadence === 'all' ? [15] : [1, 15];
    var results = []; var year = today.getFullYear(); var month = today.getMonth();
    for (var m = 0; m < 36 && results.length < count; m++) {
      var y = year + Math.floor((month + m) / 12);
      var mo = (month + m) % 12;
      for (var di = 0; di < nominalDays.length && results.length < count; di++) {
        var nominal = new Date(y, mo, nominalDays[di]); nominal.setHours(0,0,0,0);
        var resolved = resolveEggSubDate(nominal); resolved.setHours(0,0,0,0);
        if (resolved >= earliest) results.push({ date: resolved, nominalDay: nominalDays[di] });
      }
    }
    return results;
  }

  var EGG_SUB_PLANS = ['monthly'];

  /* Free-dozen promo — active only while configured on and not past endDate. */
  function promoActive() {
    var p = window.BFF_PROMO_FREE_DOZEN;
    if (!p || !p.active) return false;
    if (!p.endDate) return true;
    var parts = String(p.endDate).split('-');
    if (parts.length !== 3) return true;
    var end = new Date(+parts[0], +parts[1] - 1, +parts[2]);
    end.setHours(23, 59, 59, 999);
    return new Date() <= end;
  }

  /* Reveal the promo copy only while the offer is running. */
  (function initPromo() {
    if (!promoActive()) return;
    ['eggPromoFlag', 'eggPromoBanner'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.hidden = false;
    });
  })();

  function saveCart() {
    try { localStorage.setItem('bff_cart', JSON.stringify(cart)); } catch (e) {}
  }

  (function loadCart() {
    try {
      var saved = localStorage.getItem('bff_cart');
      if (!saved) return;
      var p = JSON.parse(saved);
      if (!p || typeof p !== 'object') return;
      if (Array.isArray(p.beef)) cart.beef = p.beef;
      if (p.eggs !== undefined) {
        cart.eggs = p.eggs;
        if (cart.eggs && typeof cart.eggs === 'object') {
          if (!('cadence' in cart.eggs)) cart.eggs.cadence = '';
          if (!('ack1'    in cart.eggs)) cart.eggs.ack1    = false;
          if (!('ack2'    in cart.eggs)) cart.eggs.ack2    = false;
        }
      }
      if (p.beefPickup && typeof p.beefPickup === 'object') cart.beefPickup = p.beefPickup;
      if (p.beefPickupLocation) cart.beefPickupLocation = p.beefPickupLocation;
    } catch (e) {}
  })();

  function cartTotal() {
    var t = 0;
    cart.beef.forEach(function (item) { t += item.sub; });
    if (cart.eggs) t += cart.eggs.total;
    return t;
  }

  /* GA sales tax: raw meat + eggs are exempt; seasonings are taxable.
     Rate depends on pickup location (Atlanta 8.9%, farm/church 7%).    */
  function getTaxRate() {
    var rates = (typeof BFF_TAX_RATES !== 'undefined') ? BFF_TAX_RATES : { farm: 0.07, church: 0.07, atlanta: 0.089 };
    var hasAtlantaItem = cart.beef.length > 0 ||
      (cart.eggs && cart.eggs.pickupType === 'atlanta');
    return hasAtlantaItem ? rates.atlanta : rates.farm;
  }

  /* Delivery fee: flat fee unless subtotal meets free threshold. */
  function getDeliveryFee(subtotal) {
    var fee      = (typeof BFF_DELIVERY_FEE       !== 'undefined') ? BFF_DELIVERY_FEE       : 15;
    var freeOver = (typeof BFF_DELIVERY_FREE_OVER !== 'undefined') ? BFF_DELIVERY_FREE_OVER : 75;
    var toggle   = document.getElementById('cartDeliveryToggle');
    if (!toggle || !toggle.checked) return 0;
    return subtotal >= freeOver ? 0 : fee;
  }

  /* Recompute and write all totals to the cart drawer footer. */
  function updateCartTotals() {
    var subtotal  = cartTotal();
    var delivery  = getDeliveryFee(subtotal);
    /* Tax applies only to seasonings (not raw meat/eggs). Since we don't
       sell seasonings online yet, tax is $0 for all current cart items.
       When seasonings are added, compute their taxable share and apply getTaxRate(). */
    var taxable   = 0;
    var tax       = +(taxable * getTaxRate()).toFixed(2);
    var grand     = subtotal + delivery + tax;

    var subEl      = document.getElementById('cartSubtotalAmt');
    var delivEl    = document.getElementById('cartDeliveryLine');
    var delivAmtEl = document.getElementById('cartDeliveryLineAmt');
    var noteEl     = document.getElementById('cartDeliveryNote');
    var taxEl      = document.getElementById('cartTaxAmt');
    var totalEl    = document.getElementById('cartDrawerTotalAmt');

    if (subEl)   subEl.textContent   = '$' + subtotal.toFixed(2);
    if (taxEl)   taxEl.textContent   = '$' + tax.toFixed(2);
    if (totalEl) totalEl.textContent = '$' + grand.toFixed(2);

    var freeOver     = (typeof BFF_DELIVERY_FREE_OVER !== 'undefined') ? BFF_DELIVERY_FREE_OVER : 75;
    var fee          = (typeof BFF_DELIVERY_FEE       !== 'undefined') ? BFF_DELIVERY_FEE       : 15;
    var toggle       = document.getElementById('cartDeliveryToggle');
    var wantsDelivery = toggle && toggle.checked;
    if (delivEl) delivEl.style.display = wantsDelivery ? 'flex' : 'none';
    if (delivAmtEl) {
      delivAmtEl.textContent = (delivery === 0 && wantsDelivery) ? 'FREE' : '$' + delivery.toFixed(2);
    }
    if (noteEl) {
      noteEl.textContent = subtotal >= freeOver ? 'Free on this order!' : '+$' + fee + ' · free over $' + freeOver;
    }
  }

  function cartLineCount() {
    return cart.beef.length + (cart.eggs ? 1 : 0);
  }

  /* ─── Cart Drawer ─────────────────────────────────────────────────── */
  var cartDrawerEl   = document.getElementById('cartDrawer');
  var cartBackdropEl = document.getElementById('cartBackdrop');

  function openCartDrawer() {
    renderCartItems();
    if (cartDrawerEl)   cartDrawerEl.classList.add('cart-drawer--open');
    if (cartBackdropEl) cartBackdropEl.classList.add('cart-backdrop--visible');
    document.body.style.overflow = 'hidden';
  }

  function clearCart() {
    cart.beef      = [];
    cart.eggs      = null;
    cart.beefPickup = { date: '', label: '' };
    cart.beefPickupLocation = 'atlanta';
    drawerSelectedPickupDate = null;
    drawerPickupType = null;
    renderCartItems();
  }

  function closeCartDrawer() {
    if (cartDrawerEl)   cartDrawerEl.classList.remove('cart-drawer--open');
    if (cartBackdropEl) cartBackdropEl.classList.remove('cart-backdrop--visible');
    document.body.style.overflow = '';
  }

  function updateNavBadge() {
    var count = cartLineCount();
    var badge    = document.getElementById('navCartBadge');
    var badgeMob = document.getElementById('navCartBadgeMobile');
    var btn      = document.getElementById('navCartBtn');
    var btnMob   = document.getElementById('navCartBtnMobile');
    if (badge)    badge.textContent    = count;
    if (badgeMob) badgeMob.textContent = count;
    if (btn)    btn.classList.toggle('nav-cart-btn--visible',    count > 0);
    if (btnMob) btnMob.classList.toggle('nav-cart-btn--visible', count > 0);
  }

  function renderCartItems() {
    var listEl    = document.getElementById('cartItemsList');
    var emptyEl   = document.getElementById('cartEmpty');
    var footEl    = document.getElementById('cartDrawerFoot');
    var countEl   = document.getElementById('cartDrawerCount');
    var pickupPan = document.getElementById('cartPickupPanel');
    if (!listEl) return;

    var count      = cartLineCount();
    var clearBtnEl = document.getElementById('cartClearBtn');

    if (emptyEl)    emptyEl.style.display    = count === 0 ? 'block' : 'none';
    if (footEl)     footEl.style.display     = count === 0 ? 'none'  : 'block';
    if (clearBtnEl) clearBtnEl.style.display = count === 0 ? 'none'  : 'inline';

    if (count === 0) {
      listEl.innerHTML = '';
      if (pickupPan) pickupPan.style.display = 'none';
      if (countEl) countEl.textContent = '';
      updateNavBadge();
      return;
    }

    if (countEl) countEl.textContent = count + (count === 1 ? ' item' : ' items');
    updateCartTotals();

    var html = '';
    var beefPickupConfirmed = cart.beefPickup && cart.beefPickup.date;

    cart.beef.forEach(function (item) {
      var beefDetail = '$' + item.price.toFixed(2) + '/lb · Grass Fed Black Angus · ' +
        (beefPickupConfirmed ? cart.beefPickup.label : 'Pickup — select location & date below');
      html += '<div class="cart-item" data-item="beef|' + item.name + '">' +
        '<div class="cart-item-row">' +
          '<div class="cart-item-info">' +
            '<span class="cart-item-name">' + item.name + '</span>' +
            '<span class="cart-item-detail">' + beefDetail + '</span>' +
          '</div>' +
          '<span class="cart-item-price" id="beefPrice|' + item.name + '">$' + item.sub.toFixed(2) + '</span>' +
        '</div>' +
        '<div class="cart-item-footer">' +
          '<div class="cart-qty-stepper">' +
            '<button type="button" class="cart-qty-btn" data-qty-change="beef|' + item.name + '|-1" aria-label="Decrease">&#8722;</button>' +
            '<span class="cart-qty-val" id="beefQty|' + item.name + '">' + item.qty + ' lb</span>' +
            '<button type="button" class="cart-qty-btn" data-qty-change="beef|' + item.name + '|1" aria-label="Increase">+</button>' +
          '</div>' +
          '<button type="button" class="cart-item-remove" data-remove="beef|' + item.name + '">Remove</button>' +
        '</div>' +
        '</div>';
    });

    if (cart.eggs) {
      var pickupSet = cart.eggs.plan === 'single-dozen' && cart.eggs.pickupDate;
      var pickupHtml = '';
      if (pickupSet) {
        pickupHtml = '<div class="cart-pickup-set">' +
          '<span class="cart-pickup-set-check">✓</span>' +
          '<span>' + cart.eggs.pickupLabel + '</span>' +
          '<button type="button" class="cart-pickup-change" data-action="change-pickup">Change</button>' +
          '</div>';
      }
      html += '<div class="cart-item cart-item--eggs">' +
        '<div class="cart-item-row">' +
          '<div class="cart-item-info">' +
            '<span class="cart-item-name">' + cart.eggs.label + '</span>' +
            (cart.eggs.sublabel ? '<span class="cart-item-detail">' + cart.eggs.sublabel + '</span>' : '') +
          '</div>' +
          '<span class="cart-item-price">$' + cart.eggs.total.toFixed(2) + '</span>' +
        '</div>' +
        pickupHtml +
        '<button type="button" class="cart-item-remove" data-remove="eggs">Remove</button>' +
        '</div>';
    }

    listEl.innerHTML = html;

    /* Beef Atlanta pickup panel */
    if (cart.beef.length > 0) renderBeefPickupPanel(listEl);

    /* Egg subscription pickup panel */
    if (cart.eggs && EGG_SUB_PLANS.indexOf(cart.eggs.plan) !== -1) {
      renderEggSubscriptionPanel(listEl);
    }

    /* Egg pickup panel (single-dozen only) */
    var needsEggPickup = cart.eggs &&
      cart.eggs.plan === 'single-dozen' &&
      !cart.eggs.pickupDate;
    if (pickupPan) pickupPan.style.display = needsEggPickup ? 'block' : 'none';

    updateNavBadge();
    saveCart();
  }

  function renderBeefPickupPanel(container) {
    var today = new Date(); today.setHours(0,0,0,0);
    var loc   = cart.beefPickupLocation || 'atlanta';

    var panel = document.createElement('div');
    panel.className = 'cart-pickup-panel cart-beef-pickup-panel';

    var hdr = document.createElement('div');
    hdr.className = 'cart-pickup-panel-hdr';
    hdr.innerHTML = '<span class="cart-pickup-panel-title">Beef Pickup Location</span>';
    panel.appendChild(hdr);

    /* Location toggle tabs */
    var tabs = document.createElement('div');
    tabs.className = 'beef-loc-tabs';
    ['atlanta', 'savannah'].forEach(function (locKey) {
      var tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'beef-loc-tab' + (loc === locKey ? ' beef-loc-tab--active' : '');
      tab.textContent = locKey === 'atlanta' ? 'Atlanta' : 'Savannah';
      tab.addEventListener('click', function () {
        if (cart.beefPickupLocation === locKey) return;
        cart.beefPickupLocation = locKey;
        cart.beefPickup = { date: '', label: '' };
        saveCart();
        renderCartItems();
      });
      tabs.appendChild(tab);
    });
    panel.appendChild(tabs);

    /* Date selection area */
    if (cart.beefPickup && cart.beefPickup.date) {
      var setDiv = document.createElement('div');
      setDiv.className = 'cart-pickup-set';
      setDiv.innerHTML = '<span class="cart-pickup-set-check">✓</span>' +
        '<span>' + cart.beefPickup.label + '</span>';
      var changeBtn = document.createElement('button');
      changeBtn.type = 'button';
      changeBtn.className = 'cart-pickup-change';
      changeBtn.textContent = 'Change';
      changeBtn.addEventListener('click', function () {
        cart.beefPickup = { date: '', label: '' };
        renderCartItems();
      });
      setDiv.appendChild(changeBtn);
      panel.appendChild(setDiv);
    } else {
      var srcDates = loc === 'savannah'
        ? (window.BFF_SAVANNAH_DATES || [])
        : (window.BFF_ATLANTA_DATES  || []);
      var future = srcDates.filter(function (s) {
        var p = s.split('-');
        return new Date(+p[0], +p[1] - 1, +p[2]) >= today;
      });
      var cityName = loc === 'savannah' ? 'Savannah' : 'Atlanta';

      if (future.length === 0) {
        var msg = document.createElement('p');
        msg.className = 'cal-tbd-msg';
        msg.textContent = 'No ' + cityName + ' dates scheduled yet. Place your order and we\'ll reach out to confirm pickup.';
        panel.appendChild(msg);
        cart.beefPickup = { date: 'tbd', label: cityName + ' Pickup — date TBD' };
      } else {
        future.forEach(function (s) {
          var p    = s.split('-');
          var date = new Date(+p[0], +p[1] - 1, +p[2]);
          var btn  = document.createElement('button');
          btn.type = 'button';
          btn.className = 'cal-atlanta-date';
          btn.textContent = MONTHS[date.getMonth()].slice(0,3) + ' ' + date.getDate() + ', ' + date.getFullYear();
          (function (dateStr, dateObj) {
            btn.addEventListener('click', function () {
              var label = cityName + ' Pickup · Sat ' +
                MONTHS[dateObj.getMonth()] + ' ' + dateObj.getDate() + ', ' + dateObj.getFullYear();
              cart.beefPickup = { date: dateStr, label: label };
              renderCartItems();
            });
          })(s, date);
          panel.appendChild(btn);
        });
      }
    }

    container.appendChild(panel);
  }

  function renderEggSubscriptionPanel(container) {
    var panel = document.createElement('div');
    panel.className = 'cart-pickup-panel cart-egg-sub-panel';

    var hdr = document.createElement('div');
    hdr.className = 'cart-pickup-panel-hdr';
    hdr.innerHTML = '<span class="cart-pickup-panel-title">Egg Pickup Preference</span>';
    panel.appendChild(hdr);

    /* Confirmed view */
    if (cart.eggs.pickupDate) {
      var setDiv = document.createElement('div');
      setDiv.className = 'cart-pickup-set';
      setDiv.innerHTML = '<span class="cart-pickup-set-check">✓</span>' +
        '<span>' + cart.eggs.pickupLabel + '</span>';
      var changeBtn = document.createElement('button');
      changeBtn.type = 'button';
      changeBtn.className = 'cart-pickup-change';
      changeBtn.textContent = 'Change';
      changeBtn.addEventListener('click', function () {
        cart.eggs.pickupDate  = '';
        cart.eggs.pickupLabel = '';
        saveCart();
        renderCartItems();
      });
      setDiv.appendChild(changeBtn);
      panel.appendChild(setDiv);
      container.appendChild(panel);
      return;
    }

    /* Cadence toggle */
    var cadence = cart.eggs.cadence || '';
    var cadenceHdr = document.createElement('p');
    cadenceHdr.className = 'egg-sub-section-label';
    cadenceHdr.textContent = 'How would you like your eggs delivered?';
    panel.appendChild(cadenceHdr);

    var cadenceTabs = document.createElement('div');
    cadenceTabs.className = 'beef-loc-tabs egg-cadence-tabs';
    [
      { key: 'split', main: '3 + 2 Split',   detail: '3 dz on the 1st · 2 dz on the 15th' },
      { key: 'all',   main: 'All at Once',    detail: '5 dz on the 15th each month' }
    ].forEach(function (opt) {
      var tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'beef-loc-tab egg-cadence-tab' + (cadence === opt.key ? ' beef-loc-tab--active' : '');
      tab.innerHTML = '<span class="egg-cadence-tab-main">' + opt.main + '</span>' +
                      '<span class="egg-cadence-tab-detail">' + opt.detail + '</span>';
      tab.addEventListener('click', function () {
        if (cart.eggs.cadence === opt.key) return;
        cart.eggs.cadence     = opt.key;
        cart.eggs.pickupDate  = '';
        cart.eggs.pickupLabel = '';
        cart.eggs.ack2        = false;   /* cadence-specific note must be re-read */
        saveCart();
        renderCartItems();
      });
      cadenceTabs.appendChild(tab);
    });
    panel.appendChild(cadenceTabs);

    if (!cadence) { container.appendChild(panel); return; }

    /* Acknowledgment checkboxes — must check before a date can be selected */
    var ackLabels = [
      'My eggs arrive farm-fresh and unwashed. I\'ll store them on the counter and refrigerate only after washing.',
      cadence === 'all'
        ? 'I receive all 5 dozen on the 15th each month. If my first pickup falls before the 15th, my first delivery is 5 dozen.'
        : 'My 5 dozen/month is split: 3 dozen on the 1st and 2 dozen on the 15th. If my first pickup is on a 15th, my first delivery is 2 dozen.'
    ];

    var dateBtns = [];
    function syncDateBtns() {
      var ready = cart.eggs.ack1 && cart.eggs.ack2;
      dateBtns.forEach(function (b) {
        b.disabled = !ready;
        b.classList.toggle('cal-atlanta-date--locked', !ready);
      });
      if (hint) hint.style.display = ready ? 'none' : 'block';
    }

    var discDiv = document.createElement('div');
    discDiv.className = 'egg-sub-disclosures';

    var discHdr = document.createElement('p');
    discHdr.className = 'egg-sub-section-label';
    discHdr.textContent = 'Please review and accept:';
    discDiv.appendChild(discHdr);

    ackLabels.forEach(function (text, idx) {
      var lbl = document.createElement('label');
      lbl.className = 'egg-sub-check-label';
      var chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.className = 'egg-sub-check';
      chk.checked = idx === 0 ? cart.eggs.ack1 : cart.eggs.ack2;
      chk.addEventListener('change', function () {
        if (idx === 0) cart.eggs.ack1 = chk.checked;
        else           cart.eggs.ack2 = chk.checked;
        saveCart();
        syncDateBtns();
      });
      lbl.appendChild(chk);
      lbl.appendChild(document.createTextNode(' ' + text));
      discDiv.appendChild(lbl);
    });
    panel.appendChild(discDiv);

    /* First pickup date selection */
    var dateHdr = document.createElement('p');
    dateHdr.className = 'egg-sub-section-label';
    dateHdr.textContent = 'Select your first pickup:';
    panel.appendChild(dateHdr);

    var hint = document.createElement('p');
    hint.className = 'egg-sub-hint';
    hint.textContent = 'Accept both notes above to choose your date.';
    panel.appendChild(hint);

    var dates = getEggSubDates(cadence, 2);
    if (dates.length === 0) {
      var noMsg = document.createElement('p');
      noMsg.className = 'cal-tbd-msg';
      noMsg.textContent = "No upcoming dates available yet. We'll confirm your first pickup by email after ordering.";
      panel.appendChild(noMsg);
    } else {
      var bonus = promoActive() ? 1 : 0;
      dates.forEach(function (item) {
        var qty = cadence === 'all' ? 5 : (item.nominalDay === 1 ? 3 : 2);
        var firstQty = qty + bonus;   /* free dozen rides on the first pickup */
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'cal-atlanta-date';
        btn.innerHTML = MONTHS[item.date.getMonth()].slice(0,3) + ' ' + item.date.getDate() +
          ', ' + item.date.getFullYear() +
          ' <span class="egg-date-qty">— ' + firstQty + ' dz</span>' +
          (bonus ? ' <span class="egg-date-bonus">incl. 1 free</span>' : '');
        (function (d, q) {
          btn.addEventListener('click', function () {
            var cadenceDesc = cart.eggs.cadence === 'all'
              ? 'All at Once · 5 dz on the 15th'
              : 'Split · 3 dz on 1st + 2 dz on 15th';
            var dateStr = d.getFullYear() + '-' + pad2(d.getMonth()+1) + '-' + pad2(d.getDate());
            cart.eggs.pickupDate  = dateStr;
            cart.eggs.freeDozen   = bonus === 1;
            cart.eggs.pickupLabel = cadenceDesc + ' · First: ' +
              MONTHS[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear() +
              ' (' + q + ' dz' + (bonus ? ' + 1 FREE' : '') + ')';
            saveCart();
            renderCartItems();
          });
        })(item.date, qty);
        dateBtns.push(btn);
        panel.appendChild(btn);
      });
    }

    var note = document.createElement('p');
    note.className = 'egg-sub-note';
    note.textContent = 'Eggs are 1–14 days old at pickup — about 7 on average. ' +
      "We'll confirm your pickup location by email before your first date, and reach out directly if a date ever has to change.";
    panel.appendChild(note);

    syncDateBtns();
    container.appendChild(panel);
  }

  /* ─── Smooth Scroll ───────────────────────────────────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var targetId = this.getAttribute('href');
      if (!targetId || targetId === '#') return;
      var target = document.querySelector(targetId);
      if (!target) return;

      e.preventDefault();

      var nav = document.getElementById('nav');
      var navH = nav ? nav.offsetHeight : 0;
      var top = target.getBoundingClientRect().top + window.scrollY - navH;

      window.scrollTo({ top: top, behavior: 'smooth' });

      closeMobileNav();
    });
  });


  /* ─── Mobile Nav Toggle ──────────────────────────────────────────── */
  var hamburger  = document.getElementById('hamburger');
  var mobileNav  = document.getElementById('mobileNav');

  function openMobileNav() {
    mobileNav.classList.add('open');
    hamburger.innerHTML = '&times;';
    document.body.style.overflow = 'hidden';
  }

  function closeMobileNav() {
    mobileNav.classList.remove('open');
    hamburger.innerHTML = '&#9776;';
    document.body.style.overflow = '';
  }

  if (hamburger && mobileNav) {
    hamburger.addEventListener('click', function () {
      if (mobileNav.classList.contains('open')) {
        closeMobileNav();
      } else {
        openMobileNav();
      }
    });
  }

  /* Escape handled in cart drawer section below */

  /* ─── Form Validation Toast ──────────────────────────────── */
  var formToast      = document.getElementById('formToast');
  var formToastClose = document.getElementById('formToastClose');
  var contactForm    = document.querySelector('.contact-form');
  var toastTimer;

  function showToast(msg) {
    if (!formToast) return;
    clearTimeout(toastTimer);
    if (msg) {
      var msgEl = formToast.querySelector('.form-toast-msg');
      if (msgEl) msgEl.textContent = msg;
    }
    formToast.classList.add('show');
    toastTimer = setTimeout(hideToast, 4000);
  }

  function hideToast() {
    if (formToast) formToast.classList.remove('show');
  }

  if (formToastClose) {
    formToastClose.addEventListener('click', hideToast);
  }

  function showFormSuccess() {
    cart.beef = []; cart.eggs = null; cart.beefPickup = { date: '', label: '' }; cart.beefPickupLocation = 'atlanta'; renderCartItems(); closeCartDrawer();
    var successEl = document.getElementById('formSuccess');
    if (contactForm)  contactForm.style.display  = 'none';
    if (successEl)    successEl.style.display     = 'block';
    var contactSec = document.getElementById('contact');
    if (contactSec) {
      var navEl = document.getElementById('nav');
      var offset = navEl ? navEl.offsetHeight : 0;
      var top = contactSec.getBoundingClientRect().top + window.pageYOffset - offset - 16;
      window.scrollTo({ top: top, behavior: 'smooth' });
    }
  }

  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();

      var fields = contactForm.querySelectorAll('input[required], select[required], textarea[required]');
      var allFilled = true;
      fields.forEach(function (field) {
        if (!field.value.trim()) allFilled = false;
      });
      if (!allFilled) {
        showToast('Almost there! We just need all your info so the Banks family can get back to you.');
        return;
      }

      var planInput = document.getElementById('contactPlan');
      var submitBtn = document.getElementById('formSubmitBtn');
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Sending…'; }

      var data = {
        firstName:   contactForm.querySelector('[name="First Name"]').value.trim(),
        lastName:    contactForm.querySelector('[name="Last Name"]').value.trim(),
        email:       contactForm.querySelector('[name="Email"]').value.trim(),
        phone:       contactForm.querySelector('[name="Phone"]').value.trim(),
        plan:        planInput ? (planInput.value || 'inquiry') : 'inquiry',
        pickupDate:  planInput ? (planInput.dataset.pickupDate || null) : null,
        inquiryType: document.getElementById('contactInquiry').value,
        message:     document.getElementById('contactMessage').value.trim()
      };

      var submit = window.BFF
        ? window.BFF.submitForm(data)
        : Promise.resolve({ ok: true, fallback: true });

      submit
        .then(function (res) {
          if (res && res.ok) {
            if (res.fallback) {
              var typeMap = {
                'Beef Order':           'BEEF',
                'Poultry / Eggs Order': 'EGG',
                'Signature Seasonings': 'SEAS',
                'Herbal Products':      'HERB',
                'Merch':                'MERCH',
                'Wholesale / B2B':      'B2B',
                'Mixed Order':          'MIX'
              };
              var now = new Date();
              var ymd = now.getFullYear().toString() +
                        ('0' + (now.getMonth() + 1)).slice(-2) +
                        ('0' + now.getDate()).slice(-2);
              var hhmm = ('0' + now.getHours()).slice(-2) +
                         ('0' + now.getMinutes()).slice(-2);
              var typeCode = typeMap[data.inquiryType] || 'INQ';
              var orderId = typeCode + '-' + ymd + '-' + hhmm;
              var subject = 'BFF Order [' + orderId + ']';
              var body =
                'Order ID: ' + orderId + '\n' +
                'Name: ' + data.firstName + ' ' + data.lastName + '\n' +
                'Email: ' + data.email + '\n' +
                'Phone: ' + (data.phone || '') + '\n' +
                'Interest: ' + (data.inquiryType || '') + '\n' +
                (data.pickupDate ? 'Pickup Date: ' + data.pickupDate + '\n' : '') +
                (data.plan && data.plan !== 'inquiry' ? 'Plan: ' + data.plan + '\n' : '') +
                '\n' + (data.message || '');
              var orderCC = 'becomingbanks23@gmail.com,jbanks012386@yahoo.com,ecjones20@gmail.com';
              window.location.href =
                'mailto:banksfreshfarms@gmail.com' +
                '?cc=' + encodeURIComponent(orderCC) +
                '&subject=' + encodeURIComponent('[HIGH PRIORITY] ' + subject) +
                '&body=' + encodeURIComponent(body);
            }
            showFormSuccess();
          } else {
            showToast('Something went wrong. Email us at banksfreshfarms@gmail.com');
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Send Message'; }
          }
        })
        .catch(function () {
          showToast('Something went wrong. Email us at banksfreshfarms@gmail.com');
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Send Message'; }
        });
    });
  }

  var MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

  /* ─── Eggs Pack Modal ─────────────────────────────────────── */
  var packModal      = document.getElementById('packModal');
  var packModalClose = document.getElementById('packModalClose');
  var shopEggsBtn    = document.getElementById('shopEggsBtn');

  /* ─── Dozen stepper ──────────────────────────────────────── */
  var eggsQty       = 1;
  var EGG_PRICE     = 5;
  var eggsQtyEl     = document.getElementById('eggsQty');
  var eggsTotalEl   = document.getElementById('eggsStepperTotal');
  var eggsOrderBtn  = document.getElementById('eggsOrderBtn');
  var eggsQtyMinus  = document.getElementById('eggsQtyMinus');
  var eggsQtyPlus   = document.getElementById('eggsQtyPlus');

  function updateEggsStepper() {
    var total = eggsQty * EGG_PRICE;
    if (eggsQtyEl)    eggsQtyEl.textContent   = eggsQty;
    if (eggsTotalEl)  eggsTotalEl.textContent  = '$' + total + ' total';
    if (eggsOrderBtn) {
      eggsOrderBtn.textContent = 'Order Now — $' + total;
      eggsOrderBtn.setAttribute('data-order',
        eggsQty + ' dozen pasture-raised eggs · $' + total + ' one-time');
    }
  }

  if (eggsQtyMinus) {
    eggsQtyMinus.addEventListener('click', function () {
      if (eggsQty > 1) { eggsQty--; updateEggsStepper(); }
    });
  }
  if (eggsQtyPlus) {
    eggsQtyPlus.addEventListener('click', function () {
      if (eggsQty < 8) { eggsQty++; updateEggsStepper(); }
    });
  }


  function openPackModal() {
    if (!packModal) return;
    packModal.classList.add('open');
    document.body.style.overflow = 'hidden';
    eggsQty = 1;
    updateEggsStepper();
    if (window.BFF) window.BFF.loadCapacity();
  }

  function closePackModal() {
    if (!packModal) return;
    packModal.classList.remove('open');
    document.body.style.overflow = '';
  }

  if (shopEggsBtn) {
    shopEggsBtn.addEventListener('click', function (e) {
      e.preventDefault();
      openPackModal();
    });
  }

  if (packModalClose) {
    packModalClose.addEventListener('click', closePackModal);
  }

  if (packModal) {
    packModal.addEventListener('click', function (e) {
      if (e.target === packModal) closePackModal();
    });

    packModal.querySelectorAll('.pack-card-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var plan = btn.getAttribute('data-plan') || '';

        /* Solo pack notify — goes directly to contact form */
        if (plan === 'solo-notify') {
          var planInput = document.getElementById('contactPlan');
          if (planInput) { planInput.value = plan; planInput.dataset.pickupDate = ''; }
          closePackModal();
          setTimeout(function () {
            var inquiry = document.getElementById('contactInquiry');
            var message = document.getElementById('contactMessage');
            if (inquiry) {
              for (var i = 0; i < inquiry.options.length; i++) {
                if (inquiry.options[i].text === 'Poultry / Eggs Order') { inquiry.selectedIndex = i; break; }
              }
            }
            if (message) message.value = "I'd like to be notified when the Solo Pack (6 eggs · $3) becomes available.";
            var contact = document.getElementById('contact');
            if (contact) {
              var navEl2 = document.getElementById('nav');
              var off = navEl2 ? navEl2.offsetHeight : 0;
              window.scrollTo({ top: contact.getBoundingClientRect().top + window.pageYOffset - off - 16, behavior: 'smooth' });
            }
          }, 50);
          return;
        }

        /* Build cart egg item */
        var eggTotal = 0;
        var eggLabel = '';
        var eggSublabel = '';

        if (plan === 'single-dozen') {
          eggTotal = eggsQty * EGG_PRICE;
          eggLabel = eggsQty + (eggsQty === 1 ? ' Dozen' : ' Dozen') + ' Pasture-Raised Eggs';
          eggSublabel = '$5/dozen · One-Time · Pickup TBD';
        } else if (plan === 'monthly') {
          eggTotal = 20;
          eggLabel = 'Monthly Egg Share';
          eggSublabel = promoActive()
            ? '$20/mo · 5 dozen/month · +1 FREE dozen on your first pickup'
            : '$20/mo · 5 dozen/month · $4.00/dozen · Cancel anytime';
        } else {
          eggLabel = order || 'Egg order';
        }

        cart.eggs = { plan: plan, label: eggLabel, sublabel: eggSublabel,
                      total: eggTotal, pickupDate: '', pickupLabel: '', qty: eggsQty,
                      cadence: '', ack1: false, ack2: false };
        closePackModal();
        openCartDrawer();
        initDrawerCalendar();
      });
    });
  }


  /* ─── Nav (fixed) + spacer setup ─────────────────────────────────── */
  var nav       = document.getElementById('nav');
  var navSpacer = document.getElementById('navSpacer');

  function setSpacerToFullNav() {
    if (!nav || !navSpacer) return;
    var wasScrolled = nav.classList.contains('nav--scrolled');
    if (wasScrolled) nav.classList.remove('nav--scrolled');
    navSpacer.style.height = nav.offsetHeight + 'px';
    if (wasScrolled) nav.classList.add('nav--scrolled');
  }

  setSpacerToFullNav();
  updateNavBadge(); // sync badge from any cart restored out of localStorage
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(setSpacerToFullNav);
  }
  window.addEventListener('load', setSpacerToFullNav);

  var logoImg = nav && nav.querySelector('.nav-logo img');
  if (logoImg) {
    if (logoImg.complete) { setSpacerToFullNav(); }
    else { logoImg.addEventListener('load', setSpacerToFullNav); }
  }

  function syncMobileNavTop() {
    if (mobileNav && nav) mobileNav.style.top = nav.offsetHeight + 'px';
  }

  function getScrollY() {
    return Math.max(0,
      window.pageYOffset !== undefined ? window.pageYOffset :
      (document.documentElement.scrollTop || document.body.scrollTop || 0)
    );
  }

  var scrollTicking = false;

  var mobileShopBarEl = document.getElementById('mobileShopBar');
  var shopSectionEl   = document.getElementById('shop');

  function handleScroll() {
    if (!nav) return;
    var scrolled = getScrollY() > 60;
    nav.style.boxShadow = scrolled ? '0 2px 24px rgba(0,0,0,0.5)' : 'none';
    if (scrolled) {
      nav.classList.add('nav--scrolled');
    } else {
      nav.classList.remove('nav--scrolled');
      closeMobileNav();
    }
    syncMobileNavTop();

    /* Hide mobile shop bar once the shop section is in view */
    if (mobileShopBarEl && shopSectionEl) {
      var shopTop = shopSectionEl.getBoundingClientRect().top;
      if (shopTop < window.innerHeight * 0.75) {
        mobileShopBarEl.classList.add('bar--hidden');
      } else {
        mobileShopBarEl.classList.remove('bar--hidden');
      }
    }

    scrollTicking = false;
  }

  function onScroll() {
    if (!scrollTicking) {
      scrollTicking = true;
      (window.requestAnimationFrame || function (fn) { setTimeout(fn, 16); })(handleScroll);
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () {
    setSpacerToFullNav();
    handleScroll();
    if (window.innerWidth > 768) {
      var shopSection = document.querySelector('.shop-section--carousel');
      if (shopSection) shopSection.classList.remove('shop-section--carousel');
      var dotsWrap = document.querySelector('.shop-carousel-dots');
      if (dotsWrap) dotsWrap.remove();
    }
  }, { passive: true });


  /* ─── Story Photo Auto-Rotate ──────────────────────────────────── */
  var slides = document.querySelectorAll('.story-slideshow .slide');
  if (slides.length > 1) {
    var current = 0;
    setInterval(function () {
      slides[current].classList.remove('active');
      current = (current + 1) % slides.length;
      slides[current].classList.add('active');
    }, 4500);
  }


  /* ─── IntersectionObserver — Fade-in ────────────────────────────────── */
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.fade-in').forEach(function (el) {
      observer.observe(el);
    });
  } else {
    document.querySelectorAll('.fade-in').forEach(function (el) {
      el.classList.add('visible');
    });
  }

  /* ─── Shop Card Carousel (mobile) ──────────────────────────── */
  function initShopCarousel() {
    if (window.innerWidth > 768) return;
    var shopSection = document.querySelector('.shop-section');
    var shopGrid    = shopSection && shopSection.querySelector('.shop-grid');
    if (!shopGrid) return;
    if (shopSection.classList.contains('shop-section--carousel')) return;

    var cards = Array.prototype.slice.call(shopGrid.querySelectorAll('.shop-card'));
    if (cards.length < 2) return;

    shopSection.classList.add('shop-section--carousel');
    cards.forEach(function (c) { c.classList.add('visible'); });

    var idx = 0;
    var autoTimer;

    var dotsWrap = document.createElement('div');
    dotsWrap.className = 'shop-carousel-dots';
    var dots = cards.map(function (_, i) {
      var dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'shop-carousel-dot';
      dot.setAttribute('aria-label', 'Go to slide ' + (i + 1));
      dotsWrap.appendChild(dot);
      return dot;
    });
    shopGrid.insertAdjacentElement('afterend', dotsWrap);

    function updateDots(n) {
      idx = ((n % cards.length) + cards.length) % cards.length;
      dots.forEach(function (d, i) {
        d.classList.toggle('shop-carousel-dot--active', i === idx);
      });
    }

    function cardStride() {
      return cards[0] ? cards[0].offsetWidth + 16 : 0;
    }

    function goTo(n) {
      n = ((n % cards.length) + cards.length) % cards.length;
      shopGrid.scrollTo({ left: n * cardStride(), behavior: 'smooth' });
      updateDots(n);
    }

    function startAuto() {
      clearInterval(autoTimer);
      autoTimer = setInterval(function () { goTo(idx + 1); }, 3500);
    }

    /* Sync dots when user swipes natively */
    var scrollDebounce;
    shopGrid.addEventListener('scroll', function () {
      clearTimeout(scrollDebounce);
      scrollDebounce = setTimeout(function () {
        var stride = cardStride();
        if (!stride) return;
        var newIdx = Math.round(shopGrid.scrollLeft / stride);
        if (newIdx !== idx) updateDots(newIdx);
      }, 80);
    }, { passive: true });

    shopGrid.addEventListener('touchstart', function () {
      clearInterval(autoTimer);
    }, { passive: true });
    shopGrid.addEventListener('touchend', function () {
      startAuto();
    }, { passive: true });

    dots.forEach(function (dot, i) {
      dot.addEventListener('click', function () { goTo(i); startAuto(); });
    });

    updateDots(0);
    startAuto();
  }

  if (document.readyState === 'loading') {
    window.addEventListener('load', initShopCarousel);
  } else {
    initShopCarousel();
  }

  /* ─── Beef modal — inline video + cuts & prices + steppers ─── */
  var beefModal         = document.getElementById('beefModal');
  var beefModalClose    = document.getElementById('beefModalClose');
  var beefModalOrderBtn = document.getElementById('beefModalOrderBtn');
  var beefBtn           = document.getElementById('beefLearnMoreBtn');
  var beefVideo         = document.getElementById('beefVideo');
  var beefSummary       = document.getElementById('beefSummary');
  var beefSummaryLines  = document.getElementById('beefSummaryLines');
  var beefSummaryCount  = document.getElementById('beefSummaryCount');
  var beefCtaTotal      = document.getElementById('beefCtaTotal');
  var beefOrderTotalAmt = document.getElementById('beefOrderTotalAmt');

  var beefCutRows = beefModal ? Array.prototype.slice.call(
    beefModal.querySelectorAll('.beef-cut-item[data-cut]:not(.beef-cut-item--sold-out)')
  ) : [];

  function getBeefQty(row) { return parseInt(row.querySelector('.beef-stepper-qty').textContent, 10) || 0; }
  function setBeefQty(row, qty) { row.querySelector('.beef-stepper-qty').textContent = qty; }

  function updateBeefTotal() {
    var total = 0;
    var totalLbs = 0;
    var html = '';

    beefCutRows.forEach(function (row) {
      var qty   = getBeefQty(row);
      var price = parseFloat(row.getAttribute('data-price'));
      var sub   = qty * price;
      total    += sub;
      totalLbs += qty;
      if (qty > 0) {
        var name = row.querySelector('.beef-cut-name').textContent;
        html += '<li class="beef-summary-line">' +
          '<span class="beef-summary-qty">' + qty + ' lb</span>' +
          '<span class="beef-summary-name">' + name + '</span>' +
          '<span class="beef-summary-sub">$' + sub.toFixed(2) + '</span>' +
          '</li>';
      }
    });

    if (beefSummaryLines) beefSummaryLines.innerHTML = html;
    if (beefSummaryCount) beefSummaryCount.textContent = totalLbs > 0 ? totalLbs + ' lb selected' : '';
    if (beefOrderTotalAmt) beefOrderTotalAmt.textContent = '$' + total.toFixed(2);
    if (beefSummary) {
      if (total > 0) { beefSummary.classList.add('beef-summary--open'); }
      else           { beefSummary.classList.remove('beef-summary--open'); }
    }
    if (beefCtaTotal) {
      if (total > 0) { beefCtaTotal.classList.add('beef-cta-total--visible'); }
      else           { beefCtaTotal.classList.remove('beef-cta-total--visible'); }
    }
  }

  function resetBeefQty() {
    beefCutRows.forEach(function (row) { setBeefQty(row, 0); });
    updateBeefTotal();
  }

  beefCutRows.forEach(function (row) {
    var plusBtn  = row.querySelector('[data-action="plus"]');
    var minusBtn = row.querySelector('[data-action="minus"]');
    if (plusBtn) {
      plusBtn.onclick = function (e) {
        e.preventDefault(); e.stopPropagation();
        setBeefQty(row, getBeefQty(row) + 1);
        updateBeefTotal();
      };
    }
    if (minusBtn) {
      minusBtn.onclick = function (e) {
        e.preventDefault(); e.stopPropagation();
        var q = getBeefQty(row);
        if (q > 0) { setBeefQty(row, q - 1); updateBeefTotal(); }
      };
    }
  });

  function openBeefModal() {
    if (!beefModal) return;
    resetBeefQty();
    if (cart.beef.length > 0) {
      cart.beef.forEach(function (item) {
        beefCutRows.forEach(function (row) {
          if (row.querySelector('.beef-cut-name').textContent === item.name) {
            setBeefQty(row, item.qty);
          }
        });
      });
      updateBeefTotal();
    }
    beefModal.classList.add('open');
    document.body.style.overflow = 'hidden';
    if (beefVideo) {
      setTimeout(function () {
        try {
          var p = beefVideo.play();
          if (p && p.catch) p.catch(function () {});
        } catch (err) {}
      }, 50);
    }
  }

  function closeBeefModal() {
    if (!beefModal) return;
    beefModal.classList.remove('open');
    document.body.style.overflow = '';
    if (beefVideo) { beefVideo.pause(); beefVideo.currentTime = 0; }
  }

  if (beefBtn) {
    beefBtn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      openBeefModal();
    });
  }
  if (beefModalClose) beefModalClose.addEventListener('click', closeBeefModal);
  if (beefModal) {
    beefModal.addEventListener('click', function (e) {
      if (e.target === beefModal) closeBeefModal();
    });
  }

  if (beefModalOrderBtn) {
    beefModalOrderBtn.addEventListener('click', function (e) {
      e.preventDefault();
      var items = [];
      beefCutRows.forEach(function (row) {
        var qty = getBeefQty(row);
        if (qty > 0) {
          var name  = row.querySelector('.beef-cut-name').textContent;
          var price = parseFloat(row.getAttribute('data-price'));
          items.push({ name: name, qty: qty, price: price, sub: qty * price });
        }
      });

      if (items.length === 0) {
        showToast('Please select at least one cut to order.');
        return;
      }

      cart.beef = items;
      closeBeefModal();
      openCartDrawer();
    });
  }

  /* ─── Cart Drawer Event Handlers ─────────────────────────────────── */

  /* Close button + backdrop click */
  var cartDrawerCloseBtn = document.getElementById('cartDrawerClose');
  if (cartDrawerCloseBtn) cartDrawerCloseBtn.addEventListener('click', closeCartDrawer);
  if (cartBackdropEl)    cartBackdropEl.addEventListener('click', closeCartDrawer);

  /* Clear cart button */
  var cartClearBtn = document.getElementById('cartClearBtn');
  if (cartClearBtn) {
    cartClearBtn.addEventListener('click', function () {
      if (cartLineCount() === 0) return;
      if (window.confirm('Remove everything from your order?')) clearCart();
    });
  }

  /* Nav cart buttons */
  var navCartBtn    = document.getElementById('navCartBtn');
  var navCartBtnMob = document.getElementById('navCartBtnMobile');
  if (navCartBtn)    navCartBtn.addEventListener('click',    openCartDrawer);
  if (navCartBtnMob) navCartBtnMob.addEventListener('click', openCartDrawer);

  /* Escape key closes drawer */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeCartDrawer(); closeMobileNav(); closePackModal(); }
  });

  /* Item remove + pickup change — event delegation on drawer body */
  var cartDrawerBodyEl = document.getElementById('cartDrawerBody');
  if (cartDrawerBodyEl) {
    cartDrawerBodyEl.addEventListener('click', function (e) {
      var btn = e.target;

      /* Qty stepper */
      if (btn.hasAttribute('data-qty-change')) {
        var parts   = btn.getAttribute('data-qty-change').split('|');
        var cutName = parts[1];
        var delta   = parseInt(parts[2], 10);
        var item    = null;
        for (var ci = 0; ci < cart.beef.length; ci++) {
          if (cart.beef[ci].name === cutName) { item = cart.beef[ci]; break; }
        }
        if (item) {
          var newQty = item.qty + delta;
          if (newQty < 1) newQty = 1;
          item.qty = newQty;
          item.sub = +(item.qty * item.price).toFixed(2);
          /* Sync the product modal stepper if it's open */
          beefCutRows.forEach(function (row) {
            if (row.querySelector('.beef-cut-name').textContent === cutName) {
              setBeefQty(row, item.qty);
            }
          });
          updateBeefTotal();
          renderCartItems();
        }
        return;
      }

      /* Remove button */
      if (btn.hasAttribute('data-remove')) {
        var key = btn.getAttribute('data-remove');
        if (key === 'eggs') {
          cart.eggs = null;
          var pickupPan = document.getElementById('cartPickupPanel');
          if (pickupPan) pickupPan.style.display = 'none';
          drawerSelectedPickupDate = null;
          drawerPickupType = null;
        } else if (key.indexOf('beef|') === 0) {
          var cutName = key.slice(5);
          cart.beef = cart.beef.filter(function (i) { return i.name !== cutName; });
          if (cart.beef.length === 0) { cart.beefPickup = { date: '', label: '' }; cart.beefPickupLocation = 'atlanta'; }
          beefCutRows.forEach(function (row) {
            if (row.querySelector('.beef-cut-name').textContent === cutName) {
              setBeefQty(row, 0);
            }
          });
          updateBeefTotal();
        }
        if (cartLineCount() === 0) { updateNavBadge(); saveCart(); closeCartDrawer(); }
        else renderCartItems();
      }

      /* Change pickup */
      if (btn.getAttribute('data-action') === 'change-pickup') {
        if (cart.eggs) { cart.eggs.pickupDate = ''; cart.eggs.pickupLabel = ''; }
        drawerSelectedPickupDate = null;
        drawerPickupType = null;
        document.querySelectorAll('input[name="drawerPickupType"]').forEach(function (r) { r.checked = false; });
        renderCartItems();
        initDrawerCalendar();
      }
    });
  }

  /* Delivery toggle — recalculate totals on change */
  var cartDeliveryToggle = document.getElementById('cartDeliveryToggle');
  if (cartDeliveryToggle) {
    cartDeliveryToggle.addEventListener('change', function () {
      updateCartTotals();
    });
  }

  /* Place Order button */
  var cartDrawerPlaceBtn = document.getElementById('cartDrawerPlaceBtn');
  if (cartDrawerPlaceBtn) {
    cartDrawerPlaceBtn.addEventListener('click', function () {
      if (cartDrawerPlaceBtn.disabled || cartLineCount() === 0) return;

      /* Validate pickups */
      if (cart.beef.length > 0 && (!cart.beefPickup || !cart.beefPickup.date)) {
        showToast('Please select a pickup date for your beef order.');
        return;
      }
      if (cart.eggs && cart.eggs.plan === 'single-dozen' && !cart.eggs.pickupDate) {
        showToast('Please choose a pickup location and date for your eggs.');
        return;
      }
      if (cart.eggs && EGG_SUB_PLANS.indexOf(cart.eggs.plan) !== -1 && !cart.eggs.pickupDate) {
        showToast('Please select a pickup cadence and first date for your egg subscription.');
        return;
      }
      if (cart.eggs && EGG_SUB_PLANS.indexOf(cart.eggs.plan) !== -1 && (!cart.eggs.ack1 || !cart.eggs.ack2)) {
        showToast('Please accept the egg handling notes in your cart before ordering.');
        return;
      }

      var lines = [];
      if (cart.beef.length > 0 && cart.beefPickup && cart.beefPickup.date) {
        lines.push('Beef Pickup: ' + cart.beefPickup.label);
      }
      cart.beef.forEach(function (item) {
        lines.push('  ' + item.qty + ' lb — ' + item.name +
          ' @ $' + item.price.toFixed(2) + '/lb = $' + item.sub.toFixed(2));
      });
      if (cart.eggs) {
        var eggLine = cart.eggs.label;
        if (cart.eggs.pickupLabel) eggLine += ' · ' + cart.eggs.pickupLabel;
        eggLine += ' — $' + cart.eggs.total.toFixed(2);
        lines.push(eggLine);
        if (cart.eggs.freeDozen) {
          lines.push('  ** PROMO: add 1 FREE dozen to this customer\'s first pickup **');
        }
      }

      var hasBeef = cart.beef.length > 0;
      var hasEggs = !!cart.eggs;
      var inquiryType = hasBeef && hasEggs ? 'Mixed Order' :
                        hasBeef ? 'Beef Order' : 'Poultry / Eggs Order';

      var subtotal  = cartTotal();
      var delivery  = getDeliveryFee(subtotal);
      var grand     = subtotal + delivery;
      var orderText = lines.join('\n');
      if (delivery > 0) {
        orderText += '\n\nSubtotal:  $' + subtotal.toFixed(2);
        orderText += '\nDelivery:  $' + delivery.toFixed(2);
      }
      orderText += '\n\nEstimated Total: $' + grand.toFixed(2);

      var inquiry = document.getElementById('contactInquiry');
      var message = document.getElementById('contactMessage');
      var planIn  = document.getElementById('contactPlan');

      if (inquiry) {
        for (var i = 0; i < inquiry.options.length; i++) {
          if (inquiry.options[i].text === inquiryType) { inquiry.selectedIndex = i; break; }
        }
      }
      if (message) message.value = orderText;
      if (planIn) {
        planIn.value = hasEggs && cart.eggs ? (cart.eggs.plan || 'inquiry') : 'inquiry';
        planIn.dataset.pickupDate = (cart.eggs && cart.eggs.pickupDate) ? cart.eggs.pickupDate : '';
      }

      cartDrawerPlaceBtn.disabled = true;
      closeCartDrawer();
      setTimeout(function () { cartDrawerPlaceBtn.disabled = false; }, 1000);

      var contact = document.getElementById('contact');
      if (contact) {
        var navEl = document.getElementById('nav');
        var offset = navEl ? navEl.offsetHeight : 0;
        window.scrollTo({
          top: contact.getBoundingClientRect().top + window.pageYOffset - offset - 16,
          behavior: 'smooth'
        });
        setTimeout(function () { if (message) message.focus(); }, 400);
      }
    });
  }

  /* ─── Drawer Calendar (for single-dozen pickup) ───────────────────── */
  var drawerPickupType = null;
  var drawerCalViewYear, drawerCalViewMonth;
  var drawerSelectedPickupDate = null;

  function initDrawerCalendar() {
    var now = new Date();
    drawerCalViewYear  = now.getFullYear();
    drawerCalViewMonth = now.getMonth();
    drawerSelectedPickupDate = null;
    drawerPickupType = null;
    document.querySelectorAll('input[name="drawerPickupType"]').forEach(function (r) { r.checked = false; });
    var cal = document.getElementById('drawerPickupCal');
    if (cal) cal.classList.remove('pickup-cal--visible');
    var satHdr = document.getElementById('drawerCalSatHdr');
    var sunHdr = document.getElementById('drawerCalSunHdr');
    if (satHdr) satHdr.className = 'cal-sat-hdr';
    if (sunHdr) sunHdr.className = '';
    renderDrawerCalendar();
    updateDrawerCalLabel();
  }

  function renderDrawerCalendar() {
    var title  = document.getElementById('drawerCalTitle');
    var grid   = document.getElementById('drawerCalGrid');
    var prev   = document.getElementById('drawerCalPrev');
    var next   = document.getElementById('drawerCalNext');
    var label  = document.getElementById('drawerCalLabel');
    if (!title || !grid) return;

    var today = new Date(); today.setHours(0,0,0,0);

    /* Atlanta: only show pre-configured dates, no free calendar */
    if (drawerPickupType === 'atlanta') {
      var atlantaDates = window.BFF_ATLANTA_DATES || [];
      var future = atlantaDates.filter(function (s) {
        var p = s.split('-');
        return new Date(+p[0], +p[1] - 1, +p[2]) >= today;
      });

      title.textContent = 'Atlanta Pickup';
      if (prev) prev.style.display = 'none';
      if (next) next.style.display = 'none';
      grid.innerHTML = '';

      if (future.length === 0) {
        var msg = document.createElement('p');
        msg.className = 'cal-tbd-msg';
        msg.textContent = 'No Atlanta dates scheduled yet. Place your order and we\'ll reach out to confirm.';
        grid.appendChild(msg);
        if (label) { label.textContent = "We'll confirm your date after you place the order."; label.classList.remove('cal-label--set'); }
        /* Auto-set a placeholder so "Place Order" isn't blocked */
        if (cart.eggs) {
          cart.eggs.pickupDate  = 'tbd';
          cart.eggs.pickupLabel = 'City Pickup · Atlanta — date TBD';
          cart.eggs.sublabel    = cart.eggs.pickupLabel;
          renderCartItems();
        }
      } else {
        future.forEach(function (s) {
          var p    = s.split('-');
          var date = new Date(+p[0], +p[1] - 1, +p[2]);
          var isSel = drawerSelectedPickupDate &&
                      date.toDateString() === drawerSelectedPickupDate.toDateString();
          var cell = document.createElement('button');
          cell.type = 'button';
          cell.className = 'cal-atlanta-date' + (isSel ? ' cal-day--sel' : '');
          cell.textContent = MONTHS[date.getMonth()].slice(0,3) + ' ' + date.getDate() + ', ' + date.getFullYear();
          (function (captured) {
            cell.addEventListener('click', function () {
              drawerSelectedPickupDate = captured;
              if (cart.eggs) {
                var dateStr = MONTHS[captured.getMonth()] + ' ' + captured.getDate() + ', ' + captured.getFullYear();
                cart.eggs.pickupDate  = s;
                cart.eggs.pickupLabel = 'City Pickup · Atlanta · Saturday ' + dateStr;
                cart.eggs.sublabel    = cart.eggs.pickupLabel;
              }
              renderDrawerCalendar();
              renderCartItems();
            });
          })(date);
          grid.appendChild(cell);
        });
        if (label) {
          if (drawerSelectedPickupDate) {
            label.textContent = '✓ Saturday ' + MONTHS[drawerSelectedPickupDate.getMonth()] + ' ' +
              drawerSelectedPickupDate.getDate() + ', ' + drawerSelectedPickupDate.getFullYear();
            label.classList.add('cal-label--set');
          } else {
            label.textContent = 'Select an available Atlanta date';
            label.classList.remove('cal-label--set');
          }
        }
      }
      return;
    }

    /* Farm / Church — free calendar, show all applicable days */
    if (prev) prev.style.display = '';
    if (next) next.style.display = '';

    title.textContent = MONTHS[drawerCalViewMonth] + ' ' + drawerCalViewYear;
    if (prev) prev.disabled = (drawerCalViewYear === today.getFullYear() && drawerCalViewMonth === today.getMonth());

    var firstDay    = new Date(drawerCalViewYear, drawerCalViewMonth, 1).getDay();
    var daysInMonth = new Date(drawerCalViewYear, drawerCalViewMonth + 1, 0).getDate();
    grid.innerHTML = '';

    for (var e = 0; e < firstDay; e++) {
      var blank = document.createElement('div');
      blank.className = 'cal-day';
      grid.appendChild(blank);
    }

    for (var d = 1; d <= daysInMonth; d++) {
      var date        = new Date(drawerCalViewYear, drawerCalViewMonth, d);
      var dow         = date.getDay();
      var isPickupDay = drawerPickupType === 'church' ? dow === 0 : dow === 6;
      var isPast      = date < today;
      var isSel       = drawerSelectedPickupDate &&
                        date.toDateString() === drawerSelectedPickupDate.toDateString();

      var cell = document.createElement('button');
      cell.type = 'button';
      cell.textContent = d;
      cell.disabled = !isPickupDay || isPast;
      cell.className = 'cal-day' +
        (isPickupDay && !isPast ? ' cal-day--sat' : '') +
        (isSel ? ' cal-day--sel' : '');

      if (isPickupDay && !isPast) {
        (function (captured) {
          cell.addEventListener('click', function () {
            drawerSelectedPickupDate = captured;
            if (cart.eggs) {
              var dayName   = drawerPickupType === 'church' ? 'Sunday' : 'Saturday';
              var typeLabel = drawerPickupType === 'church' ? 'Church Pickup · Savannah' : 'Farm Pickup · Georgia';
              var dateStr   = MONTHS[captured.getMonth()] + ' ' + captured.getDate() + ', ' + captured.getFullYear();
              cart.eggs.pickupDate  = captured.toISOString().split('T')[0];
              cart.eggs.pickupLabel = typeLabel + ' · ' + dayName + ' ' + dateStr;
              cart.eggs.sublabel    = cart.eggs.pickupLabel;
            }
            renderDrawerCalendar();
            updateDrawerCalLabel();
            renderCartItems();
          });
        })(new Date(drawerCalViewYear, drawerCalViewMonth, d));
      }
      grid.appendChild(cell);
    }
    updateDrawerCalLabel();
  }

  function updateDrawerCalLabel() {
    var label = document.getElementById('drawerCalLabel');
    if (!label) return;
    if (drawerSelectedPickupDate) {
      var dayName = drawerPickupType === 'church' ? 'Sunday' : 'Saturday';
      label.textContent = '✓ ' + dayName + ' ' + MONTHS[drawerSelectedPickupDate.getMonth()] +
        ' ' + drawerSelectedPickupDate.getDate() + ', ' + drawerSelectedPickupDate.getFullYear();
      label.classList.add('cal-label--set');
    } else {
      label.textContent = drawerPickupType === 'church' ? 'Select a Sunday for pickup' :
                          'Select a Saturday for pickup';
      label.classList.remove('cal-label--set');
    }
  }

  document.querySelectorAll('input[name="drawerPickupType"]').forEach(function (radio) {
    radio.addEventListener('change', function () {
      drawerPickupType = radio.value;
      drawerSelectedPickupDate = null;
      var satHdr = document.getElementById('drawerCalSatHdr');
      var sunHdr = document.getElementById('drawerCalSunHdr');
      if (drawerPickupType === 'church') {
        if (satHdr) satHdr.className = '';
        if (sunHdr) sunHdr.className = 'cal-sat-hdr';
      } else {
        if (satHdr) satHdr.className = 'cal-sat-hdr';
        if (sunHdr) sunHdr.className = '';
      }
      renderDrawerCalendar();
      updateDrawerCalLabel();
      var cal = document.getElementById('drawerPickupCal');
      if (cal) cal.classList.add('pickup-cal--visible');
    });
  });

  var drawerCalPrevBtn = document.getElementById('drawerCalPrev');
  var drawerCalNextBtn = document.getElementById('drawerCalNext');
  if (drawerCalPrevBtn) {
    drawerCalPrevBtn.addEventListener('click', function () {
      drawerCalViewMonth--;
      if (drawerCalViewMonth < 0) { drawerCalViewMonth = 11; drawerCalViewYear--; }
      renderDrawerCalendar();
    });
  }
  if (drawerCalNextBtn) {
    drawerCalNextBtn.addEventListener('click', function () {
      drawerCalViewMonth++;
      if (drawerCalViewMonth > 11) { drawerCalViewMonth = 0; drawerCalViewYear++; }
      renderDrawerCalendar();
    });
  }

})();
