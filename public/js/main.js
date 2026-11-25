/* =========================================================
   Utunyange School - public site interactions
   ========================================================= */
(function () {
  'use strict';

  document.documentElement.classList.add('js');

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Sticky header shadow + back-to-top ---------- */
  var header = $('#siteHeader');
  var toTop = $('#backToTop');
  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    if (header) header.classList.toggle('is-stuck', y > 10);
    if (toTop) toTop.classList.toggle('is-visible', y > 600);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  if (toTop) toTop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  });

  /* ---------- Mobile menu ---------- */
  var toggle = $('#navToggle');
  var menu = $('#navMenu');
  function setMenu(open) {
    if (!toggle || !menu) return;
    menu.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      setMenu(toggle.getAttribute('aria-expanded') !== 'true');
    });
    $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
    window.addEventListener('resize', function () { if (window.innerWidth > 920) setMenu(false); });
  }

  /* ---------- Active nav link on scroll ---------- */
  var navLinks = $$('.nav-links a');
  var sections = navLinks
    .map(function (a) {
      var id = (a.getAttribute('href') || '').replace('/#', '');
      var el = id ? document.getElementById(id) : null;
      return el ? { link: a, el: el } : null;
    })
    .filter(Boolean);

  if ('IntersectionObserver' in window && sections.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (l) { l.classList.remove('active'); });
        var match = sections.filter(function (s) { return s.el === entry.target; })[0];
        if (match) match.link.classList.add('active');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { spy.observe(s.el); });
  }

  /* ---------- Scroll reveal ---------- */
  var revealEls = $$('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- Animated counters ---------- */
  function animateCount(el) {
    var target = parseInt(el.getAttribute('data-count'), 10) || 0;
    if (reduceMotion) { el.textContent = target.toLocaleString(); return; }
    var duration = 1600;
    var start = null;
    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased).toLocaleString();
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var counters = $$('[data-count]');
  if ('IntersectionObserver' in window) {
    var cio = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { animateCount(entry.target); obs.unobserve(entry.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (c) { cio.observe(c); });
  } else {
    counters.forEach(function (c) { c.textContent = c.getAttribute('data-count'); });
  }

  /* ---------- Testimonials slider ---------- */
  var slider = $('#testimonials-slider');
  if (slider) {
    var slides = $$('.t-slide', slider);
    var dots = $$('.t-dot', slider);
    var current = 0;
    var timer = null;

    var show = function (i) {
      current = (i + slides.length) % slides.length;
      slides.forEach(function (s, n) { s.classList.toggle('is-active', n === current); });
      dots.forEach(function (d, n) { d.classList.toggle('is-active', n === current); });
    };
    var start = function () {
      if (reduceMotion || slides.length < 2) return;
      stop();
      timer = setInterval(function () { show(current + 1); }, 6500);
    };
    var stop = function () { if (timer) { clearInterval(timer); timer = null; } };

    dots.forEach(function (d) {
      d.addEventListener('click', function () { show(parseInt(d.getAttribute('data-index'), 10)); start(); });
    });
    slider.addEventListener('mouseenter', stop);
    slider.addEventListener('mouseleave', start);
    start();
  }

  /* ---------- Contact form ---------- */
  var form = $('#contactForm');
  var statusEl = $('#formStatus');
  if (form && statusEl) {
    var setStatus = function (msg, type) {
      statusEl.textContent = msg;
      statusEl.className = 'form-status' + (type ? ' is-' + type : '');
    };

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = typeof v === 'string' ? v.trim() : v; });

      // Client-side validation
      var ok = true;
      $$('.field', form).forEach(function (f) { f.classList.remove('has-error'); });
      var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email || '');
      [['name', (data.name || '').length >= 2], ['email', emailOk], ['message', (data.message || '').length >= 10]]
        .forEach(function (pair) {
          if (!pair[1]) {
            ok = false;
            var input = form.elements[pair[0]];
            if (input && input.closest) input.closest('.field').classList.add('has-error');
          }
        });
      if (!ok) {
        setStatus('Please complete the highlighted fields (message needs at least 10 characters).', 'error');
        return;
      }

      var btn = $('button[type="submit"]', form);
      var label = $('.btn-label', btn);
      var original = label ? label.textContent : '';
      btn.disabled = true;
      if (label) label.textContent = 'Sending...';
      setStatus('', '');

      fetch('/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(data)
      })
        .then(function (res) { return res.json().then(function (j) { return { ok: res.ok, body: j }; }); })
        .then(function (r) {
          if (r.ok && r.body.success) {
            form.reset();
            setStatus(r.body.message, 'success');
          } else {
            setStatus((r.body && r.body.message) || 'Something went wrong. Please try again.', 'error');
          }
        })
        .catch(function () {
          setStatus('Network error. Please check your connection and try again.', 'error');
        })
        .then(function () {
          btn.disabled = false;
          if (label) label.textContent = original;
        });
    });
  }
})();
