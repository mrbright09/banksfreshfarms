/**
 * Banks Fresh Farms — main.js
 * Behaviors: smooth scroll, mobile nav, scroll shrink,
 *            IntersectionObserver fade-in, active nav link
 */

(function () {
  'use strict';

  /* ─── DOM References ─────────────────────────────────────── */
  const navbar      = document.getElementById('navbar');
  const hamburger   = document.getElementById('hamburger');
  const navOverlay  = document.getElementById('navOverlay');
  const navClose    = document.getElementById('navClose');
  const navLinks    = document.querySelectorAll('.nav-link');
  const overlayLinks = document.querySelectorAll('.nav-overlay-link');
  const sections    = document.querySelectorAll('section[id], div[id="home"]');

  /* ─── 1. Smooth Scroll ───────────────────────────────────── */
  // CSS `scroll-behavior: smooth` handles anchor scrolling globally.
  // This JS layer ensures offset accounts for the sticky nav height.
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (!targetId || targetId === '#') return;

      const target = document.querySelector(targetId);
      if (!target) return;

      e.preventDefault();

      const navH = parseInt(
        getComputedStyle(document.documentElement).getPropertyValue('--nav-height'),
        10
      ) || 76;

      const top = target.getBoundingClientRect().top + window.scrollY - navH + 1;

      window.scrollTo({ top: top, behavior: 'smooth' });
    });
  });


  /* ─── 2. Mobile Nav — Hamburger Toggle ──────────────────── */
  function openNav() {
    navOverlay.classList.add('open');
    navOverlay.setAttribute('aria-hidden', 'false');
    hamburger.classList.add('open');
    hamburger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeNav() {
    navOverlay.classList.remove('open');
    navOverlay.setAttribute('aria-hidden', 'true');
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  hamburger.addEventListener('click', function () {
    if (navOverlay.classList.contains('open')) {
      closeNav();
    } else {
      openNav();
    }
  });

  navClose.addEventListener('click', closeNav);

  // Close overlay when an overlay link is clicked
  overlayLinks.forEach(function (link) {
    link.addEventListener('click', closeNav);
  });

  // Close on Escape key
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && navOverlay.classList.contains('open')) {
      closeNav();
    }
  });


  /* ─── 3. Scroll Shrink — Add .scrolled after 80px ───────── */
  function handleNavScroll() {
    if (window.scrollY > 80) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }

  window.addEventListener('scroll', handleNavScroll, { passive: true });
  handleNavScroll(); // run once on load


  /* ─── 4. IntersectionObserver — Fade-in on Scroll ───────── */
  // Targets elements with class .scroll-fade
  // CSS defines: opacity 0 → 1, translateY(30px) → 0
  if ('IntersectionObserver' in window) {
    const fadeObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            fadeObserver.unobserve(entry.target); // animate once
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    document.querySelectorAll('.scroll-fade').forEach(function (el) {
      fadeObserver.observe(el);
    });
  } else {
    // Fallback: show all elements immediately if IntersectionObserver unsupported
    document.querySelectorAll('.scroll-fade').forEach(function (el) {
      el.classList.add('visible');
    });
  }


  /* ─── 5. Active Nav Link — Highlight on Scroll ──────────── */
  const sectionIds = ['home', 'story', 'shop', 'merch', 'values', 'contact'];

  function getActiveSection() {
    const navH = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--nav-height'),
      10
    ) || 76;

    const scrollMid = window.scrollY + navH + 80;

    let active = sectionIds[0];

    sectionIds.forEach(function (id) {
      const el = document.getElementById(id);
      if (el && el.offsetTop <= scrollMid) {
        active = id;
      }
    });

    return active;
  }

  function updateActiveNav() {
    const activeId = getActiveSection();
    navLinks.forEach(function (link) {
      const href = link.getAttribute('href');
      if (href === '#' + activeId) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  window.addEventListener('scroll', updateActiveNav, { passive: true });
  updateActiveNav(); // run once on load

})();
