// IIFE
(function () {
    'use strict';
    const app = window.GiftApp, $ = id => document.getElementById(id), esc = app.escapeHTML;
    
    /* Backend: Xóa app.storage.get('saved'), sau này tải danh sách quà yêu thích (Wishlist) của User từ SQL Server */
    const initialSaved = app.storage.get('saved', [])
    const state = {
        mode: 'describe',
        busy: false,
        conversationId: app.id('conversation'),
        profile: null,
        products: [],
        questions: [],
        filters: {},
        /* Backend: Khởi tạo Set rỗng hoặc nạp danh sách ProductId đã lưu từ API/Server */
        saved: new Set(Array.isArray(initialSaved) ? initialSaved : []),
        messages: [],
        requestId: null
    };
    
    // Sample Prompt
    const examples = {
        mom: 'Mình muốn tặng quà sinh nhật cho mẹ, 55 tuổi. Mẹ thích làm vườn, uống trà và thư giãn ở nhà. Ngân sách dưới 500k.',
        partner: 'Tìm quà kỷ niệm cho người yêu, 25 tuổi. Bạn ấy thích âm nhạc, đọc sách và những món quà có ý nghĩa. Ngân sách 700k.',
        friend: 'Mình muốn tặng quà tốt nghiệp cho bạn thân, 22 tuổi, thích viết nhật ký và những món đồ sáng tạo. Ngân sách dưới 300k.'
    };

    /* Backend: Xóa biến này nếu chuyển sang trang riêng /Account/Login và /Account/Register */
    let toastAuthMode = 'login';

    // Switch Describe / Guide composer
    function switchTab(mode, focus = false) {
        state.mode = mode;
        for (const name of ['describe', 'guide']) {
            const active = name === mode;
            $('tab-' + name).classList.toggle('active', active);
            $('tab-' + name).setAttribute('aria-selected', String(active));
            $('tab-' + name).tabIndex = active ? 0 : -1;
            $('panel-' + name).hidden = !active;
        }
        $('form-error').hidden = true;
        if (focus) $('tab-' + mode).focus();
    }
    ['describe', 'guide'].forEach(mode => {
        $('tab-' + mode).addEventListener('click', () => switchTab(mode));
        $('tab-' + mode).addEventListener('keydown', event => {
            if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
                event.preventDefault();
                switchTab(event.key === 'Home' ? 'describe' : event.key === 'End' ? 'guide' : mode === 'describe' ? 'guide' : 'describe', true
                );
            }
        });
    });

    // Điền gợi ý mẫu (Quà cho mẹ/ người yêu/ bạn bè)
    document.querySelectorAll('[data-example]').forEach(button => button.addEventListener('click', () => {
        if (state.busy) return;
        switchTab('describe');
        $('gift-prompt').value = examples[button.dataset.example];
        $('gift-prompt').focus();
    }));
    function busy(value, kind = 'find') {
        state.busy = value;
        $('find-gifts').disabled = value;
        $('refine-button').disabled = value;
        $('reset-refine').disabled = value;
        $('new-search').disabled = value;
        $('clear-filters').disabled = value;

        $('gift-form').setAttribute('aria-busy', String(value && kind === 'find'));
        $('find-gifts').classList.toggle('is-loading', value && kind === 'find');
        $('find-gifts').querySelector('.button-label').textContent = value && kind === 'find' ? 'Gifter đang tìm kiếm...' : 'Tìm ý tưởng quà';
        $('product-grid').setAttribute('aria-busy', String(value));
        $('refine-button').innerHTML = value && kind === 'refine' ? `${app.icon('clock')} Đang tinh chỉnh…` : `${app.icon('sparkles')} Refine Gifts ${app.icon('arrow-right')}`;
    }

    // Chèn hình ảnh cho câu trả lời demo
    function imageStyle(product) {
        const index = Number.isInteger(product.imageIndex) && product.imageIndex >= 0 && product.imageIndex <= 8 ? product.imageIndex : 0;
        return `background-position:${(index % 3) * 50}% ${Math.floor(index / 3) * 50}%`;
        /* Backend: Xóa hoàn toàn hàm imageStyle() này, dùng đường dẫn ảnh thật (product.imageUrl) từ Database */
    }

    // Bubble chat
    function appendMessages(prompt, response) {
        const userMessage = {
            id: app.id('msg'),
            role: 'user',
            content: prompt,
            createdAt: new Date().toISOString()
        };
        state.messages.push(userMessage, response.message);
        const user = document.createElement('article'); 
        user.className = 'message message-user';
        user.textContent = prompt;

        const assistant = document.createElement('article');
        assistant.className = 'message message-assistant';
        assistant.dataset.messageId = response.message.id;

        const featured = response.products[0];
        assistant.innerHTML = `
            <div class="bot-avatar">
                <img src="assets/images/icon.svg" alt="Gifter AI Avatar">
            </div>
            <div>
                <div class="bot-name">Gifter <span>Người bạn chọn quà</span></div>
                <p class="assistant-text">${esc(response.message.content)}</p>

                ${featured ? `
                <div class="featured-gift">
                    <div 
                    class="featured-image" 
                    style="${imageStyle(featured)}" 
                    role="img" 
                    aria-label="Minh họa ${esc(featured.name)}"
                    ></div>
                    <div>
                    <span class="eyebrow">MỘT GỢI Ý ĐÁNG BẮT ĐẦU</span>
                    <h3>${esc(featured.name)}</h3>
                    <p>${esc(featured.description)}</p>
                    <span class="featured-price">${app.money(featured.price)}</span>
                    </div>
                </div>
                ` : ''}

                <div class="feedback" data-message-id="${esc(response.message.id)}">
                <span>Gợi ý này có giúp ích cho bạn?</span>
                <button type="button" data-rating="useful" aria-pressed="false">
                    ${app.icon('thumb-up')} Useful · Hữu ích
                </button>
                <button type="button" data-rating="unhelpful" aria-pressed="false">
                    ${app.icon('thumb-down')} Unhelpful · Chưa hữu ích
                </button>
                </div>
            </div>
            `;
        $('conversation').append(user, assistant);
    }

    // Hiển thị thông báo lỗi
    function showError(id, error) {
        $(id).textContent = error.message || 'Đã có lỗi xảy ra. Bạn thử lại nhé.';
        $(id).hidden = false;
    }

    // Chuyển lựa chọn ở tab Guide thành văn bản 
    function guidePrompt(g) {
        const recipient = $('recipient').selectedOptions[0].textContent;
        const age = g.age ? $('age').selectedOptions[0].textContent : '';
        const budget = $('budget').selectedOptions[0].textContent;
        return `Mình muốn tìm quà cho ${recipient.toLowerCase()}${age ? ', ' + age : ''}. Dịp: ${app.service.occasions[g.occasion]}. Ngân sách: ${budget.toLowerCase()}.${g.details ? ' ' + g.details : ''}`;
        /* Backend: Có thể rút gọn, gửi thẳng object guide (mã ID/enum) xuống Controller C# mà không cần ghép thành câu văn mẫu */
    }
    
    // Xử lý tìm quà 
    $('gift-form').addEventListener('submit', async event => {
        event.preventDefault();
        if (state.busy) return;
        $('form-error').hidden = true;
        let prompt = $('gift-prompt').value.trim(), guide = null;
        if (state.mode === 'describe' && prompt.length < 8) { showError('form-error', new Error('Bạn kể thêm một chút nhé - ít nhất 8 ký tự về người nhận, sở thích hoặc dịp tặng.')); $('gift-prompt').focus(); return; }
        if (state.mode === 'guide') {
            if (!$('recipient').value) { showError('form-error', new Error('Bạn chọn người nhận quà trước nhé.')); $('recipient').focus(); return; }
            guide = { recipient: $('recipient').value, age: $('age').value, occasion: $('occasion').value, budget: $('budget').value, details: $('more-about').value.trim() }; prompt = guidePrompt(guide);
        }
        const request = { schemaVersion: '1.0', requestId: app.id('req'), conversationId: state.conversationId, userInput: { mode: state.mode, prompt, guide }, previousProfile: state.profile, history: state.messages.slice(-8) };
        busy(true);
        try {
            /* Backend: app.service.find(request) sẽ gọi fetch POST tới Controller ASP.NET Core */
            const response = app.service.validateResponse(await app.service.find(request));
            state.profile = response.profile; state.products = response.products; state.questions = response.questions; state.filters = {}; state.requestId = request.requestId;
            document.body.classList.add('has-results');
    
            const conversation = $('conversation-shell');
            const results = $('results-section');
    
            // Hiển thị khu vực kết quả
            conversation.hidden = false;
            results.hidden = false;
    
            // Render nội dung trước khi chạy hiệu ứng
            appendMessages(prompt, response);
            renderQuestions();
    
            $('sort-products').value = 'relevance';
            renderProducts();
    
            $('gift-prompt').value = '';
            $('gift-prompt').placeholder =
                'Kể thêm về họ, hoặc bắt đầu một món quà mới…';
    
            $('refine-error').hidden = true;
    
            // Chờ trình duyệt cập nhật giao diện
            requestAnimationFrame(() => {
                conversation.classList.add('is-visible');
    
                requestAnimationFrame(() => {
                    results.classList.add('is-visible');
                });
            });
    
            // Cuộn trang mượt đến phần hội thoại
            conversation.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        } catch (error) { showError('form-error', error); }
        finally { busy(false); }
    });
    function renderQuestions() {
        $('refine-questions').innerHTML = state.questions.map((q, qIndex) => `
        <fieldset class="refine-question">
            <legend>${esc(q.question)}</legend>
            <div class="refine-options">
                ${q.options.map((option, index) => `
                    <label class="choice">
                        <input 
                            type="radio" 
                            name="${esc(q.id)}" 
                            value="${esc(option.value)}" 
                            ${index === 0 ? 'checked' : ''}
                        >
                        <span>${esc(option.label)}</span>
                    </label>
                `).join('')}
            </div>
        </fieldset>
    `).join('');
    }

    // Lưới gợi ý quà tặng
    function renderProducts() {
        const products = [...state.products];
        const order = $('sort-products').value;
        if (order === 'price-asc') products.sort((a, b) => a.price - b.price);
        if (order === 'price-desc') products.sort((a, b) => b.price - a.price);
        $('results-title').textContent = `Gửi yêu thương đến ${state.profile.recipientLabel}`
        const budget = state.profile.budget;
        $('results-subtitle').textContent = `${app.service.occasions[state.profile.occasion] || 'Một dịp đặc biệt'} · ${app.budgetLabel(budget)}`
        $('result-count').textContent = `${products.length} ý tưởng quà tặng${Object.values(state.filters).some(v => v !== 'any') ? ' · Đã tinh chỉnh' : ''}`;
        $('empty-results').hidden = products.length > 0;
        $('product-grid').innerHTML = products.map((product, index) => `
            <article class="product-card">
                <div class="product-visual">
                    <div 
                        class="product-image" 
                        style="${imageStyle(product)}" 
                        role="img" 
                        aria-label="Hình minh họa: ${esc(product.name)}"
                    ></div>

                    ${index === 0 && order === 'relevance' ? `
                        <span class="product-badge">
                            ${app.icon('sparkles')} Mây chọn cho bạn
                        </span>
                    ` : ''}

                    <button 
                        class="save-gift" 
                        type="button" 
                        data-save="${esc(product.id)}" 
                        aria-label="${state.saved.has(product.id) ? 'Bỏ lưu' : 'Lưu'} ${esc(product.name)}" 
                        aria-pressed="${state.saved.has(product.id)}"
                    >
                        ${app.icon('heart')}
                    </button>
                </div>

                <div class="product-content">
                    <p class="product-category">${esc(product.category || 'Quà tặng')}</p>
                    <h3>${esc(product.name)}</h3>
                    <p class="product-reason">${esc(product.description)}</p>

                    <div class="product-tags">
                        ${product.keywords.slice(0, 3).map(tag => `<span>${esc(tag)}</span>`).join('')}
                    </div>

                    <p class="product-price">
                        ${app.money(product.price)} <small>tham khảo</small>
                    </p>

                    <a 
                        class="merchant-link" 
                        href="${esc(app.safeURL(product.purchaseUrl))}" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        aria-label="Tìm ${esc(product.name)} trên Shopee, mở tab mới"
                    >
                        Tìm trên Shopee ${app.icon('external')}
                    </a>
                </div>
            </article>`
        ).join('');
    }
    // Sắp xếp gợi ý
    $('sort-products').addEventListener('change', () => { if (state.profile) renderProducts(); });
    // Lưu / Bỏ gợi ý yêu thích
    $('product-grid').addEventListener('click',event => {
        const button = event.target.closest('[data-save]');
        if (!button) return;
        const id = button.dataset.save;
        state.saved.has(id) ? state.saved.delete(id) : state.saved.add(id);

        /* Backend: Xóa app.storage.set(), thay bằng gọi fetch POST /api/wishlist/toggle để lưu quà yêu thích theo UserId vào SQL Server */
        const saved = app.storage.set('saved', [...state.saved]);
        renderProducts();
        // Render lại sẽ thay thế các nút cũ, khôi phục tiêu điểm bàn phím về đúng sản phẩm đó.
        [...$('product-grid').querySelectorAll('[data-save]')].find(el => el.dataset.save === id)?.focus({ preventScroll: true });
        app.toast(saved ? (state.saved.has(id) ? 'Đã lưu món quà trên trình duyệt này.' : 'Đã bỏ lưu món quà.') : 'Trình duyệt không cho lưu. Lựa chọn chỉ giữ trong phiên này.');
    });

    // Đánh giá câu trả lời của Gifter
    $('conversation').addEventListener('click', event => {
        const button = event.target.closest('[data-rating]'); if (!button) return;
        const group = button.closest('.feedback'), messageId = group.dataset.messageId;
        const rating = button.getAttribute('aria-pressed') === 'true' ? null : button.dataset.rating;
        group.querySelectorAll('button').forEach(el => el.setAttribute('aria-pressed', String(el.dataset.rating === rating)));

        /* Backend: Xóa toàn bộ phần app.storage bên dưới, thay bằng gọi fetch POST /api/feedback để lưu đánh giá vào SQL Server */
        const existing = app.storage.get('feedback', []), records = Array.isArray(existing) ? existing : [];
        const remaining = records.filter(item => item.messageId !== messageId);
        if (rating) remaining.push({ id: app.id('feedback'), conversationId: state.conversationId, messageId, rating, createdAt: new Date().toISOString(), source: 'browser-demo' });
        const stored = app.storage.set('feedback', remaining.slice(-200));
        app.toast(stored ? (rating ? 'Cảm ơn bạn! Đánh giá đã được lưu trên trình duyệt này.' : 'Đã gỡ đánh giá.') : 'Đã ghi nhận trong phiên này; trình duyệt đang chặn lưu trữ.');
    });

    // Nút lọc lại gợi ý - Refine
    async function refine(reset=false) {
        if (state.busy || !state.profile) return;
        $('refine-error').hidden = true;
        const filters = reset ? {} : Object.fromEntries(new FormData($('refine-form')));
        const request = { schemaVersion: '1.0', requestId: app.id('req'), conversationId: state.conversationId, profile: state.profile, filters };
        busy(true,'refine');
        try {
            /* Backend: app.service.refine(request) sẽ gọi fetch POST tới API ASP.NET Core */
            const response = app.service.validateResponse(await app.service.refine(request), true);
            state.products = response.products; state.filters = filters; state.requestId = request.requestId;
            if (reset) $('refine-form').reset();
            renderProducts(); 
            // Không gọi appendMessages() ở đây -> refine() chỉ để cập nhật lại kết quả
            app.toast(reset ? 'Đã đặt lại các lựa chọn tinh chỉnh.' : 'Đã cập nhật danh sách quà tặng.');
            if (matchMedia('(max-width:700px)').matches) app.scrollTo($('results-title'));
        }
        catch (error) { showError('refine-error', error); }
        finally { busy(false, 'refine'); }
    }
    $('refine-form').addEventListener('submit', event => {
        event.preventDefault();
        refine();
    });
    $('reset-refine').addEventListener('click', () => refine(true));
    $('clear-filters').addEventListener('click', () => refine(true));

    // Thu gọn bộ lọc giao diện mobile
    const refineToggle = document.createElement('button');
    refineToggle.type = 'button';
    refineToggle.className = 'refine-toggle';
    refineToggle.setAttribute('aria-label', 'Mở các lựa chọn tinh chỉnh');
    refineToggle.textContent = '+';
    document.querySelector('.refine-heading').append(refineToggle);
    refineToggle.addEventListener('click', () => {
        const open = document.querySelector('.refine-sidebar').classList.toggle('expanded');
        refineToggle.setAttribute('aria-expanded', String(open));
        refineToggle.setAttribute('aria-label', open ? 'Thu gọn các lựa chọn tinh chỉnh' : 'Mở các lựa chọn tinh chỉnh');
        refineToggle.textContent = open ? '-' : '+';
    });

    // Bắt đầu đoạn chat mới
    $('new-search').addEventListener('click', () => {
        if (state.busy) return;
        state.conversationId = app.id('conversation');
        state.profile = null;
        state.products = [];
        state.questions = [];
        state.filters = {};
        state.messages = [];
        state.requestId = null;
        $('conversation').replaceChildren();
        $('conversation-shell').hidden = true;
        $('results-section').hidden = true;
        document.body.classList.remove('has-results');
        $('gift-form').reset();
        switchTab('describe');
        $('gift-prompt').placeholder = 'Kể về người bạn muốn tặng quà, sở thích và ngân sách của bạn…';
        app.scrollTo($('find-a-gift'));
        $('gift-prompt').focus({ preventScroll: true });
    });

    // Popup Đăng ký/Đăng nhập 
    /* Backend: Xóa toàn bộ cụm Popup này nếu dùng View riêng */
    function openAuth(mode) {
        toastAuthMode=mode;
        const signup=mode==='signup';
        $('auth-form').reset();
        $('auth-message').hidden = true;
        $('name-field').hidden = !signup;
        $('auth-name').required = signup;
        $('auth-title').textContent = signup ? 'Bắt đầu hành trình gửi thương' : 'Mừng bạn quay lại';
        $('auth-submit').textContent = signup ? 'Xem thử đăng ký' : 'Xem thử đăng nhập';
        $('auth-switch').textContent = signup ? 'Đã có tài khoản? Xem giao diện đăng nhập' : 'Chưa có tài khoản? Xem giao diện đăng ký';
        $('auth-password').autocomplete = signup ? 'new-password' : 'current-password';
        if (!$('auth-dialog').open) $('auth-dialog').showModal();
    }
    /* Backend: Sửa submit -> fetch() để gửi dữ liệu xuống Controller C# */
    document.addEventListener('open-auth', event => openAuth(event.detail));
    $('auth-switch').addEventListener('click', () => openAuth(toastAuthMode === 'login' ? 'signup' : 'login'));
    $('auth-form').addEventListener('submit', event => {
        event.preventDefault();
        $('auth-message').textContent = 'Biểu mẫu hợp lệ. Đăng nhập / đăng ký thật sẽ hoạt động khi kết nối máy chủ. Thông tin bạn nhập không được gửi hoặc lưu.';
        $('auth-message').hidden = false;
        $('auth-password').value = '';
    });
    document.querySelectorAll('[data-close-dialog]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
    document.querySelectorAll('dialog').forEach(dialog=>{
        dialog.addEventListener('click', event => {
            if (event.target === dialog) {
                const rect = dialog.getBoundingClientRect();
                if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
            }
        });
        dialog.addEventListener('close', () => { if (dialog.id === 'auth-dialog') $('auth-form').reset(); });
    });

    /* Tự động cập nhật giao diện khi chuyển từ mode: 'demo' sang 'api' */
    if(app.config.mode === 'api'){
        $('demo-note').textContent = 'Mây sẽ gợi ý từ thông tin bạn chia sẻ và danh mục được kết nối.';
        document.querySelector('.mode-label').textContent = 'Trò chuyện với Gifter';
        $('catalog-disclaimer').textContent = 'Giá có thể thay đổi tại nơi bán';
    }
})();