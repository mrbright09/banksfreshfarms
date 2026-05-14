/**
 * Banks Fresh Farms — main.js
 */

(function () {
  'use strict';

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
      if (mobileNav.classList.contains('open')) { closeMobileNav(); } else { openMobileNav(); }
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeMobileNav();
  });

  var nav       = document.getElementById('nav');
  var navSpacer = document.getElementById('navSpacer');

  function setSpacerToFullNav() {
    if (!nav || !navSpacer) return;
    navSpacer.style.height = nav.offsetHeight + 'px';
  }

  setSpacerToFullNav();
  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(setSpacerToFullNav); }
  window.addEventListener('load', setSpacerToFullNav);

  var logoImg = nav && nav.querySelector('.nav-logo img');
  if (logoImg) {
    if (logoImg.complete) { setSpacerToFullNav(); } else { logoImg.addEventListener('load', setSpacerToFullNav); }
  }

  function syncMobileNavTop() {
    if (mobileNav && nav) mobileNav.style.top = nav.offsetHeight + 'px';
  }

  var lastScrollY = 0;
  var scrollTicking = false;

  function getScrollY() {
    return Math.max(0, window.pageYOffset !== undefined ? window.pageYOffset :
      (document.documentElement.scrollTop || document.body.scrollTop || 0));
  }

  function handleScroll() {
    if (!nav) return;
    var scrollY = getScrollY();
    nav.style.boxShadow = scrollY > 60 ? '0 2px 24px rgba(0,0,0,0.5)' : 'none';
    if (scrollY > lastScrollY && scrollY > 80) {
      nav.classList.add('nav--hidden');
      if (mobileNav) mobileNav.classList.remove('open');
    } else {
      nav.classList.remove('nav--hidden');
    }
    lastScrollY = scrollY;
    syncMobileNavTop();
    scrollTicking = false;
  }

  function onScrollEvent() {
    if (!scrollTicking) {
      scrollTicking = true;
      (window.requestAnimationFrame || function (fn) { setTimeout(fn, 16); })(handleScroll);
    }
  }

  window.addEventListener('scroll', onScrollEvent, { passive: true });
  document.addEventListener('scroll', onScrollEvent, { passive: true });
  window.addEventListener('resize', function () { setSpacerToFullNav(); handleScroll(); }, { passive: true });

  var slides = document.querySelectorAll('.story-slideshow .slide');
  if (slides.length > 1) {
    var current = 0;
    setInterval(function () {
      slides[current].classList.remove('active');
      current = (current + 1) % slides.length;
      slides[current].classList.add('active');
    }, 4500);
  }

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.fade-in').forEach(function (el) { observer.observe(el); });
  } else {
    document.querySelectorAll('.fade-in').forEach(function (el) { el.classList.add('visible'); });
  }

})();
