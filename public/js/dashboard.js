/* Utunyange School - dashboard shell (mobile sidebar, confirmations) */
(function () {
  'use strict';

  /* Ask before risky actions: <form data-confirm="Delete this?"> (no inline scripts: CSP-safe) */
  document.addEventListener('submit', function (e) {
    var msg = e.target && e.target.getAttribute && e.target.getAttribute('data-confirm');
    if (msg && !window.confirm(msg)) e.preventDefault();
  });

  /* Select-on-click for one-time passwords shown in the green message */
  var flash = document.querySelector('.flash-success');
  if (flash) {
    flash.addEventListener('dblclick', function () {
      var sel = window.getSelection();
      var range = document.createRange();
      range.selectNodeContents(flash.querySelector('span') || flash);
      sel.removeAllRanges();
      sel.addRange(range);
    });
  }

  var burger = document.getElementById('dashBurger');
  var sidebar = document.getElementById('sidebar');
  var backdrop = document.getElementById('dashBackdrop');
  if (!burger || !sidebar) return;

  function setOpen(open) {
    sidebar.classList.toggle('is-open', open);
    if (backdrop) backdrop.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
  }
  burger.addEventListener('click', function () { setOpen(!sidebar.classList.contains('is-open')); });
  if (backdrop) backdrop.addEventListener('click', function () { setOpen(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
  window.addEventListener('resize', function () { if (window.innerWidth > 960) setOpen(false); });
})();
