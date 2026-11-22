/* ============================================================================
 * FILE: gift-service.js (Tầng giao tiếp dữ liệu giữa UI và AI / Back-End)
 * ----------------------------------------------------------------------------
 * KHI TÍCH HỢP API VÀO BACK-END (ASP.NET CORE + AI AGENT):
 * 1. XÓA BỎ HOÀN TOÀN các phần giả lập AI chạy trên trình duyệt:
 *    - Các từ điển cứng: recipients, interestNames, ranges, keywords (occasions
 *      chỉ giữ lại nếu app.js còn dùng để hiển thị nhãn dịp tặng).
 *    - Các hàm bóc tách & chấm điểm thủ công: contains(), extractInterests(),
 *      promptBudget(), profileFrom(), questionsFor(), recommend(),
 *      composeMessage() và delay().
 * 2. GIỮ LẠI & DÙNG TRỰC TIẾP:
 *    - callAPI(): Gửi request POST thật xuống Controller ASP.NET Core.
 *    - validateResponse(): Kiểm tra cấu trúc JSON server trả về trước khi vẽ UI.
 *    - app.service.find() & app.service.refine(): Gọi thẳng callAPI() mà không
 *      cần rẽ nhánh kiểm tra mode === 'api' hay 'demo' nữa.
 * ============================================================================ */

(function () {
    'use strict';
    const app = window.GiftApp;

    // [Demo - Xóa khi lên Backend] Từ điển ánh xạ mã sang nhãn tiếng Việt
    const recipients = {
        mom: 'mẹ',
        dad: 'bố',
        partner: 'người thương',
        friend: 'người bạn',
        colleague: 'đồng nghiệp',
        sibling: 'anh / chị / em',
        other: 'người đặc biệt'
    };

    // [Giữ lại nếu UI cần map nhãn dịp tặng, hoặc để Server trả về sẵn]
    const occasions = {
        'just-because': 'Chỉ vì muốn tặng',
        birthday: 'Sinh nhật',
        anniversary: 'Kỷ niệm',
        thanks: 'Lời cảm ơn',
        graduation: 'Tốt nghiệp',
        holiday: 'Lễ / Tết'
    };

    // [Demo - Xóa khi lên Backend] Danh mục sở thích và khoảng ngân sách mẫu
    const interestNames = {
        relaxation: 'Thư giãn',
        cooking: 'Trà & bếp',
        gardening: 'Làm vườn',
        reading: 'Đọc & viết',
        travel: 'Di chuyển',
        music: 'Âm nhạc',
        creative: 'Sáng tạo',
        home: 'Chăm chút nhà'
    };

    const ranges = {
        any: { min: 0, max: null },
        under300: { min: 0, max: 299999 },
        '300-500': { min: 300000, max: 500000 },
        '500-1000': { min: 500000, max: 1000000 },
        over1000: { min: 1000001, max: null }
    };

    // [Demo - Xóa khi lên Backend] Bộ từ khóa tiếng Việt không dấu để dò sở thích
    const keywords = {
        relaxation: ['thu gian', 'relax', 'relaxing', 'chill', 'yen tinh', 'nen thom', 'rest'],
        cooking: ['nau an', 'cooking', 'bep', 'tra', 'tea', 'ca phe', 'coffee'],
        gardening: ['lam vuon', 'garden', 'gardening', 'cay canh', 'trong cay', 'cay xanh'],
        reading: ['doc sach', 'reading', 'cuon sach', 'viet', 'nhat ky', 'book', 'books', 'write'],
        travel: ['du lich', 'travel', 'the thao', 'gym', 'di lam', 'van dong'],
        music: ['am nhac', 'nhac', 'music', 'tai nghe'],
        creative: ['sang tao', 'creative', 've', 'hoi hoa', 'thu cong', 'handmade'],
        home: ['nha', 'home', 'trang tri', 'decor']
    };

    // [Demo - Xóa khi lên Backend] Kiểm tra từ khóa xuất hiện độc lập trong chuỗi
    const contains = (text, word) => new RegExp('(^|[^a-z0-9])' + word + '($|[^a-z0-9])').test(text);

    // [Demo - Xóa khi lên Backend] Trích xuất danh sách mã sở thích từ câu nhập
    function extractInterests(text) {
        const normalized = app.normalize(text);
        return Object.entries(keywords)
            .filter(([, words]) => words.some(w => contains(normalized, w)))
            .map(([key]) => key);
    }

    // [Demo - Xóa khi lên Backend] Dùng Regex tách số tiền và đơn vị (k, tr, đ) từ câu chat
    function promptBudget(text) {
        const found = [...text.matchAll(/(\d+(?:[.,]\d+)*)\s*(trieu|tr|million|nghin|ngan|k|vnd|dong|d)(?=\s|[.,!?;:\--]|$)/g)];
        if (!found.length) return null;

        const amounts = found.map(match => {
            const unit = match[2];
            const value = match[1];
            if (['trieu', 'tr', 'million'].includes(unit)) return Math.round(Number(value.replace(',', '.')) * 1000000);
            if (['nghin', 'ngan', 'k'].includes(unit)) return Math.round(Number(value.replace(',', '.')) * 1000);
            return Number(value.replace(/[.,]/g, ''));
        }).filter(Number.isFinite);

        if (!amounts.length) return null;

        // Phân biệt khoảng ngân sách (VD: "300k-500k") với mức trần đơn lẻ (VD: "dưới 500k")
        const isRange = amounts.length >= 2 && /\d\s*(?:k|tr|trieu|ngan|nghin|dong|vnd)?\s*(?:-|den|toi)\s*\d/.test(text);
        return { min: isRange ? Math.min(...amounts) : 0, max: Math.max(...amounts) };
    }

    // [Demo - Xóa khi lên Backend] Tự suy đoán hồ sơ người nhận bằng quy tắc cứng
    function profileFrom(request) {
        const input = request.userInput;
        if (input.mode === 'guide') {
            const g = input.guide;
            return {
                recipient: g.recipient,
                recipientLabel: recipients[g.recipient] || recipients.other,
                age: g.age || null,
                occasion: g.occasion || 'just-because',
                budget: { ...(ranges[g.budget] || ranges.any), currency: 'VND' },
                interests: extractInterests(g.details),
                notes: g.details || ''
            };
        }

        const text = app.normalize(input.prompt);
        const recipientWords = {
            mom: ['me', 'mom', 'mother', 'mum'],
            dad: ['bo', 'ba', 'dad', 'father'],
            partner: ['nguoi yeu', 'vo', 'chong', 'ban doi', 'girlfriend', 'boyfriend', 'wife', 'husband'],
            colleague: ['dong nghiep', 'colleague', 'coworker'],
            sibling: ['chi gai', 'anh trai', 'em gai', 'em trai'],
            friend: ['ban than', 'ban be', 'friend', 'cho ban', 'tang ban']
        };

        const explicit = Object.entries(recipientWords).find(([, words]) => words.some(word => contains(text, word)))?.[0];
        const previous = (!explicit || explicit === request.previousProfile?.recipient) ? request.previousProfile : null;
        const recipient = explicit || previous?.recipient || 'other';
        const newInterests = extractInterests(text);
        const age = text.match(/\b(\d{1,2})\s*(?:tuoi|years? old)\b/)?.[1] || null;
        const occasion = /sinh nhat|birthday/.test(text) ? 'birthday'
            : /ky niem|anniversary/.test(text) ? 'anniversary'
            : /tot nghiep|graduation/.test(text) ? 'graduation'
            : /cam on|thank/.test(text) ? 'thanks'
            : /tet|christmas|giang sinh/.test(text) ? 'holiday'
            : previous?.occasion || 'just-because';

        return {
            recipient,
            recipientLabel: recipients[recipient],
            age: age || previous?.age || null,
            occasion,
            budget: { ...(promptBudget(text) || previous?.budget || ranges.any), currency: 'VND' },
            interests: newInterests.length ? newInterests : previous?.interests || [],
            notes: input.prompt,
            unsupportedCurrency: /\$|\busd\b|\beur\b|€/.test(text)
        };
    }

    // [Demo - Xóa khi lên Backend] Sinh bộ 3 câu hỏi trắc nghiệm cố định cho thanh lọc bên trái
    function questionsFor(profile) {
        const interestKeys = [...new Set([...profile.interests, 'relaxation', 'creative', 'home', 'travel'])].slice(0, 4);
        return [
            {
                id: 'interest',
                question: `Sở thích nào của ${profile.recipientLabel} nên được ưu tiên?`,
                options: [{ value: 'any', label: 'Linh hoạt' }, ...interestKeys.map(value => ({ value, label: interestNames[value] }))]
            },
            {
                id: 'purpose',
                question: 'Bạn muốn món quà mang cảm giác gì?',
                options: [
                    { value: 'any', label: 'Linh hoạt' },
                    { value: 'practical', label: 'Thiết thực' },
                    { value: 'sentimental', label: 'Tình cảm' },
                    { value: 'relaxing', label: 'Thư thái' }
                ]
            },
            {
                id: 'budget',
                question: 'Muốn thu hẹp ngân sách thêm không?',
                options: [
                    { value: 'any', label: 'Giữ ngân sách' },
                    { value: 'under300', label: 'Dưới 300k' },
                    { value: '300-500', label: '300k-500k' },
                    { value: '500-1000', label: '500k-1 triệu' }
                ]
            }
        ];
    }

    // [Demo - Xóa khi lên Backend] Lọc mảng app.products và chấm điểm thủ công theo sở thích/dịp
    function recommend(profile, filters = {}) {
        const filterBudget = ranges[filters.budget] || ranges.any;
        const min = Math.max(profile.budget.min || 0, filterBudget.min);
        const max = Math.min(profile.budget.max ?? Infinity, filterBudget.max ?? Infinity);

        return app.products
            .filter(p => p.price >= min && p.price <= max)
            .filter(p => !filters.interest || filters.interest === 'any' || p.interests.includes(filters.interest))
            .filter(p => !filters.purpose || filters.purpose === 'any' || p.purposes.includes(filters.purpose))
            .map(p => ({
                ...p,
                score: profile.interests.filter(i => p.interests.includes(i)).length * 6
                    + (p.occasions.includes(profile.occasion) ? 2 : 0)
                    + (p.recipients.includes(profile.recipient) ? 1 : 0)
            }))
            .sort((a, b) => b.score - a.score || a.price - b.price)
            .slice(0, app.config.maxResults);
    }

    // [Demo - Xóa khi lên Backend] Ghép chuỗi văn bản mẫu giả làm câu tư vấn của trợ lý AI
    function composeMessage(profile, products) {
        const person = profile.recipientLabel;
        if (!products.length) {
            return `Gifter chưa tìm thấy món quà phù hợp cho ${person} trong danh mục mẫu với ngân sách này. Bạn có thể thử khoảng ngân sách khác, hoặc kể thêm để tìm một ý tưởng mới.`;
        }
        const interests = profile.interests.map(i => interestNames[i]?.toLowerCase()).filter(Boolean).join(', ');
        const budget = (profile.budget.max || profile.budget.min) ? ` với ngân sách ${app.budgetLabel(profile.budget).toLowerCase()}` : '';
        const currencyNote = profile.unsupportedCurrency ? ' Bản demo chỉ đọc ngân sách VND; hãy ghi lại bằng đ hoặc k để lọc chính xác.' : '';

        return `Một món quà cho ${person}, và cả sự quan tâm của bạn ở trong đó. ♡\n\n${interests ? `Từ những điều bạn kể về ${interests}, ` : ''}Gifter chọn ${products.length} ý tưởng${budget}. ${products[0].name} là một gợi ý đáng bắt đầu: ${products[0].description.charAt(0).toLowerCase() + products[0].description.slice(1)} Bạn có thể tinh chỉnh bên dưới để món quà gần với họ hơn.${currencyNote}`;
    }

    // [Giữ lại cho Backend] Kiểm tra tính hợp lệ của dữ liệu JSON trả về trước khi render UI
    function validateResponse(data, refining = false) {
        if (!data || typeof data !== 'object' || !Array.isArray(data.products) || data.products.length > 30) {
            throw new Error('Dữ liệu phản hồi chưa đúng cấu trúc. Vui lòng thử lại.');
        }
        if (!refining && (!data.profile || typeof data.profile.recipientLabel !== 'string' || !data.profile.budget || !Array.isArray(data.profile.interests) || !data.message || typeof data.message.id !== 'string' || typeof data.message.content !== 'string' || !Array.isArray(data.questions))) {
            throw new Error('Phản hồi thiếu hồ sơ, tin nhắn hoặc câu hỏi tinh chỉnh.');
        }
        if (data.products.some(p => !p || typeof p.id !== 'string' || typeof p.name !== 'string' || !Number.isFinite(p.price) || p.price < 0 || p.currency !== 'VND' || !Array.isArray(p.keywords) || typeof p.description !== 'string' || !app.safeURL(p.purchaseUrl))) {
            throw new Error('Thông tin sản phẩm chưa hợp lệ. Vui lòng thử lại.');
        }
        if (!refining && data.questions.some(q => !q || typeof q.id !== 'string' || typeof q.question !== 'string' || !Array.isArray(q.options) || !q.options.length || q.options.some(o => typeof o.value !== 'string' || typeof o.label !== 'string'))) {
            throw new Error('Câu hỏi tinh chỉnh chưa hợp lệ.');
        }
        return data;
    }

    // [Giữ lại cho Backend] Gọi API POST tới Back-End ASP.NET Core kèm giới hạn thời gian chờ (Timeout)
    async function callAPI(path, request, refining = false) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), app.config.requestTimeoutMs);
        try {
            const response = await fetch(app.config.apiBase + path, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(request),
                signal: controller.signal
            });
            if (!response.ok) {
                throw new Error(response.status === 429
                    ? 'Gifter đang nhận nhiều yêu cầu. Bạn đợi một chút rồi thử lại nhé.'
                    : 'Chưa thể lấy gợi ý từ máy chủ. Vui lòng thử lại.');
            }
            return validateResponse(await response.json(), refining);
        } catch (error) {
            if (error.name === 'AbortError') throw new Error('Yêu cầu mất nhiều thời gian. Vui lòng thử lại.');
            throw error;
        } finally {
            clearTimeout(timer);
        }
    }

    // [Demo - Xóa khi lên Backend] Giả lập độ trễ mạng 650ms để tạo cảm giác AI đang suy nghĩ
    async function delay() {
        await new Promise(resolve => setTimeout(resolve, app.config.demoDelayMs));
    }

    // Giao diện hàm công khai để app.js gọi
    app.service = {
        recipients,
        occasions,
        interestNames,

        // Tìm kiếm & tư vấn quà tặng (Sau này chỉ cần: return callAPI('/gifts', request);)
        async find(request) {
            if (app.config.mode === 'api') return callAPI('/gifts', request);
            await delay();
            const profile = profileFrom(request);
            const products = recommend(profile);
            return {
                schemaVersion: '1.0',
                requestId: request.requestId,
                conversationId: request.conversationId,
                profile,
                message: {
                    id: app.id('msg'),
                    role: 'assistant',
                    content: composeMessage(profile, products),
                    createdAt: new Date().toISOString()
                },
                products,
                questions: questionsFor(profile),
                meta: { mode: 'demo', priceStatus: 'illustrative' }
            };
        },

        // Lọc tinh chỉnh danh sách quà (Sau này chỉ cần: return callAPI('/gifts/refine', request, true);)
        async refine(request) {
            if (app.config.mode === 'api') return callAPI('/gifts/refine', request, true);
            await delay();
            // Cố tình không trả về message khi refine để chỉ cập nhật lưới sản phẩm
            return {
                schemaVersion: '1.0',
                requestId: request.requestId,
                conversationId: request.conversationId,
                products: recommend(request.profile, request.filters),
                meta: { mode: 'demo', priceStatus: 'illustrative' }
            };
        },

        profileFrom,
        recommend,
        questionsFor,
        validateResponse
    };
})();