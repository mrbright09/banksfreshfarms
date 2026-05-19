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

  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      var fields = contactForm.querySelectorAll('input[required], select[required], textarea[required]');
      var allFilled = true;
      fields.forEach(function (field) {
        if (!field.value.trim()) allFilled = false;
      });
      if (!allFilled) {
        e.preventDefault();
        showToast('Almost there! We just need all your info so the Banks family can get back to you.');
      }
    });
  }

  /* ─── Pickup Calendar ─────────────────────────────────────── */
  var MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];
  var calViewYear, calViewMonth, selectedPickupDate = null;

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
      var date   = new Date(calViewYear, calViewMonth, d);
      var isSat  = date.getDay() === 6;
      var isPast = date < today;
      var isSel  = selectedPickupDate && date.toDateString() === selectedPickupDate.toDateString();

      var cell = document.createElement('button');
      cell.type = 'button';
      cell.textContent = d;
      cell.disabled = !isSat || isPast;
      cell.className = 'cal-day' +
        (isSat && !isPast ? ' cal-day--sat' : '') +
        (isSel            ? ' cal-day--sel'  : '');

      if (isSat && !isPast) {
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
      calLabel.textContent = '✓ Pickup: ' + MONTHS[selectedPickupDate.getMonth()] +
        ' ' + selectedPickupDate.getDate() + ', ' + selectedPickupDate.getFullYear();
      calLabel.classList.add('cal-label--set');
    } else {
      calLabel.textContent = 'Select a Saturday for pickup';
      calLabel.classList.remove('cal-label--set');
    }
  }

  function initCalendar() {
    var now = new Date();
    calViewYear  = now.getFullYear();
    calViewMonth = now.getMonth();
    selectedPickupDate = null;
    renderCalendar();
    updateCalLabel();
  }

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

  function openPackModal() {
    if (!packModal) return;
    packModal.classList.add('open');
    document.body.style.overflow = 'hidden';
    initCalendar();
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
            var navH = nav ? nav.offsetHeight : 0;
            var top  = contact.getBoundingClientRect().top + window.pageYOffset - navH - 16;
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
    // Temporarily remove nav--scrolled so we measure the full nav height
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
    if (logoImg.complete) {
      setSpacerToFullNav();
    } else {
      logoImg.addEventListener('load', setSpacerToFullNav);
    }
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

  /* ─── Mobile Bottom Nav — active section highlight ───────── */
  var mbnItems = document.querySelectorAll('.mbn-item');

  function setMbnActive(sectionId) {
    mbnItems.forEach(function (item) {
      item.classList.toggle('mbn-active', item.getAttribute('data-section') === sectionId);
    });
  }

  if (mbnItems.length && 'IntersectionObserver' in window) {
    var sectionIds = ['home', 'story', 'shop', 'contact'];
    var sectionVisible = {};

    var mbnObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        sectionVisible[entry.target.id] = entry.isIntersecting;
      });
      for (var i = sectionIds.length - 1; i >= 0; i--) {
        if (sectionVisible[sectionIds[i]]) {
          setMbnActive(sectionIds[i]);
          break;
        }
      }
    }, { threshold: 0.25 });

    sectionIds.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) mbnObserver.observe(el);
    });
  }

  setMbnActive('home');

})();
