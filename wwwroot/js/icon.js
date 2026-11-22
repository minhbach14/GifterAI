/* SVG icons use currentColor, no external icon library needed. */
(function () {
    'use strict';
    const paths = {
      'arrow-right': '<path d="M4 12h16m-6-6 6 6-6 6"/>',
      'arrow-left': '<path d="M20 12H4m6-6-6 6 6 6"/>',
      external: '<path d="M14 3h7v7m0-7L10 14M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"/>',
      gift: '<rect x="3" y="8" width="18" height="5" rx="1"/><path d="M5 13v8h14v-8M12 8v13"/><path d="M12 8C1 9 5-4 12 8c7-12 11 1 0 0Z"/>',
      sparkles: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3ZM21 2v4m-2-2h4M3 18v4m-2-2h4"/>',
      pen: '<path d="m16 3 5 5-12 12-6 1 1-6L16 3Zm-2 2 5 5"/>',
      sliders: '<path d="M4 5h7m4 0h5M4 12h2m4 0h10M4 19h10m4 0h2M11 2v6M6 9v6m8 1v6"/>',
      heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
      chat: '<path d="M21 11.5a9 9 0 0 1-9.5 9 9 9 0 0 1-4-1L3 21l1.5-4.5a9 9 0 1 1 16.5-5Z"/><path d="M8 10h8m-8 4h5"/>',
      menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
      close: '<path d="m6 6 12 12M6 18 18 6"/>',
      check: '<path d="m5 12 4 4L19 6"/>',
      'thumb-up': '<path d="M7 10 11 2c3 0 3 3 2 7h6a2 2 0 0 1 2 2l-2 9H7M3 10h4v11H3z"/>',
      'thumb-down': '<path d="m7 14 4 8c3 0 3-3 2-7h6a2 2 0 0 0 2-2l-2-9H7M3 3h4v11H3z"/>',
      cloud: '<path d="M6 18a5 5 0 0 1-1-9.9A7 7 0 0 1 18 7a5.5 5.5 0 0 1 0 11H6Z"/>',
      bookmark: '<path d="M6 3h12v18l-6-4-6 4V3Z"/>',
      clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
    };

    window.GiftApp = window.GiftApp || {};
    window.GiftApp.icon = name =>
        `<svg 
            class="icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
            focusable="false"
        >${paths[name] || paths.gift}</svg>`;

    // Hàm quét icon
    window.GiftApp.hydrateIcons = (root = document) => {
        root.querySelectorAll('[data-icon]').forEach(el => {
            el.innerHTML = window.GiftApp.icon(el.dataset.icon);
        });
    };

    // Tự động chạy hàm quét ngay khi trang tải xong
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => window.GiftApp.hydrateIcons());
    } else {
        window.GiftApp.hydrateIcons();
    }
})();