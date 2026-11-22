// Helper Utilities - Thư viện tiện ích dùng chung
(function () {
    'use strict';
    const app = window.GiftApp;

    // Chống mã độc XSS
    app.escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
    // Chuẩn hóa tiếng Việt 
    app.normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
    // Định dạng tiền tệ
    app.money = value => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
    // Nhãn ngân sách
    app.budgetLabel = budget => {
        if (budget.max === 299999 && !budget.min) return 'Dưới ' + app.money(300000);
        if (budget.min === 1000001 && !budget.max) return 'Trên ' + app.money(1000000);
        if (budget.min && budget.max) return app.money(budget.min) + '-' + app.money(budget.max);
        if (budget.max) return 'Tối đa ' + app.money(budget.max);
        if (budget.min) return 'Từ ' + app.money(budget.min);
        return 'Linh hoạt';
    };
    // Sinh mã định danh (id)
    app.id = prefix => `${prefix}_${globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2)}`;
    // Lưu trữ an toàn trên trình duyệt
    app.storage = {
      get(key, fallback) { try { const result = JSON.parse(localStorage.getItem(app.config.storagePrefix + key)); return result ?? fallback; } catch { return fallback; } },
      set(key, value) { try { localStorage.setItem(app.config.storagePrefix + key, JSON.stringify(value)); return true; } catch { return false; } }
    };
    // Kiểm tra liên kết an toàn - Chỉ chấp nhận https://
    app.safeURL = value => {
        try {
            const url = new URL(value);
            return url.protocol === 'https:' ? url.href : '';
        }
        catch { return ''; }
    };
    // Cuộn trang thông minh
    app.scrollTo = element => element?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block:'start' });
    let timer;
    app.toast = message => {
        const el = document.getElementById('toast');
        el.textContent = message;
        el.hidden = false; clearTimeout(timer);
        timer = setTimeout(() => { el.hidden = true; }, 4200);
    };
  })();
  