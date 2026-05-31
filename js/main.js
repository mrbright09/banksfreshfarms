/**
 * Banks Fresh Farms — main.js
 */

(function () {
  'use strict';

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

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeMobileNav(); closePackModal(); }
  });

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

  /* ─── Pickup Calendar ─────────────────────────────────────── */
  var MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];
  var calViewYear, calViewMonth, selectedPickupDate = null, pickupType = null;

  function renderCalendar() {
    var calTitle = document.getElementById('calTitle');
    var calGrid  = document.getElementById('calGrid');
    var calPrev  = document.getElementById('calPrev');
    var calNext  = document.getElementById('calNext');
    if (!calTitle || !calGrid) return;

    var today = new Date(); today.setHours(0, 0, 0, 0);
    calTitle.textContent = MONTHS[calViewMonth] + ' ' + calViewYear;
    if (calPrev) calPrev.disabled = (calViewYear === today.getFullYear() && calViewMonth === today.getMonth());

    var firstDay    = new Date(calViewYear, calViewMonth, 1).getDay();
    var daysInMonth = new Date(calViewYear, calViewMonth + 1, 0).getDate();
    calGrid.innerHTML = '';

    for (var e = 0; e < firstDay; e++) {
      var blank = document.createElement('div');
      blank.className = 'cal-day';
      calGrid.appendChild(blank);
    }

    for (var d = 1; d <= daysInMonth; d++) {
      var date       = new Date(calViewYear, calViewMonth, d);
      var dow        = date.getDay();
      var isPickupDay = pickupType === 'church' ? dow === 0 : dow === 6;
      var isPast     = date < today;
      var isSel      = selectedPickupDate && date.toDateString() === selectedPickupDate.toDateString();

      var cell = document.createElement('button');
      cell.type = 'button';
      cell.textContent = d;
      cell.disabled = !isPickupDay || isPast;
      cell.className = 'cal-day' +
        (isPickupDay && !isPast ? ' cal-day--sat' : '') +
        (isSel                  ? ' cal-day--sel'  : '');

      if (isPickupDay && !isPast) {
        (function (captured) {
          cell.addEventListener('click', function () {
            selectedPickupDate = captured;
            renderCalendar();
            updateCalLabel();
          });
        })(new Date(calViewYear, calViewMonth, d));
      }
      calGrid.appendChild(cell);
    }
  }

  function updateCalLabel() {
    var calLabel = document.getElementById('calLabel');
    if (!calLabel) return;
    if (selectedPickupDate) {
      var dayName = pickupType === 'church' ? 'Sunday' : 'Saturday';
      calLabel.textContent = '✓ ' + dayName + ' ' + MONTHS[selectedPickupDate.getMonth()] +
        ' ' + selectedPickupDate.getDate() + ', ' + selectedPickupDate.getFullYear();
      calLabel.classList.add('cal-label--set');
    } else {
      calLabel.textContent = pickupType === 'church' ? 'Select a Sunday for drop-off' :
                             pickupType === 'atlanta' ? 'Select a Saturday — Atlanta' :
                             'Select a Saturday — Farm Pickup';
      calLabel.classList.remove('cal-label--set');
    }
  }

  function initCalendar() {
    var now = new Date();
    calViewYear  = now.getFullYear();
    calViewMonth = now.getMonth();
    selectedPickupDate = null;
    pickupType = null;
    document.querySelectorAll('input[name="pickupType"]').forEach(function (r) { r.checked = false; });
    var pickupCal = document.getElementById('pickupCal');
    if (pickupCal) pickupCal.classList.remove('pickup-cal--visible');
    var calSatHdr = document.getElementById('calSatHdr');
    var calSunHdr = document.getElementById('calSunHdr');
    if (calSatHdr) calSatHdr.className = 'cal-sat-hdr';
    if (calSunHdr) calSunHdr.className = '';
    renderCalendar();
    updateCalLabel();
  }


  /* ─── Pickup type radios ─────────────────────────────────────── */
  document.querySelectorAll('input[name="pickupType"]').forEach(function (radio) {
    radio.addEventListener('change', function () {
      pickupType = radio.value;
      selectedPickupDate = null;
      var calSatHdr = document.getElementById('calSatHdr');
      var calSunHdr = document.getElementById('calSunHdr');
      if (pickupType === 'church') {
        if (calSatHdr) calSatHdr.className = '';
        if (calSunHdr) calSunHdr.className = 'cal-sat-hdr';
      } else {
        if (calSatHdr) calSatHdr.className = 'cal-sat-hdr';
        if (calSunHdr) calSunHdr.className = '';
      }
      renderCalendar();
      updateCalLabel();
      var pickupCal = document.getElementById('pickupCal');
      if (pickupCal) pickupCal.classList.add('pickup-cal--visible');
    });
  });

  var calPrevBtn = document.getElementById('calPrev');
  var calNextBtn = document.getElementById('calNext');
  if (calPrevBtn) {
    calPrevBtn.addEventListener('click', function () {
      calViewMonth--;
      if (calViewMonth < 0) { calViewMonth = 11; calViewYear--; }
      renderCalendar();
    });
  }
  if (calNextBtn) {
    calNextBtn.addEventListener('click', function () {
      calViewMonth++;
      if (calViewMonth > 11) { calViewMonth = 0; calViewYear++; }
      renderCalendar();
    });
  }

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
      eggsQty++;
      updateEggsStepper();
    });
  }

  /* Pre-handler: validate pickup type + date, build order string before generic handler reads it */
  if (eggsOrderBtn) {
    eggsOrderBtn.addEventListener('click', function (e) {
      if (!pickupType) {
        showToast('Please choose a pickup option first.');
        e.stopImmediatePropagation();
        return;
      }
      if (!selectedPickupDate) {
        showToast('Please select a date for your pickup.');
        e.stopImmediatePropagation();
        return;
      }
      var total     = eggsQty * EGG_PRICE;
      var dayName   = pickupType === 'church' ? 'Sunday' : 'Saturday';
      var typeLabel = pickupType === 'farm'    ? 'Farm Pickup · Georgia' :
                      pickupType === 'church'  ? 'Church Drop-off · Savannah GA' :
                                                 'City Pickup · Atlanta GA';
      var dateStr   = MONTHS[selectedPickupDate.getMonth()] + ' ' +
                      selectedPickupDate.getDate() + ', ' + selectedPickupDate.getFullYear();
      eggsOrderBtn.setAttribute('data-order',
        eggsQty + ' dozen pasture-raised eggs · $' + total + ' · ' +
        typeLabel + ' · ' + dayName + ' ' + dateStr);
    });
  }

  function openPackModal() {
    if (!packModal) return;
    packModal.classList.add('open');
    document.body.style.overflow = 'hidden';
    eggsQty = 1;
    updateEggsStepper();
    var pickupSec = document.getElementById('pickupSection');
    var tog       = document.getElementById('pickupToggle');
    if (pickupSec) pickupSec.classList.remove('pickup-section--open');
    if (tog)       tog.classList.remove('pickup-toggle--open');
    if (tog && pickupSec) {
      tog.onclick = function (e) {
        e.stopPropagation();
        var isOpen = pickupSec.classList.toggle('pickup-section--open');
        tog.classList.toggle('pickup-toggle--open', isOpen);
      };
    }
    initCalendar();
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
        var order        = btn.getAttribute('data-order');
        var requiresDate = btn.getAttribute('data-requires-date') === 'true';

        if (requiresDate && !selectedPickupDate) {
          showToast('Please select a Saturday for pickup before placing your order.');
          return;
        }

        var fullOrder = order || '';
        if (requiresDate && selectedPickupDate) {
          fullOrder += ' · Pickup: Saturday ' + MONTHS[selectedPickupDate.getMonth()] +
            ' ' + selectedPickupDate.getDate() + ', ' + selectedPickupDate.getFullYear();
        }

        var planInput = document.getElementById('contactPlan');
        if (planInput) {
          planInput.value = btn.getAttribute('data-plan') || '';
          planInput.dataset.pickupDate = (requiresDate && selectedPickupDate)
            ? selectedPickupDate.toISOString().split('T')[0] : '';
        }

        closePackModal();

        setTimeout(function () {
          if (fullOrder) {
            var inquiry = document.getElementById('contactInquiry');
            var message = document.getElementById('contactMessage');
            if (inquiry) {
              for (var i = 0; i < inquiry.options.length; i++) {
                if (inquiry.options[i].text === 'Poultry / Eggs Order') {
                  inquiry.selectedIndex = i;
                  break;
                }
              }
            }
            if (message) {
              message.value = "I'd like to order: " + fullOrder;
            }
          }

          var contact = document.getElementById('contact');
          if (contact) {
            var navEl2 = document.getElementById('nav');
            var navOffset = navEl2 ? navEl2.offsetHeight : 0;
            var top  = contact.getBoundingClientRect().top + window.pageYOffset - navOffset - 16;
            window.scrollTo({ top: top, behavior: 'smooth' });
          }

          var msg = document.getElementById('contactMessage');
          if (msg) { setTimeout(function () { msg.focus(); }, 400); }
        }, 50);
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
  var beefOrderTotal    = document.getElementById('beefOrderTotal');
  var beefOrderTotalAmt = document.getElementById('beefOrderTotalAmt');

  var beefCutRows = beefModal ? Array.prototype.slice.call(
    beefModal.querySelectorAll('.beef-cut-item[data-cut]')
  ) : [];

  function getBeefQty(row) { return parseInt(row.querySelector('.beef-stepper-qty').textContent, 10) || 0; }
  function setBeefQty(row, qty) { row.querySelector('.beef-stepper-qty').textContent = qty; }

  function updateBeefTotal() {
    var total = 0;
    beefCutRows.forEach(function (row) {
      total += getBeefQty(row) * parseFloat(row.getAttribute('data-price'));
    });
    if (beefOrderTotal) beefOrderTotal.style.display = total > 0 ? 'flex' : 'none';
    if (beefOrderTotalAmt) beefOrderTotalAmt.textContent = '$' + total.toFixed(2);
  }

  function resetBeefQty() {
    beefCutRows.forEach(function (row) { setBeefQty(row, 0); });
    updateBeefTotal();
  }

  beefCutRows.forEach(function (row) {
    row.querySelector('[data-action="plus"]').addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      setBeefQty(row, getBeefQty(row) + 1);
      updateBeefTotal();
    });
    row.querySelector('[data-action="minus"]').addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      var q = getBeefQty(row);
      if (q > 0) { setBeefQty(row, q - 1); updateBeefTotal(); }
    });
  });

  function openBeefModal() {
    if (!beefModal) return;
    resetBeefQty();
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
      var lines = [];
      var total = 0;
      beefCutRows.forEach(function (row) {
        var qty = getBeefQty(row);
        if (qty > 0) {
          var name  = row.querySelector('.beef-cut-name').textContent;
          var price = parseFloat(row.getAttribute('data-price'));
          var sub   = qty * price;
          total += sub;
          lines.push(qty + ' lb — ' + name + ' @ $' + price.toFixed(2) + '/lb = $' + sub.toFixed(2));
        }
      });

      if (lines.length === 0) {
        showToast('Please select at least one cut to order.');
        return;
      }

      var orderText = 'BEEF ORDER\n' + lines.join('\n') + '\n\nEstimated Total: $' + total.toFixed(2);

      closeBeefModal();

      var inquiry  = document.getElementById('contactInquiry');
      var message  = document.getElementById('contactMessage');
      var planIn   = document.getElementById('contactPlan');

      if (inquiry) inquiry.value = 'Beef Order';
      if (message) message.value = orderText;
      if (planIn)  { planIn.value = orderText; planIn.dataset.beefOrder = 'true'; }

      var contact = document.getElementById('contact');
      if (contact) {
        setTimeout(function () {
          var navEl  = document.getElementById('nav');
          var offset = navEl ? navEl.offsetHeight : 0;
          window.scrollTo({ top: contact.getBoundingClientRect().top + window.pageYOffset - offset - 16, behavior: 'smooth' });
          setTimeout(function () { if (message) message.focus(); }, 400);
        }, 50);
      }
    });
  }

})();
