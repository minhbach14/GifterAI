# Gifter AI — Website Tư Vấn & Gợi Ý Quà Tặng Thông Minh

Dự án học phần **Phát triển ứng dụng**: Website hỗ trợ người dùng tìm kiếm và lựa chọn ý tưởng quà tặng cá nhân hóa theo người nhận, dịp tặng, sở thích và ngân sách, tích hợp AI Agent.

* **Repository:** `https://github.com/minhbach14/GifterAI`
* **Nền tảng Back-End:** ASP.NET Core MVC (.NET 10.0)
* **Nền tảng Front-End:** HTML5, CSS3, JavaScript (ES6+ Vanilla JS), Razor View (`.cshtml`)

---

## 1. Cấu trúc thư mục dự án

```text
GifterAI/
├── .gitignore                  # Bộ lọc loại trừ file rác (bin/, obj/, .DS_Store, .vs/)
├── README.md                   # Tài liệu hướng dẫn kiến trúc và quy trình làm việc nhóm
└── gifter_ai/                  # Thư mục mã nguồn chính của ứng dụng ASP.NET Core MVC
    ├── Controllers/            # Xử lý điều hướng trang (MVC) và API kết nối AI Agent
    ├── Models/                 # Các lớp dữ liệu (Entity, DTO, ViewModel)
    ├── Views/
    │   ├── Shared/
    │   │   └── _Layout.cshtml  # Khung giao diện dùng chung (Header, Footer, CSS/JS gốc)
    │   └── Home/
    │       └── Index.cshtml    # Giao diện Trang chủ (Khung nhập prompt AI & lưới kết quả)
    ├── wwwroot/
    │   ├── assets/images/      # Logo, icon SVG, hình minh họa sản phẩm
    │   ├── css/                # Các file định dạng giao diện (style.css, ...)
    │   └── js/                 # Toàn bộ logic xử lý giao diện Front-End
    ├── appsettings.json        # Cấu hình chung của ứng dụng
    ├── gifter_ai.csproj        # Tệp cấu hình dự án .NET
    └── Program.cs              # Điểm khởi chạy và cấu hình Middleware/Routing
```

---

## 2. Bản đồ kiến trúc Front-End (Dành cho team UI/UX)

Để tránh viết trùng code, sai đường dẫn hoặc làm vỡ giao diện của nhau, các thành viên cần nắm rõ vai trò của từng tệp trong `wwwroot/`:

### A. Danh sách các tệp JavaScript (`wwwroot/js/`)
| Tên tệp | Vai trò & Chức năng chính | Lưu ý khi chỉnh sửa |
| :--- | :--- | :--- |
| `config.js` | Lưu cấu hình trung tâm (`mode: 'demo'` hoặc `'api'`, `apiBase`, `maxResults`) | Không tự ý đổi `mode` khi đang làm giao diện tĩnh |
| `icons.js` | Thư viện 17 biểu tượng SVG vector dùng chung qua thuộc tính `data-icon="..."` | Không cần sửa trừ khi bổ sung icon mới |
| `utils.js` | Các hàm tiện ích: định dạng tiền VNĐ (`app.money`), chống XSS (`escapeHTML`), thông báo nổi (`app.toast`) | Tái sử dụng trực tiếp, không viết lại hàm định dạng tiền |
| `header.js` | Quản lý thanh điều hướng trên cùng, menu mobile và kích hoạt popup Đăng nhập / Chi phí | Chỉ sửa khi thay đổi menu điều hướng toàn trang |
| `data.js` | Dữ liệu 9 sản phẩm quà tặng mẫu để chạy thử nghiệm giao diện | Sẽ được thay thế bằng dữ liệu thật từ API Back-End |
| `gift-service.js` | Tầng giao tiếp dữ liệu (`app.service.find`, `app.service.refine`) | Cầu nối gọi API xuống Controller ASP.NET Core |
| `app.js` | Bộ điều khiển giao diện trang chủ (chuyển tab *Describe/Guide*, vẽ bong bóng chat, lọc & sắp xếp quà) | Chỉ chỉnh sửa khi làm tính năng trên trang chủ |

### B. Các CSS Class dùng chung (`wwwroot/css/`)
Khi tạo trang mới (như Đăng nhập, Đăng ký, Hồ sơ, Lịch sử quà tặng...), hãy tận dụng lại các class có sẵn để giữ đồng bộ giao diện:
* **Bố cục & Khung:** `.site-header`, `.header-inner`, `.container`, `.view-transition`
* **Nút bấm (Buttons):**
  * `.button` — Nút bấm tiêu chuẩn của hệ thống
  * `.button-primary` — Nút hành động chính (nền màu thương hiệu)
  * `.button-small` — Nút kích thước nhỏ (dùng trên Header)
  * `.text-button` — Nút dạng văn bản tối giản (ví dụ: *"Bắt đầu lại"*)
* **Trạng thái động (State Classes):** `.active`, `.is-open`, `.is-visible`, `.is-loading`, `.scrolled`

### C. Quy tắc bắt buộc khi tạo trang mới (Ví dụ: Trang Login / Register)
1. **Vị trí lưu file:** Đặt file giao diện vào đúng thư mục Controller tương ứng: `Views/<TenController>/<TenTrang>.cshtml` (ví dụ: `Views/Account/Login.cshtml`).
2. **Kế thừa Layout:** Không viết lại thẻ `<!DOCTYPE html>`, `<html>`, `<head>`, `<header>` hay `<footer>` trong file `.cshtml` con vì `_Layout.cshtml` đã bọc sẵn.
3. **Tách riêng CSS/JS của trang con:** Nếu trang Login cần CSS hoặc JS riêng, hãy tạo file mới tại `wwwroot/css/login.css` và `wwwroot/js/login.js` thay vì sửa trực tiếp vào file dùng chung của trang chủ.
4. **Đường dẫn tài nguyên:** Mọi đường dẫn ảnh, CSS, JS trong file `.cshtml` luôn bắt đầu bằng `~/` (ví dụ: `~/css/login.css`, `~/assets/images/icon.svg`).

---

## 3. Hướng dẫn chạy dự án trên máy cá nhân

1. Cài đặt **.NET 10.0 SDK** và **Visual Studio Code** (kèm extension *C# Dev Kit*).
2. Mở Terminal tại thư mục chứa file `gifter_ai.csproj` (`GifterAI/gifter_ai`) và chạy lệnh:
   ```bash
   dotnet run
   ```
3. Mở trình duyệt và truy cập địa chỉ `http://localhost:xxxx` hiển thị trên màn hình Terminal.

---

## 4. Hướng dẫn làm việc nhóm (Co-work) trên GitHub cho thành viên mới

> **QUY TẮC VÀNG:**
> * Tuyệt đối **KHÔNG** tải code trực tiếp bằng nút *Upload files* trên trình duyệt web GitHub.
> * Tuyệt đối **KHÔNG** code và push trực tiếp lên nhánh **`main`**. Mỗi tính năng hoặc trang giao diện mới phải được làm trên một **nhánh riêng (Branch)**.

### Bước 1: Tải dự án về máy (Chỉ thực hiện 1 lần duy nhất)
Mở Terminal (hoặc Git Bash) tại thư mục muốn lưu dự án trên máy tính và chạy:
```bash
git clone https://github.com/minhbach14/GifterAI.git
cd GifterAI
```

### Bước 2: Cập nhật code mới nhất & Tạo nhánh làm việc riêng (Thực hiện trước mỗi lần code)
Trước khi bắt đầu làm một trang hoặc chức năng mới, luôn kéo code mới nhất từ nhánh `main` về rồi tách ra một nhánh riêng đặt tên theo cấu trúc `feature/<ten-chuc-nang>`:
```bash
git checkout main
git pull origin main
git checkout -b feature/login-page
```
*(Ví dụ tên nhánh: `feature/login-page`, `feature/register-page`, `feature/user-profile`, `feature/ai-api`)*

### Bước 3: Lập trình & Kiểm tra cục bộ
* Viết code trên nhánh `feature/...` của bạn.
* Chạy `dotnet run` để kiểm tra giao diện hiển thị tốt trên cả máy tính và điện thoại, không báo lỗi trong Console của trình duyệt (`F12`).

### Bước 4: Lưu lịch sử (Commit) và Đẩy code lên GitHub (Push)
Sau khi hoàn thành phần việc của mình, mở Terminal tại thư mục gốc `GifterAI` và chạy 3 lệnh sau:
```bash
git add .
git commit -m "feat: hoan thanh giao dien trang Login"
git push -u origin feature/login-page
```
*(Lưu ý: File `.gitignore` đã tự động chặn các thư mục `bin/`, `obj/` và `.DS_Store`, bạn không cần xóa thủ công).*

### Bước 5: Tạo Pull Request (PR) để gộp code vào dự án chính
1. Truy cập `https://github.com/minhbach14/GifterAI` trên trình duyệt.
2. Bạn sẽ thấy thông báo màu vàng kèm nút xanh lá **Compare & pull request** cho nhánh vừa đẩy lên $\rightarrow$ Bấm vào nút đó.
3. Viết mô tả ngắn gọn những file bạn đã thêm hoặc chỉnh sửa (kèm ảnh chụp màn hình giao diện nếu có) $\rightarrow$ Bấm **Create pull request**.
4. Nhóm trưởng sẽ kiểm tra (Review) để đảm bảo không xung đột code và bấm **Merge pull request** gộp vào nhánh `main`.

### Bước 6: Dọn dẹp sau khi Pull Request đã được Merge
Khi nhóm trưởng báo đã gộp nhánh của bạn vào `main`, quay lại VS Code chạy 2 lệnh sau để cập nhật lại nhánh `main` trên máy bạn sẵn sàng cho công việc tiếp theo:
```bash
git checkout main
git pull origin main
```