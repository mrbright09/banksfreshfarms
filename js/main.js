/**
 * Banks Fresh Farms — main.js
 */

(function () {
  'use strict';

  /* ─── Smooth Scroll ─────────────────────────────────────────── */
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

      // Close mobile nav if open
      closeMobileNav();
    });
  });


  /* ─── Mobile Nav Toggle ─────────────────────────────────────── */
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

  // Close on Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeMobileNav();
  });


  /* ─── Nav scroll shrink ─────────────────────────────────────── */
  var nav = document.getElementById('nav');

  function handleScroll() {
    if (nav) {
      if (window.scrollY > 60) {
        nav.style.boxShadow = '0 2px 24px rgba(0,0,0,0.5)';
      } else {
        nav.style.boxShadow = 'none';
      }
    }
  }

  window.addEventListener('scroll', handleScroll, { passive: true });


  /* ─── IntersectionObserver — Fade-in ────────────────────────── */
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

})();
