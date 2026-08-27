# Cendo_Extension

Bộ extension Chrome / userscript hỗ trợ vận hành đơn hàng trên **cendo.work** (và các hệ thống liên quan: Pancake, cendoauto.art, Lark).
Mỗi thư mục con là một extension độc lập, cài kiểu **Load unpacked** (không qua Chrome Web Store).

| Thư mục | Tên | Chức năng chính |
|---|---|---|
| [`tkb-extension/`](tkb-extension/) | 🗓 Thời Khoá Biểu 3D – Tạo Mockup & Design | Quét các item Thời khoá biểu trong đơn (nhiều item/đơn), lấy tên khách theo từng dòng External note, chọn mẫu bảng theo mục "Thiết kế" (Cơ Bản / Thỏ Hồng / Vũ Trụ), ghép Mockup + Design 1254×1254 (chữ Lobster có viền / Arial Bold nền trắng) rồi tự điền vào ô Upload từng item. Có **luồng tự động chạy theo lịch** (chỉ làm đơn "Up đủ thông tin" chưa có ảnh) và báo kết quả về group Lark (đã làm / lỗi / cần xem). |
| [`instax-extension/`](instax-extension/) | 📸 Móc Khóa Clicky Instax 3D – Tạo Mockup & Design | Quét các item Móc Khóa Clicky Instax trong đơn (nhiều item/đơn), lấy ảnh khách từ mục Attachments (ảnh thứ n → item thứ n), chọn mẫu mockup theo mục "Màu" (Xanh Dương / Xanh Lá / Hồng / Cam), ghép Mockup 1000×1000 (ảnh phủ kín tấm phim) + Design 270×330 px = 2,29×2,79 cm @ 300 dpi rồi tự điền vào ô Upload từng item. Có **luồng tự động chạy theo lịch** (chỉ làm đơn "Up đủ thông tin" chưa có ảnh, số ảnh phải khớp số item) và báo kết quả về group Lark. |
| [`hopnhac-extension/`](hopnhac-extension/) | 🎵 Hộp Nhạc – Tạo Mockup & Design | Tự nhận mã MB01–MB05 từ đơn, ghép ảnh khách + chữ khắc thành Mockup 1000×1000 và Design 1500×2492 (PNG nền trong suốt), điền vào ô Upload. Có **luồng tự động chạy theo lịch** (quét đơn "Up đủ thông tin", chỉ làm đơn Hộp Nhạc chưa có ảnh) và báo kết quả về group Lark. |
| [`caulong-extension/`](caulong-extension/) | 🏸 Móc Khoá Cầu Lông 3D – Tạo Mockup & Design | Quét các item Móc Khoá Cầu Lông trong đơn (nhiều item/đơn), lấy tên khách theo từng dòng External note (dòng n → item n), chọn mẫu mockup theo mục "Màu" (9 màu: Đen / Đỏ / Vàng / Xanh Bạc Hà / Xanh Lá / Hồng / Cam / Xanh Dương / Tím), vẽ tên IN HOA font Lemonada Bold kiểu sticker (chữ trắng + blob đỏ + vòng tròn) lên Mockup 1500×1500 + Design 1254×1254 (Arial Bold nền trắng) rồi tự điền vào ô Upload từng item. Có **luồng tự động chạy theo lịch** (chỉ làm đơn "Up đủ thông tin" chưa có ảnh, số dòng tên phải khớp số item) và báo kết quả về group Lark. |
| [`cuu-extension/`](cuu-extension/) | 🐑 Móc Khoá Clicky Chú Cừu Dễ Thương 3D – Tạo Mockup & Design | Làm tương tự Cầu Lông nhưng chỉ có **1 mẫu**: quét các item Chú Cừu trong đơn (nhận theo tên sản phẩm), lấy tên khách theo từng dòng External note (dòng n → item n), vẽ tên IN HOA font Lemonada Bold kiểu sticker (chữ trắng + blob đỏ + vòng tròn) lên Mockup 1500×1500 + Design 1254×1254 (Arial Bold nền trắng) rồi tự điền vào ô Upload từng item. Có **luồng tự động chạy theo lịch** (chỉ làm đơn "Up đủ thông tin" chưa có ảnh, số dòng tên phải khớp số item) và báo kết quả về group Lark. |
| [`tennis-extension/`](tennis-extension/) | 🎾 Móc khoá Clicky Tennis 3D – Tạo Mockup & Design | Làm tương tự Cầu Lông với **7 màu** (Đen / Đỏ / Vàng / Xanh Bạc Hà / Xanh Lá / Hồng / Cam): quét các item Tennis trong đơn (nhận theo tên sản phẩm), lấy tên khách theo từng dòng External note (dòng n → item n), vẽ tên IN HOA font Lemonada Bold kiểu sticker (chữ trắng + blob đỏ + vòng tròn) **xoay dọc 90°** bên phải móc khoá lên Mockup 1500×1500 + Design 1254×1254 (Arial Bold nền trắng) rồi tự điền vào ô Upload từng item. Có **luồng tự động chạy theo lịch** (chỉ làm đơn "Up đủ thông tin" chưa có ảnh, số dòng tên phải khớp số item, màu phải có mẫu) và báo kết quả về group Lark. |
| [`pickleball-extension/`](pickleball-extension/) | 🥒 Móc Khoá Pickleball 3D – Tạo Mockup & Design | Làm tương tự Tennis với **7 màu** (Đen / Đỏ / Vàng / Xanh Bạc Hà / Xanh Lá / Hồng / Cam), nhận **cả 2 sản phẩm** "Móc Khóa 3D Clicky Pickleball" và "Móc Khoá Pickleball Bóng Xoay Tròn 3D" (cùng 1 output; đọc màu tiếng Việt lẫn tiếng Anh): lấy tên khách theo từng dòng External note (dòng n → item n), vẽ tên IN HOA font Lemonada Bold kiểu sticker (chữ trắng + blob đỏ + vòng tròn) **xoay dọc đọc từ dưới lên** bên trái móc khoá lên Mockup 1500×1500 + Design 1254×1254 (Arial Bold nền trắng) rồi tự điền vào ô Upload từng item. Có **luồng tự động chạy theo lịch** (chỉ làm đơn "Up đủ thông tin" chưa có ảnh, số dòng tên phải khớp số item, màu phải có mẫu) và báo kết quả về group Lark. |
| [`CendoBridge-extension/`](CendoBridge-extension/) | Cendo Bridge — cendoauto.art ➜ cendo.work | Gửi thẳng ảnh kết quả từ cendoauto.art sang ô Upload Mockup/Design trên cendo.work; kèm bot 8h30 tự quét & làm đơn Flip Photo Book, báo Lark. |
| [`cendo-sync-extension/`](cendo-sync-extension/) | Cendo Sync — "Để in" → "Private note" | Đồng bộ ghi chú "Để in" bên Pancake POS sang "Private note" bên Cendo, dùng phiên đăng nhập sẵn có. |
| [`Gem_Extenion_CendoWork/`](Gem_Extenion_CendoWork/) | Gom Extension | Panel "Tiện ích" gom các nút của những extension khác về một chỗ trên trang cendo.work. |
| [`clicky-3d-kitten/`](clicky-3d-kitten/) | CLICKY 3D KITTEN – Cendo → Raccoonie (userscript v9.8) | Userscript Tampermonkey: vẽ mockup móc khoá Clicky 3D (ngang / dọc có đầu Kitten) ngay trên đơn cendo.work và đính vào ô Mockup/Design; có Làm cả đơn + lịch tự động. |
| [`Gen-mockup-design/`](Gen-mockup-design/) | cendo-to-raccoonie (userscript, bản trước) | Bản trước của userscript trên, giữ để tham khảo. |

> Repo này **public**. Không commit webhook Lark, token, cookie hay dữ liệu khách vào code — mọi thông tin nhạy cảm nhập ở trang cài đặt của từng extension (lưu trong `chrome.storage` trên máy người dùng).

---

## Cài đặt lần đầu (cho người dùng)

**Cách A – Dùng Git (khuyên dùng, cập nhật nhanh nhất)**

```bash
cd ~/Documents
git clone https://github.com/ngochieu2003/Cendo_Extension.git
```

**Cách B – Không cần Git**: vào trang GitHub → nút **Code** → **Download ZIP** → giải nén ra một thư mục cố định
(ví dụ `Documents/Cendo_Extension`). Lần sau tải ZIP mới thì giải nén **đè vào đúng thư mục này**, không đổi tên.

Sau đó với **mỗi extension muốn dùng**:

1. Mở Chrome → `chrome://extensions`
2. Bật **Developer mode** (góc trên phải)
3. Bấm **Load unpacked** → chọn **đúng thư mục con** của extension (ví dụ `Cendo_Extension/hopnhac-extension`), *không* chọn thư mục gốc.
4. Mở cendo.work (đăng nhập sẵn) → thấy nút của extension xuất hiện.

## Cập nhật khi có bản mới

```bash
cd ~/Documents/Cendo_Extension
git pull
```
(hoặc tải ZIP mới giải nén đè). Rồi **bắt buộc làm 2 bước**:

1. `chrome://extensions` → bấm **Reload (⟳)** trên thẻ extension vừa cập nhật.
2. **F5 lại các tab cendo.work đang mở** (tab cũ vẫn giữ script cũ cho tới khi F5).

Cài đặt (lịch chạy, webhook Lark, lịch sử…) lưu trong `chrome.storage`, **không mất** khi cập nhật code.
Xem thêm hướng dẫn chi tiết trong README của từng thư mục.

## Quy ước khi phát triển

- Mỗi extension một thư mục, có `manifest.json` ở gốc thư mục đó và `README.md` riêng.
- Mỗi lần phát hành: tăng `version` trong `manifest.json` (vd `1.1.0 → 1.1.1`) và ghi vài dòng "Có gì mới" ở đầu README của extension đó.
- Không commit: `.DS_Store`, file `.zip` đóng gói, `_metadata/` (Chrome tự sinh), `.vscode/`, khoá/token.

## Tác giả
ngochieu2003 – nội bộ R Crafts / Raccoonie.
