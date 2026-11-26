/* Reusable header: include #header-container and this script on other pages. */
(function () {
    'use strict';
    const app = window.GiftApp;
    const container = document.getElementById('header-container');
    if (!container) return;
    container.innerHTML = `<header class="site-header" id="site-header"><div class="header-inner">
      <a href="index.html" class="brand" aria-label="GIFTER — Trang chủ"><img src="assets/images/logo.svg" alt="" width="42" height="42"><span>Gifter<span class="brand-dot">.</span><small>GIFTS WITH A LITTLE THOUGHT</small></span></a>
        <button type="button" id="menu-toggle"
        class="menu-toggle" aria-controls="header-menu"
        aria-expanded="false" aria-label="Mở menu">${app.icon('menu')}</button>
      <div class="header-menu" id="header-menu">
        <nav class="main-nav" aria-label="Điều hướng chính">
          <a href="#how-it-works">Cách hoạt động</a>
          <a href="#find-a-gift" class="active" aria-current="page">Tìm quà ${app.icon('sparkles')}</a>
          <button type="button" data-open-pricing>Chi phí</button>
        </nav>
        <div class="auth-actions">
          <button type="button" class="login-link" data-auth="login">Đăng nhập</button>
          <button type="button" class="button button-small" data-auth="signup">Đăng ký ${app.icon('arrow-right')}</button>
        </div>
      </div>
    </div></header>`;
    const toggle=document.getElementById('menu-toggle');
    const menu=document.getElementById('header-menu');
    const header=document.getElementById('site-header');
    function closeMenu(returnFocus=false) { toggle.setAttribute('aria-expanded', 'false'); menu.classList.remove('is-open'); toggle.setAttribute('aria-label', 'Mở menu'); toggle.innerHTML = app.icon('menu'); if (returnFocus) toggle.focus(); }
    toggle.addEventListener('click', () => { const open = toggle.getAttribute('aria-expanded') !== 'true'; toggle.setAttribute('aria-expanded', String(open)); toggle.setAttribute('aria-label', open ? 'Đóng menu' : 'Mở menu'); menu.classList.toggle('is-open', open); toggle.innerHTML = app.icon(open ? 'close' : 'menu');});
    menu.addEventListener('click', event => { if(event.target.closest('a, button'))closeMenu(); });
    // composedPath survives replacement of the SVG inside the menu button.
    document.addEventListener('click', event => { if(!event.composedPath().includes(header))closeMenu(); });
    document.addEventListener('keydown', event => { if(event.key==='Escape' && menu.classList.contains('is-open'))closeMenu(true); });
    matchMedia('(min-width: 981px)').addEventListener('change', event => { if(event.matches)closeMenu(); });
    const onScroll=() => header.classList.toggle('scrolled',scrollY>16);
    addEventListener('scroll',onScroll,{passive:true}); onScroll();
    document.querySelectorAll('[data-auth]').forEach(button => button.addEventListener('click', () => document.dispatchEvent(new CustomEvent('open-auth',{detail:button.dataset.auth}))));
    document.querySelector('[data-open-pricing]')?.addEventListener('click', () => document.getElementById('pricing-dialog')?.showModal());
  })();
  